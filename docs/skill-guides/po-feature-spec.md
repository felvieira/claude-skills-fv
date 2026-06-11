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

## Discovery & Validação de Negócio (templates)

Destilado de *Guia da Startup* (Casa do Código), caps. 11–32. Usar quando a feature/produto ainda não tem hipótese de negócio validada.

### Canvas de Hipótese (preencher antes da spec)

```
PROBLEMA / NECESSIDADE
- Problema real (não a solução sugerida): ____
- É problema (obstáculo) ou necessidade (Maslow)? ____
- A pessoa RECONHECE esse problema? (latente?) ____
- Proximidade: é problema próprio/conhecido? ____

PÚBLICO
- Quem tem esse problema: ____
- Onde ele já está procurando solução (canal/nicho): ____

SOLUÇÃO MÍNIMA (MVP)
- Menor coisa que resolve o problema: ____
- O que fica de FORA do primeiro lançamento (e por quê): ____

MONETIZAÇÃO
- Tipo de receita: [paga pelo usuário | terceiro | indireta | redução de custo]
- Recorrente / por uso / única: ____
- Preço hipótese (valor percebido + concorrente + custo): ____

HIPÓTESE TESTÁVEL
- "Acredito que [público] vai [pagar/usar/indicar] por [solução] para resolver [problema]."
- Métrica que confirma/refuta: ____
```

### Roteiro de Teste de Demanda (antes de construir)

```
1. Landing page com 3 blocos: problema | solução | preço (pode ser hipotético)
2. Captura de e-mail dos interessados (o sinal é a conversão)
3. Tráfego pago segmentado, orçamento baixo controlado, ~1 mês
   (segmentar por quem TEM o problema; nicho/keyword > público genérico)
4. Medir: pageviews, e-mails capturados, taxa de conversão
5. Critério de prosseguir (parâmetros do livro):
   - Consumidor final: ~20% de conversão
   - B2B / empresas: ~10% de conversão
   - Mínimo absoluto: ~150 e-mails válidos após 1 mês
6. Abaixo do critério -> repensar problema/público/proposta antes de escrever spec
7. Registrar resultado como input da spec ("hipótese X: Y% / N e-mails")

-> Copy da landing/anúncio: skill 13 / 50.
-> Instrumentação de conversão: skill 21.
```

Variações de validação observadas no livro: landing + captura de e-mail (unbounce/launchrock); pesquisa de 3 perguntas (Wufoo/Google Forms); pesquisa à base existente (NPS + disposição a pagar) antes de cobrar.

### Tabela AARRR — feature → estágio do funil

Preencher na spec: que estágio esta feature move e qual o alvo.

| Estágio (AARRR) | Pergunta | Métrica exemplo | Alavanca (do livro) |
|-----------------|----------|-----------------|---------------------|
| Aquisição | traz tráfego qualificado? | visitantes únicos qualificados, custo/clique | pago (rápido) vs. conteúdo/SEO (lento); priorizar nicho |
| Ativação | novato tem sucesso no 1º uso? | % que completa ação-chave no 1º dia | formulário curto (só nome+e-mail), copy focada no problema, CTA em toda página |
| Retenção | volta a usar? | uso no dia seguinte / D7 | onboarding, lembrar valor, testemunhos |
| Receita | converte em pagante? | trial->pago, MRR | trial com prazo, valor explícito, pricing |
| Indicação | gera recomendação? | NPS, % promotores | facilitar compartilhamento, NPS de entrada e de saída |

### Números de longo prazo (monitorar desde o mês 1)

- **Globais:** receita mensal vs. custo mensal. Custos em 4 categorias: infraestrutura, desenvolvimento, marketing, domínio (conhecimento do tema).
- **Individuais:** **CAC** (custo de adquirir cliente), **LT** (tempo de vida, só faz sentido com receita recorrente), **LTV** (receita no tempo de vida).
- **Regra:** produto rentável quando LTV > CAC, com LT e LTV maiores e CAC menor. Estabiliza por volta de ~2 anos.

### Fases (Startup Genome) — usar na priorização

1. **Discovery** — o produto resolve um problema e há interessados? (~5–7 meses)
2. **Validation** — pagam ou dão atenção? (~3–5 meses)
3. **Efficiency** — refinar modelo e eficiência de aquisição. (~5–6 meses)
4. **Scale** — pisar no acelerador. (~7–9 meses)

Não priorizar features de Scale/polish enquanto Discovery/Validation não fecharam. Score `(Impacto × Urgência)/Esforço` deve ser ponderado pela fase: em Discovery/Validation, features que *aprendem* > features que *escalam*.
