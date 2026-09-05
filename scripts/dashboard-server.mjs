#!/usr/bin/env node
/**
 * dashboard-server.mjs — servidor local do dashboard consolidado do kit
 * (Graph/Bench/Savings/Drift/Skill Quality/Trigger Eval, gerados por
 * build-dashboard.mjs) + o painel de memória (ai-memory, via MCP sobre HTTP).
 *
 * O ai-memory só fala MCP (JSON-RPC + Streamable HTTP), sem API REST própria
 * — por isso este servidor existe: ele fala MCP no lado do servidor (via
 * @modelcontextprotocol/sdk) e expõe JSON simples pro browser em /api/memory/*.
 *
 * Uso: node scripts/dashboard-server.mjs
 *      DASHBOARD_PORT=5000 node scripts/dashboard-server.mjs
 */
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DASHBOARD_DIR = join(REPO_ROOT, "docs", "preview");
const PORT = Number(process.env.DASHBOARD_PORT) || 4173;
const AI_MEMORY_URL = process.env.AI_MEMORY_URL || "http://127.0.0.1:49374/mcp";
// The MCP server auto-resolves "current project" from recent hook activity,
// not from this process's cwd — that can silently point at whatever project
// another concurrent agent session last touched. Every route below always
// passes an explicit project so the dashboard never shows another project's
// data by accident.
const DEFAULT_PROJECT = process.env.DASHBOARD_MEMORY_PROJECT || "claude-skills-fv";

// SDK resolved from mcp-server/node_modules — the kit's own MCP server already
// depends on it. Falls back to a clear error if that package ever moves.
let Client, StreamableHTTPClientTransport;
try {
  const sdkClientDir = join(REPO_ROOT, "mcp-server", "node_modules", "@modelcontextprotocol", "sdk", "dist", "esm", "client");
  ({ Client } = await import(pathToFileURL(join(sdkClientDir, "index.js")).href));
  ({ StreamableHTTPClientTransport } = await import(pathToFileURL(join(sdkClientDir, "streamableHttp.js")).href));
} catch (err) {
  console.error("[dashboard-server] @modelcontextprotocol/sdk not found under mcp-server/node_modules.");
  console.error("[dashboard-server] Run `npm install` inside mcp-server/ first.");
  console.error(String(err.message || err));
  process.exit(1);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("request body too large");
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

// One short-lived MCP client per call — the ai-memory server is local and
// fast, and this avoids managing a long-lived connection's lifecycle/retries
// across an HTTP request/response server. Simpler, and matches the load
// profile of a single local user clicking around a dashboard.
async function callMemoryTool(name, args = {}) {
  const transport = new StreamableHTTPClientTransport(new URL(AI_MEMORY_URL));
  const client = new Client({ name: "dashboard-proxy", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({ name, arguments: args });
    if (result.isError) {
      const message = result.content?.[0]?.text || "unknown MCP tool error";
      throw new Error(message);
    }
    const text = result.content?.[0]?.text;
    return text ? JSON.parse(text) : result;
  } finally {
    await client.close().catch(() => {});
  }
}

function withDefaultProject(args) {
  return { project: DEFAULT_PROJECT, ...args };
}

// ai-memory exposes no MCP tool to list projects (memory_status/query/etc all
// require you to already know the project name). The web UI's own project
// grid reads this the same way: every scope inside the wiki has a `_meta.md`
// manifest with a `project: <name>` line — walking those via `docker exec`
// is the only way to discover what's fed the server, short of parsing its
// SQLite index directly.
let projectsCache = { at: 0, list: [] };
const PROJECTS_CACHE_MS = 30_000;
async function listMemoryProjects() {
  if (Date.now() - projectsCache.at < PROJECTS_CACHE_MS) return projectsCache.list;
  // One docker exec that finds + cats every _meta.md in a single round trip —
  // the naive version (one `docker exec` per file, ~116 of them) took 12+
  // seconds per request. `find -exec cat +` batches every matched path into
  // one `cat` invocation, one process spawn total.
  const { stdout } = await execFileAsync("docker", [
    "exec", "ai-memory", "sh", "-c",
    "find /data/wiki -iname _meta.md -not -path '*/.git/*' -exec cat {} +",
  ]);
  const names = new Set();
  for (const match of stdout.matchAll(/^project:\s*(.+?)\s*$/gm)) {
    names.add(match[1]);
  }
  projectsCache = { at: Date.now(), list: [...names].sort() };
  return projectsCache.list;
}

// ─── Project → on-disk folder resolution (real cwd, not a guessed path) ────
// ai-memory's own SQLite tracks the real cwd of every captured session
// (sessions.cwd) — no need to guess a fixed root like "D:\Repos\<name>",
// which would miss real projects that live elsewhere (confirmed: repos exist
// under D:\Games\, D:\tmp\, worktree paths under C:\Users\...\.ao\, etc).
// The container has no sqlite3 CLI, so the DB file is copied to the host
// (docker cp) and read with Node's built-in node:sqlite (v22+, experimental
// but functional — avoids adding a new dependency for one read-only query).
let sqliteModule = null;
async function getSqliteModule() {
  if (!sqliteModule) {
    sqliteModule = await import("node:sqlite");
  }
  return sqliteModule;
}

const DB_COPY_PATH = join(REPO_ROOT, ".dashboard-cache", "ai-memory.sqlite");
let dbCopyCache = { at: 0 };
const DB_COPY_CACHE_MS = 15_000;
async function copyMemoryDb() {
  if (Date.now() - dbCopyCache.at < DB_COPY_CACHE_MS && existsSync(DB_COPY_PATH)) {
    return DB_COPY_PATH;
  }
  const { mkdir } = await import("node:fs/promises");
  await mkdir(join(REPO_ROOT, ".dashboard-cache"), { recursive: true });
  await execFileAsync("docker", ["cp", "ai-memory:/data/db/memory.sqlite", DB_COPY_PATH]);
  dbCopyCache = { at: Date.now() };
  return DB_COPY_PATH;
}

async function resolveProjectFolder(project) {
  const dbPath = await copyMemoryDb();
  const { DatabaseSync } = await getSqliteModule();
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const row = db.prepare(`
      SELECT s.cwd FROM sessions s
      JOIN projects p ON p.id = s.project_id
      WHERE p.name = ? AND s.cwd IS NOT NULL
      ORDER BY s.started_at DESC
      LIMIT 1
    `).get(project);
    return row?.cwd || null;
  } finally {
    db.close();
  }
}

// The ai-memory MCP server exposes no "graph data" tool — the "graph RRF"
// mentioned in its docs is an internal search-ranking technique, not an API.
// A first attempt derived edges from shared frontmatter tags, but real data
// killed that: migrated logs carry only 2 universal tags ("migrated",
// "session-log", present on ~100% of pages — filtered out as noise) plus one
// date tag unique per page — zero pages share a *topical* tag. So instead
// this uses the thing that actually works today: the hybrid search engine
// itself. One or more search terms each return a ranked hit list; pages that
// co-occur in the same query's results get an edge (weighted by how close
// their ranks are) — the query IS the relationship, not an inferred label.
async function buildDerivedGraph(args) {
  const { query, limit, project } = args;
  const terms = (query && String(query).trim())
    ? [String(query).trim()]
    : ["session", "decision", "docker", "migração", "arquitetura", "bug", "config"];

  const nodesById = new Map();
  const edgeWeights = new Map(); // "a|b" -> weight

  for (const term of terms) {
    let result;
    try {
      result = await callMemoryTool("memory_query", withDefaultProject({ query: term, limit: limit || 12, project }));
    } catch {
      continue;
    }
    const hits = result.hits || [];
    for (const hit of hits) {
      if (!nodesById.has(hit.path)) {
        nodesById.set(hit.path, { id: hit.path, label: hit.title || hit.path, tags: [], community: 0 });
      }
    }
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length; j++) {
        const a = hits[i].path, b = hits[j].path;
        if (a === b) continue;
        const key = a < b ? `${a}|${b}` : `${b}|${a}`;
        const closeness = 1 / (1 + Math.abs(i - j)); // adjacent ranks weigh more
        edgeWeights.set(key, (edgeWeights.get(key) || 0) + closeness);
      }
    }
  }

  const nodes = [...nodesById.values()];
  const edges = [...edgeWeights.entries()]
    .filter(([, weight]) => weight >= 0.5) // drop the weakest incidental co-occurrences
    .map(([key, weight]) => {
      const [source, target] = key.split("|");
      return { source, target, relation: query || "co-search", weight: Number(weight.toFixed(2)) };
    });

  // Community = connected component via edges, so nodes that cluster under
  // the same search terms get the same color instead of one color per node.
  const parent = new Map(nodes.map((n) => [n.id, n.id]));
  function find(x) { while (parent.get(x) !== x) { x = parent.get(x); } return x; }
  function union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); }
  for (const e of edges) union(e.source, e.target);
  const communityIds = new Map();
  for (const n of nodes) {
    const root = find(n.id);
    if (!communityIds.has(root)) communityIds.set(root, communityIds.size);
    n.community = communityIds.get(root);
  }
  return { nodes, links: edges };
}

// NOTE: there is no non-destructive "list handoffs" MCP tool. The only read
// tool, memory_handoff_accept, is single-use (marks the handoff consumed) —
// calling it from a dashboard "peek" would silently eat the handoff a real
// agent session was supposed to receive. So the Handoffs tab surfaces only
// `pending_handoff_count` from memory_briefing (safe, read-only, no mutation)
// instead of the handoff's actual content.
const MEMORY_ROUTES = {
  "/api/memory/status": (args) => callMemoryTool("memory_status", withDefaultProject(args)),
  "/api/memory/recent": (args) => callMemoryTool("memory_recent", withDefaultProject(args)),
  "/api/memory/query": (args) => callMemoryTool("memory_query", withDefaultProject(args)),
  "/api/memory/briefing": (args) => callMemoryTool("memory_briefing", withDefaultProject(args)),
  "/api/memory/read-page": (args) => callMemoryTool("memory_read_page", withDefaultProject(args)),
  "/api/memory/graph": (args) => buildDerivedGraph(args),
  "/api/memory/projects": async () => ({ projects: await listMemoryProjects(), default: DEFAULT_PROJECT }),
};

// ─── Project source-code inspection (tree/README/diagram/depgraph) ─────────
// These read the real on-disk folder resolved via resolveProjectFolder() —
// separate concern from MEMORY_ROUTES above, which only reads ai-memory's
// captured sessions/pages, never the actual source code.
const TREE_IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", "target", "__pycache__",
  ".venv", "venv", ".cache", ".dashboard-cache", "graphify-out",
]);
const TREE_MAX_DEPTH = 4;
const TREE_MAX_ENTRIES = 2000; // hard cap so a huge repo can't hang the request

async function buildFileTree(rootPath) {
  const { readdir } = await import("node:fs/promises");
  let count = 0;
  async function walk(dirPath, depth) {
    if (depth > TREE_MAX_DEPTH || count > TREE_MAX_ENTRIES) return [];
    let entries;
    try {
      entries = await readdir(dirPath, { withFileTypes: true });
    } catch {
      return [];
    }
    const nodes = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (TREE_IGNORE.has(entry.name) || entry.name.startsWith(".")) continue;
      if (count > TREE_MAX_ENTRIES) break;
      count++;
      if (entry.isDirectory()) {
        nodes.push({ name: entry.name, type: "dir", children: await walk(join(dirPath, entry.name), depth + 1) });
      } else {
        nodes.push({ name: entry.name, type: "file" });
      }
    }
    return nodes;
  }
  return walk(rootPath, 0);
}

async function projectTreeRoute(args) {
  const folder = await resolveProjectFolder(args.project);
  if (!folder || !existsSync(folder)) {
    throw Object.assign(new Error(`código-fonte não encontrado para "${args.project}" (nenhuma sessão registrou um cwd válido)`), { status: 404 });
  }
  return { folder, tree: await buildFileTree(folder) };
}

async function findReadme(folder) {
  const { readdir } = await import("node:fs/promises");
  let entries;
  try {
    entries = await readdir(folder);
  } catch {
    return null;
  }
  const match = entries.find((e) => /^readme\.md$/i.test(e));
  return match ? join(folder, match) : null;
}

async function projectReadmeRoute(args) {
  const folder = await resolveProjectFolder(args.project);
  if (!folder || !existsSync(folder)) {
    throw Object.assign(new Error(`código-fonte não encontrado para "${args.project}"`), { status: 404 });
  }
  const readmePath = await findReadme(folder);
  if (!readmePath) {
    throw Object.assign(new Error(`"${args.project}" não tem README.md na raiz`), { status: 404 });
  }
  const body = await readFile(readmePath, "utf-8");
  return { path: readmePath, body };
}

function flattenTree(nodes, prefix = "") {
  const lines = [];
  for (const n of nodes) {
    const path = prefix ? `${prefix}/${n.name}` : n.name;
    lines.push(n.type === "dir" ? `${path}/` : path);
    if (n.children) lines.push(...flattenTree(n.children, path));
  }
  return lines;
}

// Cache generated diagrams in-process only — they're a derived artifact, not
// source data, and the OPENAI_API_KEY call costs real tokens per generation.
const diagramCache = new Map(); // project -> { at, mermaid }
async function projectDiagramRoute(args) {
  const project = args.project;
  if (!args.force && diagramCache.has(project)) return diagramCache.get(project);

  const folder = await resolveProjectFolder(project);
  if (!folder || !existsSync(folder)) {
    throw Object.assign(new Error(`código-fonte não encontrado para "${project}"`), { status: 404 });
  }
  const apiKey = await getOpenAiKey();
  if (!apiKey) {
    throw Object.assign(new Error("OPENAI_API_KEY não configurada — veja ~/.dev-team-kit/.env"), { status: 503 });
  }

  const tree = await buildFileTree(folder);
  const treeText = flattenTree(tree).slice(0, 400).join("\n");
  let readmeText = "";
  const readmePath = await findReadme(folder);
  if (readmePath) {
    readmeText = (await readFile(readmePath, "utf-8")).slice(0, 3000);
  }

  const prompt = `Baseado na árvore de arquivos e README abaixo de um repositório de código chamado "${project}", gere um diagrama de arquitetura em Mermaid (flowchart TD) mostrando os módulos/camadas principais e como se relacionam. Responda APENAS com o bloco Mermaid, sem \`\`\`, sem explicação, sem texto antes ou depois.

Árvore de arquivos:
${treeText}

README (se houver):
${readmeText}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw Object.assign(new Error(`OpenAI API error ${res.status}: ${text.slice(0, 200)}`), { status: 502 });
  }
  const data = await res.json();
  let mermaid = data.choices?.[0]?.message?.content?.trim() || "";
  mermaid = mermaid.replace(/^```(?:mermaid)?\n?/, "").replace(/```$/, "").trim();
  if (!/^(flowchart|graph)\s/i.test(mermaid)) {
    throw Object.assign(new Error("resposta do modelo não parece um diagrama Mermaid válido"), { status: 502 });
  }

  const result = { mermaid, generated_at: new Date().toISOString() };
  diagramCache.set(project, result);
  return result;
}

let cachedOpenAiKey; // undefined = not loaded yet, null = confirmed absent
async function getOpenAiKey() {
  if (cachedOpenAiKey !== undefined) return cachedOpenAiKey;
  if (process.env.OPENAI_API_KEY) {
    cachedOpenAiKey = process.env.OPENAI_API_KEY;
    return cachedOpenAiKey;
  }
  try {
    const { homedir } = await import("node:os");
    const envPath = join(homedir(), ".dev-team-kit", ".env");
    const content = await readFile(envPath, "utf-8");
    const match = content.match(/^OPENAI_API_KEY=(.+)$/m);
    cachedOpenAiKey = match ? match[1].trim() : null;
  } catch {
    cachedOpenAiKey = null;
  }
  return cachedOpenAiKey;
}

// Dependency graph via static regex analysis — no LLM, no bundler. Only
// relative imports (./ or ../) are resolved; node_modules/package imports
// are skipped since resolving them properly needs a real module resolver.
const CODE_EXTENSIONS = [".js", ".mjs", ".cjs", ".ts", ".tsx", ".jsx"];
const IMPORT_RE = /(?:from\s+|require\()\s*["'](\.\.?\/[^"']+)["']/g;

async function collectCodeFiles(nodes, dirPath, out) {
  for (const n of nodes) {
    const full = join(dirPath, n.name);
    if (n.type === "dir") {
      await collectCodeFiles(n.children || [], full, out);
    } else if (CODE_EXTENSIONS.includes(extname(n.name))) {
      out.push(full);
    }
  }
}

function resolveImportTarget(fromFile, importPath, allFiles) {
  const base = normalize(join(fromFile, "..", importPath));
  const candidates = [base, ...CODE_EXTENSIONS.map((ext) => base + ext), ...CODE_EXTENSIONS.map((ext) => join(base, "index" + ext))];
  return candidates.find((c) => allFiles.has(c)) || null;
}

async function projectDepgraphRoute(args) {
  const folder = await resolveProjectFolder(args.project);
  if (!folder || !existsSync(folder)) {
    throw Object.assign(new Error(`código-fonte não encontrado para "${args.project}"`), { status: 404 });
  }
  const tree = await buildFileTree(folder);
  const files = [];
  await collectCodeFiles(tree, folder, files);
  const fileSet = new Set(files.map((f) => normalize(f)));

  const nodes = files.map((f, i) => ({ id: f.replace(folder, "").replace(/^[\\/]/, ""), label: f.split(/[\\/]/).pop(), community: i }));
  const edges = [];
  for (const file of files.slice(0, 300)) { // cap: very large repos shouldn't hang the request
    let content;
    try {
      content = await readFile(file, "utf-8");
    } catch {
      continue;
    }
    // Strip comment lines first — a plain regex over raw source matches JSDoc
    // usage examples too (e.g. "* import {...} from './foo.mjs'" inside a
    // /** */ block), which produced a false self-edge in testing.
    const codeOnly = content
      .split("\n")
      .filter((line) => !/^\s*(\*|\/\/)/.test(line))
      .join("\n");
    for (const match of codeOnly.matchAll(IMPORT_RE)) {
      const target = resolveImportTarget(file, match[1], fileSet);
      if (target && target !== file) {
        edges.push({
          source: file.replace(folder, "").replace(/^[\\/]/, ""),
          target: target.replace(folder, "").replace(/^[\\/]/, ""),
          relation: "import",
          weight: 1,
        });
      }
    }
  }
  return { nodes, links: edges };
}

const PROJECT_ROUTES = {
  "/api/project/tree": projectTreeRoute,
  "/api/project/readme": projectReadmeRoute,
  "/api/project/diagram": projectDiagramRoute,
  "/api/project/depgraph": projectDepgraphRoute,
};

async function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "dashboard.html" : pathname.replace(/^\//, "");
  const safePath = normalize(join(DASHBOARD_DIR, rel));
  if (!safePath.startsWith(DASHBOARD_DIR)) {
    sendJson(res, 403, { error: "forbidden" });
    return;
  }
  if (!existsSync(safePath)) {
    sendJson(res, 404, { error: "not found", path: rel });
    return;
  }
  const body = await readFile(safePath);
  const mime = MIME[extname(safePath)] || "application/octet-stream";
  res.writeHead(200, { "content-type": mime, "cache-control": "no-store" });
  res.end(body);
}

// DNS-rebinding / CSRF guard: this server has no auth (loopback-only is its
// whole security model), so any page open in the user's browser could POST
// to it via fetch() if we trusted the Host header blindly — a malicious site
// resolving a hostname to 127.0.0.1, or one already loaded before the victim
// visits it, can still send the request; only Host validation stops it,
// since the browser sets Host from the URL bar, not from JS. Reject any
// request whose Host isn't exactly this server's own loopback address.
const ALLOWED_HOSTS = new Set([`127.0.0.1:${PORT}`, `localhost:${PORT}`]);
const server = createServer(async (req, res) => {
  if (!ALLOWED_HOSTS.has(req.headers.host)) {
    sendJson(res, 403, { error: "forbidden host" });
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/health") {
    sendJson(res, 200, { ok: true, port: PORT });
    return;
  }

  if (pathname in MEMORY_ROUTES) {
    try {
      const args = req.method === "POST" ? await readBody(req) : Object.fromEntries(url.searchParams);
      const data = await MEMORY_ROUTES[pathname](args);
      sendJson(res, 200, data);
    } catch (err) {
      const message = String(err.message || err);
      const unreachable = /ECONNREFUSED|fetch failed|ENOTFOUND/i.test(message);
      sendJson(res, unreachable ? 503 : 500, {
        error: unreachable
          ? "ai-memory unreachable — run: docker start ai-memory"
          : message,
      });
    }
    return;
  }

  if (pathname in PROJECT_ROUTES) {
    try {
      const args = req.method === "POST" ? await readBody(req) : Object.fromEntries(url.searchParams);
      const data = await PROJECT_ROUTES[pathname](args);
      sendJson(res, 200, data);
    } catch (err) {
      sendJson(res, err.status || 500, { error: String(err.message || err) });
    }
    return;
  }

  if (pathname.startsWith("/dashboard-data/") || pathname === "/" || pathname === "/dashboard.html") {
    try {
      await serveStatic(req, res, pathname);
    } catch (err) {
      sendJson(res, 500, { error: String(err.message || err) });
    }
    return;
  }

  sendJson(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[dashboard-server] http://127.0.0.1:${PORT}`);
  console.log(`[dashboard-server] proxying ai-memory MCP at ${AI_MEMORY_URL}`);
});

function shutdown() {
  console.log("[dashboard-server] shutting down...");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 3000).unref();
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
