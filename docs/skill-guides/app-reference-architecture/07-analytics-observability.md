# Analytics, Observability e Painel Admin

## Analytics de aquisição/conversão

Os 3 apps usam a mesma combinação básica: **GA4** (client-side via `gtag.js`) + **Google Ads
conversion tracking** (labels de conversão por evento: signup, checkout, purchase). O ponto que
os 3 resolveram da mesma forma é um problema específico de app Tauri/Android:

### O buraco do funil dentro do WebView Tauri

`gtag.js` é um script de terceiros carregado via `<script>` tag — dentro do APK (build estático,
sem acesso à internet do jeito que o Chrome normal tem, CSP restritivo do Tauri) ele
frequentemente **não roda ou não é confiável**. Se sua única fonte de conversão é client-side,
todo o funil de compra feito dentro do app Android fica invisível pro Google Ads/Analytics.

**Solução**: reportar eventos críticos de conversão (compra, assinatura, cadastro) **também
server-side**, via GA4 Measurement Protocol, no exato momento em que o backend confirma o evento
(webhook do Stripe, validação de IAP) — não depende do client ter rodado `gtag.js` de verdade.

```ts
// lib/server/ga4-measurement-protocol.ts
export async function sendGa4Event(clientId: string, eventName: string, params: object) {
  await fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_ID}&api_secret=${GA4_MP_API_SECRET}`,
    {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId, // gerado no client, persistido, enviado junto no checkout
        events: [{ name: eventName, params }],
      }),
    }
  )
}

// Chamado dentro do webhook do Stripe, não num useEffect do frontend:
await sendGa4Event(session.client_reference_id, 'purchase', { value, currency: 'BRL' })
```

Combine com `gclid` (o ID de clique do Google Ads) capturado no primeiro load e persistido
(localStorage ou coluna no usuário) para conseguir reportar **offline conversions** de volta pro
Google Ads via API server-side quando o pagamento é confirmado dias depois do clique original —
sem isso, campanhas de Ads não conseguem otimizar corretamente pra conversões que acontecem
dentro do app.

### Atribuição de instalação (Android)

Se você roda campanhas pagas de instalação do APK, capture o **Play Store Install Referrer** —
sem isso não há como saber de qual campanha veio cada instalação orgânica vs paga. Um plugin
Tauri Rust custom (`tauri-plugin-install-referrer`, visto no memrapp e VisaLab) lê essa
informação nativa do Android e reporta pro backend no primeiro boot do app.

## Cron jobs (sem plataforma serverless)

Como o deploy é Docker/Coolify (não Vercel), cron jobs rodam via container dedicado (ver
[06-docker-cicd.md](06-docker-cicd.md)) batendo em rotas `/api/cron/*` protegidas por
`Authorization: Bearer ${CRON_SECRET}`. Padrão de jobs observado nos 3 apps — use como checklist
do que costuma ser necessário:

**Billing/reconciliação** (críticos, nunca pular):
- `reconcile-google-play-subscriptions` — diário, corrige divergência de RTDN perdido
- `expire-premium`/`expire-subscriptions` — periódico, degrada acesso quando o período pago
  realmente acabou (mesmo que o webhook de cancelamento tenha falhado)
- `retry-pending-iap` — reprocessa compras IAP que falharam validação transitoriamente

**Retenção/engajamento** (produto, não crítico se atrasar):
- `email-trial-ending` (D-1 antes do trial acabar)
- `push-winback`/`email-winback` (D+7 pós-cancelamento)
- `push-credits-low` (créditos de IA acabando)
- `push-reengagement-30d` (usuário inativo há 30 dias)

**Housekeeping**:
- `expire-deletions` — hard-delete de contas após período de carência (LGPD/GDPR — usuário pediu
  exclusão, você mantém soft-delete por N dias antes de apagar de vez)
- `alert-failure` — não é um cron em si, é a rota que outros jobs chamam quando falham (ver
  padrão de alerta abaixo)

**Todo cron precisa de dedup** — se ele rodar duas vezes (redeploy no meio da execução, retry
manual), não pode mandar o mesmo e-mail/push duas vezes:

```ts
const alreadySent = await db.notificationLog.findFirst({
  where: { userId, type: 'trial_ending', sentOn: today },
})
if (alreadySent) continue
```

### Alerta quando um cron falha

O container de cron geralmente não tem acesso a SMTP/infra de notificação própria — ele avisa o
serviço web (que tem) via uma rota HTTP dedicada:

```sh
# cron/run-job.sh
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $CRON_SECRET" "$URL")
if [ "$STATUS" != "200" ]; then
  curl -X POST -H "Authorization: Bearer $CRON_SECRET" "$BASE_URL/api/cron/alert-failure" \
    -d "{\"job\":\"$JOB_NAME\",\"status\":$STATUS}"
fi
```

## Health checks

Implemente sempre `GET /api/health` de verdade — checando uma dependência real (`SELECT 1` no
Postgres), não apenas retornando 200 fixo:

```ts
export async function GET() {
  try {
    await db.query('SELECT 1')
    return Response.json({ status: 'ok' })
  } catch {
    return Response.json({ status: 'error' }, { status: 503 })
  }
}
```

Usado tanto pelo `HEALTHCHECK` do Dockerfile quanto pelo healthcheck do `docker-compose.yml` —
sem essa rota, o Coolify/Docker não sabe distinguir "container rodando" de "app funcional".

Se você tem um worker separado (ver [08-worker-e-filas.md](08-worker-e-filas.md)), ele usa um
mecanismo diferente (heartbeat file), pois não serve HTTP.

## Error tracking

Nenhum dos apps mais simples tem Sentry — logging é via console estruturado
(`lib/logger.ts`) mais tabelas de auditoria no próprio Postgres (`WebhookLog`,
`StripeWebhookEvent`, `AuditLog`) como trilha de eventos importantes. O app mais avançado
(VisaLab) tem Sentry (`@sentry/nextjs`, `tracesSampleRate: 0.1`, habilitado condicionalmente por
`SENTRY_DSN` presente) nas 3 camadas (server/client/edge config).

**Recomendação**: comece sem Sentry (logging estruturado + tabelas de auditoria de webhook
resolvem 80% do troubleshooting). Adicione Sentry quando o app tiver usuários reais suficientes
para que rastrear erro em produção por log manual vire gargalo — não adicione por padrão em todo
projeto novo.

## Painel admin interno

Todo app tem um `app/admin/` protegido por allowlist de e-mail (ver
[02-autenticacao-dual.md](02-autenticacao-dual.md)), sem middleware — cada rota chama
`requireAdmin()` diretamente:

```ts
// lib/admin.ts
export async function requireAdmin() {
  const user = await getAuthenticatedUser()
  if (!user || !isAdminEmail(user.email)) {
    throw new UnauthorizedError()
  }
  return user
}
```

Seções mínimas recomendadas (baseado no que os 3 apps convergem em ter):
- **Subscriptions**: listar/filtrar assinaturas, detectar automaticamente inconsistências
  (assinatura marcada `active` mas com `currentPeriodEnd` no passado, dados Stripe/Google Play
  faltando) — não espere o usuário reclamar pra descobrir dessincronia
- **Grant premium manual**: conceder acesso premium manualmente por N meses (parceria, suporte,
  cortesia) sem precisar mexer direto no banco
- **Push manual**: disparar notificação pra um segmento de usuários direto do painel
- **Logs de webhook**: tabela de auditoria de eventos recebidos de Stripe/Google Play/Pix —
  primeira parada pra debugar "o usuário pagou mas não ficou premium"

Apps maiores (VisaLab) expandem isso pra um mini-BI (dashboard de revenue, funil de conversão,
uso de IA por custo) — comece pelo mínimo acima, expanda conforme a necessidade real aparecer.

## Checklist para um app novo

- [ ] GA4 + Google Ads client-side via `gtag.js`
- [ ] GA4 Measurement Protocol server-side para eventos de conversão críticos (evita o buraco do
      funil dentro do WebView Tauri)
- [ ] `gclid` capturado e persistido para offline conversion import
- [ ] Cron via container dedicado, nunca `setInterval` no processo principal
- [ ] Todo cron de notificação/e-mail tem dedup explícito antes de disparar
- [ ] Alerta de falha de cron via rota dedicada no serviço web (cron não tem SMTP próprio)
- [ ] `GET /api/health` checando uma dependência real, não só retornando 200
- [ ] Tabelas de auditoria de webhook (`WebhookLog`) mesmo sem Sentry — primeira linha de defesa
      pra debugar problema de pagamento
- [ ] Painel admin com allowlist de e-mail, seção de subscriptions com detecção de inconsistência
- [ ] Sentry só quando o volume de usuários justificar — não é default obrigatório
