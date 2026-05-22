---
scenario: 10-documenter
pass: treatment
model: claude-opus-4-7
tokens_in_approx: 1850
tokens_out_approx: 2400
time_seconds: 55
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.0
notes: "estrutura em 4 niveis (feature/API/impl/ops), ADR registrado, runbook curto, regras de negocio separadas de implementacao"
---

# Feature: Rate Limiter (Redis + Sliding Window)

Documentação seguindo os 4 níveis (skill 10-documenter). Cada nível responde uma pergunta diferente — não repete o mesmo conteúdo em lugares diferentes.

Estrutura sugerida no repo:

```
docs/
  features/rate-limiter/
    README.md        ← este arquivo (nivel 1)
    rules.md         ← regras de negocio
    api.md           ← contrato (nivel 2)
  architecture/
    decisions/adr-007-sliding-window.md   ← decisao tecnica (nivel 3)
  ops/
    runbooks/rate-limiter.md              ← operacao (nivel 4)
```

---

## Nível 1 — Feature (POR QUE existe)

### Objetivo
Proteger endpoints contra abuso e estabilizar capacidade, garantindo que clientes individuais não consumam recursos além da cota acordada.

### Regras de negócio (`rules.md`)
- Limite default: **100 requisições / 60s por identidade**
- Identidade = `userId` se autenticado, senão IP
- Excedeu o limite → resposta `429 Too Many Requests` com header `Retry-After`
- Limite é **por endpoint**, não global (chaves Redis incluem `routeKey`)
- Janela é **deslizante**: cada request individual expira 60s após ser feito (não há reset coletivo)

### Critérios de aceitação
- DADO um usuário com 100 requests no último minuto, QUANDO ele faz a 101ª, ENTÃO recebe `429` com `Retry-After` em segundos até a próxima janela liberar
- DADO Redis indisponível, QUANDO uma request chega, ENTÃO fail-open (deixa passar) e loga `WARN ratelimit.redis_unavailable`
- DADO janela de 60s com requests distribuídos, QUANDO 60s passa desde a request mais antiga, ENTÃO a contagem decresce automaticamente

---

## Nível 2 — Contrato (`api.md`)

Não é endpoint REST — é um **middleware**. Contrato programático:

```ts
rateLimit({
  limit: number,      // requests por janela
  window: number,     // tamanho da janela em segundos
  keyFn?: (req) => string,  // default: userId || ip
  routeKey?: string         // default: req.route.path
})
```

### Resposta quando bloqueado
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 23
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1716412800
Content-Type: application/json

{ "error": "rate_limited", "retryAfter": 23 }
```

### Headers em respostas OK
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Nível 3 — Implementação + ADR

### ADR-007: Sliding window via ZSET (não fixed window, não token bucket)

**Status:** Aceito

**Contexto:** precisamos de rate limit por usuário/IP distribuído entre N instâncias da API.

**Decisão:** sliding window log usando Redis `ZSET`, com `ZADD` + `ZREMRANGEBYSCORE` + `ZCARD` atomicamente via Lua.

**Por que não fixed window:** permite burst de 2× no limite das janelas (99 requests aos 59s + 100 aos 0s = 199 em 1s real).

**Por que não token bucket:** semântica menos intuitiva para o cliente; `Retry-After` é mais difícil de calcular com precisão.

**Trade-offs aceitos:**
- Custo de memória maior que fixed window (guarda timestamp de cada request, não só um contador) — aceitável até ~10k req/min/usuário
- Lua script precisa estar carregado em todas as instâncias do Redis Cluster (ver runbook)

### Padrão (não JSX — código muda)

Atomicidade obrigatória via Lua. Não fazer ZADD + ZCARD em comandos separados — race condition entre instâncias quebra o limite sob carga.

```lua
-- KEYS[1] = rate:userId:routeKey
-- ARGV[1] = now (ms), ARGV[2] = window (ms), ARGV[3] = limit
redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1] - ARGV[2])
local count = redis.call('ZCARD', KEYS[1])
if count >= tonumber(ARGV[3]) then return {0, count} end
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[1])
redis.call('PEXPIRE', KEYS[1], ARGV[2])
return {1, count + 1}
```

### Chaves
Formato: `rate:{identity}:{routeKey}` — o `{}` força hash tag no Redis Cluster (mesma slot).

---

## Nível 4 — Operação (`ops/runbooks/rate-limiter.md`)

### Setup local
```bash
docker compose up -d redis
REDIS_URL=redis://localhost:6379 npm run dev
```

### Observabilidade
- Métrica: `ratelimit_blocked_total{route, identity_type}` (Prometheus counter)
- Métrica: `ratelimit_redis_latency_ms` (histogram)
- Log: `INFO ratelimit.blocked` com `userId`, `routeKey`, `count`
- Alerta: `ratelimit_redis_unavailable_total > 0` por 5min → page on-call

### Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| Todos os clients tomando 429 | Lua script não carregado após restart do Redis | `SCRIPT FLUSH` + redeploy da API (re-carrega no startup) |
| Latência p99 da API subiu 50ms+ | Redis com OOM ou rede degradada | Cheque `INFO memory` e `redis-cli --latency` |
| Limite parece não estar pegando | `keyFn` usando IP detrás de proxy sem `X-Forwarded-For` | Configurar `trust proxy` no Express |
| ZSET cresceu absurdamente | Falta de `PEXPIRE` ou TTL maior que janela | Ver Lua script — `PEXPIRE` é obrigatório |

### Rollback
Feature flag `RATE_LIMIT_ENABLED=false` faz o middleware virar no-op sem deploy.

---

## Riscos conhecidos

1. **Fail-open quando Redis cai** — decisão consciente (disponibilidade > proteção). Se ameaça muda, reverter para fail-closed e documentar em novo ADR.
2. **Memória do Redis cresce com cardinalidade alta de IPs** — em ataques distribuídos pode estourar. Mitigação: `maxmemory-policy allkeys-lru` no Redis e alerta de uso de memória.
3. **Skew de relógio entre instâncias da API** — timestamps são gerados na API, não no Redis. Diferença > 1s entre instâncias pode causar janelas inconsistentes. Manter NTP sincronizado.

---

## O que NÃO está aqui (e onde encontrar)

- Lista de endpoints com limites específicos: `config/rate-limits.yaml`
- Política geral de abuso/banimento (camada acima): `docs/features/abuse-protection/`
- Configuração de Redis Cluster: `docs/architecture/backend.md#redis`
