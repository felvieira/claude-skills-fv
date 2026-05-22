---
scenario: security-auditor
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 320
tokens_out_approx: 980
time_seconds: 18
quality_score: 3.2
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: 0
notes: "correct findings but generic, no PoC payloads, no fix code, no severity ordering"
---

# Security Audit — Reset-Password Endpoint (Baseline)

## Vulnerabilities Found

### 1. No Authentication / Authorization
The endpoint accepts any `email` value and resets the password for any user with that email. There is no verification that the caller controls the email address (e.g., via a time-limited token sent to the mailbox). An attacker who knows or guesses a victim's email can immediately reset their password.

**Attack:** POST `{ "email": "victim@example.com", "newPassword": "hacked123" }` → account takeover in one request.

### 2. User Enumeration (Timing + Response)
The endpoint always returns `{ ok: true }` regardless of whether the user exists. However, the `bcrypt.hashSync` call (expensive, ~100ms) only runs when the user exists. An attacker can measure response time to determine valid accounts.

**Attack:** Time 1000 POST requests with different email addresses; accounts with ~100ms responses exist.

### 3. No Password Validation
`newPassword` is accepted as-is. No minimum length, no complexity, no check against common password lists. An attacker (or compromised reset flow) can set `password=a`.

### 4. No Rate Limiting
No protection against brute-force or automated abuse. An attacker can send thousands of reset attempts per minute with no friction.

### 5. Synchronous bcrypt in Async Context
`bcrypt.hashSync` blocks the Node.js event loop for ~100ms per call. Under load this degrades the entire server. Use `bcrypt.hash()` (async) instead.

### 6. Missing CSRF Protection
If the API is called from a browser session context with cookies, cross-site requests could trigger password resets on behalf of authenticated users.

### 7. No Input Sanitization
`email` and `newPassword` come directly from `req.body` without type checking. Malformed inputs (objects, arrays) can trigger unexpected behavior in mongoose `findOne`.

## How to Fix

```js
// 1. Issue a reset token (email the user a link)
// 2. Verify the token server-side before allowing password change
// 3. Use async bcrypt
// 4. Add rate limiting (e.g., express-rate-limit)
// 5. Validate newPassword length and complexity
// 6. Return identical timing for found/not-found users

app.post('/api/reset-password', rateLimit({ max: 5, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ ok: false });
  }
  const reset = await PasswordReset.findOne({ token, expiresAt: { $gt: Date.now() } });
  if (!reset) return res.status(400).json({ ok: false });
  const user = await User.findById(reset.userId);
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  await PasswordReset.deleteOne({ token });
  res.json({ ok: true });
});
```

## Severity Summary

| Issue | Severity |
|---|---|
| No token / email verification | Critical |
| User enumeration via timing | Medium |
| No rate limiting | High |
| No password policy | Medium |
| Sync bcrypt | Low |
| CSRF | Low–Medium |
| No input sanitization | Medium |
