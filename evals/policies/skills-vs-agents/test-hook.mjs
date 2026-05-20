#!/usr/bin/env node
/**
 * Smoke test do hook agent-dispatch-validator.
 *
 * Roda 4 cenários determinísticos:
 *   1. Skill name como subagent_type → deve bloquear
 *   2. Subagent legítimo do kit → deve passar
 *   3. Subagent não-kit (general-purpose) → deve passar
 *   4. Nome inexistente com prefixo kit → deve bloquear com lista
 *
 * Uso: node evals/policies/skills-vs-agents/test-hook.mjs
 * Exit code 0 = todos passaram. Exit code 1 = pelo menos um falhou.
 */

import { spawnSync } from "child_process";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..", "..");
const HOOK = join(REPO_ROOT, "hooks", "scripts", "agent-dispatch-validator.mjs");

function runHook(input) {
  const res = spawnSync("node", [HOOK], {
    input: JSON.stringify(input),
    encoding: "utf-8",
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: REPO_ROOT },
  });
  try {
    return JSON.parse(res.stdout);
  } catch {
    return { _parse_error: true, raw: res.stdout, stderr: res.stderr };
  }
}

const cases = [
  {
    id: "sva-005",
    name: "skill name as subagent_type → must block",
    input: {
      tool_name: "Agent",
      tool_input: {
        subagent_type: "dev-team-kit-fv:04-frontend-integration",
        description: "Slice 2",
        prompt: "...",
      },
    },
    assert: (out) => {
      if (out.decision !== "block") return `expected decision="block", got ${out.decision}`;
      const reason = out.reason || "";
      const required = [
        "não é um subagent_type válido",
        "este nome é uma SKILL",
        "general-purpose",
        "isolation: \"worktree\"",
        "policies/skills-vs-agents.md",
      ];
      for (const r of required) {
        if (!reason.includes(r)) return `reason missing: "${r}"`;
      }
      return null;
    },
  },
  {
    id: "sva-006",
    name: "legitimate kit subagent → must pass",
    input: {
      tool_name: "Agent",
      tool_input: {
        subagent_type: "dev-team-kit-fv:code-reviewer",
        description: "Review",
        prompt: "...",
      },
    },
    assert: (out) => {
      if (out.decision) return `expected no decision, got ${out.decision}`;
      if (out.continue !== true) return `expected continue=true, got ${out.continue}`;
      return null;
    },
  },
  {
    id: "sva-007",
    name: "non-kit subagent (general-purpose) → must pass",
    input: {
      tool_name: "Agent",
      tool_input: {
        subagent_type: "general-purpose",
        description: "x",
        prompt: "y",
      },
    },
    assert: (out) => {
      if (out.decision) return `expected no decision, got ${out.decision}`;
      if (out.continue !== true) return `expected continue=true, got ${out.continue}`;
      return null;
    },
  },
  {
    id: "sva-009",
    name: "unknown kit name → must block with valid subagent list",
    input: {
      tool_name: "Agent",
      tool_input: {
        subagent_type: "dev-team-kit-fv:nonexistent-name",
        description: "x",
        prompt: "y",
      },
    },
    assert: (out) => {
      if (out.decision !== "block") return `expected decision="block", got ${out.decision}`;
      const reason = out.reason || "";
      if (!reason.includes("Subagents válidos")) return `reason missing valid list`;
      if (!reason.includes("dev-team-kit-fv:code-reviewer")) return `reason missing code-reviewer in list`;
      return null;
    },
  },
  {
    id: "sva-010",
    name: "non-Agent tool (Read) → must pass-through",
    input: {
      tool_name: "Read",
      tool_input: { file_path: "x" },
    },
    assert: (out) => {
      if (out.decision) return `expected no decision, got ${out.decision}`;
      if (out.continue !== true) return `expected continue=true, got ${out.continue}`;
      return null;
    },
  },
];

let failed = 0;
console.log(`\n🧪 Running ${cases.length} hook smoke tests\n`);

for (const c of cases) {
  const out = runHook(c.input);
  if (out._parse_error) {
    console.log(`  ❌ ${c.id} ${c.name}\n     parse error. stderr: ${out.stderr}`);
    failed++;
    continue;
  }
  const err = c.assert(out);
  if (err) {
    console.log(`  ❌ ${c.id} ${c.name}\n     ${err}\n     output: ${JSON.stringify(out).slice(0, 200)}`);
    failed++;
  } else {
    console.log(`  ✅ ${c.id} ${c.name}`);
  }
}

console.log(`\n${failed === 0 ? "✅ All passed" : `❌ ${failed}/${cases.length} failed`}\n`);
process.exit(failed === 0 ? 0 : 1);
