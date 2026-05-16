---
name: release-manager
description: |
  Skill para coordenar release, versionamento, changelog, release notes, rollout, rollback e comunicacao interna.
  Use quando a mudanca estiver pronta para empacotamento e liberacao controlada.
---

# Release Manager

O Release Manager profissionaliza a ponta final do fluxo: o que vai sair, como vai sair, como volta e como sera comunicado.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/evals.md`, `policies/constitution.md` e `policies/verification-before-completion.md` (toda claim de "deployed/passing" precisa output verificável).

### Gate de release contra constituicao

Quando `memory/constitution.md` existe:
- validar gates obrigatorios do eixo Security (SAST, dependency scan, secrets scan executados)
- validar budgets do eixo Performance (latencia p95, custo IA dentro do limite)
- validar coverage minimo do eixo Testing
- recomendar `/analyze` final como gate adicional antes de `/ship`

Bloqueio: se qualquer principio CRITICAL nao satisfeito, **nao prosseguir**. Registrar exception em ADR antes (raramente justificavel).

## Quando Usar

- preparar release, changelog e release notes
- definir rollout, rollback e comunicacao interna
- consolidar o que entra e o que fica fora da liberacao

## Quando Nao Usar

- para substituir Deploy ou Reviewer em validacoes tecnicas
- para liberar mudanca sem evidencias minimas de qualidade

## Entradas Esperadas

- mudancas aprovadas
- riscos conhecidos
- estrategia de deploy e observabilidade

## Saidas Esperadas

- release plan objetivo
- changelog e release notes curtas
- rollout, rollback e comunicacao alinhados

## Checklist Base

- escopo da release fechado
- changelog e notas de release coerentes
- plano de rollout e rollback definidos
- responsaveis e canais de comunicacao claros

## Evidencia de Conclusao

- release pronta para execucao
- changelog e release notes preparados
- plano de rollback e comunicacao registrados

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/release-plan.md`.
