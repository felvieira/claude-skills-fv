---
name: saas-conversion-playbook
description: |
  Audita e desenha o funil de conversão de assinatura de um SaaS ou app — onboarding, evento de
  ativação, paywall, gatilhos in-app, modelo comercial (freemium/trial/hard paywall/reverse trial)
  e lifecycle de e-mail. Classifica o produto em playbook A (consumer/resultado pessoal) ou B
  (ferramenta B2B/PLG) e usa isso para recomendar telas, copy e métricas-alvo com benchmark real,
  não achismo. Aprofunda taticamente a seção de monetização da skill 01 (po-feature-spec).
  Trigger em: "auditoria de conversão", "auditar meu SaaS", "onde colocar o paywall", "desenhar
  onboarding", "trial to paid", "freemium ou trial", "reverse trial", "hard paywall", "evento de
  ativação", "aha moment", "gatilho de upgrade", "funil de assinatura", "R por mil usuários",
  "modelo de monetização SaaS", "quiz de onboarding", "paywall genérico", "downsell", "cancel-save".
allowed-tools: Read, Grep, Glob, Write
metadata:
  argument-hint: "<URL, pitch ou descrição do produto> [--modelo atual]"
  version: "1.0.0"
---

# SaaS Conversion Playbook — Auditoria de Onboarding, Paywall e Ativação

Transforma a descrição de um produto (URL, pitch ou telas) num relatório operacional de conversão:
classificação de playbook, telas a criar/reescrever, paywall, gatilhos in-app, lifecycle de e-mail
e backlog de 4 semanas. Não implementa código — entrega spec pronta para handoff.

## Governança Global

Segue `GLOBAL.md`, `policies/source-driven.md`, `policies/handoffs.md` e `policies/evals.md`.
Toda métrica-alvo citada vem de `references/playbook.md`; não inventar número fora dessas faixas.
Hipótese sem evidência direta do produto recebe o rótulo `HIPOTESE` — nunca vira fato no relatório.

**Fronteira com skills vizinhas:**
- `01-po-feature-spec` decide **se** cobrar e qual a proposta de valor — esta skill decide **como**
  o funil converte visitante em pagante, dado que a decisão de produto já existe
- `63-mobile-paywall-checkout` é a **UI/UX de checkout mobile** (Play Billing, Stripe, estados de
  pagamento) — esta skill decide a **estratégia de onboarding/paywall/lifecycle** que antecede o
  checkout; a 63 implementa a tela, esta skill diz quando ela aparece e o que ela precisa comunicar
- `59-closed-loop-revenue` fecha o loop de **atribuição de mídia paga com receita** — esta skill
  cobre o funil de **produto** (onboarding → ativação → paywall), não aquisição paga
- `21-data-analytics` define taxonomia de evento de produto em geral — esta skill usa esse padrão
  para os eventos específicos de ativação/paywall/trial listados aqui

## Quando Usar

- auditar o onboarding, paywall ou funil de trial de um produto existente
- desenhar do zero as telas de ativação e conversão de um SaaS novo
- decidir entre freemium, trial com/sem cartão, hard paywall ou reverse trial
- diagnosticar por que trial-to-paid ou free-to-paid está abaixo do benchmark
- escrever copy de paywall, e-mail de trial ou fluxo de cancelamento

## Quando Não Usar

- decidir preço, tiers ou proposta de valor do zero — isso é `01-po-feature-spec`
- implementar a tela de checkout mobile (Play Billing/Stripe/estados de pagamento) — `63-mobile-paywall-checkout`
- instrumentar atribuição de campanha paga ou reconciliar receita com ads — `59-closed-loop-revenue`
- definir taxonomia geral de evento de produto fora do funil de conversão — `21-data-analytics`

## Entradas Esperadas

- URL, pitch, prints de tela ou descrição textual do produto
- modelo comercial atual (free permanente, trial com/sem cartão, hard paywall, usage, ainda não cobra)
- plataforma (web, iOS/Android, ambos), ticket aproximado e se a compra é solo ou com comitê
- resposta candidata a "que ação na primeira sessão faria o usuário voltar amanhã" (candidato a aha)

Se qualquer um desses faltar, usar `references/intake.md` — no máximo 5 perguntas por turno, nunca
bloquear o relatório: assumir e marcar `HIPOTESE`.

## Saídas Esperadas

Relatório markdown (ou PDF se pedido) seguindo `references/report-schema.md`:

- veredito em uma página com frase-prova do aha e 5 mudanças priorizadas por vazamento
- classificação Playbook A/B (ou híbrido) com justificativa
- evento de ativação proposto + como instrumentar
- telas a criar/reescrever com objetivo, copy e evento de analytics cada
- paywall completo (headline, timeline honesta, planos, downsell, FAQ)
- matriz de gatilhos in-app e sequência de lifecycle de e-mail
- backlog de 4 semanas e lista explícita do que fica fora de escopo

## Fluxo Obrigatório

1. **Coletar o sistema.** Aceitar URL, pitch, print, lista de telas ou "é um SaaS de X". Havendo
   URL, abrir e extrair proposta, planos, signup e onboarding visível antes de perguntar qualquer
   coisa que já esteja ali.
2. **Fechar lacunas** com `references/intake.md` — no máximo 5 perguntas, não bloquear o relatório.
3. **Classificar A ou B** com a regra de `references/playbook.md`: o aha é um plano revelado (A) ou
   um artefato criado (B)? Escrever a frase-prova ("o aha é X"). Híbrido = playbook dominante + 2
   empréstimos do outro, nunca metade de cada.
4. **Mapear funil atual vs. canônico** — toda recomendação tem tela, gatilho, copy e evento.
5. **Escrever o relatório** no schema de `references/report-schema.md`, no idioma do usuário
   (default pt-BR), adaptando `assets/copy-bank.md` ao vocabulário real do produto.
6. **Checkpoint antes de entregar:** reler as métricas-alvo citadas contra a tabela de
   `references/playbook.md` — todo número fora dessas faixas ou sem rótulo `HIPOTESE` volta pra
   correção antes do relatório sair. Confirmar que nenhuma tela ficou sem evento de analytics.
7. **Oferecer o próximo passo** (wireframe da tela 1, ou o backlog priorizado) — não implementar
   código a menos que o usuário peça explicitamente.

## Regras de Diagnóstico

- Não prescrever quiz de 6-12 telas para ferramenta B2B; não prescrever cadastro seco sem
  diagnóstico para app de resultado pessoal — ver tabela comparativa em `references/playbook.md`.
- Oferta comercial já na sessão 1; hard paywall só depois do reveal/aha, nunca antes.
- Downsell no ponto de saída é estender o trial (ex: 7→14 dias), não "50% OFF eterno".
- Paywall de feature usa a copy da tarefa específica + preview real — nunca "Upgrade to Pro" genérico.
- Aftercare é obrigatório depois de trial ou pagamento confirmado; dashboard vazio pós-checkout é defeito.
- Toda tela do relatório tem objetivo, headline, CTA, critério de saída e evento de analytics — sem
  exceção, mesmo quando a tela é simples.
- Escolher o modelo comercial pela conta de R/1K (visitante→registro × registro→pago × ARPU), nunca
  por uma percentagem isolada fora de contexto.

## Anti-Padrões

- Entregar relatório genérico sem o nome real do produto e sem vocabulário específico dele
- Tour linear de 12 telas, e-mail bloqueante de verificação, plano exigido no signup, countdown falso
- Prompt nativo de permissão de push na abertura, sem pre-permission explicando o porquê antes
- Chat ao vivo como alavanca default em produto consumer de ticket baixo
- Prometer lift percentual específico como garantia deste relatório — benchmarks são faixa, não promessa
- Copiar duração de trial do concorrente sem calcular contra o TTV (time-to-value) do próprio produto

## Evidência de Conclusão

- classificação A/B/híbrido justificada com frase-prova do aha
- toda métrica-alvo citada rastreia para uma faixa de `references/playbook.md`, com `HIPOTESE`
  explícito onde não há dado direto do produto
- cada tela recomendada tem objetivo, copy, critério de saída e evento nomeado
- paywall cobre os 14 blocos de `references/playbook.md`, sem os itens da lista de proibidos
- backlog de 4 semanas começa por ativação, não por redesign de marca

## Handoff

### Recebe de

- **01-po-feature-spec** — proposta de valor e decisão de que o produto cobra por assinatura

### Entrega para

- **63-mobile-paywall-checkout** — decisão de modelo comercial e momento do paywall, para a UI de
  checkout mobile implementar
- **21-data-analytics** — lista de eventos de ativação/paywall/trial para entrar na taxonomia geral
- **13-marketing-copy** ou **50-direct-response-copy** — copy de paywall e e-mail como ponto de
  partida para variações e testes A/B

## Integração com Pipeline

`01 po-feature-spec (decide cobrar) -> 73 saas-conversion-playbook (desenha o funil) ->
63 mobile-paywall-checkout (implementa a UI) -> 21 data-analytics (instrumenta)`.

## Recursos

- `references/playbook.md` — classificação A/B, telas de onboarding, 14 blocos de paywall, 8
  gatilhos in-app, modelos comerciais com R/1K, lifecycle e métricas-alvo com benchmark
- `references/report-schema.md` — estrutura obrigatória do relatório, seção a seção
- `references/intake.md` — perguntas mínimas e tabela de inferência permitida
- `assets/copy-bank.md` — frases prontas em PT-BR para adaptar ao vocabulário do produto

## Fontes

Conteúdo consolidado a partir de material de benchmark de conversão SaaS fornecido pelo usuário
(pesquisa própria de mercado sobre onboarding, paywall e lifecycle de assinatura), adaptado ao
formato e às convenções deste kit.
