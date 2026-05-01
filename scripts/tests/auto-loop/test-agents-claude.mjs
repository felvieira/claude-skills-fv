#!/usr/bin/env node
/**
 * test-agents-claude.mjs — Smoke tests for scripts/auto-loop/agents/claude.mjs
 *
 * Tests classification methods only. The `invoke()` path requires a real
 * `claude` CLI on PATH, which we cannot mock in plain ESM, so we limit
 * coverage to the pure helpers (isPermanentError, isRetryableError, name).
 *
 * Usage: node scripts/tests/auto-loop/test-agents-claude.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

const modUrl = new URL('../../auto-loop/agents/claude.mjs', import.meta.url);
const claude = (await import(modUrl)).default;

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

console.log('\nTest 1: adapter shape');
assert("name === 'claude'", claude.name === 'claude', `got ${claude.name}`);
assert('invoke is a function', typeof claude.invoke === 'function');
assert('isPermanentError is a function', typeof claude.isPermanentError === 'function');
assert('isRetryableError is a function', typeof claude.isRetryableError === 'function');

console.log('\nTest 2: isPermanentError');
assert("'low credits' → true", claude.isPermanentError('low credits') === true);
assert("'insufficient credits remaining' → true", claude.isPermanentError('insufficient credits remaining') === true);
assert("'authentication failed' → true", claude.isPermanentError('authentication failed') === true);
assert("'invalid api key' → true", claude.isPermanentError('invalid api key') === true);
assert("'spawn claude ENOENT' → true", claude.isPermanentError('spawn claude ENOENT') === true);
assert("'rate limit' → false", claude.isPermanentError('rate limit') === false);
assert("'' → false", claude.isPermanentError('') === false);
assert('null → false', claude.isPermanentError(null) === false);
assert('undefined → false', claude.isPermanentError(undefined) === false);

console.log('\nTest 3: isRetryableError');
assert("'rate limit exceeded' → true", claude.isRetryableError('rate limit exceeded') === true);
assert("'HTTP 429' → true", claude.isRetryableError('HTTP 429') === true);
assert("'503 Service Unavailable' → true", claude.isRetryableError('503 Service Unavailable') === true);
assert("'504 gateway timeout' → true", claude.isRetryableError('504 gateway timeout') === true);
assert("'ECONNRESET' → true", claude.isRetryableError('ECONNRESET') === true);
assert("'ETIMEDOUT' → true", claude.isRetryableError('ETIMEDOUT') === true);
assert("'fetch failed' → true", claude.isRetryableError('fetch failed') === true);
assert("'low credits' → false", claude.isRetryableError('low credits') === false);
assert("'random nonsense' → false", claude.isRetryableError('random nonsense') === false);
assert("'' → false", claude.isRetryableError('') === false);

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
