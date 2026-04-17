/**
 * output-compressor.ts
 *
 * Reduces verbose bash / tool output before it reaches the model context.
 * Zero runtime dependencies — pure Node.js / TypeScript.
 */

export type CompressionHint = "generic" | "git log" | "npm install" | "test";
export type CompressionStrategy = "head" | "tail" | "head_tail";

export interface CompressOptions {
  text: string;
  hint?: CompressionHint;
  max_lines?: number;
  strategy?: CompressionStrategy;
}

export interface CompressResult {
  compressed: string;
  original_bytes: number;
  compressed_bytes: number;
  reduction_pct: number;
  dropped_lines: number;
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
  } = opts;

  const originalBytes = Buffer.byteLength(text, "utf8");

  // Pipeline
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
