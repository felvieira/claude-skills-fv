#!/usr/bin/env node
/**
 * learned-skills-to-ai-memory — publica as learned-skills do projeto no ai-memory.
 *
 * Por que existe: as learned-skills sao arquivos (.bot/learned-skills) lidos por
 * hooks que so rodam no Claude Code. Codex, Grok e Cursor falam com o ai-memory
 * por MCP; sem esta ponte, o "isto ja foi tentado e descartado" nao chega neles.
 *
 * Uso:
 *   node scripts/learned-skills-to-ai-memory.mjs                  # dry-run: so mostra o plano
 *   node scripts/learned-skills-to-ai-memory.mjs --apply          # grava (docker exec ai-memory ...)
 *   --dir <pasta>        learned-skills (padrao .bot/learned-skills)
 *   --project <nome>     projeto no ai-memory (padrao: auto-detecta pelo cwd)
 *   --transport docker|native   docker (padrao): grava no servidor que o MCP le;
 *                        native grava no data-dir do binario local, que e OUTRO
 *                        armazenamento (so use se o servidor tambem for nativo)
 *   --container <nome>   padrao "ai-memory"
 *
 * Idempotente (write-page atualiza a mesma pagina). Corpo passa por redacao de
 * segredos. Nunca apaga nada no ai-memory.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseFrontmatter, redact } from "../hooks/scripts/memory-lib.mjs";

const KIND_BY_STATE = { accepted: "gotcha", rejected: "decision", superseded: "decision", stale: "fact" };
const PINNED_STATES = new Set(["rejected", "superseded"]);

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

/** Le a pasta e devolve as paginas que seriam escritas. Funcao pura: testavel sem ai-memory. */
export function planPages(dir) {
  if (!existsSync(dir)) return [];
  const pages = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".md")).sort()) {
    const { data, body } = parseFrontmatter(readFileSync(join(dir, file), "utf8"));
    const name = data.name || file.replace(/\.md$/, "");
    const state = KIND_BY_STATE[data.state] ? data.state : "accepted";
    const triggers = Array.isArray(data.triggers) ? data.triggers : Array.isArray(data.trigger) ? data.trigger : [];
    const head = [
      `# ${name}`,
      "",
      `- estado: **${state}**${data.reason ? ` — ${data.reason}` : ""}`,
      data.superseded_by ? `- substituida por: ${data.superseded_by}` : "",
      triggers.length ? `- gatilhos: ${triggers.join(", ")}` : "",
      Array.isArray(data.files) && data.files.length ? `- arquivos citados: ${data.files.join(", ")}${data.commit ? ` (commit ${data.commit})` : ""}` : "",
      "- origem: learned-skill do dev-team-kit (`.bot/learned-skills`)",
      "",
    ].filter((l, i, a) => l !== "" || a[i - 1] !== "");
    pages.push({
      path: `learned-skills/${slug(name)}.md`,
      title: name,
      kind: KIND_BY_STATE[state],
      tier: "semantic",
      pinned: PINNED_STATES.has(state),
      tags: ["learned-skill", `state-${state}`, ...triggers.slice(0, 5).map(slug).filter(Boolean)],
      body: redact(`${head.join("\n")}\n${body.trim()}\n`),
    });
  }
  return pages;
}

/** Monta o comando; transport docker grava no mesmo servidor que o MCP consulta. */
export function buildCommand(page, { transport = "docker", container = "ai-memory", project = "", bin = "ai-memory" } = {}) {
  const wp = ["write-page", "--path", page.path, "--title", page.title, "--kind", page.kind, "--tier", page.tier, "--body", "-"];
  for (const t of page.tags) wp.push("--tag", t);
  if (page.pinned) wp.push("--pinned");
  if (project) wp.push("--project", project);
  return transport === "docker"
    ? { cmd: "docker", args: ["exec", "-i", container, "ai-memory", ...wp] }
    : { cmd: bin, args: wp };
}

function nativeBin() {
  if (process.env.AI_MEMORY_BIN) return process.env.AI_MEMORY_BIN;
  const local = join(homedir(), ".local", "bin", process.platform === "win32" ? "ai-memory.exe" : "ai-memory");
  return existsSync(local) ? local : "ai-memory";
}

function main() {
  const args = process.argv.slice(2);
  const opt = (name, fallback = "") => { const i = args.indexOf(name); return i !== -1 && args[i + 1] ? args[i + 1] : fallback; };
  const dir = resolve(opt("--dir", join(".bot", "learned-skills")));
  const transport = opt("--transport", "docker");
  const options = { transport, container: opt("--container", "ai-memory"), project: opt("--project"), bin: nativeBin() };
  const apply = args.includes("--apply");

  const pages = planPages(dir);
  if (!pages.length) { console.log(`Nenhuma learned-skill em ${dir}.`); return; }

  console.log(`${apply ? "Gravando" : "Plano (dry-run)"}: ${pages.length} pagina(s) via ${transport}${options.project ? `, projeto ${options.project}` : ""}\n`);
  let failed = 0;
  for (const page of pages) {
    const line = `${page.pinned ? "[fixa] " : ""}${page.path}  kind=${page.kind}  tags=${page.tags.join(",")}  ${page.body.length}B`;
    if (!apply) { console.log(`  ${line}`); continue; }
    const { cmd, args: cmdArgs } = buildCommand(page, options);
    const res = spawnSync(cmd, cmdArgs, { input: page.body, encoding: "utf8", timeout: 30000, windowsHide: true });
    const ok = res.status === 0;
    if (!ok) failed++;
    console.log(`  ${ok ? "ok  " : "FALHA"} ${line}${ok ? "" : `\n        ${(res.stderr || res.error?.message || "").trim().split("\n")[0]}`}`);
  }
  if (!apply) console.log("\nNada foi gravado. Use --apply para publicar.");
  if (failed) process.exitCode = 1;
}

// compara pelo caminho real: process.argv[1] pode vir por link simbolico (macOS /var -> /private/var) e import.meta.url nao; sem isso o script sai em silencio sem rodar
import { realpathSync as realpathMain } from "node:fs";
const isMainModule = (url) => { try { return realpathMain(process.argv[1]) === realpathMain(fileURLToPath(url)); } catch { return process.argv[1] === fileURLToPath(url); } };
if (process.argv[1] && isMainModule(import.meta.url)) main();
