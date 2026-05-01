#!/usr/bin/env node
/**
 * run-all.mjs — auto-loop test runner.
 *
 * Runs all test-*.mjs files in this directory, aggregates results,
 * exits 0 on all-pass / 1 on any failure.
 */

import { readdirSync } from 'fs';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const testFiles = readdirSync(__dirname)
  .filter(f => f.startsWith('test-') && f.endsWith('.mjs'))
  .sort();

if (testFiles.length === 0) {
  console.log('No test files found in', __dirname);
  process.exit(0);
}

console.log(`Running ${testFiles.length} test file(s)...\n`);

let passed = 0;
let failed = 0;
const failures = [];

for (const file of testFiles) {
  const result = spawnSync('node', [join(__dirname, file)], {
    stdio: 'inherit',
    encoding: 'utf-8',
  });
  if (result.status === 0) {
    passed++;
  } else {
    failed++;
    failures.push(file);
  }
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`  Results: ${passed} passed, ${failed} failed`);
console.log(`${'═'.repeat(60)}`);

if (failures.length) {
  console.log('Failed:');
  for (const f of failures) console.log(`  ✗ ${f}`);
  process.exit(1);
}

process.exit(0);
