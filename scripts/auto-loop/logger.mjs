/**
 * logger.mjs — console pretty + JSONL debug log + terminal title.
 *
 * Three concerns:
 *   1. Console pretty printing (ported from legacy log/logSection).
 *   2. JSONL debug log at .auto/runs/<runId>/debug.jsonl for postmortems.
 *   3. Terminal title manipulation (best-effort, most terminals).
 *
 * State is module-level: only one JSONL log open at a time per process.
 */

import { appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// ─── Module-level state ──────────────────────────────────────────────────────

let currentLogPath = null;
let currentRunId = null;
let savedTitle = null;

// ─── Console pretty ──────────────────────────────────────────────────────────

export function log(msg, prefix = '→') {
  console.log(`${prefix} ${msg}`);
}

export function logSection(title) {
  const sep = '═'.repeat(60);
  console.log(`\n${sep}`);
  console.log(`  ${title}`);
  console.log(sep);
}

// ─── JSONL debug log ─────────────────────────────────────────────────────────

export function openLog(runId) {
  if (!runId) throw new Error('openLog: runId is required');
  const dir = join('.auto', 'runs', String(runId));
  mkdirSync(dir, { recursive: true });
  currentLogPath = join(dir, 'debug.jsonl');
  currentRunId = String(runId);
  // Touch the file so it exists even before first event.
  appendFileSync(currentLogPath, '');
  return currentLogPath;
}

export function logEvent(event, payload = {}) {
  if (!currentLogPath) return; // no-op if no log open
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    event,
    runId: currentRunId,
    payload,
  });
  appendFileSync(currentLogPath, line + '\n');
}

export function closeLog() {
  // appendFileSync is synchronous; nothing to flush. Just clear state.
  currentLogPath = null;
  currentRunId = null;
}

// ─── Error serialization ─────────────────────────────────────────────────────

export function serializeError(err, depth = 0) {
  if (err == null) return undefined;
  if (depth >= 5) {
    return { name: 'TruncatedError', message: '[max cause depth reached]' };
  }
  // Non-Error values: best-effort
  if (!(err instanceof Error)) {
    return {
      name: typeof err,
      message: String(err),
      stack: undefined,
      cause: undefined,
    };
  }
  const out = {
    name: err.name,
    message: err.message,
    stack: err.stack,
  };
  if (err.cause !== undefined) {
    out.cause = serializeError(err.cause, depth + 1);
  }
  return out;
}

// ─── Terminal title ──────────────────────────────────────────────────────────

export function setTitle(text) {
  if (savedTitle === null) {
    // First call: remember we changed it (we cannot read the original from
    // most terminals, so we save empty — restoreTitle clears it).
    savedTitle = '';
  }
  try {
    process.stderr.write(`\x1b]0;${text}\x07`);
  } catch {
    // Some environments (e.g. closed stderr) — ignore.
  }
}

export function restoreTitle() {
  const text = savedTitle ?? '';
  try {
    process.stderr.write(`\x1b]0;${text}\x07`);
  } catch {
    // ignore
  }
  savedTitle = null;
}
