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
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
  const { query, limit } = args;
  const terms = (query && String(query).trim())
    ? [String(query).trim()]
    : ["session", "decision", "docker", "migração", "arquitetura", "bug", "config"];

  const nodesById = new Map();
  const edgeWeights = new Map(); // "a|b" -> weight

  for (const term of terms) {
    let result;
    try {
      result = await callMemoryTool("memory_query", withDefaultProject({ query: term, limit: limit || 12 }));
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

const server = createServer(async (req, res) => {
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
