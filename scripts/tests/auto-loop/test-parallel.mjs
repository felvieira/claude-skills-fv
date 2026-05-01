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

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
