#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const WRITE_TOOLS = ['Edit', 'Write', 'NotebookEdit', 'mcp__Desktop_Commander__write_file', 'mcp__Desktop_Commander__edit_block'];
const EXPLORE_TOOLS = ['Read', 'Grep', 'Glob'];

// --- Tool availability detection (cached per invocation) ---
let _toolsEnv = null;
function getAvailableTools() {
  if (_toolsEnv !== null) return _toolsEnv;
  _toolsEnv = {};
  try {
    const envPath = join(process.cwd(), '.bot', '.env.tools');
    const content = readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const [key, val] = trimmed.split('=');
      if (key && val) _toolsEnv[key.trim()] = val.trim();
    }
  } catch {
    // .env.tools not found — no external tools available
  }
  return _toolsEnv;
}

// --- Suggestion anti-spam ---
let _lastSuggestionFile = null;
function getLastSuggestionTime() {
  if (_lastSuggestionFile !== null) return _lastSuggestionFile;
  try {
    const statePath = join(process.cwd(), '.bot', '.hook-session.json');
    const session = JSON.parse(readFileSync(statePath, 'utf-8'));
    _lastSuggestionFile = session.last_explore_suggestion_ms || 0;
  } catch {
    _lastSuggestionFile = 0;
  }
  return _lastSuggestionFile;
}

// --- Config ---
let _config = null;
function getConfig() {
  if (_config !== null) return _config;
  try {
    const configPath = join(process.cwd(), '.bot', 'hooks', 'config.json');
    const full = JSON.parse(readFileSync(configPath, 'utf-8'));
    _config = full.code_exploration || {};
  } catch {
    _config = {};
  }
  return _config;
}

// --- Build suggestion message ---
function buildSuggestion() {
  const env = getAvailableTools();
  const lines = [];

  if (env.CODEBASE_MEMORY_AVAILABLE === '1') {
    lines.push('- search_graph / trace_call_path / get_architecture (codebase-memory): busca estrutural no grafo AST');
  }
  if (env.CYMBAL_AVAILABLE === '1') {
    lines.push('- cymbal investigate <symbol> / cymbal structure / cymbal impact <symbol>: symbol navigation rapido');
  }
  if (env.LUMEN_AVAILABLE === '1') {
    lines.push('- semantic_search (lumen): busca por significado, nao por texto literal');
  }

  if (lines.length === 0) return null;

  return `[Code Exploration] Prefira ferramentas de code intelligence antes de Grep/Read bruto:\n${lines.join('\n')}\nUse Grep/Read apenas como fallback. Ver policies/code-exploration.md.`;
}

// --- Main ---
let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try {
    input = JSON.parse(_input);
  } catch {
    if (!_input.trim()) {
      process.stderr.write('[PreToolUse] Empty stdin received — passing through\n');
    }
  }
  const toolName = input.tool_name || '';

  // --- Write tool: Context Decay Awareness ---
  if (WRITE_TOOLS.includes(toolName)) {
    process.stdout.write(JSON.stringify({
      continue: true,
      hookSpecificOutput: {
        additionalContext: `[PreToolUse] About to write. GLOBAL.md Context Decay Awareness: if this session has 10+ messages, re-read the target file before editing to avoid stale-state regressions.`
      }
    }));
    return;
  }

  // --- Explore tool: Code Intelligence suggestion ---
  const config = getConfig();
  const suggestTools = config.suggest_on_tools || EXPLORE_TOOLS;

  if (suggestTools.includes(toolName)) {
    const interval = config.min_suggestions_interval_ms || 30000;
    const lastTime = getLastSuggestionTime();
    const now = Date.now();

    if (now - lastTime >= interval) {
      const suggestion = buildSuggestion();
      if (suggestion) {
        // Update last suggestion time in session file
        try {
          const statePath = join(process.cwd(), '.bot', '.hook-session.json');
          let session = {};
          try { session = JSON.parse(readFileSync(statePath, 'utf-8')); } catch { /* new file */ }
          session.last_explore_suggestion_ms = now;
          writeFileSync(statePath, JSON.stringify(session, null, 2));
        } catch (err) {
          process.stderr.write(`[PreToolUse] Failed to update session: ${err.message}\n`);
        }

        process.stdout.write(JSON.stringify({
          continue: true,
          hookSpecificOutput: { additionalContext: suggestion }
        }));
        return;
      }
    }
  }

  // --- Default: pass through ---
  process.stdout.write(JSON.stringify({ continue: true }));
});
