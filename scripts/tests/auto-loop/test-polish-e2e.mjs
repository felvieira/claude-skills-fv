#!/usr/bin/env node
/**
 * test-polish-e2e.mjs — End-to-end exercise of runPolishPass with a mock agent
 * that simulates the BLOCKING → clean retry path.
 *
 * Why: classifyIssues + retry-loop logic in runPolishPass is the heart of the
 * polish pass. A unit-level mock catches regressions in the retry budget,
 * issue-classification glue, and the result-shape contract consumers depend on.
 *
 * Usage: node scripts/tests/auto-loop/test-polish-e2e.mjs
 * Exit 0 = pass, Exit 1 = fail.
 *
 * Part of auto-loop v2 gap-fix Task 2.
 */

import { runPolishPass } from '../../auto-loop/polish.mjs';

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

/**
 * Mock agent that returns BLOCKING on the first invocation for each skill,
 * then clean output on subsequent invocations. Models the "retry fixes it"
 * happy path the polish pass is designed for.
 */
function makeRetryThenCleanAgent() {
  let calls = 0;
  // Track per-skill attempt count via the prompt: the retry prompt contains
  // the marker "# Polish Pass Retry:" so we can tell first-attempt from retry
  // without needing the caller to pass extra metadata.
  return {
    name: 'mock-retry-then-clean',
    get calls() { return calls; },
    async invoke({ prompt }) {
      calls++;
      const isRetry = /^#\s*Polish Pass Retry:/m.test(prompt || '');
      if (isRetry) {
        return { output: 'clean — fixed', error: '', status: 0, tokens: null };
      }
      return {
        output: 'BLOCKING: needs a fix\nNON_BLOCKING: nit',
        error: '',
        status: 0,
        tokens: null,
      };
    },
    isPermanentError: () => false,
    isRetryableError: () => false,
  };
}

console.log('Test: runPolishPass standard-level with BLOCKING-then-clean mock\n');

{
  const agent = makeRetryThenCleanAgent();
  const result = await runPolishPass('standard', agent, ['src/users.js']);

  // standard = ['simplify', 'review'] with retries: 1
  // each skill: attempt 1 (BLOCKING) → attempt 2 (clean) = 2 calls per skill
  // total: 2 skills × 2 attempts = 4 invocations
  assert(
    'agent called more than once (retry exercised)',
    agent.calls > 1,
    `calls=${agent.calls}`,
  );
  assert(
    'agent called exactly 4 times (2 skills × 2 attempts)',
    agent.calls === 4,
    `calls=${agent.calls}`,
  );

  assert(
    'result.complete === true',
    result.complete === true,
    `got: ${JSON.stringify({ complete: result.complete })}`,
  );
  assert(
    'result.polishIncomplete === false',
    result.polishIncomplete === false,
    `got: ${JSON.stringify({ polishIncomplete: result.polishIncomplete })}`,
  );

  assert(
    'results array length >= 2',
    Array.isArray(result.results) && result.results.length >= 2,
    `got ${result.results && result.results.length}`,
  );

  // Two skills × two attempts each → 4 entries
  assert(
    'results array length === 4 (entry per attempt per skill)',
    result.results.length === 4,
    `got ${result.results.length}: ${JSON.stringify(result.results.map(x => ({ s: x.skill, a: x.attempt, ok: x.ok })))}`,
  );

  const simplifyEntries = result.results.filter(r => r.skill === 'simplify');
  const reviewEntries = result.results.filter(r => r.skill === 'review');
  assert('simplify ran twice (retry)', simplifyEntries.length === 2);
  assert('review ran twice (retry)', reviewEntries.length === 2);

  // Final attempts should be ok (BLOCKING resolved on retry)
  const finalSimplify = simplifyEntries[simplifyEntries.length - 1];
  const finalReview = reviewEntries[reviewEntries.length - 1];
  assert(
    'final simplify attempt ok=true (clean on retry)',
    finalSimplify && finalSimplify.ok === true,
    `got: ${JSON.stringify(finalSimplify)}`,
  );
  assert(
    'final review attempt ok=true (clean on retry)',
    finalReview && finalReview.ok === true,
    `got: ${JSON.stringify(finalReview)}`,
  );

  // First attempts should classify the BLOCKING issue
  const firstSimplify = simplifyEntries[0];
  assert(
    'first simplify attempt has BLOCKING in issues',
    firstSimplify && firstSimplify.issues && firstSimplify.issues.blocking.length > 0,
    `got: ${JSON.stringify(firstSimplify && firstSimplify.issues)}`,
  );
  assert(
    'first simplify attempt has NON_BLOCKING in issues',
    firstSimplify && firstSimplify.issues && firstSimplify.issues.nonBlocking.length > 0,
    `got: ${JSON.stringify(firstSimplify && firstSimplify.issues)}`,
  );
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
process.exit(0);
