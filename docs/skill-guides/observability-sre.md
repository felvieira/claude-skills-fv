# Observability SRE Guide

> Guia auxiliar da skill `20-observability-sre`. Consultar apenas quando a tarefa exigir detalhamento operacional maior: logs, metricas, tracing, alertas ou runbooks.

---

## Indice

- [Logs Estruturados](#logs-estruturados)
- [Metricas Essenciais](#metricas-essenciais)
- [Tracing e Correlacao](#tracing-e-correlacao)
- [Health Check e Readiness](#health-check-e-readiness)
- [Alertas Acionaveis](#alertas-acionaveis)
- [Rollback e Runbooks](#rollback-e-runbooks)
- [Checklist de Observabilidade](#checklist-de-observabilidade)

---

## Logs Estruturados

### Principios

- Logs em JSON estruturado — nunca strings livres
- Nivel de log: `error`, `warn`, `info`, `debug`
- Nunca logar dados sensiveis: senha, token, CPF, cartao, sessao
- Request ID em todo log para rastreabilidade entre servicos

### Setup com Pino (Node.js)

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'body.password', 'body.token', 'body.cpf'],
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    service: process.env.SERVICE_NAME || 'api',
    env: process.env.NODE_ENV,
  },
});
```

### Middleware de request logging

```typescript
// src/middleware/requestLogger.ts
import { v4 as uuid } from 'uuid';
import { logger } from '../lib/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuid();
  const start = Date.now();

  res.setHeader('X-Request-Id', requestId);
  req.requestId = requestId;

  res.on('finish', () => {
    logger.info({
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      userAgent: req.headers['user-agent'],
    });
  });

  next();
};
```

### Eventos de negocio importantes para logar

```typescript
logger.info({ requestId, userId, event: 'user.login', provider: 'email' });
logger.info({ requestId, userId, event: 'user.logout' });
logger.warn({ requestId, email, event: 'auth.login_failed', attempts: 3 });
logger.info({ requestId, userId, event: 'payment.initiated', amount, currency });
logger.error({ requestId, userId, event: 'payment.failed', errorCode, message });
logger.info({ requestId, userId, event: 'feature.accessed', feature: 'export' });
```

---

## Metricas Essenciais

### Por tipo de servico

**API HTTP:**
```
latency_ms (p50, p95, p99) por rota
request_rate (rpm) por rota e metodo
error_rate (%) por rota e codigo HTTP
active_connections
```

**Banco de dados:**
```
query_duration_ms (p95, p99)
connection_pool_usage (%)
slow_queries_count (acima do threshold)
```

**Queue/Workers:**
```
queue_depth
processing_time_ms
failed_jobs_count
retry_count
```

**Frontend:**
```
Core Web Vitals (LCP, FID, CLS, INP)
page_load_time_ms
js_errors_count
api_calls_failed_count
```

### Implementacao com Prometheus (Node.js)

```typescript
// src/lib/metrics.ts
import { Counter, Histogram, Registry } from 'prom-client';

export const registry = new Registry();

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'Duracao de requisicoes HTTP em milissegundos',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [registry],
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total de requisicoes HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});
```

---

## Tracing e Correlacao

### Correlacao minima via headers

```typescript
// Padrao: X-Request-Id propagado entre servicos
const requestId = req.headers['x-request-id'] ?? uuid();
res.setHeader('X-Request-Id', requestId);

// Ao chamar outro servico
await fetch(serviceUrl, {
  headers: {
    'X-Request-Id': requestId,
    'Authorization': `Bearer ${token}`,
  },
});
```

### Tracing distribuido com OpenTelemetry

```typescript
// src/lib/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { PrismaInstrumentation } from '@prisma/instrumentation';

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new PrismaInstrumentation(),
  ],
});

sdk.start();
```

---

## Health Check e Readiness

```typescript
// src/routes/health.ts
import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

const router = Router();

router.get('/health', async (req, res) => {
  const checks: Record<string, 'ok' | 'error'> = {};
  let status = 200;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    status = 503;
  }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
    status = 503;
  }

  res.status(status).json({
    status: status === 200 ? 'ok' : 'degraded',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', (req, res) => {
  res.json({ ready: true });
});
```

**Diferenca:**
- `/health` — verificacao completa de dependencias (banco, cache, storage). Kubernetes usa como `livenessProbe`.
- `/ready` — servico pronto para receber trafego. Kubernetes usa como `readinessProbe`.

---

## Alertas Acionaveis

### Principio: alertas devem ser acionaveis

Nao alertar para situacoes que nao exigem acao humana imediata. Ruido de alerta leva a ignorar alertas reais.

### Criterios de alerta

| Sinal | Threshold de alerta | Acao |
|-------|---------------------|------|
| `error_rate` | > 5% por 5min | Investigar logs recentes |
| `http_p99_latency` | > 3s por 5min | Verificar banco e dependencias |
| `queue_depth` | > 1000 por 15min | Verificar workers |
| `pod_restart_count` | > 3 em 10min | Verificar crashloops |
| `disk_usage` | > 85% | Limpar logs ou expandir storage |
| `memory_usage` | > 90% | Verificar leaks ou dimensionar |

### Formato de alerta (Slack/PagerDuty)

```
[ALERT] error_rate elevado — api-backend
Severidade: HIGH
Valor: 12% de erro (threshold: 5%)
Janela: ultimos 5 minutos
Rota: POST /api/v1/payments
Runbook: https://docs.empresa.com/runbooks/high-error-rate
```

---

## Rollback e Runbooks

### Runbook — Alta taxa de erro na API

```markdown
## Runbook: Alta Taxa de Erro (> 5%)

**Acao imediata (< 5 min)**
1. Verificar logs dos ultimos 10 min:
   `docker compose logs --tail=200 backend`
2. Verificar se houve deploy recente:
   `git log --oneline -5`
3. Se houve deploy, iniciar rollback:
   `./scripts/rollback.sh <tag-anterior>`

**Diagnostico (5-15 min)**
4. Verificar status do banco:
   `docker compose exec postgres pg_isready`
5. Verificar metricas de conexao do banco
6. Verificar status do Redis
7. Checar dependencias externas (APIs terceiras)

**Resolucao**
8. Se banco com problemas: verificar migrations pendentes
9. Se dependencia externa: ativar fallback ou circuit breaker
10. Documentar no canal de incidentes

**Comunicacao**
- Canal: #incidentes-prod
- Formato: "[STATUS] Descricao — impacto estimado — ETA"
- Update a cada 15 min enquanto ativo
```

### Script de rollback

```bash
#!/bin/bash
PREVIOUS_TAG=${1:-$(docker images --format "{{.Tag}}" ghcr.io/org/app | sed -n '2p')}

echo "Rollback para: $PREVIOUS_TAG"

export IMAGE_TAG=$PREVIOUS_TAG
docker compose pull
docker compose up -d --force-recreate

sleep 15

if curl -sf http://localhost:3000/api/health | grep -q '"status":"ok"'; then
  echo "Rollback concluido."
else
  echo "Health check falhou apos rollback."
  docker compose logs --tail=100
  exit 1
fi
```

---

## Checklist de Observabilidade

```
Logs
☐ Logs estruturados em JSON
☐ Nivel de log configuravel via variavel de ambiente
☐ Request ID em todo log
☐ Dados sensiveis redactados
☐ Eventos de negocio principais logados

Metricas
☐ Latencia, erro e throughput nas rotas criticas
☐ Metricas de banco e dependencias externas
☐ Dashboard minimo configurado (Grafana, Datadog, etc.)

Tracing
☐ X-Request-Id propagado entre servicos
☐ Correlacao de logs por requestId disponivel

Health Checks
☐ /health com verificacao de dependencias
☐ /ready para readiness probe

Alertas
☐ Alertas para error_rate, latencia e disponibilidade
☐ Cada alerta com runbook linkado
☐ Sem alertas sem acao — se nao tem acao, nao e alerta

Rollback
☐ Script de rollback testado
☐ Procedimento documentado e acessivel
```
