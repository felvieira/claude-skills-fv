import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';

const root = resolve('.');
const hook = join(root, 'hooks/scripts/keyword-detector.mjs');
const dispatcher = join(root, 'hooks/scripts/runtime-dispatcher.mjs');

function fixture(t, skills = []) {
  const base = resolve(tmpdir());
  const dir = mkdtempSync(join(base, 'design-discovery-test-'));
  assert.equal(dirname(dir), base);
  assert.ok(basename(dir).startsWith('design-discovery-test-'));
  for (const skill of skills) {
    const target = join(dir, '.bot', 'skills', skill);
    mkdirSync(target, { recursive: true });
    copyFileSync(join(root, 'skills', skill, 'SKILL.md'), join(target, 'SKILL.md'));
  }
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function detect(cwd, prompt, extraEnv = {}) {
  const result = spawnSync(process.execPath, [hook], {
    cwd, encoding: 'utf8', input: JSON.stringify({ prompt }),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, DEVKIT_DISABLED_HOOKS: '', DEVKIT_HOOK_PROFILE: 'standard', DEVKIT_LEARNED_ONLY: '', ...extraEnv },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).hookSpecificOutput?.additionalContext ?? '';
}

test('runtime reminder finds later triggers and chooses the consolidated skill on ties', (t) => {
  const dir = fixture(t, ['02-ui-ux-design', '89-ui-facelift', '92-design-director']);
  for (const prompt of [
    'Crie uma landing para o produto',
    'Crie a copy e o design de uma landing para o produto',
    'Crie um app para organizar tarefas',
    'Quero um app para organizar tarefas',
    'Crie um sistema para organizar projetos',
    'Crie uma landing sem editar o backend existente',
    'Faça um redesign completo deste sistema',
    'Melhorar todas as telas existentes',
  ]) assert.match(detect(dir, prompt), /Skill matched: 92-design-director/, prompt);
  assert.doesNotMatch(detect(dir, 'Crie um app somente o backend'), /92-design-director/);
  assert.doesNotMatch(detect(dir, 'Crie uma landing: apenas copy para o produto'), /92-design-director/);
  assert.doesNotMatch(detect(dir, 'Explique como funciona criar um app'), /92-design-director/);
});

test('runtime dispatcher includes the design reminder for a broad creation request', (t) => {
  const dir = fixture(t, ['02-ui-ux-design', '89-ui-facelift', '92-design-director']);
  const result = spawnSync(process.execPath, [dispatcher, 'UserPromptSubmit'], {
    cwd: dir, encoding: 'utf8', input: JSON.stringify({ cwd: dir, prompt: 'Crie um app para organizar tarefas' }),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: root, DEVKIT_DISABLED_HOOKS: '', DEVKIT_HOOK_PROFILE: 'standard', DEVKIT_RUNTIME_PROFILE: '', DEVKIT_LEARNED_ONLY: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  const response = JSON.parse(result.stdout);
  assert.match(response.hookSpecificOutput?.additionalContext ?? '', /Skill matched: 92-design-director/);
});

test('plugin root is used when a consumer project has no local skill directory', (t) => {
  const dir = fixture(t);
  assert.match(detect(dir, 'Crie um app para organizar tarefas'), /Skill matched: 92-design-director/);
  assert.doesNotMatch(detect(dir, 'Crie um app para organizar tarefas', { DEVKIT_LEARNED_ONLY: '1' }), /Skill matched:/);
});

test('a partial project-local kit does not hide skills from the installed plugin', (t) => {
  const dir = fixture(t, ['02-ui-ux-design']);
  assert.match(detect(dir, 'Crie um app para organizar tarefas'), /Skill matched: 92-design-director/);
});

test('the hook and its shared parser work from a consumer .bot installation', (t) => {
  const dir = fixture(t, ['92-design-director']);
  for (const relative of [
    'hooks/scripts/keyword-detector.mjs', 'hooks/scripts/utils.mjs', 'hooks/scripts/memory-lib.mjs',
    'scripts/lib/trigger-match.mjs', 'scripts/lib/skill-triggers.mjs',
  ]) {
    const target = join(dir, '.bot', relative);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(root, relative), target);
  }
  const result = spawnSync(process.execPath, [join(dir, '.bot/hooks/scripts/keyword-detector.mjs')], {
    cwd: dir, encoding: 'utf8', input: JSON.stringify({ prompt: 'Quero um app para organizar tarefas' }),
    env: { ...process.env, CLAUDE_PLUGIN_ROOT: '', DEVKIT_DISABLED_HOOKS: '', DEVKIT_HOOK_PROFILE: 'standard', DEVKIT_LEARNED_ONLY: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(JSON.parse(result.stdout).hookSpecificOutput?.additionalContext ?? '', /Skill matched: 92-design-director/);
});
