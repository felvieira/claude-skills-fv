#!/usr/bin/env node
/**
 * smoke-real.mjs — opt-in real-LLM smoke test for auto-loop v2.
 *
 * Costs real tokens (~$0.05–0.20). NOT run by run-all.mjs.
 * Run manually only when you want to verify end-to-end against the real `claude` CLI.
 *
 * Usage:
 *   node scripts/tests/auto-loop/smoke-real.mjs
 *
 * What it does:
 *   1. Creates a fresh tmpdir with a tiny git repo and a README containing TODO.
 *   2. Invokes the auto-loop with the smallest reasonable task, --polish=none,
 *      --max-iterations=2, --no-commit.
 *   3. Asserts the pipeline ran end-to-end without crashing and the README was edited.
 *   4. Leaves the sandbox dir intact so you can inspect .auto/ if anything went wrong.
 */

import { execSync, spawnSync } from 'child_process';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { join, resolve, dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// scripts/tests/auto-loop → repoRoot is 3 levels up.
const repoRoot = resolve(__dirname, '../../..');
const autoLoop = resolve(repoRoot, 'scripts', 'auto-loop.mjs');

console.log('Auto-loop smoke (real LLM) — opt-in, costs tokens.\n');

if (!existsSync(autoLoop)) {
  console.error(`Could not find auto-loop entry at ${autoLoop}`);
  process.exit(1);
}

// Sanity: claude CLI present?
const claudeCheck = spawnSync(process.platform === 'win32' ? 'cmd.exe' : 'sh',
  process.platform === 'win32' ? ['/c', 'claude --version'] : ['-c', 'claude --version'],
  { encoding: 'utf-8' });
if (claudeCheck.status !== 0) {
  console.error('claude CLI not found or not authenticated. Install + login first.');
  console.error('stderr:', claudeCheck.stderr || '(none)');
  process.exit(2);
}
console.log('✓ claude CLI detected:', claudeCheck.stdout.trim());

const tmp = mkdtempSync(join(tmpdir(), 'al-smoke-'));
console.log(`\nSandbox: ${tmp}`);

// Minimal repo seed.
execSync('git init -q', { cwd: tmp });
execSync('git config user.email s@s', { cwd: tmp });
execSync('git config user.name smoke', { cwd: tmp });
execSync('git config commit.gpgsign false', { cwd: tmp });

const readmePath = join(tmp, 'README.md');
writeFileSync(readmePath, '# Smoke Test\n\nTODO: replace this line with a one-sentence project description.\n');
execSync('git add . && git commit -q -m init', { cwd: tmp });

console.log('\nRunning: node scripts/auto-loop.mjs "<task>" --polish=none --max-iterations=2 --no-commit\n');

const result = spawnSync('node', [
  autoLoop,
  'replace the TODO line in README.md with a one-sentence description of a smoke-test repo',
  '--polish=none',
  '--max-iterations', '2',
  '--no-commit',
  '--no-prevent-sleep',
], {
  cwd: tmp,
  encoding: 'utf-8',
  timeout: 600_000, // 10 min hard cap
  stdio: 'inherit',
});

console.log(`\nExit code: ${result.status}`);

let pass = true;
function check(label, cond) {
  console.log(`  ${cond ? '✓' : '✗'} ${label}`);
  if (!cond) pass = false;
}

check('runner exited with status code', result.status !== null);
check('runner did not crash (exit < 99)', (result.status ?? 99) < 99);

const finalReadme = existsSync(readmePath) ? readFileSync(readmePath, 'utf-8') : '';
check('README.md still exists', !!finalReadme);
check('README.md was modified (TODO removed or replaced)', !finalReadme.includes('TODO: replace this line'));

const autoDir = join(tmp, '.auto');
check('.auto/ directory created', existsSync(autoDir));
check('.auto/progress.md present', existsSync(join(autoDir, 'progress.md')));
check('.auto/runs/ created', existsSync(join(autoDir, 'runs')));

console.log(`\nSandbox left at ${tmp} for inspection.`);
console.log(pass ? '\n✓ Smoke pass' : '\n✗ Smoke fail');
process.exit(pass ? 0 : 1);
