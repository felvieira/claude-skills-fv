---
scenario: 20-observability-sre
pass: treatment
model: claude-opus-4-7
tokens_in_approx: 1850
tokens_out_approx: 1750
time_seconds: 55
quality_score: 4.5
quality_breakdown:
  specificity: 4
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 5
pass_fail: pass
delta_vs_baseline: +1.7
notes: "Applied observability-check template, surfaced gaps explicitly, sequenced by SLO-driven workflow, defined handoffs to skills 03/07/24, flagged anti-patterns from skill (PII, high cardinality, threshold-without-context), set explicit error budgets and burn-rate alerts."
---

# Plano de Observabilidade — API REST 50 req/s

## Diagnostico do gap

MTTD (mean time to detect) atual = tempo ate alguem twittar.
MTTR (mean time to recover) atual = MTTD + tempo de resposta humana.
Em 50 req/s sem instrumentacao, cada incidente nao detectado custa ~3000 req/min com comportamento desconhecido. Risco operacional alto, risco reputacional explicito (Twitter).

Esta skill nao substitui Backend (skill 03) nem Deploy (skill 07) — vou definir **o que medir, com que prioridade, e que sinais emitir**. A implementacao concreta vira em handoff.

## Observability Check (template)

| Campo | Definicao |
|---|---|
| **Servico/fluxo** | API REST publica, 50 req/s, descoberta de falha via canal externo |
| **Logs estruturados** | JSON com `timestamp, level, service, trace_id, route, status, latency_ms, user_id_hashed`. Sem PII bruta (anti-padrao da skill) |
| **Metricas criticas** | RED por rota (Rate, Errors, Duration p50/p95/p99) + USE no host (CPU, mem, conexoes DB). Cardinalidade limitada — nada de `user_id` como label |
| **Tracing/correlacao** | `trace_id` propagado via header `traceparent` (W3C). OpenTelemetry SDK, exporter OTLP. Spans em: HTTP in, query DB, chamada externa |
| **Health/Readiness** | `/health/live` (processo vivo) e `/health/ready` (DB OK, deps OK). Separados pra LB nao matar instancia em warm-up |
| **Alertas** | Burn-rate baseado em SLO, nao threshold absoluto (anti-padrao). 3 niveis: page (5%/1h), ticket (10%/6h), info (Slack) |
| **Rollback/Runbook** | Runbook por alerta com: sintoma, query pra confirmar, top 3 causas conhecidas, comando de rollback, criterio pra escalar |
| **Riscos/Gaps** | Sem baseline historico → primeiros 7d sao calibracao. Sem owner definido → criar rotacao on-call antes de ligar alertas (senao paging vira ruido) |

## Sequenciamento (4 semanas)

**Semana 1 — Logs + health (parar de descobrir pelo Twitter)**
- Logger estruturado (pino/structlog/zap dependendo da stack — handoff skill 03)
- `/health/live` e `/health/ready` distintos
- Agregador: Loki self-hosted ou CloudWatch se ja tem AWS
- **Sinal de sucesso:** consigo responder "quem chamou X as 14:32?" em <1min

**Semana 2 — Metricas + dashboard RED**
- Prometheus + Grafana (ou equivalente do cloud provider)
- Exporter no app: latency histogram, request counter por (rota, status), in-flight gauge
- Dashboard 1 (RED por rota), Dashboard 2 (USE infra)
- **Sinal de sucesso:** p95 e error rate visiveis em tempo real

**Semana 3 — SLO + alertas burn-rate**
- Definir SLO inicial conservador: 99% das requests <800ms, error rate <1% (calibrar com baseline de S1-S2)
- Burn-rate alerts (Google SRE workbook):
  - Page: queima 5% do budget em 1h
  - Ticket: queima 10% em 6h
- Canais: PagerDuty (page), Slack #incidents (ticket)
- **Sinal de sucesso:** primeiro alerta dispara antes do tweet

**Semana 4 — Tracing + runbooks**
- OpenTelemetry auto-instrumentation + spans manuais em pontos quentes
- Backend: Tempo (open) ou Honeycomb/Datadog APM (SaaS)
- Correlacao log <-> trace via `trace_id` no log
- Runbook para top 5 alertas (template `risk-note.md`)
- **Sinal de sucesso:** novo eng debugga incidente sem ajuda em <30min

## Runtime feedback como sensor ativo (v2.7.0+)

Apos S4, instituir workflow SLO-driven em features futuras:
1. Antes de mexer em rota quente: anotar P95 + error rate atuais
2. Apos deploy canary: re-medir em 5min/30min/2h
3. Se +10% de budget consumido em 24h → considerar rollback automatico

## Anti-padroes a evitar (da skill)

- ❌ Logar payload completo (vaza PII, infla custo, polui contexto)
- ❌ Labels de alta cardinalidade em Prometheus (`user_id`, `request_id`) → explode storage
- ❌ Threshold absoluto (`< 300ms`) sem contexto — rotas pesadas podem ser 800ms legitimamente
- ❌ Alertas demais → alert fatigue → ninguem olha o paging
- ❌ Dashboard sem owner definido → vira cemiterio visual

## Handoff

- **Skill 03 (Backend):** implementar logger, exporter de metricas, OTel SDK, health endpoints
- **Skill 07 (Deploy):** pipeline roda smoke-test puxando SLO pos-deploy; rollback automatico se burn-rate explode em 30min
- **Skill 21 (Data analytics):** eventos de produto (signup, conversao) complementam SLOs tecnicos
- **Skill 24 (Release manager):** release notes incluem snapshot SLO antes/depois
- **Skill 10 (Documenter):** runbooks + dashboard owners em `docs/runbooks/`

## Evidencia de conclusao

- [ ] Logs estruturados sem PII em 100% das rotas
- [ ] Dashboard RED + USE com owner nomeado
- [ ] SLO documentado + budget calculado
- [ ] Alertas burn-rate testados (chaos drill)
- [ ] Runbook escrito para top 5 alertas
- [ ] On-call rotation com >= 2 pessoas

## Custo estimado

- Self-hosted (Loki + Prometheus + Tempo + Grafana): ~$150-300/mes infra + tempo de eng
- SaaS (Datadog/New Relic completo): ~$800-1500/mes a 50 req/s
- Recomendacao: comecar self-hosted. Migrar pra SaaS so quando dor de operar > custo do SaaS.
