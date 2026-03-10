# PO Feature Spec Guide

Guia de referência para a skill `01-po-feature-spec`. Consultar quando precisar de exemplos completos de spec, priorização ou critérios de aceitação.

## Template de Feature Spec

```markdown
# Feature: [Nome]

## Problema
[O que está quebrando ou faltando para o usuário]

## Solução proposta
[O que vamos construir]

## Escopo

**IN:**
- [o que entra]

**OUT:**
- [o que fica fora]

## User Stories

### US-01 — [título]
**Como** [persona]
**Quero** [ação]
**Para** [benefício]

**Critérios de aceitação:**
- DADO [contexto] QUANDO [ação] ENTÃO [resultado esperado]
- DADO [contexto] QUANDO [ação de borda] ENTÃO [resultado de erro]

## Regras de Negócio
- RN-01: [regra]
- RN-02: [regra]

## Dependências e riscos
- [depende de API X estar disponível]
- [risco: volume de dados pode impactar performance]

## Métricas de sucesso
- [ex: taxa de conversão do fluxo > X%]
- [ex: tempo médio de conclusão < Y segundos]

## Prioridade
Score = (Impacto × Urgência) / Esforço = [N]
```

## Matriz de Priorização

| Impacto | Urgência | Esforço | Score | Decisão |
|---------|----------|---------|-------|---------|
| 3 | 3 | 1 | 9.0 | Prioridade máxima |
| 3 | 2 | 3 | 2.0 | Próximo sprint |
| 2 | 1 | 5 | 0.4 | Backlog |

**Tabela de valores:**

| Dimensão | Valor |
|----------|-------|
| Impacto alto | 3 |
| Impacto médio | 2 |
| Impacto baixo | 1 |
| Urgência alta | 3 |
| Urgência média | 2 |
| Urgência baixa | 1 |
| Esforço PP | 1 |
| Esforço P | 2 |
| Esforço M | 3 |
| Esforço G | 5 |
| Esforço GG | 8 |

Score > 3 = prioridade máxima · Score 1.5–3 = próximo sprint · Score < 1.5 = backlog

## Critérios de Aceitação — Bons e Ruins

| Ruim | Bom |
|------|-----|
| "O sistema deve ser rápido" | "DADO que o usuário está na listagem QUANDO clicar em filtrar ENTÃO os resultados carregam em menos de 500ms" |
| "Deve funcionar no mobile" | "DADO que estou no iPhone 12 QUANDO abrir o formulário ENTÃO todos os campos são acessíveis sem scroll horizontal" |
| "Login deve ser seguro" | "DADO 5 tentativas incorretas QUANDO tentar logar ENTÃO a conta é bloqueada por 15 minutos" |

Critérios devem ser: **específicos**, **mensuráveis**, **independentes**, **testáveis por QA**.

## Checklist de Aprovação entre Áreas

```
☐ Objetivo e problema claramente definidos
☐ Escopo IN/OUT explícito
☐ User stories com critérios de aceitação testáveis
☐ Regras de negócio sem ambiguidade
☐ Dependências técnicas identificadas
☐ Riscos mapeados
☐ Métricas de sucesso definidas
☐ Prioridade calculada
☐ Handoff para UI/UX preparado
```
