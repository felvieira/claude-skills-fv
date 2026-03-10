---
name: observability-sre
description: |
  Skill de observabilidade e confiabilidade operacional. Use quando precisar definir logs, metricas, tracing,
  alertas, health checks, readiness, error budgets, rollback e operacao segura de servicos.
---

# Observability SRE

O Observability SRE garante que o sistema seja operavel, monitoravel e recuperavel em producao.

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
