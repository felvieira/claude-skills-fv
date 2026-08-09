#!/usr/bin/env node

/**
 * design-anchor-guard — PreToolUse.
 *
 * O `pre-build-gate` injeta o checklist de design no prompt, mas nao impede nada:
 * ele e UserPromptSubmit e sempre sai com continue. Este guard fecha a lacuna no
 * momento que importa — quando um arquivo visual esta prestes a ser escrito com a
 * assinatura do default estatistico (indigo, system-ui, gradiente roxo-rosa,
 * preto puro como superficie).
 *
 * Bloqueia (permissionDecision: "deny") e diz o que fazer. Toggle:
 * hooks/config.json -> design_anchor_guard.enabled=false
 *
 * Escopo deliberadamente estreito: so os sinais que sao INEQUIVOCAMENTE ausencia
 * de decisao. Guard que bloqueia demais e desligado, e ai nao protege nada.
 */

import { appendFileSync, mkdirSync } from "fs";
import { resolveBotPath, isHookDisabled, readHookConfig } from "./utils.mjs";

const VISUAL_FILE = /\.(css|scss|tsx|jsx|vue|svelte|astro|html)$/i;

const SIGNALS = [
  {
    id: "indigo-default",
    pattern: /#(4f46e5|6366f1|4338ca)\b|\bbg-indigo-(500|600)\b|\btext-indigo-(500|600)\b/i,
    label: "indigo default do Tailwind (#4f46e5 / indigo-500/600)",
    fix: "derive o accent da ancora estetica escolhida. Chegar no indigo = a decisao foi pulada",
  },
  {
    id: "ai-gradient",
    pattern: /from-(purple|violet|indigo)-\d{3}\s+to-(pink|rose|fuchsia)-\d{3}/i,
    label: "gradiente roxo-para-rosa (cliche 'AI SaaS')",
    fix: "se a ancora pede gradiente, derive da paleta propria; senao use superficie solida",
  },
  {
    id: "system-ui-only",
    pattern: /font-family:\s*(system-ui|-apple-system)\s*[,;]/i,
    label: "system-ui como fonte declarada (sem par tipografico)",
    fix: "escolha display + body coerentes com a ancora; system-ui so no fim da pilha de fallback",
  },
  {
    id: "pure-black-surface",
    pattern: /(background(-color)?|--\w*(bg|surface)\w*)\s*:\s*(#000\b|#000000\b|black\b)/i,
    label: "preto puro como superficie",
    fix: "use #121212 ou equivalente — preto puro causa halation, smearing OLED e mata elevacao (skill 57)",
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
  if (hits.length === 0) return allow();

  const reason = [
    `BLOQUEADO pelo design-anchor-guard: ${hits.length} sinal(is) de UI generica em ${write.path}`,
    ``,
    ...hits.flatMap((h) => [`  - ${h.label}`, `    -> ${h.fix}`]),
    ``,
    `O modo de falha mais comum de UI gerada por IA nao e feiura, e ausencia de decisao:`,
    `o modelo cai na media do treino. Escolha UMA ancora estetica (skill 02-ui-ux-design)`,
    `e derive paleta e tipografia dela antes de estilizar.`,
    ``,
    `Verificar o arquivo inteiro: node scripts/check-design-generic.mjs <path>`,
    `Falso positivo? adicione o comentario "design-anchor: allow" no arquivo.`,
    `Desligar: hooks/config.json -> design_anchor_guard.enabled=false`,
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
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
});
