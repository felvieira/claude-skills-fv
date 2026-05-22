/**
 * cross-call-dedup.ts
 *
 * Cross-call output deduplication via FNV-1a hash + bottom-k MinHash shingles +
 * Jaccard similarity. Maintains a sliding window of recent tool outputs and
 * emits a short replacement when a new output is identical or near-identical
 * to a previous one.
 *
 * Why this exists: `output-compressor.ts` collapses noise *within* a single
 * call. But autonomous loops (/auto, /swarm) re-run `npm test`, `git status`,
 * `eslint`, etc. dozens of times per session — and every re-run pays the full
 * token cost, even when the output only differs by a timestamp. This module
 * absorbs that variance.
 *
 * Pattern adapted from claudioemmanuel/squeez (Apache-2.0), specifically its
 * `src/context/redundancy.rs` and `src/context/hash.rs` — see NOTICE.
 *
 * Zero runtime dependencies. Pure TypeScript.
 */

// ─── FNV-1a 64-bit hash (fast exact match) ────────────────────────────────────
// 64-bit FNV constants split into 32-bit hi/lo to stay within Number safety.
const FNV_OFFSET_LO = 0x84222325;
const FNV_OFFSET_HI = 0xcbf29ce4;
const FNV_PRIME_LO = 0x000001b3;
const FNV_PRIME_HI = 0x00000100;

/** FNV-1a 64-bit hash returned as 16-char lowercase hex string. */
export function fnv1a64(input: string): string {
  let hi = FNV_OFFSET_HI;
  let lo = FNV_OFFSET_LO;
  for (let i = 0; i < input.length; i++) {
    lo ^= input.charCodeAt(i);
    // 64-bit multiply by FNV_PRIME (0x100000001b3) decomposed into hi/lo.
    const lo32 = lo >>> 0;
    const hi32 = hi >>> 0;
    const aLow = lo32 & 0xffff;
    const aHigh = lo32 >>> 16;
    const bLow = FNV_PRIME_LO & 0xffff;
    const bHigh = FNV_PRIME_LO >>> 16;
    const ll = aLow * bLow;
    const lh = aLow * bHigh + aHigh * bLow;
    const newLo = (ll + ((lh & 0xffff) << 16)) >>> 0;
    const carry = Math.floor((ll + ((lh & 0xffff) << 16)) / 0x100000000);
    const newHi =
      (hi32 * FNV_PRIME_LO + lo32 * FNV_PRIME_HI + (lh >>> 16) + carry) >>> 0;
    lo = newLo;
    hi = newHi;
  }
  return (hi >>> 0).toString(16).padStart(8, "0") +
         (lo >>> 0).toString(16).padStart(8, "0");
}

// ─── Shingles (whitespace-token trigrams) + bottom-k MinHash ─────────────────
const SHINGLE_K = 96;
const SHINGLE_SIZE = 3;

/** 32-bit FNV-1a — used as the cheap hash family for MinHash signatures. */
function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Normalize a token before shingling. Replaces volatile patterns (timestamps,
 * durations, hex hashes, large numbers) with placeholders so that re-runs
 * with the same structure but different timing produce stable trigrams.
 *
 * Without this, "(12.34s)" and "(12.41s)" become entirely different tokens
 * and every trigram containing them mismatches — collapsing Jaccard to near
 * zero even though the output is structurally identical.
 */
function normalizeToken(tok: string): string {
  // Match common volatile substrings — order matters (longer patterns first).
  return tok
    .replace(/\b\d+\.\d+m?s\b/g, "<dur>")        // "12.34s", "1.2ms"
    .replace(/\b\d{1,3}:\d{2}:\d{2}\b/g, "<time>") // "14:32:18"
    .replace(/\b[0-9a-f]{7,40}\b/g, "<hash>")    // git SHA, FNV hex
    .replace(/\b\d{4,}\b/g, "<num>");            // large integers (timings, ms)
}

/**
 * Build a bottom-k MinHash signature from text. Tokens are whitespace-split,
 * normalized to absorb volatile substrings (timestamps, durations, hashes),
 * grouped in trigrams, hashed, and the smallest K values kept sorted.
 */
export function shingleMinHash(text: string): number[] {
  const tokens = text
    .split(/\s+/)
    .filter(t => t.length > 0)
    .map(normalizeToken);
  if (tokens.length < SHINGLE_SIZE) {
    // Too short for trigrams — fall back to single-token shingles so very
    // small outputs still get a comparable signature.
    return tokens
      .map(t => fnv1a32(t))
      .sort((a, b) => a - b)
      .slice(0, SHINGLE_K);
  }
  const hashes: number[] = [];
  for (let i = 0; i <= tokens.length - SHINGLE_SIZE; i++) {
    hashes.push(fnv1a32(tokens.slice(i, i + SHINGLE_SIZE).join(" ")));
  }
  hashes.sort((a, b) => a - b);
  // Dedup adjacent (sorted) before slicing — repeated trigrams shouldn't
  // dominate the bottom-k bucket.
  const unique: number[] = [];
  for (const h of hashes) {
    if (unique.length === 0 || unique[unique.length - 1] !== h) {
      unique.push(h);
    }
  }
  return unique.slice(0, SHINGLE_K);
}

/**
 * Jaccard similarity between two sorted bottom-k MinHash signatures.
 * Sorted-merge in O(n+m). Returns a value in [0, 1].
 */
export function jaccard(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  let i = 0;
  let j = 0;
  let inter = 0;
  let union = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { inter++; union++; i++; j++; }
    else if (a[i] < b[j]) { union++; i++; }
    else { union++; j++; }
  }
  union += (a.length - i) + (b.length - j);
  return union === 0 ? 0 : inter / union;
}

// ─── Sliding window of recent calls ──────────────────────────────────────────

export interface CallRecord {
  /** Monotonically increasing call id assigned on insertion. */
  callId: number;
  /** FNV-1a 64-bit hex of the raw text — exact match fast path. */
  exactHash: string;
  /** Bottom-k MinHash signature for fuzzy match. */
  signature: number[];
  /** Optional label (command name, hint, etc.) for the replacement marker. */
  label?: string;
}

export interface DedupResult {
  /** What to send to the model in place of the original text. */
  replacement: string | null;
  /** Match metadata when a match was found. */
  match?: {
    callId: number;
    kind: "exact" | "fuzzy";
    similarity: number;
    label?: string;
  };
}

export interface CrossCallDedupOptions {
  /** Size of the sliding window. Default 16. */
  windowSize?: number;
  /** Jaccard threshold above which a match is fuzzy-replaced. Default 0.85. */
  threshold?: number;
}

/**
 * Sliding window of recent tool outputs. Not thread-safe (single-process
 * agent loop assumed). Persisted-by-caller — this class only holds the
 * in-memory window.
 */
export class CrossCallDedupCache {
  private readonly windowSize: number;
  private readonly threshold: number;
  private records: CallRecord[] = [];
  private nextId = 1;

  constructor(opts: CrossCallDedupOptions = {}) {
    this.windowSize = Math.max(1, opts.windowSize ?? 16);
    this.threshold = Math.min(1, Math.max(0, opts.threshold ?? 0.85));
  }

  /**
   * Check the cache. Does NOT insert. Returns a replacement string when the
   * incoming text matches a recent call exactly or fuzzily.
   */
  check(text: string): DedupResult {
    if (this.records.length === 0) return { replacement: null };

    const exactHash = fnv1a64(text);
    // Fast path: exact hash match. Walk newest-to-oldest.
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      if (r.exactHash === exactHash) {
        return {
          replacement: `[squeez-style: identical to call #${r.callId}${r.label ? ` (${r.label})` : ""}]`,
          match: { callId: r.callId, kind: "exact", similarity: 1, label: r.label },
        };
      }
    }

    // Fuzzy path: compute signature, scan window, pick best above threshold.
    const sig = shingleMinHash(text);
    let best: { record: CallRecord; sim: number } | null = null;
    for (let i = this.records.length - 1; i >= 0; i--) {
      const r = this.records[i];
      const sim = jaccard(sig, r.signature);
      if (sim >= this.threshold && (best === null || sim > best.sim)) {
        best = { record: r, sim };
      }
    }

    if (best !== null) {
      const pct = Math.round(best.sim * 100);
      return {
        replacement: `[squeez-style: ~${pct}% similar to call #${best.record.callId}${best.record.label ? ` (${best.record.label})` : ""}]`,
        match: {
          callId: best.record.callId,
          kind: "fuzzy",
          similarity: best.sim,
          label: best.record.label,
        },
      };
    }

    return { replacement: null };
  }

  /**
   * Insert a new call into the window. Caller decides whether to insert the
   * raw text (when no match was found) or skip insertion (when replacement
   * was used — keeping the original signature for future matches).
   */
  insert(text: string, label?: string): CallRecord {
    const record: CallRecord = {
      callId: this.nextId++,
      exactHash: fnv1a64(text),
      signature: shingleMinHash(text),
      label,
    };
    this.records.push(record);
    if (this.records.length > this.windowSize) {
      this.records.shift();
    }
    return record;
  }

  /**
   * Convenience: check first, then insert (always). Returns the dedup result.
   * Inserting after a match lets future calls match against the same anchor.
   */
  checkAndInsert(text: string, label?: string): DedupResult {
    const result = this.check(text);
    this.insert(text, label);
    return result;
  }

  /** Current number of records in the window. */
  size(): number {
    return this.records.length;
  }

  /** Reset the window. Useful between sessions or for tests. */
  clear(): void {
    this.records = [];
    this.nextId = 1;
  }
}

// ─── Default singleton (most callers want a process-wide window) ─────────────

let _defaultCache: CrossCallDedupCache | null = null;

export function getDefaultCache(): CrossCallDedupCache {
  if (_defaultCache === null) {
    _defaultCache = new CrossCallDedupCache();
  }
  return _defaultCache;
}

export function resetDefaultCache(): void {
  _defaultCache = null;
}
