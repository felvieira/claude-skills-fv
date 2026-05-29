# Testing — universal

- **Prove it.** If you claim it works, there's a test that proves it. "Looks ok" is not done.
- **Cover four paths per behavior:** happy path, error path, edge case, regression for any bug you fix.
- **Test behavior, not implementation.** Assert on observable outputs/effects, not internal calls. Refactors shouldn't break good tests.
- **No mocking the thing under test.** Mock external boundaries (network, clock, filesystem) — not your own logic. Prefer a real DB/integration test where divergence between mock and prod would hide bugs.
- **A failing test must point at the cause.** Clear names, one logical assertion per test, minimal setup.
- **Don't write all tests before all implementation** (horizontal slicing). One behavior: test → implement → pass → next. See skill `37-tdd-engineer`.

Deep test strategy → skill `05-qa-testing` / subagent `test-engineer`.
