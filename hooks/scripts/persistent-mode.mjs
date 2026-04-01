#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  const stateFile = '.bot/docs/context/pipeline-active.json';
  if (existsSync(stateFile)) {
    try {
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
      if (state.active && state.pipeline) {
        process.stdout.write(JSON.stringify({
          continue: false,
          hookSpecificOutput: {
            additionalContext: `[PersistentMode] Pipeline "${state.pipeline}" is active (step ${state.current_step || '?'}/${state.total_steps || '?'}). Complete the current pipeline stage before stopping. To force stop, delete .bot/docs/context/pipeline-active.json.`
          }
        }));
        process.exit(0);
      }
    } catch {}
  }
  process.stdout.write(JSON.stringify({ continue: true }));
});
