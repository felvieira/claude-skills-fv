#!/usr/bin/env node
/**
 * drift-scan.mjs — continuous drift detection (v2.5.0+)
 *
 * Runs computational sensors against the WHOLE codebase, not just diffs.
 * Catches gradual degradation that change-time hooks miss.
 *
 * Inspired by Birgitta Böckeler "garbage collection that scans for drift"
 * (OpenAI's harness) + Stripe's "blueprints". See
 * docs/inspiration/harness-engineering.md.
 *
 * Sensors implemented:
 *   - dead-code        files not imported anywhere
 *   - large-files      files exceeding configured threshold
 *   - stale-todos      TODOs/FIXMEs older than N days (via git blame)
 *   - dep-staleness    outdated dependencies (best-effort)
 *   - doc-code-drift   docs referencing files/symbols that no longer exist
 *   - test-coverage    files with no corresponding test
 *
 * Usage:
 *   node scripts/drift-scan.mjs              # full scan, all sensors
 *   node scripts/drift-scan.mjs --only dead-code,large-files
 *   node scripts/drift-scan.mjs --threshold-lines 500
 *   node scripts/drift-scan.mjs --format json
 *   node scripts/drift-scan.mjs --root /path/to/project
 *
 * Output: markdown report (or JSON) with findings by severity.
 * Best-effort: missing tools (git, etc) degrade gracefully.
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

// ─── Configuration ────────────────────────────────────────────────────────────
const DEFAULT_THRESHOLDS = {
  large_file_lines: 400,
  stale_todo_days: 90,
  recent_change_days: 14,
};

const IGNORE_PATTERNS = [
  /node_modules/, /\.git/, /dist/, /build/, /\.next/, /out/, /coverage/,
  /\.cache/, /\.bot/, /\.auto/, /\.swarm/, /\.claude/, /graphify-out/,
  /target/, /\.venv/, /__pycache__/, /\.pytest_cache/,
];

const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".py", ".rs", ".go", ".java", ".kt", ".rb", ".cs",
]);

// ─── CLI ──────────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = { only: null, root: null, format: "markdown", thresholdLines: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--only") args.only = argv[++i].split(",").map(s => s.trim());
    else if (a === "--root") args.root = argv[++i];
    else if (a === "--format") args.format = argv[++i];
    else if (a === "--threshold-lines") args.thresholdLines = Number(argv[++i]);
  }
  return args;
}

function findProjectRoot(start = process.cwd()) {
  let dir = resolve(start);
  for (let i = 0; i < 12; i++) {
    if (existsSync(join(dir, ".git")) || existsSync(join(dir, "package.json"))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function isIgnored(filePath) {
  return IGNORE_PATTERNS.some(p => p.test(filePath));
}

function* walk(dir, base = dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (isIgnored(full)) continue;
    if (entry.isDirectory()) {
      yield* walk(full, base);
    } else if (entry.isFile()) {
      yield { full, rel: relative(base, full), entry };
    }
  }
}

function shortPath(p, root) {
  const r = relative(root, p);
  return r.length > 60 ? `…${sep}${r.slice(-60)}` : r;
}

function safeRun(cmd, args, opts = {}) {
  try {
    const res = spawnSync(cmd, args, { encoding: "utf-8", timeout: 5000, ...opts });
    if (res.error) return null;
    return res;
  } catch {
    return null;
  }
}

// ─── Sensor: large files ──────────────────────────────────────────────────────
function sensorLargeFiles(root, threshold) {
  const findings = [];
  for (const { full, rel, entry } of walk(root)) {
    const ext = "." + entry.name.split(".").pop();
    if (!CODE_EXTENSIONS.has(ext)) continue;
    try {
      const lines = readFileSync(full, "utf-8").split("\n").length;
      if (lines >= threshold) {
        findings.push({ file: rel, lines, severity: lines >= threshold * 1.5 ? "high" : "medium" });
      }
    } catch {}
  }
  return findings.sort((a, b) => b.lines - a.lines).slice(0, 20);
}

// ─── Sensor: dead-code (best-effort via simple grep) ──────────────────────────
function sensorDeadCode(root) {
  // Only checks: are there exports that nothing else imports?
  // Cheap heuristic: file has `export default` or `export const X` but no other file imports it.
  const findings = [];
  const files = [];
  for (const { full, rel, entry } of walk(root)) {
    const ext = "." + entry.name.split(".").pop();
    if (![".ts", ".tsx", ".js", ".jsx", ".mjs"].includes(ext)) continue;
    files.push({ full, rel });
  }

  // Build a concatenated index of all imports for fast lookup
  let allImports = "";
  for (const { full } of files) {
    try {
      const content = readFileSync(full, "utf-8");
      const importLines = content.match(/^\s*(?:import|from|require\().*$/gm) || [];
      allImports += importLines.join("\n") + "\n";
    } catch {}
  }

  for (const { full, rel } of files) {
    try {
      const content = readFileSync(full, "utf-8");
      const baseName = rel.split(/[/\\]/).pop().replace(/\.\w+$/, "");
      if (baseName.startsWith("_") || baseName === "index") continue;

      const hasExport = /^\s*export\s+(default|const|function|class|interface|type|\{)/m.test(content);
      if (!hasExport) continue;

      // Search for any import referencing this filename or path
      const filePathPart = rel.replace(/\\/g, "/").replace(/\.\w+$/, "");
      const re = new RegExp(`['"\`][^'"\`]*${baseName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}['"\`]`);
      if (!re.test(allImports)) {
        findings.push({ file: rel, severity: "medium", reason: "exports but no detected importer" });
      }
    } catch {}
  }
  return findings.slice(0, 30);
}

// ─── Sensor: stale TODOs ──────────────────────────────────────────────────────
function sensorStaleTodos(root, staleDays) {
  const findings = [];
  for (const { full, rel, entry } of walk(root)) {
    const ext = "." + entry.name.split(".").pop();
    if (!CODE_EXTENSIONS.has(ext)) continue;
    try {
      const content = readFileSync(full, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        const todoMatch = line.match(/(TODO|FIXME|HACK|XXX)\s*[:(]/i);
        if (!todoMatch) return;

        // Use git blame to find when this line was last modified
        const blame = safeRun("git", ["-C", root, "blame", "-L", `${i+1},${i+1}`, "--porcelain", rel], { cwd: root });
        if (!blame || !blame.stdout) return;
        const tsMatch = blame.stdout.match(/^author-time (\d+)/m);
        if (!tsMatch) return;
        const ageDays = (Date.now() / 1000 - Number(tsMatch[1])) / 86400;
        if (ageDays >= staleDays) {
          findings.push({
            file: rel,
            line: i + 1,
            age_days: Math.round(ageDays),
            type: todoMatch[1].toUpperCase(),
            text: line.trim().slice(0, 100),
            severity: ageDays >= staleDays * 2 ? "high" : "medium",
          });
        }
      });
    } catch {}
  }
  return findings.sort((a, b) => b.age_days - a.age_days).slice(0, 30);
}

// ─── Sensor: dependency staleness ─────────────────────────────────────────────
function sensorDepStaleness(root) {
  const findings = [];
  // Try `npm outdated --json` (best-effort, exits non-zero when outdated)
  const pkgJson = join(root, "package.json");
  if (!existsSync(pkgJson)) return findings;

  const res = safeRun("npm", ["outdated", "--json"], { cwd: root, timeout: 30000 });
  if (!res || !res.stdout) return findings;

  try {
    const outdated = JSON.parse(res.stdout);
    for (const [name, info] of Object.entries(outdated)) {
      const current = info.current || info.wanted || "?";
      const latest = info.latest || "?";
      // Heuristic: major version diff = high severity
      const currentMajor = parseInt(String(current).split(".")[0], 10) || 0;
      const latestMajor = parseInt(String(latest).split(".")[0], 10) || 0;
      const sev = latestMajor > currentMajor ? "high" : "low";
      findings.push({ package: name, current, latest, severity: sev });
    }
  } catch {}

  return findings.slice(0, 30);
}

// ─── Sensor: doc-vs-code drift (referenced files exist) ──────────────────────
function sensorDocCodeDrift(root) {
  const findings = [];
  for (const { full, rel, entry } of walk(root)) {
    if (!entry.name.endsWith(".md")) continue;
    try {
      const content = readFileSync(full, "utf-8");
      // Match path-like refs in backticks. Require at least one /, no glob patterns, no example markers.
      const refs = content.matchAll(/`((?:[A-Za-z]:[\\/])?[\w./\\-]+\/[\w./\\-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|rb|cs))`/g);
      for (const m of refs) {
        const refPath = m[1];
        // Skip URLs
        if (refPath.startsWith("http") || refPath.includes("://")) continue;
        // Skip glob patterns and placeholder examples
        if (refPath.includes("*") || refPath.includes("?")) continue;
        if (/<[^>]+>/.test(refPath)) continue;
        if (refPath.includes("/path/to/") || refPath.includes("/example")) continue;

        const candidates = [
          join(root, refPath),
          join(dirname(full), refPath),
        ];
        if (!candidates.some(c => existsSync(c))) {
          findings.push({
            doc: rel,
            broken_ref: refPath,
            severity: "low",
          });
        }
      }
    } catch {}
  }
  // Dedup
  const seen = new Set();
  const dedup = [];
  for (const f of findings) {
    const key = `${f.doc}|${f.broken_ref}`;
    if (seen.has(key)) continue;
    seen.add(key);
    dedup.push(f);
  }
  return dedup.slice(0, 30);
}

// ─── Sensor: test coverage (files without corresponding test) ─────────────────
function sensorTestCoverage(root) {
  const findings = [];
  const TEST_HINTS = [".test.", ".spec.", "__tests__/", "/tests/"];
  for (const { full, rel, entry } of walk(root)) {
    const ext = "." + entry.name.split(".").pop();
    if (![".ts", ".tsx", ".py", ".rs", ".go"].includes(ext)) continue;
    if (TEST_HINTS.some(h => rel.includes(h))) continue;

    const baseName = entry.name.replace(/\.\w+$/, "");
    // Look for sibling or __tests__ test
    let hasTest = false;
    for (const { rel: otherRel } of walk(root)) {
      if (!TEST_HINTS.some(h => otherRel.includes(h))) continue;
      if (otherRel.includes(baseName)) { hasTest = true; break; }
    }
    if (!hasTest) {
      findings.push({ file: rel, severity: "low", reason: "no corresponding test file found" });
    }
  }
  return findings.slice(0, 30);
}

// ─── Orchestrator ─────────────────────────────────────────────────────────────
const SENSORS = {
  "large-files":   { fn: sensorLargeFiles,    label: "Large files" },
  "dead-code":     { fn: sensorDeadCode,      label: "Possibly dead code" },
  "stale-todos":   { fn: sensorStaleTodos,    label: "Stale TODOs/FIXMEs" },
  "dep-staleness": { fn: sensorDepStaleness,  label: "Outdated dependencies" },
  "doc-code-drift":{ fn: sensorDocCodeDrift,  label: "Doc-vs-code drift" },
  "test-coverage": { fn: sensorTestCoverage,  label: "Files without tests" },
};

function runScan({ root, only, thresholdLines }) {
  const thresholds = { ...DEFAULT_THRESHOLDS };
  if (thresholdLines) thresholds.large_file_lines = thresholdLines;

  const selected = only && only.length > 0 ? only.filter(k => SENSORS[k]) : Object.keys(SENSORS);
  const report = {
    meta: { generated_at: new Date().toISOString(), root, sensors_run: selected, thresholds },
    sensors: {},
    totals: { high: 0, medium: 0, low: 0 },
  };

  for (const id of selected) {
    const sensor = SENSORS[id];
    let findings = [];
    try {
      if (id === "large-files")   findings = sensor.fn(root, thresholds.large_file_lines);
      else if (id === "stale-todos") findings = sensor.fn(root, thresholds.stale_todo_days);
      else                        findings = sensor.fn(root);
    } catch (e) {
      findings = [{ error: e.message }];
    }
    report.sensors[id] = { label: sensor.label, findings };
    for (const f of findings) {
      if (f.severity === "high") report.totals.high++;
      else if (f.severity === "medium") report.totals.medium++;
      else if (f.severity === "low") report.totals.low++;
    }
  }
  return report;
}

function renderMarkdown(report) {
  const md = [];
  md.push(`# 🌊 Drift Scan Report`);
  md.push(``);
  md.push(`> **Project:** \`${report.meta.root}\`  `);
  md.push(`> **Generated:** ${report.meta.generated_at}  `);
  md.push(`> **Sensors run:** ${report.meta.sensors_run.join(", ")}`);
  md.push(``);
  md.push(`## 🚦 Summary`);
  md.push(``);
  md.push(`| Severity | Count |`);
  md.push(`|---|---|`);
  md.push(`| 🔴 High   | ${report.totals.high} |`);
  md.push(`| 🟡 Medium | ${report.totals.medium} |`);
  md.push(`| 🔵 Low    | ${report.totals.low} |`);
  md.push(``);

  for (const [id, data] of Object.entries(report.sensors)) {
    md.push(`## ${data.label}`);
    md.push(``);
    if (!data.findings.length) {
      md.push(`✅ No findings.`);
      md.push(``);
      continue;
    }
    if (data.findings[0]?.error) {
      md.push(`⚠ Sensor error: ${data.findings[0].error}`);
      md.push(``);
      continue;
    }
    md.push(`Found **${data.findings.length}** items (top 30 shown):`);
    md.push(``);

    if (id === "large-files") {
      md.push(`| File | Lines | Severity |`);
      md.push(`|---|---|---|`);
      for (const f of data.findings) md.push(`| \`${f.file}\` | ${f.lines} | ${f.severity} |`);
    } else if (id === "stale-todos") {
      md.push(`| File:Line | Type | Age (days) | Text |`);
      md.push(`|---|---|---|---|`);
      for (const f of data.findings) md.push(`| \`${f.file}:${f.line}\` | ${f.type} | ${f.age_days} | ${f.text.replace(/\|/g, "\\|")} |`);
    } else if (id === "dep-staleness") {
      md.push(`| Package | Current | Latest | Severity |`);
      md.push(`|---|---|---|---|`);
      for (const f of data.findings) md.push(`| \`${f.package}\` | ${f.current} | ${f.latest} | ${f.severity} |`);
    } else if (id === "doc-code-drift") {
      md.push(`| Doc | Broken ref |`);
      md.push(`|---|---|`);
      for (const f of data.findings) md.push(`| \`${f.doc}\` | \`${f.broken_ref}\` |`);
    } else {
      md.push(`| File | Severity | Reason |`);
      md.push(`|---|---|---|`);
      for (const f of data.findings) md.push(`| \`${f.file}\` | ${f.severity} | ${f.reason || ""} |`);
    }
    md.push(``);
  }

  md.push(`---`);
  md.push(``);
  md.push(`*Inspired by Birgitta Böckeler "garbage collection that scans for drift" — see \`docs/inspiration/harness-engineering.md\`. Sensors heuristics in \`scripts/drift-scan.mjs\`.*`);
  return md.join("\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = args.root || findProjectRoot();
  const report = runScan({ root, only: args.only, thresholdLines: args.thresholdLines });

  if (args.format === "json") {
    process.stdout.write(JSON.stringify(report, null, 2));
    return;
  }
  process.stdout.write(renderMarkdown(report));
}

main();
