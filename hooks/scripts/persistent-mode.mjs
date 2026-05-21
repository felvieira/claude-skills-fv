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
        // Self-correcting Stop block (v2.8.0): Where / Why / 3 graceful Fix options / References
        const step = state.current_step || '?';
        const total = state.total_steps || '?';
        const nextHint = state.next_step ? ` Next step: ${state.next_step}.` : '';
        const msg = [
          `[persistent-mode] 🛑 Pipeline active — cannot stop mid-flight`,
          ``,
          `Where: pipeline="${state.pipeline}" step ${step}/${total}.${nextHint}`,
          ``,
          `Why this matters: stopping in the middle of a pipeline leaves partial state — half-applied edits, unfinished tests, no rollback marker. Resuming later requires re-deriving where you were.`,
          `(see policies/programs-schema.md, policies/quality-gates.md)`,
          ``,
          `Fix — pick the matching option:`,
          ``,
          `  (a) CONTINUE (recommended): run the next pipeline step normally — the pipeline finishes itself.`,
          `      Just submit the next prompt to advance step ${step} → ${step !== '?' ? Number(step) + 1 : '?'}.`,
          ``,
          `  (b) ABORT GRACEFULLY: save progress and stop cleanly.`,
          `      Run: /pipeline-cancel`,
          `      (Marks pipeline-active.json as paused; resumable via /pipeline-resume later.)`,
          ``,
          `  (c) FORCE STOP (destructive — loses progress for this pipeline):`,
          `      Delete the state file manually:`,
          `        rm .bot/docs/context/pipeline-active.json   # bash`,
          `        Remove-Item .bot/docs/context/pipeline-active.json   # PowerShell`,
          `      Use only if the pipeline is genuinely stuck or no longer relevant.`,
          ``,
          `References: policies/programs-schema.md, policies/quality-gates.md, policies/self-correcting-sensors.md`,
        ].join("\n");
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
