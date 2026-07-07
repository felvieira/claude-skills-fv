#!/usr/bin/env node
/**
 * pre-code-ladder-guard.mjs — UserPromptSubmit hook
 *
 * Antes de escrever código novo, lembra a IA de subir a escada de 7 degraus
 * (YAGNI → já existe no repo → stdlib → feature nativa → dependência instalada
 * → one-liner → só então código novo). Ver policies/pre-code-ladder.md.
 *
 * Dispara uma vez por sessão. Não dispara se o prompt menciona termos de
 * segurança/auth/validação/a11y — esses são carve-out, não sujeitos a
 * minimização (ver policy).
 *
 * Output: { continue: true, hookSpecificOutput: { additionalContext } }
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { readHookConfig, isHookDisabled, resolveBotPath } from "./utils.mjs";

function getSessionState() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSessionState(state) {
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify(state));
  } catch {}
}

// mesmos radicais de verbo de criação usados em pre-build-gate.mjs
const CREATE_VERBS = /\b(cri[aeo]\w*|implement\w*|constr[uó]\w*|desenvolv\w*|fa[çz]\w*|fazer|build\w*|ger[ae]\w*|mont[ae]\w*|setup|nov[oa]s?|new|create\w*)\b/i;

// carve-out: segurança/validação/a11y nunca sofrem nudge de minimização
const EXCEPTION_TERMS = /\b(seguran[çc]a|security|auth\w*|autentica[çc][aã]o|valida[çc][aã]o|validation|trust\s*boundary|a11y|acessibilidade|accessibility|criptografia|crypto)\b/i;

function shouldFire(text) {
  if (!CREATE_VERBS.test(text)) return false;
  if (EXCEPTION_TERMS.test(text)) return false;
  return true;
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  if (isHookDisabled("pre-code-ladder-guard")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try { input = JSON.parse(inputBuffer); } catch {}

  const cfg = readHookConfig("pre_code_ladder", { enabled: true });
  if (cfg.enabled === false) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const prompt = input.prompt || "";
  if (!prompt || !shouldFire(prompt)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const session = getSessionState();
  if (session.preCodeLadderGated) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  session.preCodeLadderGated = true;
  saveSessionState(session);

  const message = [
    `[pre-code-ladder-guard] 🪜 Antes de escrever código novo — suba a escada`,
    ``,
    `Pare no primeiro degrau que já resolve:`,
    `  1. Precisa mesmo existir? (YAGNI)`,
    `  2. Já existe lógica equivalente neste codebase?`,
    `  3. Stdlib/runtime já resolve?`,
    `  4. Feature nativa da plataforma/framework já resolve?`,
    `  5. Dependência já instalada já resolve?`,
    `  6. Cabe num one-liner?`,
    `  7. Só então, escreva o mínimo de código novo.`,
    ``,
    `Carve-out: segurança, trust-boundary, prevenção de perda de dados e a11y NUNCA são minimizados por esta escada.`,
    ``,
    `Playbook completo: policies/pre-code-ladder.md.`,
  ].join("\n");

  process.stdout.write(
    JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: message,
      },
    })
  );
});
