#!/usr/bin/env node
/**
 * l3-persona-generator.mjs — Gera Persona L3 a partir de L1 (atoms) + L2 (scenarios).
 *
 * Lê:
 *   --vault <path>     Vault root. Default: D:/claude-memory
 *   --project <slug>   Project name. Required.
 *   --memory <path>    Optional local memory dir (vault override). Falls back to vault.
 *
 * Escreve:
 *   <vault>/architecture/<project>/persona.md
 *
 * Modo dry-run:
 *   --stdout            Não escreve arquivo; imprime persona no stdout.
 *
 * Modo fixture (test):
 *   --fixture <dir>     Lê de <dir>/memory + <dir>/logs em vez do vault real.
 *
 * Policy: policies/memory-pyramid.md — pirâmide L0→L3.
 * Absorvido (idea-level) de Tencent/TencentDB-Agent-Memory.
 *
 * Zero-dep. Node 18+. ESM.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";

// ──────────────────────────────────────────────────────────────
// CLI parsing (zero-dep)
// ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { stdout: false, fixture: null, vault: "D:/claude-memory", project: null, memory: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stdout") args.stdout = true;
    else if (a === "--fixture") args.fixture = argv[++i];
    else if (a === "--vault") args.vault = argv[++i];
    else if (a === "--project") args.project = argv[++i];
    else if (a === "--memory") args.memory = argv[++i];
    else if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return args;
}

function printHelp() {
  console.log(`l3-persona-generator.mjs — Generate Persona L3 from L1 + L2.

Usage:
  node scripts/l3-persona-generator.mjs --project <slug> [options]

Options:
  --vault <path>    Vault root (default: D:/claude-memory)
  --project <slug>  Project slug (required, unless --fixture)
  --memory <path>   Override memory dir (default: <vault>/memory)
  --stdout          Print to stdout instead of writing file
  --fixture <dir>   Read from fixture dir for testing
  --help, -h        Show this help

Examples:
  node scripts/l3-persona-generator.mjs --project claude-skills-fv --stdout
  node scripts/l3-persona-generator.mjs --fixture tests/fixtures/persona --stdout
`);
}

// ──────────────────────────────────────────────────────────────
// File I/O helpers
// ──────────────────────────────────────────────────────────────

function safeRead(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function listFiles(dir, pattern) {
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => pattern.test(f))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────────────────────
// Memory parsing (L1 atoms)
// ──────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
  const meta = {};
  let currentParent = null;
  for (const line of match[1].split("\n")) {
    // Nested key (2-space indent): "  type: feedback" under "metadata:"
    const nestedMatch = line.match(/^\s{2,}(\w+):\s*(.+)$/);
    if (nestedMatch && currentParent === "metadata") {
      // Promote metadata.type to top-level if not already set
      if (!meta[nestedMatch[1]]) meta[nestedMatch[1]] = nestedMatch[2].trim();
      continue;
    }
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      currentParent = m[1];
      if (m[2]) meta[m[1]] = m[2].trim();
    }
  }
  return { meta, body: match[2] };
}

function loadAtoms(memoryDir) {
  const atoms = { user: [], feedback: [], project: [], reference: [] };
  const files = listFiles(memoryDir, /\.md$/i).filter((f) => basename(f) !== "MEMORY.md");
  for (const file of files) {
    const content = safeRead(file);
    if (!content) continue;
    const { meta, body } = parseFrontmatter(content);
    const type = (meta.type || "").toLowerCase();
    if (!atoms[type]) continue;
    atoms[type].push({
      name: meta.name || basename(file, ".md"),
      description: meta.description || "",
      body: body.trim(),
      file: basename(file),
    });
  }
  return atoms;
}

// ──────────────────────────────────────────────────────────────
// Scenario parsing (L2 from decisions.md)
// ──────────────────────────────────────────────────────────────

function parseDecisions(decisionsPath) {
  const content = safeRead(decisionsPath);
  if (!content) return [];
  const scenarios = [];
  // Match `### YYYY-MM-DD — title` or `### <title>` (loose)
  const re = /^###\s+(.+)$/gm;
  let match;
  const positions = [];
  while ((match = re.exec(content)) !== null) {
    positions.push({ title: match[1].trim(), start: match.index });
  }
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].start;
    const end = i + 1 < positions.length ? positions[i + 1].start : content.length;
    const block = content.slice(start, end);
    const firstPara = block.split("\n\n").slice(1, 2).join("\n\n").trim();
    scenarios.push({
      title: positions[i].title,
      summary: firstPara.split("\n").slice(0, 3).join(" ").slice(0, 280),
    });
  }
  return scenarios;
}

// ──────────────────────────────────────────────────────────────
// Persona rendering
// ──────────────────────────────────────────────────────────────

function renderSection(title, items, transform) {
  if (!items || items.length === 0) return "";
  const lines = items.map(transform).filter(Boolean);
  if (lines.length === 0) return "";
  return `## ${title}\n\n${lines.join("\n")}\n`;
}

function truncate(s, n) {
  if (!s) return "";
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length <= n ? clean : clean.slice(0, n - 1) + "…";
}

function renderPersona({ project, atoms, scenarios, generatedAt }) {
  const header = `---
project: ${project}
type: persona
layer: L3
generated: ${generatedAt}
generator: scripts/l3-persona-generator.mjs
note: regenerated from L1 atoms + L2 scenarios. Do not edit manually — edits will be lost.
---

# Persona — ${project}

> Destilação L3 da pirâmide de memória. ${atoms.user.length + atoms.feedback.length + atoms.project.length + atoms.reference.length} atoms + ${scenarios.length} scenarios.
> Drill-down: ver \`memory/\` para L1, \`decisions.md\` para L2.
`;

  const userSec = renderSection(
    "User",
    atoms.user,
    (a) => `- ${truncate(a.description || a.name, 200)}`
  );

  const feedbackSec = renderSection(
    "Preferences & feedback",
    atoms.feedback,
    (a) => `- **${a.name}** — ${truncate(a.description, 180)}`
  );

  const projectSec = renderSection(
    "Project context",
    atoms.project,
    (a) => `- ${truncate(a.description || a.name, 200)}`
  );

  const referenceSec = renderSection(
    "References (external pointers)",
    atoms.reference,
    (a) => `- ${truncate(a.description || a.name, 200)}`
  );

  const scenarioSec = scenarios.length === 0
    ? ""
    : `## Scenarios (recurring patterns)\n\n${scenarios
        .slice(0, 12)
        .map((s) => `- **${truncate(s.title, 80)}** — ${truncate(s.summary, 180)}`)
        .join("\n")}\n`;

  const footer = `\n---\n_Generated by \`scripts/l3-persona-generator.mjs\`. See \`policies/memory-pyramid.md\` for the L0→L3 layering this persona is part of._\n`;

  return [header, userSec, feedbackSec, projectSec, referenceSec, scenarioSec, footer]
    .filter(Boolean)
    .join("\n");
}

// ──────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────

function main() {
  const args = parseArgs(process.argv);

  if (!args.project && !args.fixture) {
    console.error("Error: --project <slug> is required (or use --fixture for testing).");
    printHelp();
    process.exit(1);
  }

  let memoryDir, decisionsPath, project, outPath;

  if (args.fixture) {
    memoryDir = join(args.fixture, "memory");
    decisionsPath = join(args.fixture, "decisions.md");
    project = args.project || "fixture";
    outPath = join(args.fixture, "persona.md");
  } else {
    project = args.project;
    memoryDir = args.memory || join(args.vault, "memory");
    decisionsPath = join(args.vault, "architecture", project, "decisions.md");
    outPath = join(args.vault, "architecture", project, "persona.md");
  }

  const atoms = loadAtoms(memoryDir);
  const scenarios = parseDecisions(decisionsPath);
  const generatedAt = new Date().toISOString();
  const persona = renderPersona({ project, atoms, scenarios, generatedAt });

  if (args.stdout) {
    process.stdout.write(persona);
    return;
  }

  const outDir = dirname(outPath);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  writeFileSync(outPath, persona, "utf8");
  console.log(`✓ persona L3 written to ${outPath}`);
  console.log(`  ${atoms.user.length + atoms.feedback.length + atoms.project.length + atoms.reference.length} atoms · ${scenarios.length} scenarios · ${persona.split("\n").length} lines`);
}

main();
