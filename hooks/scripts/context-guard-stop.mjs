#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { execSync } from 'child_process';
import { readHookConfig, resolveBotPath, isHookDisabled } from './utils.mjs';

// Suppress context-guard reminder when user is running an inspection/meta command —
// otherwise it pollutes the output of the command they actually wanted.
const INSPECTION_COMMAND_PATTERNS = [
  /^\s*\/savings\b/i,
  /^\s*\/metrics\b/i,
  /^\s*\/cost\b/i,
  /^\s*\/cost-tracker\b/i,
  /^\s*\/consolidate-memory\b/i,
  /^\s*\/analyze\b/i,
  /^\s*\/checklist\b/i,
  /\b(?:resumir|resume|mostra|mostrar|show|display)\s+(?:o\s+)?\/savings\b/i,
];

function isInspectionCommandContext() {
  try {
    const sessionPath = resolveBotPath('.hook-session.json');
    if (!existsSync(sessionPath)) return false;
    const session = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    const lastPrompt = session.last_prompt || '';
    return INSPECTION_COMMAND_PATTERNS.some(p => p.test(lastPrompt));
  } catch {
    return false;
  }
}

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  if (isHookDisabled('context-guard-stop')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Don't show context-guard reminder during inspection commands.
  if (isInspectionCommandContext()) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try { input = JSON.parse(_input); } catch {}

  // Never block context-limit stops (prevents compaction deadlock)
  if (input.reason === 'context_limit' || input.stop_reason === 'context_limit') {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const cfg = readHookConfig('context_guard', {
    warn_threshold: 0.50,
    block_threshold: 0.75,
    max_blocks_per_session: 2,
    strategic_compact: true,
  });

  // Track blocks this session
  const blockFile = resolveBotPath('.context-guard-blocks.json');
  let blocks = 0;
  try { blocks = JSON.parse(readFileSync(blockFile, 'utf-8')).count || 0; } catch {}

  if (blocks >= cfg.max_blocks_per_session) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const inputTokens = input.input_tokens;
  const contextWindow = input.context_window;

  if (inputTokens && contextWindow) {
    const usage = inputTokens / contextWindow;
    const pct = Math.round(usage * 100);

    if (usage >= cfg.block_threshold) {
      // Self-correcting format (v2.8.0): Where / Why / Fix / References
      const parts = [
        `[context-guard-stop] 🛑 Context at ${pct}% — block ${blocks + 1}/${cfg.max_blocks_per_session}`,
        ``,
        `Where: input_tokens=${inputTokens} / context_window=${contextWindow}`,
        ``,
        `Why this matters: continuing past ${Math.round(cfg.block_threshold * 100)}% risks auto-compaction during a critical edit, which silently drops earlier context and breaks multi-file refactors. Compacting NOW preserves what matters.`,
        `(see policies/token-efficiency.md, GLOBAL.md "Context Decay Awareness")`,
        ``,
        `Fix — run /compact with this preservation list:`,
        ``,
      ];

      if (cfg.strategic_compact) {
        parts.push(`  PRESERVE:`);

        // Task hint from session state
        try {
          const session = JSON.parse(readFileSync(resolveBotPath('.hook-session.json'), 'utf-8'));
          if (session.last_prompt) {
            parts.push(`    - Current task: "${session.last_prompt}"`);
          }
        } catch {}

        // Files edited this session
        try {
          const diff = execSync('git diff --name-only HEAD', { encoding: 'utf-8', timeout: 3000 }).trim();
          if (diff) {
            const files = diff.split('\n').slice(0, 5).join(', ');
            parts.push(`    - Files edited this session: ${files}`);
          }
        } catch {}

        // Working set decisions
        try {
          const ws = JSON.parse(readFileSync(resolveBotPath('.working-set.json'), 'utf-8'));
          if (ws.decisions && ws.decisions.length > 0) {
            parts.push(`    - Pending decisions: ${ws.decisions.slice(0, 2).join('; ')}`);
          }
        } catch {}

        parts.push(`    - Any open AskUserQuestion result not yet acted on`);
        parts.push(``);
        parts.push(`  DISCARD:`);
        parts.push(`    - Initial code exploration (Read/Grep already digested)`);
        parts.push(`    - Tool outputs already summarized`);
        parts.push(`    - Older messages superseded by recent decisions`);
      } else {
        parts.push(`  /compact`);
      }

      parts.push(``);
      parts.push(`Alternative: if you're at a natural stopping point, end the session — context restarts fresh next turn.`);
      parts.push(``);
      parts.push(`References: policies/token-efficiency.md, policies/self-correcting-sensors.md, GLOBAL.md`);
      const message = parts.join('\n');

      try {
        mkdirSync(dirname(blockFile), { recursive: true });
        writeFileSync(blockFile, JSON.stringify({ count: blocks + 1 }));
      } catch {}

      // Stop hooks: hookSpecificOutput NOT supported by Claude Code schema.
      // Use top-level fields: decision="block" + reason to actively block stop.
      process.stdout.write(JSON.stringify({
        decision: "block",
        reason: message,
        systemMessage: message
      }));
      process.exit(0);
    }

    // Proactive warning: non-blocking, fires between warn_threshold and block_threshold
    if (cfg.strategic_compact && usage >= cfg.warn_threshold) {
      let taskHint = '';
      try {
        const session = JSON.parse(readFileSync(resolveBotPath('.hook-session.json'), 'utf-8'));
        if (session.last_prompt) taskHint = ` Focus: "${session.last_prompt}".`;
      } catch {}

      const warn = [
        `[context-guard-stop] \u26A0 Context at ${pct}% \u2014 approaching block threshold`,
        ``,
        `Where: input_tokens=${inputTokens} / context_window=${contextWindow}`,
        ``,
        `Why this matters: at ${Math.round(cfg.block_threshold * 100)}% the next stop will be blocked.${taskHint}`,
        ``,
        `Fix: run /compact at the next natural pause. Preserve current focus; discard prior exploration.`,
        ``,
        `References: policies/token-efficiency.md`,
      ].join('\n');

      process.stdout.write(JSON.stringify({
        continue: true,
        systemMessage: warn
      }));
      process.exit(0);
    }
  }

  // Fallback reminder when stopping without token data
  const fallback = [
    `[context-guard-stop] Stop reminder`,
    ``,
    `Why this matters: no token data available, but if 10+ messages elapsed since the last /compact, context drift is likely.`,
    ``,
    `Fix: if pipeline is active, finish the current stage first. Then /compact if context feels heavy.`,
    ``,
    `References: policies/token-efficiency.md`,
  ].join('\n');

  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: fallback
  }));
});
