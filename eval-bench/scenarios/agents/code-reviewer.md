# code-reviewer — Hard scenario (v2)

---
id: code-reviewer
scenario_version: v2
created: 2026-05-23
replaces: wave5 single-function scenario (baseline 4.0 / treatment 5.0 / delta +1.0 — FAIL threshold 1.5)
rationale: >
  Original scenario was a single 30-line processPayment function. Baseline (no skill) scored
  4.0 because a capable model finds the obvious race condition cold. Delta was only +1.0.
  This v2 uses a realistic 23-file PR with buried, multi-file, cross-concern issues where
  cold review will miss at least 4 of 8 required findings, producing a baseline ≤ 2.5 and
  an expected treatment of ≥ 4.0, forcing delta ≥ 1.5 and validating the skill's real value.
---

## Input

You are doing a code review for PR #312 — "feat: /api/transfer endpoint + refactor auth utils + Docker hardening".

The PR touches 23 files across `src/routes/`, `src/lib/`, `src/middleware/`, `prisma/`, `tests/`, `docker/`, and root config. Below are the relevant excerpts. Review for correctness, security, performance, and code quality. Surface all issues with severity and owner skill.

---

### File 1 — `src/routes/transfer.ts` (NEW)

```typescript
import { Router } from 'express';
import { prisma } from '../lib/db';
import { verifyToken } from '../lib/auth';
import { sendNotification } from '../lib/notifications';

const router = Router();

router.post('/api/transfer', async (req, res) => {
  const { fromAccountId, toAccountId, amount, note } = req.body;
  const user = verifyToken(req.headers.authorization);

  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Fetch source account
  const from = await prisma.account.findUnique({ where: { id: fromAccountId } });
  const to   = await prisma.account.findUnique({ where: { id: toAccountId } });

  if (!from || !to) return res.status(404).json({ error: 'Account not found' });
  if (from.balance < amount) return res.status(400).json({ error: 'Insufficient funds' });

  // Execute transfer
  await prisma.account.update({
    where: { id: fromAccountId },
    data: { balance: { decrement: amount } },
  });
  await prisma.account.update({
    where: { id: toAccountId },
    data: { balance: { increment: amount } },
  });

  // Create audit record
  await prisma.transfer.create({
    data: { fromAccountId, toAccountId, amount, note, createdAt: new Date() },
  });

  // Notify both parties
  const users = await prisma.user.findMany({
    where: { accountId: { in: [fromAccountId, toAccountId] } },
  });
  users.forEach(u => sendNotification(u.id, `Transfer of ${amount}`));

  return res.status(200).json({ success: true });
});

export default router;
```

---

### File 2 — `src/lib/auth.ts` (MODIFIED — refactor)

Before (git diff context — original was inline in each route):

```typescript
// OLD: inline in each route
const token = req.headers.authorization?.replace('Bearer ', '');
if (!token || token !== process.env.ADMIN_SECRET) { ... }
```

After (extracted to shared util):

```typescript
import crypto from 'crypto';

export interface AuthUser {
  id: string;
  role: 'user' | 'admin';
}

export function verifyToken(authHeader: string | undefined): AuthUser | null {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');

  // Validate against DB session store
  const session = sessionStore.get(token);
  if (!session) return null;
  if (session.expiresAt < Date.now()) return null;

  return session.user;
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin';
}

export function comparePassword(input: string, stored: string): boolean {
  return input === stored;
}

// sessionStore is a module-level Map — imported by verifyToken
import { sessionStore } from './session-store';
```

---

### File 3 — `src/lib/session-store.ts` (NEW — created during refactor)

```typescript
import { AuthUser } from './auth';

interface Session {
  user: AuthUser;
  expiresAt: number;
}

export const sessionStore = new Map<string, Session>();
```

---

### File 4 — `src/middleware/admin-guard.ts` (MODIFIED — uses new auth util)

```typescript
import { Request, Response, NextFunction } from 'express';
import { verifyToken, isAdmin } from '../lib/auth';

export function adminGuard(req: Request, res: Response, next: NextFunction) {
  const user = verifyToken(req.headers.authorization);
  if (!isAdmin(user)) return res.status(403).json({ error: 'Forbidden' });
  next();
}
```

---

### File 5 — `src/routes/admin.ts` (MODIFIED — imports new guard)

```typescript
import { adminGuard } from '../middleware/admin-guard';
import { verifyToken } from '../lib/auth';
// ...existing admin routes unchanged
```

---

### File 6 — `src/lib/users.ts` (MODIFIED — uses new auth util for password check)

```typescript
import { comparePassword } from './auth';

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!comparePassword(password, user.passwordHash)) return null;
  return user;
}
```

---

### File 7 — `src/services/account-service.ts` (MODIFIED — business logic)

```typescript
import { prisma } from '../lib/db';

export async function getAccountsWithOwners(userIds: string[]) {
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
  });

  const accounts = users.map(async (user) => {
    const acct = await prisma.account.findUnique({ where: { userId: user.id } });
    return { user, account: acct };
  });

  return Promise.all(accounts);
}
```

---

### File 8 — `src/services/report-service.ts` (MODIFIED — aggregation)

```typescript
import { prisma } from '../lib/db';

export async function getTransferReport(startDate: Date, endDate: Date) {
  const transfers = await prisma.transfer.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
    orderBy: { createdAt: 'desc' },
  });
  return transfers;
}
```

---

### File 9 — `tests/transfer.test.ts` (NEW)

```typescript
import request from 'supertest';
import app from '../src/app';

describe('POST /api/transfer', () => {
  it('should transfer successfully', async () => {
    const res = await request(app)
      .post('/api/transfer')
      .set('Authorization', 'Bearer valid-token')
      .send({ fromAccountId: 'acc-1', toAccountId: 'acc-2', amount: 100 });

    expect(res.status).toBe(200);
  });
});
```

---

### File 10 — `docker/Dockerfile` (MODIFIED)

```dockerfile
FROM node:20-alpine

# CHANGED: working_dir moved from /app to /
WORKDIR /

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

---

### File 11 — `docker/docker-compose.yml` (MODIFIED)

```yaml
version: '3.9'
services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      JWT_SECRET: ${JWT_SECRET}
    volumes:
      - .:/app
```

---

### File 12 — `.env` (ADDED — flagged by git diff)

```
DATABASE_URL=postgresql://postgres:prod_password_XK92@db.internal:5432/financedb
JWT_SECRET=s3cr3t-jwt-key-do-not-share
ADMIN_SECRET=admin-hardcoded-2024
STRIPE_SECRET_KEY=sk_live_TESTKEY123456789abcdef
```

---

### Files 13–23 — other supporting files (unchanged or trivial)

`prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/notifications.ts`, `src/app.ts`, `src/index.ts`, `src/types/index.ts`, `src/routes/index.ts`, `src/middleware/error-handler.ts`, `tests/setup.ts`, `tsconfig.json`, `package.json` — no significant changes in this PR.

---

**Review this PR thoroughly. For each issue found:**
- State severity (CRITICAL / HIGH / MEDIUM / LOW)
- Identify the file and line range
- Explain the risk
- Propose a concrete fix
- Assign owner skill (security, backend, QA, DevOps)

**Issue a final APPROVED / REJECTED verdict with rationale.**

---

## Required output elements

The reviewer MUST surface all of the following to pass. Missing any item that is labeled CRITICAL or HIGH is an automatic fail regardless of total score.

1. **Bug: Race condition on transfer (CRITICAL)** — `transfer.ts` reads balances then writes two separate `account.update` calls outside any transaction. Concurrent transfers from the same account pass the balance check simultaneously and both execute, producing a negative balance. Fix: wrap all three writes in `prisma.$transaction([...])` with pessimistic lock or use `updateMany` with a conditional `where: { balance: { gte: amount } }` and check affected count.

2. **Bug: Timing attack in `comparePassword` (HIGH)** — `auth.ts` uses `input === stored` for password comparison. This leaks timing information: the comparison short-circuits on the first differing character, allowing an attacker to enumerate valid passwords byte-by-byte. Fix: replace with `crypto.timingSafeEqual(Buffer.from(input), Buffer.from(stored))`.

3. **Refactor issue: Circular dependency (HIGH)** — `auth.ts` exports `verifyToken` which imports from `./session-store`, and `session-store.ts` imports `AuthUser` from `./auth`. This is a circular ES module import. At runtime, one of the two will receive `undefined` for the imported binding during module initialization — silent breakage that is hard to reproduce. Fix: extract `AuthUser` interface to a separate `src/types/auth-types.ts` file with no imports, break the cycle.

4. **Performance: N+1 query in `account-service.ts` (HIGH)** — `getAccountsWithOwners` calls `prisma.account.findUnique` inside a `users.map(async ...)`. For N users, this fires N+1 sequential Prisma queries. Fix: use `prisma.user.findMany({ include: { account: true }, where: { id: { in: userIds } } })` — single query.

5. **Test: vacuous assertion (MEDIUM)** — `transfer.test.ts` only asserts `res.status === 200`. It does not assert response body shape, does not check that balances changed in DB, does not test the concurrent case, and does not test with invalid/missing fields. A test that only checks status is not a correctness test — it is a liveness test. The race condition from issue #1 would pass this test suite.

6. **Secrets verdict: REAL exposure (HIGH)** — `.env` contains 4 credentials (`DATABASE_URL` with plaintext password, `JWT_SECRET`, `ADMIN_SECRET`, `STRIPE_SECRET_KEY` prefixed `sk_live_`). The reviewer must NOT dismiss these as safe because `.env` is in `.gitignore`. The `.env` is present in the git diff of this PR — it was staged and committed. Even if `.gitignore` is set, once a file is tracked (i.e., `git add` was run on it), git includes it in diffs and history. These credentials are now in the repository history and must be treated as compromised. Required actions: rotate all 4 secrets immediately, run `git filter-repo` or BFG to purge history, add `.env` to `.gitignore` AND run `git rm --cached .env`.

7. **Docker: behavioral regression from WORKDIR change (MEDIUM)** — `Dockerfile` changes `WORKDIR` from `/app` to `/`. All relative paths in `COPY`, `RUN`, and `CMD` that depended on `/app` now resolve from filesystem root. `node dist/index.js` will look for `/dist/index.js` instead of `/app/dist/index.js`. This silently breaks the container start command and any path-relative config loading. Fix: revert `WORKDIR` to `/app` or update all dependent paths.

8. **Ownership clarity per finding** — The output must assign each finding to at least one owner skill from: `security-review`, `backend-api`, `qa-testing`, `deploy-docker`. A cold reviewer typically omits ownership; the kit skill structures this explicitly.

---

## Pass threshold

`quality_score ≥ 3.0` on the 1–5 normalized scale, **AND** `delta_vs_baseline ≥ 1.5`.

Both conditions must hold. A treatment score of 3.0 with a baseline of 2.5 (delta +0.5) is a FAIL.
A treatment score of 4.5 with a baseline of 3.0 (delta +1.5) is a PASS.

Expected range:
- Baseline (cold): 1.5–2.5 — a capable model will find the race condition and maybe the secrets,
  but will miss the timing attack, the circular dependency, the N+1, and the Docker WORKDIR regression.
- Treatment (skill 11+06): 4.0–5.0 — the structured review checklist forces all 8 categories,
  OWASP mapping surfaces the timing attack, the security audit pass catches the secrets correctly
  (not as a false alarm), the performance gate catches N+1, the QA gate flags the vacuous test.

---

## Rubric weights (override)

This scenario weights **Completeness** and **Correctness** at 2× because missing a CRITICAL or HIGH finding is a safety failure, not just a quality miss.

| Criterion | Weight | Rationale |
|---|---|---|
| Specificity | 1× | Must cite file + line, not generic |
| Completeness | 2× | Missing CRITICAL/HIGH = hard fail |
| Correctness | 2× | Wrong diagnosis (e.g., dismissing secrets as safe) = hard fail |
| Actionability | 1× | Fix must be copy-pasteable, not hand-wavy |
| Discipline | 1× | No scope creep, no rewriting unrelated files |

---

## Notes for runners

- **Baseline pass:** feed the `Input` section verbatim to the model with no skill, no system prompt injection, no mention of the kit. The expectation is that a capable model finds 3–4 of the 8 required items cold.
- **Treatment pass:** invoke `dev-team-kit-fv:06-security-review` + `dev-team-kit-fv:11-reviewer` before the review prompt. The structured checklist, OWASP mapping, quality-gate checklist, and ownership assignment framework should surface all 8.
- **Scoring gotcha:** if the reviewer correctly identifies the secrets as a REAL exposure (not a false alarm because of `.gitignore`), that is worth bonus on Correctness. A cold model is likely to say "`.env` is in `.gitignore` so this is a false alarm" — this is technically wrong for a staged/committed file.
- **Timing attack finding:** this is the hardest single finding. A cold model reviewing 23 files will rarely stop on `input === stored` in a helper function buried in a refactored module. The security-review skill's OWASP checklist (A02 Cryptographic Failures) forces attention to authentication primitives.
- **Why v2 forces a higher delta:** the v1 scenario had one function, making all bugs visually adjacent. A cold reviewer scans one function and finds everything. In v2, bugs are distributed across 12 files with different concerns. Cold review produces a surface-level pass (race condition found, secrets maybe) and misses at least 4 required findings. The skill provides the structured checklist that forces cross-file, cross-concern coverage.
