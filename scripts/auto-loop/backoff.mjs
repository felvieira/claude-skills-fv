/**
 * backoff.mjs — error classification + exponential backoff.
 *
 *   permanent: low credits, auth fail   → throw immediately
 *   retryable: rate limit, network, 5xx → expo backoff (60s → 600s cap, max 5)
 *   transient: agent reported failure   → handled by caller (next iter)
 *
 * `withBackoff` wraps an async function and retries it on retryable
 * errors with exponential delay. Permanent errors short-circuit. The
 * `sleep` injection point lets tests run instantly.
 */

const DEFAULTS = {
  maxAttempts: 5,
  baseMs: 60_000,
  capMs: 600_000,
};

export function classify(errText, adapter) {
  const text = errText == null ? '' : String(errText);
  if (adapter && typeof adapter.isPermanentError === 'function' && adapter.isPermanentError(text)) {
    return 'permanent';
  }
  if (adapter && typeof adapter.isRetryableError === 'function' && adapter.isRetryableError(text)) {
    return 'retryable';
  }
  return 'transient';
}

function defaultSleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withBackoff(fn, adapter, opts = {}) {
  const maxAttempts = opts.maxAttempts ?? DEFAULTS.maxAttempts;
  const baseMs = opts.baseMs ?? DEFAULTS.baseMs;
  const capMs = opts.capMs ?? DEFAULTS.capMs;
  const sleep = opts.sleep || defaultSleep;

  let attempt = 0;
  // Loop until we return a value or throw.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      const errText = err && err.message ? err.message : String(err);
      const kind = classify(errText, adapter);

      if (kind === 'permanent') {
        throw err;
      }

      attempt++;
      if (attempt >= maxAttempts) {
        const wrapped = new Error(`Retry exhausted (${maxAttempts} attempts): ${errText}`);
        wrapped.cause = err;
        wrapped.attempts = attempt;
        throw wrapped;
      }

      const delay = Math.min(baseMs * Math.pow(2, attempt - 1), capMs);
      await sleep(delay);
    }
  }
}
