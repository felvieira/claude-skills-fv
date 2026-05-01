#!/usr/bin/env node
/**
 * test-session.mjs — Smoke tests for scripts/auto-loop/session.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-session.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const modUrl = new URL('../../auto-loop/session.mjs', import.meta.url);
const { saveSession, loadSession, compareSession, resolvePromptConflict, _setPrompter } =
  await import(modUrl);

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

// ─── Test 1: save then load round-trips data ─────────────────────────────────
console.log('\nTest 1: saveSession / loadSession round-trip');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-session-'));
  process.chdir(dir);
  try {
    const data = {
      prompt: 'do the thing',
      agent: 'general',
      model: 'opus',
      maxTokens: 4000,
      stopWhen: 'tests-pass',
      polish: true,
      runId: 'r-123',
      branch: 'feature/x',
      iteration: 4,
      taskDone: false,
      taskBlocked: false,
      lastError: null,
      polishIncomplete: false,
    };
    saveSession(data);
    const loaded = loadSession();
    assert('loaded not null', loaded !== null);
    assert('prompt preserved', loaded.prompt === data.prompt, `got ${loaded.prompt}`);
    assert('agent preserved', loaded.agent === data.agent);
    assert('iteration preserved', loaded.iteration === 4);
    assert('runId preserved', loaded.runId === 'r-123');
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 2: loadSession returns null when missing ───────────────────────────
console.log('\nTest 2: loadSession returns null when file missing');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-session-empty-'));
  process.chdir(dir);
  try {
    const loaded = loadSession();
    assert('null on missing file', loaded === null, `got ${JSON.stringify(loaded)}`);
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 3: compareSession detects prompt diff ──────────────────────────────
console.log('\nTest 3: compareSession detects prompt diff');
{
  const a = { prompt: 'old', agent: 'g', model: 'm', maxTokens: 1, stopWhen: 's', polish: false };
  const b = { prompt: 'new', agent: 'g', model: 'm', maxTokens: 1, stopWhen: 's', polish: false };
  const diffs = compareSession(a, b);
  assert('diffs is array', Array.isArray(diffs));
  assert('contains prompt', diffs.includes('prompt'), `got ${JSON.stringify(diffs)}`);
  assert('only prompt differs', diffs.length === 1, `got ${JSON.stringify(diffs)}`);
}

// ─── Test 4: compareSession detects multiple diffs ───────────────────────────
console.log('\nTest 4: compareSession detects multi-field diff');
{
  const a = { prompt: 'p', agent: 'a1', model: 'm1', maxTokens: 100, stopWhen: 's', polish: false };
  const b = { prompt: 'p', agent: 'a2', model: 'm2', maxTokens: 100, stopWhen: 's', polish: true };
  const diffs = compareSession(a, b);
  assert('contains agent', diffs.includes('agent'));
  assert('contains model', diffs.includes('model'));
  assert('contains polish', diffs.includes('polish'));
  assert('does not contain prompt', !diffs.includes('prompt'));
}

// ─── Test 5: resolvePromptConflict with injected prompter → 'continue' ───────
console.log('\nTest 5: resolvePromptConflict via _setPrompter returns continue');
{
  _setPrompter(() => 'c');
  try {
    const result = await resolvePromptConflict({ prompt: 'old' }, { prompt: 'new' });
    assert('returns continue', result === 'continue', `got ${result}`);
  } finally {
    _setPrompter(null);
  }
}

// ─── Test 6: resolvePromptConflict 'n' → 'new-branch' ────────────────────────
console.log('\nTest 6: resolvePromptConflict via _setPrompter returns new-branch');
{
  _setPrompter(() => 'n');
  try {
    const result = await resolvePromptConflict({ prompt: 'old' }, { prompt: 'new' });
    assert('returns new-branch', result === 'new-branch', `got ${result}`);
  } finally {
    _setPrompter(null);
  }
}

// ─── Test 7: resolvePromptConflict default → 'quit' ──────────────────────────
console.log('\nTest 7: resolvePromptConflict unknown answer returns quit');
{
  _setPrompter(() => 'whatever');
  try {
    const result = await resolvePromptConflict({ prompt: 'old' }, { prompt: 'new' });
    assert('returns quit', result === 'quit', `got ${result}`);
  } finally {
    _setPrompter(null);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
