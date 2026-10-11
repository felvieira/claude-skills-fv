import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { test } from 'node:test';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const script = join(root, 'scripts', 'skill-catalog-budget.mjs');

function runCatalog(args = []) {
  const result = spawnSync(process.execPath, [script, '--json', ...args], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('catalog report separates disk inventory from proxy estimates', () => {
  const report = runCatalog();
  assert.equal(report.inventory.skills, 86);
  assert.ok(report.inventory.descriptionBytes >= report.inventory.descriptionChars);
  assert.ok(report.inventory.catalogEntryBytes >= report.inventory.catalogEntryChars);
  assert.equal(report.observed, null);
  assert.ok(report.inventory.descriptionProxyTokens > 0);
});

test('captured hook payload is reported separately from disk inventory', () => {
  const dir = mkdtempSync(join(tmpdir(), 'catalog-observed-'));
  try {
    const payload = join(dir, 'hook.json');
    writeFileSync(payload, JSON.stringify({ systemMessage: 'captured ✓' }));
    const report = runCatalog(['--observed', payload]);
    assert.deepEqual(report.observed, {
      source: payload,
      chars: 10,
      bytes: 12,
      proxyTokens: 3,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('proposed descriptions stay bounded and never cut a selected trigger', () => {
  const report = runCatalog();
  for (const skill of report.skills) {
    assert.ok(skill.compactedChars <= 400, `${skill.slug} exceeds compacted limit`);
    for (const trigger of skill.selectedTriggers) {
      assert.match(skill.compactedDescription, new RegExp(trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
  }
  assert.ok(report.proposed.droppedFixtureTriggers > 0, 'fixture-risk report should expose review work');
});
