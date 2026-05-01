#!/usr/bin/env node
/**
 * test-worktree.mjs — Smoke tests for scripts/auto-loop/worktree.mjs
 *
 * Covers:
 *   - slugify(): kebab-case, max 40 chars, alphanumeric-only.
 *   - createWorktree / preserveOrCleanup / findExistingWorktree:
 *     integration with a real ephemeral git repo (skips if git is unavailable).
 *
 * Usage: node scripts/tests/auto-loop/test-worktree.mjs
 * Exit 0 = all passed, Exit 1 = failures.
 */

import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, realpathSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const wtUrl = new URL('../../auto-loop/worktree.mjs', import.meta.url);
const { slugify, createWorktree, preserveOrCleanup, findExistingWorktree } = await import(wtUrl);

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

// ─── Test 1: slugify ─────────────────────────────────────────────────────────
console.log('\nTest 1: slugify()');
{
  const s1 = slugify('Add JWT auth to /api/users');
  assert(`'Add JWT auth to /api/users' → kebab-case (got '${s1}')`,
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s1));
  assert(`includes 'add' (got '${s1}')`, s1.includes('add'));
  assert(`includes 'jwt' (got '${s1}')`, s1.includes('jwt'));
  assert(`no slashes (got '${s1}')`, !s1.includes('/'));

  const s2 = slugify('Fix bug: race condition in module X');
  assert(`'Fix bug: race condition in module X' length ≤ 40 (got ${s2.length}: '${s2}')`,
    s2.length <= 40);
  assert(`s2 lowercase only (got '${s2}')`, s2 === s2.toLowerCase());

  const s3 = slugify('a'.repeat(100));
  assert(`'a'.repeat(100) length ≤ 40 (got ${s3.length})`, s3.length <= 40);

  const s4 = slugify('Add JWT auth!');
  assert(`'Add JWT auth!' → 'add-jwt-auth' (got '${s4}')`, s4 === 'add-jwt-auth');

  const s5 = slugify('');
  assert(`empty string → fallback (got '${s5}')`, typeof s5 === 'string' && s5.length > 0);

  const s6 = slugify('!!!@@@###');
  assert(`only-symbols → fallback (got '${s6}')`, typeof s6 === 'string' && s6.length > 0);

  const s7 = slugify('One Two Three Four Five Six Seven Eight');
  const wordCount = s7.split('-').length;
  assert(`first 6 words only (got ${wordCount} segments: '${s7}')`, wordCount <= 6);

  const s8 = slugify('Refactor user-service module');
  assert(`hyphens preserved as separators (got '${s8}')`, /^[a-z0-9-]+$/.test(s8));
}

// ─── Integration tests need a real git repo ──────────────────────────────────
const gitProbe = spawnSync('git', ['--version'], { encoding: 'utf8' });
if (gitProbe.status !== 0) {
  console.log('\nSKIP: git not available in PATH — integration tests skipped.');
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

const tmpRoot = mkdtempSync(join(tmpdir(), 'auto-loop-wt-'));
let exitCode = 0;
try {
  const repo = join(tmpRoot, 'repo');
  spawnSync('git', ['init', '-q', '-b', 'main', repo], { encoding: 'utf8' });
  // Some older git versions don't support `-b` on init; fall back if needed.
  if (!existsSync(join(repo, '.git'))) {
    spawnSync('git', ['init', '-q', repo], { encoding: 'utf8' });
    spawnSync('git', ['-C', repo, 'checkout', '-q', '-b', 'main'], { encoding: 'utf8' });
  }
  spawnSync('git', ['-C', repo, 'config', 'user.email', 'test@example.com']);
  spawnSync('git', ['-C', repo, 'config', 'user.name', 'Test']);
  spawnSync('git', ['-C', repo, 'config', 'commit.gpgsign', 'false']);
  writeFileSync(join(repo, 'README.md'), '# test repo\n');
  spawnSync('git', ['-C', repo, 'add', 'README.md']);
  spawnSync('git', ['-C', repo, 'commit', '-q', '-m', 'init']);

  // ─── Test 2: createWorktree creates path + branch ──────────────────────────
  console.log('\nTest 2: createWorktree() creates path + branch');
  {
    const slug = slugify('Add JWT auth to api');
    const result = createWorktree(slug, repo);
    assert('returns { path, branch, slug }',
      result && typeof result.path === 'string' && typeof result.branch === 'string' && typeof result.slug === 'string');
    assert(`branch is auto/<slug> (got '${result.branch}')`,
      result.branch === `auto/${result.slug}`);
    assert(`path exists on disk (${result.path})`, existsSync(result.path));
    // Confirm the branch exists in the parent repo.
    const branchList = spawnSync('git', ['-C', repo, 'branch', '--list', result.branch], { encoding: 'utf8' });
    assert('branch is registered in parent repo',
      branchList.stdout.includes(result.branch),
      `git branch output: ${branchList.stdout}`);
  }

  // ─── Test 3: createWorktree disambiguates collisions ───────────────────────
  console.log('\nTest 3: createWorktree() suffixes on collision');
  {
    const baseSlug = 'collide';
    const a = createWorktree(baseSlug, repo);
    const b = createWorktree(baseSlug, repo);
    assert(`first slug = 'collide' (got '${a.slug}')`, a.slug === 'collide');
    assert(`second slug suffixed (got '${b.slug}')`, b.slug !== a.slug && b.slug.startsWith('collide-'));
    assert('paths differ', a.path !== b.path);
    assert('branches differ', a.branch !== b.branch);
  }

  // ─── Test 4: findExistingWorktree ──────────────────────────────────────────
  console.log('\nTest 4: findExistingWorktree()');
  {
    const slug = 'findme';
    const created = createWorktree(slug, repo);
    const found = findExistingWorktree(slug, repo);
    // Windows: tmpdir() may give the 8.3 short form while git resolves the
    // long form. Normalize via realpathSync for comparison.
    const norm = (p) => {
      try {
        // realpathSync.native resolves 8.3 short-name paths on Windows.
        const fn = realpathSync.native || realpathSync;
        return fn(p).toLowerCase();
      } catch {
        return resolve(p).toLowerCase();
      }
    };
    const ok = !!found && norm(found) === norm(created.path);
    assert(`finds existing worktree (found='${found}', expected='${created.path}', norm match=${ok})`, ok);

    const notFound = findExistingWorktree('does-not-exist-xyz', repo);
    assert('returns null for missing slug', notFound === null);
  }

  // ─── Test 5: preserveOrCleanup removes empty worktree ──────────────────────
  console.log('\nTest 5: preserveOrCleanup() removes empty worktree');
  {
    const slug = 'cleanme';
    const created = createWorktree(slug, repo);
    // No commits made beyond the base point → should be cleaned up.
    const result = preserveOrCleanup(created.path);
    assert(`returns preserved=false (got ${JSON.stringify(result)})`, result.preserved === false);
    assert('worktree dir removed', !existsSync(created.path));
  }

  // ─── Test 6: preserveOrCleanup preserves worktree with commits ─────────────
  console.log('\nTest 6: preserveOrCleanup() preserves worktree with commits');
  {
    const slug = 'keepme';
    const created = createWorktree(slug, repo);
    writeFileSync(join(created.path, 'new.txt'), 'work\n');
    spawnSync('git', ['-C', created.path, 'add', 'new.txt']);
    const c = spawnSync('git', ['-C', created.path, 'commit', '-q', '-m', 'work'], { encoding: 'utf8' });
    if (c.status !== 0) {
      console.error('  (commit failed; skipping preserve assertion)', c.stderr);
    } else {
      const result = preserveOrCleanup(created.path);
      assert(`returns preserved=true (got ${JSON.stringify(result)})`, result.preserved === true);
      assert('worktree dir still exists', existsSync(created.path));
      // Manual cleanup so afterAll passes on Windows.
      spawnSync('git', ['-C', repo, 'worktree', 'remove', created.path, '--force']);
    }
  }
} catch (err) {
  console.error('Integration test crashed:', err);
  failed++;
} finally {
  // Best-effort cleanup; on Windows worktrees may leave locked files.
  try { rmSync(tmpRoot, { recursive: true, force: true, maxRetries: 3 }); } catch { /* ignore */ }
}

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
