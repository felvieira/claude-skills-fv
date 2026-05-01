#!/usr/bin/env node
/**
 * test-interrupt.mjs — Smoke tests for interrupt.mjs.
 *
 * Usage: node scripts/tests/auto-loop/test-interrupt.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import {
  installInterruptHandlers,
  uninstallInterruptHandlers,
  isGracefulStop,
  isForceStop,
  _resetForTests,
  _triggerSigint,
} from '../../auto-loop/interrupt.mjs';

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ok ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

console.log('\nTest 1: install + first SIGINT -> graceful');
{
  _resetForTests();
  let threw = false;
  try {
    installInterruptHandlers();
  } catch (e) {
    threw = true;
    console.error('  install threw:', e?.message);
  }
  assert('install does not throw', !threw);

  _triggerSigint();
  assert('isGracefulStop() === true after first sigint', isGracefulStop() === true);
  assert('isForceStop() === false after first sigint', isForceStop() === false);
}

console.log('\nTest 2: second SIGINT -> force');
{
  _triggerSigint();
  assert('isForceStop() === true after second sigint', isForceStop() === true);
}

console.log('\nTest 3: _resetForTests clears flags');
{
  _resetForTests();
  assert('isGracefulStop() === false after reset', isGracefulStop() === false);
  assert('isForceStop() === false after reset', isForceStop() === false);
}

console.log('\nTest 4: uninstallInterruptHandlers does not throw');
{
  // Re-install fresh (reset cleared `installed`, so install again).
  let threw = false;
  try {
    installInterruptHandlers();
    uninstallInterruptHandlers();
  } catch (e) {
    threw = true;
    console.error('  uninstall threw:', e?.message);
  }
  assert('install + uninstall does not throw', !threw);
}

console.log('\nTest 5: uninstall when not installed is no-op');
{
  _resetForTests();
  let threw = false;
  try {
    uninstallInterruptHandlers();
  } catch (e) {
    threw = true;
  }
  assert('uninstall when not installed does not throw', !threw);
}

console.log(`\n${'-'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
