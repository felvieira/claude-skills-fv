import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createFilePromptAdapter } from '../../auto-loop/agents/file-prompt.mjs';
import { parseArgs } from '../../auto-loop/args.mjs';

for (const name of ['grok', 'omp']) {
  test(`${name}: passes exact prompt via file and never a shell`, async () => {
    const prompt = 'Linha 1 & $(bad) %PATH% "oi"\nSegunda linha';
    let promptFile;
    const spawn = (cmd, args, options) => {
      assert.equal(cmd, name);
      assert.equal(options.shell, false);
      promptFile = name === 'grok' ? args[1] : args[1].slice(1);
      assert.equal(readFileSync(promptFile, 'utf8'), prompt);
      assert.ok(args.includes(name === 'grok' ? '--model' : '--model=test-model'));
      return { status: 0, stdout: 'ok', stderr: '' };
    };
    const result = await createFilePromptAdapter(name, { spawn, platform: 'linux' }).invoke({ prompt, model: 'test-model' });
    assert.equal(result.status, 0);
    assert.equal(result.output, 'ok');
    assert.equal(result.tokens, null);
    assert.equal(existsSync(promptFile), false);
    assert.equal(parseArgs(['--agent', name, 'task']).model, null);
    assert.equal(parseArgs(['--agent', name, '--model', 'chosen', 'task']).model, 'chosen');
    assert.throws(() => parseArgs(['--agent', name, '--max-tokens', '100', 'task']), /token usage is not measured/);
  });
}

test('Windows returns clear error when native executable is unavailable', async () => {
  const spawn = (cmd) => { assert.equal(cmd, 'where.exe'); return { status: 1, stdout: '' }; };
  const result = await createFilePromptAdapter('omp', { spawn, platform: 'win32' }).invoke({ prompt: 'test' });
  assert.match(result.error, /ENOENT/);
  assert.equal(result.status, null);
});

test('process timeout is not hidden by diagnostic stderr', async () => {
  const spawn = () => ({ status: null, stderr: 'startup diagnostics', error: new Error('spawn ETIMEDOUT') });
  const result = await createFilePromptAdapter('grok', { spawn, platform: 'linux' }).invoke({ prompt: 'test' });
  assert.match(result.error, /ETIMEDOUT/);
  assert.match(result.error, /startup diagnostics/);
});
