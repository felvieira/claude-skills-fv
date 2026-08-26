#!/usr/bin/env node
/**
 * worktree.mjs — Companion script for /worktree slash command
 *
 * Creates an isolated git worktree at ../[repo]-[branch], copies .env* files,
 * installs dependencies, and runs lint/typecheck in the background.
 *
 * Desde v2.65.0, segue o protocolo completo de skills/65-using-git-worktrees/SKILL.md
 * (adaptado de obra/superpowers, MIT):
 *   - Passo 0: detecta isolamento existente (git-dir vs git-common-dir, com guard de
 *     submodule) antes de criar qualquer coisa — evita aninhar worktree dentro de worktree.
 *   - Passo 3: roda a baseline de testes do projeto de destino (detectada por
 *     package.json/Cargo.toml/pyproject.toml/go.mod) e reporta claramente pronto/falho,
 *     sem travar a criação do worktree em si.
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
 *   --no-baseline  Skip baseline test run (Step 3)
 *   --existing     Branch already exists (no -b flag on git worktree add)
 */

import { spawn, spawnSync } from 'child_process';
import { basename, dirname, join, resolve } from 'path';
import { existsSync, readdirSync, copyFileSync, statSync, realpathSync } from 'fs';

const args = process.argv.slice(2);

// ─── Flags ────────────────────────────────────────────────────────────────────
const LIST    = args.includes('--list');
const CLEAN   = args.includes('--clean');
const EXISTING = args.includes('--existing');
const NO_INSTALL  = args.includes('--no-install');
const NO_VALIDATE = args.includes('--no-validate');
const NO_BASELINE = args.includes('--no-baseline');

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

// Passo 0 — Deteccao de isolamento existente (obra/superpowers, MIT).
// Compara git-dir com git-common-dir: dentro de um worktree vinculado os dois
// divergem; num checkout normal sao iguais. Submodules tambem divergem, entao
// precisam de guard separado para nao serem confundidos com worktree.
function detectIsolation() {
  const gitDirRaw = run('git rev-parse --git-dir');
  const commonDirRaw = run('git rev-parse --git-common-dir');
  if (gitDirRaw.code !== 0 || commonDirRaw.code !== 0) {
    return { isolated: false, checked: false };
  }

  // Resolve para caminho absoluto real (segue symlinks) via API do Node —
  // portatil entre shells (bash/zsh no Unix, cmd.exe/PowerShell no Windows),
  // ao contrario de encadear `cd ... && pwd -P` que so funciona em shell POSIX.
  const resolveReal = (p) => {
    try {
      return realpathSync(resolve(p.trim()));
    } catch {
      return resolve(p.trim());
    }
  };

  const gitDir = resolveReal(gitDirRaw.stdout);
  const commonDir = resolveReal(commonDirRaw.stdout);

  if (gitDir === commonDir) {
    return { isolated: false, checked: true };
  }

  // Guard de submodule: GIT_DIR != GIT_COMMON_DIR tambem e verdade dentro de
  // submodules. Se houver superprojeto, isto e um submodule, nao um worktree.
  const superproject = run('git rev-parse --show-superproject-working-tree');
  const isSubmodule = superproject.code === 0 && superproject.stdout.trim().length > 0;
  if (isSubmodule) {
    return { isolated: false, checked: true, isSubmodule: true };
  }

  const branchRaw = run('git branch --show-current');
  const branchName = branchRaw.stdout.trim();
  const cwd = run('git rev-parse --show-toplevel').stdout.trim();

  return {
    isolated: true,
    checked: true,
    branch: branchName || null, // vazio => detached HEAD
    path: cwd,
  };
}

// Passo 3 — Baseline de testes (obra/superpowers, MIT).
// "Uma baseline suja torna toda falha futura ambigua." Detecta o
// runtime/gerenciador do projeto de destino e roda o comando de teste padrao
// antes de reportar o worktree como pronto para uso. Nunca trava a criacao do
// worktree em si — so reporta claramente se a baseline esta limpa ou suja.
function detectBaselineCommand(dir) {
  if (existsSync(join(dir, 'package.json'))) return { label: 'npm test', cmd: 'npm test --if-present --silent' };
  if (existsSync(join(dir, 'Cargo.toml')))    return { label: 'cargo test', cmd: 'cargo test' };
  if (existsSync(join(dir, 'pyproject.toml'))) return { label: 'pytest', cmd: 'pytest' };
  if (existsSync(join(dir, 'requirements.txt'))) return { label: 'pytest', cmd: 'pytest' };
  if (existsSync(join(dir, 'go.mod')))        return { label: 'go test', cmd: 'go test ./...' };
  return null;
}

function runBaseline(dir) {
  const baseline = detectBaselineCommand(dir);
  if (!baseline) {
    log('Baseline: nenhum runtime de teste detectado (sem package.json/Cargo.toml/pyproject.toml/go.mod) — etapa pulada.');
    return;
  }
  log(`Baseline: rodando "${baseline.label}" antes de liberar o worktree...`);
  const result = run(baseline.cmd, { cwd: dir });
  if (result.code === 0) {
    log(`✅ Baseline limpa (${baseline.label} passou).`);
  } else {
    warn(`Baseline SUJA — ${baseline.label} falhou (exit ${result.code}). O worktree foi criado mesmo assim; investigue antes de confiar em falhas futuras.`);
  }
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

  // Passo 0 (obra/superpowers, MIT) — nunca aninhar worktree dentro de worktree.
  const isolation = detectIsolation();
  if (isolation.checked && isolation.isolated) {
    warn(`Ja em um worktree vinculado: ${isolation.path || '(caminho nao resolvido)'}`);
    warn(isolation.branch
      ? `Branch atual: ${isolation.branch}. Nao ha necessidade de criar outro worktree aninhado.`
      : 'HEAD destacada (detached) — workspace gerenciado externamente.');
    fail('Aborting: rode este comando a partir do checkout principal do repositorio, nao de dentro de um worktree ja isolado.');
  }

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
  let installChild = null;
  const bgSpawn = (label, cmd) => {
    log(`▶ ${label} (background)`);
    const child = spawn(cmd, { cwd: target, shell: true, stdio: 'ignore' });
    bgChildren.push({ label, child });
    child.on('exit', (code) => {
      if (code === 0) log(`✅ ${label} passed`);
      else warn(`${label} exited with code ${code}`);
    });
    return child;
  };

  if (!NO_INSTALL) {
    if (existsSync(join(target, 'package.json'))) {
      installChild = bgSpawn('npm install', 'npm install --silent');
    } else if (existsSync(join(target, 'requirements.txt'))) {
      installChild = bgSpawn('pip install', 'pip install -r requirements.txt -q');
    }
  }

  if (!NO_VALIDATE && existsSync(join(target, 'package.json'))) {
    bgSpawn('npm run lint',      'npm run lint --if-present --silent');
    bgSpawn('npm run typecheck', 'npm run typecheck --if-present --silent');
  }

  // Passo 3 (obra/superpowers, MIT) — baseline de testes antes de liberar o
  // worktree para trabalho. So roda depois do install terminar (quando houver
  // install rodando); senao dispara direto. Nunca trava a criacao do worktree
  // em si — so reporta claramente pronto/sujo.
  if (!NO_BASELINE) {
    if (installChild) {
      installChild.on('exit', () => runBaseline(target));
    } else {
      runBaseline(target);
    }
  }

  // Report
  log('');
  log('─'.repeat(60));
  log(`Worktree ready: ${target}`);
  log(`Branch:         ${branch}`);
  log(`Next:           cd "${target}"`);
  if (!NO_BASELINE) log('Baseline:       rodando em background — resultado sera reportado acima quando concluir');
  log('─'.repeat(60));

  // Don't wait for background children — they emit on their own
  // but we do stay alive so unref()'d children still log
  for (const { child } of bgChildren) child.unref();
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (LIST)       listMode();
else if (CLEAN) cleanMode(branch);
else            createMode(branch);
