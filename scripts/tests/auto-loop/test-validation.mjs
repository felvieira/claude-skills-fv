#!/usr/bin/env node
/**
 * test-validation.mjs — Smoke tests for scripts/auto-loop/validation.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-validation.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const modUrl = new URL('../../auto-loop/validation.mjs', import.meta.url);
const { detectTools, runCommand, runValidation } = await import(modUrl);

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

// ─── Test 1: detectTools() in tmpdir with fake package.json ──────────────────
console.log('\nTest 1: detectTools() with fake package.json');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-validation-'));
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'fake',
      scripts: { test: 'vitest run', lint: 'eslint .', build: 'tsc' },
      devDependencies: { vitest: '^1.0.0' },
    }),
  );

  process.chdir(dir);
  try {
    const tools = detectTools();
    assert('manager is node (no lockfile)', tools.manager === 'node', `got ${tools.manager}`);
    assert('test detected (vitest override)', tools.test === 'npx vitest run', `got ${tools.test}`);
    assert('lint detected', tools.lint === 'npm run lint', `got ${tools.lint}`);
    assert('build detected', tools.build === 'npm run build', `got ${tools.build}`);
    assert('typecheck null (no script)', tools.typecheck === null, `got ${tools.typecheck}`);
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 2: detectTools() in empty tmpdir → all null ────────────────────────
console.log('\nTest 2: detectTools() in empty dir');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-validation-empty-'));
  process.chdir(dir);
  try {
    const tools = detectTools();
    assert('test null', tools.test === null);
    assert('lint null', tools.lint === null);
    assert('build null', tools.build === null);
    assert('manager fallback to node', tools.manager === 'node');
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 3: runCommand success ──────────────────────────────────────────────
console.log('\nTest 3: runCommand("echo hello")');
{
  const r = runCommand('echo hello', 5000);
  assert('ok=true', r.ok === true, `got ok=${r.ok}, error=${r.error}`);
  assert('output contains hello', String(r.output).includes('hello'), `got: ${r.output}`);
}

// ─── Test 4: runCommand failure ──────────────────────────────────────────────
console.log('\nTest 4: runCommand failing command');
{
  // Use a command that exits 1 cross-platform: node -e
  const r = runCommand('node -e "process.exit(1)"', 5000);
  assert('ok=false', r.ok === false, `got ok=${r.ok}`);
}

// ─── Test 5: runValidation with no tools → ok ────────────────────────────────
console.log('\nTest 5: runValidation with empty tools');
{
  const r = runValidation({ test: null, lint: null, typecheck: null, build: null, manager: 'node' }, 'final');
  assert('ok=true with no tools', r.ok === true);
  assert('results empty', Array.isArray(r.results) && r.results.length === 0);
}

// ─── Test 6: runValidation lint-only skips test ──────────────────────────────
console.log('\nTest 6: runValidation tier="lint-only" runs only lint');
{
  const tools = {
    test: 'node -e "process.exit(1)"', // would fail if run
    lint: 'echo lint-ok',
    typecheck: null,
    build: null,
    manager: 'node',
  };
  const r = runValidation(tools, 'lint-only');
  assert('ok=true', r.ok === true, `feedback: ${r.feedback}`);
  assert('only lint ran', r.results.length === 1 && r.results[0].name === 'lint');
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
