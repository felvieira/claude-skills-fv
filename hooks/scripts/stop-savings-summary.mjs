#!/usr/bin/env node
/**
 * stop-savings-summary.mjs — Stop hook (v2.4.0+)
 *
 * On session stop, runs `scripts/savings-report.mjs --mini` and injects the
 * 3-line summary via additionalContext so the user sees what the kit saved
 * during their session.
 *
 * Throttled: only shows summary if it's been >5 min since last show OR if
 * there's something actually worth saying (blocked dispatches, hot files).
 *
 * Disable with: DEVKIT_DISABLED_HOOKS=stop-savings-summary
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isHookDisabled, resolveBotPath } from './utils.mjs';

const HOOK_ID = 'stop-savings-summary';
const MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 min between showings
const SCRIPT_REL = '../../scripts/savings-report.mjs';

function findReportScript() {
  // 1. Resolve via plugin root env var (Claude Code sets this)
  if (process.env.CLAUDE_PLUGIN_ROOT) {
    const p = join(process.env.CLAUDE_PLUGIN_ROOT, 'scripts/savings-report.mjs');
    if (existsSync(p)) return p;
  }
  // 2. Resolve via own location
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const candidate = join(__dirname, SCRIPT_REL);
  if (existsSync(candidate)) return candidate;
  return null;
}

function shouldShow() {
  try {
    const markerFile = resolveBotPath('.savings-summary-last-shown');
    if (!existsSync(markerFile)) return true;
    const lastMs = statSync(markerFile).mtimeMs;
    return (Date.now() - lastMs) >= MIN_INTERVAL_MS;
  } catch {
    return true;
  }
}

function markShown() {
  try {
    const botDir = resolveBotPath();
    mkdirSync(botDir, { recursive: true });
    writeFileSync(resolveBotPath('.savings-summary-last-shown'), String(Date.now()));
  } catch {}
}

// ─── Main ─────────────────────────────────────────────────────────────────────
let _input = '';
process.stdin.setEncoding('utf-8');
process.stdin.on('data', (c) => { _input += c; });
process.stdin.on('end', () => {
  if (isHookDisabled(HOOK_ID)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  if (!shouldShow()) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const script = findReportScript();
  if (!script) {
    // Engine not installed — silent pass
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Run engine in --mini mode with project cwd
  let summary = '';
  try {
    const res = spawnSync('node', [script, '--mini'], {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 3000,
    });
    summary = (res.stdout || '').trim();
  } catch {
    summary = '';
  }

  if (!summary) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  markShown();

  // Stop hooks: hookSpecificOutput NOT supported by Claude Code schema.
  // Use systemMessage at top-level instead.
  process.stdout.write(JSON.stringify({
    continue: true,
    systemMessage: summary,
  }));
});
