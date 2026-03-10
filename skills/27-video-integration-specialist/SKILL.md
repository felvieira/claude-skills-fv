---
name: video-integration-specialist
description: |
  Skill para integrar geracao e manipulacao de video em aplicacoes. Use quando o app precisar de text-to-video,
  image-to-video, clips promocionais, avatar video, motion explainers ou outros fluxos de video generativo.
---

# Video Integration Specialist

O Video Integration Specialist foca em arquitetura, custo, prompt cinematografico e UX de features de video no app.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/evals.md` e `policies/stack-flexibility.md`.

## Quando Usar

- integrar text-to-video no app
- integrar image-to-video no app
- definir status, processamento, custo e formato de entrega de video generativo

## Quando Nao Usar

- para tratar video como simples extensao de imagem sem considerar tempo e audio
- para gerar asset operacional do kit sem necessidade de feature no app

## Entradas Esperadas

- caso de uso do video
- stack do app
- provider desejado ou disponivel
- duracao, formato, custo tolerado e UX esperada

## Saidas Esperadas

- plano de integracao de video no app
- adapter, hook e fluxo de processamento recomendados
- handoff claro para `AI Integration Architect`, `Prompt Engineer`, `Frontend` e `Observability SRE`

## Base Obrigatoria

Consultar:

- `patterns/ai-integration/video-generation.md`
- `patterns/ai-integration/prompt-patterns.md`
- `patterns/ai-integration/cost-efficiency.md`
- `patterns/ai-integration/security.md`

## Evidencia de Conclusao

- provider e fluxo de video definidos
- custo e latencia considerados
- prompt cinematografico e output final especificados

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/ai-integration-plan.md`.
