#!/usr/bin/env node
/**
 * PostToolUse hook: detecta edicoes em `memory/constitution.md` e sugere
 * rodar `/analyze` para identificar artefatos invalidados pela mudanca de
 * principio.
 *
 * Trigger: Edit, Write, MultiEdit em paths que contem "memory/constitution.md".
 * Output: additionalContext informativo (nao bloqueia).
 */

import { isHookDisabled } from "./utils.mjs";

function main() {
  if (isHookDisabled("constitution-watcher")) {
    return;
  }

  let payload;
  try {
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      try {
        payload = JSON.parse(raw);
      } catch {
        process.exit(0);
      }
      handle(payload);
    });
  } catch {
    process.exit(0);
  }
}

function handle(payload) {
  const toolName = payload?.tool_name || "";
  const toolInput = payload?.tool_input || {};

  // Only fire on writes that target constitution.md
  if (!["Edit", "Write", "MultiEdit"].includes(toolName)) {
    process.exit(0);
  }

  const path = toolInput.file_path || toolInput.path || "";
  if (!/memory[\\/]constitution\.md$/i.test(path)) {
    process.exit(0);
  }

  // Emit advisory context (self-correcting pattern)
  const fileName = path.split(/[\\/]/).pop();
  const today = new Date().toISOString().slice(0, 10);
  const advice = [
    `[constitution-watcher] ⚠ memory/constitution.md modified`,
    ``,
    `Where: ${fileName}`,
    ``,
    `Why this matters: the constitution is the highest-authority source. A change`,
    `here may silently invalidate specs/plans/issues written against the OLD principles.`,
    `Skipping the analyze step leaves drift that resurfaces at /build or /review time.`,
    `(see policies/constitution.md, policies/trade-off-resolution.md hierarchy)`,
    ``,
    `Fix — apply in order:`,
    ``,
    `  1. Run /analyze --strict`,
    `     Detects specs/plans/issues that conflict with the new principle.`,
    ``,
    `  2. Decide semver bump (MAJOR / MINOR / PATCH):`,
    `     - MAJOR: removed or inverted an existing principle (breaking)`,
    `     - MINOR: added a new principle without invalidating existing artifacts`,
    `     - PATCH: clarification, typo, reordering, formatting`,
    `     Criteria detail: policies/constitution.md`,
    ``,
    `  3. Commit in isolation (do NOT mix with feature changes):`,
    `     git add memory/constitution.md`,
    `     git commit -m "chore(constitution): <one-line summary> [bump: <MAJOR|MINOR|PATCH>]"`,
    ``,
    `  4. If MAJOR or MINOR → also bump VERSION (if constitution is versioned in repo)`,
    `     and update CHANGELOG.md with the principle delta.`,
    ``,
    `Alternative: if this edit is just a draft / WIP, revert and continue in a branch.`,
    `  git restore memory/constitution.md`,
    ``,
    `References: policies/constitution.md, policies/trade-off-resolution.md, policies/self-correcting-sensors.md`,
    `Today: ${today}`,
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: advice,
      },
    }),
  );
  process.exit(0);
}

main();
