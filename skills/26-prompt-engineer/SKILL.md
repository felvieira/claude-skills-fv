---
name: prompt-engineer
description: |
  Skill para desenhar prompts reutilizaveis de texto, imagem e video com foco em clareza, controle, custo e reprodutibilidade.
  Use quando a qualidade do prompt for parte central da feature ou do fluxo.
---

# Prompt Engineer

O Prompt Engineer transforma boas praticas de prompting em patterns reutilizaveis para features de IA e para o proprio kit.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/token-efficiency.md`, `policies/handoffs.md`, `policies/evals.md` e `policies/stack-flexibility.md`.

## Quando Usar

- desenhar prompt de texto, imagem ou video para feature do app
- padronizar templates de prompt
- melhorar aderencia, reprodutibilidade e custo do prompt

## Quando Nao Usar

- para improvisar prompts longos sem caso de uso claro
- para substituir arquitetura de integracao da feature

## Entradas Esperadas

- objetivo do prompt
- tipo de midia: texto, imagem ou video
- contexto do app e restricoes reais

## Saidas Esperadas

- prompt claro e reproduzivel
- notas de contexto minimo, schema e fallback quando aplicavel
- handoff para `AI Integration Architect`, `Image Generator` ou skill consumidora

## Base Obrigatoria

Consultar `patterns/ai-integration/prompt-patterns.md` antes de propor o template final.

## Evidencia de Conclusao

- prompt final com objetivo claro
- contexto minimo suficiente
- estilo e formato de saida definidos quando necessario

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/prompt-spec.md`.
