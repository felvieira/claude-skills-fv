---
scenario: 10-documenter
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 180
tokens_out_approx: 780
time_seconds: 25
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: 0
notes: "generic README-style doc, sem ADR, sem runbook, sem trade-offs ou riscos operacionais"
---

# Rate Limiter — Redis + Sliding Window

## O que faz

Limita o número de requisições que um cliente pode fazer em uma janela de tempo deslizante, usando Redis como backing store.

## Como funciona

A sliding window mantém um log de timestamps das requisições recentes em um sorted set do Redis (ZSET):

1. Cada requisição é registrada com seu timestamp como score
2. Timestamps fora da janela são removidos (ZREMRANGEBYSCORE)
3. Se o número de entradas dentro da janela exceder o limite, a requisição é bloqueada
4. Caso contrário, registra a nova requisição e libera

## Exemplo de uso

```js
const allowed = await rateLimiter.check(userId, {
  limit: 100,
  window: 60 // segundos
});

if (!allowed) {
  return res.status(429).send('Too Many Requests');
}
```

## Configuração

- `limit`: número máximo de requisições por janela
- `window`: tamanho da janela em segundos
- `keyPrefix`: prefixo das chaves no Redis (default: `ratelimit:`)

## Por que sliding window

Diferente de fixed window (que reseta a cada N segundos e pode permitir bursts no limite das janelas), sliding window suaviza o limite ao longo do tempo.

## Dependências

- Redis 5+
- Cliente Redis (ioredis ou node-redis)

## Próximos passos

- Considerar fallback se Redis ficar indisponível
- Adicionar métricas de quantas requisições foram bloqueadas
- Avaliar uso de Lua script para atomicidade
