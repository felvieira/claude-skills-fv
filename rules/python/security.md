---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python security

> Extends [common/security.md](../common/security.md) with Python specifics.

- **No `eval`/`exec`/`compile` on input.** No `pickle.loads` on untrusted data (arbitrary code execution) — use JSON.
- **No `subprocess` with `shell=True` + interpolation.** Pass an args list: `subprocess.run(["git", "log", ref])`, never `f"git log {ref}"` with a shell.
- **Parameterized SQL.** `cursor.execute("... WHERE id = %s", (id,))` — never `f"... WHERE id = {id}"`. With an ORM, avoid raw concatenated SQL.
- **`yaml.safe_load`**, not `yaml.load`. `defusedxml` for untrusted XML.
- **Validate input with pydantic** (or explicit checks) at the boundary.
- **`secrets` module** for tokens/keys, not `random` (not cryptographically secure).
- **`requests`/`httpx` with timeouts and `verify=True`.** Never disable TLS verification.
- **Don't log secrets.** Scrub tokens/passwords before logging.

Audit → skill `06-security-review`. Scan → skill `34-static-analysis` (Semgrep + Bandit-style rules).
