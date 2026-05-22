---
scenario: debugger
pass: treatment
model: claude-sonnet-4-6
subagent: dev-team-kit-fv:debugger
tokens_in_approx: 1850
tokens_out_approx: 1420
time_seconds: 34
quality_score: 4.5
quality_breakdown:
  specificity: 4
  completeness: 5
  correctness: 5
  actionability: 4
  discipline: 5
pass_fail: pass
delta_vs_baseline: +2.0
notes: "All 7 debugger steps executed. Evidence ledger present. Root cause explicitly held as unconfirmed (confidence: low). Fix diffs per hypothesis. Regression test ready to paste. Discipline: refuses to conclude without direct evidence."
---

# Debug Report — TypeError: Cannot read property 'id' of undefined em /api/orders (5% intermitente)

**Bug:** 5% das requests para `/api/orders` retornam HTTP 500 com `TypeError: Cannot read property 'id' of undefined`; comportamento esperado é HTTP 200 com payload de orders.
**Reproduzível:** intermitente — não reproduz local
**Comando para reproduzir:** ainda não isolado; ver Passo 1 abaixo

---

## Passo 1 — Reprodução

Sem reprodução, não há debugging — há adivinhação.

**Condições observadas:**
- Frequência: ~5% das requests em produção
- Ambiente: produção only (Next.js 14 + Prisma + PostgreSQL + Redis)
- Padrão identificado: desconhecido (ainda não há logs estruturados capturando o objeto `undefined`)

**Bloqueio ativo:** impossível confirmar root cause sem stack trace completo mostrando qual objeto é `undefined` e em qual linha. A investigação abaixo define as evidências a coletar antes de qualquer hipótese ser confirmada.

**Ação imediata — instrumentar antes de continuar:**

```typescript
// src/app/api/orders/route.ts
export async function GET(req: Request) {
  try {
    // código existente
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('id')) {
      console.error(JSON.stringify({
        event: 'orders-500-typeerror',
        message: err.message,
        stack: err.stack,
        url: req.url,
        searchParams: Object.fromEntries(new URL(req.url).searchParams),
        ts: Date.now(),
      }));
    }
    throw err;
  }
}
```

---

## Passo 2 — Isolamento

**Camada:** API (o erro já chegou ao handler como 500 — não é UI, não é infra)
**Tipo:** dado de entrada ou processamento (objeto retornado por Prisma ou Redis está undefined)
**Funciona isolado?** Sim local → integração/dado quebra (não a lógica da unidade)

**Espaço de busca reduzido a 3 caminhos:**
1. Prisma retorna `null` em `findUnique`/`findFirst` e o código não checa antes de acessar `.id`
2. Redis retorna `null` (cache miss ou TTL expirado) e o código deserializa `null` como objeto
3. Request body/params chega malformado em edge case de produção (usuário sem sessão, order em estado inconsistente, relação Prisma não carregada)

---

## Passo 3 — Hipóteses (ordenadas por probabilidade)

### H1 — Prisma retorna `null`, código acessa `.id` sem null-check (probabilidade: alta)

**Prediz:** `prisma.order.findUnique({ where: { id } })` retorna `null` para ~5% dos IDs (orders deletadas, de outro tenant, ou com condição `where` composta que não casa).

**Refuta:** se adicionar `console.log(typeof order)` antes do acesso e nunca logar `undefined`/`null`.

**Evidência necessária:**
```bash
# grep o handler pra ver se há null-check após findUnique/findFirst
grep -n "findUnique\|findFirst" src/app/api/orders/route.ts
grep -n "\.id" src/app/api/orders/route.ts
```

---

### H2 — Redis retorna `null` (cache miss), código assume objeto (probabilidade: média)

**Prediz:** `redis.get(key)` retorna `null` quando TTL expira ou key nunca foi setada; `JSON.parse(null)` retorna `null`; acesso `.id` em `null` lança TypeError.

**Refuta:** se o código sempre checa `if (cached) { return JSON.parse(cached) }` antes de usar.

**Evidência necessária:**
```bash
# grep pelo padrão de uso do Redis no handler
grep -n "redis.get\|JSON.parse" src/app/api/orders/route.ts
```

---

### H3 — Relação Prisma não carregada (include ausente), acesso a campo de relação (probabilidade: baixa-média)

**Prediz:** query Prisma não inclui `include: { user: true }` (ou similar), mas o código acessa `order.user.id` — Prisma retorna o campo como `undefined` (não `null`) quando a relação não é incluída.

**Refuta:** se o select inclui todas as relações acessadas downstream.

**Evidência necessária:**
```bash
grep -n "include\|select" src/app/api/orders/route.ts
grep -n "\.user\.\|\.customer\.\|\.item\." src/app/api/orders/route.ts
```

---

## Evidence Ledger

| # | Hipótese | Evidência coletada | Status |
|---|---|---|---|
| H1 | Prisma retorna null, sem null-check | Não coletada ainda — aguarda grep + logs de prod | pendente |
| H2 | Redis null em cache miss | Não coletada ainda — aguarda grep | pendente |
| H3 | Relação Prisma não incluída no select | Não coletada ainda — aguarda grep | pendente |

**Regra aplicada:** não é possível articular root cause sem ao menos 1 hipótese confirmada com evidência direta (file:line ou log). A investigação para aqui até coletar os logs estruturados e rodar os greps acima.

---

## Plano de Coleta de Evidência (executar em ordem)

### Etapa A — Logs estruturados em produção (1–2h após deploy)

1. Fazer deploy do bloco de instrumentação acima
2. Aguardar 500s acontecerem
3. Coletar: `event=orders-500-typeerror` → extrair `stack` → identificar `file:line` exato + nome do objeto undefined

### Etapa B — Greps no handler atual

```bash
# Identificar todos os acessos a .id no handler
grep -n "\.id" src/app/api/orders/route.ts src/app/api/orders/*.ts

# Checar null-guards após queries Prisma
grep -B2 -A5 "findUnique\|findFirst\|findMany" src/app/api/orders/route.ts

# Checar uso do Redis
grep -B2 -A5 "redis\.get\|redis\.hget" src/app/api/orders/route.ts
```

### Etapa C — Reprodução com dados de produção

Após identificar o objeto undefined pelo stack trace:
1. Exportar anonimizado do banco ordens que geram o erro
2. Reproduzir localmente com esse seed: `npx prisma db seed --data orders-edge-cases.json`

---

## Root Cause

**Ainda não confirmada** — coleta de evidência pendente (Etapas A e B acima).

Hipótese mais provável articulada como candidato (não confirmado):

> "O bug ocorre porque `prisma.order.findUnique()` retorna `null` para ~5% dos casos (orders em estado inconsistente ou de outro contexto), e o handler acessa `.id` diretamente sem null-check, que leva ao TypeError."

Esta frase tem "provavelmente" implícito — não é root cause confirmada. Não fechar antes da evidência.

---

## Fix (a aplicar após confirmação)

Dependente da hipótese confirmada:

**Se H1 (Prisma null sem check):**
```diff
- const order = await prisma.order.findUnique({ where: { id } });
- return Response.json({ id: order.id, ... });
+ const order = await prisma.order.findUnique({ where: { id } });
+ if (!order) {
+   return Response.json({ error: 'Order not found' }, { status: 404 });
+ }
+ return Response.json({ id: order.id, ... });
```

**Se H2 (Redis null):**
```diff
- const cached = await redis.get(`order:${id}`);
- const order = JSON.parse(cached);
- return Response.json({ id: order.id });
+ const cached = await redis.get(`order:${id}`);
+ if (!cached) {
+   // fallback to DB
+   const order = await prisma.order.findUnique({ where: { id } });
+   if (!order) return Response.json({ error: 'Not found' }, { status: 404 });
+   return Response.json({ id: order.id });
+ }
+ const order = JSON.parse(cached);
+ return Response.json({ id: order.id });
```

**Se H3 (relação não incluída):**
```diff
- const order = await prisma.order.findUnique({ where: { id } });
+ const order = await prisma.order.findUnique({
+   where: { id },
+   include: { user: true, items: true },  // adicionar relações acessadas
+ });
```

---

## Verificação (após fix)

- repro original: validar que 0 erros `TypeError: Cannot read property 'id'` aparecem nos logs após deploy
- suite de testes: rodar `npm test` — todos passing antes de mergear
- novo teste de regressão (obrigatório):

```typescript
// src/app/api/orders/__tests__/route.test.ts
it('returns 404 when order does not exist, not 500', async () => {
  // mock prisma.order.findUnique retornando null
  prismaMock.order.findUnique.mockResolvedValue(null);
  const res = await GET(new Request('http://localhost/api/orders?id=nonexistent'));
  expect(res.status).toBe(404); // não 500
});
```

---

## Sugestões (fora do escopo do fix)

- Adicionar Sentry ou similar para captura automática de stack traces em produção — área: skill 20 (Observability/SRE)
- Revisar todos os endpoints Prisma do projeto com mesmo padrão null-access — área: skill 34 (Static Analysis) + variant-analysis
- Adicionar rate limiting / validação de input no `/api/orders` — área: skill 06 (Security Review)

---

## Confidence

**low** — hipótese formada, evidência ainda não coletada. Root cause não confirmada. Não aplicar fix sem completar Etapas A e B.
