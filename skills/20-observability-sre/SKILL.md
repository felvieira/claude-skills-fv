---
name: observability-sre
description: |
  Skill de observabilidade e confiabilidade operacional. Use quando precisar definir logs, metricas, tracing,
  alertas, health checks, readiness, error budgets, rollback e operacao segura de servicos.
---

# Observability SRE

O Observability SRE garante que o sistema seja operavel, monitoravel e recuperavel em producao.

## Runtime Feedback Sensors (v2.7.0+)

> **Inspiração:** Birgitta Böckeler (Thoughtworks) — _"What runtime feedback could agents be monitoring? (e.g. having them look for degrading SLOs to make suggestions, or AI judges continuously sampling response quality and flagging log anomalies)"_. Ver `docs/inspiration/harness-engineering.md` + `policies/harness-categories.md`.

Esta skill agora também trata **runtime feedback como categoria de sensor** — não só configuração de monitoring, mas **uso ativo dessa telemetria pelo agente** durante feature work.

### O gap fechado

Antes do v2.7.0, o kit tinha **apenas sensores estáticos** (arquivos, hook de tool call). Não usava sinais de produção.

Birgitta lista 2 classes de runtime sensors valiosos:
1. **SLO degradation suggestions** — agente vê P95 latency degradando e sugere otimizações
2. **AI judges continuamente** — sampling de logs/responses pra flag anomalias

### Quando incorporar runtime feedback

| Situação | Recomendação |
|---|---|
| Feature de performance crítica | ✅ Forte — incluir P95 atual como input |
| Bug de produção sendo investigado | ✅ Forte — logs recentes são source-of-truth |
| Refactor de código quente (alto traffic) | ✅ Médio — verificar SLO antes/depois |
| Feature greenfield | 🟡 Skip — não tem telemetria ainda |
| Spike/POC | 🟡 Skip — overhead |
| Sem ferramenta de observability instalada | 🔴 Skip — pré-requisito ausente |

### Workflow: SLO-driven feature work

```
1. Antes de implementar: puxar SLO atual do endpoint/feature alvo
   Datadog:    via API com DD_API_KEY + DD_APP_KEY
   Grafana:    via Grafana HTTP API
   CloudWatch: aws cloudwatch get-metric-statistics
   New Relic:  via NerdGraph API
   Honeycomb:  via Query API

2. Anotar baseline em docs/specs/<feature>.md:
   "Baseline P95: 320ms, error rate: 0.4%, throughput: 1200 rpm"

3. Implementar feature com policies/source-driven.md aplicado

4. Após deploy (canary): re-puxar SLO em 5min/30min/2h
   "Atual P95: 340ms (+6%) — dentro do budget de 10%"
   ou
   "Atual P95: 420ms (+31%) — VIOLATED budget, rollback considerado"

5. Documentar mudança no postmortem se houve impacto não previsto
```

### Workflow: Log anomaly detection

Para apps com alto volume de logs estruturados:

```
1. Definir baseline de error rate por endpoint (skill 21 data-analytics ajuda)
2. Configurar log sampling pra LLM (não enviar tudo — caro):
   - 100% de errors
   - 1% de info logs
   - 10% de warnings
3. Agente periodicamente (ou via /loop --schedule daily):
   - Pull samples da última hora
   - Procura anomalias (padrões novos, spikes em error class específica)
   - Sugere investigação ou hotfix
4. Output: thread no GitHub Issues / Linear com contexto
```

**Custo realista:** LLM judge custa ~$5-20/mês pra app médio. Compare com tempo de SRE pra identificar same issues manualmente.

### Workflow: Response quality sampling (apps com IA)

Para apps onde output é AI-generated (chatbots, content gen, code suggestion):

```
1. Sample 1% das responses (mais alto = mais caro)
2. AI judge avalia: relevância, factualidade, tom, safety
3. Se score < threshold → flagga pra revisão humana
4. Agregação semanal: "92% passaram. Top 3 padrões de falha: ..."
```

### Anti-padrões específicos

- ❌ **Logar payload inteiro** — vaza PII, ocupa espaço, vira lixo no LLM context
- ❌ **Polling sem cache** — bate API toda invocação, viola rate limits
- ❌ **Threshold absoluto** (`< 300ms`) sem contexto — endpoint pesado pode ser 800ms legitimamente
- ❌ **AI judge sem feedback humano** — vira eco chamber, não calibra
- ❌ **Sample biased** (só errors) — não vê o baseline normal

### Integração com outras skills

| Skill | Como integra |
|---|---|
| 03 (backend) | Backend implementations devem expor metrics conforme convenção desta skill |
| 07 (deploy) | Deploy pipelines devem rodar smoke test pull dos SLOs pós-deploy |
| 21 (data-analytics) | Eventos de produto complementam SLOs técnicos |
| 24 (release-manager) | Release notes incluem snapshot de SLOs (antes/depois) |
| 30 (cost-tracker) | LLM judge cost contabilizado aqui |

### Roadmap derivado

- v2.7.1 — `scripts/pull-slo.mjs` helper genérico (Datadog/Grafana/CloudWatch)
- v2.7.2 — `commands/check-slo.md` slash command
- v2.8.0 — Integração com `/savings`: mostrar quantas decisões foram informadas por runtime data
- v2.8.0 — `programs/slo-driven-feature.yml` program que enforce o workflow acima

### Referências

- Google SRE Book (capítulos 4-5: SLOs, SLIs)
- Honeycomb's [Observability Engineering](https://www.oreilly.com/library/view/observability-engineering/9781492076438/)
- `policies/harness-categories.md` — runtime feedback é categoria nova de sensor
- `policies/quality-gates.md` "Keep quality left" — runtime sensors ficam mais à direita

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

Para playbooks e exemplos operacionais mais detalhados, consultar `docs/skill-guides/observability-sre.md` apenas quando necessario.

## Quando Usar

- definir logs, metricas, tracing e alertas
- criar health checks, readiness e estrategia de rollback
- melhorar operacao de deploy, incidentes e diagnostico

## Quando Nao Usar

- para substituir Security, Deploy ou Backend em mudancas de dominio
- para adicionar telemetria sem criterio de produto ou operacao

## Entradas Esperadas

- stack real do servico ou app
- pontos criticos do fluxo de negocio
- sinais atuais de deploy, erro, performance e operacao

## Saidas Esperadas

- plano de observabilidade e confiabilidade
- eventos e sinais operacionais priorizados
- handoff claro para Backend, Frontend, Deploy ou Documenter

## Responsabilidades

1. Definir sinais essenciais: logs, metricas, traces e alertas
2. Garantir health checks, readiness e rollback praticaveis
3. Identificar lacunas de monitoramento e diagnostico
4. Reduzir ruido de telemetria e focar no que ajuda operacao real
5. Registrar runbooks e riscos operacionais quando necessario

## Checklist Base

- logs estruturados sem dados sensiveis
- metricas de latencia, erro e throughput nas rotas criticas
- tracing ou correlacao minima para debug entre camadas
- health check e readiness separados quando fizer sentido
- alertas acionaveis e sem excesso de ruido
- rollback e runbook claros para incidentes principais

## Evidencia de Conclusao

- sinais operacionais principais definidos
- lacunas e riscos priorizados
- pontos de integracao com deploy e docs registrados

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/observability-check.md`, `templates/risk-note.md` e `templates/doc-update.md`.
