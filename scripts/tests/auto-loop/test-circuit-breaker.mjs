#!/usr/bin/env node
/**
 * test-circuit-breaker.mjs — Smoke tests for scripts/auto-loop/circuit-breaker.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-circuit-breaker.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const modUrl = new URL('../../auto-loop/circuit-breaker.mjs', import.meta.url);
const { CircuitBreaker, normalizeError, hashError } = await import(modUrl);

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

const originalCwd = process.cwd();

// ─── Test 1: normalizeError strips dynamic parts ─────────────────────────────
console.log('\nTest 1: normalizeError strips dynamics');
{
  const input = 'Error at /foo:42:13 timestamp 2026-04-30T10:00:00Z addr 0xDEADBEEF pid 1234567890123';
  const out = normalizeError(input);
  assert('strips line:col', !/:\d+:\d+/.test(out), `got: ${out}`);
  assert('strips ISO timestamp', !/2026-04-30T/.test(out) && out.includes('<ts>'), `got: ${out}`);
  assert('strips hex addr', !/0xDEADBEEF/i.test(out) && out.includes('<addr>'), `got: ${out}`);
  assert('strips long numbers', out.includes('<num>'), `got: ${out}`);
  assert('result <= 300 chars', out.length <= 300, `got len ${out.length}`);
}

// ─── Test 2: same error different line numbers → same hash ───────────────────
console.log('\nTest 2: hash stable across line-number variation');
{
  const e1 = 'TypeError: cannot read x at /a/b.js:42:13';
  const e2 = 'TypeError: cannot read x at /a/b.js:99:7';
  assert('hashes match', hashError(e1) === hashError(e2), `${hashError(e1)} vs ${hashError(e2)}`);
}

// ─── Test 3: recordError trips after 3 same errors ───────────────────────────
console.log('\nTest 3: recordError trips at maxSameError');
{
  const cb = new CircuitBreaker({ maxSameError: 3, maxStall: 3 });
  const err = 'SyntaxError: unexpected token at /foo.ts:10:5';
  const r1 = cb.recordError(err);
  const r2 = cb.recordError(err);
  const r3 = cb.recordError(err);
  assert('1st not tripped', r1.tripped === false);
  assert('2nd not tripped', r2.tripped === false);
  assert('3rd tripped', r3.tripped === true, `r3=${JSON.stringify(r3)}`);
  assert('reason has count', /repeated 3x/.test(r3.reason || ''), `reason=${r3.reason}`);
}

// ─── Test 4: checkStall first call is init phase (not tripped) ───────────────
console.log('\nTest 4: checkStall first call returns tripped=false');
{
  // Run inside a tmpdir to ensure no real git changes interfere.
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-cb-'));
  process.chdir(dir);
  try {
    const cb = new CircuitBreaker({ maxSameError: 3, maxStall: 3 });
    const r = cb.checkStall();
    assert('first checkStall not tripped', r.tripped === false, `r=${JSON.stringify(r)}`);
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
