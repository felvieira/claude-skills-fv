#!/usr/bin/env node
/**
 * worktree.mjs — Companion script for /worktree slash command
 *
 * Creates an isolated git worktree at ../[repo]-[branch], copies .env* files,
 * installs dependencies, and runs lint/typecheck in the background.
 *
 * Usage:
 *   node scripts/worktree.mjs <branch>                  # create
 *   node scripts/worktree.mjs <branch> --existing       # checkout existing branch
 *   node scripts/worktree.mjs --list                    # list worktrees
 *   node scripts/worktree.mjs --clean <branch>          # remove worktree + branch
 *
 * Flags:
 *   --no-install   Skip dep install
 *   --no-validate  Skip lint/typecheck
 *   --existing     Branch already exists (no -b flag on git worktree add)
 */

import { spawn, spawnSync } from 'child_process';
import { basename, dirname, join, resolve } from 'path';
import { existsSync, readdirSync, copyFileSync, statSync } from 'fs';

const args = process.argv.slice(2);

// ─── Flags ────────────────────────────────────────────────────────────────────
const LIST    = args.includes('--list');
const CLEAN   = args.includes('--clean');
const EXISTING = args.includes('--existing');
const NO_INSTALL  = args.includes('--no-install');
const NO_VALIDATE = args.includes('--no-validate');

// Positional: first non-flag argument is the branch name
const branch = args.find(a => !a.startsWith('--'));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, { shell: true, encoding: 'utf8', ...opts });
  return { code: result.status ?? 0, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function log(msg)  { process.stdout.write(`[worktree] ${msg}\n`); }
function warn(msg) { process.stderr.write(`[worktree] ⚠ ${msg}\n`); }
function fail(msg, code = 1) { process.stderr.write(`[worktree] ✗ ${msg}\n`); process.exit(code); }

function repoRoot() {
  const r = run('git rev-parse --show-toplevel');
  if (r.code !== 0) fail('Not inside a git repository');
  return r.stdout.trim();
}

function worktreeDir(branch) {
  const root = repoRoot();
  const safeName = branch.replace(/[/\\]/g, '-');
  return resolve(dirname(root), `${basename(root)}-${safeName}`);
}

function copyEnvFiles(src, dest) {
  const copied = [];
  for (const name of readdirSync(src)) {
    if (!name.startsWith('.env')) continue;
    const full = join(src, name);
    try {
      if (!statSync(full).isFile()) continue;
      copyFileSync(full, join(dest, name));
      copied.push(name);
    } catch { /* skip */ }
  }
  return copied;
}

// ─── Modes ────────────────────────────────────────────────────────────────────

function listMode() {
  const r = run('git worktree list');
  process.stdout.write(r.stdout);
  process.exit(r.code);
}

function cleanMode(branch) {
  if (!branch) fail('--clean requires a branch name');
  const target = worktreeDir(branch);
  log(`Removing worktree: ${target}`);
  const remove = run(`git worktree remove "${target}" --force`);
  if (remove.code !== 0) warn(remove.stderr.trim());
  // Best-effort branch delete (only if merged)
  const del = run(`git branch -d "${branch}"`);
  if (del.code === 0) log(`Deleted branch: ${branch}`);
  else log(`Branch ${branch} kept (not fully merged — use git branch -D to force)`);
  process.exit(0);
}

function createMode(branch) {
  if (!branch) fail('branch name required (e.g. node scripts/worktree.mjs feature/foo)');

  // Prereqs
  const status = run('git status --porcelain');
  if (status.stdout.trim()) {
    warn('Working tree has uncommitted changes — the new worktree inherits current HEAD.');
  }

  run('git fetch origin');

  const root = repoRoot();
  const target = worktreeDir(branch);

  if (existsSync(target)) fail(`Worktree directory already exists: ${target}`);

  // Create worktree
  const addCmd = EXISTING
    ? `git worktree add "${target}" "${branch}"`
    : `git worktree add "${target}" -b "${branch}"`;
  log(`Creating worktree: ${target}`);
  const add = run(addCmd);
  if (add.code !== 0) fail(`git worktree add failed: ${add.stderr.trim()}`);

  // Copy env files
  const envs = copyEnvFiles(root, target);
  if (envs.length > 0) log(`Copied env files: ${envs.join(', ')}`);

  // Background install + validate
  const bgChildren = [];
  const bgSpawn = (label, cmd) => {
    log(`▶ ${label} (background)`);
    const child = spawn(cmd, { cwd: target, shell: true, stdio: 'ignore' });
    bgChildren.push({ label, child });
    child.on('exit', (code) => {
      if (code === 0) log(`✅ ${label} passed`);
      else warn(`${label} exited with code ${code}`);
    });
  };

  if (!NO_INSTALL) {
    if (existsSync(join(target, 'package.json')))       bgSpawn('npm install', 'npm install --silent');
    else if (existsSync(join(target, 'requirements.txt'))) bgSpawn('pip install', 'pip install -r requirements.txt -q');
  }

  if (!NO_VALIDATE && existsSync(join(target, 'package.json'))) {
    bgSpawn('npm run lint',      'npm run lint --if-present --silent');
    bgSpawn('npm run typecheck', 'npm run typecheck --if-present --silent');
  }

  // Report
  log('');
  log('─'.repeat(60));
  log(`Worktree ready: ${target}`);
  log(`Branch:         ${branch}`);
  log(`Next:           cd "${target}"`);
  log('─'.repeat(60));

  // Don't wait for background children — they emit on their own
  // but we do stay alive so unref()'d children still log
  for (const { child } of bgChildren) child.unref();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (LIST)       listMode();
else if (CLEAN) cleanMode(branch);
else            createMode(branch);
