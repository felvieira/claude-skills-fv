/**
 * return-envelope.mjs — structured feedback for a failed iteration.
 *
 * > Fonte: Loops and Graphs (Hanako, x.com/hanakoxbt/status/2091515787366306154)
 * > — conceito absorvido, texto reescrito.
 *
 * The problem this solves: when validation fails, the naive move is to dump the
 * whole test-suite output back into the next prompt and say "fix it". Two things
 * go wrong. First, the agent gets the failure of the entire repo when one unit
 * broke — so it re-reasons about code that was already correct. Second, nothing
 * bounds the correction: the agent opens the file, notices two adjacent issues,
 * fixes those too, and a one-line fix becomes a four-file diff nobody reviewed.
 *
 * The envelope carries five fields instead of one blob:
 *   UNIT      what failed (the smallest addressable thing)
 *   VERDICT   red — always, an envelope only exists for a failure
 *   REASON    which check failed, one line
 *   EVIDENCE  the concrete proof (assertion, file:line, expected vs got)
 *   SCOPE     what the correction may touch — the only real guard against
 *             the fix growing past the failure
 *
 * SCOPE is the field that does the work. The other four make the failure
 * legible; SCOPE is what keeps the correction from eating the rest of the run.
 */

// Validation feedback arrives as raw tool output (vitest, tsc, eslint...).
// These extract the smallest useful unit + evidence without pretending to be
// a parser for every tool — unknown formats degrade to "the whole run", which
// is the current behavior anyway, so this can only narrow scope, never widen it.
// Two shapes cover essentially every toolchain the kit runs:
//   path/to/file.ts:88:12     vitest, jest, eslint, node stack traces, go, rust
//   path/to/file.ts(42,7)     tsc, and most .NET/MSBuild-style output
const FILE_LINE = /([\w./\\-]+\.(?:[jt]sx?|mjs|cjs|py|go|rs|rb|java|cs))(?::(\d+)(?::\d+)?|\((\d+),\d+\))/;

const REASON_PATTERNS = [
  { re: /^\s*(?:FAIL|✗|×)\s+(.+)$/im, label: (m) => m[1].trim() },
  { re: /^\s*\d+\)\s+(.+)$/m, label: (m) => m[1].trim() },
  { re: /error TS\d+:\s*(.+)$/im, label: (m) => m[1].trim() },
  { re: /^\s*(?:Error|AssertionError):\s*(.+)$/im, label: (m) => m[1].trim() },
];

const EVIDENCE_PATTERNS = [
  /expected\s+(.+?)\s+(?:to (?:be|equal)|but got|received)\s+(.+?)(?:\n|$)/i,
  /(?:Expected|expected):\s*(.+?)\n.*?(?:Received|received|Actual|actual):\s*(.+?)(?:\n|$)/is,
];

/**
 * buildReturnEnvelope({ feedback, tier, attempt, maxAttempts }) → envelope object
 *
 * `feedback` is validation.mjs's raw output. Everything else is loop state the
 * caller already has.
 */
export function buildReturnEnvelope({ feedback = '', tier = '', attempt = 0, maxAttempts = 0 } = {}) {
  const text = String(feedback || '');

  const fileMatch = text.match(FILE_LINE);
  // Line number lands in group 2 (file.ts:88) or group 3 (file.ts(42,7)).
  const lineNo = fileMatch ? (fileMatch[2] || fileMatch[3]) : null;
  const unit = fileMatch ? `${fileMatch[1]}${lineNo ? `:${lineNo}` : ''}` : null;

  let reason = '';
  for (const { re, label } of REASON_PATTERNS) {
    const m = text.match(re);
    if (m) { reason = label(m); break; }
  }
  if (!reason) {
    // Fall back to the first non-empty line — better than nothing, and keeps
    // the envelope shape stable for tools/formats we don't recognize.
    reason = (text.split('\n').map((l) => l.trim()).find(Boolean) || 'validation failed').slice(0, 200);
  }

  let evidence = '';
  for (const re of EVIDENCE_PATTERNS) {
    const m = text.match(re);
    if (m) { evidence = `expected ${m[1].trim()}, got ${m[2].trim()}`; break; }
  }
  if (!evidence && fileMatch) evidence = `at ${unit}`;

  return {
    unit: unit || 'run',
    verdict: 'red',
    reason: reason.slice(0, 300),
    evidence: evidence.slice(0, 300),
    // Scope is derived, never guessed wide: if we identified a file, the fix is
    // bounded to it. If we couldn't, we say so explicitly rather than implying
    // free rein — "the failing check" still forbids unrelated refactors.
    scope: unit
      ? `fix ${unit} only — do not modify other files, do not refactor adjacent code`
      : 'fix only what the failing check reports — do not refactor adjacent code',
    tier: tier || null,
    attempt: attempt || null,
    maxAttempts: maxAttempts || null,
  };
}

/**
 * formatReturnEnvelope(envelope) → string injected into the next prompt.
 * Deliberately terse and label-led: the agent should be able to act on it
 * without re-reading a wall of tool output.
 */
export function formatReturnEnvelope(envelope) {
  if (!envelope) return '';
  const lines = [
    '## Correction request (bounded)',
    `UNIT      ${envelope.unit}`,
    `VERDICT   ${envelope.verdict}`,
    `REASON    ${envelope.reason}`,
  ];
  if (envelope.evidence) lines.push(`EVIDENCE  ${envelope.evidence}`);
  lines.push(`SCOPE     ${envelope.scope}`);
  if (envelope.attempt && envelope.maxAttempts) {
    lines.push(`ATTEMPT   ${envelope.attempt}/${envelope.maxAttempts}`);
  }
  lines.push('');
  lines.push('Correct only what SCOPE allows. If the fix genuinely requires touching');
  lines.push('something outside SCOPE, say so instead of doing it — that is a signal');
  lines.push('the plan is wrong, not the code.');
  return lines.join('\n');
}
