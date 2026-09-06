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
};

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
  const response = { continue: true };
  const contexts = [];
  const systemMessages = [];

  for (const script of EVENT_SCRIPTS[event]) {
    const result = spawnSync(process.execPath, [path.join(scriptsDir, script)], {
      cwd: process.cwd(),
      env: { ...process.env, CLAUDE_PLUGIN_ROOT: process.env.CLAUDE_PLUGIN_ROOT || kitRoot },
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

  // Stop has a stricter response schema in both runtimes; its sensors are
  // side-effect/reminder hooks, so only the portable continuation field is emitted.
  if (event !== "Stop" && (contexts.length || Object.keys(response.hookSpecificOutput || {}).length)) {
    response.hookSpecificOutput ||= {};
    response.hookSpecificOutput.hookEventName = event;
    if (contexts.length) response.hookSpecificOutput.additionalContext = contexts.join("\n\n");
  } else if (event === "Stop") {
    delete response.hookSpecificOutput;
  }
  if (systemMessages.length) response.systemMessage = systemMessages.join("\n");
  process.stdout.write(JSON.stringify(response));
}

try {
  run();
} catch {
  process.stdout.write(JSON.stringify({ continue: true }));
}
