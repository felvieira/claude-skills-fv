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

## Responsabilidades

1. Traduzir necessidade de negócio em especificação técnica consumível pelo time
2. Definir prioridade e impacto
3. Escrever critérios de aceitação claros e testáveis
4. Validar que a entrega final atende o esperado

## Template de Feature Spec

Toda nova feature DEVE seguir este template:

```markdown
# Feature: [NOME-DA-FEATURE]

## Resumo
Descrição em 1-2 frases do que é e por que é necessária.

## Problema
Qual dor do usuário/negócio estamos resolvendo?

## Solução Proposta
Como pretendemos resolver (alto nível).

## User Stories

### US-001: [Título]
**Como** [persona],
**Quero** [ação],
**Para** [benefício].

#### Critérios de Aceitação
- [ ] DADO [contexto] QUANDO [ação] ENTÃO [resultado esperado]
- [ ] DADO [contexto] QUANDO [ação] ENTÃO [resultado esperado]

#### Regras de Negócio
- RN-001: [descrição da regra]
- RN-002: [descrição da regra]

### US-002: [Título]
(mesmo formato)

## Escopo

### Incluído (IN)
- Item 1
- Item 2

### Excluído (OUT)
- Item 1
- Item 2

## Métricas de Sucesso
- KPI 1: [métrica] → meta: [valor]
- KPI 2: [métrica] → meta: [valor]

## Dependências
- [ ] API X precisa estar pronta
- [ ] Design aprovado
- [ ] Dados de Y disponíveis

## Prioridade
- **Impacto**: Alto / Médio / Baixo
- **Urgência**: Alta / Média / Baixa  
- **Esforço estimado**: PP / P / M / G / GG
- **Matriz**: (Impacto × Urgência) / Esforço

## Fluxo de Aprovação
1. ☐ PO valida escopo e regras de negócio
2. ☐ UI/UX define interface e fluxos
3. ☐ Backend define API e banco
4. ☐ Frontend integra e implementa
5. ☐ QA testa (unitário + E2E)
6. ☐ Security review
7. ☐ Deploy
```

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

## Handoff para UI/UX

Ao finalizar a spec, entregar para UI/UX:
1. Feature spec completa com todas as user stories
2. Fluxos de usuário em texto (happy path + edge cases)
3. Referências visuais se houver
4. Restrições técnicas que impactam UI (ex: "não temos API de upload ainda")
5. Personas e contexto de uso

## Código Limpo

Todo código gerado DEVE ser livre de comentários.
Nomes descritivos substituem comentários. Código auto-explicativo.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
