#!/usr/bin/env node
/**
 * conflict-resolution-reminder.mjs (v2.7.3+)
 *
 * PostToolUse sensor: detecta quando o modelo provavelmente acabou de resolver
 * um trade-off entre policies/sensors e injeta lembrete com /log-conflict pronto.
 *
 * Por quê: policies/trade-off-resolution.md (v2.7.0) define hierarquia + casos
 * resolvidos. scripts/log-conflict-decision.mjs (v2.7.1) registra a decisão em
 * .bot/conflict-decisions.jsonl. Mas o modelo esquece de registrar — sem isso
 * /savings nunca enche, conflitos recorrentes nunca viram Casos novos.
 *
 * Heurística de detecção (best-effort, fail-open):
 *   1. Tool é AskUserQuestion + texto da pergunta menciona ("conflito" OR
 *      "trade-off" OR "trade off" OR "ambos") perto de ("policy" OR "skill" OR
 *      ".md" OR "policies/")
 *   2. OU tool é Bash e o command grep'a 2+ paths de policies/ na mesma chamada
 *
 * Throttle: 1 lembrete a cada 10 min por sessão (state em .bot/.conflict-reminder.json).
 *
 * Fail-open: qualquer erro silencia o hook. Nunca bloqueia.
 *
 * Output: additionalContext self-correcting (Where / Why / Fix-pronto / References).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { isHookDisabled } from "./utils.mjs";

const STATE_FILE = join(".bot", ".conflict-reminder.json");
const THROTTLE_MS = 10 * 60 * 1000; // 10 min

function loadState() {
  try {
    if (!existsSync(STATE_FILE)) return { last_fired_at: 0 };
    return JSON.parse(readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { last_fired_at: 0 };
  }
}

function saveState(state) {
  try {
    mkdirSync(".bot", { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(state), "utf-8");
  } catch {
    // fail-open
  }
}

function detectsConflictMention(toolName, toolInput) {
  const str = JSON.stringify(toolInput || {}).toLowerCase();

  // Pattern 1: AskUserQuestion talking about conflict + policy/skill
  if (toolName === "AskUserQuestion") {
    const hasConflictWord = /\b(conflito|trade-?off|ambos\s+(querem|exigem)|qual\s+(policy|regra)\s+vence)\b/i.test(str);
    const hasPolicyRef = /\b(policy|policies\/|skills\/|\.md|constitution|GLOBAL\.md)\b/i.test(str);
    if (hasConflictWord && hasPolicyRef) return "ask-user-conflict";
  }

  // Pattern 2: Bash command reading 2+ policy files in same call
  if (toolName === "Bash") {
    const cmd = (toolInput?.command || "").toLowerCase();
    const policyRefs = (cmd.match(/policies\/[\w-]+\.md/gi) || []).length;
    if (policyRefs >= 2) return "bash-multi-policy";
  }

  return null;
}

function main() {
  if (isHookDisabled("conflict-resolution-reminder")) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  let raw = "";
  process.stdin.on("data", (c) => (raw += c));
  process.stdin.on("end", () => {
    let payload = {};
    try {
      payload = JSON.parse(raw);
    } catch {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }

    const toolName = payload?.tool_name || "";
    const toolInput = payload?.tool_input || {};
    const trigger = detectsConflictMention(toolName, toolInput);

    if (!trigger) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }

    // Throttle
    const state = loadState();
    const now = Date.now();
    if (now - (state.last_fired_at || 0) < THROTTLE_MS) {
      process.stdout.write(JSON.stringify({ continue: true }));
      return;
    }

    const advice = [
      `[conflict-resolution-reminder] ⚠ trade-off resolution likely happening`,
      ``,
      `Where: trigger = ${trigger} (tool: ${toolName})`,
      ``,
      `Why this matters: policies/trade-off-resolution.md asks you to log every`,
      `non-trivial conflict resolution. Without the log, /savings can't surface`,
      `recurring conflicts (candidates to become new Casos Resolvidos) and the`,
      `system stays blind to its own calibration needs.`,
      ``,
      `Fix — pick the matching one-liner AFTER you finish resolving:`,
      ``,
      `  # Case 1-5 applied:`,
      `  node scripts/log-conflict-decision.mjs \\`,
      `    --conflict "policyA.md,policyB.md" \\`,
      `    --resolution "case-N-canonical" \\`,
      `    --outcome "applied"`,
      ``,
      `  # Hierarchy alone (no case matched):`,
      `  node scripts/log-conflict-decision.mjs \\`,
      `    --conflict "policyA.md,policyB.md" \\`,
      `    --resolution "hierarchy" \\`,
      `    --outcome "applied" \\`,
      `    --context "<200 chars why hierarchy won>"`,
      ``,
      `  # Asked user (ad-hoc):`,
      `  node scripts/log-conflict-decision.mjs \\`,
      `    --conflict "policyA.md,policyB.md" \\`,
      `    --resolution "ad-hoc" \\`,
      `    --user-consulted true \\`,
      `    --outcome "user_chose_X"`,
      ``,
      `Alternative (slash command equivalent): /log-conflict --conflict ... --resolution ... --outcome ...`,
      ``,
      `Skip if: trigger was a false positive (no actual conflict resolved).`,
      `Throttle: this reminder fires at most 1×/10min per session.`,
      ``,
      `References: policies/trade-off-resolution.md, commands/log-conflict.md, policies/self-correcting-sensors.md`,
    ].join("\n");

    state.last_fired_at = now;
    saveState(state);

    process.stdout.write(
      JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext: advice,
        },
      })
    );
  });
}

main();
