# Pagamentos: Stripe + Google Play IAP + Pix

## Por que multi-provider é necessário

Um app que vende assinatura/conteúdo digital em web e Android precisa de no mínimo dois
providers, não por preferência de arquitetura, mas por exigência externa:

- **Stripe** (ou equivalente) para cartão internacional na web.
- **Google Play Billing** é **obrigatório** pela política da Play Store sempre que o app vende
  conteúdo ou assinatura digital dentro de um APK distribuído pela Play Store. Cobrar via Stripe
  direto dentro do app Android (fora do IAP nativo) viola a política de billing do Google e
  arrisca rejeição ou banimento da conta de desenvolvedor. Isso não é opcional nem uma escolha
  técnica — é regra da plataforma.
- **Pix** opcionalmente, para mercado BR — reduz fricção e taxa em relação a cartão via Stripe
  para uma fatia grande dos usuários brasileiros.

Os 3 apps convergem nesse tripé (gastos-app e memrapp têm os três; VisaLab tem Stripe + Mercado
Pago + Abacate Pay via registry, mais Google Play).

## Modelo de dados unificado

Uma única tabela `Subscription`/`subscriptions`, nunca uma tabela por provider. O campo
`platform` diferencia a origem; toda a lógica de "o usuário é pagante?" lê a mesma tabela
independente de por onde ele pagou.

```prisma
// prisma/schema.prisma
model Subscription {
  id        String   @id @default(cuid())
  userId    String   @unique

  planType  String   // free | premium | admin_granted
  platform  String?  // stripe | google_play | apple
  status    String   // active | trialing | grace_period | canceled | past_due
                      // | account_hold | inactive
  billingCycle String? // monthly | annual

  stripeCustomerId     String?
  stripeSubscriptionId String?
  stripePriceId        String?

  googlePlayProductId     String?
  googlePlayPurchaseToken String?

  trialStartedAt      DateTime?
  trialEndsAt          DateTime?
  retentionOfferUsedAt DateTime?  // downsell usado — uma vez na vida do usuário

  cancelAtPeriodEnd Boolean @default(false)

  createdAt DateTime @updatedAt
  updatedAt DateTime @updatedAt
}
```

`status` cobre estados que uma coluna booleana `isPremium` jamais representaria corretamente:
`trialing` (em trial, ainda não cobrou), `grace_period` (cobrança falhou, mas ainda em janela de
retry), `account_hold` (Google Play: pagamento suspenso, período de retenção de dados antes do
cancelamento definitivo), `past_due` (Stripe: falha de cobrança fora do grace period automático).

## `grace_period`: por que existe

Quando uma cobrança recorrente falha (cartão recusado, saldo insuficiente), tanto Stripe quanto
Google Play **não cancelam a assinatura imediatamente** — eles tentam cobrar de novo
automaticamente por alguns dias (retry schedule configurável no Stripe; comportamento nativo do
Play Billing). Durante essa janela, o status vira `grace_period` (Stripe) ou é sinalizado via
RTDN (Google Play).

A regra de negócio correta é: **`grace_period` ainda conta como acesso ativo** para fins de
feature-gating. Cancelar o acesso do usuário na primeira falha de cobrança é agressivo demais —
cartões expiram, bancos bloqueiam por segurança, e na prática grande parte dessas falhas se
resolve sozinha no retry automático. Cortar o acesso de cara gera cancelamento por atrito que
não precisava acontecer.

```ts
const ACCESS_GRANTING_STATUSES = ['active', 'trialing', 'grace_period']

function hasActiveAccess(subscription: Subscription): boolean {
  return ACCESS_GRANTING_STATUSES.includes(subscription.status)
}
```

O webhook de `invoice.payment_failed` do Stripe muda o status para `grace_period` e dispara aviso
(email + push) pedindo para o usuário atualizar o cartão — não revoga acesso.

## Webhooks: idempotência

Stripe (e providers em geral) **pode reenviar o mesmo evento de webhook múltiplas vezes** —
timeout de rede, retry automático do lado do provider, redeploy que reprocessa fila. Sem
proteção, isso duplica efeitos colaterais (enviar email de boas-vindas duas vezes, creditar saldo
duas vezes).

Padrão: tabela de eventos processados com `unique` no ID do evento do provider. **Checa
duplicata antes de processar, grava DEPOIS de processar com sucesso** — nunca marcar como
processado antes de terminar, senão uma falha no meio do processamento perde o evento para
sempre.

```prisma
model StripeWebhookEvent {
  id          String   @id @default(cuid())
  eventId     String   @unique // evt_xxx do Stripe
  eventType   String
  processedAt DateTime @default(now())
}
```

```ts
// app/api/stripe/webhook/route.ts
export async function POST(req: Request) {
  const event = stripe.webhooks.constructEvent(await req.text(), sig, webhookSecret)

  const alreadyProcessed = await prisma.stripeWebhookEvent.findUnique({
    where: { eventId: event.id },
  })
  if (alreadyProcessed) {
    return new Response('ok', { status: 200 }) // ack sem reprocessar
  }

  await handleStripeEvent(event) // toda a lógica de negócio acontece aqui

  await prisma.stripeWebhookEvent.create({
    data: { eventId: event.id, eventType: event.type },
  })

  return new Response('ok', { status: 200 })
}
```

Se `handleStripeEvent` lançar exceção, o registro de "processado" nunca é criado — o Stripe vai
reenviar o evento no próximo retry e ele será processado de novo do zero, sem stub inconsistente
no meio do caminho.

## Função central de resolução de plano

Nunca confiar num campo booleano solto (`isPremium`) que pode dessincronizar do estado real da
assinatura. Uma única função lê `status` + datas e decide o plano — toda checagem de
feature-gating no app chama essa função, nunca acessa `subscription.status` diretamente.

```ts
// lib/plan.ts
export function resolvePlanType(sub: Subscription | null, now = new Date()): 'free' | 'premium' | 'admin_granted' {
  if (!sub) return 'free'

  if (sub.planType === 'admin_granted' && (!sub.trialEndsAt || sub.trialEndsAt > now)) {
    return 'admin_granted'
  }

  if (sub.status === 'active' || sub.status === 'grace_period') {
    return 'premium' // grace_period mantém acesso durante o retry de cobrança
  }

  if (sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt > now) {
    return 'premium'
  }

  return 'free'
}
```

Essa centralização é o ponto mais importante do padrão de pagamento inteiro: qualquer lugar que
reimplementa essa lógica localmente (ex: `if (user.stripeSubscriptionId) { ... }`) é uma fonte
garantida de bug quando o provider muda de comportamento ou quando um novo status é introduzido.

## RTDN do Google Play: webhook não confiável + reconciliação

Real-Time Developer Notifications chegam via Pub/Sub push — um webhook HTTP que o Google chama
quando o estado de uma assinatura muda (renovação, cancelamento, pausa, recuperação). **RTDN não
tem garantia de entrega 100%** — mensagens podem se perder por instabilidade de rede, timeout do
endpoint, ou janelas de manutenção do lado do Google.

Por isso, **é obrigatório ter um cron de reconciliação diário** que consulta o estado real via
Play Developer API e corrige qualquer divergência entre o banco local e o que o Google realmente
tem registrado:

```ts
// app/api/cron/reconcile-google-play-subscriptions/route.ts (padrão)
export async function GET() {
  const pendingSubs = await prisma.subscription.findMany({
    where: { platform: 'google_play', status: { in: ['active', 'grace_period', 'trialing'] } },
  })

  for (const sub of pendingSubs) {
    const realState = await androidPublisher.purchases.subscriptions.get({
      packageName,
      subscriptionId: sub.googlePlayProductId,
      token: sub.googlePlayPurchaseToken,
    })
    await syncSubscriptionFromGooglePlayState(sub, realState.data)
  }
}
```

gastos-app roda esse cron diário; memrapp roda a cada 6h (janela menor de divergência tolerada
porque o produto tem mais volume). O intervalo é uma decisão de produto — quanto mais crítico for
"nunca deixar um usuário com acesso indevido por dias", menor o intervalo.

## Trial: 3 dias com cartão salvo

Padrão observado nos apps mais recentes (gastos-app, memrapp): **trial de 3 dias**, não 7 —
ativado no momento do **checkout** (cartão salvo desde o início), não no cadastro do usuário.
Trial sem fricção (sem cartão, ativado automaticamente no registro) foi abandonado — gera
conversão pior porque o usuário nunca chega a colocar um método de pagamento até o trial acabar.

```ts
// PRICING (padrão observado, memrapp)
export const PRICING = {
  monthly: { price: 9.99, trialDays: 3 },
  annual: { price: 79.90, discountPct: 33, trialDays: 3 },
}
```

No Stripe, isso é `trial_period_days` no checkout session. No Google Play, é um `offerId`
específico configurado no Play Console associado ao produto de assinatura — não existe campo
genérico de trial, é uma oferta separada vinculada ao SKU base.

Como nem Stripe nem Google Play gravam de forma uniforme "esse período é mensal ou anual" em
todos os eventos de webhook, alguns apps precisam inferir isso pela duração:

```ts
function inferPlanFromDates(periodStart: Date, periodEnd: Date): 'monthly' | 'annual' {
  const days = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
  return days > 60 ? 'annual' : 'monthly'
}
```

## Sistema de créditos (avançado — VisaLab)

Alternativa ou complemento à assinatura pura, para produtos onde o consumo é medido por
ação (ex: cada análise de IA custa N créditos) em vez de acesso binário premium/free.

### Ledger append-only

Nunca sobrescrever um saldo diretamente. Toda mudança de saldo é uma linha nova numa tabela de
transações, com o saldo resultante gravado naquela linha — histórico completo e auditável:

```prisma
model CreditTransaction {
  id        String   @id @default(cuid())
  userId    String
  type      String   // ALLOCATION | PURCHASE | USAGE | EXPIRY | ADJUSTMENT | REFUND
  amount    Int       // positivo ou negativo dependendo do type
  balance   Int       // saldo APÓS esta transação — não recalculado, gravado no momento
  reason    String?
  createdAt DateTime @default(now())
}
```

### Dedução atômica sem lock explícito

Debitar crédito sob concorrência (dois requests simultâneos gastando o último crédito disponível)
é um race condition clássico. Em vez de `SELECT balance` seguido de `UPDATE`, a dedução é uma
única query SQL raw que já embute a condição de saldo suficiente:

```ts
// lib/credits/service.ts
async function deductCredit(userId: string, amount: number) {
  const result = await prisma.$executeRaw`
    UPDATE credit_balances
    SET balance = balance - ${amount}, "totalSpent" = "totalSpent" + ${amount}
    WHERE "userId" = ${userId} AND balance >= ${amount}
  `
  if (result === 0) {
    throw new InsufficientCreditsError(userId) // rowcount 0 = não tinha saldo suficiente
  }
  // só grava o registro do ledger DEPOIS que a atualização confirmou sucesso
  await prisma.creditTransaction.create({
    data: { userId, type: 'USAGE', amount: -amount, balance: /* novo saldo */ ... },
  })
}
```

O `WHERE balance >= amount` faz o Postgres recusar a linha (0 rows afetadas) se dois requests
concorrentes tentarem gastar o mesmo crédito ao mesmo tempo — sem precisar de `SELECT FOR UPDATE`
ou lock explícito, porque o próprio `UPDATE` é atômico no nível de linha.

### Quota "exactly-once" para jobs de fila

Quando o consumo de crédito acontece dentro de um job assíncrono (fila BullMQ, por exemplo), um
retry do job por falha transitória não pode debitar duas vezes. Solução: uma constraint `unique`
amarrada ao identificador do job/análise, não ao usuário:

```prisma
model QuotaConsumption {
  id         String @id @default(cuid())
  analysisId String @unique // se o job rodar de novo, o insert falha e a dedução é pulada
  userId     String
  amount     Int
}
```

Antes de debitar, o job tenta inserir essa linha; se já existe (constraint violation), o job sabe
que já debitou nessa análise antes e pula a dedução — comportamento exactly-once sem precisar de
lock distribuído ou deduplicação externa.

## Multi-provider via registry pattern (VisaLab)

Quando há mais de dois providers simultâneos (Stripe + Mercado Pago + Abacate Pay), uma interface
comum evita `if/else` cascata espalhado pelo código:

```ts
// lib/payment/providers/base.ts
export interface IPaymentProvider {
  createCheckout(params: CheckoutParams): Promise<CheckoutResult>
  handleWebhook(payload: unknown, signature: string): Promise<void>
  cancelSubscription(subscriptionId: string): Promise<void>
}

// lib/payment/providers/registry.ts
export class PaymentProviderRegistry {
  private providers = new Map<string, IPaymentProvider>()

  register(name: string, provider: IPaymentProvider) {
    this.providers.set(name, provider)
  }

  get(name: string): IPaymentProvider {
    const provider = this.providers.get(name)
    if (!provider) throw new Error(`Provider não registrado: ${name}`)
    return provider
  }

  getConfigured(): IPaymentProvider[] {
    return [...this.providers.values()].filter((p) => p.isConfigured())
  }

  findByMethod(method: 'pix' | 'card' | 'boleto'): IPaymentProvider | undefined {
    return this.getConfigured().find((p) => p.supports(method))
  }
}
```

Adicionar um provider novo (ex: trocar Abacate Pay por outro gateway Pix) vira implementar a
interface e registrar — o código que já funciona (checkout, webhook de outros providers) não
precisa ser tocado. Isso só compensa a complexidade extra quando há de fato 3+ providers ativos;
com só Stripe + Google Play, um `if (platform === 'stripe')` direto é suficiente e mais simples.

## IAP (Google Play In-App Purchases)

Validação **sempre server-side**, nunca confiar em confirmação client-side:

```ts
// app/api/iap/validate-google-play/route.ts (padrão)
export async function POST(req: Request) {
  const { purchaseToken, productId } = await req.json()

  // idempotência: se esse token já foi processado, não reprocessa
  const existing = await prisma.iapPurchase.findUnique({ where: { purchaseToken } })
  if (existing) return Response.json({ status: existing.status })

  const purchase = await androidPublisher.purchases.subscriptions.get({
    packageName, subscriptionId: productId, token: purchaseToken,
  })

  // distingue consumable (créditos avulsos) de subscription — fluxo de acknowledge difere
  await acknowledgePurchase(purchase)
  await prisma.iapPurchase.create({
    data: { productId, purchaseToken, status: 'ACKNOWLEDGED', rawPayload: purchase.data },
  })
}
```

`rawPayload` guardado para auditoria — quando o Google muda o formato de resposta ou surge uma
disputa de cobrança, ter o payload bruto original economiza uma investigação às cegas.

## Downsell / retenção no cancelamento

Padrão visto em 2 dos 3 apps: quando o usuário inicia o fluxo de cancelamento, oferecer um plano
mais barato **só naquele momento** (exit-intent), nunca anunciado publicamente na página de
preços. Ex: memrapp oferece um plano trimestral com desconto agressivo, elegibilidade controlada
por `retentionOfferUsedAt` (uma vez na vida por usuário — sem isso, usuário cancelaria e
recontrataria em loop só para pegar o desconto de novo).

```ts
async function canUseRetentionOffer(userId: string): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { userId } })
  return sub != null && sub.retentionOfferUsedAt == null
}
```

## Checklist para um app novo

- [ ] Tabela única `Subscription` com `platform` + `status`, nunca uma tabela por provider
- [ ] `status` cobre `active/trialing/grace_period/canceled/past_due/account_hold/inactive` — não
      simplificar para um booleano
- [ ] `grace_period` conta como acesso ativo em `hasActiveAccess()`/`resolvePlanType()`
- [ ] Tabela de eventos de webhook processados com `unique` no ID do evento; checa antes,
      grava depois de processar com sucesso
- [ ] Função central `resolvePlanType()`/`getUserPlan()` — proibido checar
      `stripeSubscriptionId` ou `isPremium` solto em qualquer outro lugar do código
- [ ] Se Google Play Billing: cron de reconciliação diário (ou mais frequente) via Play
      Developer API — RTDN sozinho não é suficiente
- [ ] Trial de 3 dias com cartão salvo no checkout, não trial sem fricção no cadastro
- [ ] Se sistema de créditos: ledger append-only + dedução atômica via SQL raw com
      `WHERE balance >= amount` + constraint unique para exactly-once em jobs de fila
- [ ] Se 3+ providers simultâneos: registry pattern com interface `IPaymentProvider` comum
- [ ] Downsell de retenção só no momento do cancelamento, com flag de uso único por usuário
- [ ] Toda validação de IAP acontece server-side, com idempotência por `purchaseToken`
