/**
 * cross-call-dedup.test.ts
 *
 * Plain Node test (no framework dep). Run with:
 *   node --import tsx mcp-server/src/lib/cross-call-dedup.test.ts
 * or after build:
 *   node mcp-server/dist/lib/cross-call-dedup.test.js
 *
 * Exits non-zero on first failure so it can be wired into CI.
 */
import {
  fnv1a64,
  shingleMinHash,
  jaccard,
  CrossCallDedupCache,
} from "./cross-call-dedup.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ok  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  FAIL ${name}`);
    console.error(`       ${(err as Error).message}`);
    failed++;
  }
}

function assertEqual<T>(actual: T, expected: T, msg: string) {
  if (actual !== expected) {
    throw new Error(`${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

console.log("cross-call-dedup");

// ─── fnv1a64 ──────────────────────────────────────────────────────────────────
test("fnv1a64: deterministic", () => {
  const a = fnv1a64("hello world");
  const b = fnv1a64("hello world");
  assertEqual(a, b, "same input must yield same hash");
});

test("fnv1a64: distinguishes near-strings", () => {
  const a = fnv1a64("hello world");
  const b = fnv1a64("hello worle");
  assertTrue(a !== b, "different input must yield different hash");
});

test("fnv1a64: returns 16 hex chars", () => {
  const h = fnv1a64("anything");
  assertEqual(h.length, 16, "hash length");
  assertTrue(/^[0-9a-f]{16}$/.test(h), `hash format: ${h}`);
});

// ─── shingleMinHash + jaccard ────────────────────────────────────────────────
test("jaccard: identical text → 1.0", () => {
  const text = "the quick brown fox jumps over the lazy dog";
  const sig = shingleMinHash(text);
  assertEqual(jaccard(sig, sig), 1, "self-similarity must be 1");
});

test("jaccard: timestamp tweak survives ≥0.85 threshold", () => {
  const before = [
    "PASS  src/a.test.ts (12.34s)",
    "PASS  src/b.test.ts (3.21s)",
    "PASS  src/c.test.ts (1.05s)",
    "Tests:       42 passed, 42 total",
    "Time:        16.6s",
  ].join("\n");
  const after = [
    "PASS  src/a.test.ts (12.41s)",
    "PASS  src/b.test.ts (3.18s)",
    "PASS  src/c.test.ts (1.07s)",
    "Tests:       42 passed, 42 total",
    "Time:        16.7s",
  ].join("\n");
  const sim = jaccard(shingleMinHash(before), shingleMinHash(after));
  assertTrue(sim >= 0.85, `timestamp variance should pass 0.85 (got ${sim.toFixed(3)})`);
});

test("jaccard: unrelated text → low", () => {
  const a = shingleMinHash("PASS src/a.test.ts (12.34s)\nTests: 42 passed");
  const b = shingleMinHash("npm warn deprecated request@2.88.2: this package is deprecated");
  const sim = jaccard(a, b);
  assertTrue(sim < 0.3, `unrelated should be < 0.3 (got ${sim.toFixed(3)})`);
});

// ─── CrossCallDedupCache ──────────────────────────────────────────────────────
test("cache: first insert never matches", () => {
  const c = new CrossCallDedupCache();
  const r = c.check("hello world");
  assertEqual(r.replacement, null, "empty cache must not match");
});

test("cache: exact re-run hits exact path", () => {
  const c = new CrossCallDedupCache();
  const text = "npm test\nPASS src/foo.test.ts\nTests: 5 passed";
  c.insert(text, "npm test");
  const r = c.check(text);
  assertTrue(r.replacement !== null, "exact re-run should match");
  assertEqual(r.match?.kind, "exact", "kind must be exact");
  assertEqual(r.match?.similarity, 1, "similarity must be 1");
  assertTrue(
    /identical to call #\d+/.test(r.replacement!),
    `marker format: ${r.replacement}`,
  );
});

test("cache: fuzzy re-run hits fuzzy path", () => {
  const c = new CrossCallDedupCache();
  const before = "PASS src/a.test.ts (1.00s)\nTests: 3 passed\nTime: 1.0s";
  const after  = "PASS src/a.test.ts (1.05s)\nTests: 3 passed\nTime: 1.1s";
  c.insert(before, "jest");
  const r = c.check(after);
  assertTrue(r.replacement !== null, "near-identical should match");
  assertEqual(r.match?.kind, "fuzzy", "kind must be fuzzy");
  assertTrue(
    (r.match?.similarity ?? 0) >= 0.85,
    `fuzzy match must be ≥0.85 (got ${r.match?.similarity})`,
  );
});

test("cache: respects window size", () => {
  const c = new CrossCallDedupCache({ windowSize: 2 });
  c.insert("alpha", "a");
  c.insert("beta", "b");
  c.insert("gamma", "c");
  // alpha should have been evicted
  assertEqual(c.size(), 2, "window must cap at 2");
  assertEqual(c.check("alpha").replacement, null, "evicted entry must miss");
  assertTrue(c.check("gamma").replacement !== null, "most-recent must hit");
});

test("cache: clear resets state", () => {
  const c = new CrossCallDedupCache();
  c.insert("x");
  c.clear();
  assertEqual(c.size(), 0, "size after clear");
  assertEqual(c.check("x").replacement, null, "no match after clear");
});

// ─── Report ───────────────────────────────────────────────────────────────────
console.log("");
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
