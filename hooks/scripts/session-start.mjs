#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
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

  const additionalContext = parts.length > 0
    ? `[DevTeamKit] Session started. ${parts.join('\n\n')} Read .bot/docs/context/current-focus.md for session state. Kit rules: .bot/GLOBAL.md.`
    : '[DevTeamKit] Session started. Read .bot/docs/context/current-focus.md for session state. Kit rules: .bot/GLOBAL.md.';

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { additionalContext },
  }));
});
