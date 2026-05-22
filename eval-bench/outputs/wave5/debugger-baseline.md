---
scenario: debugger
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 210
tokens_out_approx: 780
time_seconds: 18
quality_score: 2.5
quality_breakdown:
  specificity: 3
  completeness: 2
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "cold model, no skill loaded. Missing isolation step, hypothesis predict/refute, evidence ledger, confidence rating. Technically accurate but incomplete process."
---

# Investigando 500 intermitente em /api/orders

Bugs intermitentes em produção que não reproduzem local são clássicos de race condition, estado compartilhado corrompido, ou diferença de dados entre ambientes. Aqui vai um roteiro de investigação para Next.js 14 + Prisma + PostgreSQL + Redis.

## 1. Capturar o contexto completo do erro

O `TypeError: Cannot read property 'id' of undefined` significa que algum objeto está `undefined` quando o código tenta acessar `.id`. Precisa saber:

- Qual objeto especificamente é `undefined`? (order, user, session, request body?)
- Em qual linha do código?
- Quais parâmetros chegaram nessa request?

**Ação imediata:** adicionar logging estruturado no handler `/api/orders`:

```typescript
export async function GET(req: Request) {
  try {
    // seu código
  } catch (error) {
    console.error('orders-500', {
      error: error.message,
      stack: error.stack,
      url: req.url,
      headers: Object.fromEntries(req.headers),
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
```

## 2. Checar logs de produção

Com Vercel, Datadog, ou qualquer observability tool que estiver usando:

- Filtrar por status 500 em `/api/orders`
- Ver se há padrão: mesmo usuário? Mesmo horário? Load alto?
- Correlacionar com deploys recentes

## 3. Suspeitos mais prováveis

### A) Prisma retorna null/undefined

Prisma `findFirst`, `findUnique` retornam `null` se não encontrado — não lançam erro. Se o código faz `const order = await prisma.order.findUnique(...)` e depois acessa `order.id` sem checar `null`, 500.

Isso explica 5%: talvez pedidos de um usuário específico, ou com certo status, não estejam no banco.

```typescript
const order = await prisma.order.findUnique({ where: { id } });
if (!order) return Response.json({ error: 'not found' }, { status: 404 });
// só agora acessa order.id
```

### B) Redis retorna null (cache miss + código assume hit)

Se está cacheando orders no Redis e o código faz:

```typescript
const cached = await redis.get(`order:${id}`);
const order = JSON.parse(cached); // cached pode ser null
order.id; // 💥 se cached === null
```

### C) Race condition no request body

Em Next.js 14 App Router, `req.json()` pode ser consumido mais de uma vez ou chegar vazio em edge cases.

### D) Dados de produção têm edge case que local não tem

Pedidos sem determinado campo obrigatório, usuários sem relação carregada, etc.

## 4. Reproduzir local com dados de produção

- Dump anonimizado do banco de produção
- Ou criar fixtures que representem os casos edge (pedidos sem itens, sem endereço, etc.)

## 5. Adicionar validação defensiva imediata

Enquanto investiga, proteger o endpoint:

```typescript
const order = await getOrder(id);
if (!order?.id) {
  return Response.json({ error: 'invalid order state' }, { status: 500 });
}
```

Isso não resolve a causa raiz, mas para o bleeding em produção.

## 6. Investigar com Sentry ou similar

Se ainda não tem error tracking, adicione agora — o stack trace completo vai mostrar exatamente a linha e o objeto undefined.

---

**Próximo passo mais provável:** checar se Prisma está retornando null em algum cenário e o código não trata esse caso.
