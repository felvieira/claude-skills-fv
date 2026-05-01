#!/usr/bin/env node
/**
 * fake-codex.mjs — minimal CLI shim, behaves like `codex exec --full-auto <prompt>`.
 *
 * Used by test-agents-codex-e2e.mjs to exercise the codex adapter spawn/parse
 * pipeline without burning real LLM tokens.
 *
 * Args layout: ['exec', '--full-auto', '<prompt>']
 * On success, emits a deterministic response plus a trailing JSON usage line
 * with input_tokens=100, output_tokens=50, cache_read_input_tokens=0.
 */

const args = process.argv.slice(2);

if (args[0] !== 'exec' || args[1] !== '--full-auto') {
  console.error('fake-codex: expected `exec --full-auto <prompt>`');
  process.exit(2);
}

const prompt = args[2] || '';

// Echo a deterministic response with a trailing JSON usage line.
process.stdout.write(`fake-codex received: ${prompt.slice(0, 60)}\n`);
process.stdout.write(`Implementation complete\n`);
process.stdout.write(
  JSON.stringify({
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_read_input_tokens: 0,
    },
  }) + '\n'
);

process.exit(0);
