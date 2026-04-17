#!/usr/bin/env node
/**
 * session-event-logger.mjs — PostToolUse hook
 *
 * Appends a JSONL record to .auto/events.jsonl for every tool call.
 * Rotates the file when it exceeds 10 MB (moves to .auto/events.YYYY-MM-DD.jsonl).
 *
 * Event format:
 * {"ts":"...","tool":"Read","args":{...},"status":"ok","duration_ms":12,"bytes_out":842}
 */

import fs   from 'fs';
import path from 'path';

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_BYTES       = 10 * 1024 * 1024;   // 10 MB rotation threshold
const MAX_STR_LEN     = 200;                 // truncate long string values
const RETENTION_DAYS  = 14;                  // prune rotated events older than this
const SENSITIVE_KEYS  = new Set(['password', 'secret', 'token', 'key', 'api_key', 'authorization']);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Truncate a string to MAX_STR_LEN chars */
function truncate(s) {
  if (typeof s !== 'string') return s;
  return s.length > MAX_STR_LEN ? s.slice(0, MAX_STR_LEN) + '…' : s;
}

/** Shallow-normalize args: truncate strings, redact sensitive keys */
function normalizeArgs(args) {
  if (!args || typeof args !== 'object') return args;
  const out = {};
  for (const [k, v] of Object.entries(args)) {
    if (SENSITIVE_KEYS.has(k.toLowerCase())) {
      out[k] = '[redacted]';
    } else if (typeof v === 'string') {
      out[k] = truncate(v);
    } else if (Array.isArray(v)) {
      out[k] = v.slice(0, 5).map(i => (typeof i === 'string' ? truncate(i) : i));
    } else {
      out[k] = v;
    }
  }
  return out;
}

/** Count approximate bytes in a string or buffer */
function byteLen(s) {
  if (!s) return 0;
  return Buffer.byteLength(typeof s === 'string' ? s : String(s), 'utf8');
}

/** Find the project root (where .auto/ will live) by walking up from cwd */
function findProjectRoot() {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (fs.existsSync(path.join(dir, '.git')) ||
        fs.existsSync(path.join(dir, 'package.json')) ||
        fs.existsSync(path.join(dir, '.claude'))) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** Rotate events.jsonl if it exceeds MAX_BYTES */
function maybeRotate(eventsPath) {
  try {
    const stat = fs.statSync(eventsPath);
    if (stat.size >= MAX_BYTES) {
      const date = new Date().toISOString().slice(0, 10);
      const rotated = eventsPath.replace('.jsonl', `.${date}.jsonl`);
      // If a rotation file for today already exists, append a suffix
      const dest = fs.existsSync(rotated)
        ? rotated.replace('.jsonl', `-${Date.now()}.jsonl`)
        : rotated;
      fs.renameSync(eventsPath, dest);
    }
  } catch {
    // file doesn't exist yet — nothing to rotate
  }
}

/** Prune rotated events.*.jsonl files older than RETENTION_DAYS */
function maybePrune(autoDir) {
  try {
    // Throttle: only prune ~1 in 200 writes to avoid overhead per tool call
    if (Math.random() > 0.005) return;
    const cutoff = Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000;
    for (const name of fs.readdirSync(autoDir)) {
      // Matches events.YYYY-MM-DD.jsonl and events.YYYY-MM-DD-<ts>.jsonl
      if (!/^events\.[0-9]{4}-[0-9]{2}-[0-9]{2}.*\.jsonl$/.test(name)) continue;
      const full = path.join(autoDir, name);
      try {
        const stat = fs.statSync(full);
        if (stat.mtimeMs < cutoff) fs.unlinkSync(full);
      } catch {
        // per-file failure is fine
      }
    }
  } catch {
    // directory unreadable — nothing to prune
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Read stdin (Claude Code hook payload)
  let raw = '';
  try {
    for await (const chunk of process.stdin) raw += chunk;
  } catch {
    process.exit(0);
  }

  if (!raw.trim()) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const toolName   = payload.tool_name   ?? payload.tool   ?? 'Unknown';
  const toolInput  = payload.tool_input  ?? payload.input  ?? {};
  const toolOutput = payload.tool_response ?? payload.output ?? {};
  const ts         = new Date().toISOString();

  // Determine status and error
  let status = 'ok';
  let errorMsg;
  if (toolOutput && (toolOutput.is_error || toolOutput.error)) {
    status   = 'error';
    errorMsg = truncate(String(toolOutput.error ?? toolOutput.output ?? ''));
  }

  // Estimate bytes_out from output content
  const outputContent = toolOutput?.content ?? toolOutput?.output ?? toolOutput?.result ?? '';
  const bytesOut = byteLen(
    Array.isArray(outputContent)
      ? outputContent.map(c => c?.text ?? '').join('')
      : outputContent
  );

  // Build event record
  const event = {
    ts,
    tool:     toolName,
    args:     normalizeArgs(toolInput),
    status,
    bytes_out: bytesOut,
  };
  if (errorMsg) event.error = errorMsg;

  // Resolve output path: .auto/events.jsonl relative to project root
  const root       = findProjectRoot();
  const autoDir    = path.join(root, '.auto');
  const eventsPath = path.join(autoDir, 'events.jsonl');

  try {
    fs.mkdirSync(autoDir, { recursive: true });
    maybeRotate(eventsPath);
    maybePrune(autoDir);
    fs.appendFileSync(eventsPath, JSON.stringify(event) + '\n', 'utf8');
  } catch {
    // Silent failure — never block Claude Code execution
  }

  process.exit(0);
}

// Timeout safety: exit after 100ms regardless
const timer = setTimeout(() => process.exit(0), 100);
timer.unref();

main().catch(() => process.exit(0));
