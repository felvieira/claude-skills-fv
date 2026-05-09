/**
 * Iteration quality scorer for auto-loop circuit breaker.
 * Returns score 0.0–1.0. Used alongside existing stall detection.
 * Three consecutive scores < threshold triggers shouldStall().
 */

/**
 * @param {object} opts
 * @param {number} [opts.diffLines=0]      Lines changed this iteration
 * @param {number} [opts.testsDelta=0]     Net new passing tests (+) or newly failing (-)
 * @param {string|null} [opts.errorClass]  "permanent" | "retryable" | "agent-reported" | null
 * @param {number} [opts.errorEntropy=0]   Unique error signatures seen so far
 * @param {number} [opts.iterationNum=0]   Current iteration index (0-based)
 * @returns {number} score 0.0–1.0
 */
export function iterationScore({
  diffLines = 0,
  testsDelta = 0,
  errorClass = null,
  errorEntropy = 0,
  iterationNum = 0,
} = {}) {
  let score = 0.5; // neutral baseline

  // Progress signals (positive)
  if (diffLines > 0) score += 0.15;
  if (diffLines > 50) score += 0.10;
  if (testsDelta > 0) score += 0.20;

  // Regression signals (negative)
  if (testsDelta < 0) score -= 0.25;
  if (errorClass === "permanent") score -= 0.40;
  if (errorClass === "retryable") score -= 0.10;
  if (errorEntropy > 3) score -= 0.20; // thrashing between different errors

  // Late-run decay: no progress after iteration 5
  if (iterationNum > 5 && diffLines === 0) score -= 0.20;

  return Math.max(0, Math.min(1, score));
}

/**
 * Returns true if the last `window` scores are all below `threshold`.
 * @param {number[]} scoreHistory
 * @param {number} [threshold=0.3]
 * @param {number} [window=3]
 * @returns {boolean}
 */
export function shouldStall(scoreHistory, threshold = 0.3, window = 3) {
  if (scoreHistory.length < window) return false;
  const recent = scoreHistory.slice(-window);
  return recent.every((s) => s < threshold);
}
