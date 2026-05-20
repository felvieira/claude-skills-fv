#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { isHookDisabled } from './utils.mjs';

let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (chunk) => { _input += chunk; });
process.stdin.on('end', () => {
  if (isHookDisabled('persistent-mode')) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const stateFile = '.bot/docs/context/pipeline-active.json';
  if (existsSync(stateFile)) {
    try {
      const state = JSON.parse(readFileSync(stateFile, 'utf-8'));
      if (state.active && state.pipeline) {
        // Stop hooks: use top-level decision/reason/systemMessage (no hookSpecificOutput).
        const msg = `[PersistentMode] Pipeline "${state.pipeline}" is active (step ${state.current_step || '?'}/${state.total_steps || '?'}). Complete the current pipeline stage before stopping. To force stop, delete .bot/docs/context/pipeline-active.json.`;
        process.stdout.write(JSON.stringify({
          decision: "block",
          reason: msg,
          systemMessage: msg
        }));
        return;
      }
    } catch (err) {
      process.stderr.write(`[PersistentMode] Failed to read state file: ${err.message}\n`);
    }
  }
  process.stdout.write(JSON.stringify({ continue: true }));
});
