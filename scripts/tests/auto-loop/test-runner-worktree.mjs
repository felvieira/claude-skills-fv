#!/usr/bin/env node
/**
 * test-runner-worktree.mjs — Integration smoke for runOnce({ worktree: true }).
 *
 * Exercises the worktree happy path that runner.mjs sets up via dynamic import
 * of worktree.mjs. Catches integration bugs that the unit tests for runner.mjs
 * and worktree.mjs miss in isolation.
 *
 * Strategy:
 *   1. Create a tmpdir outside the main repo, init a fresh git repo with one
 *      empty commit (so HEAD exists and `git worktree add` works).
 *   2. chdir into the temp repo so runner.mjs sees it as the cwd.
 *   3. Run runOnce with worktree:true and a mockAgent that completes on call 1.
 *   4. Assert exit code OK, that <tmp>/repo-auto-worktrees/ was created,
 *      and that an `auto/*` branch was created in the parent repo.
 *
 * Usage: node scripts/tests/auto-loop/test-runner-worktree.mjs
 * Exit 0 = all passed, Exit 1 = failures.
 */

import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { join, resolve } from 'path';

const runnerUrl = new URL('../../auto-loop/runner.mjs', import.meta.url);

// Sandbox lives in the OS tmpdir — confirm it isn't inside the main repo
// before we touch anything (defensive guard against accidental contamination).
const tmp = mkdtempSync(join(tmpdir(), 'al-rwt-'));
const repoRoot = resolve(process.cwd());
if (resolve(tmp).toLowerCase().startsWith(repoRoot.toLowerCase())) {
  console.error(`Refusing to run: tmpdir ${tmp} is inside repo ${repoRoot}`);
  process.exit(1);
}

const repo = resolve(tmp, 'repo');
mkdirSync(repo, { recursive: true });

const cwd0 = process.cwd();
let didChdir = false;

let passed = 0;
let failed = 0;
function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

try {
  // Initialise a fresh git repo with one empty commit so HEAD is valid.
  execSync('git init -q', { cwd: repo });
  execSync('git config user.email test@example.com', { cwd: repo });
  execSync('git config user.name test', { cwd: repo });
  execSync('git config commit.gpgsign false', { cwd: repo });
  execSync('git commit --allow-empty -q -m init', { cwd: repo });

  process.chdir(repo);
  didChdir = true;

  const { runOnce } = await import(runnerUrl);

  // The mock agent writes a file so runner.mjs's "no diff on iter 1" guard
  // (runner.mjs ~L388) doesn't reject the completion signal. The file is
  // written into the cwd, which by this point is the worktree dir.
  const mockAgent = {
    name: 'mock',
    async invoke() {
      try {
        writeFileSync(join(process.cwd(), 'note.txt'), 'mock-change\n');
      } catch {}
      return {
        output: 'Implementation complete\nEXIT_SIGNAL: true',
        error: '',
        status: 0,
        tokens: null,
      };
    },
    isPermanentError: () => false,
    isRetryableError: () => false,
  };

  const code = await runOnce(
    {
      task: 'add a comment to README',
      agent: 'claude',
      model: 'x',
      // Use 2 iterations: runner.mjs defers completion on iter 1 if no diff
      // is detected (gitDiffSinceBaseline can return '' on Windows where the
      // bash-style fallback command fails). The same EXIT_SIGNAL on iter 2
      // is accepted unconditionally.
      maxIterations: 2,
      maxTokens: 0,
      stopWhen: '',
      polish: 'none',
      validate: false,
      noCommit: true,
      push: false,
      verbose: false,
      worktree: true,
      preventSleep: false,
    },
    mockAgent,
  );

  // runner.mjs may chdir into the worktree; restore before assertions that
  // shell out so cwd state can't perturb later commands.
  try { process.chdir(repo); } catch {}

  console.log('\nAssertions:');
  assert('runOnce returned 0', code === 0, `got ${code}`);

  // Worktree root is a sibling of the repo dir: <tmp>/repo-auto-worktrees/
  const wtRoot = resolve(tmp, 'repo-auto-worktrees');
  assert('worktree root created', existsSync(wtRoot), `expected ${wtRoot}`);

  // auto/* branch should now exist on the parent repo.
  const branches = execSync('git branch --list "auto/*"', {
    cwd: repo,
    encoding: 'utf-8',
  });
  assert(
    'auto/<slug> branch created',
    /\bauto\//.test(branches),
    `branches: ${JSON.stringify(branches)}`,
  );

  console.log(`\n${passed} passed, ${failed} failed`);
} catch (err) {
  console.error('Test threw:', err && err.stack ? err.stack : err);
  failed++;
} finally {
  // Always restore cwd before cleanup — rmSync can't remove a tree we're inside.
  if (didChdir) {
    try { process.chdir(cwd0); } catch {}
  }
  // Best-effort cleanup. On Windows, git may still hold locks (index.lock,
  // packfiles, the worktree's own .git file) right after the run, so failure
  // here is logged rather than failing the test.
  try {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 3 });
  } catch (cleanupErr) {
    console.warn(
      `[cleanup] Could not remove ${tmp}: ${cleanupErr.message}. ` +
        'Safe to delete manually; common on Windows due to git file locks.',
    );
  }
}

process.exit(failed > 0 ? 1 : 0);
