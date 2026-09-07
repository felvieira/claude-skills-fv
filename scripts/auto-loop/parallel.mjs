/**
 * parallel.mjs — orchestrate N runners concurrently in separate worktrees.
 *
 * Each task spawns `node scripts/auto-loop/index.mjs --worktree <task> [flags]`
 * as a child process. stdout / stderr are streamed back, prefixed with the
 * task slug, and a final consolidated table is printed.
 *
 * The child spawner is injectable (`opts._spawn`) so tests can exercise the
 * orchestration without invoking real agents.
 */

import { spawn as realSpawn } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname, basename } from 'path';

import { slugify } from './worktree.mjs';
import { EXIT_CODES } from './args.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const INDEX_ENTRY = resolve(__dirname, 'index.mjs');

/**
 * Build the argv array for a child runner from parent opts + task string.
 * Pure helper, exported for tests.
 */
export function buildChildArgs(opts, task) {
  const args = [INDEX_ENTRY, '--worktree', task];

  // Default model is the same source of truth as args.mjs: $CLAUDE_LOOP_MODEL
  // if set, else the hardcoded fallback. Comparing against the fallback alone
  // (ignoring the env var) would make this always re-pass --model when the
  // env var is set — harmless (the child inherits the same env var anyway)
  // but redundant, so check both.
  const defaultModel = process.env.CLAUDE_LOOP_MODEL || 'claude-sonnet-4-5';
  if (opts.agent && opts.agent !== 'claude') args.push('--agent', String(opts.agent));
  if (opts.model && opts.model !== defaultModel) args.push('--model', String(opts.model));
  if (opts.maxIterations) args.push('--max-iterations', String(opts.maxIterations));
  if (opts.maxTokens) args.push('--max-tokens', String(opts.maxTokens));
  if (opts.stopWhen) args.push('--stop-when', String(opts.stopWhen));
  if (opts.contract) args.push('--contract', String(opts.contract));
  if (opts.polish && opts.polish !== 'standard') args.push('--polish', String(opts.polish));
  if (opts.validate) args.push('--validate');
  if (opts.noCommit) args.push('--no-commit');
  if (opts.push) args.push('--push');
  if (opts.verbose) args.push('--verbose');
  if (opts.preventSleep === false) args.push('--no-prevent-sleep');

  return args;
}

/**
 * Status label for one child run.
 *
 * ESCALATED (8) is deliberately not shown as a failure: the contract's
 * escalate_when fired, which is the guardrail working as designed and asking
 * for a human decision. Rendering it as FAIL(8) next to a genuine crash makes
 * the reader triage the wrong thing — "three broke" and "three are waiting on
 * you" call for different responses.
 */
function formatStatus(r) {
  if (r.exitCode === 0) return 'OK';
  if (r.exitCode === EXIT_CODES.ESCALATED) return 'ESCALATED';
  return `FAIL(${r.exitCode})`;
}

/**
 * Format the final results table.
 * Pure helper, exported for tests.
 */
export function formatSummary(results) {
  const headers = ['slug', 'status', 'iters', 'commits', 'path'];
  const rows = results.map((r) => [
    r.slug,
    formatStatus(r),
    String(r.iterations ?? '-'),
    String(r.commits ?? '-'),
    r.path ?? '-',
  ]);
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((row) => row[i].length))
  );
  const fmt = (cells) =>
    cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  const sep = widths.map((w) => '-'.repeat(w)).join('  ');
  return [fmt(headers), sep, ...rows.map(fmt)].join('\n');
}

/**
 * Run N tasks in parallel. Each task gets its own worktree + log line prefix.
 *
 * opts:
 *   tasks       string[]   — task descriptions
 *   parallel    number     — N (must equal tasks.length, validated by args.mjs)
 *   worktree    boolean    — must be true
 *   agent/model/... pass-through flags for child runners
 *   _spawn      function   — optional injection for tests
 *   _stdout     stream     — optional injection for tests (default process.stdout)
 *   _stderr     stream     — optional injection for tests (default process.stderr)
 *
 * @returns { exitCode, results }
 */
export async function runParallel(opts) {
  if (!opts || !Array.isArray(opts.tasks) || opts.tasks.length === 0) {
    throw new Error('runParallel: opts.tasks is required');
  }
  if (!opts.worktree) {
    throw new Error('runParallel: --worktree is required');
  }

  const N = Math.min(opts.parallel || opts.tasks.length, opts.tasks.length);
  const tasks = opts.tasks.slice(0, N);
  const spawnFn = opts._spawn || realSpawn;
  const stdout = opts._stdout || process.stdout;
  const stderr = opts._stderr || process.stderr;

  // Pre-compute slugs and disambiguate duplicates so prefixes stay readable.
  const slugs = [];
  const seen = new Map();
  for (const t of tasks) {
    let s = slugify(t);
    const count = seen.get(s) || 0;
    seen.set(s, count + 1);
    if (count > 0) s = `${s}-${count + 1}`;
    slugs.push(s);
  }

  stdout.write(`[parallel] Launching ${tasks.length} runners…\n`);

  const runners = tasks.map((task, idx) =>
    runOne({ task, slug: slugs[idx], opts, spawnFn, stdout, stderr })
  );

  const results = await Promise.all(runners);

  // Consolidated summary.
  stdout.write('\n[parallel] Summary:\n');
  stdout.write(formatSummary(results) + '\n');

  // Aggregate exit code: a genuine failure outranks an escalation, even though
  // ESCALATED (8) is numerically higher. Plain Math.max would let one task
  // asking for a human decision hide another task that actually crashed, from
  // anything scripting against this process's exit code.
  const codes = results.map((r) => r.exitCode || 0);
  const realFailure = codes.find((c) => c !== 0 && c !== EXIT_CODES.ESCALATED);
  const exitCode = realFailure ?? (codes.includes(EXIT_CODES.ESCALATED) ? EXIT_CODES.ESCALATED : 0);
  return { exitCode, results };
}

function runOne({ task, slug, opts, spawnFn, stdout, stderr }) {
  return new Promise((resolvePromise) => {
    const args = buildChildArgs(opts, task);
    const prefix = `[${slug}] `;

    let child;
    try {
      child = spawnFn(process.execPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (err) {
      stderr.write(`${prefix}spawn failed: ${err.message}\n`);
      resolvePromise({ slug, task, exitCode: 99, path: null, iterations: null, commits: null });
      return;
    }

    if (child.stdout) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => writePrefixed(stdout, prefix, chunk));
    }
    if (child.stderr) {
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (chunk) => writePrefixed(stderr, prefix, chunk));
    }

    child.on('error', (err) => {
      stderr.write(`${prefix}error: ${err.message}\n`);
    });

    child.on('close', (code) => {
      const status = readChildStatus(slug, opts);
      resolvePromise({
        slug,
        task,
        exitCode: code ?? 0,
        path: status?.worktreePath ?? null,
        iterations: status?.iterations ?? null,
        commits: status?.commits ?? null,
      });
    });
  });
}

/**
 * After a child runner exits, read its `.auto/runs/<runId>/status.json`
 * (most recent) so the parallel summary can show real iters/commits/path
 * instead of `-` placeholders.
 *
 * Returns null if anything is missing — callers must tolerate that.
 */
function readChildStatus(slug, opts) {
  try {
    // Worktree layout: <baseRepo>-auto-worktrees/<slug>
    const baseRepo = resolve(opts.cwd || process.cwd());
    const wtBase = resolve(dirname(baseRepo), `${basename(baseRepo)}-auto-worktrees`);
    const wtPath = resolve(wtBase, slug);
    const runsDir = resolve(wtPath, '.auto', 'runs');
    if (!existsSync(runsDir)) return null;
    const dirs = readdirSync(runsDir).sort().reverse();
    for (const d of dirs) {
      const sp = resolve(runsDir, d, 'status.json');
      if (existsSync(sp)) {
        return JSON.parse(readFileSync(sp, 'utf-8'));
      }
    }
  } catch {
    // best-effort — null tolerated by formatSummary
  }
  return null;
}

function writePrefixed(stream, prefix, chunk) {
  // Split on newlines so each output line gets the prefix.
  const text = String(chunk);
  const lines = text.split(/(\r?\n)/);
  // Re-emit, prefixing only at line starts. Track whether the previous chunk
  // ended without newline by checking the last "real" segment.
  let buf = '';
  let atLineStart = true;
  for (const part of lines) {
    if (part === '' || /^\r?\n$/.test(part)) {
      buf += part;
      atLineStart = part !== '';
    } else {
      buf += (atLineStart ? prefix : '') + part;
      atLineStart = false;
    }
  }
  stream.write(buf);
}
