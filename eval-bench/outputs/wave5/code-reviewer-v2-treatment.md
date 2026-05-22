# code-reviewer v2 — Pass B (Treatment — Skill 11+06)

---
scenario: code-reviewer
scenario_version: v2
pass: B-treatment
date: 2026-05-22
model: claude-sonnet-4-6
skill_injected: dev-team-kit-fv:review (skill 11 + skill 06)
---

## Prompt

PR #312 — "feat: /api/transfer endpoint + refactor auth utils + Docker hardening"
Input: scenario file verbatim. Skills injected: `/review` (Skill 11 — Reviewer Final + Skill 06 — Security Reviewer OWASP).

---

## Review Output (structured 4-pass)

### PASS 1 — Security Audit (Skill 06 — OWASP mapping)

**F1 — OWASP A01: Broken Access Control (bonus finding)**
- **Severity:** HIGH
- **File:** `src/routes/transfer.ts` L41
- **Risk:** No ownership check after verifyToken. Any authenticated user can specify any `fromAccountId` — horizontal privilege escalation.
- **Fix:** `if (from.userId !== user.id) return res.status(403).json({ error: 'Forbidden' });`
- **Owner:** `security-review`, `backend-api`

**F2 — OWASP A02: Timing Attack in `comparePassword`**
- **Severity:** HIGH
- **File:** `src/lib/auth.ts` L112–114
- **Risk:** `input === stored` short-circuits on first differing byte. Timing oracle allows byte-by-byte password enumeration.
- **Fix:** `crypto.timingSafeEqual(Buffer.from(input), Buffer.from(stored))` (pad/hash to equalize length first)
- **Owner:** `security-review`

**F3 — OWASP A02 + Secrets Exposure**
- **Severity:** HIGH (×4 credentials)
- **File:** `.env` L1–4
- **Risk:** 4 live credentials in git diff: PostgreSQL password, JWT_SECRET, ADMIN_SECRET, Stripe live key (sk_live_*). REAL exposure — `.gitignore` has no retroactive effect once staged. Credentials are in git history.
- **Fix:** Rotate all 4 immediately. Run `git filter-repo --path .env --invert-paths` (or BFG). Add `.env` to `.gitignore` + run `git rm --cached .env`. Force-push + notify collaborators to re-clone.
- **Owner:** `security-review`, `deploy-docker`

**F4 — OWASP A04: Circular ES Module Dependency**
- **Severity:** HIGH
- **File:** `src/lib/auth.ts` (imports `./session-store`) ↔ `src/lib/session-store.ts` (imports `AuthUser` from `./auth`)
- **Risk:** Circular ES module import — at Node.js init time one module receives `undefined` for its import binding. `sessionStore.get(token)` throws `TypeError` silently under certain import order.
- **Fix:** Extract `AuthUser` to `src/types/auth-types.ts` (no imports). Both files import from there.
- **Owner:** `backend-api`

**F5 — OWASP A05: docker-compose bind-mount**
- **Severity:** MEDIUM
- **File:** `docker/docker-compose.yml` L11
- **Risk:** `- .:/app` mounts entire project dir (including `.env`, secrets) into container with read-write. Compromised process gains host filesystem access.
- **Fix:** Remove bind-mount in production. Build artifacts should be baked into the image.
- **Owner:** `deploy-docker`

---

### PASS 2 — Backend Correctness

**F6 — Race Condition: Non-atomic Transfer**
- **Severity:** CRITICAL
- **File:** `src/routes/transfer.ts` L41–68
- **Risk:** Read-check-write split across three separate Prisma calls. Concurrent transfers from the same account both pass balance check before either write executes → negative balance.
- **Fix:** Use `prisma.$transaction([...])` with `updateMany` + `where: { balance: { gte: amount } }` as guard. Check returned `count` — if 0, insufficient funds.
- **Owner:** `backend-api`

**F7 — N+1 Query in `getAccountsWithOwners`**
- **Severity:** HIGH
- **File:** `src/services/account-service.ts` L187–190
- **Risk:** `prisma.account.findUnique` called inside `users.map(async...)` — N+1 sequential queries for N users.
- **Fix:** `prisma.user.findMany({ where: { id: { in: userIds } }, include: { account: true } })` — single query.
- **Owner:** `backend-api`

**F8 — `amount` Not Validated (negative exploit)**
- **Severity:** MEDIUM
- **File:** `src/routes/transfer.ts` L35
- **Risk:** Negative, zero, non-numeric values not checked. `decrement: -100` = free money.
- **Fix:** `if (!amount || typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) return res.status(400)...`
- **Owner:** `backend-api`, `security-review`

---

### PASS 3 — QA Gate

**F9 — Vacuous Test Assertion**
- **Severity:** MEDIUM
- **File:** `tests/transfer.test.ts`
- **Risk:** Only asserts `res.status === 200`. No DB state verification, no concurrent test, no auth bypass test. CRITICAL race condition passes this suite.
- **Required additions:** (1) DB balance assertion post-transfer; (2) concurrent `Promise.all` test; (3) ownership bypass test (user A → account B → expect 403); (4) negative-amount test → expect 400.
- **Owner:** `qa-testing`

---

### PASS 4 — DevOps / Docker Gate

**F10 — Docker WORKDIR Behavioral Regression**
- **Severity:** MEDIUM
- **File:** `docker/Dockerfile` L4
- **Risk:** `WORKDIR /` instead of `/app` → `CMD ["node", "dist/index.js"]` resolves to `/dist/index.js`. Container starts and immediately exits. Build succeeds, only `docker run` fails.
- **Fix:** Revert to `WORKDIR /app`.
- **Owner:** `deploy-docker`

---

## Required Findings Coverage

| # | Required Finding | Severity | Status |
|---|-----------------|----------|--------|
| 1 | Race condition — non-atomic transfer | CRITICAL | FOUND (F6) |
| 2 | Timing attack in comparePassword | HIGH | FOUND (F2) |
| 3 | Circular ES module dependency | HIGH | FOUND (F4) |
| 4 | N+1 query in account-service.ts | HIGH | FOUND (F7) |
| 5 | Vacuous test assertion | MEDIUM | FOUND (F9) |
| 6 | Secrets — REAL exposure + git history | HIGH | FOUND (F3) — correctly NOT dismissed as gitignore false alarm |
| 7 | Docker WORKDIR regression | MEDIUM | FOUND (F10) |
| 8 | Ownership assignment per finding | Structural | FOUND — all 10 findings have assigned owner skill |

**Required findings hit: 8 of 8**
**Bonus findings: 2** (ownership bypass A01, amount not validated)

---

## Scoring (rubric weights applied)

| Criterion | Weight | Raw (1–5) | Weighted |
|-----------|--------|-----------|----------|
| Specificity | 1× | 5 | 5 |
| Completeness | 2× | 5 | 10 |
| Correctness | 2× | 5 | 10 |
| Actionability | 1× | 4.5 | 4.5 |
| Discipline | 1× | 4.5 | 4.5 |
| **Total** | **7×** | | **34** |

**Normalized score (÷7):** **4.86 / 5.0**

### Rationale
- Completeness 5/5: all 8 required findings surfaced, 2 additional bonus findings.
- Correctness 5/5: secrets correctly identified as REAL exposure (not gitignore false alarm), race condition diagnosis correct + fix correct (updateMany with conditional guard), timing attack correctly identified with correct fix. Zero wrong diagnoses.
- Specificity 5/5: every finding cites file + line range + code excerpt.
- Actionability 4.5/5: all fixes are copy-pasteable. Minor deduction: timingSafeEqual fix requires length-equalization caveat which was noted but not fully fleshed out.
- Discipline 4.5/5: no scope creep; 4-pass structure clean. Minor deduction: 10 findings (vs 8 required) could feel verbose, but all are valid and substantive.

**Final treatment score: 4.86**

---

## Verdict

**REJECTED — DO NOT MERGE**
- 1× CRITICAL: non-atomic transfer (race condition)
- 5× HIGH: timing attack, circular dep, N+1, committed secrets, ownership bypass
- 4× MEDIUM: vacuous tests, Docker regression, amount validation, bind-mount
