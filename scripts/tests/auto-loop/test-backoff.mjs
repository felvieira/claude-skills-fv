#!/usr/bin/env node
/**
 * test-backoff.mjs — Smoke tests for scripts/auto-loop/backoff.mjs
 *
 * Covers:
 *   - classify(text, adapter) → 'permanent' | 'retryable' | 'transient'
 *   - withBackoff: short-circuits on permanent
 *   - withBackoff: succeeds after retryable failures
 *   - withBackoff: throws after maxAttempts on always-retryable
 *
 * Sleep is injected so tests run instantly.
 *
 * Usage: node scripts/tests/auto-loop/test-backoff.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

const backoffUrl = new URL('../../auto-loop/backoff.mjs', import.meta.url);
const claudeUrl = new URL('../../auto-loop/agents/claude.mjs', import.meta.url);

const { classify, withBackoff } = await import(backoffUrl);
const claude = (await import(claudeUrl)).default;

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

// ─── Test 1: classify ────────────────────────────────────────────────────────
console.log('\nTest 1: classify()');
assert(
  "classify('low credits', claude) === 'permanent'",
  classify('low credits', claude) === 'permanent'
);
assert(
  "classify('rate limit', claude) === 'retryable'",
  classify('rate limit', claude) === 'retryable'
);
assert(
  "classify('agent said no', claude) === 'transient'",
  classify('agent said no', claude) === 'transient'
);
assert(
  "classify('', claude) === 'transient'",
  classify('', claude) === 'transient'
);
assert(
  "classify(null, claude) === 'transient'",
  classify(null, claude) === 'transient'
);

// ─── Test 2: withBackoff — permanent throws immediately ──────────────────────
console.log('\nTest 2: withBackoff() — permanent error short-circuits');
{
  let calls = 0;
  let sleepCalls = 0;
  let threw = false;
  try {
    await withBackoff(
      async () => {
        calls++;
        throw new Error('low credits — please top up');
      },
      claude,
      {
        sleep: async () => {
          sleepCalls++;
        },
      }
    );
  } catch (err) {
    threw = true;
    assert(
      'thrown error message preserved',
      /low credits/i.test(err.message),
      `got: ${err.message}`
    );
  }
  assert('threw', threw === true);
  assert(`called fn exactly once (got ${calls})`, calls === 1);
  assert(`never slept (got ${sleepCalls})`, sleepCalls === 0);
}

// ─── Test 3: withBackoff — succeeds on retry ─────────────────────────────────
console.log('\nTest 3: withBackoff() — retryable, succeeds on attempt 3');
{
  let calls = 0;
  let sleepCalls = 0;
  const result = await withBackoff(
    async () => {
      calls++;
      if (calls < 3) {
        throw new Error('rate limit — try again');
      }
      return 'ok';
    },
    claude,
    {
      sleep: async () => {
        sleepCalls++;
      },
    }
  );
  assert(`returned 'ok' (got ${result})`, result === 'ok');
  assert(`fn called 3 times (got ${calls})`, calls === 3);
  assert(`slept twice between attempts (got ${sleepCalls})`, sleepCalls === 2);
}

// ─── Test 4: withBackoff — exhausts on always-retryable ──────────────────────
console.log('\nTest 4: withBackoff() — always retryable throws after maxAttempts');
{
  let calls = 0;
  let sleepCalls = 0;
  let threw = false;
  try {
    await withBackoff(
      async () => {
        calls++;
        throw new Error('ECONNRESET on socket');
      },
      claude,
      {
        maxAttempts: 4,
        sleep: async () => {
          sleepCalls++;
        },
      }
    );
  } catch (err) {
    threw = true;
    assert(
      'wrapped error mentions Retry exhausted',
      /Retry exhausted/.test(err.message),
      `got: ${err.message}`
    );
    assert(
      'wrapped error preserves original via .cause',
      err.cause instanceof Error && /ECONNRESET/.test(err.cause.message)
    );
  }
  assert('threw', threw === true);
  assert(`fn called maxAttempts=4 times (got ${calls})`, calls === 4);
  // Slept between attempts 1→2, 2→3, 3→4 = 3 sleeps.
  assert(`slept 3 times between attempts (got ${sleepCalls})`, sleepCalls === 3);
}

// ─── Test 5: withBackoff — sleep delay grows exponentially & caps ────────────
console.log('\nTest 5: withBackoff() — exponential delays with cap');
{
  const delays = [];
  let calls = 0;
  let threw = false;
  try {
    await withBackoff(
      async () => {
        calls++;
        throw new Error('fetch failed');
      },
      claude,
      {
        maxAttempts: 5,
        baseMs: 1000,
        capMs: 4000,
        sleep: async (ms) => {
          delays.push(ms);
        },
      }
    );
  } catch {
    threw = true;
  }
  assert('threw after exhaustion', threw === true);
  // attempt 1 → base * 2^0 = 1000
  // attempt 2 → base * 2^1 = 2000
  // attempt 3 → base * 2^2 = 4000 (cap)
  // attempt 4 → base * 2^3 = 8000 → capped to 4000
  assert(
    `delays = [1000,2000,4000,4000] (got ${JSON.stringify(delays)})`,
    JSON.stringify(delays) === JSON.stringify([1000, 2000, 4000, 4000])
  );
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
