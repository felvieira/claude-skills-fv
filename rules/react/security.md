---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
---
# React / Next.js security

> Extends [common/security.md](../common/security.md) and [typescript/security.md](../typescript/security.md) with React specifics.

- **Avoid `dangerouslySetInnerHTML`.** When unavoidable (rich text), sanitize with DOMPurify first — never pass raw user/CMS HTML.
- **No secrets in client components.** `NEXT_PUBLIC_*` / `VITE_*` env vars ship to the browser. API keys, DB creds, server tokens live in server components / route handlers / server actions only.
- **Validate in the server action / route handler**, not just the form. Client validation is UX; the server is the trust boundary. Re-parse the payload with a schema server-side.
- **Don't build `href`/`src` from unvalidated input** — `javascript:` URLs are an XSS vector. Allowlist the protocol.
- **Auth checks on the server.** Hiding a button client-side is not authorization; gate the data/mutation on the server.
- **Escape by default.** JSX escapes `{value}` automatically — don't defeat it by reaching for raw HTML.

Audit → skill `06-security-review`. Scan → skill `34-static-analysis`.
