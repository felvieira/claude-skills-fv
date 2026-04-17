/**
 * event-log.ts
 *
 * Read and query the JSONL session event log written by session-event-logger.mjs.
 * File: .auto/events.jsonl (relative to project root)
 */

import fs   from "fs";
import path from "path";
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionEvent {
  ts: string;
  tool: string;
  args: Record<string, unknown>;
  status: "ok" | "error";
  bytes_out?: number;
  error?: string;
}

export interface EventFilter {
  tool?: string;
  status?: "ok" | "error";
  since?: string;       // ISO timestamp
  limit?: number;
}

export interface SessionEventsResult {
  events: SessionEvent[];
  total: number;
  session_start: string | null;
  session_end: string | null;
}

export interface SeenFile {
  path: string;
  first_seen_ts: string;
  last_seen_ts: string;
  access_count: number;
  modified: boolean;
}

export interface SeenError {
  error_hash: string;
  sample: string;
  count: number;
  tools: string[];
  first_seen: string;
  last_seen: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILE_TOOLS    = new Set(["Read", "Edit", "Write", "Glob", "Glob tool"]);
const WRITE_TOOLS   = new Set(["Edit", "Write"]);

function findEventsPath(projectPath?: string): string {
  const base = projectPath ?? process.cwd();
  return path.join(base, ".auto", "events.jsonl");
}

function loadAllEvents(projectPath?: string): SessionEvent[] {
  const eventsPath = findEventsPath(projectPath);
  if (!fs.existsSync(eventsPath)) return [];

  const raw = fs.readFileSync(eventsPath, "utf-8");
  const events: SessionEvent[] = [];

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed) as SessionEvent);
    } catch {
      // Skip malformed lines
    }
  }

  return events;
}

function md5(s: string): string {
  return crypto.createHash("md5").update(s).digest("hex").slice(0, 8);
}

/**
 * Normalize an error message for deduplication:
 * strip line numbers, paths, timestamps, memory addresses.
 */
function normalizeError(msg: string): string {
  return msg
    .replace(/:\d+:\d+/g, "")           // strip line:col
    .replace(/0x[0-9a-f]+/gi, "0xADDR") // strip memory addresses
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z]+/g, "TS") // strip timestamps
    .replace(/\/[^\s]+/g, "/PATH")       // strip absolute paths
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);                       // cap length
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function querySessionEvents(
  projectPath: string | undefined,
  filter: EventFilter = {}
): SessionEventsResult {
  const all = loadAllEvents(projectPath);
  const { tool, status, since, limit = 50 } = filter;

  let filtered = all;

  if (tool) {
    const toolLower = tool.toLowerCase();
    filtered = filtered.filter(e => e.tool.toLowerCase() === toolLower);
  }

  if (status) {
    filtered = filtered.filter(e => e.status === status);
  }

  if (since) {
    const sinceMs = new Date(since).getTime();
    filtered = filtered.filter(e => new Date(e.ts).getTime() >= sinceMs);
  }

  const total = filtered.length;
  const events = filtered.slice(-limit); // return most recent N

  return {
    events,
    total,
    session_start: all.length > 0 ? all[0].ts : null,
    session_end:   all.length > 0 ? all[all.length - 1].ts : null,
  };
}

export function querySeenFiles(projectPath?: string): SeenFile[] {
  const all = loadAllEvents(projectPath);

  // Map from file path → aggregated info
  const map = new Map<string, SeenFile>();

  for (const event of all) {
    if (!FILE_TOOLS.has(event.tool)) continue;

    const filePath =
      (event.args?.file_path as string) ??
      (event.args?.path as string) ??
      (event.args?.pattern as string) ??
      null;

    if (!filePath) continue;

    const modified = WRITE_TOOLS.has(event.tool);

    if (map.has(filePath)) {
      const entry = map.get(filePath)!;
      entry.access_count++;
      entry.last_seen_ts = event.ts;
      if (modified) entry.modified = true;
    } else {
      map.set(filePath, {
        path:          filePath,
        first_seen_ts: event.ts,
        last_seen_ts:  event.ts,
        access_count:  1,
        modified,
      });
    }
  }

  // Sort by last_seen descending
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.last_seen_ts).getTime() - new Date(a.last_seen_ts).getTime()
  );
}

export function querySeenErrors(projectPath?: string): SeenError[] {
  const all = loadAllEvents(projectPath);

  const errorEvents = all.filter(e => e.status === "error" && e.error);

  // Group by normalized error hash
  const map = new Map<string, SeenError>();

  for (const event of errorEvents) {
    const normalized = normalizeError(event.error!);
    const hash = md5(normalized);

    if (map.has(hash)) {
      const entry = map.get(hash)!;
      entry.count++;
      entry.last_seen = event.ts;
      if (!entry.tools.includes(event.tool)) entry.tools.push(event.tool);
    } else {
      map.set(hash, {
        error_hash: hash,
        sample:     event.error!.slice(0, 200),
        count:      1,
        tools:      [event.tool],
        first_seen: event.ts,
        last_seen:  event.ts,
      });
    }
  }

  // Sort by count descending
  return Array.from(map.values()).sort((a, b) => b.count - a.count);
}
