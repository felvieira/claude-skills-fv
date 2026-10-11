import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const hook = join(root, 'hooks', 'scripts', 'session-start.mjs');
const defaultPath = 'docs/skill-guides/skill-discovery.md';

function withProject(config, callback) {
  const cwd = mkdtempSync(join(tmpdir(), 'session-bootstrap-'));
  try {
    mkdirSync(join(cwd, 'hooks'));
    mkdirSync(join(cwd, 'docs', 'skill-guides'), { recursive: true });
    writeFileSync(join(cwd, 'hooks', 'config.json'), JSON.stringify({
      memory_curator: { enabled: false },
      session_bootstrap: config,
    }));
    return callback(cwd);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

function start(cwd, budget = 2000) {
  const result = spawnSync(process.execPath, [hook], {
    cwd,
    input: '{}',
    encoding: 'utf8',
    env: { ...process.env, HOME: cwd, USERPROFILE: cwd, DEVKIT_SESSION_INJECT_TOKENS: String(budget) },
  });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout).systemMessage;
}

test('default bootstrap points to the complete routing guide and only existing root paths', () => {
  withProject({}, (cwd) => {
    writeFileSync(join(cwd, defaultPath), 'ROUTING_TABLE_MARKER\n' + 'x'.repeat(3000));
    mkdirSync(join(cwd, 'docs', 'context'), { recursive: true });
    writeFileSync(join(cwd, 'docs', 'context', 'current-focus.md'), 'focus marker');
    writeFileSync(join(cwd, 'GLOBAL.md'), 'root rules');
    const message = start(cwd);
    assert.match(message, /\[Skill Discovery\].*docs[/\\]skill-guides[/\\]skill-discovery\.md/);
    assert.match(message, /Skill\(\).*Agent\(\)/);
    assert.doesNotMatch(message, /ROUTING_TABLE_MARKER|\[\.\.\.truncated\]/);
    assert.match(message, /docs[/\\]context[/\\]current-focus\.md/);
    assert.match(message, /GLOBAL\.md/);
    assert.doesNotMatch(message, /\.bot[/\\]GLOBAL\.md/);
  });
});

test('explicit custom meta-skill and opt-out keep their existing behavior', () => {
  withProject({ meta_skill_path: 'docs/skill-guides/custom.md' }, (cwd) => {
    writeFileSync(join(cwd, 'docs', 'skill-guides', 'custom.md'), 'CUSTOM_ROUTING_MARKER');
    assert.match(start(cwd), /\[Skill Discovery\]\nCUSTOM_ROUTING_MARKER/);
  });
  withProject({ inject_meta_skill: false }, (cwd) => {
    writeFileSync(join(cwd, defaultPath), 'DO_NOT_INJECT');
    assert.doesNotMatch(start(cwd), /\[Skill Discovery\]|DO_NOT_INJECT/);
  });
});

test('full systemMessage stays within the proxy budget when custom bootstrap is oversized', () => {
  withProject({ meta_skill_path: 'docs/skill-guides/custom.md' }, (cwd) => {
    writeFileSync(join(cwd, 'docs', 'skill-guides', 'custom.md'), 'CUSTOM_ROUTING_MARKER ' + 'x'.repeat(5000));
    const message = start(cwd, 100);
    assert.ok(message.length <= 400, `systemMessage has ${message.length} chars`);
    assert.match(message, /CUSTOM_ROUTING_MARKER/);
    assert.match(message, /…/);
  });
});

test('root-layout message omits nonexistent focus and rules pointers', () => {
  withProject({ inject_meta_skill: false }, (cwd) => {
    const message = start(cwd);
    assert.doesNotMatch(message, /current-focus\.md|GLOBAL\.md/);
  });
});

test('consumer layout prefers .bot focus and rules paths', () => {
  withProject({ inject_meta_skill: false }, (cwd) => {
    mkdirSync(join(cwd, '.bot', 'docs', 'context'), { recursive: true });
    writeFileSync(join(cwd, '.bot', 'docs', 'context', 'current-focus.md'), 'consumer focus');
    writeFileSync(join(cwd, '.bot', 'GLOBAL.md'), 'consumer rules');
    const message = start(cwd);
    assert.match(message, /\.bot[/\\]docs[/\\]context[/\\]current-focus\.md/);
    assert.match(message, /\.bot[/\\]GLOBAL\.md/);
  });
});

test('invalid injection budget falls back to the default instead of disabling the guard', () => {
  withProject({ meta_skill_path: 'docs/skill-guides/custom.md' }, (cwd) => {
    writeFileSync(join(cwd, 'docs', 'skill-guides', 'custom.md'), 'INVALID_BUDGET_MARKER');
    assert.match(start(cwd, 'invalid'), /INVALID_BUDGET_MARKER/);
  });
});
