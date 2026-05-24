#!/usr/bin/env node
// scripts/diff-impact.mjs (v2.17.0+)
//
// Diff impact analysis: cross-references `git diff` (or staged) with
// `graphify-out/graph.json` to surface "this change touches X nodes and
// ripples to Y dependents." Helps the reviewer see ripple effects before
// merge.
//
// Inspired by `/understand-diff` from Lum1104/Understand-Anything (MIT).
// Implementation is ours: zero-dep Node, reads our existing graphify-out/
// (no separate pipeline), uses BFS for ripple traversal.
//
// USAGE:
//   node scripts/diff-impact.mjs                 # vs HEAD~1 (last commit)
//   node scripts/diff-impact.mjs --staged        # vs staged changes
//   node scripts/diff-impact.mjs --ref main      # vs branch
//   node scripts/diff-impact.mjs --depth 2       # ripple BFS depth (default 2)
//   node scripts/diff-impact.mjs --json          # machine-readable
//
// EXIT CODES:
//   0 — analysis succeeded (impact reported)
//   1 — graphify-out/graph.json missing or unreadable
//   2 — git diff failed (not a git repo / bad ref)

import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, "..");
const GRAPH_PATH = resolve(ROOT, "graphify-out", "graph.json");

// ─── CLI ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return null;
  const next = argv[i + 1];
  if (!next || next.startsWith("--")) return true;
  return next;
};
const asJson = argv.includes("--json");
const staged = argv.includes("--staged");
const ref = flag("--ref");
const depth = Number(flag("--depth") ?? 2);

// ─── Load graph ──────────────────────────────────────────────────────────────
let graph;
try {
  graph = JSON.parse(await readFile(GRAPH_PATH, "utf8"));
} catch (err) {
  console.error(`Could not read ${GRAPH_PATH}: ${err.message}`);
  console.error("Run `graphify update .` (or your equivalent) first.");
  process.exit(1);
}

// ─── Normalize paths (Windows backslash → posix slash) ───────────────────────
function normalizePath(p) {
  return p.replace(/\\/g, "/").toLowerCase();
}

// ─── Build lookups ───────────────────────────────────────────────────────────
const nodesByFile = new Map(); // posix-lower path → node[]
for (const n of graph.nodes ?? []) {
  if (!n.source_file) continue;
  const key = normalizePath(n.source_file);
  if (!nodesByFile.has(key)) nodesByFile.set(key, []);
  nodesByFile.get(key).push(n);
}

const adjacencyOut = new Map(); // node id → Set<node id>
const adjacencyIn = new Map();
for (const l of graph.links ?? []) {
  const src = l.source ?? l._src;
  const tgt = l.target ?? l._tgt;
  if (!src || !tgt) continue;
  if (!adjacencyOut.has(src)) adjacencyOut.set(src, new Set());
  if (!adjacencyIn.has(tgt)) adjacencyIn.set(tgt, new Set());
  adjacencyOut.get(src).add(tgt);
  adjacencyIn.get(tgt).add(src);
}

// ─── Get changed files via git ───────────────────────────────────────────────
function getChangedFiles() {
  let cmd;
  if (staged) {
    cmd = "git diff --cached --name-only";
  } else if (ref && typeof ref === "string") {
    cmd = `git diff --name-only ${ref}...HEAD`;
  } else {
    cmd = "git diff --name-only HEAD~1 HEAD";
  }
  try {
    const out = execSync(cmd, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch (err) {
    console.error(`git diff failed: ${err.message}`);
    process.exit(2);
  }
}

// ─── BFS ripple ──────────────────────────────────────────────────────────────
function bfs(startSet, adjacency, maxDepth) {
  const visited = new Map(); // id → depth
  const queue = [];
  for (const id of startSet) {
    visited.set(id, 0);
    queue.push(id);
  }
  let head = 0;
  while (head < queue.length) {
    const cur = queue[head++];
    const curDepth = visited.get(cur);
    if (curDepth >= maxDepth) continue;
    const neighbors = adjacency.get(cur);
    if (!neighbors) continue;
    for (const n of neighbors) {
      if (visited.has(n)) continue;
      visited.set(n, curDepth + 1);
      queue.push(n);
    }
  }
  return visited;
}

// ─── Analysis ────────────────────────────────────────────────────────────────
const changedFiles = getChangedFiles();
if (changedFiles.length === 0) {
  if (asJson) {
    process.stdout.write(
      JSON.stringify({ changed_files: [], directly_touched_nodes: [], ripple: [], summary: { changed_count: 0, directly_touched_count: 0, ripple_count: 0 } }, null, 2),
    );
  } else {
    console.log("Diff impact: no changed files detected.");
  }
  process.exit(0);
}

const touchedIds = new Set();
const matchedFiles = [];
const unmatchedFiles = [];
for (const f of changedFiles) {
  const key = normalizePath(f);
  const nodes = nodesByFile.get(key);
  if (nodes && nodes.length > 0) {
    matchedFiles.push(f);
    for (const n of nodes) touchedIds.add(n.id);
  } else {
    unmatchedFiles.push(f);
  }
}

// BFS dependents (who calls these) — that's the real "ripple"
const dependentsMap = bfs(touchedIds, adjacencyIn, depth);
// And who they call (less interesting but useful as context)
const dependenciesMap = bfs(touchedIds, adjacencyOut, depth);

// Remove touched themselves from the ripple sets
for (const id of touchedIds) {
  dependentsMap.delete(id);
  dependenciesMap.delete(id);
}

const idToNode = new Map();
for (const n of graph.nodes ?? []) idToNode.set(n.id, n);

function nodeMeta(id) {
  const n = idToNode.get(id);
  if (!n) return { id, label: id, source_file: null };
  return {
    id: n.id,
    label: n.label,
    source_file: n.source_file,
    community: n.community,
    file_type: n.file_type,
  };
}

const result = {
  changed_files: changedFiles,
  matched_files: matchedFiles,
  unmatched_files: unmatchedFiles,
  directly_touched_nodes: [...touchedIds].map(nodeMeta),
  dependents_ripple: [...dependentsMap.entries()]
    .map(([id, d]) => ({ ...nodeMeta(id), distance: d }))
    .sort((a, b) => a.distance - b.distance || a.label.localeCompare(b.label)),
  dependencies_ripple: [...dependenciesMap.entries()]
    .map(([id, d]) => ({ ...nodeMeta(id), distance: d }))
    .sort((a, b) => a.distance - b.distance || a.label.localeCompare(b.label)),
  summary: {
    changed_count: changedFiles.length,
    matched_count: matchedFiles.length,
    unmatched_count: unmatchedFiles.length,
    directly_touched_count: touchedIds.size,
    dependents_count: dependentsMap.size,
    dependencies_count: dependenciesMap.size,
    depth,
  },
};

if (asJson) {
  process.stdout.write(JSON.stringify(result, null, 2));
  process.exit(0);
}

// ─── Pretty print ────────────────────────────────────────────────────────────
console.log("Diff Impact Analysis");
console.log("=".repeat(72));
console.log(
  `Changed files: ${result.summary.changed_count} ` +
    `(matched ${result.summary.matched_count} in graph, ` +
    `unmatched ${result.summary.unmatched_count})`,
);
console.log(
  `Directly touched nodes: ${result.summary.directly_touched_count}`,
);
console.log(
  `Dependents in ${depth} hops (the ripple): ${result.summary.dependents_count}`,
);
console.log(
  `Dependencies in ${depth} hops (what changed code calls): ${result.summary.dependencies_count}`,
);
console.log();

if (result.directly_touched_nodes.length > 0) {
  console.log("Directly touched:");
  for (const n of result.directly_touched_nodes) {
    console.log(`  ${n.label.padEnd(40)} ${n.source_file ?? ""}`);
  }
  console.log();
}

if (result.dependents_ripple.length > 0) {
  console.log(`Ripple — who depends on the touched code (depth ${depth}):`);
  const byDist = new Map();
  for (const n of result.dependents_ripple) {
    if (!byDist.has(n.distance)) byDist.set(n.distance, []);
    byDist.get(n.distance).push(n);
  }
  for (const [d, nodes] of [...byDist.entries()].sort((a, b) => a[0] - b[0])) {
    console.log(`  hop ${d}: ${nodes.length} nodes`);
    const slice = nodes.slice(0, 10);
    for (const n of slice) {
      console.log(`    - ${n.label.padEnd(38)} ${n.source_file ?? ""}`);
    }
    if (nodes.length > 10) console.log(`    ... +${nodes.length - 10} more (run with --json for full list)`);
  }
  console.log();
}

if (result.unmatched_files.length > 0) {
  console.log(`Files not in graph (${result.unmatched_files.length}):`);
  for (const f of result.unmatched_files.slice(0, 10)) {
    console.log(`  - ${f}`);
  }
  if (result.unmatched_files.length > 10) {
    console.log(`  ... +${result.unmatched_files.length - 10} more`);
  }
  console.log("Run graphify update on this repo to include them.");
}

process.exit(0);
