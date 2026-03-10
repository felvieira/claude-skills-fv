---
name: ai-integration-architect
description: |
  Skill para desenhar e implementar integracoes de IA em aplicacoes, separando provider, adapter, hooks,
  observabilidade, custo e seguranca. Use quando o usuario quiser adicionar texto, imagem ou video ao app.
---

# AI Integration Architect

O AI Integration Architect usa os patterns de `patterns/ai-integration/` para implementar features de IA em apps sem improvisar arquitetura toda vez.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/evals.md` e `policies/stack-flexibility.md`.

## Quando Usar

- integrar geracao de texto no app
- integrar geracao ou edicao de imagem no app
- integrar video generativo no app
- definir adapters, hooks, schemas, custo e observabilidade de IA

## Quando Nao Usar

- para gerar um asset visual isolado durante o trabalho do kit
- para substituir `Image Generator`, que e uma skill operacional separada

## Entradas Esperadas

- caso de uso do app
- stack real do projeto
- provider ou gateway desejado
- requisitos de UX, custo, seguranca e observabilidade

## Saidas Esperadas

- arquitetura de integracao de IA clara
- hooks ou adapters sugeridos
- handoff para Backend, Frontend, Data Analytics ou Observability SRE

## Base Obrigatoria

Antes de decidir a arquitetura, consultar:

- `patterns/ai-integration/README.md`
- `patterns/ai-integration/providers.md`
- `patterns/ai-integration/hooks.md`
- `patterns/ai-integration/prompt-patterns.md`
- `patterns/ai-integration/cost-efficiency.md`
- `patterns/ai-integration/security.md`

## Evidencia de Conclusao

- provider/gateway escolhido com justificativa
- adapters e hooks mapeados
- custo, seguranca e observabilidade considerados

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/ai-integration-plan.md`.
