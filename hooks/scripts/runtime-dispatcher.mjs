#!/usr/bin/env node

/**
 * Cross-runtime hook dispatcher for Claude Code and Codex.
 *
 * The kit's sensors use Claude Code's payload vocabulary. Codex supports the
 * same lifecycle names but may use different field and tool names. This file
 * normalizes the payload, runs the canonical sensors, merges their responses,
 * and always fails open so an optional sensor can never break a tool call.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { consumePendingContext, savePendingContext } from "./deferred-context.mjs";
import { guardsPath } from "./session-guards-lib.mjs";

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
const kitRoot = path.resolve(scriptsDir, "..", "..");

const EVENT_SCRIPTS = {
  UserPromptSubmit: [
    "pre-execution-gate.mjs",
    "keyword-detector.mjs",
    "pre-build-gate.mjs",
    "pre-code-ladder-guard.mjs",
    "intent-classifier.mjs",
    "topic-shift-detector.mjs",
    "context-turn-counter.mjs",
    "auto-skillify.mjs",
  ],
  SessionStart: ["session-start.mjs"],
  PreToolUse: [
    "agent-dispatch-validator.mjs",
    "investigate-first-guard.mjs",
    "design-anchor-guard.mjs",
    "session-guard.mjs",
    "permission-ladder-guard.mjs",
    "pre-tool-enforcer.mjs",
    "model-routing-hook.mjs",
    "simplify-ignore.mjs",
  ],
  PostToolUse: [
    "post-tool-verifier.mjs",
    "claim-verifier.mjs",
    "simplify-ignore.mjs",
    "session-event-logger.mjs",
    "constitution-watcher.mjs",
    "ai-writing-detector.mjs",
    "conflict-resolution-reminder.mjs",
    "graph-update-post-tool.mjs",
  ],
  Stop: ["context-guard-stop.mjs", "persistent-mode.mjs", "stop-savings-summary.mjs"],
  PreCompact: ["precompact-capture.mjs"],
};

// Scripts de Pre/PostToolUse que SAEM SEM FAZER NADA quando a ferramenta nao e uma das abaixo (cada
// um tem um `if (toolName !== ...) process.exit(0)` proprio). Nao spawnar evita um processo node
// (~55 ms + carga do modulo) por script, por chamada de ferramenta — medido: ~600 ms -> ~300 ms num
// Read/Grep. A lista espelha o filtro de cada script; scripts/tests/memory-hooks.test.mjs prova a
// equivalencia (rodar o script com uma ferramenta fora da lista nao produz nada) e quebra se uma
// lista divergir. Scripts que tratam toda ferramenta (session-event-logger, simplify-ignore,
// pre-tool-enforcer, design-anchor-guard, permission-ladder-guard) nao entram aqui.
// Desligar: DEVKIT_NO_TOOL_FILTER=1.
const TOOL_FILTERS = {
  "agent-dispatch-validator.mjs": ["Agent", "Task"],
  "investigate-first-guard.mjs": ["AskUserQuestion"],
  "model-routing-hook.mjs": ["EnterPlanMode", "ExitPlanMode", "Agent"],
  "post-tool-verifier.mjs": ["Edit", "Write"],
  "claim-verifier.mjs": ["Bash", "Edit", "Write", "NotebookEdit", "mcp__Desktop_Commander__write_file", "mcp__Desktop_Commander__edit_block", "mcp__Desktop_Commander__start_process"],
  "constitution-watcher.mjs": ["Edit", "Write", "MultiEdit"],
  "ai-writing-detector.mjs": ["Write", "Edit", "MultiEdit"],
  "graph-update-post-tool.mjs": ["Edit", "Write", "NotebookEdit"],
  "conflict-resolution-reminder.mjs": ["AskUserQuestion", "Bash"],
  "permission-ladder-guard.mjs": ["Bash"],
  "session-guard.mjs": ["Edit", "Write", "MultiEdit", "NotebookEdit"],
};

function shouldSkipByTool(script, event, toolName, cwd) {
  if (event !== "PreToolUse" && event !== "PostToolUse") return false;
  if (process.env.DEVKIT_NO_TOOL_FILTER === "1") return false;
  // /freeze desligado (caso comum): sem arquivo de estado nao ha o que checar, nem spawna.
  if (script === "session-guard.mjs" && !fs.existsSync(guardsPath(cwd || process.cwd()))) return true;
  const allowed = TOOL_FILTERS[script];
  return Boolean(allowed) && !allowed.includes(toolName);
}

// Perfil "so memoria" (`runtime-dispatcher.mjs <Evento> memory` ou DEVKIT_RUNTIME_PROFILE=memory):
// para agentes que nao falam o vocabulario do kit (Grok Build, Cursor...). Roda so o que e memoria —
// injecao de learned-skills (sem gatilhos de skill) e captura pre-compactacao — e nenhum dos gates
// de prompt/ferramenta. Alem de remover ruido, custa 1-2 processos em vez de 6-8 por evento.
const MEMORY_PROFILE_SCRIPTS = {
  UserPromptSubmit: ["keyword-detector.mjs"],
  PostToolUse: [], // so o perfil memory-deferred faz algo aqui (entrega o contexto guardado)
  PreCompact: ["precompact-capture.mjs"],
};

// Eventos onde um pacote de recuperacao pendente e entregue. SessionStart fica
// de fora de proposito: nem todo host honra additionalContext ali, e o pacote
// so e apagado quando entregue.
const RECOVERY_EVENTS = new Set(["UserPromptSubmit", "PostToolUse"]);

function hasPendingCompactionPacket(payload) {
  const sid = String(payload.session_id || "").replace(/[^A-Za-z0-9_-]/g, "");
  if (!sid) return false;
  return fs.existsSync(path.join(payload.cwd || process.cwd(), ".auto", "compaction", `${sid}.json`));
}

function readInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function canonicalEvent(value) {
  const compact = String(value || "").replace(/[_-]/g, "").toLowerCase();
  return Object.keys(EVENT_SCRIPTS).find((event) => event.toLowerCase() === compact) || "";
}

function canonicalToolName(value) {
  const raw = String(value || "Unknown");
  const name = raw.toLowerCase().replace(/^functions\./, "");
  if (/exec_command|write_stdin|shell|bash|powershell|terminal/.test(name)) return "Bash";
  if (/apply_patch|edit_file|replace/.test(name)) return "Edit";
  if (/write_file/.test(name)) return "Write";
  if (/read_file|read_mcp_resource|view_image/.test(name)) return "Read";
  if (/grep|search_text|ripgrep/.test(name)) return "Grep";
  if (/glob|find_files/.test(name)) return "Glob";
  if (/request_user_input|askuserquestion/.test(name)) return "AskUserQuestion";
  return raw;
}

function normalize(input, event) {
  const toolInput = input.tool_input ?? input.input ?? input.arguments ?? {};
  const toolOutput = input.tool_response ?? input.tool_result ?? input.output ?? input.result ?? {};
  return {
    ...input,
    hook_event_name: event,
    tool_name: canonicalToolName(input.tool_name ?? input.tool ?? input.toolName),
    tool_input: toolInput,
    tool_response: toolOutput,
    tool_result: input.tool_result ?? toolOutput,
    prompt: input.prompt ?? input.user_prompt ?? input.message ?? "",
  };
}

function appendError(event, script, result) {
  try {
    const dir = path.join(process.cwd(), ".auto");
    fs.mkdirSync(dir, { recursive: true });
    const record = {
      ts: new Date().toISOString(),
      event,
      script,
      status: result.status,
      signal: result.signal,
      error: result.error?.message || "hook subprocess failed",
    };
    fs.appendFileSync(path.join(dir, "hook-errors.jsonl"), `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Diagnostics are best-effort only.
  }
}

function mergeResponse(target, source, contexts, systemMessages) {
  if (!source || typeof source !== "object") return;
  if (source.continue === false) target.continue = false;
  for (const key of ["stopReason", "decision", "reason", "suppressOutput"]) {
    if (source[key] !== undefined) target[key] = source[key];
  }
  if (source.systemMessage) systemMessages.push(String(source.systemMessage));
  if (source.tool_input !== undefined) target.tool_input = source.tool_input;
  if (source.tool_result !== undefined) target.tool_result = source.tool_result;

  const specific = source.hookSpecificOutput;
  if (!specific || typeof specific !== "object") return;
  if (specific.additionalContext) contexts.push(String(specific.additionalContext));
  target.hookSpecificOutput ||= {};
  for (const [key, value] of Object.entries(specific)) {
    if (key !== "hookEventName" && key !== "additionalContext") target.hookSpecificOutput[key] = value;
  }
}

function run() {
  const input = readInput();
  const event = canonicalEvent(process.argv[2] || input.hook_event_name || input.event);
  if (!event) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const payload = normalize(input, event);
  const serialized = JSON.stringify(payload);
  // Stop hooks have a narrower contract in Codex: an allowed stop must emit
  // an empty JSON object, while a blocked stop uses decision/reason. The
  // generic `continue` field is valid for turn/tool hooks but is rejected by
  // Codex's Stop parser.
  // PreCompact tambem responde `{}`: o contrato de saida desse evento nao esta
  // documentado de forma estavel entre hosts, e `{}` e valido em todos.
  const response = event === "Stop" || event === "PreCompact" ? {} : { continue: true };
  const contexts = [];
  const systemMessages = [];

  // `memory-deferred` = `memory` para hosts que descartam o contexto do UserPromptSubmit (Grok Build):
  // o que seria injetado no prompt fica guardado e sai no primeiro PostToolUse.
  const deferred = process.argv[3] === "memory-deferred" || process.env.DEVKIT_RUNTIME_PROFILE === "memory-deferred";
  const memoryOnly = deferred || process.argv[3] === "memory" || process.env.DEVKIT_RUNTIME_PROFILE === "memory";
  const scripts = [...(memoryOnly ? MEMORY_PROFILE_SCRIPTS[event] || [] : EVENT_SCRIPTS[event])];
  const recoveryHere = deferred ? event === "PostToolUse" : RECOVERY_EVENTS.has(event);
  if (recoveryHere && hasPendingCompactionPacket(payload)) {
    scripts.unshift("compaction-recover.mjs");
  }

  const trace = [];
  for (const script of scripts) {
    if (shouldSkipByTool(script, event, payload.tool_name, payload.cwd)) continue;
    trace.push(script);
    const result = spawnSync(process.execPath, [path.join(scriptsDir, script)], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT || kitRoot,
        ...(memoryOnly ? { DEVKIT_LEARNED_ONLY: "1" } : {}),
      },
      input: serialized,
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
    });
    if (result.status !== 0 || result.error) {
      appendError(event, script, result);
      continue;
    }
    const stdout = String(result.stdout || "").trim();
    if (!stdout) continue;
    try {
      mergeResponse(response, JSON.parse(stdout), contexts, systemMessages);
    } catch {
      appendError(event, script, { ...result, error: new Error("invalid hook JSON") });
    }
  }

  if (deferred && event === "UserPromptSubmit" && contexts.length) {
    savePendingContext(payload.cwd || process.cwd(), payload.session_id, contexts.join("\n\n"));
    contexts.length = 0;
  } else if (deferred && event === "PostToolUse") {
    const pending = consumePendingContext(payload.cwd || process.cwd(), payload.session_id);
    if (pending) contexts.push(pending);
  }

  if (process.env.DEVKIT_DISPATCH_TRACE) {
    try {
      fs.appendFileSync(process.env.DEVKIT_DISPATCH_TRACE, `${JSON.stringify({ event, tool: payload.tool_name, memoryOnly, scripts: trace, keys: Object.keys(input), transcript: Boolean(payload.transcript_path) })}\n`);
    } catch { /* diagnostico opcional */ }
  }

  // Stop has a stricter response schema in Codex. Keep block decisions, but
  // send non-blocking reminders to stderr so they remain visible without
  // making the JSON invalid for the Stop event.
  if (event !== "Stop" && (contexts.length || Object.keys(response.hookSpecificOutput || {}).length)) {
    response.hookSpecificOutput ||= {};
    response.hookSpecificOutput.hookEventName = event;
    if (contexts.length) response.hookSpecificOutput.additionalContext = contexts.join("\n\n");
  } else if (event === "Stop") {
    delete response.hookSpecificOutput;
    if (systemMessages.length && response.decision !== "block") {
      process.stderr.write(`${systemMessages.join("\n\n")}\n`);
    }
    if (response.decision !== "block") {
      delete response.systemMessage;
      delete response.reason;
      delete response.stopReason;
      delete response.suppressOutput;
    }
  }
  if (event !== "Stop" && systemMessages.length) response.systemMessage = systemMessages.join("\n");
  process.stdout.write(JSON.stringify(response));
}

try {
  if (process.argv[2] === "--print-tool-filters") {
    process.stdout.write(JSON.stringify({ filters: TOOL_FILTERS, events: EVENT_SCRIPTS }));
  } else {
    run();
  }
} catch {
  process.stdout.write(JSON.stringify({ continue: true }));
}
