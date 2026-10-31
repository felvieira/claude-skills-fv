import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { contrastRatio, evaluate } from '../../skills/91-unslop/scripts/contrast.mjs';

test('razão de contraste é simétrica e usa limiar sem arredondar', () => {
  assert.equal(contrastRatio('#000', '#fff'), 21);
  assert.equal(contrastRatio('#fff', '#000'), 21);
  assert.equal(evaluate('#777', '#fff').passes, false);
  assert.equal(evaluate('#777', '#fff', 'large').passes, true);
  assert.equal(evaluate('#fff', '#fff', 'ui').passes, false);
});

test('formatos e tipos não suportados falham sem alegar resultado', () => {
  assert.throws(() => evaluate('#0008', '#fff'), /opacas/);
  assert.throws(() => evaluate('red', '#fff'), /opacas/);
  assert.throws(() => evaluate('#000', '#fff', 'invalid'), /Tipo/);
  const run = spawnSync(process.execPath, ['skills/91-unslop/scripts/contrast.mjs', '#777', '#fff'], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.equal(JSON.parse(run.stdout).passes, false);
});
