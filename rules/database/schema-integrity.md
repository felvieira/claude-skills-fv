---
paths:
  - "**/migrations/**"
  - "**/schema*.*"
  - "**/*.sql"
  - "**/models/**"
  - "**/entities/**"
  - "**/db.*"
  - "**/database.*"
  - "**/prisma/**"
  - "**/drizzle/**"
---
# Database — schema integrity (decide before the first INSERT)

> A schema without constraints is a bug waiting to happen. The database is the last line of defense — if it accepts garbage, garbage is what you get, no matter how good the app validation is. Decide the integrity rules when you create the table, not after the first bad row.

## When creating or altering a schema

1. **Constraints belong in the schema, not only in app code.** App validation can be bypassed (direct SQL, another service, a migration script). The DB constraint cannot.
   - `NOT NULL` on every column that must have a value.
   - `CHECK` for domain rules the DB can enforce: `CHECK(length(title) > 0 AND length(title) <= 200)`, `CHECK(status IN ('open','done'))`, `CHECK(price >= 0)`.
   - `FOREIGN KEY` for every relationship, with explicit `ON DELETE` behavior (CASCADE / SET NULL / RESTRICT — decide which).
   - `UNIQUE` where duplicates are a bug (email, slug, natural keys).
   - Enable FK enforcement when the engine needs it (`PRAGMA foreign_keys = ON` for SQLite — off by default!).

2. **Indexes on what you query.** Any column in a `WHERE`, `JOIN`, or `ORDER BY` that runs often needs an index. Decide them with the schema, not after the slow query in prod.

3. **Deterministic ordering.** `SELECT ... ORDER BY` with a stable tiebreaker (`ORDER BY created_at DESC, id DESC`). Without it, pagination and tests are flaky.

4. **Migrations are versioned and forward-only.** Each schema change is a numbered migration committed to the repo — never an ad-hoc `ALTER` run by hand. The boot path migrates automatically.

5. **Timestamps the server owns.** `created_at` / `updated_at` set by the DB or the server, never trusted from the client.

## Anti-patterns this prevents

- `CREATE TABLE todos (title TEXT)` with no NOT NULL, no length check — accepts `''` and 10MB strings.
- SQLite with FKs declared but `foreign_keys` pragma off → constraints silently ignored.
- `SELECT * FROM todos` with no ORDER BY → non-deterministic order breaks tests.

Deep playbook → skill `21-data-analytics` (analytics) + `03-backend-api` (persistence layer). Migrations/refactor → skill `23-migration-refactor-specialist`.
