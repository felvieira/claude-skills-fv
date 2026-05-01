#!/usr/bin/env node
/**
 * test-completion.mjs — Smoke tests for auto-loop/completion.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-completion.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import {
  detectCompletion,
  COMPLETION_MARKERS,
  BLOCKED_MARKERS,
  COMPLETION_PATTERNS,
  STUCK_PATTERNS,
} from '../../auto-loop/completion.mjs';

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

// ─── Test 1: Exported arrays/patterns ────────────────────────────────────────
console.log('\nTest 1: exported constants');
{
  assert('COMPLETION_MARKERS is array', Array.isArray(COMPLETION_MARKERS) && COMPLETION_MARKERS.length > 0);
  assert('BLOCKED_MARKERS is array', Array.isArray(BLOCKED_MARKERS) && BLOCKED_MARKERS.length > 0);
  assert('COMPLETION_PATTERNS is array', Array.isArray(COMPLETION_PATTERNS) && COMPLETION_PATTERNS.length > 0);
  assert('STUCK_PATTERNS is array', Array.isArray(STUCK_PATTERNS) && STUCK_PATTERNS.length > 0);
  assert('COMPLETION_MARKERS contains EXIT_SIGNAL', COMPLETION_MARKERS.includes('EXIT_SIGNAL: true'));
  assert('BLOCKED_MARKERS contains TASK_BLOCKED', BLOCKED_MARKERS.includes('TASK_BLOCKED'));
}

// ─── Test 2: Explicit completion marker ──────────────────────────────────────
console.log('\nTest 2: explicit completion marker');
{
  const r = detectCompletion('did the work\nEXIT_SIGNAL: true');
  assert('done=true', r.done === true, `got: ${JSON.stringify(r)}`);
  assert('not blocked', !r.blocked, `got: ${JSON.stringify(r)}`);
  assert('reason mentions marker', /marker/.test(r.reason || ''), `got: ${r.reason}`);
}

// ─── Test 3: Explicit blocked marker ─────────────────────────────────────────
console.log('\nTest 3: explicit blocked marker');
{
  const r = detectCompletion('TASK_BLOCKED: cannot proceed');
  assert('done=true', r.done === true, `got: ${JSON.stringify(r)}`);
  assert('blocked=true', r.blocked === true, `got: ${JSON.stringify(r)}`);
  assert('reason mentions blocked', /blocked/.test(r.reason || ''), `got: ${r.reason}`);
}

// ─── Test 4: Semantic completion (score ≥ 0.75) ──────────────────────────────
console.log('\nTest 4: semantic completion');
{
  const r = detectCompletion('all tests pass and implementation is complete');
  assert('done=true', r.done === true, `got: ${JSON.stringify(r)}`);
  assert('not blocked', !r.blocked, `got: ${JSON.stringify(r)}`);
  assert('reason mentions semantic', /semantic/.test(r.reason || ''), `got: ${r.reason}`);
}

// ─── Test 5: Not done (low signal) ───────────────────────────────────────────
console.log('\nTest 5: not done');
{
  const r = detectCompletion('working on it');
  assert('done=false', r.done === false, `got: ${JSON.stringify(r)}`);
}

// ─── Test 6: Semantic stuck ──────────────────────────────────────────────────
console.log('\nTest 6: semantic stuck');
{
  const r = detectCompletion('I cannot proceed with this approach');
  assert('done=true', r.done === true, `got: ${JSON.stringify(r)}`);
  assert('blocked=true', r.blocked === true, `got: ${JSON.stringify(r)}`);
}

// ─── Test 7: Empty / non-string input ────────────────────────────────────────
console.log('\nTest 7: edge cases');
{
  assert('empty string → not done', detectCompletion('').done === false);
  assert('null → not done', detectCompletion(null).done === false);
  assert('undefined → not done', detectCompletion(undefined).done === false);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
