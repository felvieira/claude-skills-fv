#!/usr/bin/env node
/**
 * test-logger.mjs — Smoke tests for scripts/auto-loop/logger.mjs
 *
 * Usage: node scripts/tests/auto-loop/test-logger.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { mkdtempSync, existsSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const modUrl = new URL('../../auto-loop/logger.mjs', import.meta.url);
const {
  log,
  logSection,
  openLog,
  logEvent,
  closeLog,
  serializeError,
  setTitle,
  restoreTitle,
} = await import(modUrl);

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

// ─── Test 1: openLog creates the file ────────────────────────────────────────
console.log('\nTest 1: openLog() creates .auto/runs/<runId>/debug.jsonl');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-logger-'));
  process.chdir(dir);
  try {
    const path = openLog('test-run');
    assert('returns a path', typeof path === 'string' && path.length > 0, `got ${path}`);
    assert('file exists after openLog', existsSync(path), `path=${path}`);
    assert(
      'path contains runId',
      path.includes('test-run') && path.endsWith('debug.jsonl'),
      `path=${path}`,
    );
    closeLog();
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 2: logEvent appends a parsable JSONL line ──────────────────────────
console.log('\nTest 2: logEvent() appends parseable JSONL with ISO ts + payload');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-logger-'));
  process.chdir(dir);
  try {
    const path = openLog('test-run');
    logEvent('foo', { bar: 1 });
    const content = readFileSync(path, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    assert('one line written', lines.length === 1, `got ${lines.length} lines`);

    const parsed = JSON.parse(lines[0]);
    assert('event is "foo"', parsed.event === 'foo', `got ${parsed.event}`);
    assert('payload.bar === 1', parsed.payload && parsed.payload.bar === 1, `got ${JSON.stringify(parsed.payload)}`);
    assert('runId is "test-run"', parsed.runId === 'test-run', `got ${parsed.runId}`);
    const tsValid = typeof parsed.ts === 'string' && !Number.isNaN(Date.parse(parsed.ts));
    assert('ts is valid ISO', tsValid, `got ${parsed.ts}`);

    // Second event appends another line
    logEvent('bar', { x: 'y' });
    const lines2 = readFileSync(path, 'utf-8').split('\n').filter(Boolean);
    assert('appends second event', lines2.length === 2, `got ${lines2.length}`);
    closeLog();
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 3: closeLog allows reopening ───────────────────────────────────────
console.log('\nTest 3: closeLog() clears state, allows reopening');
{
  const dir = mkdtempSync(join(tmpdir(), 'auto-loop-logger-'));
  process.chdir(dir);
  try {
    openLog('run-a');
    logEvent('e1');
    closeLog();

    // After closeLog, logEvent on no path is a no-op (does not throw)
    let threw = false;
    try { logEvent('orphan'); } catch { threw = true; }
    assert('logEvent after close is no-op', !threw);

    const pathB = openLog('run-b');
    logEvent('e2', { ok: true });
    const content = readFileSync(pathB, 'utf-8');
    const parsed = JSON.parse(content.split('\n').filter(Boolean)[0]);
    assert('reopen with new runId', parsed.runId === 'run-b', `got ${parsed.runId}`);
    assert('new file is separate', pathB.includes('run-b'), `got ${pathB}`);
    closeLog();
  } finally {
    process.chdir(originalCwd);
  }
}

// ─── Test 4: serializeError nested cause ─────────────────────────────────────
console.log('\nTest 4: serializeError() returns nested structure with .cause');
{
  const inner = new Error('inner');
  const outer = new Error('outer', { cause: inner });
  const ser = serializeError(outer);

  assert('outer.name === "Error"', ser.name === 'Error', `got ${ser.name}`);
  assert('outer.message === "outer"', ser.message === 'outer', `got ${ser.message}`);
  assert('outer.stack is string', typeof ser.stack === 'string');
  assert('cause exists', ser.cause && typeof ser.cause === 'object');
  assert('cause.message === "inner"', ser.cause && ser.cause.message === 'inner', `got ${ser.cause && ser.cause.message}`);

  // No cause → cause is undefined
  const lone = serializeError(new Error('lone'));
  assert('no-cause error has cause: undefined', lone.cause === undefined, `got ${lone.cause}`);

  // Depth cap: build a chain of 7 errors, ensure it terminates
  let chain = new Error('depth-7');
  for (let i = 6; i >= 0; i--) chain = new Error(`depth-${i}`, { cause: chain });
  const deep = serializeError(chain);
  let cur = deep;
  let depth = 0;
  while (cur && cur.cause) { cur = cur.cause; depth++; if (depth > 20) break; }
  assert('depth is capped (≤ 6 levels traversed)', depth <= 6, `got depth ${depth}`);
}

// ─── Test 5: setTitle / restoreTitle do not throw ────────────────────────────
console.log('\nTest 5: setTitle / restoreTitle do not throw');
{
  let threw = false;
  try {
    setTitle('hello');
    restoreTitle();
  } catch (e) {
    threw = true;
    console.error('  caught:', e);
  }
  assert('no throw', !threw);
}

// ─── Test 6: log / logSection do not throw ───────────────────────────────────
console.log('\nTest 6: log / logSection do not throw');
{
  // Silence console for this test by redirecting briefly
  const origLog = console.log;
  console.log = () => {};
  let threw = false;
  try {
    log('hello');
    log('hello', '*');
    logSection('section title');
  } catch {
    threw = true;
  } finally {
    console.log = origLog;
  }
  assert('no throw', !threw);
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
