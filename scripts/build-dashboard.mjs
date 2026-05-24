#!/usr/bin/env node
// scripts/build-dashboard.mjs (v2.18.x POC)
//
// Collects the four data snapshots consumed by docs/preview/dashboard.html
// into docs/preview/dashboard-data/ as a static set of JSON files. Zero-dep,
// each source fails independently so a missing/broken source never blocks
// the rest of the build.
//
// USAGE:
//   node scripts/build-dashboard.mjs                              # all four
//   node scripts/build-dashboard.mjs --only graph,bench           # subset
//   node scripts/build-dashboard.mjs --silent                     # exit code only
//   node scripts/build-dashboard.mjs --help                       # short usage
//
// EXIT CODES:
//   0 — at least one snapshot was written successfully
//   2 — every requested source failed (nothing usable produced)
//
// See docs/preview/README.md for the consumer side.

import { mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "docs", "preview", "dashboard-data");

const ALL_SOURCES = ["graph", "bench", "savings", "drift", "skill-quality", "trigger-eval"];

// ─── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  printHelp();
  process.exit(0);
}
const silent = argv.includes("--silent");
const onlyIdx = argv.indexOf("--only");
const sources = onlyIdx >= 0 && argv[onlyIdx + 1]
  ? argv[onlyIdx + 1].split(",").map((s) => s.trim()).filter(Boolean)
  : ALL_SOURCES;

for (const s of sources) {
  if (!ALL_SOURCES.includes(s)) {
    process.stderr.write(`unknown source "${s}" (allowed: ${ALL_SOURCES.join(", ")})\n`);
    process.exit(2);
  }
}

function printHelp() {
  process.stdout.write([
    "build-dashboard.mjs — snapshot data for docs/preview/dashboard.html",
    "",
    "Usage: node scripts/build-dashboard.mjs [--only graph,bench,savings,drift,skill-quality,trigger-eval] [--silent] [--help]",
    "",
    "Sources:",
    "  graph          copies graphify-out/graph.json",
    "  bench          copies the most recent docs/benchmarks/runs/*.json",
    "  savings        runs scripts/savings-report.mjs --format json",
    "  drift          runs scripts/drift-scan.mjs --format json",
    "  skill-quality  runs scripts/skill-quality-score.mjs --json",
    "  trigger-eval   runs scripts/eval-triggers.mjs --json",
    "",
  ].join("\n"));
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const results = []; // { name, ok, path, bytes, error? }

function log(line) {
  if (!silent) process.stdout.write(line + "\n");
}

function writeJson(name, payload, ok = true, error = null) {
  const target = join(OUT_DIR, `${name}.json`);
  const body = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  writeFileSync(target, body);
  const bytes = Buffer.byteLength(body);
  results.push({ name, ok, path: target, bytes, error });
}

function safeRun(label, fn) {
  try {
    fn();
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    writeJson(label, { error: `${label} snapshot failed`, message: msg }, false, msg);
  }
}

// ─── Setup ───────────────────────────────────────────────────────────────────
mkdirSync(OUT_DIR, { recursive: true });

// ─── 1. graph ────────────────────────────────────────────────────────────────
if (sources.includes("graph")) {
  safeRun("graph", () => {
    const src = resolve(ROOT, "graphify-out", "graph.json");
    if (!existsSync(src)) throw new Error(`missing ${src}`);
    const body = readFileSync(src, "utf8");
    // Validate it parses so we never ship corrupt JSON.
    JSON.parse(body);
    writeJson("graph", body);
  });
}

// ─── 2. bench (most recent run) ──────────────────────────────────────────────
if (sources.includes("bench")) {
  safeRun("bench", () => {
    const runsDir = resolve(ROOT, "docs", "benchmarks", "runs");
    if (!existsSync(runsDir)) {
      writeJson("bench", { error: "no bench runs found", message: `${runsDir} does not exist` }, false, "missing dir");
      return;
    }
    const entries = readdirSync(runsDir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const p = join(runsDir, f);
        return { name: f, path: p, mtime: statSync(p).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
    if (entries.length === 0) {
      writeJson("bench", { error: "no bench runs found", message: `no *.json in ${runsDir}` }, false, "empty");
      return;
    }
    const newest = entries[0];
    const body = readFileSync(newest.path, "utf8");
    JSON.parse(body);
    writeJson("bench", body);
  });
}

// ─── 3. savings (via savings-report.mjs --format json) ───────────────────────
if (sources.includes("savings")) {
  safeRun("savings", () => {
    const script = resolve(ROOT, "scripts", "savings-report.mjs");
    if (!existsSync(script)) {
      writeJson("savings", { error: "savings-report not available", message: `missing ${script}` }, false, "missing script");
      return;
    }
    const res = spawnSync(process.execPath, [script, "--format", "json"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    if (res.status !== 0) {
      writeJson("savings", {
        error: "savings-report not available",
        exit_code: res.status,
        stderr: (res.stderr || "").slice(0, 2000),
      }, false, `exit ${res.status}`);
      return;
    }
    // Validate JSON shape before writing.
    JSON.parse(res.stdout);
    writeJson("savings", res.stdout);
  });
}

// ─── 4. drift (via drift-scan.mjs --format json) ─────────────────────────────
if (sources.includes("drift")) {
  safeRun("drift", () => {
    const script = resolve(ROOT, "scripts", "drift-scan.mjs");
    if (!existsSync(script)) {
      writeJson("drift", { error: "drift-scan not available", message: `missing ${script}` }, false, "missing script");
      return;
    }
    const res = spawnSync(process.execPath, [script, "--format", "json"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    if (res.status !== 0) {
      writeJson("drift", {
        error: "drift-scan not available",
        exit_code: res.status,
        stderr: (res.stderr || "").slice(0, 2000),
      }, false, `exit ${res.status}`);
      return;
    }
    JSON.parse(res.stdout);
    writeJson("drift", res.stdout);
  });
}

// ─── 5. skill-quality (via skill-quality-score.mjs --json) ───────────────────
if (sources.includes("skill-quality")) {
  safeRun("skill-quality", () => {
    const script = resolve(ROOT, "scripts", "skill-quality-score.mjs");
    if (!existsSync(script)) {
      writeJson("skill-quality", { error: "skill-quality-score not available", message: `missing ${script}` }, false, "missing script");
      return;
    }
    const res = spawnSync(process.execPath, [script, "--json"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    if (res.status !== 0) {
      writeJson("skill-quality", {
        error: "skill-quality-score not available",
        exit_code: res.status,
        stderr: (res.stderr || "").slice(0, 2000),
      }, false, `exit ${res.status}`);
      return;
    }
    JSON.parse(res.stdout);
    writeJson("skill-quality", res.stdout);
  });
}

// ─── 6. trigger-eval (via eval-triggers.mjs --json) ──────────────────────────
if (sources.includes("trigger-eval")) {
  safeRun("trigger-eval", () => {
    const script = resolve(ROOT, "scripts", "eval-triggers.mjs");
    if (!existsSync(script)) {
      writeJson("trigger-eval", { error: "eval-triggers not available", message: `missing ${script}` }, false, "missing script");
      return;
    }
    const res = spawnSync(process.execPath, [script, "--json"], {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });
    if (res.status !== 0) {
      writeJson("trigger-eval", {
        error: "eval-triggers not available",
        exit_code: res.status,
        stderr: (res.stderr || "").slice(0, 2000),
      }, false, `exit ${res.status}`);
      return;
    }
    JSON.parse(res.stdout);
    writeJson("trigger-eval", res.stdout);
  });
}

// ─── Summary ────────────────────────────────────────────────────────────────
const ok = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);

log("");
log(`build-dashboard — wrote ${results.length} file(s) to ${OUT_DIR}`);
for (const r of results) {
  const kb = (r.bytes / 1024).toFixed(1);
  const flag = r.ok ? "ok " : "err";
  log(`  [${flag}] ${r.name.padEnd(8)} ${kb.padStart(7)} KB  ${r.path}`);
}
log(`generated at ${new Date().toISOString()}`);
if (failed.length > 0 && !silent) {
  process.stderr.write(`\n${failed.length} source(s) failed:\n`);
  for (const r of failed) process.stderr.write(`  - ${r.name}: ${r.error}\n`);
}

process.exit(ok.length > 0 ? 0 : 2);
