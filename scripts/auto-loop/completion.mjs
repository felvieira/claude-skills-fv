/**
 * completion.mjs — detect task completion / blocked from agent output.
 *
 * Ported from _legacy.mjs (lines ~37-72, ~298-326).
 */

export const COMPLETION_MARKERS = [
  'EXIT_SIGNAL: true',
  '<TASK_DONE>',
  '<TASK_COMPLETE>',
  'TASK_COMPLETE',
  'All tasks completed',
  'Successfully completed all',
  'Implementation complete',
];

export const BLOCKED_MARKERS = [
  'TASK_BLOCKED',
  'Cannot proceed without',
  'Blocked:',
  'need clarification',
  'need more information',
];

export const COMPLETION_PATTERNS = [
  { pattern: /implementation is complete/i, score: 0.9 },
  { pattern: /all tests pass/i, score: 0.85 },
  { pattern: /task is done/i, score: 0.9 },
  { pattern: /ready for review/i, score: 0.75 },
  { pattern: /successfully implemented/i, score: 0.8 },
  { pattern: /commit.*created/i, score: 0.85 },
  { pattern: /\bdone\b|\bfinished\b|\bcomplete\b/i, score: 0.5 },
];

export const STUCK_PATTERNS = [
  { pattern: /cannot proceed/i, score: 0.9 },
  { pattern: /stuck on/i, score: 0.8 },
  { pattern: /infinite loop/i, score: 0.95 },
  { pattern: /same error/i, score: 0.7 },
];

/**
 * detectCompletion(output) → { done, blocked?, reason }
 *
 *   { done: true, reason }                  → finished cleanly
 *   { done: true, blocked: true, reason }   → blocked / stuck
 *   { done: false }                         → keep looping
 */
export function detectCompletion(output) {
  if (typeof output !== 'string') output = String(output ?? '');

  // 1. Explicit exit signal
  for (const marker of COMPLETION_MARKERS) {
    if (output.includes(marker)) return { done: true, reason: `marker: ${marker}` };
  }

  // 2. Blocked signal
  for (const marker of BLOCKED_MARKERS) {
    if (output.includes(marker)) return { done: true, blocked: true, reason: `blocked: ${marker}` };
  }

  // 3. Semantic scoring
  let completionScore = 0;
  let stuckScore = 0;

  for (const { pattern, score } of COMPLETION_PATTERNS) {
    if (pattern.test(output)) completionScore = Math.max(completionScore, score);
  }
  for (const { pattern, score } of STUCK_PATTERNS) {
    if (pattern.test(output)) stuckScore = Math.max(stuckScore, score);
  }

  if (stuckScore >= 0.8) return { done: true, blocked: true, reason: `semantic stuck (score ${stuckScore})` };
  if (completionScore >= 0.75) return { done: true, reason: `semantic completion (score ${completionScore})` };

  return { done: false };
}
