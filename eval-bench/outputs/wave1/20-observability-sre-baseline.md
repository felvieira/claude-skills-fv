---
scenario: 20-observability-sre
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 180
tokens_out_approx: 1100
time_seconds: 35
quality_score: 2.8
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: n/a
delta_vs_baseline: 0
notes: "Generic observability checklist. No stack assumed, no priorities defined, no error budget. Mentions tools but doesn't sequence them. No runbook/alert thresholds. Reasonable starting point but reader needs many clarifying questions."
---

# Como instrumentar a API REST

## Diagnóstico

Você tem o pior cenário possível: descobre incidente via Twitter. Isso significa:
- Sem visibilidade do que acontece no servidor
- Sem capacidade de correlacionar eventos
- Sem alertas proativos
- MTTR (tempo de resolução) infinito porque MTTD (tempo de detecção) depende do usuário

50 req/s não é tráfego pequeno — é ~4.3M requests/dia. Cada minuto sem observabilidade é arriscado.

## Os 3 Pilares (Logs, Métricas, Traces)

### 1. Logs estruturados (prioridade 1, faça hoje)

Trocar `console.log("user logged in")` por JSON estruturado:

```json
{
  "timestamp": "2026-05-22T14:32:01Z",
  "level": "info",
  "service": "api",
  "trace_id": "abc123",
  "user_id": "u_42",
  "event": "user.login",
  "latency_ms": 142
}
```

Ferramentas:
- **Node.js**: pino, winston
- **Python**: structlog, loguru
- **Go**: zap, zerolog

Centralize em: Loki + Grafana (open source), Datadog, Elastic, ou CloudWatch Logs Insights.

### 2. Métricas (prioridade 2, esta semana)

Use **Prometheus + Grafana** (padrão de mercado).

Métricas mínimas (RED method):
- **Rate**: requests por segundo (por endpoint, status code)
- **Errors**: taxa de erro 5xx
- **Duration**: latência p50, p95, p99

Adicione USE method para infra:
- **Utilization**: CPU, memória, conexões DB
- **Saturation**: filas, queue depth
- **Errors**: timeouts, OOMs, restarts

### 3. Tracing distribuído (prioridade 3, próximo sprint)

Use **OpenTelemetry** (padrão vendor-neutral). Backends: Jaeger, Tempo, Honeycomb, Datadog APM.

Instrumentação automática cobre 80% do trabalho. Adicione spans manuais em pontos críticos (chamadas externas, queries pesadas).

## Alertas (o pulo do gato)

Configure alertas baseados em **SLOs**, não em métricas brutas:

- SLO: 99.5% das requests < 500ms em janela de 30d
- SLI: latência p99 dos últimos 5min
- Alerta: dispara quando burn rate > 10x (vai estourar o budget em <3 dias)

Canal: PagerDuty/Opsgenie para P0/P1, Slack para warnings.

## Health checks

```
GET /health/live   → o processo está rodando?
GET /health/ready  → consigo atender tráfego? (DB conectado, deps OK)
```

Load balancer usa `/ready` para tirar instância do pool sem matá-la.

## Roadmap sugerido

| Semana | Entrega |
|--------|---------|
| 1 | Logs estruturados em todos os endpoints + agregador (Loki) |
| 2 | Prometheus + dashboard RED por endpoint |
| 3 | Alertas P0/P1 baseados em SLO |
| 4 | OpenTelemetry tracing + correlação log↔trace |
| 5 | Runbooks para top 5 alertas |

## Erros comuns a evitar

- **Logar PII**: tokens, senhas, dados pessoais → vaza em logs
- **Métricas com alta cardinalidade**: `user_id` como label → explode Prometheus
- **Alertas demais**: alert fatigue → ninguém olha
- **Dashboards sem owner**: viram cemitério visual

## Custo

- Loki + Prometheus self-hosted: ~$100-300/mês em VM modesta
- Datadog: $$$$ (fácil $1k/mês com 50req/s)
- Trade-off: pague tempo de eng vs $ de SaaS

Comece self-hosted, migre para SaaS quando dor de operar superar a economia.
