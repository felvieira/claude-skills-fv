/**
 * session.mjs — save/load .auto/session.json for resume robusto.
 *
 * Persists run state so the loop can resume across invocations and detects
 * conflicting prompts between a saved session and a new invocation.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname } from 'path';

const SESSION_FILE = '.auto/session.json';

const PERSISTED_FIELDS = [
  'prompt',
  'agent',
  'model',
  'maxTokens',
  'stopWhen',
  'polish',
  'runId',
  'branch',
  'iteration',
  'taskDone',
  'taskBlocked',
  'lastError',
  'polishIncomplete',
];

const COMPARE_FIELDS = ['prompt', 'agent', 'model', 'maxTokens', 'stopWhen', 'polish'];

// Injection hook for tests — bypasses readline.
let _prompter = null;
export function _setPrompter(fn) {
  _prompter = fn;
}

export function saveSession(data) {
  const payload = {};
  for (const k of PERSISTED_FIELDS) {
    if (data[k] !== undefined) payload[k] = data[k];
  }
  mkdirSync(dirname(SESSION_FILE), { recursive: true });
  writeFileSync(SESSION_FILE, JSON.stringify(payload, null, 2), 'utf-8');
}

export function loadSession() {
  if (!existsSync(SESSION_FILE)) return null;
  try {
    const raw = readFileSync(SESSION_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

export function compareSession(a, b) {
  const diffs = [];
  const aa = a || {};
  const bb = b || {};
  for (const f of COMPARE_FIELDS) {
    if (!isEqual(aa[f], bb[f])) diffs.push(f);
  }
  return diffs;
}

async function defaultPrompter(question) {
  const readline = await import('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export async function resolvePromptConflict(saved, newOpts) {
  const message =
    'Saved session has a different prompt/config than current invocation.\n' +
    `Saved prompt:   ${JSON.stringify((saved || {}).prompt)}\n` +
    `Current prompt: ${JSON.stringify((newOpts || {}).prompt)}\n` +
    'Resolve: (c)ontinue with new prompt / (n)ew branch / (q)uit: ';

  let answer;
  if (_prompter) {
    answer = await _prompter(message);
  } else {
    if (!process.stdin.isTTY) {
      throw new Error(
        'Cannot resolve prompt conflict in non-interactive mode. ' +
          'Re-run with a TTY or delete .auto/session.json to start fresh.',
      );
    }
    answer = await defaultPrompter(message);
  }

  const a = String(answer || '').trim().toLowerCase();
  if (a === 'c' || a === 'continue') return 'continue';
  if (a === 'n' || a === 'new-branch' || a === 'new') return 'new-branch';
  return 'quit';
}
