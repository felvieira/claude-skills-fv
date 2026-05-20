#!/usr/bin/env node
/**
 * schema-validator.mjs — validates that every hook in hooks.json emits
 * Claude Code-compliant output.
 *
 * Canonical schema (from Claude Code error messages, May 2026):
 *
 *   Top-level fields (always allowed):
 *     continue: boolean
 *     suppressOutput: boolean
 *     stopReason: string
 *     decision: "approve" | "block"
 *     reason: string
 *     systemMessage: string
 *     terminalSequence: string
 *     permissionDecision: "allow" | "deny" | "ask"
 *     hookSpecificOutput: object  (ONLY for the 4 events below)
 *
 *   hookSpecificOutput is ONLY supported for these events:
 *     - PreToolUse:      { hookEventName: "PreToolUse", permissionDecision?, permissionDecisionReason?, updatedInput?, additionalContext? }
 *     - UserPromptSubmit:{ hookEventName: "UserPromptSubmit", additionalContext: string (required) }
 *     - PostToolUse:     { hookEventName: "PostToolUse", additionalContext? }
 *     - PostToolBatch:   { hookEventName: "PostToolBatch", additionalContext? }
 *
 *   Stop and SessionStart events do NOT support hookSpecificOutput.
 *   Messages must go via systemMessage at top-level.
 *
 * Runs each hook with a minimal stdin payload, validates output schema,
 * reports per-hook pass/fail with actionable error messages.
 *
 * Usage: node evals/hooks/schema-validator.mjs
 * Exit 0 = all pass. Exit 1 = at least one violation.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

const HOOKS_SUPPORTING_HOOKSPECIFICOUTPUT = new Set([
  "PreToolUse",
  "UserPromptSubmit",
  "PostToolUse",
  "PostToolBatch",
]);

const ALLOWED_TOP_LEVEL = new Set([
  "continue", "suppressOutput", "stopReason", "decision", "reason",
  "systemMessage", "terminalSequence", "permissionDecision", "hookSpecificOutput",
]);

// Minimal stdin payloads per event so hooks have something to chew on
const PAYLOADS = {
  Stop: () => ({ session_id: "test", stop_hook_active: true }),
  SessionStart: () => ({ session_id: "test" }),
  UserPromptSubmit: () => ({ prompt: "fix bug em src/foo.ts:42 — undefined", session_id: "test" }),
  PreToolUse: () => ({ tool_name: "Read", tool_input: { file_path: "/tmp/x.txt" } }),
  PostToolUse: () => ({ tool_name: "Read", tool_input: { file_path: "/tmp/x.txt" }, tool_response: { content: "ok" } }),
};

function loadHookMapping() {
  const raw = JSON.parse(readFileSync(join(REPO_ROOT, "hooks/hooks.json"), "utf-8"));
  const events = raw.hooks || raw;
  const mapping = [];
  for (const [event, blocks] of Object.entries(events)) {
    if (!Array.isArray(blocks)) continue;
    for (const block of blocks) {
      const list = block.hooks || (Array.isArray(block) ? block : []);
      for (const h of list) {
        const cmd = typeof h === "string" ? h : (h.command || "");
        const m = cmd.match(/scripts\/([^"\s]+\.mjs)/);
        if (m) mapping.push({ event, script: m[1] });
      }
    }
  }
  return mapping;
}

function runHook(script, payload) {
  const scriptPath = join(REPO_ROOT, "hooks/scripts", script);
  if (!existsSync(scriptPath)) {
    return { _missing: true };
  }
  const res = spawnSync("node", [scriptPath], {
    input: JSON.stringify(payload),
    encoding: "utf-8",
    timeout: 5000,
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: REPO_ROOT },
  });
  if (res.error) return { _error: res.error.message };
  if (!res.stdout.trim()) return { _empty: true };
  try {
    return { json: JSON.parse(res.stdout) };
  } catch (e) {
    return { _parse_error: e.message, raw: res.stdout.slice(0, 200) };
  }
}

function validateOutput(event, output) {
  const errors = [];
  if (!output || typeof output !== "object") {
    errors.push(`output not an object: ${typeof output}`);
    return errors;
  }

  // Validate top-level fields
  for (const key of Object.keys(output)) {
    if (!ALLOWED_TOP_LEVEL.has(key)) {
      errors.push(`unknown top-level field: "${key}" (allowed: ${[...ALLOWED_TOP_LEVEL].join(", ")})`);
    }
  }

  // Validate hookSpecificOutput compatibility with event
  if (output.hookSpecificOutput !== undefined) {
    if (!HOOKS_SUPPORTING_HOOKSPECIFICOUTPUT.has(event)) {
      errors.push(`hookSpecificOutput is NOT supported for event "${event}" — use systemMessage (top-level) instead. Supported events: ${[...HOOKS_SUPPORTING_HOOKSPECIFICOUTPUT].join(", ")}`);
    } else {
      // Must have hookEventName matching event
      const hso = output.hookSpecificOutput;
      if (!hso.hookEventName) {
        errors.push(`hookSpecificOutput missing required field: hookEventName (should be "${event}")`);
      } else if (hso.hookEventName !== event) {
        errors.push(`hookSpecificOutput.hookEventName "${hso.hookEventName}" doesn't match event "${event}"`);
      }
      // UserPromptSubmit requires additionalContext
      if (event === "UserPromptSubmit" && hso.additionalContext === undefined) {
        errors.push(`UserPromptSubmit hookSpecificOutput requires additionalContext`);
      }
    }
  }

  // Validate enums
  if (output.decision !== undefined && !["approve", "block"].includes(output.decision)) {
    errors.push(`decision must be "approve" or "block", got: ${JSON.stringify(output.decision)}`);
  }
  if (output.permissionDecision !== undefined && !["allow", "deny", "ask"].includes(output.permissionDecision)) {
    errors.push(`permissionDecision must be "allow"|"deny"|"ask", got: ${JSON.stringify(output.permissionDecision)}`);
  }

  return errors;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const mapping = loadHookMapping();
console.log(`\n🔬 Validating ${mapping.length} hook bindings against Claude Code schema\n`);

let failed = 0;
let skipped = 0;

for (const { event, script } of mapping) {
  const payloadFn = PAYLOADS[event];
  if (!payloadFn) {
    console.log(`  ⏭  ${script} (${event}) — no test payload defined`);
    skipped++;
    continue;
  }
  const result = runHook(script, payloadFn());

  if (result._missing) {
    console.log(`  ❌ ${script} (${event}) — script not found on disk`);
    failed++;
    continue;
  }
  if (result._error) {
    console.log(`  ❌ ${script} (${event}) — spawn error: ${result._error}`);
    failed++;
    continue;
  }
  if (result._empty) {
    console.log(`  ⏭  ${script} (${event}) — empty stdout (probably exited silently, OK)`);
    continue;
  }
  if (result._parse_error) {
    console.log(`  ❌ ${script} (${event}) — invalid JSON: ${result._parse_error}`);
    console.log(`     raw: ${result.raw}`);
    failed++;
    continue;
  }

  const errors = validateOutput(event, result.json);
  if (errors.length === 0) {
    console.log(`  ✅ ${script} (${event})`);
  } else {
    console.log(`  ❌ ${script} (${event})`);
    for (const e of errors) {
      console.log(`     • ${e}`);
    }
    console.log(`     output: ${JSON.stringify(result.json).slice(0, 200)}`);
    failed++;
  }
}

console.log(`\n${failed === 0 ? "✅ All hooks emit valid schema" : `❌ ${failed} hook(s) violate schema`}\n`);
if (skipped) console.log(`(${skipped} skipped — no test payload for event)\n`);
process.exit(failed === 0 ? 0 : 1);
