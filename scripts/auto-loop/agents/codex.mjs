/**
 * agents/codex.mjs — Codex CLI adapter (codex exec --full-auto).
 *
 * Spawns `codex exec --full-auto <prompt>` via spawnSync. No --model
 * flag is passed; codex picks its own model.
 *
 * Same adapter contract as claude.mjs.
 */

import { spawnSync } from 'node:child_process';

const PERMANENT_RE = /low credits|insufficient credits|authentication failed|invalid api key|ENOENT/i;
const RETRYABLE_RE = /rate limit|429|503|504|ECONNRESET|ETIMEDOUT|fetch failed/i;

const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Try to parse a trailing JSON line for token usage.
 * Non-fatal: returns null when nothing parseable is found.
 */
function extractTokens(output) {
  if (!output || typeof output !== 'string') return null;
  const lines = output.trimEnd().split(/\r?\n/);
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 5); i--) {
    const line = lines[i].trim();
    if (!line.startsWith('{') || !line.endsWith('}')) continue;
    try {
      const obj = JSON.parse(line);
      const usage = obj.usage || obj.tokens || obj;
      const input =
        usage.input_tokens ?? usage.input ?? usage.prompt_tokens ?? null;
      const output =
        usage.output_tokens ?? usage.output ?? usage.completion_tokens ?? null;
      const cached =
        usage.cache_read_input_tokens ??
        usage.cached ??
        usage.cached_tokens ??
        null;
      if (input != null || output != null || cached != null) {
        return {
          input: input ?? 0,
          output: output ?? 0,
          cached: cached ?? 0,
        };
      }
    } catch {
      // Skip non-JSON lines.
    }
  }
  return null;
}

const adapter = {
  name: 'codex',

  async invoke({ prompt, model: _model, timeout, signal } = {}) {
    if (signal && signal.aborted) {
      return {
        output: '',
        error: 'aborted before invocation',
        status: null,
        tokens: null,
      };
    }

    const t = typeof timeout === 'number' ? timeout : DEFAULT_TIMEOUT_MS;
    const maxBuffer = DEFAULT_MAX_BUFFER;

    // Windows: shell:true is required to resolve `codex.cmd` / `codex.bat`
    // launchers. With shell:true the args are joined and re-parsed by
    // cmd.exe, so we must quote each one ourselves to preserve whitespace
    // and metacharacters in the prompt.
    const args = ['exec', '--full-auto', prompt];
    let result;
    if (process.platform === 'win32') {
      const quoteWinArg = (s) => {
        if (s == null) return '""';
        const str = String(s);
        if (!/[\s"&<>|^]/.test(str)) return str;
        return `"${str.replace(/"/g, '""')}"`;
      };
      const quoted = args.map(quoteWinArg).join(' ');
      result = spawnSync('codex ' + quoted, {
        encoding: 'utf-8',
        maxBuffer,
        timeout: t,
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true,
      });
    } else {
      result = spawnSync('codex', args, {
        encoding: 'utf-8',
        maxBuffer,
        timeout: t,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }

    const output = result.stdout || '';
    let error = result.stderr || '';
    if (result.error && !error) {
      error = String(result.error.message || result.error);
    }
    const status = typeof result.status === 'number' ? result.status : null;
    const tokens = extractTokens(output);

    return { output, error, status, tokens };
  },

  isPermanentError(errText) {
    if (!errText) return false;
    return PERMANENT_RE.test(String(errText));
  },

  isRetryableError(errText) {
    if (!errText) return false;
    return RETRYABLE_RE.test(String(errText));
  },
};

export default adapter;
