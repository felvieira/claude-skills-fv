#!/usr/bin/env node

/**
 * Codex adapter for the kit's Claude-oriented hooks.
 *
 * Codex and Claude Code do not guarantee the same payload field names. This
 * adapter deliberately has a small, fail-open contract: normalize the event,
 * add useful context when possible, and never turn a sensor failure into a
 * failed tool call.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readInput() {
  try {
    const raw = fs.readFileSync(0, "utf8").trim();
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function text(value) {
  if (typeof value === "string") return value;
  if (value == null) return "";
  try { return JSON.stringify(value); } catch { return ""; }
}

function normalize(input) {
  const event = process.argv[2] || input.hook_event_name || input.event || "";
  const tool = input.tool_name || input.tool || input.toolName || "Unknown";
  const inputValue = input.tool_input ?? input.input ?? input.arguments ?? {};
  const output = input.tool_response ?? input.tool_result ?? input.output ?? input.result ?? {};
  return { event, tool, input: inputValue, output };
}

function redact(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 8).map(redact);
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (/password|secret|token|api[_-]?key|authorization/i.test(key)) out[key] = "[redacted]";
    else if (typeof item === "string") out[key] = item.length > 240 ? `${item.slice(0, 240)}…` : item;
    else out[key] = redact(item);
  }
  return out;
}

function emit(value) {
  process.stdout.write(JSON.stringify(value));
}

function appendEvent(normalized) {
  try {
    const autoDir = path.join(root, ".auto");
    fs.mkdirSync(autoDir, { recursive: true });
    const record = {
      ts: new Date().toISOString(),
      event: normalized.event || "unknown",
      tool: normalized.tool,
      args: redact(normalized.input),
      output_bytes: Buffer.byteLength(text(normalized.output), "utf8"),
    };
    fs.appendFileSync(path.join(autoDir, "codex-events.jsonl"), `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Observability must never break the user's tool call.
  }
}

function main() {
  const normalized = normalize(readInput());
  if (normalized.event.toLowerCase() === "posttooluse" || normalized.event.toLowerCase() === "post_tool_use") {
    appendEvent(normalized);
  }

  const context = [];
  const graph = path.join(root, "graphify-out", "graph.json");
  if (["glob", "grep"].includes(normalized.tool.toLowerCase()) && fs.existsSync(graph)) {
    context.push("Graphify: graphify-out/graph.json exists. Read graphify-out/GRAPH_REPORT.md before broad raw-file searches.");
  }
  if (["edit", "write", "apply_patch"].includes(normalized.tool.toLowerCase())) {
    context.push("Dev Team Kit: preserve the repo's AGENTS.md rules and verify the edited file after writing.");
  }

  const response = { continue: true };
  if (context.length) {
    response.hookSpecificOutput = {
      hookEventName: normalized.event || "PreToolUse",
      additionalContext: context.join("\n"),
    };
  }
  emit(response);
}

try { main(); } catch { emit({ continue: true }); }
