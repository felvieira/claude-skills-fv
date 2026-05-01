#!/usr/bin/env node
/**
 * test-plan.mjs — Smoke tests for scripts/auto-loop/plan.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-plan.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const modUrl = new URL('../../auto-loop/plan.mjs', import.meta.url);
const { countPlanTasks, hasPendingTasks, calcBudget } = await import(modUrl);

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

// ─── Test 1: countPlanTasks with no file → {0,0} ─────────────────────────────
console.log('\nTest 1: countPlanTasks() with no .auto/plan.md');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-plan-empty-'));
  process.chdir(dir);
  try {
    const r = countPlanTasks();
    assert('done=0', r.done === 0, `got ${r.done}`);
    assert('total=0', r.total === 0, `got ${r.total}`);
    assert('hasPendingTasks=false', hasPendingTasks() === false);
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 2: countPlanTasks with sample plan ─────────────────────────────────
console.log('\nTest 2: countPlanTasks() with sample plan');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-plan-sample-'));
  mkdirSync(join(dir, '.auto'), { recursive: true });
  const plan = [
    '# Plan',
    '',
    '- [x] Task 1 done',
    '- [x] Task 2 done',
    '- [ ] Task 3 pending',
    '- [ ] Task 4 pending',
    '- [ ] Task 5 pending',
    '',
    'Some prose here.',
  ].join('\n');
  writeFileSync(join(dir, '.auto', 'plan.md'), plan);

  process.chdir(dir);
  try {
    const r = countPlanTasks();
    assert('done=2', r.done === 2, `got ${r.done}`);
    assert('total=5', r.total === 5, `got ${r.total}`);
    assert('hasPendingTasks=true', hasPendingTasks() === true);
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 3: all done → hasPendingTasks=false ────────────────────────────────
console.log('\nTest 3: all tasks complete');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-plan-done-'));
  mkdirSync(join(dir, '.auto'), { recursive: true });
  writeFileSync(join(dir, '.auto', 'plan.md'), '- [x] one\n- [x] two\n');

  process.chdir(dir);
  try {
    const r = countPlanTasks();
    assert('done=2', r.done === 2);
    assert('total=2', r.total === 2);
    assert('hasPendingTasks=false (all done)', hasPendingTasks() === false);
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 4: calcBudget heuristics ───────────────────────────────────────────
console.log('\nTest 4: calcBudget heuristics');
{
  assert('"add JWT auth" → 15 (auth keyword)', calcBudget('add JWT auth') === 15, `got ${calcBudget('add JWT auth')}`);
  assert('"fix typo" → 8', calcBudget('fix typo') === 8, `got ${calcBudget('fix typo')}`);
  assert('"refactor X" → 15 (refactor keyword)', calcBudget('refactor X') === 15);
  assert('"build CRUD endpoints" → 15 (crud keyword)', calcBudget('build CRUD endpoints') === 15);
  assert('"migrate db" → 15 (migrate keyword)', calcBudget('migrate db') === 15);
  // 16 simple words, no keyword → 12
  const mid = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen';
  assert(`16-word task → 12 (got ${calcBudget(mid)})`, calcBudget(mid) === 12);
  // > 30 words → 15
  const big = Array.from({ length: 31 }, (_, i) => `w${i}`).join(' ');
  assert(`31-word task → 15 (got ${calcBudget(big)})`, calcBudget(big) === 15);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
