---
scenario: security-auditor
pass: treatment
model: claude-sonnet-4-6
skill: dev-team-kit-fv:06-security-review
tokens_in_approx: 4800
tokens_out_approx: 1420
time_seconds: 35
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 4
  discipline: 4
pass_fail: treatment
delta_vs_baseline: +1.3
notes: "used OWASP structured template, severity labels, PoC attacks per finding, fix code, bcrypt cost-factor rule (>=12) applied, user-enumeration timing attack called out explicitly"
---

# Security Review Report — POST /api/reset-password

**Data:** 2026-05-22
**Reviewer:** Skill 06 — Security Reviewer
**Status:** ❌ Reprovado — deploy bloqueado (2 Críticos, 3 Importantes)

---

## Resumo

O endpoint permite redefinir a senha de qualquer conta conhecendo apenas o e-mail, sem nenhum mecanismo de verificação de identidade. Combinado com ausência de rate limiting, o atacante pode comprometer qualquer conta em uma única requisição HTTP sem autenticação prévia.

---

## Findings

### 🔴 Crítico

#### C1 — Sem verificação de identidade (Account Takeover)

**OWASP:** A01 Broken Access Control + A07 Identification and Authentication Failures

**Descrição:** O endpoint aceita `email` + `newPassword` diretamente e aplica a troca sem nenhum token temporário enviado ao dono da conta. Qualquer chamador que conheça o e-mail da vítima assume o controle da conta instantaneamente.

**PoC:**
```bash
curl -X POST https://app.example.com/api/reset-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"vitima@empresa.com","newPassword":"hacked1234"}'
# Response: {"ok":true}  → conta comprometida
```

**Fix:** Implementar fluxo de dois passos: (1) endpoint que envia token opaco por e-mail, (2) endpoint que aceita token + newPassword e o invalida após uso.

```js
// Passo 1: solicitar reset
app.post('/api/reset-password/request', rateLimit({ max: 3, windowMs: 15 * 60_000 }), async (req, res) => {
  const { email } = req.body;
  if (typeof email !== 'string') return res.status(400).json({ ok: false });
  const user = await User.findOne({ email });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await PasswordResetToken.create({ userId: user._id, token, expiresAt: Date.now() + 30 * 60_000 });
    await sendEmail(email, `https://app/reset?token=${token}`);
  }
  res.json({ ok: true }); // resposta idêntica independente de user existir
});

// Passo 2: aplicar reset com token
app.post('/api/reset-password/confirm', rateLimit({ max: 5, windowMs: 15 * 60_000 }), async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ ok: false });
  }
  const record = await PasswordResetToken.findOneAndDelete({ token, expiresAt: { $gt: Date.now() } });
  if (!record) return res.status(400).json({ ok: false });
  const user = await User.findById(record.userId);
  user.password = await bcrypt.hash(newPassword, 12); // cost >= 12 (playbook rule)
  await user.save();
  res.json({ ok: true });
});
```

---

#### C2 — bcrypt cost factor 10 (abaixo do mínimo recomendado)

**OWASP:** A02 Cryptographic Failures

**Descrição:** O checklist da skill exige `cost factor >= 12`. Cost 10 reduz o tempo de hash em ~4x, tornando ataques de dicionário offline 4x mais rápidos caso o banco seja comprometido.

**PoC:** Em hardware moderno (RTX 4090), bcrypt cost=10 permite ~20 k tentativas/segundo contra hashes roubados; cost=12 reduz para ~5 k/s.

**Fix:** `bcrypt.hash(newPassword, 12)` — linha única, sem impacto no UX perceptível (<300ms).

---

### 🟡 Importante

#### I1 — User enumeration via timing

**OWASP:** A07 Identification and Authentication Failures

**Descrição:** `bcrypt.hashSync` (~80-120ms) só executa quando o usuário existe. A ausência do hash é detectável com diferença de tempo de ~100ms entre e-mails existentes e inexistentes.

**PoC:**
```bash
time curl -s -X POST /api/reset-password -d '{"email":"real@ex.com","newPassword":"x"}' # ~120ms
time curl -s -X POST /api/reset-password -d '{"email":"fake@ex.com","newPassword":"x"}' # ~5ms
```

**Fix:** Executar hash dummy sempre (ou usar `bcrypt.hash` async com `await` + constante de tempo); garantir que a resposta seja sempre idêntica.

---

#### I2 — bcrypt síncrono bloqueia event loop

**OWASP:** A05 Security Misconfiguration (disponibilidade)

**Descrição:** `bcrypt.hashSync` é bloqueante. Com poucas requisições concorrentes o servidor trava completamente — vetor de DoS de baixo custo.

**Fix:** `await bcrypt.hash(newPassword, 12)` — substituição direta, zero overhead.

---

#### I3 — Sem rate limiting

**OWASP:** A07 Auth Failures

**Descrição:** Sem limite de requisições, automação pode enviar milhares de tentativas por minuto contra qualquer e-mail conhecido.

**Fix:**
```js
import rateLimit from 'express-rate-limit';
const resetLimiter = rateLimit({ windowMs: 15 * 60_000, max: 3, standardHeaders: true, legacyHeaders: false });
app.post('/api/reset-password', resetLimiter, ...);
```

---

### 🔵 Informativo

#### F1 — Sem validação de entrada mínima

`newPassword` não é checado por tipo nem comprimento mínimo. Mongoose `findOne({ email: {} })` com objeto em vez de string pode gerar comportamento inesperado (NoSQL operator injection). Validar com Zod antes de qualquer lógica.

```js
import { z } from 'zod';
const schema = z.object({ email: z.string().email(), newPassword: z.string().min(8).max(128) });
```

#### F2 — Sem logging de tentativas de reset

Nenhum evento de segurança é registrado. Impossível detectar abuso retroativamente.

---

## Checklist OWASP

- [x] A01 Broken Access Control — **FALHOU** (C1)
- [x] A02 Cryptographic Failures — **FALHOU** (C2)
- [x] A03 Injection — NoSQL injection possível via input não validado (F1)
- [x] A04 Insecure Design — fluxo de reset inseguro por design (C1)
- [x] A05 Security Misconfiguration — bcrypt síncrono / DoS (I2)
- [x] A07 Auth Failures — sem rate limit, timing leak (I1, I3)
- [x] A09 Logging/Monitoring — sem logs de segurança (F2)

---

## Decisão

**❌ Reprovado** — deploy bloqueado.

Antes de qualquer release:
1. Implementar fluxo de token por e-mail (C1) — bloqueia deploy
2. Cost factor bcrypt → 12 (C2) — bloqueia deploy
3. Rate limiting (I3) — bloqueia deploy
4. Substituir bcrypt síncrono por async (I2) — bloqueia deploy
5. Validação de input com Zod (F1) — fortemente recomendado antes do deploy
