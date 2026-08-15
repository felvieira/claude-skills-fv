# Decisão de Arquitetura de Cobrança

Esta decisão acontece **antes** do desenho de qualquer tela — muda o fluxo inteiro, não só a cor do botão.

## Matriz de decisão

| Cenário | Solução de referência | Implicação para a UI |
| --- | --- | --- |
| Funcionalidade digital consumida dentro da app distribuída pela Play | Google Play Billing, salvo programa/exceção aplicável | Paywall próprio → `purchase sheet` Google Play |
| Subscrição digital da app | Play Billing, quando a política exigir | Planos/ofertas correspondem aos produtos do Play |
| Produto/serviço físico | Não usar Play Billing | Google Pay/PSP pode ser usado |
| App/região elegível para faturação alternativa | Programa específico + APIs/requisitos Google | Fluxo depende do regime e mercado |
| Checkout permitido via Stripe | Stripe Android SDK / `PaymentSheet` | Payment sheet nativo ou fluxo controlado |
| Checkout permitido via Mercado Pago | Solução mobile nativa suportada | Evitar assumir que Checkout Bricks Web funciona em WebView |

As políticas de pagamento do Google Play exigem, de forma geral, Play Billing para funcionalidade/conteúdo/serviço digital dentro de apps Play; bens e serviços físicos ficam fora do sistema de faturação do Play. Há exceções e programas específicos por mercado/fluxo elegível — não codificar como regra fixa "Android = Stripe" ou "Android = sempre Play Billing" sem checar a matriz vigente por mercado.

Um paywall que mostra `[ Pagar com Stripe ]` para vender funcionalidade digital dentro de um APK publicado na Play não é decisão puramente visual — é risco de violação de política de plataforma.

## Mensal e anual no modelo do Google Play

Uma subscrição pode ter múltiplos **base plans** (ex: mensal, anual), cada um com múltiplas **offers**:

```
SUBSCRIPTION: Pro
├── Base plan: monthly
│   └── Oferta: trial / intro
└── Base plan: annual
    └── Oferta: campanha anual
```

Isso dá suporte técnico direto à separação conceitual de tier/periodicidade/oferta que o SKILL.md principal descreve — a UI não precisa (e não deve) inventar essa separação, ela já existe no modelo de dados do Play.

## Como apresentar o preço anual

Antipadrão a evitar — proeminência invertida:

```
ANUAL · 30% OFF
4,99 €/mês      ← gigante
cobrado anualmente
com o total anual perdido numa nota quase invisível
```

Para subscrições, as políticas Google exigem comunicação clara do custo, frequência de faturação e renovação. Os próprios exemplos de política criticam apresentações onde a subscrição anual dá mais proeminência ao equivalente mensal do que ao custo anual efetivamente cobrado.

Formato correto:

```
ANUAL · Poupa 23%
59,99 €/ano
equivale a 5,00 €/mês
Renovação anual até cancelamento.
```

O total anual deve ser pelo menos tão evidente visualmente quanto o equivalente mensal.

## Código Google Play vs. cupom de comerciante

Três coisas diferentes, frequentemente confundidas:

| Conceito | Exemplo | Mecanismo |
| --- | --- | --- |
| Oferta Play | "Primeiro mês pela metade" | Oferta/base plan configurado no Play |
| Promo code Play | `PROMO2026` | Sistema de códigos Google Play |
| Cupão do comerciante | `FEL25` → 25% | Backend/PSP próprio, quando permitido |

Para subscrições, promo codes do Play concedem **teste grátis**, não subscrição grátis nem motor genérico de "25% off este mês". Resgate pode ocorrer na app ou na Play Store dependendo do tipo de código; após o teste promocional, a renovação segue os termos aplicáveis.

**Regra dura**: um campo de cupão só deve existir no paywall se houver correspondência real entre o código e o preço/oferta que o sistema de billing autorizado consegue efetivamente cobrar. Nunca mostrar `"✓ 25% aplicado — Total 9,74€"` na UI para depois o `purchase sheet` do Play mostrar `12,99€`. Além de quebrar confiança, viola a exigência de consistência de preço das políticas Play.

## Tokenização, PAN, CVV e PCI

Fronteira de segurança recomendada:

```
┌──────────── App ─────────────┐
│ UI da aplicação              │
│  ┌──── PSP / wallet ───────┐ │
│  │ PAN / validade / CVV     │ │
│  └──────────┬───────────────┘ │
└─────────────┼─────────────────┘
              │ token / payment method ID
              ▼
           backend
```

Preferível a construir pipeline próprio onde números de cartão atravessam views, logs, analytics e backend sem necessidade. SDKs de PSP (ex: componentes Android da Stripe) existem justamente para encapsular essa parte.

Regra PCI absoluta: **CVV/CVC não pode ser armazenado após autorização**, mesmo com consentimento do cliente.

```
NUNCA:
analytics.track("payment", cvv)
log("card=" + pan)
SharedPreferences.putString("cvv", ...)
Room.save(cardSecurityCode)

PREFERIR:
paymentMethodId
paymentIntentId
purchaseToken
orderId
subscriptionId
```

Ver `skills/06-security-review/SKILL.md` para a auditoria completa dessa fronteira.

## Google Play: backend e confirmação

Entitlement não deve depender só do estado visual do cliente. Real-time Developer Notifications informam que houve mudança de estado, mas o backend precisa consultar a Google Play Developer API para o estado completo — isso é responsabilidade da skill 60, não desta.

Compras precisam ser **reconhecidas (acknowledged)** dentro da janela definida pelo Play; sem isso, podem ser reembolsadas e revogadas automaticamente. Ver `docs/skill-guides/app-reference-architecture/04-pagamentos.md`.

## Stripe — arquitetura de referência

```
Android
  ├─ escolha do plano
  ├─ cupão
  ├─ resumo
  └─ PaymentSheet
        │
        ▼
    PaymentIntent
        │
        ▼
     Backend
```

`PaymentSheet` é a solução pré-construída recomendada para muitos fluxos Android; também pode ser usado só para coletar o método de pagamento, com o fluxo de compra concluído por uma UI própria (útil com botão de compra customizado ou passos adicionais).

O `PaymentIntent` precisa de uma **idempotency key** associada à mesma compra/sessão para impedir que retries técnicos gerem cobranças duplicadas.

## Mercado Pago — restrição concreta

Mercado Pago tem Mobile Checkout próprio para Android/iOS. **Checkout Bricks não tem suporte oficial em fluxo WebView Android/iOS** — "abrir um Brick Web dentro de uma WebView" não deve ser o default arquitetural de um app nativo.
