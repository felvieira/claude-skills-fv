import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { buildReport, parseArgs, renderMarkdown } from '../code-quality-report.mjs';

const cli = resolve('scripts/code-quality-report.mjs');
const measurement = (extra = {}) => ({ status: 'measured', revision: 'r1', evidence: 'artifacts/measured.json', ...extra });
const entry = (extra = {}) => ({
  file: 'src/orders.ts', line: 12, name: 'confirmOrder',
  complexity: measurement({ value: 6 }),
  coverage: measurement({ covered: 9, total: 10, kind: 'branch' }), ...extra,
});
const input = (extra = {}) => ({ schema_version: 1, scope: 'Synthetic test', revision: 'r1', synthetic: true, functions: [entry()], ...extra });
const mutation = (extra = {}) => measurement({
  baseline: 'passed',
  counts: { killed: 3, survived: 1, uncovered: 1, timeout: 2, invalid: 3, equivalent: 1, error: 1 },
  triageEvidence: 'artifacts/equivalent-review.md', ...extra,
});

test('CRAP uses function coverage and distinguishes zero coverage from missing data', () => {
  const normal = buildReport(input());
  assert.equal(normal.functions[0].crap, 6.04);
  assert.equal(normal.evidenceValidation, 'declared-only');
  assert.equal(buildReport(input({ functions: [entry({ complexity: measurement({ value: 10 }), coverage: measurement({ covered: 0, total: 10, kind: 'line' }) })] })).functions[0].crap, 110);
  assert.equal(buildReport(input({ functions: [entry({ coverage: undefined })] })).functions[0].crap, null);
  assert.equal(buildReport(input({ functions: [entry({ coverage: measurement({ covered: 10, total: 10, kind: 'branch' }) })] })).functions[0].crap, 6);
});

test('stale revisions, failed collection and empty samples never produce a score', () => {
  for (const [coverage, state] of [
    [measurement({ revision: 'old', covered: 1, total: 1, kind: 'line' }), 'stale'],
    [{ status: 'failed', reason: 'Test runner unavailable' }, 'failed'],
    [measurement({ covered: 0, total: 0, kind: 'branch' }), 'no-samples'],
  ]) {
    const row = buildReport(input({ functions: [entry({ coverage })] })).functions[0];
    assert.equal(row.status, state);
    assert.equal(row.crap, null);
  }
  assert.equal(buildReport(input({ functions: [] })).summary.functionsWithCrap, 0);
});

test('mutation denominator excludes uncovered, equivalent, invalid, timeout and infrastructure errors', () => {
  const report = buildReport(input({ mutation: mutation() })).mutation;
  assert.equal(report.detectionPercent, 75);
  assert.equal(report.denominator, 4);
  assert.equal(report.complete, false);
  assert.equal(report.counts.timeout, 2);
  assert.equal(report.counts.invalid, 3);
  assert.equal(report.counts.uncovered, 1);
  assert.throws(() => buildReport(input({ mutation: mutation({ triageEvidence: undefined }) })), /triageEvidence/);
});

test('a failed or missing baseline and stale mutation results cannot claim detection', () => {
  for (const value of [mutation({ baseline: 'failed' }), mutation({ baseline: 'not-run' }), mutation({ revision: 'old' })]) {
    const report = buildReport(input({ mutation: value })).mutation;
    assert.equal(report.detectionPercent, null);
    assert.equal(report.complete, false);
  }
  const empty = mutation({ counts: { killed: 0, survived: 0, uncovered: 0, timeout: 0, invalid: 0, equivalent: 0, error: 0 } });
  assert.equal(buildReport(input({ mutation: empty })).mutation.detectionPercent, null);
  assert.equal(buildReport(input()).mutation.detectionPercent, null);
});

test('a completed mutation scope with survivors is reported without approval', () => {
  const value = mutation({ counts: { killed: 3, survived: 1, uncovered: 0, timeout: 0, invalid: 0, equivalent: 0, error: 0 } });
  const report = buildReport(input({ mutation: value }));
  assert.equal(report.mutation.complete, true);
  assert.equal(report.mutation.detectionPercent, 75);
  assert.equal(report.approved, undefined);
});

test('similarity creates candidates and stale findings stay outside the current candidate count', () => {
  const candidate = { left: { file: 'a.ts', line: 1 }, right: { file: 'b.ts', line: 2 }, similarity: 1, revision: 'r1', status: 'candidate', evidence: 'duplicates.json' };
  const report = buildReport(input({ duplications: [candidate, { ...candidate, revision: 'old' }] }));
  assert.equal(report.duplications[0].status, 'candidate');
  assert.equal(report.duplications[1].dataStatus, 'stale');
  assert.equal(report.summary.duplicationCandidates, 1);
  assert.throws(() => buildReport(input({ duplications: [{ ...candidate, status: 'justified' }] })), /reason/);
});

test('invalid counts, ratios, repeated functions and incomplete schemas fail clearly', () => {
  for (const bad of [
    input({ schema_version: 2 }), input({ synthetic: undefined }),
    input({ functions: [entry(), entry()] }),
    input({ functions: [entry({ complexity: measurement({ value: -1 }) })] }),
    input({ functions: [entry({ coverage: measurement({ covered: 11, total: 10, kind: 'branch' }) })] }),
    input({ functions: [entry({ coverage: measurement({ covered: 1, total: 1, kind: 'unknown' }) })] }),
    input({ functions: [entry({ complexity: { status: 'measured', value: 5 } })] }),
    input({ mutation: mutation({ counts: { killed: 3 } }) }),
  ]) assert.throws(() => buildReport(bad));
});

test('arguments reject duplicate options and unknown flags', () => {
  assert.deepEqual(parseArgs(['--help']), { help: true });
  assert.deepEqual(parseArgs(['--input', 'metrics.json', '--json']), { input: 'metrics.json', json: true });
  for (const args of [[], ['--input'], ['--input', 'a', '--input', 'b'], ['--input', 'a', '--json', '--json'], ['--execute', 'x']]) assert.throws(() => parseArgs(args));
});

test('CLI reads only the input, labels synthetic data and rejects truncated JSON', async (t) => {
  const base = resolve(tmpdir());
  const dir = await mkdtemp(join(base, 'quality-report-test-'));
  assert.equal(dirname(dir), base);
  assert.ok(basename(dir).startsWith('quality-report-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, 'metrics ; report.json');
  const data = JSON.stringify(input({
    functions: [entry({ complexity: measurement({ value: 6, evidence: '$(touch should-not-exist)' }) })],
    command: 'touch should-not-exist',
  }));
  await writeFile(file, data);
  const result = spawnSync(process.execPath, [cli, '--input', file, '--json'], { cwd: dir, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).synthetic, true);
  assert.equal(await readFile(file, 'utf8'), data);
  assert.deepEqual(await readdir(dir), ['metrics ; report.json']);
  await writeFile(file, '{"schema_version":');
  assert.equal(spawnSync(process.execPath, [cli, '--input', file], { cwd: dir }).status, 2);
});

test('Markdown preserves the cause of unavailable mutation evidence', () => {
  const report = buildReport(input({ mutation: { status: 'failed', reason: 'Baseline runner unavailable' } }));
  assert.match(renderMarkdown(report), /Baseline runner unavailable/);
  assert.match(renderMarkdown(report), /não medida/);
});

test('the shipped example stays explicitly synthetic and Markdown escapes supplied content', async () => {
  const sample = JSON.parse(await readFile('skills/34-static-analysis/examples/code-quality-input.json', 'utf8'));
  const report = buildReport(sample);
  assert.equal(report.synthetic, true);
  assert.equal(report.functions[1].crap, null);
  assert.match(renderMarkdown(report), /exemplo sintético/);
  const untrusted = buildReport(input({ functions: [entry({ name: '[click](https://example.com)|<script>' })] }));
  assert.match(renderMarkdown(untrusted), /\\\[click\\\]/);
  assert.doesNotMatch(renderMarkdown(untrusted), /<script>/);
});
