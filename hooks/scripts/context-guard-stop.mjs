#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let input = {};
  try { input = JSON.parse(_input); } catch {}

  // Never block context-limit stops (prevents compaction deadlock)
  if (input.reason === 'context_limit' || input.stop_reason === 'context_limit') {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Load config
  let cfg = { warn_threshold: 0.60, block_threshold: 0.75, max_blocks_per_session: 2 };
  try {
    const raw = JSON.parse(readFileSync('hooks/config.json', 'utf-8'));
    if (raw.context_guard) cfg = { ...cfg, ...raw.context_guard };
  } catch {}

  // Track blocks this session
  const blockFile = '.bot/.context-guard-blocks.json';
  let blocks = 0;
  try { blocks = JSON.parse(readFileSync(blockFile, 'utf-8')).count || 0; } catch {}

  if (blocks >= cfg.max_blocks_per_session) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Check token usage if provided by Claude Code
  const inputTokens = input.input_tokens;
  const contextWindow = input.context_window;

  if (inputTokens && contextWindow) {
    const usage = inputTokens / contextWindow;
    if (usage > cfg.block_threshold) {
      try {
        mkdirSync('.bot', { recursive: true });
        writeFileSync(blockFile, JSON.stringify({ count: blocks + 1 }));
      } catch {}
      process.stdout.write(JSON.stringify({
        continue: false,
        hookSpecificOutput: {
          additionalContext: `[ContextGuard] Context at ${Math.round(usage * 100)}% (threshold: ${Math.round(cfg.block_threshold * 100)}%). Run /compact before stopping. Block ${blocks + 1}/${cfg.max_blocks_per_session}.`
        }
      }));
      process.exit(0);
    }
  }

  // Fallback: always inject reminder when stopping
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      additionalContext: `[ContextGuard] Stopping. If context feels high (10+ messages since last /compact), consider /compact first. If pipeline is active, complete current stage.`
    }
  }));
});
