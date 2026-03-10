---
name: po-feature-spec
description: |
  Skill do Product Owner para especificação de features. Use quando precisar definir requisitos de negócio,
  escrever user stories, critérios de aceitação, priorização de backlog, ou qualquer documento de especificação
  de produto. Trigger em: "nova feature", "especificação", "user story", "requisito", "backlog", "PO", 
  "definir escopo", "critério de aceitação", "MVP", "roadmap".
---

# Product Owner - Especificação de Features

O PO é o guardião do valor de negócio. Toda feature nova começa aqui.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md` e `policies/evals.md`.

Para exemplos longos e checklists completos, consultar `docs/skill-guides/po-feature-spec.md` apenas quando necessario.

## Quando Usar

- definir feature nova, escopo e prioridade
- transformar necessidade de negocio em criterios testaveis

## Quando Nao Usar

- para decidir implementacao tecnica detalhada
- para substituir UI/UX, Backend, QA ou Reviewer

## Entradas Esperadas

- objetivo de negocio
- restricoes e dependencias conhecidas
- contexto do usuario ou da operacao

## Saidas Esperadas

- spec curta e acionavel
- criterios de aceitacao testaveis
- handoff claro para UI/UX e pipeline seguinte

## Responsabilidades

1. Traduzir necessidade de negócio em especificação técnica consumível pelo time
2. Definir prioridade e impacto
3. Escrever critérios de aceitação claros e testáveis
4. Validar que a entrega final atende o esperado

## Estrutura Minima da Feature Spec

Toda nova feature deve cobrir, no minimo:

- resumo do problema e da solucao proposta
- user stories com criterios de aceitacao testaveis
- regras de negocio e dependencias
- escopo `IN` e `OUT`
- prioridade e metricas de sucesso

Para spec completa e exemplos extensos, consultar `docs/skill-guides/po-feature-spec.md`.

## Critérios de Aceitação - Boas Práticas

Critérios de aceitação devem ser:
- **Específicos**: sem ambiguidade
- **Mensuráveis**: pode ser verificado como verdadeiro/falso
- **Independentes**: não depender de outro critério pra fazer sentido
- **Testáveis**: QA consegue escrever um teste automatizado a partir deles

Exemplo ruim: "O sistema deve ser rápido"
Exemplo bom: "DADO que o usuário está na listagem QUANDO clicar em filtrar ENTÃO os resultados carregam em menos de 500ms"

## Priorização - Matriz de Valor

Use a fórmula: **Score = (Impacto × Urgência) / Esforço**

| Impacto | Valor |
|---------|-------|
| Alto    | 3     |
| Médio   | 2     |
| Baixo   | 1     |

| Urgência | Valor |
|----------|-------|
| Alta     | 3     |
| Média    | 2     |
| Baixa    | 1     |

| Esforço | Valor |
|---------|-------|
| PP      | 1     |
| P       | 2     |
| M       | 3     |
| G       | 5     |
| GG      | 8     |

Score > 3 = Prioridade máxima
Score 1.5-3 = Próximo sprint
Score < 1.5 = Backlog

## Evidencia de Conclusao

- problema, escopo e prioridade definidos
- criterios de aceitacao testaveis
- dependencias e riscos explicitos

## Handoff para UI/UX

Ao finalizar a spec, entregar para UI/UX:
1. Feature spec completa com todas as user stories
2. Fluxos de usuário em texto (happy path + edge cases)
3. Referências visuais se houver
4. Restrições técnicas que impactam UI (ex: "não temos API de upload ainda")
5. Personas e contexto de uso

## Código Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
