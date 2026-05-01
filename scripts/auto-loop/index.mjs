#!/usr/bin/env node
/**
 * auto-loop v2 — entrypoint
 *
 * Parses CLI args, dispatches to single-run (runner.mjs) or parallel (parallel.mjs).
 * Use `auto-loop --help` for full reference.
 */

import { parseArgs, printHelp, EXIT_CODES } from './args.mjs';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  let parsed;
  try {
    parsed = parseArgs(args);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Run with --help for usage.');
    process.exit(EXIT_CODES.USAGE);
  }

  if (parsed.parallel) {
    const { runParallel } = await import('./parallel.mjs');
    const code = await runParallel(parsed);
    process.exit(code);
  }

  const { runOnce } = await import('./runner.mjs');
  const code = await runOnce(parsed);
  process.exit(code);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(EXIT_CODES.FATAL);
});
