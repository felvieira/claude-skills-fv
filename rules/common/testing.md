# Testing — universal

- **Prove it.** If you claim it works, there's a test that proves it. "Looks ok" is not done.
- **Cover four paths per behavior:** happy path, error path, edge case, regression for any bug you fix.
- **Test behavior, not implementation.** Assert on observable outputs/effects, not internal calls. Refactors shouldn't break good tests.
- **No mocking the thing under test.** Mock external boundaries (network, clock, filesystem) — not your own logic. Prefer a real DB/integration test where divergence between mock and prod would hide bugs.
- **A failing test must point at the cause.** Clear names, one logical assertion per test, minimal setup.
- **Don't write all tests before all implementation** (horizontal slicing). One behavior: test → implement → pass → next. See skill `37-tdd-engineer`.
- **Configure coverage from the start.** Every project with a test suite needs a coverage config — not as an afterthought. For Vitest: `vitest.config.js` with `coverage: { provider: 'v8', reporter: ['text', 'lcov'], thresholds: { lines: 80 } }`. For Jest: `jest.config.js` with `coverageReporters` and `coverageThreshold`. No coverage config = CI cannot enforce minimums.
- **`.gitignore` is a test artifact.** Any project that writes files to disk (DB files, coverage output, build artifacts) must have a `.gitignore` as part of the test setup — not as an afterthought. Common entries: `*.db`, `*.db-shm`, `*.db-wal`, `coverage/`, `dist/`, `node_modules/`.

Deep test strategy → skill `05-qa-testing` / subagent `test-engineer`.
