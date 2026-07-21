/**
 * context.mjs — build prompt context per iteration (3-tier narrowing).
 *
 * Ported from _legacy.mjs (lines ~379-431).
 *
 * Tier 1 (iter ≤ 2): full context — repo audit, plan, error, kit instructions.
 * Tier 2 (iter 3-5): focused — plan status, recent progress tail, error tail.
 * Tier 3 (iter 6+):  minimal — task + plan ratio + error.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { countPlanTasks } from './plan.mjs';

function safeCountPlanTasks() {
  try { return countPlanTasks(); } catch { return { done: 0, total: 0 }; }
}

const AUTO_DIR = '.auto';
const PLAN_FILE = join(AUTO_DIR, 'plan.md');
const PROGRESS_FILE = join(AUTO_DIR, 'progress.md');
const ROUTE_FILE = join(AUTO_DIR, 'route.json');

function readFile(path) {
  try { return readFileSync(path, 'utf-8'); } catch { return ''; }
}

const KIT_INSTRUCTIONS = `
## Kit Instructions
- Follow policies in policies/ or .bot/policies/
- Use search-first: search the codebase before implementing
- Source-driven: base decisions on actual code, not assumptions
- Anti-rationalization: do not take shortcuts; fix properly
- Write actual code, not placeholders
- After implementing, write EXIT_SIGNAL: true on its own line when fully done
`.trim();

export function buildContext(opts, state) {
  const { task } = opts;
  const { iteration, maxIterations, lastError, lastOutput, tools } = state;

  const plan = readFile(PLAN_FILE);
  const progress = readFile(PROGRESS_FILE);
  const repoAudit = readFile('docs/repo-audit/current.md') || readFile('.bot/docs/repo-audit/current.md');
  const route = readFile(ROUTE_FILE);

  // Tier 1: first 2 iterations — full context
  if (iteration <= 2) {
    return [
      `# Autonomous Task\n\n${task}`,
      KIT_INSTRUCTIONS,
      route ? `## Routing Contract\n${route}` : '',
      repoAudit ? `## Repo Context\n${repoAudit.slice(0, 2000)}` : '',
      plan
        ? `## Current Plan\n${plan}`
        : '## Plan\nNo plan yet — create .auto/plan.md with your implementation plan using checkboxes (- [ ] task)',
      tools && tools.test ? `## Test Command\n${tools.test}` : '',
      lastError ? `## Last Error (fix this)\n\`\`\`\n${lastError.slice(0, 1500)}\n\`\`\`` : '',
    ].filter(Boolean).join('\n\n');
  }

  // Tier 2: iterations 3-5 — focused context
  if (iteration <= 5) {
    const { done, total } = safeCountPlanTasks();
    return [
      `# Autonomous Task (iteration ${iteration}/${maxIterations})\n\n${task}`,
      KIT_INSTRUCTIONS,
      route ? `## Routing Contract\n${route}` : '',
      plan ? `## Plan Status (${done}/${total} done)\n${plan}` : '',
      progress ? `## Recent Progress\n${progress.split('\n').slice(-30).join('\n')}` : '',
      lastError ? `## Error to Fix\n\`\`\`\n${lastError.slice(0, 2000)}\n\`\`\`` : '',
      lastOutput ? `## Last Output (tail)\n${lastOutput.slice(-1000)}` : '',
      'Write EXIT_SIGNAL: true when all plan tasks are [x] and tests pass.',
    ].filter(Boolean).join('\n\n');
  }

  // Tier 3: iteration 6+ — minimal context
  const { done, total } = countPlanTasks();
  return [
    `# Task (iter ${iteration}/${maxIterations}): ${task}`,
    `Plan: ${done}/${total} done. Pending tasks are still [ ] in .auto/plan.md`,
    lastError
      ? `## Fix this error:\n\`\`\`\n${lastError.slice(0, 2000)}\n\`\`\``
      : 'Continue implementing. Mark tasks [x] as you complete them.',
    'Write EXIT_SIGNAL: true when all tasks are [x] and tests pass.',
  ].filter(Boolean).join('\n\n');
}
