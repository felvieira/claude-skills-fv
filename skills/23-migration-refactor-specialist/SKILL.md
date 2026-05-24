---
name: migration-refactor-specialist
description: |
  Skill para migracoes, modernizacao de legacy e refactors estruturais. Use quando precisar fazer upgrades grandes,
  extracao incremental, strangler pattern, compatibilidade de transicao e rollout seguro.
  Trigger em: "migracao de framework", "modernizacao de legacy", "strangler pattern", "refactor estrutural", "upgrade grande", "extracao incremental", "migracao de runtime", "trocar ORM", "rollout incremental de refactor", "migrar para".
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

## Integracao com Pipeline

- **skill 38 (Architecture Deepener):** roda **antes** desta skill em modulos candidatos a deepening — esta skill recebe o plano de deepening (modulos, interfaces propostas, deletion-test passing) e executa o refactor incremental com feature flags. Skill 38 propoe; esta skill executa.
- **skill 37 (TDD Engineer):** roda **junto** quando o refactor afeta comportamento testavel — TDD garante que comportamento nao muda durante a migracao (testes verdes antes e depois).
- **skill 11 (Reviewer):** valida o resultado final do refactor antes do merge.
