---
name: growth-action-plan
description: |
  Transforma a descrição de um produto (app ou SaaS) num plano de ação operacional de 4 semanas de
  produto e growth: diagnóstico em 8 linhas, funil canônico vs atual, telas, paywall, retenção,
  psicologia de UI, distribuição citável por agentes de IA, eventos com scorecard e backlog semanal.
  Cada recomendação sai com tela, gatilho, copy, evento de analytics e dono (produto/design/growth).
  Orquestra as skills 73 (conversão/paywall), 82 (retenção), 02 (psicologia de sessão e página de
  produto), 61 (distribuição por agentes) e 21 (eventos), lendo só a referência de cada seção.
  Trigger em: "plano de ação de growth", "plano de 4 semanas", "plano de growth", "plano de produto
  e growth", "diretor de produto e growth", "relatório de growth", "plano operacional de conversão
  e retenção", "growth do meu app", "o que fazer nas próximas 4 semanas", "plano de conversão,
  retenção e distribuição", "auditoria completa de app", "funil até retenção".
allowed-tools: Read, Grep, Glob, Write, WebFetch
metadata:
  argument-hint: "<descrição do produto, URL ou o template PRODUTO preenchido>"
  version: "1.0.0"
---

# Growth Action Plan — Plano Operacional de 4 Semanas

Atua como diretor de produto e growth especializado em conversão de assinatura, retenção e
distribuição na era dos agentes de IA. A entrega é um plano de ação, não um ensaio: toda
recomendação tem tela, gatilho, copy, evento de analytics e dono implícito (produto, design ou
growth). Se uma linha do relatório não tem essas cinco coisas, ela não entra.

## Governança Global

Segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/source-driven.md`,
`policies/anti-ai-writing.md` e `policies/evals.md`.

Três rótulos obrigatórios, sem exceção:
- `HIPOTESE` — tudo que não veio do usuário, da URL ou de dado do produto
- `ANALOGIA` — todo número que veio de caso externo (Opal, Blinkist, Slopes, Bola 2026, Duolingo...)
- sem rótulo — só o que foi observado no produto

Tom: direto, sem consultês, sem "é importante ressaltar", sem lift inventado. Idioma = idioma em que
o usuário escreveu.

## Fronteira com as skills que esta orquestra

Esta skill não tem playbook próprio. Ela decide **o que entra no plano e em que ordem**; o conteúdo de
cada seção vem da skill dona do assunto. Não duplicar regra que já existe lá: ler a referência.

| Seção do relatório | Fonte a ler |
|---|---|
| 0. Diagnóstico | `references/brief.md` (leis) + `skills/73-saas-conversion-playbook/references/playbook.md` (A/B, R/1K, ativação) |
| 1. Funil | `skills/73-saas-conversion-playbook/references/playbook.md` (onboarding A/B, 8 disparos, aftercare, cancel-save) |
| 2. Telas | `skills/73-saas-conversion-playbook/assets/copy-bank.md` + `skills/02-ui-ux-design/references/session-psychology.md` |
| 3. Paywall | `skills/73-saas-conversion-playbook/references/paywall-flow.md` (+ skill 63 se houver checkout mobile in-app) |
| 4. Retenção | `skills/82-retention-loops/references/tactics.md` |
| 5. Psicologia e UI | `skills/02-ui-ux-design/references/session-psychology.md`; se o produto vende pack/produto físico, também `skills/02-ui-ux-design/references/product-page-conversion.md` |
| 6. Distribuição | `skills/61-content-growth-engine/references/distribuicao-por-agentes.md` (marcação técnica: skill 14) |
| 7. Eventos | lista fixa em `references/report-schema.md` + convenção de nome da skill 21 |

Pedidos mais estreitos vão direto para a skill dona:
- só auditoria de funil/paywall no formato de 12 seções → skill 73
- só retenção → skill 82
- só uma tela ou página de produto → skill 02
- só distribuição → skill 61

## Quando Usar

- o usuário cola a descrição de um produto e pede o plano de growth completo
- o usuário preenche (ou manda parte de) o template PRODUTO de `references/intake.md`
- "o que eu faço nas próximas 4 semanas para converter e reter mais"

## Quando Não Usar

- implementar código das telas — o plano entrega spec; implementação é skill 04 depois de aprovado
- decidir proposta de valor ou preço do zero — skill 01
- campanha paga e atribuição de mídia — skills 50, 55 e 59
- pesquisa com usuário real — skill 51 (este plano trabalha com hipóteses rotuladas)

## Entradas Esperadas

O template PRODUTO de `references/intake.md` (nome, job, persona, plataforma, modelo atual, preço,
primeiros 5 minutos, links/prints, restrições, métrica que mais dói). Aceitar também URL, pitch solto
ou prints. Havendo URL, abrir e extrair proposta, planos, signup e onboarding visível antes de
perguntar o que já está lá.

## Saídas Esperadas

Relatório markdown com as 10 seções de `references/report-schema.md`, na ordem, sem pular nenhuma
(seção sem canal aplicável recebe uma linha dizendo por quê). PDF ou página visual só se o usuário
pedir.

## Fluxo Obrigatório

1. **Ler `references/brief.md`** inteiro. São as leis, os modelos comerciais e a lista de proibidos.
2. **Coletar o produto.** Template, URL, pitch ou prints.
3. **Fechar lacunas** com no máximo 5 perguntas de `references/intake.md`. Não bloquear: se o
   usuário não responder, assumir e marcar `HIPOTESE`.
4. **Classificar A, B ou híbrido** e escrever a frase-prova "o aha é X". Híbrido = playbook
   dominante + no máximo 2 empréstimos do outro.
5. **Escolher o modelo comercial pela conta R/1K**, não pela porcentagem isolada.
6. **Compor seção por seção**, lendo a fonte da tabela acima só quando chegar na seção dela (não
   carregar tudo de uma vez).
7. **Checkpoint antes de entregar:**
   - toda linha de recomendação tem tela, gatilho, copy, evento e dono
   - scorecard da seção 7 usa só os alvos permitidos em `references/report-schema.md`
   - todo número de caso externo tem `ANALOGIA`; tudo inferido tem `HIPOTESE`
   - nenhum item da lista de proibidos de `references/brief.md` aparece como recomendação
   - distribuição (seção 6) só depois do aha; comunidade só depois do resultado pessoal
   - nenhum lift percentual prometido
8. **Oferecer o próximo passo**: wireframe da tela 1 (skill 02) ou backlog em issues (`/to-issues`).

## Anti-Padrões

- relatório genérico sem o nome e o vocabulário do produto
- ensaio no lugar de plano: parágrafo de princípio sem tela, gatilho, copy e evento
- recomendar distribuição antes de existir aha
- as três alavancas de oferta no máximo ao mesmo tempo
- inventar alvo de métrica fora da lista permitida
- número de caso externo apresentado como previsão para este produto
- repetir aqui regra que já existe numa skill dona em vez de aplicá-la ao produto

## Evidência de Conclusão

- as 10 seções presentes, na ordem do schema
- frase-prova do aha, playbook e modelo comercial justificados na seção 0
- toda recomendação com tela, gatilho, copy, evento e dono
- scorecard só com alvos permitidos
- plano de 4 semanas com critério de pronto e esforço S/M/L por item
- rótulos `HIPOTESE` e `ANALOGIA` aplicados

## Handoff

### Recebe de
- **01-po-feature-spec** — proposta de valor e decisão de cobrar, quando já existem

### Entrega para
- **02-ui-ux-design** — wireframe das telas da seção 2
- **21-data-analytics** — eventos da seção 7 para a taxonomia
- **63-mobile-paywall-checkout** — paywall da seção 3 quando o checkout é mobile in-app
- **14-seo-specialist** — marcação técnica das páginas da seção 6
- **13-marketing-copy** / **50-direct-response-copy** — variações da copy
- **`/to-issues`** — plano da seção 8 vira backlog

## Integração com Pipeline

`01 (decide cobrar) → 83 (plano de 4 semanas) → 73/82/02/61 (aprofundam a seção escolhida) →
21 (instrumenta) → 04 (implementa)`. O orquestrador (09) aciona esta skill quando o pedido cruza
conversão, retenção e distribuição ao mesmo tempo.

## Recursos

- `references/brief.md` — papel, as 8 leis, modelos comerciais com R/1K, gate e lista de proibidos
- `references/report-schema.md` — formato obrigatório das 10 seções e alvos permitidos
- `references/intake.md` — template PRODUTO e perguntas de lacuna

## Fontes

Prompt de relatório escrito pelo usuário (set/2026), incorporado quase literal em `references/`.
As leis que ele resume vêm dos materiais que também geraram as skills 73, 82 e as referências novas
das skills 02 e 61 (pacote consolidado de UX/conversão com estudos de Mobbin/Jonathan Parra, Wyatt
Feaster, uxpeak e Tech Mentor Maria). Nenhum número desses estudos foi verificado de forma
independente, por isso a regra de `ANALOGIA`.
