---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
---
# TypeScript / JavaScript security

> Extends [common/security.md](../common/security.md) with TS/JS specifics.

- **No `eval`, no `new Function(userInput)`, no `child_process` with interpolated strings.** Use `execFile`/`spawn` with an args array — never `exec("cmd " + input)`.
- **Parameterized DB queries.** Use the driver's placeholders (`$1`, `?`) — never template-string SQL. With an ORM, don't drop to raw concatenated SQL.
- **Validate external input with a schema** (zod/valibot) at the boundary — request bodies, query params, env. Parse, don't assume.
- **No secrets in the client bundle.** Anything in a `NEXT_PUBLIC_`/`VITE_` var ships to the browser. Server secrets stay server-side.
- **`httpOnly`, `secure`, `sameSite` cookies** for sessions/tokens. No tokens in `localStorage` if you can avoid it.
- **Avoid `dangerouslySetInnerHTML` / direct `innerHTML`.** If unavoidable, sanitize with DOMPurify first.
- **Pin and audit deps.** `npm audit` / lockfile committed. Don't add a package to do what stdlib already does.

Audit → skill `06-security-review`. Scan → skill `34-static-analysis` (Semgrep ts ruleset).
