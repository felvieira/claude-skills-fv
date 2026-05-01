/**
 * worktree.mjs — git worktree create / preserve / cleanup for auto-loop.
 *
 * Layout:
 *   <baseRepo>-auto-worktrees/<slug>/      (branch: auto/<slug>)
 *
 * Public API:
 *   slugify(taskDesc)                      → kebab-case slug, ≤ 40 chars
 *   createWorktree(slug, baseRepo)         → { path, branch, slug }
 *   preserveOrCleanup(worktreePath)        → { preserved, path? }
 *   findExistingWorktree(slug, baseRepo)   → path | null
 */

import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { basename, dirname, resolve, sep } from 'path';

// ─── slugify ─────────────────────────────────────────────────────────────────

/**
 * Convert a task description into a kebab-case slug.
 *  - lowercase
 *  - take first 6 words
 *  - strip non [a-z0-9]+ → split on those, join with `-`
 *  - max 40 chars (truncate at last full segment if possible)
 */
export function slugify(taskDesc) {
  if (!taskDesc || typeof taskDesc !== 'string') return 'task';
  const lowered = taskDesc.toLowerCase();
  // Split into "words" by any non-alphanumeric run, take first 6.
  const words = lowered.split(/[^a-z0-9]+/).filter(Boolean).slice(0, 6);
  let slug = words.join('-');
  if (!slug) slug = 'task';
  if (slug.length > 40) {
    // Try to truncate at last dash before 40 chars to avoid mid-word cut.
    const cut = slug.slice(0, 40);
    const lastDash = cut.lastIndexOf('-');
    slug = lastDash > 10 ? cut.slice(0, lastDash) : cut;
  }
  // Trim leading/trailing dashes (defensive).
  slug = slug.replace(/^-+|-+$/g, '');
  return slug || 'task';
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function git(args, cwd) {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8' });
  return {
    code: res.status ?? 1,
    stdout: res.stdout ?? '',
    stderr: res.stderr ?? '',
    error: res.error,
  };
}

/**
 * Compute the directory that holds all auto-loop worktrees for `baseRepo`.
 * Lives as a sibling of baseRepo: `<parent>/<repo-name>-auto-worktrees/`.
 */
function worktreeRoot(baseRepo) {
  const abs = resolve(baseRepo);
  return resolve(dirname(abs), `${basename(abs)}-auto-worktrees`);
}

// ─── createWorktree ──────────────────────────────────────────────────────────

/**
 * Create a new git worktree at <baseRepo>-auto-worktrees/<slug>/ on branch
 * `auto/<slug>`. If the directory or branch already exists, suffixes -1, -2,…
 * are tried until one is free.
 *
 * @returns { path, branch, slug }
 * @throws if `git worktree add` fails for the chosen path.
 */
export function createWorktree(slug, baseRepo) {
  if (!slug) throw new Error('createWorktree: slug is required');
  if (!baseRepo) throw new Error('createWorktree: baseRepo is required');

  const root = worktreeRoot(baseRepo);

  // Existing branches (to avoid `auto/<slug>` collisions even if the
  // worktree dir was wiped manually).
  const branches = listBranches(baseRepo);

  let finalSlug = slug;
  let candidatePath = resolve(root, finalSlug);
  let candidateBranch = `auto/${finalSlug}`;
  let n = 0;
  while (existsSync(candidatePath) || branches.has(candidateBranch)) {
    n += 1;
    finalSlug = `${slug}-${n}`;
    candidatePath = resolve(root, finalSlug);
    candidateBranch = `auto/${finalSlug}`;
    if (n > 999) throw new Error(`createWorktree: too many collisions for slug ${slug}`);
  }

  const add = git(
    ['worktree', 'add', '-b', candidateBranch, candidatePath],
    baseRepo
  );
  if (add.code !== 0) {
    const detail = (add.stderr || add.stdout || add.error?.message || '').trim();
    throw new Error(`git worktree add failed: ${detail}`);
  }

  return { path: candidatePath, branch: candidateBranch, slug: finalSlug };
}

function listBranches(baseRepo) {
  const r = git(['branch', '--format=%(refname:short)', '--list', 'auto/*'], baseRepo);
  if (r.code !== 0) return new Set();
  return new Set(
    r.stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

// ─── preserveOrCleanup ───────────────────────────────────────────────────────

/**
 * Decide what to do with a worktree at the end of a run.
 *
 *  - If the branch has commits unique to it (not on the upstream / default
 *    branch), preserve the worktree and print a cleanup hint.
 *  - Otherwise, remove the worktree (git worktree remove --force).
 */
export function preserveOrCleanup(worktreePath) {
  if (!worktreePath) throw new Error('preserveOrCleanup: worktreePath is required');
  if (!existsSync(worktreePath)) {
    return { preserved: false, path: worktreePath, missing: true };
  }

  const baseBranch = detectBaseBranch(worktreePath);
  let uniqueCommits = 0;
  if (baseBranch) {
    const r = git(['log', `${baseBranch}..HEAD`, '--oneline'], worktreePath);
    if (r.code === 0) {
      uniqueCommits = r.stdout.split(/\r?\n/).filter((l) => l.trim()).length;
    }
  } else {
    // No reference branch → fall back to "are there any commits at all?".
    const r = git(['log', '--oneline', '-n', '1'], worktreePath);
    uniqueCommits = r.code === 0 && r.stdout.trim() ? 1 : 0;
  }

  if (uniqueCommits > 0) {
    process.stdout.write(
      `[worktree] Preserved ${worktreePath} (${uniqueCommits} commit${uniqueCommits === 1 ? '' : 's'}).\n` +
        `[worktree] Cleanup later: git worktree remove "${worktreePath}" --force\n`
    );
    return { preserved: true, path: worktreePath, commits: uniqueCommits };
  }

  // No new work → remove. Use the parent repo as cwd so `git worktree
  // remove` works even if cwd is inside the worktree being removed.
  const parent = inferMainRepo(worktreePath) || worktreePath;
  const rm = git(['worktree', 'remove', worktreePath, '--force'], parent);
  if (rm.code !== 0) {
    const detail = (rm.stderr || rm.stdout || '').trim();
    process.stderr.write(`[worktree] ⚠ remove failed: ${detail}\n`);
    return { preserved: false, path: worktreePath, removeFailed: true };
  }
  return { preserved: false, path: worktreePath };
}

function detectBaseBranch(cwd) {
  // Prefer origin/HEAD (default upstream branch) if available.
  const sym = git(['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD'], cwd);
  if (sym.code === 0 && sym.stdout.trim()) return sym.stdout.trim();
  // Fall back to common branch names that exist locally.
  for (const cand of ['main', 'master']) {
    const r = git(['rev-parse', '--verify', '--quiet', cand], cwd);
    if (r.code === 0 && r.stdout.trim()) return cand;
  }
  return null;
}

function inferMainRepo(worktreePath) {
  // Ask git itself for the common dir of this worktree.
  const r = git(['rev-parse', '--path-format=absolute', '--git-common-dir'], worktreePath);
  if (r.code !== 0) return null;
  const commonDir = r.stdout.trim();
  if (!commonDir) return null;
  // common-dir typically points to <main-repo>/.git
  return commonDir.replace(/[\\/]\.git[\\/]?$/, '');
}

// ─── findExistingWorktree ────────────────────────────────────────────────────

/**
 * Look up an existing worktree by slug. Matches either:
 *   - a worktree whose path basename equals `<slug>` and whose parent dir is
 *     <baseRepo>-auto-worktrees, or
 *   - a worktree on branch `auto/<slug>`.
 *
 * @returns absolute path or null
 */
export function findExistingWorktree(slug, baseRepo) {
  if (!slug || !baseRepo) return null;
  const r = git(['worktree', 'list', '--porcelain'], baseRepo);
  if (r.code !== 0) return null;

  const expectedRoot = worktreeRoot(baseRepo);
  const expectedBranch = `refs/heads/auto/${slug}`;
  const expectedPath = resolve(expectedRoot, slug);

  // Parse porcelain: blocks separated by blank lines, each with `worktree <path>`,
  // `HEAD <sha>`, `branch <ref>` (or `detached`).
  const blocks = r.stdout.split(/\r?\n\r?\n/);
  for (const block of blocks) {
    if (!block.trim()) continue;
    let path = null;
    let branch = null;
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('worktree ')) path = line.slice('worktree '.length).trim();
      else if (line.startsWith('branch ')) branch = line.slice('branch '.length).trim();
    }
    if (!path) continue;
    const absPath = resolve(path);
    if (absPath === expectedPath) return absPath;
    if (branch === expectedBranch) return absPath;
    // Also match if path is inside expectedRoot and basename matches slug
    // (covers case-insensitive FS quirks via dirname comparison).
    if (
      resolve(dirname(absPath)) === expectedRoot &&
      basename(absPath) === slug
    ) {
      return absPath;
    }
  }
  return null;
}
