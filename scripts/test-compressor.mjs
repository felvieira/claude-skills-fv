#!/usr/bin/env node
/**
 * test-compressor.mjs — Smoke tests for output-compressor.ts
 *
 * Usage: node scripts/test-compressor.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath  = new URL("../mcp-server/dist/lib/output-compressor.js", import.meta.url);

let compressOutput;
try {
  const mod = await import(distPath);
  compressOutput = mod.compressOutput;
} catch {
  console.error("❌ Could not import output-compressor from dist/. Run: cd mcp-server && npm run build");
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

// ─── Test 1: ANSI strip ───────────────────────────────────────────────────────
console.log("\nTest 1: ANSI strip");
{
  const input = "\x1b[32mHello\x1b[0m \x1b[1mWorld\x1b[0m\nLine 2";
  const { compressed } = compressOutput({ text: input, max_lines: 100 });
  assert("ANSI codes removed", !compressed.includes("\x1b["), `got: ${compressed}`);
  assert("Text preserved", compressed.includes("Hello") && compressed.includes("World"));
}

// ─── Test 2: Adjacent dedup → [×N] ───────────────────────────────────────────
console.log("\nTest 2: Adjacent line deduplication");
{
  const input = Array(5).fill("same line").join("\n");
  const { compressed } = compressOutput({ text: input, max_lines: 100 });
  assert("Dedup marker present", compressed.includes("[×5]"), `got: ${compressed}`);
  const lines = compressed.split("\n").filter(Boolean);
  assert("Collapsed to 1 line", lines.length === 1, `got ${lines.length} lines`);
}

// ─── Test 3: head strategy ───────────────────────────────────────────────────
console.log("\nTest 3: head strategy");
{
  const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
  const { compressed, dropped_lines } = compressOutput({ text: lines, max_lines: 5, strategy: "head" });
  const out = compressed.split("\n").filter(l => l.trim() && !l.includes("dropped"));
  assert("Returns first 5 lines", out[0] === "line 1" && out[4] === "line 5", `first=${out[0]}, last=${out[4]}`);
  assert("dropped_lines > 0", dropped_lines > 0, `got ${dropped_lines}`);
}

// ─── Test 4: tail strategy ───────────────────────────────────────────────────
console.log("\nTest 4: tail strategy");
{
  const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");
  const { compressed } = compressOutput({ text: lines, max_lines: 5, strategy: "tail" });
  const out = compressed.split("\n").filter(l => l.trim());
  assert("Returns last 5 lines", out[out.length - 1] === "line 20", `last=${out[out.length - 1]}`);
}

// ─── Test 5: head_tail strategy ──────────────────────────────────────────────
console.log("\nTest 5: head_tail strategy");
{
  const lines = Array.from({ length: 100 }, (_, i) => `line ${i + 1}`).join("\n");
  const { compressed, dropped_lines } = compressOutput({ text: lines, max_lines: 10, strategy: "head_tail" });
  assert("Contains drop marker", compressed.includes("lines dropped"), `got: ${compressed.slice(0, 200)}`);
  assert("dropped_lines reported", dropped_lines > 0, `got ${dropped_lines}`);
  assert("First line present", compressed.includes("line 1"));
  assert("Last line present", compressed.includes("line 100"));
}

// ─── Test 6: reduction_pct ────────────────────────────────────────────────────
console.log("\nTest 6: reduction_pct calculation");
{
  const big = Array.from({ length: 200 }, (_, i) => `verbose output line ${i}`).join("\n");
  const { reduction_pct, original_bytes, compressed_bytes } = compressOutput({ text: big, max_lines: 20 });
  assert("original_bytes > compressed_bytes", original_bytes > compressed_bytes);
  assert("reduction_pct > 0", reduction_pct > 0, `got ${reduction_pct}%`);
  assert("reduction_pct <= 100", reduction_pct <= 100, `got ${reduction_pct}%`);
}

// ─── Test 7: npm install hint ─────────────────────────────────────────────────
console.log("\nTest 7: npm install hint filter");
{
  const input = [
    "npm warn deprecated foo@1.0",
    "added 423 packages in 3s",
    "timing reifyNode:node_modules/lodash 500ms",
    "npm ERR! peer dep missing bar",
  ].join("\n");
  const { compressed } = compressOutput({ text: input, hint: "npm install", max_lines: 100 });
  assert("Keeps WARN line",  compressed.includes("deprecated"),  `got: ${compressed}`);
  assert("Keeps ERR line",   compressed.includes("ERR"),         `got: ${compressed}`);
  assert("Keeps summary",    compressed.includes("added"),       `got: ${compressed}`);
  assert("Drops timing line",!compressed.includes("timing"),     `got: ${compressed}`);
}

// ─── Test 8: empty input ─────────────────────────────────────────────────────
console.log("\nTest 8: empty input");
{
  const { compressed, reduction_pct } = compressOutput({ text: "" });
  assert("Empty input → empty output", compressed === "");
  assert("reduction_pct is 0", reduction_pct === 0);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${"─".repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
