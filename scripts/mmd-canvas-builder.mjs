#!/usr/bin/env node
/**
 * mmd-canvas-builder.mjs — Builds a Mermaid canvas from a tool-call log.
 *
 * Reads:
 *   <session-dir>/tool-calls.jsonl    Lines of {ts,tool,summary,ref?,parent?} JSON.
 *
 * Writes:
 *   <session-dir>/canvas.mmd          Mermaid graph with [Nk] node ids.
 *   <session-dir>/refs/Nk.md          One file per node (if `body` field present in jsonl).
 *
 * Heuristics:
 *   - First tool call becomes node N0 ("Start")
 *   - Each subsequent call N1, N2, ... with edge `(tool)` from parent (default: previous node).
 *   - `summary` field (5-12 words) is the node label. Falls back to a truncated `tool` + arg digest.
 *   - `parent` field can override parent edge for branching.
 *   - `ref` field can override the refs/Nk.md filename (else uses Nk.md).
 *
 * CLI:
 *   --session <dir>      Session dir (must contain tool-calls.jsonl). Required.
 *   --max-nodes <n>      Cap number of nodes in canvas (default 60). Older ones collapse.
 *   --stdout             Print canvas to stdout (don't write file).
 *   --no-refs            Don't write refs/Nk.md files (only canvas.mmd).
 *
 * Policy: policies/symbolic-memory.md
 * Absorvido (idea-level) de Tencent/TencentDB-Agent-Memory.
 *
 * Zero-dep. Node 18+. ESM.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";

// ──────────────────────────────────────────────────────────────
// CLI
// ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { session: null, maxNodes: 60, stdout: false, refs: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--session") args.session = argv[++i];
    else if (a === "--max-nodes") args.maxNodes = parseInt(argv[++i], 10) || 60;
    else if (a === "--stdout") args.stdout = true;
    else if (a === "--no-refs") args.refs = false;
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  console.log(`mmd-canvas-builder.mjs — Build a Mermaid canvas from a tool-call log.

Usage:
  node scripts/mmd-canvas-builder.mjs --session <dir> [options]

Options:
  --session <dir>     Session dir containing tool-calls.jsonl (required)
  --max-nodes <n>     Cap canvas size (default 60)
  --stdout            Print canvas to stdout
  --no-refs           Skip writing refs/Nk.md files
  --help, -h          Show this help

Expected jsonl format (one JSON per line):
  {"ts":"2026-05-24T12:34:56Z","tool":"grep","summary":"search timing-safe cmp","ref":"N3","parent":"N1","body":"raw output here"}

The 'body' field, if present, is written to refs/Nk.md (drill-down target).

Example:
  node scripts/mmd-canvas-builder.mjs --session .auto --stdout
`);
}

// ──────────────────────────────────────────────────────────────
// I/O
// ──────────────────────────────────────────────────────────────

function parseJsonl(path) {
  if (!existsSync(path)) return [];
  const content = readFileSync(path, "utf8");
  const out = [];
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    try {
      out.push(JSON.parse(t));
    } catch {
      // skip malformed line
    }
  }
  return out;
}

// ──────────────────────────────────────────────────────────────
// Canvas building
// ──────────────────────────────────────────────────────────────

function escapeLabel(s) {
  if (!s) return "";
  return String(s)
    .replace(/"/g, "'")
    .replace(/[\r\n]+/g, " ")
    .slice(0, 80);
}

function summarize(call, fallbackIdx) {
  if (call.summary) return call.summary;
  if (call.tool) {
    const argDigest = call.args
      ? JSON.stringify(call.args).slice(0, 40)
      : "";
    return `${call.tool}${argDigest ? " " + argDigest : ""}`;
  }
  return `step ${fallbackIdx}`;
}

function buildCanvas(calls, opts = {}) {
  const maxNodes = opts.maxNodes ?? 60;
  const lines = ["graph TD"];
  const ids = new Map(); // index -> "Nk"
  const refsToWrite = []; // {id, body}

  // If too many calls, collapse oldest into a single "[N0] Earlier (N calls)" node.
  let startIdx = 0;
  if (calls.length > maxNodes) {
    const collapsed = calls.length - (maxNodes - 1);
    lines.push(`    N0["[N0] Earlier (${collapsed} calls — see refs/N0.md)"]`);
    refsToWrite.push({
      id: "N0",
      body: calls.slice(0, collapsed).map((c, i) => `## Call ${i}\n${JSON.stringify(c, null, 2)}`).join("\n\n"),
    });
    ids.set(-1, "N0");
    startIdx = collapsed;
  }

  for (let i = startIdx; i < calls.length; i++) {
    const k = ids.size + (startIdx === 0 ? 0 : 0);
    const id = `N${ids.size}`;
    ids.set(i, id);
    const call = calls[i];
    const label = escapeLabel(summarize(call, i));
    lines.push(`    ${id}["[${id}] ${label}"]`);
    if (call.body && !call.ref) {
      refsToWrite.push({ id, body: String(call.body) });
    } else if (call.ref) {
      refsToWrite.push({ id, body: String(call.body || ""), refOverride: call.ref });
    }
  }

  // Edges
  for (let i = startIdx; i < calls.length; i++) {
    const call = calls[i];
    const myId = ids.get(i);
    let parentId;
    if (call.parent) {
      // explicit parent: try to resolve by Nk id directly, else by index
      parentId = call.parent;
    } else if (i === startIdx) {
      parentId = ids.get(-1) || null; // collapsed start, or none
    } else {
      parentId = ids.get(i - 1);
    }
    if (parentId && parentId !== myId) {
      const edgeLabel = call.tool ? `|${escapeLabel(call.tool)}|` : "";
      lines.push(`    ${parentId} -->${edgeLabel} ${myId}`);
    }
  }

  // Click handlers (drill-down)
  for (const [, id] of ids.entries()) {
    lines.push(`    click ${id} "refs/${id}.md"`);
  }

  return { canvas: lines.join("\n"), refsToWrite };
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);
  if (!args.session) {
    console.error("Error: --session <dir> is required.");
    printHelp();
    process.exit(1);
  }

  const jsonlPath = join(args.session, "tool-calls.jsonl");
  const calls = parseJsonl(jsonlPath);

  if (calls.length === 0) {
    console.error(`No tool calls found in ${jsonlPath}.`);
    process.exit(2);
  }

  const { canvas, refsToWrite } = buildCanvas(calls, { maxNodes: args.maxNodes });

  if (args.stdout) {
    process.stdout.write(canvas + "\n");
    return;
  }

  const canvasPath = join(args.session, "canvas.mmd");
  writeFileSync(canvasPath, canvas + "\n", "utf8");
  console.log(`✓ canvas written: ${canvasPath}`);

  if (args.refs && refsToWrite.length > 0) {
    const refsDir = join(args.session, "refs");
    if (!existsSync(refsDir)) mkdirSync(refsDir, { recursive: true });
    let written = 0;
    for (const r of refsToWrite) {
      if (!r.body) continue;
      const refName = r.refOverride || `${r.id}.md`;
      writeFileSync(join(refsDir, refName), r.body, "utf8");
      written++;
    }
    console.log(`  ${written} ref files in ${refsDir}`);
  }
  console.log(`  ${calls.length} tool calls → ${canvas.split("\n").length} canvas lines`);
}

main();
