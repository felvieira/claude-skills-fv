#!/usr/bin/env node
/**
 * context-turn-counter.mjs (UserPromptSubmit)
 *
 * Duas funções complementares ao context-guard-stop (que só age no Stop):
 *
 * 1. COMPACT PERIÓDICO — A cada N turnos (default: 25) sem compactação,
 *    sugere /compact com lista de preserve/discard. Não espera o auto-compact
 *    em 95% (tarde demais, o modelo já está degradado). Previne context decay.
 *
 * 2. HANDOFF INTELIGENTE — Quando turnos > threshold_handoff (default: 50)
 *    sem compactação, gera instrução pra salvar estado no vault de memória
 *    e abrir nova sessão com contexto mínimo (só o essencial do working set).
 *    Usa o sistema de memória já existente (D:\claude-memory\logs\) em vez de
 *    perder contexto ao forçar /compact tarde.
 *
 * FILOSOFIA: precisão > cobertura. Não avisa a cada turno — só nas janelas
 * corretas. Usa .bot/.hook-session.json como state store (já existente).
 *
 * Ver policies/token-efficiency.md, policies/handoffs.md
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolveBotPath, isHookDisabled, readHookConfig } from "./utils.mjs";

function getSession() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSession(s) {
  mkdirSync(resolveBotPath(), { recursive: true });
  writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify(s, null, 2));
}

function getLastCompact() {
  try {
    const f = resolveBotPath(".context-turn-counter.json");
    return JSON.parse(readFileSync(f, "utf-8"));
  } catch {
    return { turns_since_compact: 0, session_turns: 0, last_compact_turn: 0 };
  }
}

function saveCounterState(state) {
  mkdirSync(resolveBotPath(), { recursive: true });
  writeFileSync(resolveBotPath(".context-turn-counter.json"), JSON.stringify(state, null, 2));
}

// Detecta se o prompt atual é /compact, /clear ou /handoff (resetar contador)
const RESET_PATTERNS = [
  /^\s*\/compact\b/i,
  /^\s*\/clear\b/i,
  /^\s*\/handoff\b/i,
  /^\s*\/new.session\b/i,
];

function isResetCommand(prompt) {
  return RESET_PATTERNS.some((p) => p.test(prompt));
}

// Detecta prompts de inspeção (não contar como turn produtivo)
const INSPECTION_PATTERNS = [
  /^\s*\/savings\b/i,
  /^\s*\/insights\b/i,
  /^\s*\/context-budget\b/i,
];

function isInspection(prompt) {
  return INSPECTION_PATTERNS.some((p) => p.test(prompt));
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (c) => { inputBuffer += c; });
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(inputBuffer); } catch {}

  if (isHookDisabled("context-turn-counter")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const cfg = readHookConfig("context_turn_counter", {
    enabled: true,
    compact_interval: 25,      // sugerir /compact a cada N turnos
    handoff_threshold: 50,     // sugerir handoff pra nova sessão
    min_warn_interval_turns: 5, // não repetir aviso em < N turnos
  });

  if (cfg.enabled === false) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const prompt = (input.prompt || "").trim();

  // Reset do contador se usuário rodou /compact ou /clear
  if (isResetCommand(prompt)) {
    const state = getLastCompact();
    state.turns_since_compact = 0;
    state.last_compact_turn = state.session_turns;
    state.last_warn_turn = 0;
    saveCounterState(state);
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Não contar nem avisar em inspeções
  if (isInspection(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Incrementar contadores
  const state = getLastCompact();
  state.session_turns = (state.session_turns || 0) + 1;
  state.turns_since_compact = (state.turns_since_compact || 0) + 1;
  const lastWarnTurn = state.last_warn_turn || 0;

  saveCounterState(state);

  const turnsSince = state.turns_since_compact;
  const sessionTurns = state.session_turns;

  // Não repetir aviso se avisou recentemente
  if (sessionTurns - lastWarnTurn < cfg.min_warn_interval_turns) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // HANDOFF: contexto muito grande — nova sessão recomendada
  if (turnsSince >= cfg.handoff_threshold) {
    state.last_warn_turn = sessionTurns;
    saveCounterState(state);

    // Ler último log de sessão do vault para orientar handoff
    const session = getSession();
    const lastPromptSnippet = session.last_prompt || "(desconhecido)";

    const guidance = [
      `[context-turn-counter] 🔄 Sessão longa: ${turnsSince} turnos sem /compact.`,
      ``,
      `Where: ${turnsSince} turnos desde o último compact/clear nesta sessão.`,
      ``,
      `Por que isso importa: após ~50 turnos o histórico carregado pode custar mais que o`,
      `trabalho em si — context decay (decisões anteriores caem fora da janela) e respostas`,
      `progressivamente degradadas. Abrir nova sessão com contexto mínimo custa muito menos.`,
      ``,
      `Ação recomendada — HANDOFF PARA NOVA SESSÃO:`,
      ``,
      `1. Salve o estado atual (rode /session-summary ou escreva manualmente):`,
      `   D:\\claude-memory\\logs\\YYYY-MM-DD-<projeto>-handoff.md`,
      `   Conteúdo mínimo: objetivo atual | decisões | pendências | próximo passo`,
      ``,
      `2. Abra nova sessão com prompt de retomada:`,
      `   "Continue de onde parou. Estado: <resumo de 3 linhas do handoff>`,
      `    Última ação: ${lastPromptSnippet}`,
      `    Ver log completo em D:\\claude-memory\\logs\\YYYY-MM-DD-<projeto>-handoff.md"`,
      ``,
      `3. OU: rode /compact agora para compactar sem abrir nova sessão:`,
      `   PRESERVE: objetivo atual, arquivos em edição, decisões desta sessão`,
      `   DISCARD: scaffolding inicial, discussões resolvidas, erros já corrigidos`,
      ``,
      `Alternativas: /compact (fica na sessão) | /handoff (gera o prompt de retomada)`,
      `Toggle: hooks/config.json → context_turn_counter.enabled: false`,
    ].join("\n");

    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: guidance,
      },
    }));
    return;
  }

  // COMPACT PERIÓDICO: sugestão leve quando turnos >= intervalo
  if (turnsSince >= cfg.compact_interval) {
    state.last_warn_turn = sessionTurns;
    saveCounterState(state);

    const guidance = [
      `[context-turn-counter] 💡 ${turnsSince} turnos desde o último /compact.`,
      ``,
      `Dica: rodar /compact agora (antes dos 75%) preserva contexto de forma controlada`,
      `e evita auto-compactação surpresa no meio de uma edição multi-arquivo.`,
      ``,
      `Quando rodar /compact, especifique:`,
      `  PRESERVE: objetivo atual, arquivos em edição ativa, decisões desta sessão`,
      `  DISCARD: scaffolding inicial, discussões já resolvidas, erros já corrigidos`,
      ``,
      `Não é obrigatório agora — só um lembrete. Se a sessão está simples, ignore.`,
      `(Aviso desaparece se você rodar /compact, /clear ou continuar sem problema.)`,
    ].join("\n");

    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: guidance,
      },
    }));
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
