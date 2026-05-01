/**
 * polish.mjs — quality pass after validation, before commit.
 *
 * Levels:
 *   none     → nothing
 *   light    → simplify
 *   standard → simplify + review (1 retry on blocking issues)
 *   full     → simplify + review + security + test (3 retries)
 *
 * Reads skill prompts from skills/ at runtime (not hardcoded).
 *
 * Phase 6 implementation.
 */

import { readFileSync } from 'fs';

export const POLISH_LEVELS = {
  none:     { skills: [], retries: 0 },
  light:    { skills: ['simplify'], retries: 0 },
  standard: { skills: ['simplify', 'review'], retries: 1 },
  full:     { skills: ['simplify', 'review', 'security-review', 'test'], retries: 3 },
};

export const SKILL_PATHS = {
  simplify: 'skills/23-migration-refactor-specialist',
  review: 'skills/11-reviewer',
  'security-review': 'skills/06-security-review',
  test: 'skills/05-qa-testing',
};

export function getPolishLevel(name) {
  return POLISH_LEVELS[name] || POLISH_LEVELS.none;
}

/**
 * Classify lines of review output into blocking / non-blocking issues.
 *
 * Markers:
 *   BLOCKING: <description>
 *   NON_BLOCKING: <description>  (also accepts NON-BLOCKING / nonblocking variants)
 */
export function classifyIssues(reviewOutput) {
  const blocking = [];
  const nonBlocking = [];
  for (const line of (reviewOutput || '').split('\n')) {
    const trimmed = line.trim();
    if (/^NON[_-]?BLOCKING:\s*/i.test(trimmed)) {
      nonBlocking.push(trimmed.replace(/^NON[_-]?BLOCKING:\s*/i, ''));
    } else if (/^BLOCKING:\s*/i.test(trimmed)) {
      blocking.push(trimmed.replace(/^BLOCKING:\s*/i, ''));
    }
  }
  return { blocking, nonBlocking };
}

/**
 * Load the prompt body for a named skill.
 * Tolerant of casing: tries SKILL.md, skill.md, README.md.
 */
export async function loadSkillPrompt(skillName) {
  const path = SKILL_PATHS[skillName];
  if (!path) return null;
  const candidates = [`${path}/SKILL.md`, `${path}/skill.md`, `${path}/README.md`];
  for (const f of candidates) {
    try {
      return readFileSync(f, 'utf-8');
    } catch {
      // try next candidate
    }
  }
  return null;
}

/**
 * Build the polish prompt for a skill: skill body + file list + reporting markers.
 */
export function buildPolishPrompt(skillName, skillPrompt, files) {
  const fileList = (files || []).map(f => `- ${f}`).join('\n') || '- (no files)';
  return `# Polish Pass: ${skillName}

${skillPrompt}

## Files to review
${fileList}

Apply the skill to these files. Report issues using these markers:
BLOCKING: <description>
NON_BLOCKING: <description>
`;
}

/**
 * Build a retry prompt that asks the agent to fix the blocking issues from a previous attempt.
 */
function buildRetryPrompt(skillName, skillPrompt, files, blocking) {
  const fileList = (files || []).map(f => `- ${f}`).join('\n') || '- (no files)';
  const issues = blocking.map(b => `- ${b}`).join('\n');
  return `# Polish Pass Retry: ${skillName}

The previous attempt reported the following BLOCKING issues that must be fixed:
${issues}

## Skill guidance
${skillPrompt}

## Files
${fileList}

Fix the blocking issues and re-report any remaining issues using:
BLOCKING: <description>
NON_BLOCKING: <description>
`;
}

/**
 * Run a polish pass at a given level.
 *
 * @param {string} level — 'none' | 'light' | 'standard' | 'full'
 * @param {object} agent — adapter with invoke({ prompt, model, timeout })
 * @param {string[]} files — changed file paths
 * @param {object} [opts] — { model?, timeout?, maxRetries?, breaker? }
 * @returns {Promise<{complete: boolean, results: object[], polishIncomplete: boolean}>}
 */
export async function runPolishPass(level, agent, files, opts = {}) {
  const cfg = getPolishLevel(level);
  if (!cfg.skills.length) {
    return { complete: true, results: [], polishIncomplete: false };
  }

  const maxRetries = typeof opts.maxRetries === 'number' ? opts.maxRetries : cfg.retries;
  const breaker = opts.breaker;
  const results = [];
  let polishIncomplete = false;

  for (const skillName of cfg.skills) {
    // Circuit breaker check (optional)
    if (breaker && typeof breaker.isOpen === 'function' && breaker.isOpen()) {
      results.push({ skill: skillName, ok: false, error: 'circuit breaker open', skipped: true });
      polishIncomplete = true;
      continue;
    }

    const skillPrompt = await loadSkillPrompt(skillName);
    if (!skillPrompt) {
      results.push({ skill: skillName, ok: false, error: 'skill not found' });
      polishIncomplete = true;
      continue;
    }

    let attempt = 0;
    let lastIssues = { blocking: [], nonBlocking: [] };

    while (true) {
      attempt++;
      const prompt = attempt === 1
        ? buildPolishPrompt(skillName, skillPrompt, files)
        : buildRetryPrompt(skillName, skillPrompt, files, lastIssues.blocking);

      let r;
      try {
        r = await agent.invoke({
          prompt,
          model: opts.model,
          timeout: opts.timeout,
        });
      } catch (err) {
        results.push({
          skill: skillName,
          ok: false,
          error: err && err.message ? err.message : String(err),
          attempt,
        });
        polishIncomplete = true;
        break;
      }

      const issues = classifyIssues(r && r.output ? r.output : '');
      lastIssues = issues;

      const hasError = !!(r && r.error);
      results.push({
        skill: skillName,
        ok: !hasError && issues.blocking.length === 0,
        output: r ? r.output : '',
        issues,
        attempt,
      });

      // Done with this skill if no blocking issues, or retry budget exhausted, or hard error.
      if (issues.blocking.length === 0 || attempt > maxRetries || hasError) {
        if (issues.blocking.length > 0 || hasError) {
          polishIncomplete = true;
        }
        break;
      }
      // Otherwise loop and retry
    }
  }

  return { complete: !polishIncomplete, results, polishIncomplete };
}
