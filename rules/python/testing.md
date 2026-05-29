---
paths:
  - "**/test_*.py"
  - "**/*_test.py"
  - "**/tests/**/*.py"
  - "**/conftest.py"
---
# Python testing

> Extends [common/testing.md](../common/testing.md) with Python specifics.

- **pytest**, not unittest, for new tests (match the repo if it differs).
- **Fixtures** for setup, not module-level globals. Scope them (`function`/`module`/`session`) deliberately.
- **`pytest.raises`** for error paths; assert on the message/type, not just that *something* raised.
- **`monkeypatch` / `unittest.mock`** at the boundary (network, time, fs). Don't patch the function under test.
- **`@pytest.mark.parametrize`** for table-driven cases instead of copy-pasted test bodies.
- **`freezegun` / a clock fixture** for time-dependent code — no real `sleep`.
- **`tmp_path`** fixture for filesystem tests, never write into the repo tree.
- **Coverage** via `pytest-cov`; cover the error and edge branches, not just the line count.

Deep strategy → skill `05-qa-testing`. TDD loop → skill `37-tdd-engineer`.
