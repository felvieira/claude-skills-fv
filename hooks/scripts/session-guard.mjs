#!/usr/bin/env node

/**
 * session-guard — PreToolUse. Aplica o /freeze: bloqueia Edit/Write/MultiEdit/NotebookEdit fora da
 * pasta congelada. Sem estado em `.auto/session-guards.json` nao faz nada (o dispatcher nem chega a
 * spawnar este script). O /careful e aplicado pelo permission-ladder-guard, que reaproveita os
 * mesmos padroes de comando destrutivo.
 *
 * Limite: so enxerga as ferramentas de edicao. Um `sed -i`, `> arquivo` ou `mv` via Bash escapa do
 * freeze — e regex sobre texto de shell nao fecha isso (mesma ressalva do permission-ladder-guard).
 * E protecao contra "conserto" acidental fora do escopo, nao contra evasao deliberada.
 */
import { resolve } from "node:path";
import { isHookDisabled } from "./utils.mjs";
import { isInside, readGuards } from "./session-guards-lib.mjs";

const EDIT_TOOLS = new Set(["Edit", "Write", "MultiEdit", "NotebookEdit"]);

let buffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (c) => { buffer += c; });
process.stdin.on("end", () => {
  const allow = () => { process.stdout.write(JSON.stringify({ continue: true })); process.exit(0); };
  try {
    if (isHookDisabled("session-guard")) return allow();
    const input = JSON.parse(buffer || "{}");
    if (!EDIT_TOOLS.has(input.tool_name)) return allow();

    const cwd = input.cwd || process.cwd();
    const { freeze } = readGuards(cwd);
    if (!freeze) return allow();

    const ti = input.tool_input || {};
    const raw = ti.file_path || ti.notebook_path || ti.path;
    if (!raw) return allow();
    const target = resolve(cwd, raw);
    if (isInside(freeze, target)) return allow();

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: [
          `BLOQUEADO (/freeze): edicao fora da pasta congelada.`,
          `Arquivo: ${target}`,
          `Pasta liberada: ${freeze}`,
          ``,
          `Se este arquivo faz parte da tarefa, peça ao usuario para rodar /freeze com outra pasta ou /freeze off.`,
          `Nao contorne editando por Bash.`,
        ].join("\n"),
      },
    }));
  } catch {
    allow();
  }
});
