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

/**
 * Caminhos que a chamada vai escrever. Claude/Grok trazem `file_path`/`notebook_path`/`path`; o Codex
 * edita por `apply_patch`, onde os caminhos estao DENTRO do texto do patch
 * (`*** Update File: x`, `*** Add File: y`, `*** Delete File: z`, `*** Move to: w`).
 */
const PATCH_HEADER = "\\*\\*\\* (?:Add File|Update File|Delete File|Move to):\\s*";

/** Caminhos de um patch. Texto cru: um por linha. No modo "code" do Codex o patch vem dentro de JS
 *  (`tools.apply_patch("...\n*** Update File: x\n...")`), numa linha so, com `\n` literal e `\\` no lugar de `\`. */
function patchPaths(text) {
  if (!text.includes("*** ")) return [];
  const out = [];
  if (/[\r\n]/.test(text)) {
    for (const m of text.matchAll(new RegExp(`^${PATCH_HEADER}(.+?)\\s*$`, "gm"))) out.push(m[1]);
  } else {
    for (const m of text.matchAll(new RegExp(`${PATCH_HEADER}((?:[^"'\\\\]|\\\\\\\\)+?)\\s*(?=\\\\n|\\\\r|["']|$)`, "g"))) out.push(m[1].replace(/\\\\/g, "\\"));
  }
  return out;
}

function editTargets(toolInput) {
  const found = new Set();
  const visit = (v) => {
    if (typeof v === "string") {
      for (const p of patchPaths(v)) found.add(p);
    } else if (Array.isArray(v)) {
      v.forEach(visit);
    } else if (v && typeof v === "object") {
      for (const key of ["file_path", "notebook_path", "path", "target_file"]) if (typeof v[key] === "string" && v[key]) found.add(v[key]);
      Object.values(v).forEach(visit);
    }
  };
  visit(toolInput);
  return [...found];
}

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

    const targets = editTargets(input.tool_input).map((p) => resolve(cwd, p));
    const target = targets.find((t) => !isInside(freeze, t));
    if (!target) return allow();

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
