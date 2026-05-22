/**
 * output-compressor.ts
 *
 * Reduces verbose bash / tool output before it reaches the model context.
 * Zero runtime dependencies — pure Node.js / TypeScript.
 *
 * Pipeline:
 *  0. (opt-in) cross-call dedup  — replaces output that matches a recent call
 *  1. stripAnsi
 *  2. dedupAdjacent              — collapse repeated lines to [×N]
 *  3. collapseDirectoryListings  — fold sibling files in a dir
 *  4. applyHintFilter            — hint-specific noise removal
 *  5. truncateLines              — head/tail/head_tail
 */

import { getDefaultCache, type CrossCallDedupCache } from "./cross-call-dedup.js";

export type CompressionHint = "generic" | "git log" | "npm install" | "test";
export type CompressionStrategy = "head" | "tail" | "head_tail";

export interface CompressOptions {
  text: string;
  hint?: CompressionHint;
  max_lines?: number;
  strategy?: CompressionStrategy;
  /**
   * Cross-call dedup. When set, the compressor first checks a sliding
   * window of recent outputs. Identical or ≥85% similar outputs are
   * replaced with a short marker, skipping the rest of the pipeline.
   * Pass `true` to use the process-wide default cache, or pass your own
   * `CrossCallDedupCache` instance for scoped tracking.
   */
  crossCall?: boolean | CrossCallDedupCache;
  /**
   * Optional label stored with the cross-call record. Shows up in the
   * replacement marker — useful for human-readable context.
   */
  crossCallLabel?: string;
}

export interface CompressResult {
  compressed: string;
  original_bytes: number;
  compressed_bytes: number;
  reduction_pct: number;
  dropped_lines: number;
  /** True when output was replaced by the cross-call dedup short marker. */
  cross_call_match?: {
    call_id: number;
    kind: "exact" | "fuzzy";
    similarity: number;
  };
}

// ─── Stage 1: Strip ANSI escape codes ─────────────────────────────────────────
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b\[[0-9;]*[mGKHF]/g, "");
}

// ─── Stage 2: Dedup adjacent identical lines → [×N] ──────────────────────────
function dedupAdjacent(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let j = i + 1;
    while (j < lines.length && lines[j] === lines[i]) j++;
    const count = j - i;
    if (count > 1) {
      out.push(`${lines[i]}  [×${count}]`);
    } else {
      out.push(lines[i]);
    }
    i = j;
  }
  return out;
}

// ─── Stage 3: Collapse directory listings ────────────────────────────────────
/**
 * When ≥5 consecutive lines share the same directory prefix, collapse them
 * into "  dir/  N files"
 */
function collapseDirectoryListings(lines: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    // Check if next 5+ lines share a common directory prefix
    const match = lines[i].match(/^(.+\/)[^/\s]+\s*$/);
    if (match) {
      const dir = match[1];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith(dir) && !lines[j].slice(dir.length).includes("/")) {
        j++;
      }
      if (j - i >= 5) {
        out.push(`  ${dir}  ${j - i} files`);
        i = j;
        continue;
      }
    }
    out.push(lines[i]);
    i++;
  }
  return out;
}

// ─── Stage 4: Hint-specific filtering ────────────────────────────────────────
function applyHintFilter(lines: string[], hint: CompressionHint): string[] {
  switch (hint) {
    case "git log":
      return lines.filter(l =>
        /^commit\s|^Author:|^Date:|^Merge:|^\s{4}/.test(l) ||
        l.trim() === ""
      );

    case "npm install":
      return lines.filter(l => {
        const t = l.trim();
        // keep warnings, errors, and summary lines
        if (/^(npm warn|npm err|warn|error|ERR!)/i.test(t)) return true;
        if (/^added \d+|packages? (installed|updated|removed)/i.test(t)) return true;
        // drop verbose resolution/fetch lines
        if (/^(npm notice|idealTree|reify:|timing|http|FETCH|WARN|added \d+ packages from)/i.test(t)) return false;
        return true;
      });

    case "test":
      return lines.filter(l => {
        const t = l.trim();
        // keep failure/pass summaries, counts, test names
        if (/FAIL|PASS|ERROR|✓|✗|×|●|FAILED|passed|failed|skipped/i.test(t)) return true;
        // drop progress bars, dots, timing noise
        if (/^[.\s─]+$/.test(t)) return false;
        return true;
      });

    default:
      return lines;
  }
}

// ─── Stage 5: Truncate by strategy ───────────────────────────────────────────
function truncateLines(
  lines: string[],
  maxLines: number,
  strategy: CompressionStrategy
): { result: string[]; dropped: number } {
  if (lines.length <= maxLines) return { result: lines, dropped: 0 };

  const dropped = lines.length - maxLines;

  switch (strategy) {
    case "head":
      return { result: lines.slice(0, maxLines), dropped };

    case "tail":
      return { result: lines.slice(-maxLines), dropped };

    case "head_tail":
    default: {
      const half = Math.floor(maxLines / 2);
      const head = lines.slice(0, half);
      const tail = lines.slice(-(maxLines - half));
      const droppedMiddle = lines.length - head.length - tail.length;
      return {
        result: [...head, `[... ${droppedMiddle} lines dropped ...]`, ...tail],
        dropped: droppedMiddle,
      };
    }
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function compressOutput(opts: CompressOptions): CompressResult {
  const {
    text,
    hint = "generic",
    max_lines = 40,
    strategy = "head_tail",
    crossCall = false,
    crossCallLabel,
  } = opts;

  const originalBytes = Buffer.byteLength(text, "utf8");

  // Stage 0 — cross-call dedup (opt-in). Resolve the cache, then check before
  // running the rest of the pipeline. On match, replace and short-circuit;
  // on miss, insert the raw text so future calls can match against it.
  if (crossCall) {
    const cache = crossCall === true ? getDefaultCache() : crossCall;
    const { replacement, match } = cache.check(text);
    cache.insert(text, crossCallLabel);
    if (replacement !== null && match) {
      const compressedBytes = Buffer.byteLength(replacement, "utf8");
      return {
        compressed: replacement,
        original_bytes: originalBytes,
        compressed_bytes: compressedBytes,
        reduction_pct:
          originalBytes === 0
            ? 0
            : Math.round(((originalBytes - compressedBytes) / originalBytes) * 100),
        dropped_lines: text.split("\n").length - 1,
        cross_call_match: {
          call_id: match.callId,
          kind: match.kind,
          similarity: match.similarity,
        },
      };
    }
  }

  // Stages 1-5 — intra-call pipeline
  let lines = stripAnsi(text).split("\n");
  lines = dedupAdjacent(lines);
  lines = collapseDirectoryListings(lines);
  lines = applyHintFilter(lines, hint);

  const { result, dropped } = truncateLines(lines, max_lines, strategy);
  const compressed = result.join("\n");

  const compressedBytes = Buffer.byteLength(compressed, "utf8");
  const reductionPct =
    originalBytes === 0
      ? 0
      : Math.round(((originalBytes - compressedBytes) / originalBytes) * 100);

  return {
    compressed,
    original_bytes: originalBytes,
    compressed_bytes: compressedBytes,
    reduction_pct: reductionPct,
    dropped_lines: dropped,
  };
}
