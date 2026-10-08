/**
 * Conduta dos subagentes: cada agents/*.md carrega o bloco certo (leitura ou escrita), identico a policies/subagent-conduct.md.
 * Roda com: node --test scripts/tests/agents-conduct.test.mjs
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { applyBlock, expectedBlock, listAgents, profileFor, sync } from "../sync-agent-conduct.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const LF = (text) => text.split("\r\n").join("\n"); // checkout no Windows com autocrlf traz CRLF
const read = (p) => LF(readFileSync(join(root, p), "utf8"));
const BLOCK = /<!-- conduct:start profile=(\w+) -->[\s\S]*?<!-- conduct:end -->/g;

test("todos os agentes seguem a politica (nenhum divergiu)", () => {
  const rows = sync();
  assert.equal(rows.length, 16, `esperava 16 agentes, achei ${rows.length}`);
  assert.deepEqual(rows.filter((r) => !r.ok).map((r) => r.name), [], "rode: node scripts/sync-agent-conduct.mjs --write");
});

test("cada agente tem exatamente um bloco, com o perfil certo para as ferramentas dele", () => {
  for (const { name, file } of listAgents()) {
    const text = LF(readFileSync(file, "utf8"));
    const blocks = [...text.matchAll(BLOCK)];
    assert.equal(blocks.length, 1, `${name}: ${blocks.length} blocos de conduta`);
    const fm = text.match(/^---\n([\s\S]*?)\n---/)[1];
    assert.equal(blocks[0][1], profileFor(name, fm), `${name}: perfil errado`);
    const writes = /\b(Edit|Write)\b/.test(fm.match(/^tools:\s*(.*)$/m)[1]) || name === "codeql-runner";
    assert.equal(blocks[0][0].includes("Reversível por padrão"), writes, `${name}: reversibilidade so para quem escreve`);
    assert.equal(blocks[0][0].includes("Só leitura"), !writes, `${name}: "so leitura" so para quem nao escreve`);
    assert.ok(blocks[0][0].includes("Investigue antes de afirmar"), `${name}: falta o bloco comum`);
  }
});

test("profileFor: Edit ou Write => escrita; so leitura/Bash => leitura; codeql-runner e excecao", () => {
  assert.equal(profileFor("x", "tools: Read, Grep, Glob, Bash"), "read");
  assert.equal(profileFor("x", "tools: Read, Grep, Glob, Write"), "write");
  assert.equal(profileFor("x", "tools: Read, Edit"), "write");
  assert.equal(profileFor("codeql-runner", "tools: Read, Bash"), "write");
  assert.throws(() => expectedBlock("admin"), /perfil invalido/);
});

test("CRLF (checkout do Windows com autocrlf): confere, corrige e preserva o fim de linha", () => {
  const dir = mkdtempSync(join(tmpdir(), "conduct-crlf-"));
  const toCRLF = (text) => LF(text).split("\n").join("\r\n");
  try {
    for (const d of ["agents", "policies", "scripts"]) cpSync(join(root, d), join(dir, d), { recursive: true });
    for (const d of ["agents", "policies"]) for (const f of readdirSync(join(dir, d)).filter((n) => n.endsWith(".md"))) { const fp = join(dir, d, f); writeFileSync(fp, toCRLF(readFileSync(fp, "utf8"))); }
    const run = (...args) => spawnSync(process.execPath, [join(dir, "scripts", "sync-agent-conduct.mjs"), ...args], { encoding: "utf8" });
    const first = run();
    assert.equal(first.status, 0, first.stderr + first.stdout);
    const fp = join(dir, "agents", "code-reviewer.md");
    writeFileSync(fp, readFileSync(fp, "utf8").replace("Investigue antes de afirmar", "Texto antigo"));
    assert.equal(run().status, 1, "bloco desatualizado em arquivo CRLF deve reprovar");
    assert.equal(run("--write").status, 0);
    const fixed = readFileSync(fp, "utf8");
    assert.ok(fixed.includes("Investigue antes de afirmar"));
    assert.equal(fixed.split("\r\n").join("").includes("\n"), false, "todas as quebras continuam CRLF");
    assert.equal(run().status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("applyBlock: acrescenta no fim, substitui o bloco existente e e idempotente", () => {
  const block = expectedBlock("read");
  const once = applyBlock("# Agente\n\ntexto\n", block);
  assert.ok(once.endsWith("<!-- conduct:end -->\n"));
  assert.equal(applyBlock(once, block), once, "idempotente");
  const stale = once.replace("Investigue antes de afirmar", "Texto antigo");
  assert.notEqual(stale, once);
  assert.equal(applyBlock(stale, block), once, "bloco desatualizado volta ao da politica");
  assert.equal([...applyBlock(once, block).matchAll(BLOCK)].length, 1, "nunca duplica");
});

test("os blocos da politica e os agentes nao usam linguagem de ordem em caixa alta", () => {
  const shout = /\b(YOU MUST|MUST|NEVER|ALWAYS|IMPORTANT)\b|CRITICAL:|CRÍTICO:/;
  // a prosa da politica cita o exemplo do guia de proposito; a trava vale para o texto que vai para os agentes
  for (const profile of ["read", "write"]) assert.ok(!shout.test(expectedBlock(profile)), `bloco ${profile} com caixa alta de ordem`);
  for (const { name, file } of listAgents()) assert.ok(!shout.test(LF(readFileSync(file, "utf8"))), `${name}: caixa alta de ordem (o guia diz que modelos recentes disparam demais com isso)`);
});

test("orchestrator tem a regra de quando delegar e o repasse de contexto ao subagente", () => {
  const t = read("agents/orchestrator.md");
  assert.match(t, /## Quando delegar e quando trabalhar direto/);
  assert.match(t, /não vê esta conversa/);
});

test("o CI roda este teste e confere o sync", () => {
  const ci = read(".github/workflows/validate.yml");
  assert.match(ci, /agents-conduct\.test\.mjs/);
});
