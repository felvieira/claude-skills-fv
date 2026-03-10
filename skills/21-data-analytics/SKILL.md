---
name: data-analytics
description: |
  Skill para definicao de eventos, naming de tracking, funis, metricas de produto e instrumentacao analitica.
  Use quando precisar medir valor entregue, ativacao, conversao, retencao e comportamento do usuario.
---

# Data Analytics

O Data Analytics fecha o gap entre feature entregue e medicao real de resultado.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

## Quando Usar

- definir eventos e nomes de tracking
- mapear funis e metricas de produto
- alinhar instrumentacao com objetivos de negocio

## Quando Nao Usar

- para implementar analytics sem criterio de negocio
- para substituir observabilidade operacional ou SEO

## Entradas Esperadas

- objetivo de negocio da feature
- fluxo do usuario e pontos de decisao
- stack e ferramentas de analytics do projeto

## Saidas Esperadas

- plano de eventos e funil
- naming consistente de tracking
- handoff claro para Frontend, Backend e Documenter

## Checklist Base

- evento nomeado com verbo + objeto
- propriedades minimas e sem PII desnecessaria
- funil ligado a metrica de sucesso real
- owner da metrica e criterio de leitura definidos

## Evidencia de Conclusao

- eventos principais definidos
- funil e metricas vinculados ao objetivo da feature
- riscos de medicion e lacunas registrados

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/analytics-plan.md`.
