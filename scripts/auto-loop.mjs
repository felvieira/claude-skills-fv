#!/usr/bin/env node
// Shim — delegates to scripts/auto-loop/index.mjs.
// Kept at this path for backwards compat with `.bot/scripts/auto-loop.mjs` installs
// and existing docs that reference it.
import('./auto-loop/index.mjs').catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
