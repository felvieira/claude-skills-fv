#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { readHookConfig, resolveBotPath, isHookDisabled } from "./utils.mjs";

const PLAN_TOOLS = ["EnterPlanMode", "ExitPlanMode"];
const AGENT_TOOL = "Agent";

const DEEP_KEYWORDS = [
  "plan", "architect", "design", "review security", "strategy",
  "migration design", "security", "audit", "compliance",
];
const FAST_KEYWORDS = [
  "rename", "format", "boilerplate", "template", "checklist",
  "lint", "typo", "placeholder", "microcopy",
];

function getConfig() {
  return readHookConfig("model_routing", {
    suggest_on_plan_mode: true,
    suggest_on_agent_spawn: true,
    min_suggestion_interval_ms: 60000,
    plan_model: "opus",
    exec_model: "sonnet",
    fast_model: "haiku",
  });
}

function getSessionState() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSessionState(state) {
  mkdirSync(resolveBotPath(), { recursive: true });
  writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify(state, null, 2));
}

function canSuggest(config) {
  const now = Date.now();
  const session = getSessionState();
  const lastTime = session.last_model_suggestion_ms || 0;
  const interval = config.min_suggestion_interval_ms || 60000;
  if (now - lastTime < interval) return false;
  session.last_model_suggestion_ms = now;
  saveSessionState(session);
  return true;
}

function detectTier(prompt, config) {
  const lower = (prompt || "").toLowerCase();
  for (const kw of DEEP_KEYWORDS) {
    if (lower.includes(kw)) return { tier: "Deep", model: config.plan_model };
  }
  for (const kw of FAST_KEYWORDS) {
    if (lower.includes(kw)) return { tier: "Fast", model: config.fast_model };
  }
  return { tier: "Balanced", model: config.exec_model };
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
});

process.stdin.on("end", () => {
  if (isHookDisabled('model-routing-hook')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try {
    input = JSON.parse(inputBuffer);
  } catch {
    // fall through — input stays {}
  }

  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};
  const config = getConfig();

  // --- EnterPlanMode ---
  if (toolName === "EnterPlanMode" && config.suggest_on_plan_mode) {
    if (canSuggest(config)) {
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: [
            `⚡ Model Routing: Entrando em plan mode.`,
            `   Considere: /model ${config.plan_model} (melhor raciocinio pra arquitetura e decisoes)`,
            `   Volte pra ${config.exec_model} ao sair do plan mode.`,
            `   Ver policies/model-routing.md`,
          ].join("\n"),
        },
      }));
      return;
    }
  }

  // --- ExitPlanMode ---
  if (toolName === "ExitPlanMode" && config.suggest_on_plan_mode) {
    if (canSuggest(config)) {
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: [
            `⚡ Model Routing: Saindo de plan mode.`,
            `   Considere: /model ${config.exec_model} (execucao eficiente com menor custo)`,
            `   Use /model ${config.plan_model} apenas quando precisar planejar novamente.`,
            `   Ver policies/model-routing.md`,
          ].join("\n"),
        },
      }));
      return;
    }
  }

  // --- Agent spawn ---
  if (toolName === AGENT_TOOL && config.suggest_on_agent_spawn) {
    const hasModel = toolInput.model != null && toolInput.model !== "";
    if (!hasModel && canSuggest(config)) {
      const prompt = toolInput.prompt || toolInput.description || "";
      const { tier, model } = detectTier(prompt, config);
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          additionalContext: [
            `⚡ Model Routing: Subagent sem model explicito.`,
            `   Prompt sugere task ${tier} → recomendado: model: "${model}"`,
            `   Defina model explicitamente ao spawnar Agent.`,
            `   Ver policies/model-routing.md`,
          ].join("\n"),
        },
      }));
      return;
    }
  }

  // --- Pass through ---
  process.stdout.write(JSON.stringify({ continue: true }));
});
