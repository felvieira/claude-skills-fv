# Matriz de QA e Timeline de Implementação

## Matriz de QA

| Caso | Resultado esperado |
| --- | --- |
| Sem plano selecionado | CTA inativo ou solicita seleção |
| Alterar Mensal → Anual | Mesmo tier preservado; preço/termos atualizados |
| Cupão válido | Total atualizado, confirmação visível |
| Cupão inválido | Erro inline; seleção preservada |
| Cupão expira entretanto | Revalidação antes da cobrança |
| Duplo tap no CTA | Uma compra apenas (idempotency key, ver `04-payment-states.md`) |
| Rodar/recriar Activity | Estado coerente preservado |
| Process death | Compra reconciliada ao retornar |
| Perder rede antes de cobrar | Retry seguro |
| Perder rede após autorização | Reconciliar; não iniciar nova cobrança imediatamente |
| 3DS sucesso | Consulta o estado e conclui |
| 3DS cancelado | Volta ao checkout com dados preservados |
| 3DS pendente | Estado pendente, sem duplo pagamento |
| Play Billing desconectado | Reconectar/retry apropriado |
| Purchase Play fora da app | Entitlement recuperado |
| TalkBack | Ordem e labels coerentes |
| Font scale grande | Conteúdo/CTA não cortados |
| Teclado aberto | Coupon input e CTA relevantes não ficam ocultos |
| Gestural/3-button nav | Sticky bar respeita inset |
| Currency/localização longa | Layout não quebra |
| Stripe/PSP decline | Explicação acionável |
| Mercado Pago WebView Brick | Não usar como arquitetura — não suportado |

O Play disponibiliza license testers e ferramentas próprias pra testar Billing; compras de teste devem também validar o `acknowledgement` corretamente (ver `01-billing-decision.md`).

## Timeline de referência (exemplo — não é estimativa universal)

Baseline para equipe que já tem backend/infraestrutura de produto: **seis semanas**, ajustável à complexidade do billing. Exemplo a partir da semana de 17 de agosto de 2026.

| Semana | Produto/Compliance | UX/Conteúdo | Engenharia | Integração | Qualidade | Rollout |
| --- | --- | --- | --- | --- | --- | --- |
| 23/08 | Matriz Play/PSP por mercado | Catálogo e regras de ofertas | User flows e wireframes | — | — | — |
| 30/08 | — | Componentes Figma | Microcopy e acessibilidade | — | — | — |
| 06/09 | — | — | Android paywall/components | Backend billing/cupões | — | — |
| 13/09 | — | — | — | Analytics | Play Billing / PSP / 3DS | — |
| 20/09 | — | — | — | Lifecycle e reconciliação | QA funcional, acessibilidade, billing sandbox/testers | Release controlada, experiência A/B inicial |

## Entregáveis por área

| Área | Entregável |
| --- | --- |
| Produto | Matriz de billing por mercado/categoria |
| UX | User-flow principal e estados alternativos |
| Figma | PlanCard, BillingPeriodSelector, CouponField, PriceSummary, StickyCheckoutBar, error/success states |
| Design system | Tokens, variantes e states dos componentes |
| Content design | Catálogo de microcopy e regras de localização |
| Android | Specs de Compose/View, semantics, insets, teclado e lifecycle |
| Backend | Contrato de catálogo, cupões, price validation, payment state e entitlement (ver skill 60) |
| Payments | Mapeamento Play product/basePlan/offer ou PSP equivalents |
| Analytics | Dicionário de eventos e propriedades permitidas |
| QA | Matriz de teste de compra, retry, 3DS, process death e acessibilidade |
| Experiments | Plano A/B, hipóteses, métricas e guardrails |
| Operações | Dashboard de pagamentos, falhas, refunds e anomalias |

## Estrutura de biblioteca Figma sugerida

```
Payments/
├── BillingPeriodSelector
│   ├── Monthly
│   └── Annual
├── PlanCard
│   ├── Default
│   ├── Recommended
│   ├── Selected
│   ├── Recommended+Selected
│   └── Disabled
├── Badge
│   ├── Recommended
│   ├── Popular
│   └── Savings
├── Coupon
│   ├── Collapsed
│   ├── Expanded
│   ├── Loading
│   ├── Error
│   └── Applied
├── PriceSummary
│   ├── Regular
│   ├── Discounted
│   └── Trial
├── CheckoutCTA
│   ├── Disabled
│   ├── Enabled
│   └── Processing
└── PaymentStatus
    ├── Processing
    ├── Authenticating
    ├── Pending
    ├── Failed
    └── Succeeded
```
