#!/usr/bin/env node
/**
 * test-seen-queries.mjs — Smoke tests for seen_files and seen_errors dedup/hash
 *
 * Usage: node scripts/test-seen-queries.mjs
 * Exit 0 = all passed, Exit 1 = failures
 *
 * Focuses on edge cases: multiple files, write vs read tools, error hash stability.
 */

import fs   from "fs";
import path from "path";
import os   from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath  = new URL("../mcp-server/dist/lib/event-log.js", import.meta.url);

let querySeenFiles, querySeenErrors;
try {
  const mod = await import(distPath);
  querySeenFiles  = mod.querySeenFiles;
  querySeenErrors = mod.querySeenErrors;
} catch {
  console.error("❌ Could not import event-log from dist/. Run: cd mcp-server && npm run build");
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? " — " + detail : ""}`);
    failed++;
  }
}

function makeProject(events) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "devkit-seen-"));
  const autoDir = path.join(tmpDir, ".auto");
  fs.mkdirSync(autoDir);
  for (const e of events) {
    fs.appendFileSync(path.join(autoDir, "events.jsonl"), JSON.stringify(e) + "\n");
  }
  return tmpDir;
}

// ─── Test 1: seen_files — only file tools counted ────────────────────────────
console.log("\nTest 1: Only Read/Edit/Write/Glob counted");
{
  const dir = makeProject([
    { ts: "2026-01-01T00:00:00Z", tool: "Read",  args: { file_path: "a.ts" }, status: "ok" },
    { ts: "2026-01-01T00:01:00Z", tool: "Bash",  args: { command: "ls" },    status: "ok" },
    { ts: "2026-01-01T00:02:00Z", tool: "Grep",  args: { pattern: "foo" },   status: "ok" },
    { ts: "2026-01-01T00:03:00Z", tool: "Write", args: { file_path: "b.ts" }, status: "ok" },
  ]);
  const files = querySeenFiles(dir);
  assert("Only 2 files (Read+Write)",   files.length === 2,             `got ${files.length}`);
  assert("Bash/Grep not in seen_files", !files.some(f => !f.path.endsWith(".ts")));
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Test 2: seen_files — modified flag ──────────────────────────────────────
console.log("\nTest 2: modified flag (Read=false, Edit/Write=true)");
{
  const dir = makeProject([
    { ts: "2026-01-01T00:00:00Z", tool: "Read",  args: { file_path: "x.ts" }, status: "ok" },
    { ts: "2026-01-01T00:01:00Z", tool: "Edit",  args: { file_path: "y.ts" }, status: "ok" },
    { ts: "2026-01-01T00:02:00Z", tool: "Write", args: { file_path: "z.ts" }, status: "ok" },
  ]);
  const files = querySeenFiles(dir);
  const x = files.find(f => f.path === "x.ts");
  const y = files.find(f => f.path === "y.ts");
  const z = files.find(f => f.path === "z.ts");
  assert("Read file not modified",  x?.modified === false, `x.modified=${x?.modified}`);
  assert("Edit file modified",      y?.modified === true,  `y.modified=${y?.modified}`);
  assert("Write file modified",     z?.modified === true,  `z.modified=${z?.modified}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Test 3: seen_files — access_count accumulates ───────────────────────────
console.log("\nTest 3: access_count accumulates across multiple events");
{
  const dir = makeProject([
    { ts: "2026-01-01T00:00:00Z", tool: "Read", args: { file_path: "same.ts" }, status: "ok" },
    { ts: "2026-01-01T00:01:00Z", tool: "Read", args: { file_path: "same.ts" }, status: "ok" },
    { ts: "2026-01-01T00:02:00Z", tool: "Read", args: { file_path: "same.ts" }, status: "ok" },
  ]);
  const files = querySeenFiles(dir);
  assert("Deduped to 1 entry",    files.length === 1,          `got ${files.length}`);
  assert("access_count === 3",    files[0].access_count === 3, `got ${files[0].access_count}`);
  assert("first_seen correct",    files[0].first_seen_ts === "2026-01-01T00:00:00Z");
  assert("last_seen updated",     files[0].last_seen_ts  === "2026-01-01T00:02:00Z");
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Test 4: seen_files — sorted by last_seen desc ───────────────────────────
console.log("\nTest 4: seen_files sorted by last_seen descending");
{
  const dir = makeProject([
    { ts: "2026-01-01T00:00:00Z", tool: "Read", args: { file_path: "old.ts" },    status: "ok" },
    { ts: "2026-01-01T00:05:00Z", tool: "Read", args: { file_path: "recent.ts" }, status: "ok" },
    { ts: "2026-01-01T00:01:00Z", tool: "Read", args: { file_path: "middle.ts" }, status: "ok" },
  ]);
  const files = querySeenFiles(dir);
  assert("Most recent first", files[0].path === "recent.ts", `got ${files[0].path}`);
  assert("Oldest last",       files[2].path === "old.ts",    `got ${files[2].path}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Test 5: seen_errors — MD5 hash dedup ────────────────────────────────────
console.log("\nTest 5: seen_errors — same error (different line numbers) → same hash");
{
  const dir = makeProject([
    { ts: "2026-01-01T00:00:00Z", tool: "Bash", args: {}, status: "error", error: "TypeError: Cannot read properties of undefined (reading 'id') at /path/to/file.ts:42:10" },
    { ts: "2026-01-01T00:01:00Z", tool: "Bash", args: {}, status: "error", error: "TypeError: Cannot read properties of undefined (reading 'id') at /different/path.ts:99:5" },
  ]);
  const errors = querySeenErrors(dir);
  assert("Same error grouped", errors.length === 1, `got ${errors.length} groups`);
  assert("count === 2",        errors[0].count === 2, `got ${errors[0].count}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Test 6: seen_errors — different errors → different hashes ───────────────
console.log("\nTest 6: seen_errors — different errors → separate groups");
{
  const dir = makeProject([
    { ts: "2026-01-01T00:00:00Z", tool: "Bash", args: {}, status: "error", error: "SyntaxError: Unexpected token" },
    { ts: "2026-01-01T00:01:00Z", tool: "Bash", args: {}, status: "error", error: "ReferenceError: foo is not defined" },
  ]);
  const errors = querySeenErrors(dir);
  assert("Two separate groups",    errors.length === 2, `got ${errors.length}`);
  assert("Both count 1",           errors.every(e => e.count === 1));
  assert("Different hashes",       errors[0].error_hash !== errors[1].error_hash);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Test 7: seen_errors — sorted by count desc ──────────────────────────────
console.log("\nTest 7: seen_errors sorted by count descending");
{
  const dir = makeProject([
    { ts: "2026-01-01T00:00:00Z", tool: "Bash", args: {}, status: "error", error: "frequent error" },
    { ts: "2026-01-01T00:01:00Z", tool: "Bash", args: {}, status: "error", error: "frequent error" },
    { ts: "2026-01-01T00:02:00Z", tool: "Bash", args: {}, status: "error", error: "frequent error" },
    { ts: "2026-01-01T00:03:00Z", tool: "Bash", args: {}, status: "error", error: "rare error" },
  ]);
  const errors = querySeenErrors(dir);
  assert("Most frequent first", errors[0].count === 3, `got ${errors[0].count}`);
  assert("Rare error second",   errors[1].count === 1, `got ${errors[1].count}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Test 8: no errors → empty array ────────────────────────────────────────
console.log("\nTest 8: no errors → empty array");
{
  const dir = makeProject([
    { ts: "2026-01-01T00:00:00Z", tool: "Read", args: { file_path: "a.ts" }, status: "ok" },
  ]);
  const errors = querySeenErrors(dir);
  assert("Empty errors array", errors.length === 0, `got ${errors.length}`);
  fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
