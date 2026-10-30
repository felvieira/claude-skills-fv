import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const permanent = /low credits|insufficient credits|authentication failed|invalid api key|ENOENT/i;
const retryable = /rate limit|429|503|504|ECONNRESET|ETIMEDOUT|fetch failed/i;

// A file keeps arbitrary prompts out of shell parsing, including on Windows.
export function createFilePromptAdapter(name, { spawn = spawnSync, platform = process.platform } = {}) {
  if (!['grok', 'omp'].includes(name)) throw new Error(`Unsupported agent: ${name}`);
  return {
    name,
    async invoke({ prompt, model, timeout, signal } = {}) {
      if (signal?.aborted) return { output: '', error: 'aborted before invocation', status: null, tokens: null };
      let executable = name;
      if (platform === 'win32') {
        const found = spawn('where.exe', [`${name}.exe`], { encoding: 'utf8', shell: false });
        executable = found.status === 0 ? found.stdout?.split(/\r?\n/).find(Boolean) : null;
        if (!executable) return { output: '', error: `ENOENT: ${name}.exe not found on PATH`, status: null, tokens: null };
      }
      const dir = mkdtempSync(join(tmpdir(), 'devkit-agent-'));
      const file = join(dir, 'prompt.txt');
      try {
        writeFileSync(file, String(prompt ?? ''), { encoding: 'utf8', mode: 0o600 });
        const args = name === 'grok' ? ['--prompt-file', file, '--output-format', 'plain'] : ['-p', `@${file}`, '--no-session'];
        if (model) args.push(name === 'grok' ? '--model' : `--model=${model}`, ...(name === 'grok' ? [model] : []));
        const r = spawn(executable, args, { encoding: 'utf8', timeout: typeof timeout === 'number' ? timeout : 300000, maxBuffer: 10 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
        const error = [r.error?.message, r.stderr].filter(Boolean).join('\n');
        return { output: r.stdout || '', error, status: typeof r.status === 'number' ? r.status : null, tokens: null };
      } finally {
        try { unlinkSync(file); } catch (e) { if (e.code !== 'ENOENT') throw e; }
        rmdirSync(dir);
      }
    },
    isPermanentError: (value) => permanent.test(String(value || '')),
    isRetryableError: (value) => retryable.test(String(value || '')),
  };
}
