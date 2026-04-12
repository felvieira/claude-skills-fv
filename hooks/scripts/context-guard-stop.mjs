#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { execSync } from 'child_process';
import { readHookConfig, resolveBotPath, isHookDisabled } from './utils.mjs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  if (isHookDisabled('context-guard-stop')) {
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
      let message = `\u{1F6D1} Contexto em ${pct}%. Rode /compact antes de continuar.\n`;

      if (cfg.strategic_compact) {
        message += '\nO que preservar:\n';

        // Task hint from session state
        try {
          const session = JSON.parse(readFileSync(resolveBotPath('.hook-session.json'), 'utf-8'));
          if (session.last_prompt) {
            message += `- Task atual: "${session.last_prompt}"\n`;
          }
        } catch {}

        // Files edited this session
        try {
          const diff = execSync('git diff --name-only HEAD', { encoding: 'utf-8', timeout: 3000 }).trim();
          if (diff) {
            const files = diff.split('\n').slice(0, 5).join(', ');
            message += `- Arquivos editados: ${files}\n`;
          }
        } catch {}

        // Working set decisions
        try {
          const ws = JSON.parse(readFileSync(resolveBotPath('.working-set.json'), 'utf-8'));
          if (ws.decisions && ws.decisions.length > 0) {
            message += `- Decisoes pendentes: ${ws.decisions.slice(0, 2).join('; ')}\n`;
          }
        } catch {}

        message += '\nO que pode ser descartado:\n';
        message += '- Exploracao de codigo ja concluida\n';
        message += '- Outputs de ferramentas ja processados\n';
        message += `- Block ${blocks + 1}/${cfg.max_blocks_per_session} desta sessao`;
      }

      try {
        mkdirSync(dirname(blockFile), { recursive: true });
        writeFileSync(blockFile, JSON.stringify({ count: blocks + 1 }));
      } catch {}

      process.stdout.write(JSON.stringify({
        continue: false,
        hookSpecificOutput: { additionalContext: message }
      }));
      process.exit(0);
    }

    // Proactive warning: non-blocking, fires between warn_threshold and block_threshold
    if (cfg.strategic_compact && usage >= cfg.warn_threshold) {
      let taskHint = '';
      try {
        const session = JSON.parse(readFileSync(resolveBotPath('.hook-session.json'), 'utf-8'));
        if (session.last_prompt) taskHint = ` Foco atual: "${session.last_prompt}".`;
      } catch {}

      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: `\u26A0 Contexto em ${pct}%. Considere /compact em breve.${taskHint} Preserve o foco atual e descarte exploracao anterior.`
        }
      }));
      process.exit(0);
    }
  }

  // Fallback reminder when stopping without token data
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      additionalContext: `[ContextGuard] Stopping. If context feels high (10+ messages since last /compact), consider /compact first. If pipeline is active, complete current stage.`
    }
  }));
});
