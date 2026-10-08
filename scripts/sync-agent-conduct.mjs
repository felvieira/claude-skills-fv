#!/usr/bin/env node
/**
 * sync-agent-conduct — mantem o bloco "Conduta" de cada agents/*.md igual a policies/subagent-conduct.md.
 *
 *   node scripts/sync-agent-conduct.mjs            # confere; exit 1 se algum agente divergir
 *   node scripts/sync-agent-conduct.mjs --write    # reescreve os blocos
 *
 * O perfil (leitura ou escrita) sai das ferramentas do frontmatter: Edit ou Write => escrita; senao leitura.
 * Excecoes explicitas em WRITE_OVERRIDES.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const POLICY = join(root, "policies", "subagent-conduct.md");
const AGENTS = join(root, "agents");
const WRITE_OVERRIDES = new Set(["codeql-runner"]); // so tem Bash, mas constroi bancos de dados no disco

// checkout no Windows com autocrlf traz CRLF: compara sempre em LF e devolve ao arquivo o fim de linha que ele tinha
const toLF = (text) => text.split("\r\n").join("\n");

const section = (text, name) => {
  const m = toLF(text).match(new RegExp(`<!-- ${name} -->\\n([\\s\\S]*?)\\n<!-- /${name} -->`));
  if (!m) throw new Error(`policies/subagent-conduct.md: bloco <!-- ${name} --> nao encontrado`);
  return m[1].trim();
};

export function profileFor(name, frontmatter) {
  const tools = (frontmatter.match(/^tools:\s*(.*)$/m) || [, ""])[1];
  return WRITE_OVERRIDES.has(name) || /\b(Edit|Write)\b/.test(tools) ? "write" : "read";
}

export function expectedBlock(profile, policyText = readFileSync(POLICY, "utf8")) {
  if (!["read", "write"].includes(profile)) throw new Error(`perfil invalido: ${profile}`);
  return [`<!-- conduct:start profile=${profile} -->`, "## Conduta", "", section(policyText, "common"), section(policyText, profile), "<!-- conduct:end -->"].join("\n");
}

const BLOCK_RE = /<!-- conduct:start profile=\w+ -->[\s\S]*?<!-- conduct:end -->/;

export function applyBlock(content, block) {
  return BLOCK_RE.test(content) ? content.replace(BLOCK_RE, () => block) : `${content.replace(/\s*$/, "")}\n\n${block}\n`;
}

export function listAgents() {
  return readdirSync(AGENTS).filter((f) => f.endsWith(".md")).sort().map((f) => ({ name: f.replace(/\.md$/, ""), file: join(AGENTS, f) }));
}

/** Devolve [{name, profile, ok}] e, com write=true, corrige os que divergem. */
export function sync({ write = false } = {}) {
  const policy = readFileSync(POLICY, "utf8");
  return listAgents().map(({ name, file }) => {
    const raw = readFileSync(file, "utf8");
    const crlf = raw.includes("\r\n");
    const content = toLF(raw);
    const fm = (content.match(/^---\n([\s\S]*?)\n---/) || [, ""])[1];
    const profile = profileFor(name, fm);
    const next = applyBlock(content, expectedBlock(profile, policy));
    const ok = next === content;
    if (!ok && write) writeFileSync(file, crlf ? next.split("\n").join("\r\n") : next);
    return { name, profile, ok };
  });
}

function main() {
  const write = process.argv.includes("--write");
  const rows = sync({ write });
  const drift = rows.filter((r) => !r.ok);
  for (const r of rows) console.log(`${r.ok ? "ok " : write ? "fix" : "DIV"}  ${r.name} (${r.profile})`);
  if (drift.length && !write) { console.error(`${drift.length} agente(s) divergem de policies/subagent-conduct.md. Rode com --write.`); process.exit(1); }
  console.log(write ? `${drift.length} agente(s) atualizados.` : "todos os agentes seguem a politica.");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
