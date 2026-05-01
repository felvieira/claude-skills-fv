/**
 * circuit-breaker.mjs — error dedup, stall detection, same-error counter.
 *
 * Ported from scripts/auto-loop/_legacy.mjs (lines ~256-475).
 */

import { createHash } from 'crypto';
import { execSync } from 'child_process';

export function normalizeError(err) {
  return String(err)
    .replace(/:\d+:\d+/g, ':N:N')                      // line:col numbers
    .replace(/:\d+/g, ':N')                            // line numbers
    .replace(/0x[0-9a-f]+/gi, '<addr>')                // hex addresses
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z]+/g, '<ts>')    // ISO timestamps
    .replace(/\d{10,}/g, '<num>')                      // long numbers (timestamps, pids)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

export function hashError(err) {
  return createHash('md5').update(normalizeError(err)).digest('hex').slice(0, 8);
}

function gitDiffSinceBaseline() {
  try {
    return execSync(
      'git diff HEAD --name-only 2>/dev/null; git diff --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
  } catch {
    return '';
  }
}

export class CircuitBreaker {
  constructor({ maxSameError = 3, maxStall = 3 } = {}) {
    this.maxSameError = maxSameError;
    this.maxStall = maxStall;
    this.errorCounts = {};
    this.stallCount = 0;
    this.lastChangedFiles = null;
  }

  recordError(error) {
    const h = hashError(error);
    this.errorCounts[h] = (this.errorCounts[h] || 0) + 1;
    if (this.errorCounts[h] >= this.maxSameError) {
      return {
        tripped: true,
        reason: `Same error repeated ${this.errorCounts[h]}x: ${normalizeError(error).slice(0, 100)}`,
      };
    }
    return { tripped: false };
  }

  checkStall() {
    const changed = gitDiffSinceBaseline();
    // Skip stall detection on first iteration (planning phase may not produce file changes).
    if (this.lastChangedFiles === null) {
      this.lastChangedFiles = changed;
      return { tripped: false };
    }
    if (changed === this.lastChangedFiles) {
      this.stallCount++;
      if (this.stallCount >= this.maxStall) {
        return {
          tripped: true,
          reason: `Stall: ${this.stallCount} iterations with no file changes`,
        };
      }
    } else {
      this.stallCount = 0;
      this.lastChangedFiles = changed;
    }
    return { tripped: false };
  }

  reset() {
    this.stallCount = 0;
  }
}
