#!/usr/bin/env node
/**
 * bench/check-regression.mjs
 *
 * CI gate: runs bench/run.mjs --json, compares the new aggregate
 * second_run_reduction_pct to a stored baseline, and fails (exit 1) if the
 * new value regressed by more than the allowed delta (default 5 points).
 *
 * Single-call reduction is also checked.
 *
 * Usage:
 *   node bench/check-regression.mjs                # uses default baseline
 *   node bench/check-regression.mjs --baseline=docs/benchmarks/runs/2026-05-22-baseline.json
 *   node bench/check-regression.mjs --max-drop=10  # allow up to 10 pts drop
 *
 * Exit codes:
 *   0 = no regression, or improvement
 *   1 = regression beyond allowed delta
 *   2 = bench failed to run
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DEFAULT_BASELINE = join(
  REPO_ROOT,
  "docs",
  "benchmarks",
  "runs",
  "2026-05-22-baseline.json",
);

// ─── Parse args ───────────────────────────────────────────────────────────────
let baselinePath = DEFAULT_BASELINE;
let maxDrop = 5;
for (const arg of process.argv.slice(2)) {
  const [k, v] = arg.split("=");
  if (k === "--baseline" && v) baselinePath = v;
  else if (k === "--max-drop" && v) maxDrop = Number(v);
}

if (!existsSync(baselinePath)) {
  console.error(`Baseline file not found: ${baselinePath}`);
  process.exit(2);
}

// ─── Run bench ────────────────────────────────────────────────────────────────
const runner = join(__dirname, "run.mjs");
const proc = spawnSync(process.execPath, [runner, "--json"], {
  cwd: REPO_ROOT,
  encoding: "utf8",
});

if (proc.status !== 0) {
  console.error("Bench runner failed:");
  console.error(proc.stderr);
  process.exit(2);
}

let current;
try {
  current = JSON.parse(proc.stdout);
} catch (err) {
  console.error("Bench output was not valid JSON:");
  console.error(proc.stdout.slice(0, 500));
  process.exit(2);
}

const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

// ─── Compare ──────────────────────────────────────────────────────────────────
const cur = current.summary;
const base = baseline.summary;

const deltaSingle = cur.single_call_reduction_pct - base.single_call_reduction_pct;
const deltaRerun = cur.second_run_reduction_pct - base.second_run_reduction_pct;

const fmt = (n) => (n >= 0 ? `+${n}` : String(n));

console.log("bench regression check");
console.log("=".repeat(60));
console.log(`baseline: ${baselinePath}`);
console.log(`allowed drop: ${maxDrop} pts`);
console.log("");
console.log(`single-call: ${base.single_call_reduction_pct}% → ${cur.single_call_reduction_pct}% (${fmt(deltaSingle)})`);
console.log(`second-run:  ${base.second_run_reduction_pct}% → ${cur.second_run_reduction_pct}% (${fmt(deltaRerun)})`);
console.log("");

let exit = 0;
if (-deltaSingle > maxDrop) {
  console.error(`FAIL: single-call dropped ${-deltaSingle} pts (max ${maxDrop})`);
  exit = 1;
}
if (-deltaRerun > maxDrop) {
  console.error(`FAIL: second-run dropped ${-deltaRerun} pts (max ${maxDrop})`);
  exit = 1;
}

if (exit === 0) {
  console.log("OK: no regression beyond allowed delta.");
}

process.exit(exit);
