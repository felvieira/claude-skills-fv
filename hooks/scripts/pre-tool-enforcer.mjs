#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join } from "path";
import { resolveBotPath } from "./utils.mjs";

const WRITE_TOOLS = ["Edit", "Write", "NotebookEdit", "mcp__Desktop_Commander__write_file", "mcp__Desktop_Commander__edit_block"];
const EXPLORE_TOOLS = ["Read", "Grep", "Glob"];

let cachedToolsEnv = null;
function getAvailableTools() {
  if (cachedToolsEnv !== null) return cachedToolsEnv;
  cachedToolsEnv = {};

  try {
    const envPath = resolveBotPath(".env.tools");
    const content = readFileSync(envPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const [key, val] = trimmed.split("=");
      if (key && val) cachedToolsEnv[key.trim()] = val.trim();
    }
  } catch {}

  return cachedToolsEnv;
}

let cachedConfig = null;
function getConfig() {
  if (cachedConfig !== null) return cachedConfig;

  try {
    const configPath = resolveBotPath("hooks", "config.json");
    const full = JSON.parse(readFileSync(configPath, "utf-8"));
    cachedConfig = full.code_exploration || {};
  } catch {
    cachedConfig = {};
  }

  return cachedConfig;
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

function getToolUsage() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".tool-usage.json"), "utf-8"));
  } catch {
    return {
      reads: {},
      searches: {},
      writes: {},
      total_calls: 0,
      repeated_signals: [],
      bytes_read: 0,
      large_reads: [],
    };
  }
}

function saveToolUsage(usage) {
  mkdirSync(resolveBotPath(), { recursive: true });
  writeFileSync(resolveBotPath(".tool-usage.json"), JSON.stringify(usage, null, 2));
}

function buildCodeIntelSuggestion() {
  const env = getAvailableTools();
  const lines = [];

  if (env.CODEBASE_MEMORY_AVAILABLE === "1") {
    lines.push("- search_graph / trace_call_path / get_architecture (codebase-memory): busca estrutural no grafo AST");
  }
  if (env.CYMBAL_AVAILABLE === "1") {
    lines.push("- cymbal investigate <symbol> / cymbal structure / cymbal impact <symbol>: symbol navigation rapido");
  }
  if (env.LUMEN_AVAILABLE === "1") {
    lines.push("- semantic_search (lumen): busca por significado, nao por texto literal");
  }

  if (lines.length === 0) return null;

  return `[Code Exploration] Prefira ferramentas de code intelligence antes de Grep/Read bruto:\n${lines.join("\n")}\nUse Grep/Read apenas como fallback. Ver policies/code-exploration.md.`;
}

function getExploreTarget(toolName, toolInput) {
  if (toolName === "Read") return toolInput?.file_path || toolInput?.path || null;
  if (toolName === "Grep") return toolInput?.pattern || null;
  if (toolName === "Glob") return toolInput?.pattern || null;
  return null;
}

function registerUsage(toolName, toolInput) {
  const usage = getToolUsage();
  usage.total_calls = (usage.total_calls || 0) + 1;
  usage.repeated_signals = usage.repeated_signals || [];
  usage.bytes_read = usage.bytes_read || 0;
  usage.large_reads = usage.large_reads || [];

  const target = getExploreTarget(toolName, toolInput);
  if (toolName === "Read" && target) {
    usage.reads[target] = (usage.reads[target] || 0) + 1;

    if (existsSync(target)) {
      try {
        const fileSize = statSync(target).size;
        usage.bytes_read += fileSize;
        if (fileSize >= 20000 && !usage.large_reads.includes(target)) {
          usage.large_reads.push(target);
        }
      } catch {}
    }

    if (usage.reads[target] === 3) {
      usage.repeated_signals.push(`Repeated read: ${target}`);
      saveToolUsage(usage);
      return `[ExplorationReuse] O arquivo "${target}" ja foi lido 3 vezes nesta sessao. Reutilize working set, repo-audit, current-focus ou extraia uma learned skill antes de ler de novo.`;
    }
  }

  if ((toolName === "Grep" || toolName === "Glob") && target) {
    usage.searches[target] = (usage.searches[target] || 0) + 1;
    if (usage.searches[target] === 3) {
      usage.repeated_signals.push(`Repeated search: ${toolName} ${target}`);
      saveToolUsage(usage);
      return `[ExplorationReuse] O padrao "${target}" ja foi buscado 3 vezes nesta sessao. Reutilize os resultados anteriores, working set ou troque para uma busca mais estrutural.`;
    }
  }

  if (WRITE_TOOLS.includes(toolName)) {
    const filePath = toolInput?.file_path || toolInput?.path;
    if (filePath) {
      usage.writes[filePath] = (usage.writes[filePath] || 0) + 1;
    }
  }

  saveToolUsage(usage);
  return null;
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
});

process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(inputBuffer);
  } catch {
    if (!inputBuffer.trim()) {
      process.stderr.write("[PreToolUse] Empty stdin received - passing through\n");
    }
  }

  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};
  const repetitionWarning = registerUsage(toolName, toolInput);

  if (WRITE_TOOLS.includes(toolName)) {
    const writeNotice = "[PreToolUse] About to write. GLOBAL.md Context Decay Awareness: if this session has 10+ messages, re-read the target file before editing to avoid stale-state regressions.";
    const additionalContext = repetitionWarning ? `${repetitionWarning}\n${writeNotice}` : writeNotice;
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: { additionalContext },
    }));
    return;
  }

  const config = getConfig();
  const suggestTools = config.suggest_on_tools || EXPLORE_TOOLS;
  if (suggestTools.includes(toolName)) {
    const interval = config.min_suggestions_interval_ms || 30000;
    const now = Date.now();
    const session = getSessionState();
    const lastTime = session.last_explore_suggestion_ms || 0;
    const suggestion = buildCodeIntelSuggestion();

    const messages = [];
    if (repetitionWarning) messages.push(repetitionWarning);

    if (suggestion && now - lastTime >= interval) {
      messages.push(suggestion);
      session.last_explore_suggestion_ms = now;
      saveSessionState(session);
    }

    if (messages.length > 0) {
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: messages.join("\n\n"),
        },
      }));
      return;
    }
  }

  if (repetitionWarning) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: { additionalContext: repetitionWarning },
    }));
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
});
