#!/usr/bin/env node
/**
 * test-context.mjs — Smoke tests for auto-loop/context.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-context.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { buildContext } from '../../auto-loop/context.mjs';

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

// Setup tmpdir + chdir
const originalCwd = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'auto-loop-ctx-'));
process.chdir(dir);

try {
  // Write .auto/plan.md so context can read it
  mkdirSync('.auto', { recursive: true });
  writeFileSync(
    '.auto/plan.md',
    '# Plan\n- [x] first task\n- [ ] second task\n- [ ] third task\n',
  );

  const baseOpts = { task: 'implement feature X', model: 'claude-sonnet-4-5' };
  const baseState = {
    iteration: 1,
    maxIterations: 8,
    lastError: '',
    lastOutput: '',
    tools: {},
  };

  // ─── Test 1: Tier 1 (iter=1) — full context ──────────────────────────────
  console.log('\nTest 1: Tier 1 (iter=1) full context');
  {
    const ctx = buildContext(baseOpts, baseState);
    assert('includes task', ctx.includes('implement feature X'), `len=${ctx.length}`);
    assert('includes Kit Instructions', ctx.includes('Kit Instructions'));
    assert('includes plan content', ctx.includes('first task'));
    assert('mentions EXIT_SIGNAL guidance', ctx.includes('EXIT_SIGNAL'));
    assert('returns string', typeof ctx === 'string' && ctx.length > 0);
  }

  // ─── Test 2: Tier 1 (iter=2) — still full context ────────────────────────
  console.log('\nTest 2: Tier 1 (iter=2)');
  {
    const ctx = buildContext(baseOpts, { ...baseState, iteration: 2 });
    assert('includes task', ctx.includes('implement feature X'));
    assert('includes Kit Instructions', ctx.includes('Kit Instructions'));
  }

  // ─── Test 3: Tier 2 (iter=3) — focused context ───────────────────────────
  console.log('\nTest 3: Tier 2 (iter=3)');
  let tier2Ctx;
  {
    tier2Ctx = buildContext(baseOpts, { ...baseState, iteration: 3 });
    assert('includes Plan Status', tier2Ctx.includes('Plan Status'), `got: ${tier2Ctx.slice(0, 200)}`);
    assert('includes iteration tag', tier2Ctx.includes('iteration 3/8'));
    assert('includes task', tier2Ctx.includes('implement feature X'));
  }

  // ─── Test 4: Tier 2 with error ───────────────────────────────────────────
  console.log('\nTest 4: Tier 2 with lastError');
  {
    const ctx = buildContext(baseOpts, {
      ...baseState,
      iteration: 4,
      lastError: 'TypeError: foo is not a function',
    });
    assert('includes Error to Fix', ctx.includes('Error to Fix'));
    assert('includes error message', ctx.includes('TypeError'));
  }

  // ─── Test 5: Tier 3 (iter=7) — minimal context ───────────────────────────
  console.log('\nTest 5: Tier 3 (iter=7)');
  {
    const ctx = buildContext(baseOpts, { ...baseState, iteration: 7 });
    assert('includes "iter 7"', ctx.includes('iter 7'), `got: ${ctx.slice(0, 200)}`);
    assert('includes task', ctx.includes('implement feature X'));
    assert('shorter than tier 2', ctx.length < tier2Ctx.length, `tier2=${tier2Ctx.length}, tier3=${ctx.length}`);
    assert('no Kit Instructions block', !ctx.includes('Kit Instructions'));
  }

  // ─── Test 6: Tier 3 with error ───────────────────────────────────────────
  console.log('\nTest 6: Tier 3 with lastError');
  {
    const ctx = buildContext(baseOpts, {
      ...baseState,
      iteration: 8,
      lastError: 'ReferenceError: bar is not defined',
    });
    assert('includes Fix this error', ctx.includes('Fix this error'));
    assert('includes error', ctx.includes('ReferenceError'));
  }
} finally {
  process.chdir(originalCwd);
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
