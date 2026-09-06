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
 * SECURITY MODEL — read before extending this file:
 * This is regex-over-raw-text detection, not a shell parser. A real shell
 * resolves quoting, variable expansion, command substitution, and encoding
 * before it decides what to run; this hook cannot and does not replicate
 * that. Confirmed bypasses during review: quoting the command name
 * (`"rm" -rf`), `eval $(echo <base64> | base64 -d)`, and any obfuscation a
 * determined agent/user constructs on purpose. Building a regex robust
 * against deliberate evasion means writing a shell parser — disproportionate
 * for a best-effort backstop, and still beatable by the next encoding.
 *
 * What this DOES catch: accidental/unobfuscated high-risk commands — the
 * agent typing `rm -rf`, `git push --force`, etc. plainly, split across
 * `&&`/`;`/`|`/newline-joined sub-commands. What this does NOT catch: any
 * intentional evasion. Never treat "the guard didn't fire" as "this command
 * is safe" — same caveat design-anchor-guard's regex-based detection carries.
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

// Splits a compound command into the pieces a shell would treat as separate
// commands (&&, ||, ;, |, newlines) plus anything inside $(...) / `...`
// substitution — closes the trivial case of a dangerous command riding
// along a benign one, without attempting to be a real shell parser (see the
// SECURITY MODEL note above the file header).
function splitCompoundCommand(command) {
  const segments = [command];
  for (const m of command.matchAll(/\$\(([^)]*)\)|`([^`]*)`/g)) {
    segments.push(m[1] ?? m[2] ?? "");
  }
  const flat = segments.flatMap((s) => s.split(/&&|\|\||[;|\n]/));
  return flat.map((s) => s.trim()).filter(Boolean);
}

// A shell treats `"rm"` and `rm` identically; the pattern's word-boundary
// regex does not, because a straddling quote character breaks \b. Strip
// paired quotes immediately around a bareword before matching so this one
// specific dodge (there's no way to close all of them with regex, see the
// header note) doesn't slip through for free.
function stripCommandQuoting(command) {
  return command.replace(/(^|[\s;&|])["']([\w./-]+)["']/g, "$1$2");
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

  const segments = splitCompoundCommand(command).map(stripCommandQuoting);
  let hit = null;
  let matchedSegment = command;
  for (const segment of segments) {
    hit = LADDER.find((rule) => rule.pattern.test(segment));
    if (hit) { matchedSegment = segment; break; }
  }
  if (!hit) return allow();

  const reason = [
    `PERMISSÃO REQUERIDA (permission-ladder-guard): ${hit.label}`,
    ``,
    `Comando completo: ${command.slice(0, 200)}`,
    `Trecho que disparou: ${matchedSegment.slice(0, 150)}`,
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
