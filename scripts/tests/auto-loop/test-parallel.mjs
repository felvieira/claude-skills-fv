#!/usr/bin/env node
/**
 * test-parallel.mjs — Smoke tests for scripts/auto-loop/parallel.mjs
 *
 * Covers:
 *   - buildChildArgs(): correct flag pass-through.
 *   - formatSummary(): table includes all rows + headers.
 *   - runParallel(): aggregates output, prefixes lines, returns max exit code,
 *     using an injected mock spawner (no real child processes).
 *
 * Usage: node scripts/tests/auto-loop/test-parallel.mjs
 * Exit 0 = all passed, Exit 1 = failures.
 */

import { EventEmitter } from 'events';

const url = new URL('../../auto-loop/parallel.mjs', import.meta.url);
const { runParallel, buildChildArgs, formatSummary } = await import(url);

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

// ─── Test 1: buildChildArgs — defaults ───────────────────────────────────────
console.log('\nTest 1: buildChildArgs() with defaults');
{
  const args = buildChildArgs(
    { agent: 'claude', model: 'claude-sonnet-4-5', polish: 'standard', preventSleep: true },
    'do something'
  );
  assert('first arg ends with index.mjs', /index\.mjs$/.test(args[0]), `got: ${args[0]}`);
  assert('includes --worktree', args.includes('--worktree'));
  assert('includes task', args.includes('do something'));
  assert('omits default agent flag', !args.includes('--agent'),
    `got: ${JSON.stringify(args)}`);
  assert('omits default model flag', !args.includes('--model'));
  assert('omits default polish flag', !args.includes('--polish'));
  assert('omits --contract when not set', !args.includes('--contract'));
  assert('omits --no-prevent-sleep when preventSleep=true', !args.includes('--no-prevent-sleep'));
}

// ─── Test 2: buildChildArgs — non-default flags pass through ─────────────────
console.log('\nTest 2: buildChildArgs() with custom flags');
{
  const args = buildChildArgs(
    {
      agent: 'codex',
      model: 'gpt-5',
      polish: 'full',
      maxIterations: 10,
      maxTokens: 5000,
      stopWhen: 'tests pass',
      contract: '/tmp/contract.json',
      validate: true,
      noCommit: true,
      push: true,
      verbose: true,
      preventSleep: false,
    },
    'task X'
  );
  assert('passes --agent codex', args.includes('--agent') && args[args.indexOf('--agent') + 1] === 'codex');
  assert('passes --model gpt-5', args.includes('--model') && args[args.indexOf('--model') + 1] === 'gpt-5');
  assert('passes --polish full', args.includes('--polish') && args[args.indexOf('--polish') + 1] === 'full');
  assert('passes --max-iterations 10', args.includes('--max-iterations') && args[args.indexOf('--max-iterations') + 1] === '10');
  assert('passes --max-tokens 5000', args.includes('--max-tokens') && args[args.indexOf('--max-tokens') + 1] === '5000');
  assert('passes --stop-when value', args.includes('--stop-when') && args[args.indexOf('--stop-when') + 1] === 'tests pass');
  assert('passes --contract value', args.includes('--contract') && args[args.indexOf('--contract') + 1] === '/tmp/contract.json');
  assert('passes --validate', args.includes('--validate'));
  assert('passes --no-commit', args.includes('--no-commit'));
  assert('passes --push', args.includes('--push'));
  assert('passes --verbose', args.includes('--verbose'));
  assert('passes --no-prevent-sleep', args.includes('--no-prevent-sleep'));
}

// ─── Test 3: formatSummary ───────────────────────────────────────────────────
console.log('\nTest 3: formatSummary()');
{
  const out = formatSummary([
    { slug: 'task-a', exitCode: 0, iterations: 3, commits: 1, path: '/tmp/wt/task-a' },
    { slug: 'task-b', exitCode: 4, iterations: 5, commits: 0, path: '/tmp/wt/task-b' },
  ]);
  assert('contains slug header', /\bslug\b/.test(out));
  assert('contains task-a row', out.includes('task-a'));
  assert('contains FAIL(4) for task-b', out.includes('FAIL(4)'),
    `got: ${out}`);
  assert('contains OK for task-a', /\bOK\b/.test(out));
}

// ─── Test 4: runParallel — aggregates output, returns max exit code ──────────
console.log('\nTest 4: runParallel() with mock spawner');
{
  const stdoutBuf = [];
  const stderrBuf = [];
  const fakeStdout = { write: (s) => stdoutBuf.push(s) };
  const fakeStderr = { write: (s) => stderrBuf.push(s) };

  // Mock spawner returns an EventEmitter-like child with stdout/stderr streams
  // and emits a 'close' event with a configurable exit code.
  let spawnedCount = 0;
  const exitCodesByTask = ['ok task one', 'fail task two', 'ok task three'];
  const codeForTask = (task) => (task.includes('fail') ? 3 : 0);

  function makeStream() {
    const s = new EventEmitter();
    s.setEncoding = () => {};
    return s;
  }

  function mockSpawn(_node, args /*, _opts */) {
    spawnedCount++;
    const child = new EventEmitter();
    child.stdout = makeStream();
    child.stderr = makeStream();
    // The task is the arg right after --worktree.
    const wIdx = args.indexOf('--worktree');
    const task = args[wIdx + 1] || '';
    const code = codeForTask(task);
    // Emit data + close on next tick.
    setImmediate(() => {
      child.stdout.emit('data', `running ${task}\n`);
      if (code !== 0) child.stderr.emit('data', `boom ${task}\n`);
      child.emit('close', code);
    });
    return child;
  }

  const { exitCode, results } = await runParallel({
    tasks: exitCodesByTask,
    parallel: 3,
    worktree: true,
    agent: 'claude',
    model: 'claude-sonnet-4-5',
    polish: 'standard',
    preventSleep: true,
    _spawn: mockSpawn,
    _stdout: fakeStdout,
    _stderr: fakeStderr,
  });

  assert(`spawned 3 children (got ${spawnedCount})`, spawnedCount === 3);
  assert(`results length 3 (got ${results.length})`, results.length === 3);
  assert(`exitCode = max = 3 (got ${exitCode})`, exitCode === 3);
  assert(
    'results contain failing task with exitCode 3',
    results.some((r) => r.exitCode === 3)
  );
  assert(
    'results contain succeeding tasks with exitCode 0',
    results.filter((r) => r.exitCode === 0).length === 2
  );

  const allOut = stdoutBuf.join('');
  const allErr = stderrBuf.join('');
  assert('stdout contains prefixed task output',
    /\[ok-task-one\] running/.test(allOut),
    `got stdout: ${allOut.slice(0, 300)}`);
  assert('stderr contains prefixed failure output',
    /\[fail-task-two\] boom/.test(allErr),
    `got stderr: ${allErr.slice(0, 300)}`);
  assert('summary table emitted', allOut.includes('Summary:'));
  assert('summary contains FAIL(3)', allOut.includes('FAIL(3)'));
}

// ─── Test 4b: escalation is not a failure ────────────────────────────────────
console.log('\nTest 4b: ESCALATED is labelled and ranked apart from failures');
{
  const out = formatSummary([
    { slug: 'ok-task', exitCode: 0, iterations: 2, commits: 1, path: '/tmp/a' },
    { slug: 'escalated-task', exitCode: 8, iterations: 3, commits: 0, path: '/tmp/b' },
    { slug: 'broken-task', exitCode: 2, iterations: 1, commits: 0, path: '/tmp/c' },
  ]);
  assert('escalated row says ESCALATED, not FAIL(8)', out.includes('ESCALATED') && !out.includes('FAIL(8)'), out);
  assert('real failure still says FAIL(2)', out.includes('FAIL(2)'), out);

  // A task waiting on a human must not mask a task that actually crashed.
  const stdoutBuf = [];
  function makeStream() {
    const s = new EventEmitter();
    s.setEncoding = () => {};
    return s;
  }
  // First task escalates (8), second fails for real (2). Naive Math.max would
  // surface 8 and hide the crash.
  function mockSpawn(_node, args) {
    const child = new EventEmitter();
    child.stdout = makeStream();
    child.stderr = makeStream();
    const wIdx = args.indexOf('--worktree');
    const task = args[wIdx + 1] || '';
    setImmediate(() => child.emit('close', task.includes('escalate') ? 8 : 2));
    return child;
  }
  const { exitCode } = await runParallel({
    tasks: ['escalate this one', 'crash this one'],
    parallel: 2,
    worktree: true,
    agent: 'claude',
    model: 'claude-sonnet-4-5',
    polish: 'standard',
    preventSleep: true,
    _spawn: mockSpawn,
    _stdout: { write: (s) => stdoutBuf.push(s) },
    _stderr: { write: () => {} },
  });
  assert(`real failure outranks escalation (got ${exitCode})`, exitCode === 2);

  // And with only escalations, the escalation code survives.
  function mockAllEscalate(_node, _args) {
    const child = new EventEmitter();
    child.stdout = makeStream();
    child.stderr = makeStream();
    setImmediate(() => child.emit('close', 8));
    return child;
  }
  const onlyEscalations = await runParallel({
    tasks: ['a', 'b'],
    parallel: 2,
    worktree: true,
    agent: 'claude',
    model: 'claude-sonnet-4-5',
    polish: 'standard',
    preventSleep: true,
    _spawn: mockAllEscalate,
    _stdout: { write: () => {} },
    _stderr: { write: () => {} },
  });
  assert(`all-escalated returns 8 (got ${onlyEscalations.exitCode})`, onlyEscalations.exitCode === 8);
}

// ─── Test 5: runParallel — rejects when --worktree missing ───────────────────
console.log('\nTest 5: runParallel() rejects without --worktree');
{
  let threw = false;
  try {
    await runParallel({ tasks: ['x'], parallel: 1, worktree: false });
  } catch (err) {
    threw = true;
    assert('error mentions --worktree', /worktree/i.test(err.message), err.message);
  }
  assert('threw without worktree', threw);
}

// ─── Test 6: runParallel — empty task list throws ────────────────────────────
console.log('\nTest 6: runParallel() rejects empty tasks');
{
  let threw = false;
  try {
    await runParallel({ tasks: [], parallel: 0, worktree: true });
  } catch (err) {
    threw = true;
    assert('error mentions tasks', /tasks/i.test(err.message), err.message);
  }
  assert('threw on empty tasks', threw);
}

// ─── Test 7: runParallel — populates iterations/commits/path from status.json ─
console.log('\nTest 7: runParallel() reads status.json from each child worktree');
{
  // We need a real filesystem: create a temp baseRepo + the worktree layout
  // the parallel runner expects, and drop a status.json the parent will read.
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = await import('fs');
  const { tmpdir } = await import('os');
  const { join, resolve } = await import('path');

  const tmp = mkdtempSync(join(tmpdir(), 'al-par-status-'));
  const baseRepo = resolve(tmp, 'repo');
  const wtBase = resolve(tmp, 'repo-auto-worktrees');
  mkdirSync(baseRepo, { recursive: true });

  // Match the slug runParallel will compute via slugify(task).
  const slug = 'feature-x-with-status';
  const wtPath = resolve(wtBase, slug);
  const runId = '2026-04-30T10-00-00-000Z-abc1';
  const runDir = resolve(wtPath, '.auto', 'runs', runId);
  mkdirSync(runDir, { recursive: true });

  writeFileSync(resolve(runDir, 'status.json'), JSON.stringify({
    runId,
    task: 'feature x with status',
    iterations: 4,
    commits: 1,
    commitHash: 'abc1234',
    taskDone: true,
    worktreePath: wtPath,
    exitCode: 0,
  }));

  // Mock spawner closes immediately so the parent reads the prepared file.
  function mockSpawnStatus(_node, _args) {
    const child = new EventEmitter();
    child.stdout = makeStreamLocal();
    child.stderr = makeStreamLocal();
    setImmediate(() => child.emit('close', 0));
    return child;
  }
  function makeStreamLocal() {
    const s = new EventEmitter();
    s.setEncoding = () => {};
    return s;
  }

  const stdoutBuf = [];
  const stderrBuf = [];
  const { results } = await runParallel({
    tasks: ['feature x with status'],
    parallel: 1,
    worktree: true,
    agent: 'claude',
    model: 'claude-sonnet-4-5',
    polish: 'standard',
    preventSleep: true,
    cwd: baseRepo, // <-- parallel.mjs uses opts.cwd to compute worktree base
    _spawn: mockSpawnStatus,
    _stdout: { write: (s) => stdoutBuf.push(s) },
    _stderr: { write: (s) => stderrBuf.push(s) },
  });

  assert('result exists', results.length === 1);
  assert(`iterations populated (got ${results[0].iterations})`, results[0].iterations === 4);
  assert(`commits populated (got ${results[0].commits})`, results[0].commits === 1);
  assert(`path populated (got ${results[0].path})`, results[0].path === wtPath);

  // Cleanup best-effort.
  try { rmSync(tmp, { recursive: true, force: true, maxRetries: 3 }); } catch {}
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
