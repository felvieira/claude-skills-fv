#!/usr/bin/env node

/**
 * permission-ladder-guard — PreToolUse. OPT-IN, disabled by default.
 *
 * Implements the named permission ladder from policies/tool-safety.md
 * (action type → automatic|approval_required → what must accompany it) as an
 * actual PreToolUse check, not just prose. `rules/common/development-workflow.md`
 * and the environment's own safety rules already ask for confirmation before
 * irreversible actions — this hook is a mechanical backstop for the sessions
 * where that confirmation gets skipped under autonomous/fast modes, not a
 * replacement for asking the user.
 *
 * Deliberately narrow: only flags patterns that are UNAMBIGUOUSLY high-rung on
 * the ladder (destructive git, force-push, rm -rf, deploy-shaped commands).
 * A guard that flags too much gets disabled, and then it protects nothing —
 * same lesson as design-anchor-guard.
 *
 * Toggle: hooks/config.json -> permission_ladder_guard.enabled=true (default
 * false — this changes agent behavior in a way the user must opt into, per
 * the same "off by default" rule applied to CLAUDE_LOOP_MODEL).
 */

import { appendFileSync, mkdirSync } from "fs";
import { isHookDisabled, readHookConfig, resolveBotPath } from "./utils.mjs";

// Each pattern maps to the ladder row it belongs to (policies/tool-safety.md).
// `requires` is what the policy says must accompany approval — surfaced in
// the block message so the human approving it knows what to check for.
const LADDER = [
  {
    id: "destructive-delete",
    pattern: /\b(rm\s+-rf|rimraf|Remove-Item\s+.*-Recurse\s+.*-Force|del\s+\/[sf]\s)/i,
    label: "comando de delete recursivo/forçado",
    requires: "alvo exato nomeado + plano de recuperação",
  },
  {
    id: "force-push",
    pattern: /\bgit\s+push\s+.*--force(?!-with-lease)\b|\bgit\s+push\s+-f\b/i,
    label: "force-push (sem --force-with-lease)",
    requires: "confirmação explícita — pode sobrescrever histórico remoto de outra pessoa",
  },
  {
    id: "reset-hard",
    pattern: /\bgit\s+reset\s+--hard\b/i,
    label: "git reset --hard",
    requires: "confirmação de que trabalho não commitado pode ser descartado",
  },
  {
    id: "branch-delete-force",
    pattern: /\bgit\s+branch\s+-D\b/i,
    label: "delete forçado de branch",
    requires: "confirmação de que a branch não tem trabalho não mergeado",
  },
  {
    id: "deploy-shaped",
    pattern: /\b(terraform\s+apply|kubectl\s+apply|pulumi\s+up|serverless\s+deploy|vercel\s+--prod|firebase\s+deploy|npm\s+publish|docker\s+push)\b/i,
    label: "comando que parece alterar infra/produção ou publicar pacote",
    requires: "testes verdes + plano de rollback pronto",
  },
];

function extractCommand(input) {
  const name = input?.tool_name || "";
  if (name === "Bash") return input?.tool_input?.command || "";
  return "";
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  const allow = () => {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  };

  if (isHookDisabled("permission-ladder-guard")) return allow();

  let input = {};
  try { input = JSON.parse(inputBuffer); } catch { return allow(); }

  const cfg = readHookConfig("permission_ladder_guard", { enabled: false });
  if (cfg.enabled !== true) return allow();

  const command = extractCommand(input);
  if (!command) return allow();

  // Escape hatch, same convention as design-anchor-guard and dev-guard.
  if (/permission-ladder:\s*allow/i.test(command)) return allow();

  const hit = LADDER.find((rule) => rule.pattern.test(command));
  if (!hit) return allow();

  const reason = [
    `PERMISSÃO REQUERIDA (permission-ladder-guard): ${hit.label}`,
    ``,
    `Comando: ${command.slice(0, 200)}`,
    `Exige: ${hit.requires}`,
    ``,
    `Ver policies/tool-safety.md ("Permission ladder") para a régua completa.`,
    `Se já confirmado com o usuário nesta conversa, adicione o sufixo`,
    `" # permission-ladder: allow" ao comando e rode de novo.`,
    `Desligar: hooks/config.json -> permission_ladder_guard.enabled=false`,
  ].join("\n");

  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    appendFileSync(
      resolveBotPath("permission-ladder-guard.jsonl"),
      JSON.stringify({
        ts: new Date().toISOString(),
        hook: "permission-ladder-guard",
        rule: hit.id,
        command: command.slice(0, 300),
      }) + "\n",
      "utf-8"
    );
  } catch {}

  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: reason,
    },
  }));
});
