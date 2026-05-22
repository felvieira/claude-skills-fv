---
scenario: code-reviewer
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 320
tokens_out_approx: 890
time_seconds: 12
quality_score: 4.0
quality_breakdown:
  specificity: 4
  completeness: 4
  correctness: 5
  actionability: 4
  discipline: 4
pass_fail: reference
delta_vs_baseline: 0
notes: "Cold answer — no skill loaded. Found race condition, null guard, validation, error typing, return type. Missed idempotency and observability. No OWASP mapping, no gate checklist, no structured verdict."
---

# Code Review — processPayment (Baseline)

## Problems found

### 1. Race condition (critical)
The function reads `user.balance`, checks it, then writes the new balance in two separate DB operations. If two concurrent requests for the same user run simultaneously, both can read the same balance, both pass the check, and both deduct — resulting in a negative balance.

**Fix:** Use a database-level atomic update or a transaction that locks the row:

```ts
// Option A: atomic update with conditional where clause
const updated = await db.users.update(
  { id: userId, balance: { $gte: amount } },
  { $inc: { balance: -amount } }
);
if (updated.count === 0) throw new Error('Insufficient funds');

// Option B: wrap in a serializable transaction
await db.transaction(async (trx) => {
  const user = await trx.users.findOne({ id: userId }, { lock: true });
  if (user.balance < amount) throw new Error('Insufficient funds');
  await trx.users.update({ id: userId }, { balance: user.balance - amount });
  await trx.transactions.create({ userId, amount, type: 'debit' });
});
```

### 2. No transaction wrapping the two writes (critical)
`db.users.update` and `db.transactions.create` are two separate operations. If the first succeeds and the second fails, money is deducted but no transaction record exists — data is inconsistent.

**Fix:** Wrap both writes in a single database transaction (see Option B above).

### 3. Null-safe access on `user` (high)
`user.balance` throws if `findOne` returns `null` (user not found).

**Fix:**
```ts
if (!user) throw new Error('User not found');
```

### 4. Amount validation missing (medium)
Nothing stops callers from passing `amount = 0`, `amount = -100`, or `NaN`.

**Fix:**
```ts
if (!Number.isFinite(amount) || amount <= 0) {
  throw new Error('Amount must be a positive number');
}
```

### 5. No error typing / error codes (low)
Generic `Error` messages are hard for callers to handle programmatically. Different errors (insufficient funds, user not found, validation) produce the same error type.

**Fix:** Use typed errors or error codes:
```ts
class PaymentError extends Error {
  constructor(message: string, public code: string) { super(message); }
}
throw new PaymentError('Insufficient funds', 'INSUFFICIENT_FUNDS');
```

### 6. Return type is not typed (low)
`processPayment` returns `{ success: true }` but has no explicit TypeScript return type annotation. The caller gets `any`-like inference.

**Fix:**
```ts
export async function processPayment(
  userId: string,
  amount: number
): Promise<{ success: true }> { ... }
```

### 7. Missing audit fields on transaction (low)
The transaction record has no `createdAt`, `status`, or idempotency key. Duplicate calls with the same parameters cannot be detected.

**Fix:** Add a timestamp and consider an idempotency key parameter.

## Summary of priority

| Priority | Problem |
|---|---|
| Critical | Race condition — concurrent deduction |
| Critical | Missing DB transaction — partial write risk |
| High | No null guard on `user` |
| Medium | No amount validation |
| Low | Untyped errors, untyped return, missing audit fields |
