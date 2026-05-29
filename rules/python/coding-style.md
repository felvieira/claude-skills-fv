---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python coding style

> Extends [common/coding-style.md](../common/coding-style.md) with Python specifics.

- **PEP 8**, enforced by **ruff** (lint + format) or black + flake8 — match the repo, don't mix.
- **Type-annotate every function signature** (params + return). Run **mypy** or **pyright**. Annotations are documentation the checker verifies.
- **f-strings** for formatting, never `%` or `.format()` for new code.
- **Prefer immutable / declarative data:** `@dataclass(frozen=True)`, `NamedTuple`, `enum.Enum` for fixed sets. Don't pass around bare dicts as ad-hoc structs.
- **Comprehensions over `map`/`filter`+lambda** when it stays readable; a plain loop when it doesn't.
- **`pathlib.Path`**, not `os.path` string joins.
- **Context managers (`with`)** for anything with cleanup — files, locks, connections.
- **Catch specific exceptions**, never bare `except:` or `except Exception:` that swallows. Re-raise or log with context.
- **No mutable default args** (`def f(x=[])`) — use `None` + assign inside.
- **`if __name__ == "__main__":`** guard for scripts; keep import side-effects out of modules.

Dependencies: pin in `pyproject.toml` / lockfile. Prefer stdlib before adding a package.
