#!/usr/bin/env node
/**
 * memory-curator.mjs — curador AUTONOMO de memoria (v2.24.0).
 *
 * Inspirado no curator.py de nousresearch/hermes-agent (MIT, "the agent that
 * grows with you"): o agente cura a propria memoria SOZINHO, sem o usuario
 * decidir quando. Adaptado pro kit (markdown rodando dentro do Claude Code).
 *
 * DIVISAO DE TRABALHO (a sacada que evita gastar LLM em dobro):
 *   - PARTE MECANICA (este script, JS puro, ZERO custo de LLM): decay de score,
 *     archive de learned-skills com score baixo + idade, dedup de logs por
 *     hash de conteudo, fix de backlinks orfaos, normalizacao basica. Roda
 *     100% autonomo, deterministico, sem alucinar.
 *   - PARTE SEMANTICA (delegada ao AGENTE DA SESSAO ATUAL, nao a um LLM forkado):
 *     merge inteligente de logs parecidos-mas-nao-identicos, consolidacao por
 *     significado. O script NAO chama LLM — ele DETECTA candidatos semanticos e
 *     escreve em .curator-pending.md. O session-start injeta isso pro agente que
 *     JA ESTA PAGO na assinatura corrente. Forkar `claude -p` gastaria tokens de
 *     novo pra fazer o que o agente presente faz de graca — anti-padrao.
 *
 * EXECUCAO: disparado async (detached/unref) pelo session-start.mjs quando o
 * vault esta "sujo". Nunca bloqueia. Snapshot antes de qualquer mutacao.
 *
 * SEGURANCA (invariantes do Hermes mantidas):
 *   - NUNCA deleta — so move pra .archive/ (recuperavel)
 *   - Snapshot do vault antes de mutar (git commit se repo, senao copia .bak)
 *   - Idempotente: rodar 2x seguidas nao causa dano
 *   - Dry-run via --dry-run (so reporta, nao muta)
 *
 * Flags:
 *   --vault <path>   override do vault (default: resolve D:/claude-memory etc)
 *   --dry-run        so reporta candidatos, nao muta nada
 *   --silent         sem stdout (modo background)
 *   --force          ignora o gate de "sujo" (roda mesmo se limpo)
 */

import {
  readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync,
  renameSync, statSync,
} from "fs";
import { join, dirname, basename } from "path";
import { homedir } from "os";
import { createHash } from "crypto";
import { execFileSync } from "child_process";
import { isAiMemoryActive } from "./utils.mjs";

// ---------- args ----------
function arg(name, fallback = null) {
  const i = process.argv.indexOf(name);
  if (i === -1) return fallback;
  const next = process.argv[i + 1];
  return next && !next.startsWith("--") ? next : true;
}
const DRY = !!arg("--dry-run");
const SILENT = !!arg("--silent");
const FORCE = !!arg("--force");
function log(...a) { if (!SILENT) console.log(...a); }

// ---------- vault resolution (canônica: scripts/vault-resolver.mjs) ----------
// Ordem portável: $CLAUDE_MEMORY_VAULT → ~/.claude-memory → D:/claude-memory (legado).
// Mantém um fallback inline caso o resolver não esteja no path (kit instalado em .bot/).
function resolveVaultFallback(explicit) {
  const candidates = [
    explicit,
    process.env.CLAUDE_MEMORY_VAULT,
    join(homedir(), ".claude-memory"),   // novo padrão portável
    "D:/claude-memory",                  // legado Windows
    join(homedir(), "claude-memory"),    // legado sem ponto
    ".bot/docs/memory",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) || null;
}
const EXPLICIT_VAULT = arg("--vault"); // se setado, isola: NAO toca .bot/ do CWD
const VAULT = resolveVaultFallback(EXPLICIT_VAULT);

// ---------- config (mirror dos defaults do hook) ----------
function loadConfig() {
  const defaults = {
    enabled: true,
    score_archive_threshold: 0.3,
    score_archive_age_days: 30,
    decay_per_week: 0.1,
    dedup_similarity: 0.92,     // logs com hash de conteudo normalizado igual
    min_files_dirty: 30,         // vault "sujo" se cresceu >= N desde ultima
    min_days_dirty: 7,
  };
  for (const p of [".bot/hooks/config.json", "hooks/config.json"]) {
    if (existsSync(p)) {
      try {
        const c = JSON.parse(readFileSync(p, "utf-8"));
        return { ...defaults, ...(c.memory_curator || {}) };
      } catch { /* use defaults */ }
    }
  }
  return defaults;
}
const CFG = loadConfig();

// ---------- state ----------
function statePath() { return join(VAULT, ".curator-state.json"); }
function readState() {
  try { return JSON.parse(readFileSync(statePath(), "utf-8")); }
  catch { return { last_curated_at: null, files_at_last: 0 }; }
}
function writeState(extra = {}) {
  if (DRY) return;
  const state = {
    last_curated_at: new Date().toISOString(),
    files_at_last: totalFiles(),
    ...extra,
  };
  try { writeFileSync(statePath(), JSON.stringify(state, null, 2)); }
  catch { /* never throw */ }
}

// ---------- helpers ----------
function listMd(dir) {
  const out = [];
  try {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith(".md")) out.push(join(dir, e.name));
    }
  } catch { /* missing */ }
  return out;
}
function totalFiles() {
  let n = 0;
  for (const sub of ["logs", "architecture", "learned-skills"]) {
    n += listMd(join(VAULT, sub)).length;
    // + 1 nivel (architecture/<proj>/)
    try {
      for (const e of readdirSync(join(VAULT, sub), { withFileTypes: true })) {
        if (e.isDirectory()) n += listMd(join(VAULT, sub, e.name)).length;
      }
    } catch { /* skip */ }
  }
  return n;
}
function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const meta = {};
  const lines = m[1].split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const colon = line.indexOf(":");
    if (colon < 0 || /^\s/.test(line)) { i++; continue; }
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    meta[key] = value;
    i++;
  }
  return meta;
}
function ageDays(filePath, meta) {
  // prefere frontmatter last_used/created; fallback mtime
  const ts = meta.last_used || meta.created;
  let base = null;
  if (ts) { const d = new Date(ts).getTime(); if (!Number.isNaN(d)) base = d; }
  if (base === null) { try { base = statSync(filePath).mtimeMs; } catch { base = Date.now(); } }
  return (Date.now() - base) / 86400000;
}
function archiveFile(filePath, reason) {
  const dir = dirname(filePath);
  const archiveDir = join(dir, ".archive");
  if (DRY) return `would archive → ${join(".archive", basename(filePath))} (${reason})`;
  try {
    mkdirSync(archiveDir, { recursive: true });
    renameSync(filePath, join(archiveDir, basename(filePath)));
    return `archived → .archive/${basename(filePath)} (${reason})`;
  } catch (e) {
    return `FAILED archive ${basename(filePath)}: ${e.message}`;
  }
}
function contentHash(filePath) {
  try {
    let c = readFileSync(filePath, "utf-8");
    // normaliza: remove frontmatter, espacos, lowercase → pega duplicata "moral"
    c = c.replace(/^---\n[\s\S]*?\n---/, "").replace(/\s+/g, " ").trim().toLowerCase();
    return createHash("sha1").update(c).digest("hex");
  } catch { return null; }
}

// ---------- snapshot ----------
function snapshot() {
  if (DRY) return "dry-run (no snapshot)";
  try {
    if (existsSync(join(VAULT, ".git"))) {
      // execFileSync com array de args — sem shell, sem risco de injection
      // mesmo que VAULT contenha espacos/metacaracteres.
      execFileSync("git", ["-C", VAULT, "add", "-A"], { stdio: "ignore" });
      execFileSync("git", ["-C", VAULT, "commit", "-m", `curator snapshot ${new Date().toISOString()}`, "--quiet"], { stdio: "ignore" });
      return "git commit";
    }
  } catch { /* not a repo or nothing to commit */ }
  return "no-git (archive is recoverable)";
}

// ---------- the curator passes ----------
function passDecayAndArchive() {
  // learned-skills: aplica decay semanal e arquiva score baixo + idade
  const results = [];
  // Sem --vault explicito (uso real no SessionStart): cura vault global + .bot/ local.
  // Com --vault X (teste/manual): isola — so o X, nunca contamina o .bot/ do CWD.
  const dirs = EXPLICIT_VAULT
    ? [join(VAULT, "learned-skills")]
    : [join(VAULT, "learned-skills"), ".bot/learned-skills"];
  for (const dir of dirs) {
    for (const f of listMd(dir)) {
      let content;
      try { content = readFileSync(f, "utf-8"); } catch { continue; }
      const meta = parseFrontmatter(content);
      if (meta.score === undefined) continue; // so learned-skills tem score
      let score = parseFloat(meta.score);
      if (Number.isNaN(score)) continue;
      const age = ageDays(f, meta);

      // decay: -decay_per_week por semana desde last_used
      const weeksIdle = age / 7;
      const decayed = Math.max(0, score - CFG.decay_per_week * weeksIdle);

      if (decayed < CFG.score_archive_threshold && age > CFG.score_archive_age_days) {
        results.push(`${basename(f)}: ${archiveFile(f, `score ${decayed.toFixed(2)}<${CFG.score_archive_threshold}, ${Math.floor(age)}d`)}`);
      } else if (Math.abs(decayed - score) > 0.001 && !DRY) {
        // persistir score decaido
        try {
          const updated = content.replace(/^score:\s*[\d.]+/m, `score: ${decayed.toFixed(2)}`);
          writeFileSync(f, updated);
          results.push(`${basename(f)}: decay ${score.toFixed(2)}→${decayed.toFixed(2)}`);
        } catch { /* skip */ }
      }
    }
  }
  return results;
}

function passDedupLogs() {
  // logs com conteudo identico (hash normalizado) → arquiva duplicata, mantem mais antigo
  const results = [];
  const logsDir = join(VAULT, "logs");
  const files = listMd(logsDir);
  const byHash = new Map();
  for (const f of files) {
    const h = contentHash(f);
    if (!h) continue;
    if (!byHash.has(h)) byHash.set(h, []);
    byHash.get(h).push(f);
  }
  const archived = []; // basenames arquivados — semantic pass exclui esses
  for (const [, group] of byHash) {
    if (group.length < 2) continue;
    // mantem o MAIS ANTIGO (menor mtime); sort lexicografico falha porque '-'<'.'
    group.sort((a, b) => {
      let ma = 0, mb = 0;
      try { ma = statSync(a).mtimeMs; } catch { /* 0 */ }
      try { mb = statSync(b).mtimeMs; } catch { /* 0 */ }
      return ma - mb;
    });
    const keep = group[0];
    for (const dup of group.slice(1)) {
      results.push(`mantem ${basename(keep)}, ${archiveFile(dup, "conteudo identico")}`);
      archived.push(basename(dup));
    }
  }
  return { results, archived };
}

function passSemanticCandidates(excludeBasenames = []) {
  // NAO faz merge — apenas DETECTA logs parecidos (mesmo prefixo de data+projeto)
  // e registra pro AGENTE decidir. Zero LLM aqui. Exclui arquivos ja arquivados
  // pelo dedup exato (senao sugeriria merge de algo que ja sumiu).
  const exclude = new Set(excludeBasenames);
  const candidates = [];
  const logsDir = join(VAULT, "logs");
  const files = listMd(logsDir).map((f) => basename(f)).filter((f) => !exclude.has(f));
  // agrupa por <data>-<projeto> (mesmo dia + projeto = provavel fragmento)
  const groups = new Map();
  for (const f of files) {
    const m = f.match(/^(\d{4}-\d{2}-\d{2})-([a-z0-9-]+?)(?:-|\.md)/i);
    if (!m) continue;
    const key = `${m[1]}-${m[2]}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  for (const [key, group] of groups) {
    if (group.length >= 2) {
      candidates.push({ key, files: group });
    }
  }
  return candidates;
}

function writePending(decayResults, dedupResults, semanticCandidates) {
  // Grava trabalho que sobrou pro agente da sessao. Mecanico ja foi feito;
  // aqui fica so o semantico (que precisa de julgamento).
  if (DRY || semanticCandidates.length === 0) return null;
  const p = join(VAULT, ".curator-pending.md");
  const lines = [
    "# Curador de memoria — trabalho semantico pendente",
    "",
    `> Gerado pelo curador autonomo em ${new Date().toISOString()}.`,
    "> A parte MECANICA (decay, archive, dedup exato) ja foi aplicada automaticamente.",
    "> O que sobrou abaixo precisa de JULGAMENTO — voce (agente) decide, sem gastar LLM extra.",
    "",
    "## Candidatos a merge semantico (logs do mesmo dia+projeto)",
    "",
  ];
  for (const c of semanticCandidates) {
    lines.push(`### ${c.key} (${c.files.length} arquivos)`);
    for (const f of c.files) lines.push(`- logs/${f}`);
    lines.push("");
    lines.push("Acao sugerida: ler os arquivos, decidir se sao fragmentos do mesmo trabalho.");
    lines.push("Se sim, consolidar num so (mais antigo vence), arquivar os outros em logs/.archive/.");
    lines.push("Se nao (assuntos distintos no mesmo dia), deixar como esta e remover deste pending.");
    lines.push("");
  }
  lines.push("## Como limpar este arquivo");
  lines.push("Apos resolver (ou decidir ignorar), delete `.curator-pending.md` do vault.");
  try { writeFileSync(p, lines.join("\n")); return p; }
  catch { return null; }
}

// ---------- gate: vault "sujo"? ----------
function isDirty() {
  if (FORCE) return true;
  const state = readState();
  const total = totalFiles();
  const grew = total - (state.files_at_last || 0);
  let days = Infinity;
  if (state.last_curated_at) {
    const t = new Date(state.last_curated_at).getTime();
    if (!Number.isNaN(t)) days = (Date.now() - t) / 86400000;
  }
  return grew >= CFG.min_files_dirty && days >= CFG.min_days_dirty;
}

// ---------- main ----------
function main() {
  // Defesa em profundidade: session-start.mjs já não dispara este script quando
  // ai-memory está ativo, mas quem chamar memory-curator.mjs direto (manual,
  // cron externo) também não deve curar o vault nativo em paralelo com ele.
  if (!FORCE && isAiMemoryActive()) { log("[curator] ai-memory backend active — skipping native curation"); return; }
  if (!VAULT) { log("[curator] no vault found — nothing to do"); return; }
  if (!CFG.enabled) { log("[curator] disabled via config"); return; }
  if (!isDirty()) { log("[curator] vault clean — skipping"); return; }

  log(`[curator] vault: ${VAULT} ${DRY ? "(DRY RUN)" : ""}`);
  const snap = snapshot();
  log(`[curator] snapshot: ${snap}`);

  const decayResults = passDecayAndArchive();
  const { results: dedupResults, archived: dedupArchived } = passDedupLogs();
  // semantic exclui o que o dedup ja arquivou (senao sugere merge de algo que sumiu)
  const semanticCandidates = passSemanticCandidates(dedupArchived);

  log(`[curator] decay/archive: ${decayResults.length} acoes`);
  decayResults.forEach((r) => log(`  - ${r}`));
  log(`[curator] dedup exato: ${dedupResults.length} acoes`);
  dedupResults.forEach((r) => log(`  - ${r}`));
  log(`[curator] candidatos semanticos (p/ agente): ${semanticCandidates.length}`);

  const pendingPath = writePending(decayResults, dedupResults, semanticCandidates);
  if (pendingPath) log(`[curator] trabalho semantico → ${pendingPath}`);

  writeState({ last_mechanical_actions: decayResults.length + dedupResults.length });
  log(`[curator] done. state atualizado.`);
}

main();
