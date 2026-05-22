---
scenario: code-reviewer
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 1100
tokens_out_approx: 1450
time_seconds: 38
quality_score: 5.0
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 5
pass_fail: fail
delta_vs_baseline: +1.0
notes: "OWASP mapping, quality-gates checklist, REJEITADO verdict, idempotency + observability found; delta=+1.0 below 1.5 threshold — PASS threshold NOT met"
---

# Code Review — processPayment (Treatment — /review skill 11+06)

## Veredicto: REJEITADO

Existem 2 falhas críticas que impedem deploy. Nenhuma das duas é opcional.

---

## Findings — Prioridade Crítica (bloqueiam entrega)

### CRÍTICO-1 — Race condition / TOCTOU em saldo
**Categoria:** Concorrência + Integridade de dados
**OWASP:** A04 Insecure Design

`findOne` lê o saldo, `update` o subtrai. Entre essas duas operações, outro request concorrente pode ler o mesmo saldo e também subtrair. Resultado: saldo negativo, dinheiro duplicado.

**Correção obrigatória — transação com lock pessimista:**
```ts
await db.transaction(async (trx) => {
  const user = await trx.users.findOneForUpdate({ id: userId }); // SELECT FOR UPDATE
  if (!user) throw new PaymentError('USER_NOT_FOUND');
  if (user.balance < amount) throw new PaymentError('INSUFFICIENT_FUNDS');
  await trx.users.update({ id: userId }, { balance: user.balance - amount });
  await trx.transactions.create({ userId, amount, type: 'debit', createdAt: new Date() });
});
```

Ou, se o ORM suportar, update condicional atômico:
```ts
const result = await db.users.updateWhere(
  { id: userId, balance: { gte: amount } },
  { balance: db.raw('balance - ?', [amount]) }
);
if (result.affected === 0) throw new PaymentError('INSUFFICIENT_FUNDS_OR_NOT_FOUND');
```

---

### CRÍTICO-2 — Writes não atômicos (falta de transação)
**Categoria:** Integridade transacional
**OWASP:** A04 Insecure Design

`db.users.update` e `db.transactions.create` são chamadas independentes. Se a segunda falhar (rede, constraint, timeout), o saldo foi subtraído mas nenhum registro de transação existe. Estado inconsistente irrecuperável em produção.

**Correção:** Ambas as operações dentro do mesmo `db.transaction()` do item anterior.

---

## Findings — Alta Severidade

### ALTO-1 — Null dereference em `user.balance`
```ts
const user = await db.users.findOne({ id: userId });
const balance = user.balance; // TypeError se user === null
```
**Correção:**
```ts
if (!user) throw new PaymentError('USER_NOT_FOUND', 'User not found');
```

### ALTO-2 — Ausência de validação de input
`amount` pode ser `0`, negativo, `NaN`, `Infinity`, ou string coercida. Nenhuma verificação.

**Correção:**
```ts
if (!Number.isFinite(amount) || amount <= 0) {
  throw new PaymentError('INVALID_AMOUNT', 'Amount must be a finite positive number');
}
```

---

## Findings — Média Severidade

### MÉDIO-1 — Erros genéricos sem código estruturado
**Correção:**
```ts
export class PaymentError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}
```

### MÉDIO-2 — Return type não anotado
**Correção:**
```ts
export async function processPayment(
  userId: string,
  amount: number
): Promise<{ success: true }> {
```

### MÉDIO-3 — Sem idempotência
Chamadas duplicadas (retry de rede, double-click) debitam duas vezes. Sem `idempotencyKey` não há como detectar.

**Correção mínima:** aceitar `idempotencyKey?: string` e checar existência em `db.transactions` antes de debitar.

---

## Findings — Baixa Severidade

### BAIXO-1 — Sem `createdAt` no registro de transação
Auditoria e reconciliação financeira dependem de timestamp.

### BAIXO-2 — Sem logging / observabilidade
Falhas de pagamento são invisíveis para SRE. Adicionar structured log no catch com `userId`, `amount`, `errorCode`.

---

## Checklist de Gates (quality-gates.md)

| Gate | Status |
|---|---|
| Risco relevante explicitado | PASS |
| Validação mínima realizada | FAIL — sem testes de concorrência, sem testes de null |
| Handoff claro | PASS |
| Falha de segurança importante | FAIL — CRÍTICO-1, CRÍTICO-2 |

---

## Resumo de Ações

| # | Prioridade | Ação |
|---|---|---|
| 1 | CRÍTICO | Envolver ambas as escritas em `db.transaction()` com lock |
| 2 | CRÍTICO | Usar update atômico condicional ou `SELECT FOR UPDATE` |
| 3 | ALTO | Guard `if (!user)` antes de acessar `.balance` |
| 4 | ALTO | Validar `amount` (finite, positivo) no início da função |
| 5 | MÉDIO | Introduzir `PaymentError` com `code` estruturado |
| 6 | MÉDIO | Anotar return type explicitamente |
| 7 | MÉDIO | Suportar `idempotencyKey` para deduplicação |
| 8 | BAIXO | Adicionar `createdAt` ao create de transação |
| 9 | BAIXO | Adicionar logging estruturado em bloco catch |

**Status: REJEITADO — 2 críticos bloqueiam deploy. Resubmeter após correções 1–4.**
