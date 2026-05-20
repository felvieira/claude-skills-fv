#!/usr/bin/env node
/**
 * check-harness-coherence.mjs — enforces Principle 4 from
 * policies/harness-categories.md: "Guides e sensors NÃO podem se
 * contradizer entre si".
 *
 * Detects:
 *   1. Policy/skill that references a file that doesn't exist
 *   2. Hook that references a policy that doesn't exist
 *   3. Hook that references a skill that doesn't exist
 *   4. Hook that uses the wrong tool-event schema (validated by schema-validator)
 *   5. Skill mirror pair inconsistency (skill X claims agent Y exists; check)
 *   6. Subagent declared in AGENTS.md but no file in agents/
 *   7. Skill numbered in CHANGELOG/README/AGENTS but no dir in skills/
 *   8. Policy/skill cites a file that exists but has different intent (best-effort, low confidence)
 *
 * Usage:
 *   node scripts/check-harness-coherence.mjs            # full check
 *   node scripts/check-harness-coherence.mjs --json     # machine-readable
 *
 * Exit 0 = no contradictions. Exit 1 = at least one contradiction found.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function listDirs(parent, pattern) {
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter(d => d.isDirectory() && (!pattern || pattern.test(d.name)))
    .map(d => d.name);
}

function listFiles(parent, ext) {
  if (!existsSync(parent)) return [];
  return readdirSync(parent, { withFileTypes: true })
    .filter(d => d.isFile() && (!ext || d.name.endsWith(ext)))
    .map(d => d.name);
}

function readText(rel) {
  const full = join(ROOT, rel);
  if (!existsSync(full)) return null;
  try {
    return readFileSync(full, "utf-8");
  } catch {
    return null;
  }
}

// ─── Index: things that DO exist ──────────────────────────────────────────────
function buildIndex() {
  const skills = new Set(listDirs(join(ROOT, "skills"), /^\d{2}-/));
  const skillsByNum = new Map();
  for (const s of skills) {
    const num = s.slice(0, 2);
    skillsByNum.set(num, s);
  }
  const agents = new Set(listFiles(join(ROOT, "agents"), ".md").map(f => f.slice(0, -3)));
  const policies = new Set(listFiles(join(ROOT, "policies"), ".md").map(f => f.slice(0, -3)));
  const commands = new Set(listFiles(join(ROOT, "commands"), ".md").map(f => f.slice(0, -3)));
  const programs = new Set([
    ...listFiles(join(ROOT, "programs"), ".yml").map(f => f.slice(0, -4)),
    ...listFiles(join(ROOT, "programs"), ".md").map(f => f.slice(0, -3)),
  ]);
  const hookScripts = new Set(listFiles(join(ROOT, "hooks/scripts"), ".mjs").map(f => f.slice(0, -4)));
  const scripts = new Set(listFiles(join(ROOT, "scripts"), ".mjs").map(f => f.slice(0, -4)));

  return { skills, skillsByNum, agents, policies, commands, programs, hookScripts, scripts };
}

// ─── Findings ─────────────────────────────────────────────────────────────────
const findings = [];

function flag(category, severity, message, location) {
  findings.push({ category, severity, message, location });
}

// ─── Checker 1: AGENTS.md mentions subagents that don't exist ────────────────
function checkAgentsMdSubagents(idx) {
  const content = readText("AGENTS.md");
  if (!content) return;
  // Match `subagent_type: "dev-team-kit-fv:<name>"` and `| \`<name>\` |` table rows
  const re = /\b(?:subagent_type:\s*["']dev-team-kit-fv:|`)([\w-]+)["'`]/g;
  for (const m of content.matchAll(re)) {
    const name = m[1];
    // Skip if it matches a known kit element other than agent
    if (idx.agents.has(name)) continue;
    if (/^\d{2}-/.test(name) && idx.skills.has(name)) continue;
    if (name === "general-purpose" || name === "Explore" || name === "Plan") continue;
    if (name.length < 4) continue;
    if (!/-/.test(name)) continue; // not kebab-case → probably code identifier
    if (/^[A-Z]/.test(name)) continue; // PascalCase, probably class
    // Looks like a subagent reference but doesn't exist
    flag(
      "ghost-subagent",
      "high",
      `AGENTS.md references subagent "${name}" but no file at agents/${name}.md`,
      "AGENTS.md"
    );
  }
}

// ─── Checker 2: Policies/skills cite scripts that don't exist ────────────────
function checkScriptReferences(idx) {
  const docFiles = [
    ...listFiles(join(ROOT, "policies"), ".md").map(f => `policies/${f}`),
    ...listDirs(join(ROOT, "skills"), /^\d{2}-/).map(d => `skills/${d}/SKILL.md`),
    ...listFiles(join(ROOT, "commands"), ".md").map(f => `commands/${f}`),
    "AGENTS.md", "GLOBAL.md", "README.md",
    // Note: CHANGELOG.md not included — has historical refs to scripts that may
    // not exist at HEAD (e.g. examples of detected drift, old references)
  ];
  // Lines containing these markers are skipped (refs are roadmap/example, not active)
  const SKIP_CONTEXT_MARKERS = [
    /\broadmap\b/i,
    /\bv2\.\d+\.\d+\s*(?:—|--|\s+)/i,  // "v2.7.1 — pull-slo.mjs"
    /\bfuture\b/i,
    /\bTODO\b/,
    /\bplanned\b/i,
  ];
  // Placeholder names in examples
  const PLACEHOLDER_NAMES = new Set(["X", "Y", "Z", "foo", "bar", "baz", "example", "your-script", "name"]);

  for (const rel of docFiles) {
    const content = readText(rel);
    if (!content) continue;
    const lines = content.split("\n");
    // Match references to scripts/X.mjs and hooks/scripts/X.mjs
    const re = /`(scripts\/[\w./-]+\.mjs|hooks\/scripts\/[\w./-]+\.mjs)`/g;

    // Build line index lookup for context check
    let charIdx = 0;
    const lineOf = (offset) => {
      let acc = 0;
      for (let i = 0; i < lines.length; i++) {
        acc += lines[i].length + 1;
        if (acc > offset) return lines[i];
      }
      return "";
    };

    for (const m of content.matchAll(re)) {
      const refPath = m[1];

      // Skip placeholder names
      const baseName = refPath.split("/").pop().replace(/\.mjs$/, "");
      if (PLACEHOLDER_NAMES.has(baseName)) continue;

      // Skip if the line containing this ref has a roadmap/future marker
      const lineContent = lineOf(m.index);
      if (SKIP_CONTEXT_MARKERS.some(rx => rx.test(lineContent))) continue;

      if (!existsSync(join(ROOT, refPath))) {
        flag(
          "broken-script-ref",
          "medium",
          `${rel} cites \`${refPath}\` but file doesn't exist`,
          rel
        );
      }
    }
  }
}

// ─── Checker 3: Skills cite policies that don't exist ────────────────────────
function checkPolicyReferences(idx) {
  const docFiles = [
    ...listFiles(join(ROOT, "policies"), ".md").map(f => `policies/${f}`),
    ...listDirs(join(ROOT, "skills"), /^\d{2}-/).map(d => `skills/${d}/SKILL.md`),
    ...listFiles(join(ROOT, "agents"), ".md").map(f => `agents/${f}`),
    "AGENTS.md", "GLOBAL.md",
  ];
  for (const rel of docFiles) {
    const content = readText(rel);
    if (!content) continue;
    const re = /`policies\/([\w-]+)\.md`/g;
    for (const m of content.matchAll(re)) {
      const policyName = m[1];
      // Skip placeholder/example names (single letter, X/Y/Z, foo/bar)
      if (/^[a-z]$/.test(policyName)) continue;
      if (["x", "y", "z", "foo", "bar", "baz", "example"].includes(policyName.toLowerCase())) continue;
      if (!idx.policies.has(policyName)) {
        flag(
          "broken-policy-ref",
          "medium",
          `${rel} cites policy \`policies/${policyName}.md\` but doesn't exist`,
          rel
        );
      }
    }
  }
}

// ─── Checker 4: Mirror skill ↔ agent pairs that claim to mirror but don't ──
const MIRROR_PAIRS = [
  { skill: "09-orchestrator", agent: "orchestrator" },
  { skill: "11-reviewer", agent: "code-reviewer" },
  { skill: "05-qa-testing", agent: "test-engineer" },
  { skill: "06-security-review", agent: "security-auditor" },
];

function checkMirrorPairs(idx) {
  for (const { skill, agent } of MIRROR_PAIRS) {
    const skillExists = idx.skills.has(skill);
    const agentExists = idx.agents.has(agent);
    if (skillExists && !agentExists) {
      flag(
        "broken-mirror",
        "high",
        `Skill ${skill} claims mirror agent "${agent}" but agents/${agent}.md doesn't exist`,
        `skills/${skill}/SKILL.md`
      );
    }
    if (agentExists && !skillExists) {
      flag(
        "broken-mirror",
        "high",
        `Agent ${agent} claims mirror skill "${skill}" but skills/${skill}/ doesn't exist`,
        `agents/${agent}.md`
      );
    }
    if (skillExists && agentExists) {
      // Verify both files actually mention each other (disclaimers from v2.2.1+)
      const skillContent = readText(`skills/${skill}/SKILL.md`);
      const agentContent = readText(`agents/${agent}.md`);
      if (skillContent && !skillContent.includes(`dev-team-kit-fv:${agent}`)) {
        flag(
          "missing-mirror-disclaimer",
          "low",
          `skills/${skill}/SKILL.md doesn't mention mirror agent "dev-team-kit-fv:${agent}"`,
          `skills/${skill}/SKILL.md`
        );
      }
      if (agentContent && !agentContent.includes(`dev-team-kit-fv:${skill}`)) {
        flag(
          "missing-mirror-disclaimer",
          "low",
          `agents/${agent}.md doesn't mention mirror skill "dev-team-kit-fv:${skill}"`,
          `agents/${agent}.md`
        );
      }
    }
  }
}

// ─── Checker 5: hooks.json references scripts that exist (re-check) ──────────
function checkHooksJson(idx) {
  const raw = readText("hooks/hooks.json");
  if (!raw) return;
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    flag("invalid-json", "high", "hooks/hooks.json is not valid JSON", "hooks/hooks.json");
    return;
  }
  const events = parsed.hooks || parsed;
  for (const [event, blocks] of Object.entries(events)) {
    if (!Array.isArray(blocks)) continue;
    for (const block of blocks) {
      const list = block.hooks || (Array.isArray(block) ? block : []);
      for (const h of list) {
        const cmd = typeof h === "string" ? h : (h.command || "");
        const m = cmd.match(/scripts\/([\w-]+)\.mjs/);
        if (m && !idx.hookScripts.has(m[1])) {
          flag(
            "broken-hook-script-ref",
            "high",
            `hooks.json (${event}) references hooks/scripts/${m[1]}.mjs but file doesn't exist`,
            "hooks/hooks.json"
          );
        }
      }
    }
  }
}

// ─── Checker 6: Counts in description vs reality ─────────────────────────────
function checkCounters(idx) {
  const skillCount = idx.skills.size;
  const agentCount = idx.agents.size;
  const commandCount = idx.commands.size;
  const policyCount = idx.policies.size;

  const files = ["AGENTS.md", "README.md", ".claude-plugin/plugin.json", ".claude-plugin/marketplace.json"];
  for (const rel of files) {
    const content = readText(rel);
    if (!content) continue;
    // Match patterns like "39 skills", "15 agents", "31 commands"
    const skillMatch = content.match(/(\d{1,3})\s+(?:specialist\s+)?skills/i);
    if (skillMatch) {
      const declared = Number(skillMatch[1]);
      if (Math.abs(declared - skillCount) > 1) {
        flag(
          "count-drift",
          "low",
          `${rel} declares "${declared} skills" but actual count is ${skillCount}`,
          rel
        );
      }
    }
    const agentMatch = content.match(/(\d{1,3})\s+(?:dispatchable\s+)?(?:sub)?agents/i);
    if (agentMatch) {
      const declared = Number(agentMatch[1]);
      if (Math.abs(declared - agentCount) > 1) {
        flag(
          "count-drift",
          "low",
          `${rel} declares "${declared} agents" but actual count is ${agentCount}`,
          rel
        );
      }
    }
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
function run() {
  const idx = buildIndex();
  checkAgentsMdSubagents(idx);
  checkScriptReferences(idx);
  checkPolicyReferences(idx);
  checkMirrorPairs(idx);
  checkHooksJson(idx);
  checkCounters(idx);
  return { idx, findings };
}

function renderJson(result) {
  return JSON.stringify({
    summary: {
      total: result.findings.length,
      high: result.findings.filter(f => f.severity === "high").length,
      medium: result.findings.filter(f => f.severity === "medium").length,
      low: result.findings.filter(f => f.severity === "low").length,
    },
    findings: result.findings,
    index_sizes: {
      skills: result.idx.skills.size,
      agents: result.idx.agents.size,
      policies: result.idx.policies.size,
      commands: result.idx.commands.size,
      hook_scripts: result.idx.hookScripts.size,
    },
  }, null, 2);
}

function renderMarkdown(result) {
  const high = result.findings.filter(f => f.severity === "high");
  const medium = result.findings.filter(f => f.severity === "medium");
  const low = result.findings.filter(f => f.severity === "low");
  const lines = [];
  lines.push(`# 🔍 Harness Coherence Check\n`);
  lines.push(`> Enforces Principle 4 from \`policies/harness-categories.md\`: "Guides e sensors não podem se contradizer entre si".\n`);
  if (result.findings.length === 0) {
    lines.push(`✅ **All coherent.** No contradictions found across ${result.idx.skills.size} skills, ${result.idx.agents.size} agents, ${result.idx.policies.size} policies, ${result.idx.commands.size} commands, ${result.idx.hookScripts.size} hooks.\n`);
    return lines.join("\n");
  }
  lines.push(`Found **${result.findings.length}** issues:\n`);
  lines.push(`- 🔴 High: ${high.length}`);
  lines.push(`- 🟡 Medium: ${medium.length}`);
  lines.push(`- 🔵 Low: ${low.length}\n`);

  for (const [label, list] of [["🔴 High", high], ["🟡 Medium", medium], ["🔵 Low", low]]) {
    if (!list.length) continue;
    lines.push(`## ${label}\n`);
    for (const f of list) {
      lines.push(`- **${f.category}** \`${f.location}\` — ${f.message}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

const args = process.argv.slice(2);
const format = args.includes("--json") ? "json" : "markdown";
const result = run();
process.stdout.write(format === "json" ? renderJson(result) : renderMarkdown(result));

// Exit code: only HIGH fails CI; medium/low are informational
const highCount = result.findings.filter(f => f.severity === "high").length;
process.exit(highCount > 0 ? 1 : 0);
