---
name: mobile-paywall-checkout
description: |
  Skill de UI/UX de paywall e checkout de pagamento em apps mobile — seleção de plano, periodicidade,
  cupão, Google Play Billing, Google Pay e PSPs externos (Stripe, Mercado Pago). Cobre a decisão de
  arquitetura de cobrança (quando é obrigatório Play Billing vs. quando PSP externo é permitido), o
  fluxo periodicidade→plano→cupão→pagamento→autenticação→confirmação, a hierarquia de plano-alvo sem
  manipulação, estados de pagamento (processing/3DS/pending/succeeded/failed) e a posição do campo de
  cupão (collapsed vs. aberto). Complementa a skill 60 (que cobre o lado backend/dados de pagamento
  multi-provider) com o lado de interface e decisão de produto.
  Trigger em: "paywall", "tela de assinatura", "checkout de assinatura", "seleção de plano", "plan card",
  "checkout de pagamento mobile", "google play billing", "in-app purchase", "iap", "purchase sheet",
  "campo de cupão", "cupom no checkout", "3ds", "3d secure", "payment sheet", "google pay no checkout",
  "mercado pago mobile", "mercado pago no app", "preço anual vs mensal", "preço anual deve aparecer",
  "billing period selector", "plano recomendado", "pré-selecionar plano", "fluxo de assinatura android",
  "tela de preços do app".
argument-hint: "[--foco=billing-decision|plan-selection|coupon|payment-states|accessibility|experimentation]"
---

# Mobile Paywall & Checkout — Seleção de Plano e Pagamento em Apps

Ajudar o usuário a **escolher** um plano antes de pedir que ele **resolva** o pagamento. O plano-alvo pode ter mais hierarquia visual; preço, periodicidade, renovação e alternativas nunca podem ser ocultados ou apresentados de forma enganadora.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/evals.md` e `policies/anti-ai-writing.md` (microcopy de checkout é prosa que usuário lê — passa por `/humanize`).

**Fronteira com skills vizinhas** — esta skill decide **a interface e o fluxo de decisão do usuário**. Não reimplementa:

- `skills/60-app-reference-architecture/SKILL.md` — modelo de dados unificado de pagamento (tabela `Subscription`, `grace_period`, RTDN, reconciliação, ledger de créditos, multi-provider registry pattern). Esta skill 63 consome esse modelo para decidir a UI; não duplica o schema nem a lógica de webhook. `docs/skill-guides/app-reference-architecture/04-pagamentos.md` é a fonte de verdade do lado backend
- `skills/02-ui-ux-design/SKILL.md` — leis cognitivas, dark patterns, três camadas de token, hierarquia visual geral. Esta skill 63 aplica esses princípios ao domínio específico de paywall, não os reescreve
- `skills/02-ui-ux-design/references/marketing-surfaces.md` — página de preço **pública, sem SDK, sem transação real** (marketing). Esta skill 63 é o paywall **in-app com checkout de verdade** — o usuário já está no app, a tela abre um `PaymentSheet`/`purchase sheet`
- `skills/57-mobile-ux-foundations/SKILL.md` — thumb zone, dark mode físico, performance percebida. Esta skill 63 herda esses fundamentos sem repetir
- `skills/22-accessibility-specialist/SKILL.md` — WCAG geral. Esta skill 63 só declara os requisitos específicos de touch target e semantics de componente de pagamento
- `skills/06-security-review/SKILL.md` — fronteira PCI (PAN/CVV nunca persistidos, nunca em log/analytics) é regra de segurança que esta skill cita mas não é dona

## Quando Usar

- desenhar ou revisar a tela de seleção de plano/assinatura de um app mobile
- decidir se o checkout usa Google Play Billing, Google Pay, ou PSP externo (Stripe, Mercado Pago)
- posicionar e desenhar o campo de cupão/desconto no checkout
- especificar os estados de pagamento (processing, 3DS, pending, erro, sucesso)
- definir hierarquia visual do plano recomendado sem cair em dark pattern
- montar plano de A/B testing e funil de métricas de um paywall

## Quando Não Usar

- desenhar página de preço pública sem transação real — `references/marketing-surfaces.md` da skill 02
- implementar o schema de dados, webhook ou reconciliação de pagamento — skill 60
- decisão de pricing/monetização do produto (quanto cobrar, quais tiers existem) — skill 01, seção de monetização
- checkout de e-commerce de produto físico — este domínio é assinatura/conteúdo digital in-app

## Modelo Conceptual — Quatro Entidades Que Não Se Misturam

| Entidade | Exemplo | Pergunta que responde |
| --- | --- | --- |
| **Tier/plano** | Essencial / Pro / Max | "Que nível de produto eu quero?" |
| **Periodicidade** | Mensal / anual | "Com que frequência eu pago?" |
| **Oferta/desconto** | 20% anual, teste grátis | "Que condição comercial eu tenho?" |
| **Método de pagamento** | Play, Google Pay, cartão | "Como eu pago?" |

Card que mistura tudo (`"PRO ANUAL 30% OFF CARTÃO"`) aumenta o número de conceitos que o usuário compara de uma vez — o oposto de Hick-Hyman (skill 02). Decisão progressiva: periodicidade → plano → oferta/cupão → pagamento, cada uma numa etapa visual clara.

No Google Play, essa separação tem correspondência técnica direta: uma subscrição pode ter múltiplos **base plans** (ex: mensal, anual) e múltiplas **offers** associadas a cada um — detalhe completo em `docs/skill-guides/mobile-paywall-checkout/01-billing-decision.md`.

## Decisão de Arquitetura de Cobrança — Antes de Desenhar Qualquer Tela

Esta decisão não é visual — precisa ser resolvida antes do wireframe, porque muda o fluxo inteiro (paywall próprio + `purchase sheet` do Play vs. dois telas customizadas com PSP).

| Cenário | Solução | Implicação de UI |
| --- | --- | --- |
| Funcionalidade/conteúdo digital consumido dentro do app distribuído pela Play Store | **Google Play Billing** (salvo programa/exceção aplicável ao mercado) | Paywall próprio → `purchase sheet` do Google Play cuida da transação |
| Bem ou serviço físico | Não usar Play Billing | Google Pay/PSP externo é permitido |
| Checkout com Stripe permitido | Stripe Android SDK / `PaymentSheet` | Payment sheet nativo, ou `PaymentSheet` só para coletar método + fluxo próprio |
| Checkout com Mercado Pago permitido | Solução mobile nativa suportada | **Nunca** assumir que Checkout Bricks Web funciona em WebView Android — não é suportado |

Detalhe completo (matriz por mercado, promo code Play vs. cupom de comerciante, tokenização/PCI, idempotência) em `docs/skill-guides/mobile-paywall-checkout/01-billing-decision.md`.

Regra dura: um app que vende funcionalidade digital dentro do APK publicado na Play Store e desenha `[ Pagar com Stripe ]` sem checar elegibilidade não é uma decisão de design — é risco de política de plataforma. Esta decisão vai para Product/Payments antes do handoff para Frontend.

## Fluxo de Referência

```
escolher periodicidade → escolher plano → rever preço/desconto →
  → (opcional) aplicar cupão → pagar → autenticar se necessário → confirmar
```

Periodicidade aparece **antes** dos cards porque reinterpreta o preço de todos eles. Ao trocar mensal↔anual, o tier selecionado é **preservado** — a pergunta "que produto eu quero" não mudou, só a frequência de cobrança mudou. Perder a seleção nessa troca é bug de UX, não comportamento neutro.

Preço anual: o **total anual tem que ser pelo menos tão proeminente quanto o equivalente mensal**. `"4,99€/mês"` gigante com o total anual escondido numa nota é o antipadrão mais citado nas políticas de subscrição Google — ver dark patterns na skill 02. Formato correto: `"59,99€/ano · equivale a 5,00€/mês · Renovação anual até cancelamento."`.

Wireframes completos por estado (inicial, selecionado, cupão aberto/aplicado/erro, processing, 3DS, pendente, sucesso) em `docs/skill-guides/mobile-paywall-checkout/02-plan-selection-ui.md`.

## Cupão — Collapsed, Não Aberto Por Padrão

A recomendação mais forte deste domínio: campo de cupão **recolhido atrás de um link** (`"🏷 Tem um cupão?"`), nunca um input `[____] [Aplicar]` permanentemente visível.

Um campo de cupão sempre visível sinaliza ao usuário que existe um preço melhor em algum lugar, e usuários sem código saem do checkout pra procurar um — é o achado central da pesquisa de checkout da Baymard sobre esse padrão. Auto-aplicar desconto elegível (via deep link, campanha reconhecida) é preferível a pedir digitação manual sempre que tecnicamente possível.

Posição: depois do resumo de preço, antes do total — nunca antes da escolha do plano (introduz "caça a desconto" antes do usuário saber o que quer comprar).

**Código Google Play ≠ cupão de comerciante.** Promo codes do Play concedem teste grátis de subscrição, não um motor genérico de "25% off". Nunca prometer na UI um desconto que o sistema de billing autorizado não vai efetivamente cobrar — mostrar `"25% aplicado"` e o `purchase sheet` exibir o preço cheio é quebra de confiança e viola a exigência de consistência das políticas Play.

Comparação completa das 4 alternativas de posicionamento (collapsed / aberto / modal / auto-aplicação) com evidência e risco de cada uma em `docs/skill-guides/mobile-paywall-checkout/03-coupon-ux.md`.

## Hierarquia do Plano-Alvo — Sem Manipulação

O plano que o negócio quer vender pode receber destaque através de sinais cumulativos, nunca manipulativos: badge (`"Recomendado"`, só se for recomendação real), borda/superfície de maior peso, benefícios diferenciadores mais visíveis. Pré-seleção é hipótese de produto a testar, não recurso pra esconder a escolha — os demais planos continuam legíveis, nunca reduzidos a texto cinza minúsculo.

Badge tem semântica que não pode ser inventada: `"Mais Popular"` exige dado real de escolha por outros usuários; `"Recomendado para Você"` exige sinal individual justificável; `"Recomendado"` sozinho é recomendação editorial do produto. Usar qualquer um sem lastro é o mesmo tipo de fabricação que `skills/02-ui-ux-design/references/audit-framework.md` já proíbe na auditoria — aqui, na criação.

## Estados de Pagamento

Máquina de estados mínima: `Ready → Submitting → Authenticating (3DS) → Pending → Succeeded | Failed → Reconciling`.

Regra fundamental: **"o usuário voltou da autenticação 3DS" não é sinônimo de "pagamento aprovado" nem de "recusado"**. Depois do retorno (deep link, callback do SDK), a tela mostra `"A confirmar pagamento…"` e consulta o estado autoritativo antes de declarar sucesso ou falha — nunca assume pelo simples fato de ter retornado.

Erro de pagamento nunca obriga o usuário a repetir trabalho que já foi validado (plano, cupão) — preservar tudo, mostrar mensagem específica e acionável, oferecer retry ou troca de método. Anti-duplo-submit é obrigatório: `PaymentIntent` do Stripe leva idempotency key associada à mesma sessão/compra pra impedir cobrança duplicada em retry técnico.

Estados completos, microcopy por caso, e taxonomia de erro (`issuer_declined`, `authentication_failed`, `network_error`, etc., nunca só `payment_failed` genérico) em `docs/skill-guides/mobile-paywall-checkout/04-payment-states.md`.

## Acessibilidade e Componentes

Touch target mínimo **48×48dp** em toda área interativa crítica (radio de plano, remover cupão, segmento de periodicidade, CTA) — mesmo quando o glyph visual é menor. Seleção de plano nunca depende só de cor: borda/superfície + radio selecionado + `semantics selected=true` juntos. Ordem de leitura para leitor de tela segue a lógica visual (título → periodicidade → planos → cupão → resumo → termos → CTA), nunca deixando a barra sticky de CTA ser lida fora de ordem.

Especificação completa de semantics/TalkBack, autofill, tipo de teclado por campo, e validação (nunca prematura — validar no blur/submit, não no primeiro caractere) em `docs/skill-guides/mobile-paywall-checkout/05-accessibility-components.md`.

## Experimentação e Métricas

O objetivo do A/B testing aqui não é maximizar clique — é aumentar aquisição correta e sustentável sem gerar arrependimento, cancelamento ou chamado de suporte depois. Todo teste de pré-seleção, badge ou ordem de plano precisa de guardrail de troca de plano/refund/cancelamento, não só a métrica de conversão isolada.

Funil mínimo: `Paywall view → Plan selected → Checkout CTA → Payment UI opened → Auth se necessária → Payment confirmed`. Dicionário de eventos, definição de cada métrica de funil, e o teste prioritário (cupão collapsed vs. aberto) em `docs/skill-guides/mobile-paywall-checkout/06-experimentation-metrics.md`.

## QA e Implementação

Matriz de QA (troca de periodicidade preserva tier, duplo tap gera 1 compra só, process death reconcilia ao voltar, 3DS cancelado preserva dados, TalkBack, escala de fonte grande, teclado aberto não esconde CTA) e uma timeline de referência de 6 semanas em `docs/skill-guides/mobile-paywall-checkout/07-qa-and-timeline.md`.

## Evidência de Conclusão

- decisão de billing (Play Billing vs. PSP) documentada e aprovada por Product/Payments antes do handoff de UI
- as 4 entidades (tier, periodicidade, oferta, pagamento) aparecem como decisões visuais separadas, nunca fundidas num único card
- campo de cupão é collapsed por padrão, com posição definida (após resumo, antes do total)
- todo estado de pagamento (processing, 3DS, pending, erro, sucesso) tem tela/microcopy própria — nenhum "pagamento concluído" otimista antes de confirmação autoritativa
- plano-alvo tem hierarquia declarada com sinais reais (badge com lastro, não fabricado)
- touch target ≥48×48dp verificado nos componentes de pagamento
- funil de eventos instrumentado com o dicionário de `06-experimentation-metrics.md`

## Handoff

- **App Reference Architecture (60):** schema de dados, webhook, reconciliação, multi-provider registry — esta skill consome, não duplica
- **UI/UX Design (02):** leis cognitivas, dark patterns, tokens — aplicados aqui ao domínio específico
- **Security Review (06):** fronteira PCI (PAN/CVV) antes de qualquer implementação de coleta de cartão própria
- **QA Engineer (05):** matriz de QA de `07-qa-and-timeline.md` vira suíte de teste
- **Data Analytics (21):** dicionário de eventos do funil de pagamento

## Integração com Pipeline

- **Orchestrator (09):** aciona esta skill quando a tarefa é paywall/checkout de app mobile, distinta de arquitetura de app nova (60) ou página de preço pública (02)
- **Documenter (10):** registra a decisão de billing (Play Billing vs. PSP) como ADR — não é reversível sem custo depois do lançamento

## Fontes

- Design doc próprio do usuário sobre seleção de planos e checkout de pagamento em Android (estado das fontes: 15 de agosto de 2026), cobrindo Google Play Billing, Google Pay, Stripe e Mercado Pago — curado e modularizado em `docs/skill-guides/mobile-paywall-checkout/`, mantendo os wireframes, a matriz de decisão e o plano de experimentação do documento original.
