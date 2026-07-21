/**
 * runner.mjs — orchestrates a single auto-loop run end-to-end.
 *
 * Wires together: agent, validation, plan, completion, context, circuit-breaker,
 * session, logger, interrupt, prevent-sleep, backoff, stop-when, polish, worktree.
 *
 * Exports:
 *   - runOnce(opts, _testAgent?) → number  (one of EXIT_CODES)
 */

import { execSync, spawnSync } from 'child_process';
import { mkdirSync, writeFileSync, appendFileSync, existsSync } from 'fs';
import { join } from 'path';

import { EXIT_CODES } from './args.mjs';
import { detectTools, runValidation } from './validation.mjs';
import { calcBudget, countPlanTasks } from './plan.mjs';
import { detectCompletion } from './completion.mjs';
import { buildContext } from './context.mjs';
import { CircuitBreaker } from './circuit-breaker.mjs';
import {
  saveSession,
  loadSession,
  resolvePromptConflict,
} from './session.mjs';
import {
  log,
  logSection,
  openLog,
  logEvent,
  closeLog,
  setTitle,
  restoreTitle,
  serializeError,
} from './logger.mjs';
import {
  installInterruptHandlers,
  uninstallInterruptHandlers,
  isGracefulStop,
  isForceStop,
} from './interrupt.mjs';
import { startPreventSleep, stopPreventSleep } from './prevent-sleep.mjs';
import { withBackoff } from './backoff.mjs';
import { injectStopWhen, checkStopWhen } from './stop-when.mjs';
import { getAgent } from './agents/index.mjs';
import { routeTask } from '../lib/plugin-catalog.mjs';

// ─── Constants ───────────────────────────────────────────────────────────────

const AUTO_DIR = '.auto';
const ENV_FILE = join(AUTO_DIR, 'env.md');
const PROGRESS_FILE = join(AUTO_DIR, 'progress.md');
const ROUTE_FILE = join(AUTO_DIR, 'route.json');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ensureAutoDir() {
  mkdirSync(AUTO_DIR, { recursive: true });
}

function generateRunId() {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = Math.random().toString(36).slice(2, 6);
  return `${ts}-${rand}`;
}

function gitDiffStat() {
  try {
    return execSync('git diff --stat', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return '';
  }
}

function gitDiffSinceBaseline() {
  // Cross-platform: invoke each git command separately via spawnSync so we
  // don't depend on POSIX shell features (`;`, `2>/dev/null`).
  function git(args) {
    const r = spawnSync('git', args, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return r.status === 0 ? (r.stdout || '') : '';
  }
  return [
    git(['diff', 'HEAD', '--name-only']),
    git(['diff', '--name-only']),
    git(['ls-files', '--others', '--exclude-standard']),
  ].join('').trim();
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
${gitDiffStat()}
\`\`\`
`;
  writeFileSync(ENV_FILE, content);
}

function writeProgress(entry) {
  ensureAutoDir();
  const ts = new Date().toISOString().slice(0, 19).replace('T', ' ');
  appendFileSync(PROGRESS_FILE, `\n## ${ts}\n${entry}\n`);
}

function gitCommit(message) {
  try {
    execSync('git add -A', { stdio: 'inherit' });
    // spawnSync (no shell) → safe for arbitrary message text.
    spawnSync('git', ['commit', '-m', message], { stdio: 'inherit' });
    return execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function inferCommitType(task) {
  const m = task.toLowerCase().match(/\b(fix|bug|refactor|feat|add|remove|update)\b/);
  return m ? m[1] : 'feat';
}

// ─── runOnce ─────────────────────────────────────────────────────────────────

/**
 * Run a single auto-loop pass.
 *
 * @param {object} opts parsed CLI options (see args.mjs)
 * @param {object|null} _testAgent optional injected agent adapter (skips getAgent)
 * @returns {Promise<number>} exit code from EXIT_CODES
 */
export async function runOnce(opts, _testAgent = null) {
  const runId = generateRunId();
  const originalCwd = process.cwd();
  let worktreePath = null;

  // Outcome flags — drive the final exit code.
  let taskDone = false;
  let taskBlocked = false;
  let blockedByBreaker = false;
  let blockedByStall = false;
  let tokenCapReached = false;
  let stopWhenMet = false;
  let permanentError = false;
  let retryExhausted = false;
  let polishIncomplete = false;
  let lastError = '';

  function cleanup() {
    try { closeLog(); } catch {}
    try { restoreTitle(); } catch {}
    try { stopPreventSleep(); } catch {}
    try { uninstallInterruptHandlers(); } catch {}
    if (worktreePath) {
      try { process.chdir(originalCwd); } catch {}
      import('./worktree.mjs')
        .then(({ preserveOrCleanup }) => {
          try { preserveOrCleanup && preserveOrCleanup(worktreePath); } catch {}
        })
        .catch(() => {});
    }
  }

  installInterruptHandlers();
  if (opts.preventSleep) startPreventSleep();

  // Worktree (best-effort; missing module is non-fatal).
  if (opts.worktree) {
    try {
      const { createWorktree, slugify } = await import('./worktree.mjs');
      const slug = slugify(opts.task);
      const wt = createWorktree(slug, originalCwd);
      worktreePath = wt && wt.path ? wt.path : null;
      if (worktreePath) process.chdir(worktreePath);
    } catch (err) {
      // worktree.mjs may not be implemented yet (parallel work).
      try { logEvent('worktree.skip', { reason: err.message }); } catch {}
    }
  }

  ensureAutoDir();
  openLog(runId);
  logEvent('run.start', {
    runId,
    task: opts.task,
    agent: opts.agent,
    model: opts.model,
    maxIterations: opts.maxIterations,
    maxTokens: opts.maxTokens,
    stopWhen: opts.stopWhen,
    polish: opts.polish,
    worktree: !!worktreePath,
  });

  setTitle(`auto-loop: ${(opts.task || '').slice(0, 40)}`);

  logSection(`🤖 Auto-Loop — ${opts.task}`);

  const tools = detectTools();
  writeEnvFile(tools, opts.task);
  let routing = null;
  try {
    const composition = await routeTask(opts.task);
    routing = { source: 'auto-loop', composition };
    writeFileSync(ROUTE_FILE, `${JSON.stringify(routing, null, 2)}\n`);
    log(`Routing: ${composition.skills.length ? composition.skills.join(', ') : 'no catalog match'} (risk=${composition.risk})`);
    logEvent('route.resolved', { skills: composition.skills, plugins: composition.plugins.map(plugin => plugin.id), risk: composition.risk });
  } catch (error) {
    log(`Routing unavailable; continuing with core governance: ${error.message}`, '⚠️');
    logEvent('route.error', { error: serializeError(error) });
  }
  log(`Model: ${opts.model}`);
  log(`Tools: test=${tools.test || 'none'}, lint=${tools.lint || 'none'}, build=${tools.build || 'none'}`);

  // Session resume / conflict resolution.
  const saved = loadSession();
  if (saved && typeof saved.prompt === 'string' && saved.prompt !== opts.task) {
    const decision = await resolvePromptConflict(saved, { prompt: opts.task });
    logEvent('session.conflict', { decision, savedPrompt: saved.prompt });
    if (decision === 'quit') {
      log('Quit requested. Exiting.', '🛑');
      cleanup();
      return EXIT_CODES.OK;
    }
    if (decision === 'new-branch') {
      // worktree.mjs handles the actual branch creation; for now log and continue.
      log('new-branch requested — handled by worktree integration; continuing with new task.', '⚠️');
    }
  }

  saveSession({
    prompt: opts.task,
    agent: opts.agent,
    model: opts.model,
    maxTokens: opts.maxTokens,
    stopWhen: opts.stopWhen,
    polish: opts.polish,
    runId,
    iteration: 0,
    taskDone: false,
    taskBlocked: false,
    lastError: '',
    polishIncomplete: false,
  });

  // Resolve agent (allow test injection).
  let agent;
  try {
    agent = _testAgent || (await getAgent(opts.agent));
  } catch (err) {
    log(`Agent resolution failed: ${err.message}`, '🛑');
    logEvent('agent.error', { error: serializeError(err) });
    cleanup();
    return EXIT_CODES.PERMANENT_ERROR;
  }

  const breaker = new CircuitBreaker();
  let maxIterations = opts.maxIterations || calcBudget(opts.task);
  let cumulativeTokens = 0;
  let iteration = 0;
  let lastOutput = '';
  let validationExtensions = 0;

  log(`Max iterations: ${maxIterations}`);
  writeProgress(`# Auto-Loop Started\n**Task:** ${opts.task}\n**Max iterations:** ${maxIterations}${routing ? `\n**Routing:** ${routing.composition.skills.join(', ') || 'no catalog match'}` : ''}`);

  // ── Main loop ──────────────────────────────────────────────────────────────
  while (iteration < maxIterations && !isGracefulStop() && !isForceStop()) {
    iteration++;
    logSection(`Iteration ${iteration}/${maxIterations}`);
    logEvent('iteration.start', { iteration, maxIterations });

    // Plan progress display.
    try {
      const { done, total } = countPlanTasks();
      if (total > 0) log(`Plan: ${done}/${total} tasks done`);
    } catch {}

    // Stall check.
    const stall = breaker.checkStall();
    if (stall.tripped) {
      taskBlocked = true;
      blockedByStall = true;
      lastError = stall.reason;
      log(`⚡ Circuit breaker (stall): ${stall.reason}`, '🛑');
      logEvent('breaker.stall', { reason: stall.reason });
      break;
    }

    // Token cap.
    if (opts.maxTokens > 0 && cumulativeTokens >= opts.maxTokens) {
      tokenCapReached = true;
      log(`Token cap reached: ${cumulativeTokens}/${opts.maxTokens}`, '🛑');
      logEvent('tokens.cap', { cumulativeTokens, cap: opts.maxTokens });
      break;
    }

    // Build prompt.
    let prompt = buildContext(opts, {
      iteration,
      maxIterations,
      lastError,
      lastOutput,
      tools,
    });
    if (opts.stopWhen) prompt = injectStopWhen(prompt, opts.stopWhen);

    // Invoke agent (with backoff for retryable errors).
    log(`Calling ${agent.name || opts.agent}...`);
    let result;
    try {
      result = await withBackoff(
        () => agent.invoke({ prompt, model: opts.model }),
        agent,
      );
    } catch (err) {
      const errText = err && err.message ? err.message : String(err);
      logEvent('agent.error', { error: serializeError(err) });
      // Permanent or exhausted retries — bail.
      if (/Retry exhausted/i.test(errText)) {
        retryExhausted = true;
      } else {
        permanentError = true;
      }
      lastError = errText;
      break;
    }

    const output = (result && result.output) || '';
    const stderrText = (result && result.error) || '';
    lastOutput = output;

    // Token accounting.
    if (result && result.tokens) {
      const inT = Number(result.tokens.input) || 0;
      const outT = Number(result.tokens.output) || 0;
      cumulativeTokens += inT + outT;
    }

    logEvent('agent.result', {
      iteration,
      status: result ? result.status : null,
      tokens: (result && result.tokens) || null,
      cumulativeTokens,
      outputLength: output.length,
    });

    if (stderrText && stderrText.trim()) {
      log(`Agent stderr: ${stderrText.trim().slice(0, 200)}`, '⚠️');
    }

    if (opts.verbose) {
      console.log('\n--- Agent Output ---\n', output, '\n---');
    } else {
      log(`Output: ${output.split('\n').length} lines, ${output.length} chars`);
    }

    writeProgress(`**Iteration ${iteration}:** ${output.slice(0, 200).replace(/\n/g, ' ')}...`);

    // stop-when check.
    if (opts.stopWhen) {
      const sw = checkStopWhen(output);
      if (sw === true) {
        stopWhenMet = true;
        taskDone = true;
        log(`Stop-when condition met: ${opts.stopWhen}`);
        logEvent('stop-when.met', { condition: opts.stopWhen });
        break;
      }
    }

    // Completion / blocked detection.
    const completion = detectCompletion(output);
    if (completion.blocked) {
      taskBlocked = true;
      lastError = completion.reason;
      log(`Blocked: ${completion.reason}`, '🛑');
      logEvent('completion.blocked', { reason: completion.reason });
      break;
    }

    if (completion.done) {
      // Verify plan + diff before accepting.
      let pending = { done: 0, total: 0 };
      try { pending = countPlanTasks(); } catch {}
      if (pending.total > 0 && pending.done < pending.total) {
        log(`Agent said done but plan has ${pending.total - pending.done} pending tasks — continuing`);
        logEvent('completion.deferred', { reason: 'pending plan tasks', pending });
        continue;
      }
      const changed = gitDiffSinceBaseline();
      if (iteration === 1 && !changed) {
        log('Agent said done on iter 1 with no file changes — continuing');
        logEvent('completion.deferred', { reason: 'no diff on iter 1' });
        continue;
      }
      taskDone = true;
      log(`✅ Task complete: ${completion.reason}`);
      logEvent('completion.done', { reason: completion.reason });
      break;
    }

    // Validation.
    if (tools.lint || tools.test || tools.typecheck) {
      const tier = iteration === maxIterations ? 'final' : 'intermediate';
      log(`Validation (${tier})...`);
      const val = runValidation(tools, tier);
      if (!val.ok) {
        lastError = val.feedback;
        log(`Validation failed: ${val.feedback.slice(0, 100)}`, '⚠️');
        logEvent('validation.fail', { tier, feedback: val.feedback.slice(0, 500) });

        const cb = breaker.recordError(val.feedback);
        if (cb.tripped) {
          taskBlocked = true;
          blockedByBreaker = true;
          lastError = cb.reason;
          log(cb.reason, '🛑');
          logEvent('breaker.tripped', { reason: cb.reason });
          break;
        }

        if (tier === 'final' && validationExtensions < 1) {
          maxIterations += 2;
          validationExtensions++;
          log(`Extended budget to ${maxIterations} due to validation failure`);
          logEvent('budget.extended', { newMax: maxIterations });
        }
        continue;
      }
      log('Validation passed ✅');
      logEvent('validation.ok', { tier });
      lastError = '';
      breaker.reset();
    }
  }

  // Why did the loop exit?
  const userInterrupted = isGracefulStop() || isForceStop();

  logSection(
    taskDone
      ? '✅ Done'
      : taskBlocked
        ? '🛑 Blocked'
        : tokenCapReached
          ? '💸 Token cap'
          : userInterrupted
            ? '⏸️ Interrupted'
            : permanentError
              ? '💥 Permanent error'
              : retryExhausted
                ? '⏳ Retry exhausted'
                : '⏱️ Budget exhausted',
  );

  // Final validation if marked done.
  if (taskDone && (tools.lint || tools.test || tools.build)) {
    log('Running final validation...');
    const finalVal = runValidation(tools, 'final');
    if (!finalVal.ok) {
      log('Final validation failed. Task marked incomplete.', '⚠️');
      logEvent('validation.final.fail', { feedback: finalVal.feedback.slice(0, 500) });
      taskDone = false;
      taskBlocked = true;
      lastError = finalVal.feedback;
    } else {
      log('Final validation passed ✅');
      logEvent('validation.final.ok', {});
    }
  }

  // Polish pass — dynamic import so missing/incomplete polish.mjs doesn't crash.
  if (opts.polish && opts.polish !== 'none' && taskDone) {
    try {
      const { runPolishPass } = await import('./polish.mjs');
      const changedFiles = gitDiffSinceBaseline()
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);
      const polishResult = await runPolishPass(opts.polish, agent, changedFiles, opts);
      if (polishResult && polishResult.complete === false) {
        polishIncomplete = true;
      }
      logEvent('polish.done', { result: polishResult || null });
    } catch (err) {
      logEvent('polish.skip', { reason: err.message });
    }
  }

  // Commit on success.
  let commitHash = null;
  if (taskDone && !opts.noCommit) {
    const taskWords = opts.task.split(/\s+/).slice(0, 8).join(' ');
    const commitType = inferCommitType(opts.task);
    const message = `${commitType}: ${taskWords} [auto-loop]`;
    log(`Committing: ${message}`);
    commitHash = gitCommit(message);
    if (commitHash) {
      log(`Commit: ${commitHash}`);
      logEvent('commit.ok', { hash: commitHash, message });
      if (opts.push) {
        try {
          execSync('git push', { stdio: 'inherit' });
          log('Pushed ✅');
          logEvent('push.ok', {});
        } catch (err) {
          log('Push failed', '⚠️');
          logEvent('push.fail', { reason: err.message });
        }
      }
    } else {
      logEvent('commit.skip', { reason: 'nothing to commit or git error' });
    }
  }

  // Persist final session state.
  try {
    saveSession({
      prompt: opts.task,
      agent: opts.agent,
      model: opts.model,
      maxTokens: opts.maxTokens,
      stopWhen: opts.stopWhen,
      polish: opts.polish,
      runId,
      iteration,
      taskDone,
      taskBlocked,
      lastError: lastError || '',
      polishIncomplete,
    });
  } catch {}

  // Final report.
  const { done, total } = (() => { try { return countPlanTasks(); } catch { return { done: 0, total: 0 }; } })();
  const changedFiles = gitDiffSinceBaseline();
  console.log(`
${'═'.repeat(60)}
  Final Report
${'═'.repeat(60)}
Task:       ${opts.task}
Status:     ${taskDone ? '✅ Complete' : taskBlocked ? '🛑 Blocked' : tokenCapReached ? '💸 Token cap' : userInterrupted ? '⏸️ Interrupted' : '⏱️ Budget Exhausted'}
Iterations: ${iteration}/${maxIterations}
Plan:       ${done}/${total} tasks done
Files:      ${changedFiles ? changedFiles.split('\n').filter(Boolean).length + ' changed' : 'none'}
Commit:     ${commitHash || 'none'}
Logs:       .auto/progress.md
Plan:       .auto/plan.md
Run ID:     ${runId}
`);

  if (!taskDone && lastError) {
    console.log(`Reason: ${lastError.slice(0, 500)}`);
  }

  logEvent('run.end', {
    taskDone,
    taskBlocked,
    tokenCapReached,
    userInterrupted,
    permanentError,
    retryExhausted,
    polishIncomplete,
    iteration,
    cumulativeTokens,
    commitHash,
  });

  // Compute final exit code (used by status.json and the runner return).
  // Order of precedence matches the original runner logic.
  const finalCode = userInterrupted
    ? EXIT_CODES.INTERRUPTED
    : permanentError
      ? EXIT_CODES.PERMANENT_ERROR
      : retryExhausted
        ? EXIT_CODES.RETRY_EXHAUSTED
        : tokenCapReached
          ? EXIT_CODES.TOKEN_CAP
          : blockedByBreaker || taskBlocked
            ? EXIT_CODES.SAME_ERROR_REPEATED
            : blockedByStall
              ? EXIT_CODES.STALL
              : polishIncomplete
                ? EXIT_CODES.POLISH_INCOMPLETE
                : taskDone
                  ? EXIT_CODES.OK
                  : EXIT_CODES.STALL; // budget-exhausted fallback

  // Write structured status for parallel parent / external tooling to consume.
  // Lives in the SAME .auto/runs/<runId>/ dir as the JSONL debug log.
  try {
    const statusPath = join(AUTO_DIR, 'runs', runId, 'status.json');
    writeFileSync(statusPath, JSON.stringify({
      runId,
      task: opts.task,
      agent: opts.agent,
      iterations: iteration,
      commits: commitHash ? 1 : 0,
      commitHash,
      taskDone,
      taskBlocked,
      tokenCapReached,
      userInterrupted,
      permanentError,
      retryExhausted,
      polishIncomplete,
      cumulativeTokens,
      exitCode: finalCode,
      worktreePath,
      endedAt: new Date().toISOString(),
    }, null, 2));
    logEvent('status.written', { path: statusPath });
  } catch (err) {
    logEvent('status.error', { reason: err.message });
  }

  cleanup();
  return finalCode;
}
