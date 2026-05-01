#!/usr/bin/env node
/**
 * test-agents-codex.mjs — Smoke tests for scripts/auto-loop/agents/codex.mjs
 *
 * Mirrors test-agents-claude.mjs: classification methods only.
 *
 * Usage: node scripts/tests/auto-loop/test-agents-codex.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

const modUrl = new URL('../../auto-loop/agents/codex.mjs', import.meta.url);
const codex = (await import(modUrl)).default;

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
assert("name === 'codex'", codex.name === 'codex', `got ${codex.name}`);
assert('invoke is a function', typeof codex.invoke === 'function');
assert('isPermanentError is a function', typeof codex.isPermanentError === 'function');
assert('isRetryableError is a function', typeof codex.isRetryableError === 'function');

console.log('\nTest 2: isPermanentError');
assert("'low credits' → true", codex.isPermanentError('low credits') === true);
assert("'insufficient credits' → true", codex.isPermanentError('insufficient credits') === true);
assert("'authentication failed' → true", codex.isPermanentError('authentication failed') === true);
assert("'Invalid API Key' → true", codex.isPermanentError('Invalid API Key') === true);
assert("'spawn codex ENOENT' → true", codex.isPermanentError('spawn codex ENOENT') === true);
assert("'rate limit' → false", codex.isPermanentError('rate limit') === false);
assert("'' → false", codex.isPermanentError('') === false);
assert('null → false', codex.isPermanentError(null) === false);

console.log('\nTest 3: isRetryableError');
assert("'rate limit hit' → true", codex.isRetryableError('rate limit hit') === true);
assert("'429 Too Many Requests' → true", codex.isRetryableError('429 Too Many Requests') === true);
assert("'503' → true", codex.isRetryableError('503') === true);
assert("'504' → true", codex.isRetryableError('504') === true);
assert("'ECONNRESET' → true", codex.isRetryableError('ECONNRESET') === true);
assert("'ETIMEDOUT' → true", codex.isRetryableError('ETIMEDOUT') === true);
assert("'fetch failed' → true", codex.isRetryableError('fetch failed') === true);
assert("'low credits' → false", codex.isRetryableError('low credits') === false);
assert("'something random' → false", codex.isRetryableError('something random') === false);
assert("'' → false", codex.isRetryableError('') === false);

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
