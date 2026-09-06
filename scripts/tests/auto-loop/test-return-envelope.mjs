#!/usr/bin/env node
/**
 * test-return-envelope.mjs — Smoke tests for auto-loop/return-envelope.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-return-envelope.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { buildReturnEnvelope, formatReturnEnvelope } from '../../auto-loop/return-envelope.mjs';

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

// ─── Test 1: vitest/jest-style output ────────────────────────────────────────
console.log('\nTest 1: vitest-style failure');
{
  const e = buildReturnEnvelope({
    feedback: `Tests failed:
 FAIL  src/auth/handlers.test.ts > redirects unauthenticated
AssertionError: expected 302 to be 200
    at src/auth/handlers.ts:88:12`,
    tier: 'intermediate',
    attempt: 1,
    maxAttempts: 3,
  });
  assert('extracts file:line as unit', e.unit === 'src/auth/handlers.ts:88', e.unit);
  assert('verdict is red', e.verdict === 'red');
  assert('reason is the failing test name', /redirects unauthenticated/.test(e.reason), e.reason);
  assert('evidence has expected/got', /302/.test(e.evidence) && /200/.test(e.evidence), e.evidence);
  assert('scope names the unit', e.scope.includes('src/auth/handlers.ts:88'), e.scope);
  assert('scope forbids other files', /do not modify other files/.test(e.scope), e.scope);
}

// ─── Test 2: tsc-style output (parenthesized line/col) ───────────────────────
console.log('\nTest 2: tsc-style failure');
{
  const e = buildReturnEnvelope({
    feedback: 'src/utils/parse.ts(42,7): error TS2345: Argument of type string is not assignable to parameter of type number.',
  });
  assert('extracts file(line,col) as unit', e.unit === 'src/utils/parse.ts:42', e.unit);
  assert('reason is the TS message', /not assignable/.test(e.reason), e.reason);
}

// ─── Test 3: eslint-style output ─────────────────────────────────────────────
console.log('\nTest 3: eslint-style failure');
{
  const e = buildReturnEnvelope({
    feedback: '/repo/src/api/route.js:15:3  error  Unexpected console statement  no-console',
  });
  assert('extracts unit', e.unit === '/repo/src/api/route.js:15', e.unit);
}

// ─── Test 4: unknown format degrades safely ──────────────────────────────────
console.log('\nTest 4: unrecognized output degrades to run-level scope');
{
  const e = buildReturnEnvelope({ feedback: 'the build broke somehow' });
  assert('unit falls back to "run"', e.unit === 'run', e.unit);
  assert('reason is first non-empty line', e.reason === 'the build broke somehow', e.reason);
  // Critical property: an unparsed failure must NOT widen permission. The
  // fallback scope still forbids adjacent refactors.
  assert('fallback scope still forbids refactor', /do not refactor adjacent code/.test(e.scope), e.scope);
}

// ─── Test 5: empty/missing input ─────────────────────────────────────────────
console.log('\nTest 5: edge cases');
{
  const e1 = buildReturnEnvelope({});
  assert('no feedback → still a valid envelope', e1.unit === 'run' && e1.verdict === 'red', JSON.stringify(e1));
  assert('no feedback → has a reason', typeof e1.reason === 'string' && e1.reason.length > 0, e1.reason);
  const e2 = buildReturnEnvelope();
  assert('no args at all → does not throw', e2.verdict === 'red');
}

// ─── Test 6: field truncation (prompt-size guard) ────────────────────────────
console.log('\nTest 6: long fields are truncated');
{
  const e = buildReturnEnvelope({ feedback: 'x'.repeat(5000) });
  assert('reason capped at 300', e.reason.length <= 300, `len=${e.reason.length}`);
  assert('evidence capped at 300', e.evidence.length <= 300, `len=${e.evidence.length}`);
}

// ─── Test 7: formatReturnEnvelope output shape ───────────────────────────────
console.log('\nTest 7: formatReturnEnvelope()');
{
  const e = buildReturnEnvelope({
    feedback: 'FAIL  a.test.ts > case\nAssertionError: expected 1 to be 2\n    at src/a.ts:10:1',
    attempt: 2,
    maxAttempts: 3,
  });
  const s = formatReturnEnvelope(e);
  for (const label of ['UNIT', 'VERDICT', 'REASON', 'EVIDENCE', 'SCOPE']) {
    assert(`includes ${label}`, s.includes(label), s);
  }
  assert('includes attempt counter', s.includes('2/3'), s);
  assert('tells agent to report out-of-scope needs', /say so instead of doing it/.test(s), s);
  assert('null envelope → empty string', formatReturnEnvelope(null) === '');
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
