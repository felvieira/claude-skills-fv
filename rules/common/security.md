# Security — universal

Pre-commit checklist (applies to every file, every language):

- [ ] No hardcoded secrets — API keys, passwords, tokens, connection strings. Use env vars / secret managers.
- [ ] All input crossing a trust boundary is validated (user input, external APIs, file contents, env).
- [ ] SQL via parameterized queries / prepared statements — never string concatenation.
- [ ] HTML output escaped; no `innerHTML`/`dangerouslySetInnerHTML` with unsanitized data.
- [ ] AuthN and AuthZ checked on every protected path — not just the UI, the server too.
- [ ] Error messages don't leak stack traces, queries, or internal paths to clients.
- [ ] No secrets in logs.

Trust boundaries are the only place to validate. Don't re-validate data already validated upstream inside trusted internal code — that's noise (see `policies/` on not over-guarding).

Deep audit → skill `06-security-review` / subagent `security-auditor`. Automated scan → skill `34-static-analysis`.
