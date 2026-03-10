---
name: llm-selector
description: |
  Skill de recomendacao de nivel de modelo LLM por tipo de tarefa e complexidade. Sugere qual nivel usar e,
  se o ambiente suportar, pode sugerir acao manual correspondente. Nao troca o modelo programaticamente.
  Use quando precisar balancear custo, latencia e profundidade de raciocinio.
---

# LLM Selector - Recomendacao de Nivel de Modelo

O LLM Selector sugere o nivel de modelo mais adequado para a etapa atual, sem acoplar a recomendacao a um vendor especifico.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

## Quando Usar

- escolher nivel de modelo para tarefa, etapa ou skill
- balancear custo, latencia e profundidade

## Quando Nao Usar

- para substituir a analise da tarefa em si
- para tratar nome de modelo como obrigacao universal do ambiente

## Entradas Esperadas

- tipo de tarefa
- complexidade esperada
- risco, prazo e custo tolerado

## Saidas Esperadas

- recomendacao de nivel
- justificativa curta
- acao manual opcional quando o ambiente suportar

## Niveis Genericos

| Nivel | Quando Usar | Classe de Modelo |
|-------|-------------|------------------|
| Rapido | boilerplate, formatacao, rename, microcopy, templates, checklist | modelo rapido e barato |
| Balanceado | implementacao, testes, integracao, debug simples, docs, design | modelo geral equilibrado |
| Profundo | arquitetura, security review, debug complexo, orquestracao, decisoes criticas | modelo mais forte para raciocinio |

## Regras de Upgrade e Downgrade

Subir de nivel quando houver:

- varios modulos ou servicos interagindo
- impacto estrutural de longo prazo
- seguranca, auth ou dados sensiveis
- debugging entre camadas

Descer de nivel quando houver:

- tarefa repetitiva com padrao conhecido
- ajuste mecanico ou de baixo risco
- geracao a partir de template existente

## Mapeamento Base por Skill

- `PO`, `UI/UX`, `Backend`, `Frontend`, `QA`, `Documenter`, `Motion`, `Copy`, `Mobile`: geralmente `Balanceado`
- `Security`, `Reviewer`, `Orchestrator`: geralmente `Profundo`
- `Deploy`, `Context Manager`, `SEO`: geralmente `Rapido` ou `Balanceado`, conforme risco

## Formato de Saida

Usar sempre:

```text
Recomendacao: [Nivel] ([Classe de modelo])
Acao manual opcional: [instrucao curta, se o ambiente suportar]
Motivo: [razao curta]
```

## Evidencia de Conclusao

- nivel recomendado com justificativa curta
- trade-off entre custo, latencia e profundidade explicitado
- acao manual opcional apenas quando o ambiente suportar

## Handoff

Seguir `policies/handoffs.md` quando a recomendacao precisar ser repassada ao Orquestrador ou a outra skill.
