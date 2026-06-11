#!/usr/bin/env node
/**
 * auto-skillify.mjs — UserPromptSubmit hook.
 *
 * Adapta o "skillify a cada N turnos" do activeloopai/hivemind ao runtime do kit.
 *
 * O hivemind roda um worker que a cada N turnos pergunta ao Haiku "a atividade
 * recente vale virar SKILL.md?". Como hooks .mjs são determinísticos e não podem
 * chamar API, adaptamos ao padrão do memory-curator: o hook DETECTA a cadência
 * e INJETA um prompt pedindo ao agente da sessão (que já está pago na assinatura
 * corrente) pra avaliar e, se valer, criar o learned-skill. Forkar Haiku gastaria
 * tokens novos pra fazer o que o agente presente faz de graça — anti-padrão.
 *
 * Dispara a cada `every_n_turns` (default 20) turnos produtivos. Uma vez por
 * janela. Reseta junto com /compact, /clear, /handoff.
 *
 * Output: { continue: true, hookSpecificOutput: { additionalContext } }
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { readHookConfig, isHookDisabled, resolveBotPath } from "./utils.mjs";

function getSession() {
  try { return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8")); }
  catch { return {}; }
}
function saveSession(s) {
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify(s));
  } catch {}
}

// lê a contagem de turnos mantida pelo context-turn-counter (fonte única de verdade)
function getSessionTurns() {
  try {
    const f = resolveBotPath(".context-turn-counter.json");
    const s = JSON.parse(readFileSync(f, "utf-8"));
    return s.session_turns || 0;
  } catch { return 0; }
}

const RESET = [/^\s*\/compact\b/i, /^\s*\/clear\b/i, /^\s*\/handoff\b/i, /^\s*\/new.session\b/i];
const isReset = (p) => RESET.some((r) => r.test(p));

let buf = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (c) => { buf += c; });
process.stdin.on("end", () => {
  if (isHookDisabled("auto-skillify")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try { input = JSON.parse(buf); } catch {}
  const prompt = input.prompt || "";

  const cfg = readHookConfig("auto_skillify", {
    enabled: true,
    every_n_turns: 20,       // cadência de codificação (hivemind default)
    min_turns_first: 12,     // não dispara antes de N turnos (sessão precisa ter substância)
  });

  const session = getSession();

  // reset junto com compact/clear/handoff
  if (isReset(prompt)) {
    session.last_skillify_turn = 0;
    saveSession(session);
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const turns = getSessionTurns();
  const last = session.last_skillify_turn || 0;
  const everyN = cfg.every_n_turns || 20;
  const minFirst = cfg.min_turns_first || 12;

  // dispara quando: passou everyN turnos desde o último skillify E já tem substância
  const due = turns >= minFirst && (turns - last) >= everyN;
  if (!due) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  session.last_skillify_turn = turns;
  saveSession(session);

  const ctx = [
    `[auto-skillify] 🧠 Checkpoint de codificação (turno ${turns}, a cada ${everyN}).`,
    ``,
    `Inspirado no "skillify" do hivemind (activeloopai): periodicamente, destile o que`,
    `vale guardar pra não re-derivar na próxima sessão.`,
    ``,
    `PERGUNTA (responda mentalmente, aja só se SIM): nos últimos ~${everyN} turnos, houve`,
    `alguma descoberta que passa nos 3 critérios de learned-skill?`,
    `  1. NÃO é googleável (nenhum doc/SO público cobre)`,
    `  2. É específica DESTE codebase (não conselho genérico)`,
    `  3. Custou debugging real (>15 min, hipótese-driven)`,
    ``,
    `Se os 3 forem verdadeiros → crie .bot/learned-skills/<slug>.md com frontmatter`,
    `(name, trigger[], created, source_file) + seções Symptom / Root cause / Fix /`,
    `How NOT to fix it. Siga policies/memory-write-rules.md (não fabrique; TBD pro incerto).`,
    ``,
    `Se NENHUM critério bate → ignore e siga. Skill-slot é caro; fix genérico não merece.`,
    `(este checkpoint não bloqueia — é um nudge de cadência, não uma ordem)`,
  ].join("\n");

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: ctx },
  }));
});
