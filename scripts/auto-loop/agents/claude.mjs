/**
 * agents/claude.mjs — Claude CLI adapter (claude --print).
 *
 * Spawns `claude --print --model <model> <prompt>` via spawnSync.
 * Falls back to `claude --print <prompt>` if the first call errors with
 * an ENOENT-style error (older CLI versions do not accept --model).
 *
 * Adapter contract:
 *   { name, invoke, isPermanentError, isRetryableError }
 *
 * invoke({ prompt, model, timeout, signal }) → { output, error, status, tokens }
 *   tokens is { input, output, cached } | null
 */

import { spawnSync } from 'node:child_process';

const PERMANENT_RE = /low credits|insufficient credits|authentication failed|invalid api key|ENOENT/i;
const RETRYABLE_RE = /rate limit|429|503|504|ECONNRESET|ETIMEDOUT|fetch failed/i;

const DEFAULT_TIMEOUT_MS = 300_000;
const DEFAULT_MAX_BUFFER = 10 * 1024 * 1024;

/**
 * Try to extract token usage from a trailing JSON line in CLI output.
 * Many Claude CLIs print a final JSON line with usage stats. This helper
 * is non-fatal: returns null if no parseable token info is found.
 */
function extractTokens(output) {
  if (!output || typeof output !== 'string') return null;
  const lines = output.trimEnd().split(/\r?\n/);
  // Scan from the bottom for a JSON-looking line.
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
      // Non-JSON line; ignore and keep scanning.
    }
  }
  return null;
}

// Quote a single argv element for Windows cmd.exe — needed because spawnSync
// with shell:true joins args with spaces, breaking on prompts that contain
// whitespace, quotes, or shell metacharacters. Implements the cmd.exe rules
// for double-quoted strings: escape `"` as `""`.
function quoteWinArg(s) {
  if (s == null) return '""';
  const str = String(s);
  if (!/[\s"&<>|^]/.test(str)) return str; // safe as-is
  return `"${str.replace(/"/g, '""')}"`;
}

function spawnClaude(args, { timeout, maxBuffer }) {
  // Windows: shell:true is required so the launcher resolves `claude.cmd` /
  // `claude.bat` (npm-installed CLIs ship as .cmd shims; Node's spawn won't
  // find them without shell). With shell:true the args are joined and
  // re-parsed by cmd.exe, so we must quote each one ourselves.
  if (process.platform === 'win32') {
    const quoted = args.map(quoteWinArg).join(' ');
    return spawnSync('claude ' + quoted, {
      encoding: 'utf-8',
      maxBuffer,
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true,
    });
  }
  return spawnSync('claude', args, {
    encoding: 'utf-8',
    maxBuffer,
    timeout,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

const adapter = {
  name: 'claude',

  async invoke({ prompt, model, timeout, signal } = {}) {
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

    const args = model
      ? ['--print', '--model', model, prompt]
      : ['--print', prompt];

    let result = spawnClaude(args, { timeout: t, maxBuffer });

    // Fallback: drop --model if first invocation errored with ENOENT-style
    // (older Claude CLI versions don't recognize --model).
    if (result.error && model) {
      const code = result.error.code || '';
      const msg = String(result.error.message || '');
      const enoentLike = code === 'ENOENT' || /ENOENT/i.test(msg);
      if (enoentLike) {
        result = spawnClaude(['--print', prompt], { timeout: t, maxBuffer });
      }
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
