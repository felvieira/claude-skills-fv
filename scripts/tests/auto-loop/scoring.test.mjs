#!/usr/bin/env node
/**
 * scoring.test.mjs — unit tests for iteration scoring module.
 */

import assert from 'assert';
import { iterationScore, shouldStall } from '../../auto-loop/scoring.mjs';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}: ${err.message}`);
    failed++;
  }
}

// Test 1: good progress → score > 0.7
test('good progress → score > 0.7', () => {
  const score = iterationScore({ diffLines: 10, testsDelta: 2 });
  assert.ok(score > 0.7, `Expected score > 0.7, got ${score}`);
});

// Test 2: permanent error + regression → score < 0.2
test('permanent error + regression → score < 0.2', () => {
  const score = iterationScore({ diffLines: 0, testsDelta: -1, errorClass: 'permanent' });
  assert.ok(score < 0.2, `Expected score < 0.2, got ${score}`);
});

// Test 3: shouldStall with 3 low scores → true
test('shouldStall with 3 low scores → true', () => {
  const result = shouldStall([0.2, 0.1, 0.15]);
  assert.strictEqual(result, true, `Expected true, got ${result}`);
});

// Test 4: shouldStall with recovery → false
test('shouldStall with recovery → false', () => {
  const result = shouldStall([0.2, 0.1, 0.8]);
  assert.strictEqual(result, false, `Expected false, got ${result}`);
});

// Test 5: shouldStall window not reached → false
test('shouldStall window not reached → false', () => {
  const result = shouldStall([0.2, 0.1]);
  assert.strictEqual(result, false, `Expected false, got ${result}`);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
