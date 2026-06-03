---
paths:
  - "**/routes/**"
  - "**/controllers/**"
  - "**/api/**"
  - "**/*.controller.*"
  - "**/*.route.*"
  - "**/*.router.*"
  - "**/handlers/**"
  - "**/endpoints/**"
---
# Backend — API contract (decide before the first endpoint)

> The most common failure of AI-generated APIs is *inconsistency*: every endpoint invents its own error shape, its own status codes, its own field names. It happens because no contract was decided up front. Decide once, apply everywhere.

## Before writing the first route

1. **Error shape — pick ONE and use it everywhere.** Never let endpoints diverge.
   - Decide the envelope: `{ "error": "message" }` or `{ "error": { "code": "...", "message": "..." } }` or RFC 7807 `application/problem+json`. Commit to one.
   - Map domain failures to status codes deterministically: validation → 400, auth missing → 401, auth present but forbidden → 403, not found → 404, conflict → 409, rate-limit → 429, unexpected → 500.
   - Malformed JSON body → 400, never 500. A parse error is a client error.

2. **Resource shape — consistent serialization.** One serializer per resource (a `format()` / `toDTO()` function), not ad-hoc object literals per handler. Booleans are booleans (not SQLite 0/1), dates are ISO strings, ids are stable.

3. **Validation at the boundary, once.** Validate input where it enters (body, params, query). Don't re-validate the same data in three layers. Reject early with the standard error shape.

4. **Decide these up front, write them in the plan/README:**
   - Pagination strategy (offset vs cursor) — even if you defer it, name the choice.
   - Versioning (`/v1/` prefix vs header) for anything that may have external consumers.
   - Idempotency for unsafe verbs that may be retried.

## Anti-patterns this prevents

- `{ error: "..." }` in one route, `{ message: "..." }` in another, raw string in a third.
- 500 on bad input because the handler didn't guard the body.
- `done: 1` leaking SQLite integers into JSON instead of `done: true`.

Deep playbook → skill `03-backend-api`. Security of endpoints → `rules/common/security.md` + skill `06-security-review`.
