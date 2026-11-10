import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const root = resolve('.');
const hook = join(root, 'hooks/scripts/design-anchor-guard.mjs');
const dispatcher = join(root, 'hooks/scripts/runtime-dispatcher.mjs');
const checker = join(root, 'scripts/check-design-generic.mjs');
const contrast = join(root, 'scripts/check-contrast.mjs');
const bench = join(root, 'bench/ab/score-design.mjs');

async function fixture(t) {
  const base = resolve(tmpdir());
  const dir = await mkdtemp(join(base, 'design-signals-test-'));
  assert.equal(dirname(dir), base);
  assert.ok(basename(dir).startsWith('design-signals-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  return dir;
}

function runHook(cwd, text, file = 'screen.css') {
  const result = spawnSync(process.execPath, [hook], {
    cwd, encoding: 'utf8', input: JSON.stringify({ tool_name: 'Write', tool_input: { file_path: file, content: text } }),
    env: { ...process.env, DEVKIT_DISABLED_HOOKS: '', DEVKIT_HOOK_PROFILE: 'standard' },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('visual patterns produce contextual advice, never an automatic denial', async (t) => {
  const dir = await fixture(t);
  assert.deepEqual(runHook(dir, '.brand { color: #4f46e5; }'), { continue: true });
  const warning = runHook(dir, '.brand { color: #4f46e5; background: #000; font-family: system-ui; }');
  assert.equal(warning.hookSpecificOutput?.permissionDecision, undefined);
  assert.match(warning.hookSpecificOutput?.additionalContext ?? '', /não provam defeito nem autoria/);
  assert.deepEqual(runHook(dir, '.brand { color: #4f46e5; background: #000; }', 'notes.txt'), { continue: true });
});

test('the runtime dispatcher preserves the visual reminder without blocking', async (t) => {
  const dir = await fixture(t);
  const result = spawnSync(process.execPath, [dispatcher, 'PreToolUse'], {
    cwd: dir, encoding: 'utf8',
    input: JSON.stringify({ cwd: dir, tool_name: 'Write', tool_input: { file_path: 'screen.css', content: '.brand { color: #4f46e5; background: #000; }' } }),
    env: { ...process.env, DEVKIT_DISABLED_HOOKS: '', DEVKIT_HOOK_PROFILE: 'standard', DEVKIT_RUNTIME_PROFILE: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  const response = JSON.parse(result.stdout);
  assert.notEqual(response.continue, false);
  assert.notEqual(response.hookSpecificOutput?.permissionDecision, 'deny');
  assert.match(response.hookSpecificOutput?.additionalContext ?? '', /não provam defeito nem autoria/);
});

test('scanner reports clues by default and only fails on explicit strict mode', async (t) => {
  const dir = await fixture(t);
  const file = join(dir, 'brand.css');
  await writeFile(file, '.brand { color: #4f46e5; background: #000; font-family: system-ui; }');
  const normal = spawnSync(process.execPath, [checker, '--json', file], { encoding: 'utf8' });
  assert.equal(normal.status, 0, normal.stderr);
  const report = JSON.parse(normal.stdout);
  assert.equal(report.errors.length, 0);
  assert.ok(report.warns.length >= 3);
  assert.equal(spawnSync(process.execPath, [checker, '--strict', file]).status, 1);
  assert.equal(spawnSync(process.execPath, [checker, join(dir, 'missing.css')]).status, 1);
});

test('benchmark reports visual clues and does not invent a score without contrast pairs', async (t) => {
  const dir = await fixture(t);
  const arm = join(dir, 'arm');
  await mkdir(arm);
  await writeFile(join(arm, 'screen.tsx'), 'export const x = "bg-indigo-500";');
  const result = spawnSync(process.execPath, [bench, '--json', arm], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout).results[0];
  assert.equal(report.score, null);
  assert.equal(report.contrastPairs, 0);
  assert.ok(report.signals.includes('indigo-default'));
});

test('contrast checks secondary text conservatively and skips colors requiring compositing', async (t) => {
  const dir = await fixture(t);
  const file = join(dir, 'tokens.css');
  await writeFile(file, ':root { --bg: #ffffff; --muted: #888888; --placeholder: rgba(0,0,0,.1); --text-alpha: #00000033; }');
  const result = spawnSync(process.execPath, [contrast, '--json', file], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.pairs, 1);
  assert.equal(report.skippedTokens, 2);
  assert.equal(report.failures[0].text, '--muted');
  assert.equal(report.failures[0].required, 4.5);
});

test('benchmark percentage counts identified contrast pairs, not aesthetic signals', async (t) => {
  const dir = await fixture(t);
  const arm = join(dir, 'arm');
  await mkdir(arm);
  await writeFile(join(arm, 'tokens.css'), ':root { --bg: #ffffff; --text: #000000; --muted: #888888; --placeholder: rgb(0 0 0 / 0.5); }');
  const result = spawnSync(process.execPath, [bench, '--json', arm], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout).results[0];
  assert.equal(report.contrastPairs, 2);
  assert.equal(report.contrastFails, 1);
  assert.equal(report.contrastSkippedTokens, 1);
  assert.equal(report.score, 50);
});
