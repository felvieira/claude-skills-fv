---
name: migration-refactor-specialist
description: |
  Skill para migracoes, modernizacao de legacy e refactors estruturais. Use quando precisar fazer upgrades grandes,
  extracao incremental, strangler pattern, compatibilidade de transicao e rollout seguro.
---

# Migration Refactor Specialist

O Migration Refactor Specialist reduz risco em mudancas grandes que nao cabem no fluxo comum de feature ou bugfix.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

## Quando Usar

- migracoes de framework, runtime, auth, storage ou arquitetura
- refactors grandes com rollout incremental
- modernizacao de sistema legado com risco elevado

## Quando Nao Usar

- para pequenos refactors locais
- para upgrades mecanicos de baixa complexidade

## Entradas Esperadas

- estado atual do sistema
- objetivo da migracao ou refactor
- riscos, dependencias e restricoes de rollout

## Saidas Esperadas

- plano incremental de migracao/refactor
- fases, compatibilidades e rollback
- handoff claro para Orchestrator, Backend, Frontend, QA e Deploy

## Checklist Base

- estado atual e alvo definidos
- estrategia de compatibilidade temporaria explicita
- rollback e criterio de corte documentados
- validacao incremental por fase
- risco operacional e tecnico priorizados

## Evidencia de Conclusao

- plano de transicao definido
- fases e riscos registrados
- criterios de rollout e rollback claros

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/migration-plan.md`.
