# Coding style — universal

- **Names carry the meaning.** Well-named identifiers replace comments. Don't write comments that restate what the code does.
- **Comment only the non-obvious WHY** — a hidden constraint, a subtle invariant, a workaround for a specific bug. If removing the comment wouldn't confuse a future reader, don't write it.
- **No task-referencing comments** ("added for X flow", "fixes #123", "used by Y") — those rot and belong in the PR description.
- **No dead code.** Delete unused vars, imports, functions. No commented-out blocks "just in case" — git remembers.
- **No backwards-compat shims** unless explicitly required — rename/change the code directly.
- **Small, single-purpose functions.** A function does one thing at one level of abstraction.
- **Fail at boundaries, trust the inside.** Validate external input once; don't sprinkle defensive checks through trusted internal code.
- **Match the surrounding file.** Conform to the existing style of the file you're editing over your personal preference. Codify the repo's real conventions with skill `47-pattern-conformity`.

Three similar lines beat a premature abstraction. Don't design for hypothetical futures.
