#!/usr/bin/env node
/**
 * Stop hook (v2.22.0): nudge de auto-lapidacao de memoria.
 *
 * Inspirado no curator.py de nousresearch/hermes-agent (MIT, "the agent that
 * grows with you"): o Hermes roda um curador de memoria DISPARADO POR INATIVIDADE
 * (sem daemon cron) — quando o agente esta ocioso e a ultima curadoria foi ha
 * mais de N dias, ele forka um agente auxiliar pra revisar/consolidar/arquivar
 * skills criadas pelo proprio agente.
 *
 * ADAPTACAO PRO KIT: nao forkamos agente autonomo (risco de autonomia sobre
 * memoria sem revisao). Em vez disso, ao FINAL de uma sessao (evento Stop),
 * detectamos se o vault cresceu o suficiente E a ultima consolidacao foi ha
 * tempo demais — e SUGERIMOS rodar /consolidate-memory (que ja existe e cobre
 * merge/archive/promote/score com snapshot+dry-run+nunca-deletar).
 *
 * FILOSOFIA: PRECISAO > COBERTURA (igual topic-shift-detector). Nudge so dispara
 * quando ha sinal real de necessidade, com throttle de 1x/dia. Falso positivo
 * (sugerir consolidacao num vault pequeno/recem-limpo) treina o user a ignorar.
 *
 * NAO bloqueia. Apenas emite additionalContext nao-vinculante.
 *
 * Config (hooks/config.json -> memory_curator):
 *   enabled: true
 *   vault_path: "D:/claude-memory"   (fallback: .bot/ local)
 *   min_files_since_last: 30          (so nudge se cresceu >= N arquivos desde a ultima)
 *   min_days_since_last: 7            (so nudge se a ultima foi ha >= N dias)
 *   nudge_throttle_hours: 24          (no maximo 1 nudge por dia)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { readHookConfig, isHookDisabled, resolveBotPath } from "./utils.mjs";

function countMarkdown(dir) {
  let n = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        // 1 nivel de profundidade basta (logs/, architecture/<proj>/, learned-skills/)
        try {
          for (const sub of readdirSync(join(dir, entry.name), { withFileTypes: true })) {
            if (sub.isFile() && sub.name.endsWith(".md")) n++;
          }
        } catch { /* skip */ }
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        n++;
      }
    }
  } catch { /* dir missing → 0 */ }
  return n;
}

function resolveVault(cfgPath) {
  // 1. config explicito  2. D:/claude-memory  3. ~/claude-memory  4. .bot/ local
  const candidates = [
    cfgPath,
    "D:/claude-memory",
    join(homedir(), "claude-memory"),
    resolveBotPath("docs/memory"),
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p)) || null;
}

function getSession() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSession(state) {
  try {
    const p = resolveBotPath(".hook-session.json");
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(state, null, 2));
  } catch { /* never block */ }
}

// Le o state do curador: ultima consolidacao + contagem naquele momento.
// Guardado junto ao vault pra sobreviver entre sessoes/projetos.
function readCuratorState(vault) {
  try {
    return JSON.parse(readFileSync(join(vault, ".curator-state.json"), "utf-8"));
  } catch {
    return { last_consolidated_at: null, files_at_last: 0 };
  }
}

let _input = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (c) => (_input += c));
process.stdin.on("end", () => {
  if (isHookDisabled("memory-curator-nudge")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const cfg = readHookConfig("memory_curator", {
    enabled: true,
    vault_path: "D:/claude-memory",
    min_files_since_last: 30,
    min_days_since_last: 7,
    nudge_throttle_hours: 24,
  });
  if (!cfg.enabled) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try { input = JSON.parse(_input); } catch {}

  // Nunca interferir em stop por limite de contexto (evita deadlock de compactacao)
  if (input.reason === "context_limit" || input.stop_reason === "context_limit") {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const now = Date.now();
  const session = getSession();

  // Throttle: no maximo 1 nudge por janela configurada
  const lastNudge = session.memory_curator_last_nudge_ms || 0;
  if (now - lastNudge < cfg.nudge_throttle_hours * 3600 * 1000) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const vault = resolveVault(cfg.vault_path);
  if (!vault) {
    // Sem vault → nada a curar
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Contar arquivos de memoria relevantes (logs + architecture + learned-skills)
  let totalFiles = 0;
  for (const sub of ["logs", "architecture", "learned-skills", ".bot/learned-skills"]) {
    totalFiles += countMarkdown(join(vault, sub));
  }
  // Tambem learned-skills do projeto local (vault separado)
  totalFiles += countMarkdown(resolveBotPath("learned-skills"));

  const state = readCuratorState(vault);
  const filesAtLast = state.files_at_last || 0;
  const grewBy = totalFiles - filesAtLast;

  // Dias desde a ultima consolidacao
  let daysSince = Infinity;
  if (state.last_consolidated_at) {
    const last = new Date(state.last_consolidated_at).getTime();
    if (!Number.isNaN(last)) daysSince = (now - last) / (86400 * 1000);
  }

  // Gatilho: cresceu o suficiente E faz tempo demais (ambos, nao OR — precisao)
  const shouldNudge = grewBy >= cfg.min_files_since_last && daysSince >= cfg.min_days_since_last;

  if (!shouldNudge) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // ===== Nudge confirmado =====
  saveSession({ ...session, memory_curator_last_nudge_ms: now });

  const daysLabel = daysSince === Infinity ? "nunca consolidado" : `${Math.floor(daysSince)} dias atras`;
  const msg = [
    `[memory-curator] 🧹 Vault de memoria cresceu ${grewBy} arquivos desde a ultima curadoria (${daysLabel}).`,
    ``,
    `Where: vault em ${vault} tem ~${totalFiles} arquivos de memoria; ultima consolidacao ${daysLabel}.`,
    ``,
    `Why this matters: memoria nao-curada acumula duplicatas, fatos stale e learned-skills de score baixo. Isso degrada a qualidade do contexto injetado no SessionStart e infla o vault. (Conceito do curator.py de nousresearch/hermes-agent — auto-lapidacao disparada por inatividade.)`,
    ``,
    `Fix: rode /consolidate-memory (snapshot → dry-run → confirma → apply). Ele faz merge de duplicatas, arquiva score baixo, promove recorrentes — nunca deleta. Depois disso este aviso reseta.`,
    ``,
    `Ignorar: se preferir nao curar agora, ignore — o aviso so reaparece em ${cfg.nudge_throttle_hours}h.`,
    ``,
    `References: policies/memory-consolidation.md, policies/memory-curator.md, commands/consolidate-memory.md.`,
  ].join("\n");

  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: msg,
  }));
  process.exit(0);
});
