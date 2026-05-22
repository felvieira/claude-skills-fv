---
scenario: 06-security-review
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 3100
tokens_out_approx: 1850
time_seconds: 34
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.5
notes: "Skill forçou estrutura OWASP, severity labels, PoC de teste por finding, checklist Go/No-Go explícito e template de relatório — tudo ausente no baseline"
---

# Security Review Report — POST /api/transfer

**Data:** 2026-05-22
**Stack:** Node.js + Express + JWT
**Endpoint:** `POST /api/transfer` — `{ fromAccountId, toAccountId, amount, idempotencyKey }`
**Status:** ⚠️ Aprovado com ressalvas (findings críticos abaixo devem ser corrigidos antes do deploy)

---

## Resumo

Endpoint financeiro de alta criticidade. JWT autentica _quem_ faz a requisição, mas sem os controles abaixo o endpoint está vulnerável a IDOR, double-spend, race condition e enumeração de contas. Nenhum desses requer ataque sofisticado.

---

## Findings

### 🔴 Crítico — F1: IDOR em `fromAccountId` (Broken Access Control)

**O quê:** O JWT prova que o usuário está autenticado, mas não que ele é dono de `fromAccountId`. Um usuário pode transferir da conta de qualquer outro.

**PoC:**
```bash
# Login com user_A, pegar token
TOKEN=$(curl -s -X POST /api/login -d '{"email":"a@test.com","password":"..."}' | jq -r .token)

# Usar fromAccountId do user_B
curl -X POST /api/transfer \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fromAccountId":"<conta_de_B>","toAccountId":"<conta_de_A>","amount":1000}'
# Esperado: 403 | Vulnerável: 200 + débito na conta de B
```

**Fix obrigatório:**
```typescript
// middleware/ownership.ts
export const assertAccountOwnership = async (req, res, next) => {
  const { fromAccountId } = req.body;
  const userId = req.user.sub; // extraído do JWT verificado

  const account = await db.account.findUnique({ where: { id: fromAccountId } });
  if (!account || account.ownerId !== userId) {
    return res.status(403).json({ error: 'FORBIDDEN', message: 'Conta não pertence ao usuário' });
  }
  next();
};

// router
router.post('/transfer', authenticate, assertAccountOwnership, transferController);
```

---

### 🔴 Crítico — F2: Race Condition / TOCTOU no saldo

**O quê:** Sem lock de linha, dois requests simultâneos podem ler o mesmo saldo disponível e ambos passam na verificação, efetivando double-spend.

**PoC:**
```bash
# Dispara 2 transferências paralelas com saldo exato para 1
curl -X POST /api/transfer -d '{"amount":100}' &
curl -X POST /api/transfer -d '{"amount":100}' &
wait
# Saldo inicial 100 → duas transferências de 100 podem passar
```

**Fix obrigatório (PostgreSQL):**
```typescript
// em uma única transação DB
await db.$transaction(async (tx) => {
  // SELECT FOR UPDATE bloqueia a linha durante a transação
  const account = await tx.$queryRaw`
    SELECT balance FROM accounts WHERE id = ${fromAccountId} FOR UPDATE
  `;
  if (account.balance < amount) throw new Error('INSUFFICIENT_FUNDS');
  
  await tx.account.update({ where: { id: fromAccountId }, data: { balance: { decrement: amount } } });
  await tx.account.update({ where: { id: toAccountId },   data: { balance: { increment: amount } } });
  await tx.transaction.create({ data: { fromAccountId, toAccountId, amount, idempotencyKey } });
});
```

---

### 🔴 Crítico — F3: Idempotência não-atômica

**O quê:** Se `idempotencyKey` é verificado e depois inserido em dois passos separados (sem transação), dois requests concorrentes com a mesma chave podem ambos passar na verificação antes de qualquer um inserir.

**Fix obrigatório:**
```typescript
// Verificação + inserção em transação única, com constraint UNIQUE no banco
// migrations: ALTER TABLE transactions ADD CONSTRAINT uq_idempotency UNIQUE (idempotency_key);

await db.$transaction(async (tx) => {
  const existing = await tx.transaction.findUnique({ where: { idempotencyKey } });
  if (existing) return existing; // resposta idempotente

  // ... resto da transferência
  return await tx.transaction.create({ data: { ..., idempotencyKey } });
});
```

---

### 🟡 Importante — F4: Validação de `amount` insuficiente

**O quê:** Sem validação explícita, `amount` pode ser negativo (inverte fluxo), zero, ou não-numérico.

**Fix:**
```typescript
import { z } from 'zod';

const transferSchema = z.object({
  fromAccountId: z.string().uuid(),
  toAccountId:   z.string().uuid(),
  amount:        z.number().int().positive().max(10_000_000), // centavos, teto de negócio
  idempotencyKey: z.string().min(16).max(64),
});

// Adicionar: fromAccountId !== toAccountId
.refine(d => d.fromAccountId !== d.toAccountId, {
  message: 'Conta de origem e destino não podem ser iguais',
  path: ['toAccountId'],
});
```

---

### 🟡 Importante — F5: Rate Limiting ausente em rota financeira

**O quê:** Sem rate limiting, um atacante autenticado pode submeter milhares de transferências programaticamente.

**Fix:**
```typescript
import rateLimit from 'express-rate-limit';

const transferLimiter = rateLimit({
  windowMs: 60_000,     // 1 minuto
  max: 10,              // 10 transferências/min por IP
  keyGenerator: (req) => req.user?.sub ?? req.ip, // por userId, não só IP
  message: { error: 'RATE_LIMITED', message: 'Muitas transferências. Tente em 1 minuto.' },
});

router.post('/transfer', authenticate, transferLimiter, assertAccountOwnership, transferController);
```

---

### 🟡 Importante — F6: Logging de auditoria ausente ou incompleto

**O quê:** Transferências financeiras exigem trilha de auditoria imutável. Sem isso, investigação de fraude é inviável.

**Fix:**
```typescript
// Logar SEMPRE — antes e depois, inclusive falhas
logger.info('transfer.attempted', {
  requestId: req.id,
  userId: req.user.sub,
  fromAccountId,
  toAccountId,
  amount,
  idempotencyKey,
  ip: req.ip,
  timestamp: new Date().toISOString(),
});
// NÃO logar: senhas, tokens completos, dados de cartão
```

---

### 🔵 Informativo — F7: IDs sequenciais vs UUID

**O quê:** Se `fromAccountId`/`toAccountId` são inteiros sequenciais, é trivial enumerar contas existentes.

**Sugestão:** Migrar para UUID v4. Se já são UUIDs, ok — validar no schema Zod (`.uuid()`).

---

### 🔵 Informativo — F8: Headers de segurança

**O quê:** Verificar se o middleware de segurança está aplicado globalmente:
```bash
curl -I https://api.prod.com/api/transfer | grep -E "Strict-Transport|X-Frame|X-Content"
```
Esperado: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.

---

## Checklist Go/No-Go

| Item | Status |
|---|---|
| F1 — IDOR corrigido (ownership check) | ❌ Bloqueia deploy |
| F2 — Race condition com SELECT FOR UPDATE | ❌ Bloqueia deploy |
| F3 — Idempotência atômica | ❌ Bloqueia deploy |
| F4 — Validação Zod com refine | ⚠️ Fix antes do merge |
| F5 — Rate limiting por userId | ⚠️ Fix antes do merge |
| F6 — Audit log estruturado | ⚠️ Fix antes do merge |
| F7 — UUIDs nos IDs | ℹ️ Verificar / aceitar risco |
| F8 — Security headers globais | ℹ️ Verificar |
| npm audit sem HIGH/CRITICAL | 🔲 Executar: `npm audit --audit-level=high` |
| .env não commitado | 🔲 `git log --all -- .env` deve retornar vazio |

**Decisão:** ❌ Reprovado para deploy — F1, F2 e F3 são críticos e trivialmente exploráveis. Após correção dos 3 críticos + F4/F5/F6, re-submeter para aprovação.
