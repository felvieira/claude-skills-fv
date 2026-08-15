# Mobile Paywall & Checkout — Guia Detalhado

Índice dos 7 arquivos deste guia. Carregar só o(s) aplicável(is) à tarefa — ver `skills/63-mobile-paywall-checkout/SKILL.md` para o essencial sempre-carregado.

| Arquivo | Quando abrir |
| --- | --- |
| `01-billing-decision.md` | decidir Play Billing vs. PSP externo; código Play vs. cupom de comerciante; tokenização/PCI; Stripe/Mercado Pago específico |
| `02-plan-selection-ui.md` | desenhar a tela de seleção de plano; wireframes por estado; componentes PlanCard/BillingPeriodSelector; badges e pré-seleção |
| `03-coupon-ux.md` | posicionar e desenhar o campo de cupão; comparação collapsed vs. aberto vs. modal vs. auto-aplicação |
| `04-payment-states.md` | especificar estados de pagamento, 3DS, taxonomia de erro, microcopy de processing/pending/falha |
| `05-accessibility-components.md` | touch target, semantics/TalkBack, autofill, teclado, validação de formulário |
| `06-experimentation-metrics.md` | plano de A/B testing, funil de métricas, dicionário de eventos de analytics |
| `07-qa-and-timeline.md` | matriz de QA, timeline de implementação de referência |

## Escopo, fontes e limites

Documento fonte: design doc próprio do usuário sobre "seleção de planos e checkout de pagamento em Android" (estado das fontes: 15 de agosto de 2026). Escopo: apps Android com planos pagos, subscrições e/ou checkout de pagamento — Google Play Billing, Google Pay, Stripe, Mercado Pago.

Decisão central herdada do documento original: a interface ajuda o usuário a escolher um plano antes de pedir que resolva o pagamento. O plano-alvo pode ter mais hierarquia visual; preço, periodicidade, renovação e alternativas nunca são ocultados ou apresentados de forma enganadora.

**Limite de validade**: regras de plataforma (Google Play policy, Stripe SDK, Mercado Pago Bricks) mudam. As referências aqui carregam a data de estado das fontes do documento original — antes de uma decisão de arquitetura de billing (não de UI), confirmar a documentação oficial vigente, não confiar cegamente na data deste guia.

**O que não é regra universal**: valores de exemplo (7,99€, 12,99€, 23% de desconto), a timeline de 6 semanas, e os resultados hipotéticos de A/B testing são ilustrativos do documento original, não benchmarks a copiar. Cada produto precisa validar com seus próprios números.
