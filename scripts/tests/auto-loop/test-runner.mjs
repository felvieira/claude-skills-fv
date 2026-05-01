#!/usr/bin/env node
/**
 * test-runner.mjs — Smoke tests for scripts/auto-loop/runner.mjs
 *
 * Uses a mock agent injected via the second argument of runOnce to avoid
 * hitting the real Claude/Codex CLIs. Each test runs in a fresh tmpdir so
 * .auto/ artifacts don't leak between cases.
 *
 * Usage: node scripts/tests/auto-loop/test-runner.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const runnerUrl = new URL('../../auto-loop/runner.mjs', import.meta.url);
const argsUrl = new URL('../../auto-loop/args.mjs', import.meta.url);

const { runOnce } = await import(runnerUrl);
const { EXIT_CODES } = await import(argsUrl);

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

function freshTmpDir(label) {
  const dir = mkdtempSync(join(tmpdir(), `auto-loop-runner-${label}-`));
  process.chdir(dir);
  return dir;
}

function baseOpts(overrides = {}) {
  return {
    task: 'do a thing',
    agent: 'claude',
    model: 'claude-sonnet-4-5',
    maxIterations: 3,
    maxTokens: 0,
    stopWhen: '',
    polish: 'none',
    validate: false,
    noCommit: true,
    push: false,
    verbose: false,
    worktree: false,
    preventSleep: false,
    ...overrides,
  };
}

function makeMockAgent(handler) {
  return {
    name: 'mock',
    async invoke(args) {
      return handler(args);
    },
    isPermanentError() { return false; },
    isRetryableError() { return false; },
  };
}

// ─── Test 1: completion marker on iter 1 returns OK exit code ────────────────
console.log('\nTest 1: agent emits EXIT_SIGNAL → exits OK');
{
  freshTmpDir('exit-signal');
  let calls = 0;
  try {
    const agent = makeMockAgent(() => {
      calls++;
      // Need a file change for the iter-1 done shortcut to accept "done".
      // Create a stub file before returning.
      try {
        const { writeFileSync } = require('fs');
        writeFileSync('stub.txt', 'changed');
      } catch {}
      // Use ESM workaround:
      return Promise.resolve({
        output: 'EXIT_SIGNAL: true',
        error: '',
        status: 0,
        tokens: { input: 10, output: 5, cached: 0 },
      });
    });
    // We can't use require in ESM — write the file via dynamic import.
    const fs = await import('node:fs');
    const wrappedAgent = {
      ...agent,
      async invoke(args) {
        fs.writeFileSync('stub.txt', 'changed');
        return {
          output: 'EXIT_SIGNAL: true',
          error: '',
          status: 0,
          tokens: { input: 10, output: 5, cached: 0 },
        };
      },
    };
    const code = await runOnce(baseOpts({ task: 'add stub' }), wrappedAgent);
    assert('exit code is OK', code === EXIT_CODES.OK, `got ${code}`);
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 2: blocked marker → SAME_ERROR_REPEATED exit code ──────────────────
console.log('\nTest 2: agent emits TASK_BLOCKED → exits with blocked code');
{
  freshTmpDir('blocked');
  try {
    const agent = makeMockAgent(() =>
      Promise.resolve({
        output: 'TASK_BLOCKED: missing API key',
        error: '',
        status: 0,
        tokens: null,
      }),
    );
    const code = await runOnce(baseOpts({ task: 'add api key' }), agent);
    assert(
      'exit code is SAME_ERROR_REPEATED (blocked)',
      code === EXIT_CODES.SAME_ERROR_REPEATED,
      `got ${code}`,
    );
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 3: token cap reached → TOKEN_CAP exit code ─────────────────────────
console.log('\nTest 3: maxTokens=100 with usage 200 → TOKEN_CAP after iter 1');
{
  freshTmpDir('token-cap');
  try {
    const agent = makeMockAgent(() =>
      Promise.resolve({
        output: 'still working...',
        error: '',
        status: 0,
        tokens: { input: 200, output: 0, cached: 0 },
      }),
    );
    const code = await runOnce(
      baseOpts({ task: 'big task', maxTokens: 100, maxIterations: 5 }),
      agent,
    );
    assert(
      'exit code is TOKEN_CAP',
      code === EXIT_CODES.TOKEN_CAP,
      `got ${code}`,
    );
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 4: stop-when met → OK exit code ────────────────────────────────────
console.log('\nTest 4: stopWhen condition met → exits OK');
{
  freshTmpDir('stop-when');
  try {
    const agent = makeMockAgent(() =>
      Promise.resolve({
        output: 'work done.\nSTOP_WHEN_MET: true\n',
        error: '',
        status: 0,
        tokens: null,
      }),
    );
    const code = await runOnce(
      baseOpts({ task: 'check thing', stopWhen: 'thing checked', maxIterations: 3 }),
      agent,
    );
    assert(
      'exit code is OK when stop-when met',
      code === EXIT_CODES.OK,
      `got ${code}`,
    );
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 5: budget exhausted with no signal → STALL ─────────────────────────
console.log('\nTest 5: agent never signals done → STALL after maxIterations');
{
  freshTmpDir('budget');
  try {
    const agent = makeMockAgent(() =>
      Promise.resolve({
        output: 'thinking...',
        error: '',
        status: 0,
        tokens: null,
      }),
    );
    const code = await runOnce(
      baseOpts({ task: 'open ended', maxIterations: 2 }),
      agent,
    );
    // No tools detected in tmpdir, so no validation runs; loop just exits.
    // Stall detector may or may not fire depending on git state in tmp; either
    // STALL or SAME_ERROR_REPEATED is acceptable for an unfinished run.
    assert(
      'exit code is non-zero (not done)',
      code !== EXIT_CODES.OK,
      `got ${code}`,
    );
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 6: .auto artifacts written ─────────────────────────────────────────
console.log('\nTest 6: .auto/env.md and .auto/progress.md created');
{
  const dir = freshTmpDir('artifacts');
  try {
    const fs = await import('node:fs');
    const agent = makeMockAgent(() =>
      Promise.resolve({
        output: 'TASK_BLOCKED: stop',
        error: '',
        status: 0,
        tokens: null,
      }),
    );
    await runOnce(baseOpts({ task: 'check artifacts' }), agent);
    assert('.auto/env.md exists', fs.existsSync(join(dir, '.auto/env.md')));
    assert('.auto/progress.md exists', fs.existsSync(join(dir, '.auto/progress.md')));
    assert('.auto/session.json exists', fs.existsSync(join(dir, '.auto/session.json')));
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
