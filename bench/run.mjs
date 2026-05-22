#!/usr/bin/env node
/**
 * bench/run.mjs
 *
 * Reproducible token-savings benchmark for the Dev Team Kit compressor.
 * Reads every fixture under bench/fixtures/, runs each through compressOutput
 * once (single-call) and a second time with crossCall enabled (re-run scenario),
 * and prints a per-fixture table + aggregate totals.
 *
 * Usage:
 *   node bench/run.mjs              # human-readable table
 *   node bench/run.mjs --json       # machine-readable JSON
 *
 * Pattern adapted from claudioemmanuel/squeez (Apache-2.0) — see NOTICE.
 *
 * Approximation: token count ≈ bytes / 4 (good enough for relative numbers;
 * does not call any tokenizer to keep zero-dep).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, basename, extname, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");
const COMPRESSOR_PATH = join(
  __dirname,
  "..",
  "mcp-server",
  "dist",
  "lib",
  "output-compressor.js",
);
// Windows-safe dynamic import: absolute paths must be file:// URLs in ESM.
const COMPRESSOR_URL = pathToFileURL(COMPRESSOR_PATH).href;

const argv = process.argv.slice(2);
const asJson = argv.includes("--json");

// Token approximation: bytes ÷ 4 (industry rough estimate for English+code).
const approxTokens = (bytes) => Math.round(bytes / 4);

// ─── Hint inference from fixture name ─────────────────────────────────────────
function inferHint(name) {
  const stem = basename(name, extname(name)).toLowerCase();
  if (stem.includes("npm")) return "npm install";
  if (stem.includes("git-log")) return "git log";
  if (stem.includes("test") || stem.includes("jest")) return "test";
  return "generic";
}

// ─── Bootstrap compressor ─────────────────────────────────────────────────────
let compressOutput;
try {
  ({ compressOutput } = await import(COMPRESSOR_URL));
} catch (err) {
  console.error("");
  console.error("  Could not load compressor from:");
  console.error(`  ${COMPRESSOR_PATH}`);
  console.error("");
  console.error("  Build the mcp-server first:");
  console.error("    cd mcp-server && npm run build");
  console.error("");
  console.error(`  Underlying error: ${err.message}`);
  process.exit(2);
}

// ─── Run ──────────────────────────────────────────────────────────────────────
const fixtures = readdirSync(FIXTURES_DIR)
  .filter((f) => extname(f) === ".txt")
  .sort();

if (fixtures.length === 0) {
  console.error("No fixtures found in", FIXTURES_DIR);
  process.exit(2);
}

const results = [];

for (const file of fixtures) {
  const text = readFileSync(join(FIXTURES_DIR, file), "utf8");
  const hint = inferHint(file);
  const originalBytes = Buffer.byteLength(text, "utf8");

  // Single-call: compressor with hint, no cross-call dedup
  const single = compressOutput({ text, hint });

  // Re-run scenario: same text seen twice in a row, cross-call dedup on.
  // The first call seeds the cache; the second should match.
  const rerun1 = compressOutput({ text, hint, crossCall: true, crossCallLabel: hint });
  const rerun2 = compressOutput({ text, hint, crossCall: true, crossCallLabel: hint });

  results.push({
    fixture: file,
    hint,
    original_bytes: originalBytes,
    original_tokens_approx: approxTokens(originalBytes),
    single_call: {
      compressed_bytes: single.compressed_bytes,
      compressed_tokens_approx: approxTokens(single.compressed_bytes),
      reduction_pct: single.reduction_pct,
    },
    second_run: {
      compressed_bytes: rerun2.compressed_bytes,
      compressed_tokens_approx: approxTokens(rerun2.compressed_bytes),
      reduction_pct: rerun2.reduction_pct,
      cross_call_match: rerun2.cross_call_match ?? null,
    },
  });
}

// ─── Aggregate ────────────────────────────────────────────────────────────────
const total = results.reduce(
  (acc, r) => {
    acc.original += r.original_bytes;
    acc.single += r.single_call.compressed_bytes;
    acc.rerun += r.second_run.compressed_bytes;
    return acc;
  },
  { original: 0, single: 0, rerun: 0 },
);

const summary = {
  fixtures_count: results.length,
  total_original_bytes: total.original,
  total_original_tokens_approx: approxTokens(total.original),
  single_call_reduction_pct: total.original === 0
    ? 0
    : Math.round(((total.original - total.single) / total.original) * 100),
  second_run_reduction_pct: total.original === 0
    ? 0
    : Math.round(((total.original - total.rerun) / total.original) * 100),
};

// ─── Output ───────────────────────────────────────────────────────────────────
if (asJson) {
  console.log(JSON.stringify({ summary, results }, null, 2));
} else {
  const pad = (s, n) => String(s).padEnd(n);
  const rpad = (s, n) => String(s).padStart(n);

  console.log("");
  console.log("Dev Team Kit — compressor benchmark");
  console.log("=".repeat(78));
  console.log("");
  console.log(
    pad("fixture", 22) +
    pad("hint", 14) +
    rpad("bytes-in", 10) +
    rpad("single%", 10) +
    rpad("re-run%", 10) +
    "  re-run-match",
  );
  console.log("-".repeat(78));
  for (const r of results) {
    const matchTag = r.second_run.cross_call_match
      ? `${r.second_run.cross_call_match.kind} #${r.second_run.cross_call_match.call_id}`
      : "(none)";
    console.log(
      pad(r.fixture, 22) +
      pad(r.hint, 14) +
      rpad(r.original_bytes, 10) +
      rpad(r.single_call.reduction_pct + "%", 10) +
      rpad(r.second_run.reduction_pct + "%", 10) +
      "  " + matchTag,
    );
  }
  console.log("-".repeat(78));
  console.log(
    pad("AGGREGATE", 22) +
    pad("", 14) +
    rpad(total.original, 10) +
    rpad(summary.single_call_reduction_pct + "%", 10) +
    rpad(summary.second_run_reduction_pct + "%", 10),
  );
  console.log("");
  console.log(`Approx tokens in: ${summary.total_original_tokens_approx}`);
  console.log("(token estimate uses bytes/4 — see bench/README.md)");
  console.log("");
}
