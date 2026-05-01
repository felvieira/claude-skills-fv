#!/usr/bin/env node
/**
 * test-stop-when.mjs — Smoke tests for stop-when.mjs.
 *
 * Usage: node scripts/tests/auto-loop/test-stop-when.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import {
  injectStopWhen,
  checkStopWhen,
} from '../../auto-loop/stop-when.mjs';

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

console.log('\nTest 1: injectStopWhen with empty condition returns prompt unchanged');
{
  const out = injectStopWhen('hello', '');
  assert('empty condition returns prompt unchanged', out === 'hello', `got: ${out}`);
}

console.log('\nTest 2: injectStopWhen with condition includes marker + condition');
{
  const out = injectStopWhen('hello', 'all tests pass');
  assert('output includes original prompt', out.startsWith('hello'), `got: ${out.slice(0, 40)}`);
  assert('output includes STOP_WHEN_MET marker', out.includes('STOP_WHEN_MET'));
  assert('output includes the condition text', out.includes('all tests pass'));
}

console.log('\nTest 3: checkStopWhen parses true');
{
  const r = checkStopWhen('output\nSTOP_WHEN_MET: true');
  assert('returns true', r === true, `got: ${r}`);
}

console.log('\nTest 4: checkStopWhen parses false');
{
  const r = checkStopWhen('output\nSTOP_WHEN_MET: false');
  assert('returns false', r === false, `got: ${r}`);
}

console.log('\nTest 5: checkStopWhen returns null when marker absent');
{
  const r = checkStopWhen('output');
  assert('returns null when no marker', r === null, `got: ${r}`);
}

console.log('\nTest 6: checkStopWhen handles null/empty input');
{
  assert('null input returns null', checkStopWhen(null) === null);
  assert('empty input returns null', checkStopWhen('') === null);
}

console.log('\nTest 7: checkStopWhen is case-insensitive on the value');
{
  const r1 = checkStopWhen('STOP_WHEN_MET: TRUE');
  const r2 = checkStopWhen('STOP_WHEN_MET: False');
  assert('TRUE -> true', r1 === true, `got: ${r1}`);
  assert('False -> false', r2 === false, `got: ${r2}`);
}

console.log(`\n${'-'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
