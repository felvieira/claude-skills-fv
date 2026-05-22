---
scenario: 06-security-review
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 980
time_seconds: 18
quality_score: 3.0
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "Covers main categories but surface-level; no code snippets, no test commands, generic ordering"
---

# Security Review — POST /api/transfer (Baseline)

Antes do deploy pra produção, verifica estas vulnerabilidades:

## 1. Autenticação e Autorização

**Problema:** O JWT valida _quem_ é o usuário, mas não valida se ele tem permissão de movimentar a conta `fromAccountId`.

**Verifica:**
- O `sub` (ou `userId`) extraído do JWT bate com o dono do `fromAccountId` no banco?
- Se não, qualquer usuário autenticado pode transferir da conta de outro.

**Como testar:** Faça login com usuário A, chame a rota com o `fromAccountId` do usuário B — deve retornar 403.

---

## 2. Idempotência e Double-spend

**Problema:** Se o cliente re-enviar a mesma requisição (retry de rede), a transferência pode executar duas vezes.

**Verifica:**
- `idempotencyKey` é guardado no banco antes de executar a transferência?
- Existe constraint `UNIQUE` nessa coluna?
- A verificação e a inserção são atômicas (transação)?

---

## 3. Validação de Input

**Problema:** Sem validação, `amount` pode ser negativo, zero, string, ou absurdamente grande.

**Verifica:**
- `amount > 0` (sem transferência negativa que efetivamente inverte o fluxo)
- `amount` é número inteiro em centavos ou decimal com limite de casas?
- `fromAccountId !== toAccountId` (não transferir pra si mesmo)
- Validação com `express-validator` ou `zod` antes de qualquer lógica de negócio

---

## 4. Race Condition / TOCTOU

**Problema:** Entre verificar o saldo e debitar, outro processo pode ter usado o saldo.

**Verifica:**
- A operação usa transação de banco com `SELECT FOR UPDATE` (ou equivalente) para bloquear a linha da conta?
- Em PostgreSQL: `BEGIN; SELECT balance FROM accounts WHERE id=$1 FOR UPDATE; ... COMMIT;`

---

## 5. Exposure de Dados no JWT

**Verifica:**
- O JWT não carrega dados sensíveis (saldo, dados pessoais) no payload — esse conteúdo é base64, não criptografado.
- O `exp` (expiração) está configurado com prazo curto (ex: 15 minutos)?

---

## 6. Rate Limiting

**Problema:** Sem rate limiting, um atacante pode tentar múltiplas transferências automatizadas.

**Verifica:**
- Existe middleware de rate limiting nessa rota (ex: `express-rate-limit`)?
- Limite razoável: ex. 10 req/min por IP ou por `userId`.

---

## 7. Logging e Auditoria

**Verifica:**
- Toda transferência (sucesso e falha) gera log com: userId, fromAccountId, toAccountId, amount, timestamp, IP.
- Logs não expõem dados sensíveis além do necessário.

---

## 8. HTTPS / TLS

- A rota só aceita HTTPS em produção? Dado financeiro em claro é inaceitável.

---

## Checklist rápido de testes antes do deploy

| Teste | Esperado |
|---|---|
| JWT de usuário A, fromAccountId de B | 403 |
| amount = -100 | 400 |
| amount = 0 | 400 |
| Dois POSTs idênticos (mesmo idempotencyKey) | 2º retorna 200 idempotente, sem débito duplo |
| fromAccountId = toAccountId | 400 |
| Saldo insuficiente | 402 ou 422 |
| Sem header Authorization | 401 |
