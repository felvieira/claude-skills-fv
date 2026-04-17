#!/usr/bin/env node
/**
 * test-suggestions-engine.mjs — smoke tests for suggestions-engine.ts
 *
 * Creates a fake project tree in a tmp dir, seeds a .auto/events.jsonl,
 * and verifies that buildSuggestions() returns the expected heuristic hits.
 */

import fs from "fs";
import os from "os";
import path from "path";

const enginePath = new URL(
  "../mcp-server/dist/lib/suggestions-engine.js",
  import.meta.url
);

if (!fs.existsSync(enginePath)) {
  console.error("✗ mcp-server not built — run: cd mcp-server && npm run build");
  process.exit(1);
}

const { buildSuggestions } = await import(enginePath);

let passed = 0;
let failed = 0;

function assert(cond, label) {
  if (cond) { console.log(`  ✅ ${label}`); passed++; }
  else      { console.log(`  ❌ ${label}`); failed++; }
}

function mkTmpProject() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "devkit-suggest-"));
  fs.mkdirSync(path.join(dir, ".auto"), { recursive: true });
  return dir;
}

// ─── Test 1: empty project → must include Repo Auditor + CLAUDE.md suggestions
console.log("\nTest 1: empty project yields high-priority bootstrap suggestions");
{
  const base = mkTmpProject();
  const out = await buildSuggestions({ base });
  const names = out.map(s => s.skill_name);
  assert(names.includes("repo-auditor"),       "suggests repo-auditor");
  assert(names.includes("claude-md-generator"), "suggests claude-md-generator");
  assert(names.includes("qa-testing"),          "suggests qa-testing (no tests dir)");
  assert(out.length <= 5,                        "caps at 5 suggestions");
  fs.rmSync(base, { recursive: true, force: true });
}

// ─── Test 2: UI context → design-intelligence
console.log("\nTest 2: UI context triggers design-intelligence");
{
  const base = mkTmpProject();
  const out = await buildSuggestions({ base, current_context: "redesign landing page frontend" });
  assert(out.some(s => s.skill_name === "design-intelligence"),
    "suggests design-intelligence for UI context");
  fs.rmSync(base, { recursive: true, force: true });
}

// ─── Test 3: repeated errors → debugger
console.log("\nTest 3: repeated errors trigger debugger subagent");
{
  const base = mkTmpProject();
  const events = [
    { ts: "2026-01-01T00:00:00Z", tool: "Bash", args: { command: "npm test" }, status: "error", bytes_out: 0, error: "TypeError: undefined is not a function at foo.js:10" },
    { ts: "2026-01-01T00:01:00Z", tool: "Bash", args: { command: "npm test" }, status: "error", bytes_out: 0, error: "TypeError: undefined is not a function at foo.js:10" },
    { ts: "2026-01-01T00:02:00Z", tool: "Bash", args: { command: "npm test" }, status: "error", bytes_out: 0, error: "TypeError: undefined is not a function at foo.js:10" },
  ];
  fs.writeFileSync(
    path.join(base, ".auto", "events.jsonl"),
    events.map(e => JSON.stringify(e)).join("\n") + "\n"
  );
  const out = await buildSuggestions({ base });
  assert(out.some(s => s.skill_name === "debugger"), "suggests debugger for repeated errors");
  fs.rmSync(base, { recursive: true, force: true });
}

// ─── Test 4: .md-heavy session → documenter
console.log("\nTest 4: multiple .md edits trigger documenter");
{
  const base = mkTmpProject();
  const events = [
    { ts: "2026-01-01T00:00:00Z", tool: "Edit",  args: { file_path: "README.md" },  status: "ok", bytes_out: 100 },
    { ts: "2026-01-01T00:00:10Z", tool: "Write", args: { file_path: "CHANGELOG.md" }, status: "ok", bytes_out: 100 },
  ];
  fs.writeFileSync(
    path.join(base, ".auto", "events.jsonl"),
    events.map(e => JSON.stringify(e)).join("\n") + "\n"
  );
  const out = await buildSuggestions({ base });
  assert(out.some(s => s.skill_name === "documenter"), "suggests documenter after 2+ .md edits");
  fs.rmSync(base, { recursive: true, force: true });
}

// ─── Test 5: cap option is honored
console.log("\nTest 5: cap=2 limits output");
{
  const base = mkTmpProject();
  const out = await buildSuggestions({ base, cap: 2 });
  assert(out.length <= 2, `returns at most 2 suggestions (got ${out.length})`);
  fs.rmSync(base, { recursive: true, force: true });
}

// ─── Summary ───────────────────────────────────────────────────────────────
console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
