#!/usr/bin/env node
/**
 * test-polish.mjs — Smoke tests for auto-loop/polish.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-polish.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import {
  getPolishLevel,
  classifyIssues,
  runPolishPass,
  POLISH_LEVELS,
  SKILL_PATHS,
} from '../../auto-loop/polish.mjs';

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

// ─── Test 1: getPolishLevel ──────────────────────────────────────────────────
console.log('\nTest 1: getPolishLevel');
{
  const none = getPolishLevel('none');
  assert(
    "getPolishLevel('none') → {skills:[], retries:0}",
    Array.isArray(none.skills) && none.skills.length === 0 && none.retries === 0,
    `got: ${JSON.stringify(none)}`,
  );

  const standard = getPolishLevel('standard');
  assert(
    "getPolishLevel('standard') → simplify+review, retries:1",
    JSON.stringify(standard.skills) === JSON.stringify(['simplify', 'review']) && standard.retries === 1,
    `got: ${JSON.stringify(standard)}`,
  );

  const light = getPolishLevel('light');
  assert(
    "getPolishLevel('light') → [simplify], retries:0",
    JSON.stringify(light.skills) === JSON.stringify(['simplify']) && light.retries === 0,
    `got: ${JSON.stringify(light)}`,
  );

  const full = getPolishLevel('full');
  assert(
    "getPolishLevel('full') → 4 skills, retries:3",
    full.skills.length === 4 && full.retries === 3,
    `got: ${JSON.stringify(full)}`,
  );

  const bogus = getPolishLevel('bogus');
  assert(
    "getPolishLevel('bogus') falls back to none",
    bogus.skills.length === 0 && bogus.retries === 0,
    `got: ${JSON.stringify(bogus)}`,
  );
}

// ─── Test 2: classifyIssues ──────────────────────────────────────────────────
console.log('\nTest 2: classifyIssues');
{
  const r1 = classifyIssues('BLOCKING: bug here\nNON_BLOCKING: nit');
  assert(
    "BLOCKING + NON_BLOCKING parsed",
    JSON.stringify(r1) === JSON.stringify({ blocking: ['bug here'], nonBlocking: ['nit'] }),
    `got: ${JSON.stringify(r1)}`,
  );

  const r2 = classifyIssues('clean');
  assert(
    "'clean' → empty arrays",
    r2.blocking.length === 0 && r2.nonBlocking.length === 0,
    `got: ${JSON.stringify(r2)}`,
  );

  const r3 = classifyIssues('');
  assert(
    "empty input → empty arrays",
    r3.blocking.length === 0 && r3.nonBlocking.length === 0,
  );

  const r4 = classifyIssues(null);
  assert(
    "null input does not throw, returns empty arrays",
    r4.blocking.length === 0 && r4.nonBlocking.length === 0,
  );

  const r5 = classifyIssues('  BLOCKING: leading whitespace\nnon-blocking: dash variant');
  assert(
    "trimmed BLOCKING + dash variant of NON_BLOCKING",
    r5.blocking.includes('leading whitespace') && r5.nonBlocking.includes('dash variant'),
    `got: ${JSON.stringify(r5)}`,
  );

  const r6 = classifyIssues('BLOCKING: a\nBLOCKING: b\nNON_BLOCKING: c');
  assert(
    "multiple BLOCKING lines accumulate",
    r6.blocking.length === 2 && r6.nonBlocking.length === 1,
    `got: ${JSON.stringify(r6)}`,
  );
}

// ─── Mock agents ─────────────────────────────────────────────────────────────
function makeCleanAgent() {
  let calls = 0;
  return {
    name: 'mock-clean',
    get calls() { return calls; },
    async invoke({ prompt }) {
      calls++;
      return { output: 'clean', error: '', status: 0, tokens: null };
    },
    isPermanentError: () => false,
    isRetryableError: () => false,
  };
}

function makeBlockingAgent() {
  let calls = 0;
  return {
    name: 'mock-blocking',
    get calls() { return calls; },
    async invoke({ prompt }) {
      calls++;
      return { output: 'BLOCKING: still broken', error: '', status: 0, tokens: null };
    },
    isPermanentError: () => false,
    isRetryableError: () => false,
  };
}

// ─── Test 3: runPolishPass — none level ──────────────────────────────────────
console.log('\nTest 3: runPolishPass none-level');
{
  const agent = makeCleanAgent();
  const r = await runPolishPass('none', agent, []);
  assert(
    "none returns complete:true, no results",
    r.complete === true && r.results.length === 0 && r.polishIncomplete === false,
    `got: ${JSON.stringify(r)}`,
  );
  assert("none does not call agent", agent.calls === 0, `calls=${agent.calls}`);
}

// ─── Test 4: runPolishPass — light level, clean ─────────────────────────────
console.log('\nTest 4: runPolishPass light-level, clean output');
{
  const agent = makeCleanAgent();
  const r = await runPolishPass('light', agent, ['file.js']);
  assert("calls agent exactly once", agent.calls === 1, `calls=${agent.calls}`);
  assert("complete:true", r.complete === true, `got: ${JSON.stringify(r)}`);
  assert("polishIncomplete:false", r.polishIncomplete === false);
  assert("one result entry", r.results.length === 1);
  assert("result.ok === true", r.results[0].ok === true, `got: ${JSON.stringify(r.results[0])}`);
  assert("result.skill === simplify", r.results[0].skill === 'simplify');
}

// ─── Test 5: runPolishPass — standard level, always BLOCKING ────────────────
console.log('\nTest 5: runPolishPass standard-level, always blocking → retries then incomplete');
{
  const agent = makeBlockingAgent();
  const r = await runPolishPass('standard', agent, ['file.js']);
  // standard = 2 skills × (1 attempt + 1 retry) = 4 calls total
  assert(
    "agent called 4 times (2 skills × 2 attempts)",
    agent.calls === 4,
    `calls=${agent.calls}`,
  );
  assert("polishIncomplete:true", r.polishIncomplete === true, `got: ${JSON.stringify(r)}`);
  assert("complete:false", r.complete === false);
  assert(
    "first skill retried once (attempt:2 in last entry for simplify)",
    r.results.filter(x => x.skill === 'simplify').length === 2,
    `got: ${JSON.stringify(r.results.map(x => ({s: x.skill, a: x.attempt})))}`,
  );
  assert(
    "second skill retried once (2 entries for review)",
    r.results.filter(x => x.skill === 'review').length === 2,
  );
  assert(
    "every result has issues.blocking populated",
    r.results.every(x => x.issues && x.issues.blocking.length > 0),
  );
}

// ─── Test 6: skill-not-found → graceful skip ─────────────────────────────────
console.log('\nTest 6: missing skill prompt is handled gracefully');
{
  // Use an agent that would normally succeed, but we'll patch SKILL_PATHS via a
  // closure: replace one entry with a bogus path and call runPolishPass at light.
  const originalPath = SKILL_PATHS.simplify;
  SKILL_PATHS.simplify = 'skills/__does_not_exist__';
  try {
    const agent = makeCleanAgent();
    const r = await runPolishPass('light', agent, ['file.js']);
    assert("agent NOT called when skill missing", agent.calls === 0, `calls=${agent.calls}`);
    assert("polishIncomplete:true when skill missing", r.polishIncomplete === true);
    assert(
      "result records 'skill not found'",
      r.results.length === 1 && /not found/i.test(r.results[0].error || ''),
      `got: ${JSON.stringify(r.results)}`,
    );
  } finally {
    SKILL_PATHS.simplify = originalPath;
  }
}

// ─── Test 7: POLISH_LEVELS export shape ──────────────────────────────────────
console.log('\nTest 7: POLISH_LEVELS export shape');
{
  assert("POLISH_LEVELS has 4 levels", Object.keys(POLISH_LEVELS).length === 4);
  assert(
    "POLISH_LEVELS.full has all 4 skills",
    POLISH_LEVELS.full.skills.length === 4
      && POLISH_LEVELS.full.skills.includes('security-review')
      && POLISH_LEVELS.full.skills.includes('test'),
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
