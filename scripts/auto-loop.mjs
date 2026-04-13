#!/usr/bin/env node
/**
 * auto-loop.mjs — Autonomous coding loop for Dev Team Kit
 *
 * Identical to Ralph-starter's architecture: runs claude --print in a
 * subprocess loop, feeds errors back, detects completion, runs tiered
 * validation, and only stops when the task is done and tests pass.
 *
 * Usage:
 *   node scripts/auto-loop.mjs "task description" [options]
 *   node .bot/scripts/auto-loop.mjs "task description" [options]
 *
 * Options:
 *   --max-iterations N   Override max iterations (default: auto)
 *   --validate           Run full validation after each iteration
 *   --no-commit          Skip auto-commit when done
 *   --model MODEL        Claude model (default: claude-sonnet-4-5)
 *   --push               Push after commit
 *   --verbose            Show full Claude output
 */

import { spawnSync, execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

// ─── Config ──────────────────────────────────────────────────────────────────

const AUTO_DIR = '.auto';
const PLAN_FILE = join(AUTO_DIR, 'plan.md');
const PROGRESS_FILE = join(AUTO_DIR, 'progress.md');
const ENV_FILE = join(AUTO_DIR, 'env.md');
const SESSION_FILE = join(AUTO_DIR, 'session.json');

const COMPLETION_MARKERS = [
  'EXIT_SIGNAL: true',
  '<TASK_DONE>',
  '<TASK_COMPLETE>',
  'TASK_COMPLETE',
  'All tasks completed',
  'Successfully completed all',
  'Implementation complete',
];

const BLOCKED_MARKERS = [
  'TASK_BLOCKED',
  'Cannot proceed without',
  'Blocked:',
  'need clarification',
  'need more information',
];

const COMPLETION_PATTERNS = [
  { pattern: /implementation is complete/i, score: 0.9 },
  { pattern: /all tests pass/i, score: 0.85 },
  { pattern: /task is done/i, score: 0.9 },
  { pattern: /ready for review/i, score: 0.75 },
  { pattern: /successfully implemented/i, score: 0.8 },
  { pattern: /commit.*created/i, score: 0.85 },
  { pattern: /\bdone\b|\bfinished\b|\bcomplete\b/i, score: 0.5 },
];

const STUCK_PATTERNS = [
  { pattern: /cannot proceed/i, score: 0.9 },
  { pattern: /stuck on/i, score: 0.8 },
  { pattern: /infinite loop/i, score: 0.95 },
  { pattern: /same error/i, score: 0.7 },
];

// ─── CLI Parsing ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const taskArg = args.find(a => !a.startsWith('--'));

if (!taskArg) {
  console.error('Usage: node scripts/auto-loop.mjs "task description" [options]');
  console.error('Options: --max-iterations N | --validate | --no-commit | --model MODEL | --push | --verbose');
  process.exit(1);
}

const opts = {
  task: taskArg,
  maxIterations: parseInt(args[args.indexOf('--max-iterations') + 1]) || 0,
  validate: args.includes('--validate'),
  noCommit: args.includes('--no-commit'),
  model: args[args.indexOf('--model') + 1] || 'claude-sonnet-4-5',
  push: args.includes('--push'),
  verbose: args.includes('--verbose'),
};

// ─── Utilities ───────────────────────────────────────────────────────────────

function log(msg, prefix = '→') {
  console.log(`${prefix} ${msg}`);
}

function logSection(title) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(60)}`);
}

function ensureAutoDir() {
  mkdirSync(AUTO_DIR, { recursive: true });
}

function readFile(path) {
  try { return readFileSync(path, 'utf-8'); } catch { return ''; }
}

function writeProgress(entry) {
  ensureAutoDir();
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  appendFileSync(PROGRESS_FILE, `\n## ${timestamp}\n${entry}\n`);
}

function saveSession(data) {
  ensureAutoDir();
  writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
}

function loadSession() {
  try { return JSON.parse(readFileSync(SESSION_FILE, 'utf-8')); } catch { return {}; }
}

// ─── Environment Detection ───────────────────────────────────────────────────

function detectTools() {
  const tools = { test: null, lint: null, typecheck: null, build: null, manager: 'node' };

  if (existsSync('package.json')) {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
    const scripts = pkg.scripts || {};
    if (scripts.test) tools.test = 'npm test';
    if (scripts.lint) tools.lint = 'npm run lint';
    if (scripts.typecheck) tools.typecheck = 'npm run typecheck';
    else if (scripts['type-check']) tools.typecheck = 'npm run type-check';
    if (scripts.build) tools.build = 'npm run build';

    // detect test framework
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if (deps.vitest) tools.test = 'npx vitest run';
    else if (deps.jest) tools.test = 'npx jest --passWithNoTests';

    // detect package manager
    if (existsSync('pnpm-lock.yaml')) {
      tools.manager = 'pnpm';
      if (scripts.test) tools.test = 'pnpm test';
      if (scripts.lint) tools.lint = 'pnpm lint';
      if (scripts.typecheck) tools.typecheck = 'pnpm typecheck';
      else if (scripts['type-check']) tools.typecheck = 'pnpm type-check';
      if (scripts.build) tools.build = 'pnpm build';
    } else if (existsSync('yarn.lock')) {
      tools.manager = 'yarn';
      if (scripts.test) tools.test = 'yarn test';
    }
  }

  if (existsSync('pyproject.toml') || existsSync('pytest.ini') || existsSync('setup.py')) {
    tools.test = tools.test || 'python -m pytest';
    tools.manager = 'python';
  }

  if (existsSync('Cargo.toml')) {
    tools.test = 'cargo test';
    tools.build = 'cargo build';
    tools.manager = 'cargo';
  }

  if (existsSync('go.mod')) {
    tools.test = 'go test ./...';
    tools.build = 'go build ./...';
    tools.manager = 'go';
  }

  if (existsSync('Makefile')) {
    try {
      const targets = execSync('make -qp 2>/dev/null | grep "^[a-z]" | head -20', { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] });
      if (targets.includes('test')) tools.test = tools.test || 'make test';
      if (targets.includes('lint')) tools.lint = tools.lint || 'make lint';
      if (targets.includes('build')) tools.build = tools.build || 'make build';
    } catch {}
  }

  return tools;
}

function writeEnvFile(tools, taskDesc) {
  ensureAutoDir();
  const content = `# Auto-Loop Environment
**Task:** ${taskDesc}
**Started:** ${new Date().toISOString()}

## Detected Tools
- Test: ${tools.test || 'none'}
- Lint: ${tools.lint || 'none'}
- Typecheck: ${tools.typecheck || 'none'}
- Build: ${tools.build || 'none'}
- Package manager: ${tools.manager}

## Git Baseline
\`\`\`
${gitDiff()}
\`\`\`
`;
  writeFileSync(ENV_FILE, content);
}

// ─── Git Helpers ─────────────────────────────────────────────────────────────

function gitDiff(args = '--stat') {
  try { return execSync(`git diff ${args}`, { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] }).trim(); } catch { return ''; }
}

function gitDiffSinceBaseline() {
  // Changed files since loop started (both staged and unstaged)
  try { return execSync('git diff HEAD --name-only 2>/dev/null; git diff --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null', { encoding: 'utf-8', stdio: ['pipe','pipe','pipe'] }).trim(); } catch { return ''; }
}

function gitCommit(message) {
  try {
    execSync('git add -A', { stdio: 'inherit' });
    // Use spawnSync to avoid shell injection via task description in commit message
    spawnSync('git', ['commit', '-m', message], { stdio: 'inherit' });
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch (e) {
    return null;
  }
}

// ─── Plan Helpers ─────────────────────────────────────────────────────────────

function countPlanTasks() {
  const plan = readFile(PLAN_FILE);
  if (!plan) return { done: 0, total: 0 };
  const done = (plan.match(/- \[x\]/gi) || []).length;
  const pending = (plan.match(/- \[ \]/g) || []).length;
  return { done, total: done + pending };
}

function hasPendingTasks() {
  const { done, total } = countPlanTasks();
  return total > 0 && done < total;
}

function calcBudget(taskDesc) {
  // Estimate complexity from task description length and keywords
  const words = taskDesc.split(' ').length;
  const complexKeywords = ['crud', 'auth', 'refactor', 'migrate', 'integration', 'system', 'module'];
  const isComplex = complexKeywords.some(k => taskDesc.toLowerCase().includes(k));
  if (words > 30 || isComplex) return 15;
  if (words > 15) return 12;
  return 8;
}

// ─── Error Deduplication ─────────────────────────────────────────────────────

function normalizeError(err) {
  return err
    .replace(/:\d+:\d+/g, ':N:N')          // line:col numbers
    .replace(/:\d+/g, ':N')                 // line numbers
    .replace(/0x[0-9a-f]+/gi, '<addr>')     // hex addresses
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z]+/g, '<ts>') // ISO timestamps
    .replace(/\d{10,}/g, '<num>')           // long numbers (timestamps, pids)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 300);
}

function hashError(err) {
  return createHash('md5').update(normalizeError(err)).digest('hex').slice(0, 8);
}

// ─── Claude Invocation ───────────────────────────────────────────────────────

function runClaude(prompt, model) {
  const result = spawnSync('claude', ['--print', '--model', model, prompt], {
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 300_000, // 5 min
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  if (result.error) {
    // Try without --model flag (older Claude CLI versions)
    const fallback = spawnSync('claude', ['--print', prompt], {
      encoding: 'utf-8',
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300_000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return { output: fallback.stdout || '', error: fallback.stderr || '', status: fallback.status };
  }

  return { output: result.stdout || '', error: result.stderr || '', status: result.status };
}

// ─── Completion Detection ────────────────────────────────────────────────────

function detectCompletion(output) {
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

// ─── Validation ───────────────────────────────────────────────────────────────

function runCommand(cmd, timeout = 60_000) {
  try {
    const out = execSync(cmd, { encoding: 'utf-8', timeout, stdio: ['pipe','pipe','pipe'] });
    return { ok: true, output: out };
  } catch (e) {
    return { ok: false, output: e.stdout || '', error: e.stderr || e.message || '' };
  }
}

function runValidation(tools, tier = 'intermediate') {
  const results = [];

  // Lint always (fast)
  if (tools.lint) {
    log(`Running lint: ${tools.lint}`);
    const r = runCommand(tools.lint, 30_000);
    results.push({ name: 'lint', ...r });
    if (!r.ok) return { ok: false, results, feedback: `Lint failed:\n${r.error}` };
  }

  // Typecheck on intermediate+
  if (tools.typecheck && tier !== 'lint-only') {
    log(`Running typecheck: ${tools.typecheck}`);
    const r = runCommand(tools.typecheck, 60_000);
    results.push({ name: 'typecheck', ...r });
    if (!r.ok) return { ok: false, results, feedback: `Typecheck failed:\n${r.error}` };
  }

  // Tests
  if (tools.test) {
    log(`Running tests: ${tools.test}`);
    const r = runCommand(tools.test, 120_000);
    results.push({ name: 'test', ...r });
    if (!r.ok) return { ok: false, results, feedback: `Tests failed:\n${r.error}` };
  }

  // Build only on final
  if (tools.build && tier === 'final') {
    log(`Running build: ${tools.build}`);
    const r = runCommand(tools.build, 120_000);
    results.push({ name: 'build', ...r });
    if (!r.ok) return { ok: false, results, feedback: `Build failed:\n${r.error}` };
  }

  return { ok: true, results };
}

// ─── Context Building ─────────────────────────────────────────────────────────

function buildContext(opts, state) {
  const { task, model } = opts;
  const { iteration, maxIterations, lastError, lastOutput, tools } = state;

  const plan = readFile(PLAN_FILE);
  const progress = readFile(PROGRESS_FILE);
  const repoAudit = readFile('docs/repo-audit/current.md') || readFile('.bot/docs/repo-audit/current.md');

  const kitInstructions = `
## Kit Instructions
- Follow policies in policies/ or .bot/policies/
- Use search-first: search the codebase before implementing
- Source-driven: base decisions on actual code, not assumptions
- Anti-rationalization: do not take shortcuts; fix properly
- Write actual code, not placeholders
- After implementing, write EXIT_SIGNAL: true on its own line when fully done
`.trim();

  // Tier 1: first 2 iterations — full context
  if (iteration <= 2) {
    return [
      `# Autonomous Task\n\n${task}`,
      kitInstructions,
      repoAudit ? `## Repo Context\n${repoAudit.slice(0, 2000)}` : '',
      plan ? `## Current Plan\n${plan}` : '## Plan\nNo plan yet — create .auto/plan.md with your implementation plan using checkboxes (- [ ] task)',
      tools.test ? `## Test Command\n${tools.test}` : '',
      lastError ? `## Last Error (fix this)\n\`\`\`\n${lastError.slice(0, 1500)}\n\`\`\`` : '',
    ].filter(Boolean).join('\n\n');
  }

  // Tier 2: iterations 3-5 — focused context
  if (iteration <= 5) {
    const { done, total } = countPlanTasks();
    return [
      `# Autonomous Task (iteration ${iteration}/${maxIterations})\n\n${task}`,
      kitInstructions,
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
    lastError ? `## Fix this error:\n\`\`\`\n${lastError.slice(0, 2000)}\n\`\`\`` : 'Continue implementing. Mark tasks [x] as you complete them.',
    'Write EXIT_SIGNAL: true when all tasks are [x] and tests pass.',
  ].filter(Boolean).join('\n\n');
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

class CircuitBreaker {
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
      return { tripped: true, reason: `Same error repeated ${this.errorCounts[h]}x: ${normalizeError(error).slice(0, 100)}` };
    }
    return { tripped: false };
  }

  checkStall() {
    const changed = gitDiffSinceBaseline();
    // Skip stall detection on first iteration (planning phase may not produce file changes)
    if (this.lastChangedFiles === null) {
      this.lastChangedFiles = changed;
      return { tripped: false };
    }
    if (changed === this.lastChangedFiles) {
      this.stallCount++;
      if (this.stallCount >= this.maxStall) {
        return { tripped: true, reason: `Stall: ${this.stallCount} iterations with no file changes` };
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

// ─── Main Loop ────────────────────────────────────────────────────────────────

async function main() {
  logSection(`🤖 Auto-Loop — ${opts.task}`);

  // Setup
  ensureAutoDir();
  const tools = detectTools();
  writeEnvFile(tools, opts.task);

  log(`Model: ${opts.model}`);
  log(`Tools: test=${tools.test || 'none'}, lint=${tools.lint || 'none'}, build=${tools.build || 'none'}`);

  const maxIterations = opts.maxIterations || calcBudget(opts.task);
  log(`Max iterations: ${maxIterations}`);

  writeProgress(`# Auto-Loop Started\n**Task:** ${opts.task}\n**Max iterations:** ${maxIterations}`);

  const breaker = new CircuitBreaker();
  let iteration = 0;
  let lastError = '';
  let lastOutput = '';
  let validationExtensions = 0;
  let currentMax = maxIterations;
  let taskDone = false;
  let taskBlocked = false;
  let commitHash = null;

  // ── Loop ────────────────────────────────────────────────────────────────────
  while (iteration < currentMax) {
    iteration++;
    logSection(`Iteration ${iteration}/${currentMax}`);

    // Plan progress check
    const { done, total } = countPlanTasks();
    if (total > 0) log(`Plan: ${done}/${total} tasks done`);

    // Stall check
    const stall = breaker.checkStall();
    if (stall.tripped) {
      taskBlocked = true;
      lastError = stall.reason;
      log(`⚡ Circuit breaker: ${stall.reason}`, '🛑');
      break;
    }

    // Build context
    const prompt = buildContext(opts, { iteration, maxIterations: currentMax, lastError, lastOutput, tools });

    // Run Claude
    log(`Calling Claude (${opts.model})...`);
    const { output, error: claudeErr } = runClaude(prompt, opts.model);

    if (claudeErr && claudeErr.trim()) {
      log(`Claude stderr: ${claudeErr.trim().slice(0, 200)}`, '⚠️');
    }

    if (opts.verbose) console.log('\n--- Claude Output ---\n', output, '\n---');
    else log(`Output: ${output.split('\n').length} lines, ${output.length} chars`);

    lastOutput = output;

    // Log progress
    writeProgress(`**Iteration ${iteration}:** ${output.slice(0, 200).replace(/\n/g, ' ')}...`);

    // Completion detection
    const completion = detectCompletion(output);

    if (completion.blocked) {
      taskBlocked = true;
      lastError = completion.reason;
      log(`Blocked: ${completion.reason}`, '🛑');
      break;
    }

    // Intermediate validation (lint only, fast)
    let validationFeedback = '';
    if (tools.lint || tools.test) {
      const tier = iteration === currentMax ? 'final' : 'intermediate';
      log(`Validation (${tier})...`);
      const val = runValidation(tools, tier);
      if (!val.ok) {
        validationFeedback = val.feedback;
        lastError = val.feedback;
        log(`Validation failed: ${val.feedback.slice(0, 100)}`, '⚠️');

        // Circuit breaker on error
        const cb = breaker.recordError(val.feedback);
        if (cb.tripped) {
          taskBlocked = true;
          lastError = cb.reason;
          log(cb.reason, '🛑');
          break;
        }

        // Extend budget if build fails on final iteration
        if (tier === 'final' && validationExtensions < 1) {
          currentMax += 2;
          validationExtensions++;
          log(`Extended budget to ${currentMax} due to validation failure`);
        }

        continue; // next iteration with error as feedback
      } else {
        log(`Validation passed ✅`);
        lastError = ''; // clear error on success
        breaker.reset();
      }
    }

    // Completion override: check plan before accepting "done" signal
    if (completion.done) {
      const pending = countPlanTasks();
      if (pending.total > 0 && pending.done < pending.total) {
        log(`Agent said done but plan has ${pending.total - pending.done} pending tasks — continuing`);
        continue;
      }

      // Also check: first iteration with "done" but no files changed = not really done
      const changed = gitDiffSinceBaseline();
      if (iteration === 1 && !changed) {
        log(`Agent said done on iter 1 with no file changes — continuing`);
        continue;
      }

      taskDone = true;
      log(`✅ Task complete: ${completion.reason}`);
      break;
    }
  }

  // ── Post-loop ────────────────────────────────────────────────────────────────
  logSection(taskDone ? '✅ Done' : taskBlocked ? '🛑 Blocked' : '⏱️ Budget Exhausted');

  // Final validation if done
  if (taskDone && (tools.lint || tools.test || tools.build)) {
    log('Running final validation...');
    const finalVal = runValidation(tools, 'final');
    if (!finalVal.ok) {
      log(`Final validation failed. Task marked incomplete.`, '⚠️');
      taskDone = false;
      taskBlocked = true;
      lastError = finalVal.feedback;
    } else {
      log('Final validation passed ✅');
    }
  }

  // Commit
  if (taskDone && !opts.noCommit) {
    const taskWords = opts.task.split(' ').slice(0, 8).join(' ');
    const commitType = opts.task.toLowerCase().match(/\b(fix|bug|refactor|feat|add|remove|update)\b/)?.[1] || 'feat';
    const message = `${commitType}: ${taskWords} [auto-loop]`;
    log(`Committing: ${message}`);
    commitHash = gitCommit(message);
    if (commitHash) {
      log(`Commit: ${commitHash}`);
      if (opts.push) {
        try { execSync('git push', { stdio: 'inherit' }); log('Pushed ✅'); } catch { log('Push failed', '⚠️'); }
      }
    }
  }

  // Final report
  const { done, total } = countPlanTasks();
  const changedFiles = gitDiffSinceBaseline();

  console.log(`
${'═'.repeat(60)}
  Final Report
${'═'.repeat(60)}
Task:       ${opts.task}
Status:     ${taskDone ? '✅ Complete' : taskBlocked ? '🛑 Blocked' : '⏱️ Budget Exhausted'}
Iterations: ${iteration}/${currentMax}
Plan:       ${done}/${total} tasks done
Files:      ${changedFiles ? changedFiles.split('\n').length + ' changed' : 'none'}
Commit:     ${commitHash || 'none'}
Logs:       .auto/progress.md
Plan:       .auto/plan.md
`);

  if (!taskDone) {
    console.log(`Blocked reason: ${lastError}`);
    console.log('\nTo resume: fix the issue and run auto-loop again.');
    console.log('Context is in .auto/progress.md and .auto/plan.md');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
