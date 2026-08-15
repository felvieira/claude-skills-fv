# Experimentação, Funil e Analytics

O objetivo do A/B testing não é "otimizar clique" — é aumentar aquisição correta e sustentável, sem gerar arrependimento, cancelamento ou chamado de suporte depois.

## Plano de testes A/B

| Experiência | A | B | Métrica principal | Guardrails |
| --- | --- | --- | --- | --- |
| Pré-seleção | Nada selecionado | Pro selecionado | Purchase conversion | mudança de plano, refund, cancelamento |
| Badge | "Recomendado" | Sem badge | Pro selection rate | conversão total |
| Ordem | Essencial→Pro→Max | Pro→Essencial→Max | Pro conversion | conversão global |
| Periodicidade default | Mensal | Anual | paid conversion / annual mix | refunds/cancelamentos |
| Poupança anual | "Poupa 23%" | "Poupa 35,89€/ano" | annual selection | compreensão em teste qualitativo |
| Cupão | Campo recolhido | Campo aberto | checkout conversion | uso de cupão / abandono |
| Posição do cupão | Acima do total | Depois do método de pagamento | checkout conversion | tempo para pagar |
| CTA copy | "Continuar com Pro" | "Assinar Pro · 12,99€/mês" | CTA→success | cancelamento |
| Wallet | Ordem normal | Google Pay primeiro | payment completion | falhas por método |
| Target card | Borda+badge | Borda+badge+pré-seleção | target paid rate | conversão geral |

Não testar tudo simultaneamente — cada experiência isola a alteração principal, ou usa desenho experimental que suporte interação consciente entre variáveis.

## O teste de cupão mais importante

```
A — collapsed
Tem um cupão?

B — open
Código do cupão
[____________][Aplicar]
```

Hipótese: o campo recolhido mantém descoberta suficiente pra usuário com código, reduzindo distração e busca externa de quem não tem. Baseada nos achados qualitativos da Baymard sobre "coupon hunting" — o tamanho do efeito específico neste app precisa ser medido; não existe percentual universal transferível de e-commerce web pra app Android.

Segunda experiência útil:

```
A: "Tem um cupão?" antes do total
B: "Tem um cupão?" depois da escolha do método de pagamento
```

## Funil mínimo

```
Paywall view
   ↓
Plan selected
   ↓
Checkout CTA
   ↓
Payment UI opened
   ↓
Auth, se necessária
   ↓
Payment confirmed
```

## Definições de métrica

| Métrica | Definição |
| --- | --- |
| Plan selection rate | sessões com plano selecionado ÷ paywall views elegíveis |
| Target-plan share | compras do plano-alvo ÷ compras totais |
| Checkout-start rate | taps válidos no CTA ÷ paywall views |
| Payment-start rate | payment sheets realmente abertos ÷ CTA taps |
| Payment conversion | pagamentos confirmados ÷ payment starts |
| Paywall conversion | pagamentos confirmados ÷ paywall views elegíveis |
| Abandono do checkout | sessões iniciadas sem compra confirmada dentro da janela definida |
| Time to select | tempo paywall → primeira seleção |
| Time to pay | tempo paywall/payment start → sucesso |
| P50/P90 time-to-pay | mediana e cauda — não só a média |
| Coupon reveal rate | `coupon_opened` ÷ checkout views |
| Coupon submit rate | `coupon_submitted` ÷ coupon opened |
| Coupon success rate | códigos aplicados ÷ códigos submetidos |
| 3DS challenge rate | desafios iniciados ÷ pagamentos elegíveis |
| 3DS completion rate | retornos autenticados ÷ desafios iniciados |
| Payment recovery rate | sucessos após primeira falha ÷ primeiras falhas |
| Annual mix | subscrições anuais ÷ novas subscrições |
| Refund/cancel guardrail | refunds/cancelamentos dentro da janela definida |

A Nielsen Norman Group recomenda success rate como métrica fundamental de usabilidade — pra checkout, complementar com etapas intermediárias pra localizar exatamente onde o problema acontece.

## Dicionário de eventos

```
paywall_view
billing_period_changed
plan_selected
plan_deselected
coupon_opened
coupon_submitted
coupon_applied
coupon_rejected
coupon_removed
checkout_cta_tapped
payment_sheet_opened
payment_method_selected
payment_submit
payment_auth_started
payment_auth_returned
payment_pending
payment_failed
payment_cancelled
payment_succeeded
checkout_resumed
subscription_entitlement_granted
```

Contexto permitido:

```
plan_id
base_plan_id
billing_period
offer_id
coupon_campaign_id
currency
displayed_amount
payment_provider
payment_method_type
error_category
experiment_variant
session_id
```

Nunca incluir: PAN, CVV, senha bancária, challenge response, ou qualquer dado sensível de autenticação (ver fronteira PCI em `01-billing-decision.md`).

## Testes qualitativos antes do A/B

Antes de procurar diferenças estatísticas pequenas em produção, rodar testes de tarefa:

```
"Tenciona comprar o Pro por um mês."
"Agora encontre o preço anual."
"Tem este código promocional. Aplique-o."
"Explique quanto será cobrado hoje."
"Explique quando voltará a ser cobrado."
"O pagamento foi recusado. O que faria agora?"
```

Critérios de sucesso:

```
✓ identifica o tier correto
✓ entende mensal/anual
✓ encontra o cupão sem ajuda
✓ sabe o total cobrado
✓ entende a renovação
✓ recupera de erro
✓ não tenta pagar duas vezes em estado pendente
```

Analytics identifica onde ocorre abandono; investigação qualitativa é necessária pra entender por quê.
