#!/usr/bin/env node
/**
 * test-event-log.mjs — Smoke tests for event-log.ts (querySessionEvents)
 *
 * Usage: node scripts/test-event-log.mjs
 * Exit 0 = all passed, Exit 1 = failures
 *
 * Uses a temp directory so it never touches the real .auto/events.jsonl.
 */

import fs   from "fs";
import path from "path";
import os   from "os";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath  = new URL("../mcp-server/dist/lib/event-log.js", import.meta.url);

let querySessionEvents, querySeenFiles, querySeenErrors;
try {
  const mod = await import(distPath);
  querySessionEvents = mod.querySessionEvents;
  querySeenFiles     = mod.querySeenFiles;
  querySeenErrors    = mod.querySeenErrors;
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

// ─── Setup: temp project dir ─────────────────────────────────────────────────
const tmpDir   = fs.mkdtempSync(path.join(os.tmpdir(), "devkit-test-"));
const autoDir  = path.join(tmpDir, ".auto");
const eventsFile = path.join(autoDir, "events.jsonl");
fs.mkdirSync(autoDir);

function appendEvent(event) {
  fs.appendFileSync(eventsFile, JSON.stringify(event) + "\n", "utf-8");
}

function cleanup() {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

// Write test events
const T1 = "2026-04-17T10:00:00Z";
const T2 = "2026-04-17T10:05:00Z";
const T3 = "2026-04-17T10:10:00Z";
const T4 = "2026-04-17T10:15:00Z";
const T5 = "2026-04-17T10:20:00Z";

appendEvent({ ts: T1, tool: "Read",  args: { file_path: "src/auth/login.ts" },  status: "ok",    bytes_out: 800 });
appendEvent({ ts: T2, tool: "Bash",  args: { command: "npm test" },             status: "error", error: "1 test failed at line 42" });
appendEvent({ ts: T3, tool: "Edit",  args: { file_path: "src/auth/login.ts" },  status: "ok",    bytes_out: 0 });
appendEvent({ ts: T4, tool: "Read",  args: { file_path: "src/api/users.ts" },   status: "ok",    bytes_out: 600 });
appendEvent({ ts: T5, tool: "Bash",  args: { command: "npm test" },             status: "error", error: "1 test failed at line 42" });

// ─── Test 1: querySessionEvents — no filter ───────────────────────────────────
console.log("\nTest 1: querySessionEvents — no filter");
{
  const result = querySessionEvents(tmpDir, {});
  assert("Returns 5 events", result.total === 5, `got ${result.total}`);
  assert("session_start set", result.session_start === T1, `got ${result.session_start}`);
  assert("session_end set",   result.session_end === T5,   `got ${result.session_end}`);
}

// ─── Test 2: filter by tool ───────────────────────────────────────────────────
console.log("\nTest 2: filter by tool=Read");
{
  const result = querySessionEvents(tmpDir, { tool: "Read" });
  assert("Returns 2 Read events", result.total === 2, `got ${result.total}`);
  assert("All events are Read",   result.events.every(e => e.tool === "Read"));
}

// ─── Test 3: filter by status=error ──────────────────────────────────────────
console.log("\nTest 3: filter by status=error");
{
  const result = querySessionEvents(tmpDir, { status: "error" });
  assert("Returns 2 error events", result.total === 2, `got ${result.total}`);
}

// ─── Test 4: filter by since ──────────────────────────────────────────────────
console.log("\nTest 4: filter by since");
{
  const result = querySessionEvents(tmpDir, { since: T3 });
  assert("Returns events at/after T3", result.total === 3, `got ${result.total}`);
}

// ─── Test 5: limit ────────────────────────────────────────────────────────────
console.log("\nTest 5: limit=2 returns last 2");
{
  const result = querySessionEvents(tmpDir, { limit: 2 });
  assert("events.length === 2", result.events.length === 2, `got ${result.events.length}`);
  assert("total still 5",       result.total === 5, `got ${result.total}`);
  assert("last event is T5",    result.events[1].ts === T5, `got ${result.events[1].ts}`);
}

// ─── Test 6: empty file ───────────────────────────────────────────────────────
console.log("\nTest 6: missing events.jsonl → empty result");
{
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "devkit-empty-"));
  const result = querySessionEvents(emptyDir, {});
  assert("total is 0",          result.total === 0);
  assert("session_start null",  result.session_start === null);
  fs.rmSync(emptyDir, { recursive: true, force: true });
}

// ─── Test 7: querySeenFiles ───────────────────────────────────────────────────
console.log("\nTest 7: querySeenFiles dedup by path");
{
  const files = querySeenFiles(tmpDir);
  const authFile = files.find(f => f.path === "src/auth/login.ts");
  assert("login.ts present",       Boolean(authFile),         `keys: ${files.map(f=>f.path)}`);
  assert("access_count === 2",     authFile?.access_count === 2, `got ${authFile?.access_count}`);
  assert("modified === true",      authFile?.modified === true,  `got ${authFile?.modified}`);
  assert("users.ts not modified",  files.find(f => f.path === "src/api/users.ts")?.modified === false);
  assert("Returns 2 unique files", files.length === 2, `got ${files.length}`);
}

// ─── Test 8: querySeenErrors dedup by hash ────────────────────────────────────
console.log("\nTest 8: querySeenErrors groups by normalized hash");
{
  const errors = querySeenErrors(tmpDir);
  assert("Returns 1 error group",   errors.length === 1,              `got ${errors.length}`);
  assert("count === 2",             errors[0].count === 2,            `got ${errors[0].count}`);
  assert("tool=Bash present",       errors[0].tools.includes("Bash"), `got ${errors[0].tools}`);
  assert("error_hash is 8 chars",   errors[0].error_hash.length === 8);
}

// ─── Cleanup + Summary ────────────────────────────────────────────────────────
cleanup();
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
