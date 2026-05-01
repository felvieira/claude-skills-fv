/**
 * plan.mjs — .auto/plan.md checkbox parsing + budget calc.
 *
 * Ported from scripts/auto-loop/_legacy.mjs (Phase 2, Subagent A).
 *
 * Exports:
 *   - countPlanTasks()         → { done, total }
 *   - hasPendingTasks()        → boolean
 *   - calcBudget(taskDesc)     → 8 | 12 | 15 (heuristic)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const AUTO_DIR = '.auto';
const PLAN_FILE = join(AUTO_DIR, 'plan.md');

function readFile(path) {
  try { return readFileSync(path, 'utf-8'); } catch { return ''; }
}

export function countPlanTasks() {
  const plan = readFile(PLAN_FILE);
  if (!plan) return { done: 0, total: 0 };
  const done = (plan.match(/- \[x\]/gi) || []).length;
  const pending = (plan.match(/- \[ \]/g) || []).length;
  return { done, total: done + pending };
}

export function hasPendingTasks() {
  const { done, total } = countPlanTasks();
  return total > 0 && done < total;
}

export function calcBudget(taskDesc) {
  // Estimate complexity from task description length and keywords.
  const words = taskDesc.split(/\s+/).filter(Boolean).length;
  const complexKeywords = ['crud', 'auth', 'refactor', 'migrate', 'integration', 'system', 'module'];
  const lower = taskDesc.toLowerCase();
  const isComplex = complexKeywords.some((k) => lower.includes(k));
  if (words > 30 || isComplex) return 15;
  if (words > 15) return 12;
  return 8;
}
