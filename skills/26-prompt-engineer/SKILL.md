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

## Layering — Construção Incremental de Prompts

Todo prompt de produção deve ser construído em 3 camadas progressivas. Não pular camadas.

### Camada A — Core behavior (mínimo funcional)
Apenas: job em uma frase, campos de input, campos de output.
Sem exemplos, sem lógica avançada, sem constraints complexas.
**Testar aqui antes de avançar.**

### Camada B — Estrutura
Adicionar:
- seções organizadas e context de domínio
- regras de formato de saída
- constraints básicas (não inventar dados, defaultar campos ambíguos)

**Testar aqui antes de avançar.**

### Camada C — Lógica avançada
Adicionar:
- multi-shot examples (1–3 pares input→output)
- detecção de informação faltante + fallback rules
- recomendações e lógica de borda

**Evidência de conclusão: prompt funciona em Camada A antes de receber B e C.**

Ver `templates/agent-spec.md` para o template completo com as 3 camadas.

## Evidencia de Conclusao

- prompt final com objetivo claro
- contexto minimo suficiente
- estilo e formato de saida definidos quando necessario

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/prompt-spec.md`.
