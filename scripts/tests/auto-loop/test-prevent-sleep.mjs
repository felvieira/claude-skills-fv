#!/usr/bin/env node
/**
 * test-prevent-sleep.mjs — Smoke tests for prevent-sleep.mjs.
 *
 * Usage: node scripts/tests/auto-loop/test-prevent-sleep.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import {
  startPreventSleep,
  stopPreventSleep,
  _isActive,
} from '../../auto-loop/prevent-sleep.mjs';

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

console.log('\nTest 1: startPreventSleep / stopPreventSleep do not throw');
{
  let threw = false;
  try {
    startPreventSleep();
  } catch (e) {
    threw = true;
    console.error('  start threw:', e?.message);
  }
  assert('startPreventSleep does not throw', !threw);

  let threw2 = false;
  try {
    stopPreventSleep();
  } catch (e) {
    threw2 = true;
    console.error('  stop threw:', e?.message);
  }
  assert('stopPreventSleep does not throw', !threw2);
}

console.log('\nTest 2: _isActive() === false after stopPreventSleep');
{
  assert('_isActive() is false after stop', _isActive() === false);
}

console.log('\nTest 3: idempotent stop (calling stop twice is safe)');
{
  let threw = false;
  try {
    stopPreventSleep();
    stopPreventSleep();
  } catch (e) {
    threw = true;
  }
  assert('double stop does not throw', !threw);
  assert('_isActive() still false', _isActive() === false);
}

console.log('\nTest 4: start -> stop -> start -> stop cycle');
{
  let threw = false;
  try {
    startPreventSleep();
    stopPreventSleep();
    startPreventSleep();
    stopPreventSleep();
  } catch (e) {
    threw = true;
    console.error('  cycle threw:', e?.message);
  }
  assert('start/stop cycle does not throw', !threw);
  assert('_isActive() false after cycle', _isActive() === false);
}

console.log(`\n${'-'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
