/**
 * validation.mjs — tool detection + tiered validation (lint → typecheck → test → build).
 *
 * Ported from scripts/auto-loop/_legacy.mjs (Phase 2, Subagent A).
 *
 * Exports:
 *   - detectTools()                  → { test, lint, typecheck, build, manager }
 *   - runCommand(cmd, timeout)       → { ok, output, error }
 *   - runValidation(tools, tier)     → { ok, results, feedback }
 *
 * `tier` is one of: 'lint-only' | 'intermediate' | 'final'
 *   - lint-only:    lint
 *   - intermediate: lint + typecheck + test
 *   - final:        lint + typecheck + test + build
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';

// ─── Tool Detection ──────────────────────────────────────────────────────────

export function detectTools() {
  const tools = { test: null, lint: null, typecheck: null, build: null, manager: 'node' };

  if (existsSync('package.json')) {
    let pkg = {};
    try { pkg = JSON.parse(readFileSync('package.json', 'utf-8')); } catch { pkg = {}; }
    const scripts = pkg.scripts || {};
    if (scripts.test) tools.test = 'npm test';
    if (scripts.lint) tools.lint = 'npm run lint';
    if (scripts.typecheck) tools.typecheck = 'npm run typecheck';
    else if (scripts['type-check']) tools.typecheck = 'npm run type-check';
    if (scripts.build) tools.build = 'npm run build';

    // detect test framework
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
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
      const targets = execSync('make -qp 2>/dev/null | grep "^[a-z]" | head -20', {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      if (targets.includes('test')) tools.test = tools.test || 'make test';
      if (targets.includes('lint')) tools.lint = tools.lint || 'make lint';
      if (targets.includes('build')) tools.build = tools.build || 'make build';
    } catch {}
  }

  return tools;
}

// ─── Command Runner ──────────────────────────────────────────────────────────

export function runCommand(cmd, timeout = 60_000) {
  try {
    const out = execSync(cmd, { encoding: 'utf-8', timeout, stdio: ['pipe', 'pipe', 'pipe'] });
    return { ok: true, output: out, error: '' };
  } catch (e) {
    return {
      ok: false,
      output: e.stdout || '',
      error: e.stderr || e.message || '',
    };
  }
}

// ─── Tiered Validation ───────────────────────────────────────────────────────

export function runValidation(tools, tier = 'intermediate') {
  const results = [];

  // Lint always (fast)
  if (tools.lint) {
    const r = runCommand(tools.lint, 30_000);
    results.push({ name: 'lint', ...r });
    if (!r.ok) return { ok: false, results, feedback: `Lint failed:\n${r.error}` };
  }

  // Typecheck on intermediate+
  if (tools.typecheck && tier !== 'lint-only') {
    const r = runCommand(tools.typecheck, 60_000);
    results.push({ name: 'typecheck', ...r });
    if (!r.ok) return { ok: false, results, feedback: `Typecheck failed:\n${r.error}` };
  }

  // Tests on intermediate+
  if (tools.test && tier !== 'lint-only') {
    const r = runCommand(tools.test, 120_000);
    results.push({ name: 'test', ...r });
    if (!r.ok) return { ok: false, results, feedback: `Tests failed:\n${r.error}` };
  }

  // Build only on final
  if (tools.build && tier === 'final') {
    const r = runCommand(tools.build, 120_000);
    results.push({ name: 'build', ...r });
    if (!r.ok) return { ok: false, results, feedback: `Build failed:\n${r.error}` };
  }

  return { ok: true, results, feedback: '' };
}
