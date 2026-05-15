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

  // Emit advisory context
  const advice = [
    "⚠️ memory/constitution.md foi modificado.",
    "",
    "Recomendado: rodar `/analyze --strict` para detectar artefatos invalidados pela mudanca",
    "(specs, plans ou issues que conflitam com o novo principio).",
    "",
    "Se a mudanca exige bump semver: registrar em commit dedicado `chore(constitution): ...`",
    "Ver `policies/constitution.md` para criterios MAJOR/MINOR/PATCH.",
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
