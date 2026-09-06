#!/usr/bin/env node
/**
 * test-permission-ladder-guard.mjs — Smoke tests for
 * hooks/scripts/permission-ladder-guard.mjs
 *
 * The hook is a standalone script (reads stdin, writes stdout, process.exit),
 * not an importable module — so it's exercised as a real child process, same
 * as the hook runtime would invoke it. Each case runs with a temp cwd holding
 * its own hooks/config.json so tests never depend on (or mutate) the repo's
 * real config.
 *
 * Usage: node scripts/tests/auto-loop/test-permission-ladder-guard.mjs
 * Exit 0 = all passed, Exit 1 = failures
 */

import { spawnSync } from 'child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const HOOK_PATH = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', 'hooks', 'scripts', 'permission-ladder-guard.mjs');

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

function makeCwd(enabled) {
  const dir = mkdtempSync(join(tmpdir(), 'al-permladder-'));
  mkdirSync(join(dir, 'hooks'), { recursive: true });
  writeFileSync(join(dir, 'hooks', 'config.json'), JSON.stringify({
    permission_ladder_guard: { enabled },
  }));
  return dir;
}

function runHook(cwd, command, toolName = 'Bash') {
  const payload = JSON.stringify({ tool_name: toolName, tool_input: { command } });
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    cwd,
    input: payload,
    encoding: 'utf-8',
  });
  return JSON.parse(r.stdout);
}

function decisionOf(result) {
  if (result.continue === true) return 'allow';
  return (result.hookSpecificOutput && result.hookSpecificOutput.permissionDecision) || 'allow';
}

function isBlocked(result) {
  const d = decisionOf(result);
  return d === 'ask' || d === 'deny';
}

// ─── Test 1: disabled by default ─────────────────────────────────────────────
console.log('\nTest 1: disabled by default (enabled: false)');
{
  const cwd = makeCwd(false);
  const r = runHook(cwd, 'rm -rf /tmp/foo');
  assert('continue: true when disabled', r.continue === true, JSON.stringify(r));
  assert('not blocked when disabled', !isBlocked(r));
  rmSync(cwd, { recursive: true, force: true });
}

// ─── Test 2: enabled — blocks unambiguous high-risk patterns ─────────────────
console.log('\nTest 2: enabled — blocks each ladder pattern');
{
  const cwd = makeCwd(true);
  const cases = [
    ['rm -rf /tmp/foo', 'destructive-delete'],
    ['git push origin main --force', 'force-push'],
    ['git reset --hard', 'reset-hard'],
    ['git branch -D feature-x', 'branch-delete-force'],
    ['terraform apply', 'deploy-shaped'],
    ['npm publish', 'deploy-shaped'],
  ];
  for (const [cmd, expectedRule] of cases) {
    const r = runHook(cwd, cmd);
    assert(`blocks "${cmd}"`, isBlocked(r), JSON.stringify(r));
  }
  rmSync(cwd, { recursive: true, force: true });
}

// ─── Test 3: enabled — allows safe commands and safer variants ───────────────
console.log('\nTest 3: enabled — allows safe/expected-safe commands');
{
  const cwd = makeCwd(true);
  const cases = [
    'git status',
    'git push origin main --force-with-lease',
    'npm test',
    'ls -la',
  ];
  for (const cmd of cases) {
    const r = runHook(cwd, cmd);
    assert(`allows "${cmd}"`, !isBlocked(r), JSON.stringify(r));
  }
  rmSync(cwd, { recursive: true, force: true });
}

// ─── Test 4: enabled — escape hatch bypasses the block ───────────────────────
console.log('\nTest 4: escape hatch suffix allows a flagged command');
{
  const cwd = makeCwd(true);
  const r = runHook(cwd, 'rm -rf /tmp/foo # permission-ladder: allow');
  assert('escape hatch allows', !isBlocked(r), JSON.stringify(r));
  rmSync(cwd, { recursive: true, force: true });
}

// ─── Test 5: enabled — non-Bash tool is ignored ──────────────────────────────
console.log('\nTest 5: non-Bash tool calls pass through untouched');
{
  const cwd = makeCwd(true);
  const r = runHook(cwd, 'rm -rf /', 'Write');
  assert('Write tool not inspected', !isBlocked(r), JSON.stringify(r));
  rmSync(cwd, { recursive: true, force: true });
}

// ─── Test 6: enabled — compound commands are split and each segment checked ──
console.log('\nTest 6: compound/obfuscated commands (regex bypass fixes)');
{
  const cwd = makeCwd(true);
  const cases = [
    'echo hi && rm -rf /tmp/foo',
    'echo hi; rm -rf /tmp/foo',
    '"rm" -rf /tmp/foo',
    'echo $(rm -rf /tmp/foo)',
  ];
  for (const cmd of cases) {
    const r = runHook(cwd, cmd);
    assert(`blocks compound/quoted "${cmd}"`, isBlocked(r), JSON.stringify(r));
  }
  rmSync(cwd, { recursive: true, force: true });
}

// ─── Test 8: closed lane denies, and the escape hatch does not open it ───────
console.log('\nTest 8: closed lane (irreversible prod-data writes)');
{
  const cwd = makeCwd(true);
  const closedCases = [
    'psql -c "DROP TABLE users"',
    'psql -h db.prod.internal -c "delete from accounts"',
    'prisma migrate deploy --schema prod.prisma',
  ];
  for (const cmd of closedCases) {
    assert(`denies (not just asks) "${cmd.slice(0, 40)}"`, decisionOf(runHook(cwd, cmd)) === 'deny', JSON.stringify(runHook(cwd, cmd)));
  }
  // The whole point of a closed lane: no suffix opens it. If the escape hatch
  // worked here, this would be a threshold, not a lane.
  const withHatch = runHook(cwd, 'psql -c "DROP TABLE users" # permission-ladder: allow');
  assert('escape hatch does NOT open a closed lane', decisionOf(withHatch) === 'deny', JSON.stringify(withHatch));

  // A gated lane still honours the hatch — the two behaviours must differ.
  const gatedWithHatch = runHook(cwd, 'rm -rf /tmp/foo # permission-ladder: allow');
  assert('escape hatch still opens a gated lane', decisionOf(gatedWithHatch) === 'allow', JSON.stringify(gatedWithHatch));

  // Non-production database work is not in the closed lane.
  const staging = runHook(cwd, 'psql -h staging -c "select 1"');
  assert('staging db access is not blocked', decisionOf(staging) === 'allow', JSON.stringify(staging));
  rmSync(cwd, { recursive: true, force: true });
}

// ─── Test 7: DEVKIT_DISABLED_HOOKS env var disables regardless of config ─────
console.log('\nTest 7: DEVKIT_DISABLED_HOOKS overrides config');
{
  const cwd = makeCwd(true);
  const payload = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'rm -rf /tmp/foo' } });
  const r = spawnSync(process.execPath, [HOOK_PATH], {
    cwd,
    input: payload,
    encoding: 'utf-8',
    env: { ...process.env, DEVKIT_DISABLED_HOOKS: 'permission-ladder-guard' },
  });
  const parsed = JSON.parse(r.stdout);
  assert('env var disables the hook', parsed.continue === true, JSON.stringify(parsed));
  rmSync(cwd, { recursive: true, force: true });
}

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
