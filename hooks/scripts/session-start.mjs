#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  let contextNote = '';
  if (existsSync('.bot/docs/context/current-focus.md')) {
    try {
      const focus = readFileSync('.bot/docs/context/current-focus.md', 'utf-8');
      const firstLine = focus.split('\n').find(l => l.trim() && !l.startsWith('#')) || '';
      if (firstLine) contextNote = ` Last focus: "${firstLine.trim()}"`;
    } catch {}
  }
  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: {
      additionalContext: `[DevTeamKit] Session started.${contextNote} Read .bot/docs/context/current-focus.md for session state. Kit rules: .bot/GLOBAL.md.`
    }
  }));
});
