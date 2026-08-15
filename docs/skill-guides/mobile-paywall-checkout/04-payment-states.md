# Estados de Pagamento, 3DS e Recuperação de Erro

## Máquina de estados

```
Ready → Submitting → Authenticating (3DS) → Pending → Succeeded | Failed → Reconciling
```

Regra fundamental: **"o usuário voltou do 3DS" não é sinônimo de "pagamento aprovado" nem de "pagamento recusado"**. PSPs como Stripe modelam pagamento como objeto com ciclo de vida próprio e possíveis `next_actions`/autenticação adicional — o tap no botão nunca é a confirmação final por si só.

Fluxo de retorno:

```
onResume / deep link / SDK callback
            ↓
mostrar "A confirmar pagamento..."
            ↓
consultar estado autoritativo
            ↓
succeeded / pending / failed
```

## Estado em processamento

```
┌───────────────────────────────────┐
│               ◌                   │
│      A processar pagamento…       │
│ Não feche a aplicação enquanto    │
│ confirmamos o pagamento.          │
│                                   │
│ [          A processar…        ]  │
│              disabled             │
└───────────────────────────────────┘
```

Nunca mostrar `"Pagamento concluído!"` antes de receber confirmação autoritativa — mesmo que pareça "quase certo" que vai dar certo.

## Estado de retorno do 3DS

```
┌───────────────────────────────────┐
│               ◌                   │
│     A confirmar pagamento…        │
│ A autenticação terminou. Estamos  │
│ a confirmar o resultado junto do  │
│ prestador de pagamento.           │
└───────────────────────────────────┘
```

Se ficar pendente:

```
Pagamento pendente
Ainda não recebemos a confirmação.
Não volte a pagar.
Avisaremos assim que o estado for atualizado.
[ Voltar à aplicação ]
```

`"Não volte a pagar"` é instrução explícita — evita que o usuário, ansioso com a demora, tente pagar de novo e crie uma cobrança duplicada.

## Estado de erro de pagamento

```
┌───────────────────────────────────┐
│ Não foi possível concluir         │
│ o pagamento                       │
│                                   │
│ O banco recusou este pagamento.   │
│ Experimente outro cartão ou       │
│ outro método de pagamento.        │
│                                   │
│ O seu plano e cupão foram         │
│ mantidos.                         │
│                                   │
│ [ Tentar novamente ]              │
│ Alterar método de pagamento       │
└───────────────────────────────────┘
```

Regra de ouro: **um erro de pagamento nunca obriga o usuário a repetir trabalho já validado e seguro de preservar** (seleção de plano, cupão aplicado).

## Estado de sucesso

```
┌───────────────────────────────────┐
│                ✓                  │
│       Pagamento confirmado        │
│ Plano Pro                         │
│ 9,74 €                            │
│ O seu plano já está ativo.        │
│ [ Começar a usar o Pro ]          │
│ Gerir subscrição                  │
└───────────────────────────────────┘
```

Para Google Play, a subscrição precisa de caminho adequado pra gestão/cancelamento conforme os requisitos da plataforma (ver `docs/skill-guides/app-reference-architecture/04-pagamentos.md`).

## Anti-duplo-submit

Durante submissão, novos toques não podem gerar outra cobrança. Para Stripe, o guia de `PaymentIntent` recomenda **idempotency key** associada à mesma compra/sessão especificamente pra impedir `PaymentIntent`s duplicados na mesma compra.

## Taxonomia de erro

Não medir/tratar só `payment_failed` genérico. Separar por categoria:

```
user_cancelled
issuer_declined
insufficient_funds
authentication_failed
network_error
provider_unavailable
billing_service_disconnected
invalid_coupon
expired_coupon
ineligible_coupon
unknown
```

O Google Play fornece códigos e orientação específicos para erros do `BillingClient`, incluindo problemas transitórios e reconexão de serviço — vale preservar a categoria técnica internamente sem expor mensagem crua ao usuário (a UI mostra a mensagem específica e acionável do estado; o log/analytics guarda a categoria técnica).

## Recuperação de lifecycle (Android)

Casos que a implementação precisa cobrir (ver matriz de QA completa em `07-qa-and-timeline.md`):

- rotação/recriação de Activity durante o fluxo de pagamento → estado coerente preservado
- process death → compra reconciliada ao retornar ao app
- perda de rede antes de cobrar → retry seguro
- perda de rede depois da autorização → reconciliar; **não** iniciar nova cobrança imediatamente
- 3DS cancelado pelo usuário → volta ao checkout com plano e cupão preservados
- Play Billing service desconectado → reconectar/retry apropriado
- compra feita fora do app (ex: direto na Play Store) → entitlement ainda é recuperado corretamente
