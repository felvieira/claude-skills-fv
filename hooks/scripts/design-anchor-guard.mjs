#!/usr/bin/env node

/**
 * design-anchor-guard — PreToolUse.
 *
 * Um conjunto de sinais pode indicar uma interface pouco específica. A análise
 * textual não conhece marca, tarefa ou resultado visual; por isso o hook só
 * oferece contexto para revisão e nunca bloqueia uma escolha estética.
 * Toggle: hooks/config.json -> design_anchor_guard.enabled=false.
 */

import { appendFileSync, mkdirSync } from "fs";
import { resolveBotPath, isHookDisabled, readHookConfig } from "./utils.mjs";

const VISUAL_FILE = /\.(css|scss|tsx|jsx|vue|svelte|astro|html)$/i;

const SIGNALS = [
  {
    id: "indigo-default",
    pattern: /#(4f46e5|6366f1|4338ca)\b|\bbg-indigo-(500|600)\b|\btext-indigo-(500|600)\b/i,
    label: "indigo default do Tailwind (#4f46e5 / indigo-500/600)",
    fix: "confira se a cor serve a marca, hierarquia e contraste",
  },
  {
    id: "ai-gradient",
    pattern: /from-(purple|violet|indigo)-\d{3}\s+to-(pink|rose|fuchsia)-\d{3}/i,
    label: "gradiente roxo-para-rosa",
    fix: "avalie a funcao do gradiente e a leitura sobre ele",
  },
  {
    id: "system-ui-only",
    pattern: /font-family:\s*(system-ui|-apple-system)\s*[,;]/i,
    label: "system-ui como fonte declarada",
    fix: "confira legibilidade, idioma e coerencia com a identidade",
  },
  {
    id: "pure-black-surface",
    pattern: /(background(-color)?|--\w*(bg|surface)\w*)\s*:\s*(#000\b|#000000\b|black\b)/i,
    label: "preto puro como superficie",
    fix: "verifique contraste, leitura e separacao de superficies nos temas usados",
  },
];

function extractWriteContent(input) {
  const name = input?.tool_name || "";
  const args = input?.tool_input || {};
  if (name === "Write") return { path: args.file_path || "", text: args.content || "" };
  if (name === "Edit") return { path: args.file_path || "", text: args.new_string || "" };
  return null;
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  const allow = () => {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  };

  if (isHookDisabled("design-anchor-guard")) return allow();

  let input = {};
  try { input = JSON.parse(inputBuffer); } catch { return allow(); }

  const cfg = readHookConfig("design_anchor_guard", { enabled: true });
  if (cfg.enabled === false) return allow();

  const write = extractWriteContent(input);
  if (!write || !VISUAL_FILE.test(write.path) || !write.text) return allow();

  // Escape hatch explicito, no mesmo espirito do dev-guard: quem sabe o que
  // esta fazendo declara e segue.
  if (/design-anchor:\s*allow/i.test(write.text)) return allow();

  const hits = SIGNALS.filter((s) => s.pattern.test(write.text));
  if (hits.length < 2) return allow();

  const reason = [
    `Revisão contextual: ${hits.length} padrões visuais encontrados em ${write.path}.`,
    ``,
    ...hits.flatMap((h) => [`  - ${h.label}`, `    -> ${h.fix}`]),
    ``,
    `Padrões isolados ou combinados não provam defeito nem autoria. Confira a tarefa,`,
    `a identidade e a interface renderizada antes de decidir qualquer mudança.`,
    ``,
    `Verificar o arquivo inteiro: node scripts/check-design-generic.mjs <path>`,
    `Para silenciar este aviso no trecho: comentario "design-anchor: allow".`,
  ].join("\n");

  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    appendFileSync(
      resolveBotPath("design-anchor-guard.jsonl"),
      JSON.stringify({
        ts: new Date().toISOString(),
        hook: "design-anchor-guard",
        file: write.path,
        signals: hits.map((h) => h.id),
      }) + "\n",
      "utf-8"
    );
  } catch {}

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: reason,
    },
  }));
});
