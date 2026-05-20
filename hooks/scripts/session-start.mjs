#!/usr/bin/env node
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { isHookDisabled, readHookConfig, resolveBotPath } from './utils.mjs';

const BOOTSTRAP_DEFAULTS = {
  inject_meta_skill: true,
  meta_skill_path: 'docs/skill-guides/skill-discovery.md',
};
const MAX_META_SKILL_CHARS = 2000;

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  if (isHookDisabled('session-start')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const parts = [];

  // --- Current focus ---
  if (existsSync('.bot/docs/context/current-focus.md')) {
    try {
      const focus = readFileSync('.bot/docs/context/current-focus.md', 'utf-8');
      const firstLine = focus.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';
      if (firstLine) parts.push(`Last focus: "${firstLine.trim()}"`);
    } catch {}
  }

  // --- Meta-skill bootstrap ---
  const config = readHookConfig('session_bootstrap', BOOTSTRAP_DEFAULTS);
  if (config.inject_meta_skill && config.meta_skill_path) {
    const candidates = [
      resolveBotPath(config.meta_skill_path),
      config.meta_skill_path,
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        try {
          let content = readFileSync(candidate, 'utf-8');
          if (content.length > MAX_META_SKILL_CHARS) {
            content = content.slice(0, MAX_META_SKILL_CHARS) + '\n[...truncated]';
          }
          parts.push(`[Skill Discovery]\n${content}`);
        } catch {}
        break;
      }
    }
  }

  // --- Write .auto/session.json for context_guard + smart_suggestions ---
  try {
    mkdirSync('.auto', { recursive: true });
    writeFileSync('.auto/session.json', JSON.stringify({
      session_start: new Date().toISOString(),
      estimated_tokens: 0,
      tool_calls: 0,
    }, null, 2), 'utf-8');
  } catch {
    // silent — never block session start
  }

  // --- Async hook integrity check (silent, non-blocking) ---
  // Uses spawn + detached/unref so it cannot delay session start.
  try {
    const verifierCandidates = [
      resolveBotPath('hooks/scripts/verify-integrity.mjs'),
      'hooks/scripts/verify-integrity.mjs',
    ];
    const verifier = verifierCandidates.find(p => existsSync(p));
    if (verifier) {
      const child = spawn(process.execPath, [verifier, '--silent'], {
        stdio: 'ignore',
        detached: true,
      });
      child.unref();
      child.on('error', () => { /* silent */ });
    }
  } catch {
    // silent — integrity check is advisory, never blocks
  }

  // --- Token budget guard ---
  // Estimate tokens (rough: 1 token ≈ 4 chars). Trim low-value parts if over budget.
  const budgetTokens = parseInt(process.env.DEVKIT_SESSION_INJECT_TOKENS || '2000', 10);
  const estimateTokens = (s) => Math.ceil(s.length / 4);
  const totalChars = parts.reduce((sum, p) => sum + p.length, 0);
  const estimatedTokens = estimateTokens(totalChars);
  if (estimatedTokens > budgetTokens) {
    // Trim from the end (lowest priority parts added last) until under budget
    let current = estimatedTokens;
    while (parts.length > 1 && current > budgetTokens) {
      const removed = parts.pop();
      current -= estimateTokens(removed);
    }
  }

  const additionalContext = parts.length > 0
    ? `[DevTeamKit] Session started. ${parts.join('\n\n')} Read .bot/docs/context/current-focus.md for session state. Kit rules: .bot/GLOBAL.md.`
    : '[DevTeamKit] Session started. Read .bot/docs/context/current-focus.md for session state. Kit rules: .bot/GLOBAL.md.';

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
  }));
});
