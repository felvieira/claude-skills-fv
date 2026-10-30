import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchesTrigger } from '../lib/trigger-match.mjs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('isolated words avoid accidental substring matches', () => {
  assert.equal(matchesTrigger('implemente RAG para documentos', 'rag'), true);
  assert.equal(matchesTrigger('implemente drag and drop', 'rag'), false);
  assert.equal(matchesTrigger('fluxo', 'ux'), false);
  assert.equal(matchesTrigger('UX mobile', 'ux'), true);
  assert.equal(matchesTrigger('interface responsiva', 'interface responsiva'), true);
  assert.equal(matchesTrigger('validacao final', 'validação final'), true);
  assert.equal(matchesTrigger('API em C++', 'C++'), true);
});

test('fixture evaluator keeps apostrophes within quoted trigger phrases', () => {
  const script = fileURLToPath(new URL('../eval-triggers.mjs', import.meta.url));
  const run = spawnSync(process.execPath, [script, '--skill', '89-ui-facelift', '--json'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout).results[0];
  const sample = result.should.samples.find((item) => item.prompt.startsWith("modernize this app's interface"));
  assert.equal(sample.by, "modernize this app's interface");
  assert.ok(result.should.samples.every((item) => item.matched));
});
