---
scenario: test-engineer
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 320
tokens_out_approx: 1850
time_seconds: 28
quality_score: 3.1
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: n/a
delta_vs_baseline: 0
notes: "Generic Jest structure. Covers happy path and some invalids but misses timezone variants, ms precision, boundary ISO formats. No regression block. No mutation suggestion."
---

# Baseline — parseISO Jest Tests

Below is a Jest test suite for `parseISO(dateStr: string): Date | null`.

```typescript
// parseISO.test.ts
import { parseISO } from './parseISO';

describe('parseISO', () => {
  // Happy path — basic valid dates
  it('parses a simple date string', () => {
    const result = parseISO('2024-01-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
    expect(result?.getMonth()).toBe(0); // January
    expect(result?.getDate()).toBe(15);
  });

  it('parses a datetime without timezone', () => {
    const result = parseISO('2024-01-15T10:30:00');
    expect(result).toBeInstanceOf(Date);
    expect(result).not.toBeNull();
  });

  it('parses a datetime with UTC timezone', () => {
    const result = parseISO('2024-01-15T10:30:00Z');
    expect(result).toBeInstanceOf(Date);
  });

  it('parses a datetime with offset timezone', () => {
    const result = parseISO('2024-01-15T10:30:00+03:00');
    expect(result).toBeInstanceOf(Date);
  });

  it('parses a datetime with milliseconds', () => {
    const result = parseISO('2024-01-15T10:30:00.123Z');
    expect(result).toBeInstanceOf(Date);
  });

  // Returns null for invalid input
  it('returns null for empty string', () => {
    expect(parseISO('')).toBeNull();
  });

  it('returns null for random string', () => {
    expect(parseISO('not-a-date')).toBeNull();
  });

  it('returns null for null-like value cast to string', () => {
    expect(parseISO('null')).toBeNull();
  });

  it('returns null for a partial date', () => {
    expect(parseISO('2024-01')).toBeNull();
  });

  it('returns null for invalid month', () => {
    expect(parseISO('2024-13-01')).toBeNull();
  });

  it('returns null for invalid day', () => {
    expect(parseISO('2024-01-32')).toBeNull();
  });

  // Edge cases
  it('returns null for undefined input treated as string', () => {
    expect(parseISO('undefined')).toBeNull();
  });

  it('handles leap year date correctly', () => {
    const result = parseISO('2024-02-29');
    expect(result).toBeInstanceOf(Date);
  });

  it('returns null for Feb 29 on non-leap year', () => {
    expect(parseISO('2023-02-29')).toBeNull();
  });
});
```

## Notes

- Assumes `parseISO` is exported from `./parseISO`
- Run with `npx jest parseISO.test.ts`
- Consider adding more timezone offset variants if the app handles global users
- Missing: milliseconds-only precision tests, negative offsets, `+00:00` vs `Z` equivalence
