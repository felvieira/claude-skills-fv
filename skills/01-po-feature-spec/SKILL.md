---
name: po-feature-spec
description: |
  Skill do Product Owner para especificação de features. Use quando precisar definir requisitos de negócio,
  escrever user stories, critérios de aceitação, priorização de backlog, ou qualquer documento de especificação
  de produto. Inclui fundamento de negócio para discovery: validação de hipótese, problema vs. necessidade,
  MVP, modelo de monetização e métricas pirata (AARRR) como input da spec.
  Trigger em: "nova feature", "especificação", "user story", "requisito", "backlog", "PO", 
  "definir escopo", "critério de aceitação", "MVP", "roadmap", "validação de hipótese", "discovery",
  "monetização", "pricing", "product-market fit", "métricas AARRR".
---

# Product Owner - Especificação de Features

O PO é o guardião do valor de negócio. Toda feature nova começa aqui.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/evals.md`, `policies/prd-validation.md` (13 checks fixos), `policies/constitution.md` (autoridade hierarquica) e `policies/readiness-gate.md` (critério de aceitação não-testável ou ambiguity score não resolvido reprova o gate antes do slice virar código — a skill 09 roda esse gate depois desta skill produzir a spec).

### Constituicao (se existir)

Quando `memory/constitution.md` existe no repo consumidor:
- toda spec deve respeitar os 5 eixos (Code Quality, Testing, UX, Performance, Security)
- conflito spec ↔ constituicao: ajustar a spec (constituicao vence). Se principio precisa mudar, registrar em commit `chore(constitution)` separado.
- recomendar `/checklist` apos spec inicial e `/analyze` antes de `/build`

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
- **vertical slices** (se feature multi-camada — ver abaixo)

Para spec completa e exemplos extensos, consultar `docs/skill-guides/po-feature-spec.md`.

## Vertical Slices em Specs Multi-Camada

Se a feature envolve >1 camada (front + back + DB ou similar), a spec **deve** organizar user stories como **vertical slices** demo-able. Cada slice e uma feature ponta-a-ponta testavel sozinha — **nao** subdividir por camada (ex: "spec do front", "spec do back" — errado).

**Exemplo bom (vertical):**
- Slice 1 — Login com email/senha (DB user table + endpoint /login + tela + e2e)
- Slice 2 — Cadastro (mesma table + endpoint /register + tela + e2e)
- Slice 3 — Esqueci senha (depende de Slice 1, adiciona endpoint + email service + tela + e2e)

**Exemplo ruim (layered):**
- Story 1 — UI de auth (login + cadastro + esqueci senha juntos)
- Story 2 — Backend de auth (login + cadastro + esqueci senha juntos)
- Story 3 — DB schema de auth

Cada slice deve:
- ter criterio de aceitacao testavel ponta-a-ponta (DADO/QUANDO/ENTAO atravessa camadas)
- caber em 1-3 dias de trabalho
- ser demo-able (usuario clica e ve resultado)
- declarar dependencia de outros slices se houver

Detalhes em `policies/vertical-slices.md`.

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

## Fase Divergente (Opcional)

Para features ambíguas ou inovadoras, use frameworks de ideação antes de especificar.
Consultar: `docs/skill-guides/ideation-frameworks.md`

**Quando usar:**
- Requisito vago ("melhore a experiência de busca")
- Feature sem referência clara no mercado
- Stakeholder indeciso entre abordagens
- Solução atual não está funcionando

**Quando pular:**
- User story já está clara e específica
- É task de implementação com scope definido
- Time já convergiu em abordagem validada

**Ordem recomendada:** JTBD → HMW → SCAMPER → First Principles

## Fundamento de Negócio (Discovery & Validação)

Antes de especificar, o PO valida que a feature/produto resolve um problema real que alguém paga (ou retém/indica) para resolver. Spec sem fundamento de negócio é desperdício caro. Base: *Guia da Startup* (Casa do Código), capítulos 11–32.

**Quando aplicar:** produto/feature novo, hipótese não validada, ou quando a métrica de sucesso da spec ainda é chute. Para feature incremental sobre fluxo já validado, pular direto para a spec.

### 1. Validar hipótese ANTES de especificar
Não escreva spec de algo que ninguém quer. Teste a demanda primeiro com o mínimo de esforço:
- 1 landing page simples com **3 blocos**: o problema, a solução, o preço (pode ser preço hipotético).
- Formulário capturando e-mail de interessados (a conversão é o sinal).
- Tráfego pago segmentado por ~1 mês (ex: Google Ads, orçamento baixo controlado).
- **Critério mínimo de prosseguir** (parâmetros do livro): produto de consumidor final ≈ **20%** de conversão; produto B2B/empresas ≈ **10%**, com pelo menos **~150 e-mails válidos** após um mês de campanha. Abaixo disso, repensar antes de construir.
- → Texto da landing e do anúncio: handoff para skill **13-marketing-copy** / **50-direct-response-copy** (não escrever copy aqui).
- → Instrumentação da conversão e do funil: handoff para skill **21-data-analytics**.

Registrar o resultado do teste como input da spec: "hipótese X validada a Y% de conversão / N e-mails".

### 2. Problema vs. necessidade latente (descobrir o problema real)
- **Separe problema de solução.** Quando o usuário diz "queria um botão que faz X", X é uma *sugestão de solução*, não o problema. Pergunte "por quê" até chegar no problema de fato (no livro: o Sr. Smith pede "mais um cavalo", mas o problema é "passo pouco tempo com a família").
- **Necessidade latente:** às vezes o problema não está declarado — o usuário não sabe que tem o problema, ou não percebe a solução possível. Validar que ele *reconhece* o problema antes de assumir que vai querer a solução.
- **Problema vs. necessidade:** problema = obstáculo que pede resolução; necessidade = algo subjetivo/fundamental (autoestima, conexão, expressão — Pirâmide de Maslow). Ambos geram produto válido. A spec deve declarar qual dos dois está atacando.
- **Proximidade:** resolver problema próprio/conhecido reduz ambiguidade da spec. Cuidado: você vira usuário avançado rápido e esquece o novato.
- **Regra-âncora (Steve Blank, citado no livro):** *"Startups não falham por não conseguir construir o produto. Falham por não encontrar clientes dispostos a pagar."* Tecnologia bacana sem problema = não é produto.

### 3. MVP de verdade (mínimo viável, não mínimo bonito)
- A função do PO que **não se terceiriza**: definir as funcionalidades **mínimas** que resolvem o problema. É o coração da spec.
- Corte agressivo: cada funcionalidade extra atrasa receita/aprendizado e *diminui* a satisfação do usuário acima de certo ponto (excesso de funcionalidade vira problema novo). Lançar 3 meses antes pode antecipar 6 meses o retorno.
- Teste do "essencial": funcionalidade que parece indispensável muitas vezes não move a métrica. Validar por uso real (ex: ligar/desligar a feature e observar churn/conversão), não por opinião.
- **Cuidado com o MVP virar "Proposta de Valor Medíocre":** lançar mínimo só funciona se você tiver agilidade para iterar com base no feedback. MVP é o *início* do experimento, não o fim.
- Na spec: o escopo `IN` é o MVP; tudo que "seria bom ter" vai para `OUT` com justificativa de adiamento.

### 4. Modelo de monetização e pricing (input da spec, não detalhe técnico)
A spec deve declarar **como a feature/produto gera ou protege receita**. Tipos (do livro):
- **Receita paga pelo usuário** — assinatura recorrente (mensal/anual) ou **pagamento por uso** (medível: msgs enviadas, ligações, vendas). B2B aceita cobrança direta; consumidor final resiste mais.
- **Receita paga por terceiro interessado no usuário** — anúncios/dados. Exige base *enorme* e recorrente (centenas de milhares) para valer.
- **Receita indireta** — venda/aluguel de itens (e-commerce) ou **redução de custo** (internet banking, intranet — não há receita, há economia).
- **Freemium:** versão grátis só é sustentável se o custo de servir cada usuário grátis for ≈ zero. Conversão típica grátis→pago **≤ 2%** (precisa de ~100k usuários para ~2k pagantes). Distinguir *versão grátis* (para sempre) de *trial* (tem fim).
- **Pricing:** considerar valor percebido + concorrentes + custo (a receita tem que cobrir operação + desenvolvimento + sobra). Preço pode variar por cliente. Testar preço é experimento válido (no livro, dobrar o preço quase não mudou a taxa de novas assinaturas — após período de maturação).

### 5. Métricas pirata (AARRR) como input da spec
Toda feature deve declarar **qual estágio do funil ela move**. O livro descreve o funil de conversão (visitante → usuário → cliente → churn) que mapeia direto nas métricas pirata AARRR:

| AARRR | No livro | Pergunta da spec |
|-------|----------|------------------|
| **Aquisição** | quantos ficam sabendo / cliques / visitantes únicos | a feature traz tráfego qualificado? |
| **Ativação** | visitante → usuário (1º uso bem-sucedido) | a feature ajuda o novato a ter sucesso rápido? |
| **Retenção** | usuário volta a usar | a feature traz o usuário de volta? |
| **Receita** | usuário → cliente pagante | a feature converte ou aumenta receita? |
| **Indicação** | NPS / boca-a-boca / promotores | a feature gera recomendação? |

- **Foco qualificado, não volume:** trazer 100k visitantes dos quais só 1k têm o problema é pior que trazer 1k qualificados. A spec deve mirar o público que *tem o problema*.
- **Critério de aceitação ligado à métrica:** a métrica de sucesso da spec deve nomear o estágio AARRR e um alvo mensurável.
- → Definição de eventos, naming e tracking plan: handoff para skill **21-data-analytics** (não inventar nomes de evento aqui).

### 6. Product-market fit como critério de priorização
- O livro descreve as 4 fases (*Startup Genome*): **Discovery** (o produto resolve um problema?) → **Validation** (alguém paga/dá atenção?) → **Efficiency** (refinar aquisição) → **Scale**. Não escale o que não tem fit.
- **Ajuste da priorização:** antes de aplicar `Score = (Impacto × Urgência) / Esforço`, classifique a fase. Em **Discovery/Validation**, priorize features que *aprendem* (validam hipótese, ativam, retêm) sobre features que *escalam* (otimização, polish). Uma feature de polish com score alto mas sem fit validado é armadilha.
- **Números de longo prazo como guarda-corpo:** uma feature de monetização só faz sentido se a unidade econômica fecha — **LTV > CAC** (CAC = custo de adquirir cliente; LT = tempo de vida; LTV = receita no tempo de vida). Se a feature aumenta CAC sem mover LTV/retenção, repriorizar. Esses números estabilizam por volta de ~2 anos de operação — não decidir cedo demais com dados rasos.

Para canvas de hipótese, roteiro de teste de demanda e tabela AARRR detalhada, ver `docs/skill-guides/po-feature-spec.md`.

## Ambiguity Scoring

Antes de iniciar a spec, calcular o ambiguity score para decidir se o briefing e suficiente.

**Formula:**
```
ambiguity = 1 - (goal * 0.40 + constraints * 0.30 + criteria * 0.30)
```

**Variante Brownfield** (codebase conhecida):
```
ambiguity = 1 - (goal * 0.30 + constraints * 0.25 + criteria * 0.25 + context_clarity * 0.20)
```

**Thresholds:**
- `score < 0.4` → prosseguir direto
- `score 0.4-0.7` → enrich mode (inferir do repo-audit e confirmar)
- `score > 0.7` → iniciar Deep Interview

Usar `devkit_ambiguity_score` (MCP) para calcular programaticamente.

## Deep Interview Protocol

Acionar quando `score > 0.7`. Seguir `templates/deep-interview.md`.

**Principios:**
- Uma pergunta por rodada, preferencialmente multipla escolha, com um palpite (guess) anexado à pergunta
- Sistema infere e confirma — nunca devolve "escreva mais"
- Max 5 rodadas, parar quando stability ratio > 0.8 por 2 rodadas
- Fail-forward: apos 5 rodadas sem estabilidade, prosseguir com melhor entendimento
- Desconfiar de resposta que soa "boa prática" em vez de necessidade real ("escalável", "do jeito que todo app faz") — sondar com "se não precisasse justificar pra ninguém, o que você realmente quer?"
- Restate final SEMPRE inclui linha "Fora de escopo" — e "beleza"/"manda ver"/"confio em você" não contam como confirmação (ver `templates/deep-interview.md`)

**Enrich Mode** (score 0.4-0.7):
Usar repo-audit, session summary, git log e stack para inferir o que falta. Apresentar:
```
"Entendi que voce quer [X]. Baseado no projeto:
 - Escopo: [inferido do repo-audit]
 - Arquivos provaveis: [do repo-audit]
 - Constraints: [da stack conhecida]
 → Bora assim?
 → Quer ajustar ou detalhar algo?
 → Ou era outra coisa?"
```

## Código Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

## Fontes

- Disciplina de palpite-anexado, sonda "want vs. should-want" e restate com "fora de escopo" (em `templates/deep-interview.md`) adaptados de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills), skill `interview-me` (MIT).

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
- **skill 48 (research-prep):** roda **antes** desta skill quando a feature envolve tecnologia externa não dominada pelo time. Passar `memory/research/<slug>.md` como contexto de "o que existe" antes de escrever a spec.
