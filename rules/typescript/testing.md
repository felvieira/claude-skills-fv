---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "**/*.spec.tsx"
  - "**/*.test.js"
  - "**/*.test.mjs"
---
# TypeScript / JavaScript testing

> Extends [common/testing.md](../common/testing.md) with TS/JS specifics.

- **Vitest or Jest** — match the repo. Don't introduce a second runner.
- **Type your test data.** A fixture typed as the real shape catches drift; `as any` fixtures hide it.
- **`await` every async assertion.** A forgotten `await expect(...).rejects` passes silently — the #1 false-green in JS tests.
- **Fake timers** (`vi.useFakeTimers()`) for time-dependent logic — don't `setTimeout`-sleep in tests.
- **Mock at the module boundary** (`vi.mock`/`jest.mock`) — network, fs, clock. Don't mock the unit under test.
- **One behavior per `it`.** Name it as the behavior (`returns 401 when token expired`), not the method.
- **No snapshot tests for logic** — snapshots are for stable serialized output only, and stale snapshots get rubber-stamped.

Deep strategy → skill `05-qa-testing`. TDD loop → skill `37-tdd-engineer`.
