# code-reviewer v2 — Pass A (Baseline Cold)

---
scenario: code-reviewer
scenario_version: v2
pass: A-baseline
date: 2026-05-22
model: claude-sonnet-4-6
skill_injected: false
---

## Prompt

PR #312 — "feat: /api/transfer endpoint + refactor auth utils + Docker hardening"
Input: scenario file verbatim, no system prompt, no skill, no checklist.

---

## Review Output (verbatim reconstruction)

### Finding 1 — Race Condition on Transfer
**Severity:** CRITICAL  
**File:** `src/routes/transfer.ts` lines 41–55  
**Risk:** Balance check (`from.balance < amount`) and two sequential `account.update` calls execute outside any transaction. Concurrent transfers from the same account both pass the check and both execute, producing a negative balance.  
**Fix:** Wrap all three Prisma writes in `prisma.$transaction([...])`.  
**Owner skill:** *not assigned*

---

### Finding 2 — `.env` File Committed with Live Credentials
**Severity:** HIGH  
**File:** `.env` lines 1–4  
**Risk:** Four live credentials staged and committed: PostgreSQL password, JWT secret, admin secret, Stripe live key. Identified as a real exposure.  
**Fix:** Rotate all 4 secrets immediately. Add `.env` to `.gitignore`.  
**Correctness note:** Reviewer noted the file is in the diff but did NOT call out that git history is now contaminated and `git filter-repo` / BFG is required. Partially correct.  
**Owner skill:** *not assigned*

---

### Finding 3 — Vacuous Test Assertion
**Severity:** MEDIUM  
**File:** `tests/transfer.test.ts`  
**Risk:** Only asserts `res.status === 200`. Does not verify balance changes, response body, or concurrent behavior. Race condition in Finding 1 passes this test suite.  
**Fix:** Add DB-state assertions, concurrent request simulation, invalid-input tests.  
**Owner skill:** *not assigned*

---

### Finding 4 — Docker WORKDIR Behavioral Regression
**Severity:** MEDIUM  
**File:** `docker/Dockerfile` line 4  
**Risk:** `WORKDIR /` instead of `WORKDIR /app` means `CMD ["node", "dist/index.js"]` resolves to `/dist/index.js`. Container startup silently fails.  
**Fix:** Revert `WORKDIR` to `/app`.  
**Owner skill:** *not assigned*

---

## Findings NOT identified

| # | Finding | Missed? |
|---|---------|---------|
| 1 | Race condition (CRITICAL) | FOUND |
| 2 | Timing attack in comparePassword (HIGH) | **MISSED** |
| 3 | Circular dependency auth.ts ↔ session-store.ts (HIGH) | **MISSED** |
| 4 | N+1 query in account-service.ts (HIGH) | **MISSED** |
| 5 | Vacuous test assertion (MEDIUM) | FOUND |
| 6 | Secrets real exposure + git history contamination (HIGH) | PARTIAL (identified exposure, missed history + BFG) |
| 7 | Docker WORKDIR regression (MEDIUM) | FOUND |
| 8 | Ownership assignment per finding | **MISSED** (no owner skills assigned) |

**Findings fully hit:** 3 of 8  
**Findings partial:** 1 of 8 (secrets — identified but incomplete)  
**Findings missed:** 4 of 8

---

## Scoring (rubric weights applied)

| Criterion | Weight | Raw (1–5) | Weighted |
|-----------|--------|-----------|----------|
| Specificity | 1× | 3 | 3 |
| Completeness | 2× | 1.5 | 3 |
| Correctness | 2× | 2.5 | 5 |
| Actionability | 1× | 3 | 3 |
| Discipline | 1× | 4 | 4 |
| **Total** | **7×** | | **18** |

**Normalized score (÷7):** **2.57 / 5.0**

### Rationale
- Completeness 1.5/5: missed 3 HIGH findings (timing attack, circular dep, N+1) and ownership discipline entirely. Two HIGHs missed = automatic penalty per rubric.
- Correctness 2.5/5: secrets correctly flagged as real exposure, but history contamination remediation absent. Race condition diagnosis accurate. No wrong diagnoses.
- Specificity 3/5: file + line cited for race and Docker; secrets and test lack line precision.
- Actionability 3/5: transaction fix correct; no concrete fix for timing attack (not found); Docker fix correct.
- Discipline 4/5: no scope creep; clean verdict.

**Final baseline score: 2.57**
