# Push Notifications: Web Push, FCM e Plugins Nativos

## Por que dual (no mínimo)

**Web Push (VAPID)** funciona em qualquer navegador/PWA sem depender de infraestrutura do
Google — é um padrão aberto, roda direto do seu próprio backend. Mas **não entrega de forma
confiável quando o app Android está fechado** — o navegador/WebView precisa estar rodando (ou o
Service Worker ativo) para receber o push.

**FCM (Firebase Cloud Messaging)** resolve isso: entrega mesmo com o app completamente fechado,
porque usa o canal persistente do Google Play Services no Android — é o motivo pelo qual todo app
Tauri/Android da família implementa FCM, não só Web Push.

Os 3 apps implementam os dois canais no mínimo. memrapp vai além com um terceiro canal
(ntfy self-hosted) para casos que Web Push + FCM não cobrem bem.

## Web Push com VAPID

Gerar o par de chaves VAPID uma vez, versionar como env var:

```bash
npx web-push generate-vapid-keys
```

```bash
# .env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contato@seudominio.com
```

Server-side, usando a lib `web-push`:

```ts
// lib/web-push.ts
import webpush from 'web-push'

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function sendWebPush(subscription: PushSubscriptionJSON, payload: object) {
  return webpush.sendNotification(subscription as any, JSON.stringify(payload))
}
```

Modelo para persistir as subscriptions do browser:

```prisma
model PushSubscription {
  id       String @id @default(cuid())
  userId   String
  endpoint String @unique
  p256dh   String
  auth     String
  createdAt DateTime @default(now())
}
```

## FCM via Firebase Admin SDK

### Credencial como env var, não como arquivo

A credencial de service account inteira (JSON) vai numa única env var, codificada em base64 —
não como arquivo montado via volume:

```bash
# gerar a partir do JSON baixado no Firebase Console > Project Settings > Service Accounts
cat serviceAccount.json | base64 -w 0
```

```bash
# .env
FIREBASE_ADMIN_SDK_JSON=  # base64 do JSON completo (ou JSON direto, ambos aceitos)
```

Por que env var em vez de arquivo: em deploy via Coolify/Docker, montar um volume de secret é
mais fricção operacional que colar uma env var no painel — não precisa gerenciar volume, não
precisa lembrar de montar o arquivo certo em cada ambiente (dev/staging/prod), e o valor fica no
mesmo lugar que todos os outros secrets do app.

```ts
// lib/firebase-admin.ts
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

function loadCredential() {
  const raw = process.env.FIREBASE_ADMIN_SDK_JSON!
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf-8')
  return JSON.parse(json)
}

let app: App | null = null

function getFirebaseApp(): App {
  if (getApps().length > 0) return getApps()[0]
  if (!app) {
    app = initializeApp({ credential: cert(loadCredential()) })
  }
  return app
}

export function getFcmMessaging() {
  return getMessaging(getFirebaseApp())
}
```

Lazy singleton init via `getApps()[0]` — evita reinicializar o SDK em cada hot-reload de dev ou
em cada invocação de função serverless, que causaria erro de "app already exists".

### Envio em lote e limpeza de tokens inválidos

```ts
// lib/push-fcm.ts
export async function sendFcmToUsers(tokens: string[], payload: { title: string; body: string; data?: Record<string, string> }) {
  const messaging = getFcmMessaging()
  const invalidTokens: string[] = []

  // batches de até 500 (limite da API sendEachForMulticast)
  for (const batch of chunk(tokens, 500)) {
    const result = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: { priority: 'high', notification: { channelId: 'default' } },
    })

    result.responses.forEach((r, i) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(batch[i])
      }
    })
  }

  if (invalidTokens.length > 0) {
    await prisma.deviceToken.deleteMany({ where: { token: { in: invalidTokens } } })
  }
}
```

Poda automática de tokens mortos é obrigatória, não opcional — sem isso, a lista de destinatários
cresce indefinidamente com tokens de desinstalações antigas, desperdiçando chamadas de API e
inflando métricas de "enviado" que nunca vão ser entregues.

## Lado Tauri: duas abordagens

### (a) Simples — plugin oficial + ponte JS

`@tauri-apps/plugin-notification` cobre notificação local/nativa do sistema operacional (push
disparado localmente pelo próprio app, sem depender de servidor — ex: lembrete diário). Para
receber push remoto via FCM, o token precisa ser obtido através de alguma ponte JS↔nativo
(plugin Android custom mínimo que expõe o token do Firebase Messaging para o WebView via
`addPluginListener`).

```ts
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'
import { addPluginListener } from '@tauri-apps/api/core'

async function registerPush() {
  let granted = await isPermissionGranted()
  if (!granted) granted = (await requestPermission()) === 'granted'
  if (!granted) return

  await addPluginListener('fcm', 'token', async (event: { token: string }) => {
    await fetch('/api/push/register-device', {
      method: 'POST',
      body: JSON.stringify({ token: event.token }),
    })
  })
}
```

Suficiente quando o app só precisa "receber notificação e abrir o app" — não precisa de deep
link fino nem controle de canal Android por tipo de notificação.

### (b) Avançada — plugin Rust custom (memrapp: `tauri-plugin-fcm`)

Quando push nativo real importa de verdade (deep link para uma tela específica ao tocar na
notificação, controle fino de canal de notificação Android, evento de refresh de token
tratado no próprio Rust), a solução é escrever um plugin Tauri em Rust do zero, com bridge
Kotlin para o lado mobile:

```
src-tauri/tauri-plugin-fcm/
  src/
    lib.rs         # registro do plugin, define comandos expostos ao JS
    desktop.rs      # stub/no-op para desktop (FCM é mobile-only)
    mobile.rs       # bridge para o código Kotlin via tauri::plugin::PluginHandle
    commands.rs     # get_token, get_launch_url
    models.rs
    error.rs
```

Comandos expostos ao lado JS:

```ts
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

const token = await invoke('plugin:fcm|get_token')
const launchUrl = await invoke('plugin:fcm|get_launch_url') // deep link se o app abriu via push

await listen('pushOpened', (event) => {
  router.push(event.payload.deepLink) // navega direto pra tela relevante
})

await listen('tokenRefresh', async (event) => {
  await fetch('/api/push/register-device', { method: 'POST', body: JSON.stringify({ token: event.payload }) })
})
```

Essa abordagem exige manter código Rust + Kotlin próprio (mais superfície para manter e testar em
upgrades do Tauri), mas é o único jeito de ter deep link confiável e eventos de push tratados
nativamente em vez de depender de heurísticas no lado JS.

## Função central de envio: `sendPushToUsers`

Nunca espalhar a lógica de "para qual canal mandar" em vários lugares do código. Uma função
central decide os destinatários por segmento, dispara para Web Push e FCM em paralelo, e cuida da
limpeza de tokens inválidos:

```ts
// lib/push-delivery.ts
type Segment = 'all' | 'premium' | 'free'

function segmentUserWhere(segment: Segment) {
  if (segment === 'premium') return { subscription: { status: { in: ['active', 'grace_period'] } } }
  if (segment === 'free') return { subscription: { status: 'inactive' } }
  return {}
}

export async function sendPushToUsers(segment: Segment, payload: { title: string; body: string; data?: Record<string, string> }) {
  const users = await prisma.user.findMany({
    where: segmentUserWhere(segment),
    include: { pushSubscriptions: true, deviceTokens: true },
  })

  await Promise.all([
    ...users.flatMap((u) => u.pushSubscriptions.map((s) => sendWebPush(s, payload).catch(() => null))),
    sendFcmToUsers(users.flatMap((u) => u.deviceTokens.map((t) => t.token)), payload),
  ])
}

export async function sendPushToUser(userId: string, payload: object) {
  return sendPushToUsers('all', payload) // variante para 1 usuário, mesma função por baixo
}
```

Toda superfície do app que dispara notificação — painel admin, cron de retenção, webhook de
pagamento — chama essa mesma função. Isso evita a situação clássica de "esqueci de limpar tokens
inválidos nesse fluxo específico" porque cada fluxo reimplementava o envio à mão.

## Segmentação e disparo

Três origens observadas, todas convergindo na função central acima:

1. **Manual via painel admin** — operador dispara campanha pontual para um segmento.
2. **Automático via cron de retenção** — winback (usuário inativo há N dias), reengajamento 30d,
   aviso de trial acabando, créditos baixos.
3. **Automático via webhook de pagamento** — `invoice.payment_failed` dispara push de aviso de
   cobrança pendente no mesmo momento em que o status vira `grace_period`.

## Dedup: evitar notificação duplicada em cron

Todo cron de retenção/notificação **grava um registro com chave única (userId + tipo + data)
ANTES de disparar** a notificação, não depois. Isso protege contra o cron rodar de novo por
engano — redeploy que reexecuta jobs, retry de infraestrutura, scheduler duplicado por erro de
config — sem mandar a mesma notificação duas vezes para o mesmo usuário no mesmo dia.

```prisma
model Notification {
  id      String @id @default(cuid())
  userId  String
  segment String // chave do tipo de notificação, ex: "winback_7d", "trial_ending_1d"
  sentAt  DateTime @default(now())

  @@unique([userId, segment])
}
```

```ts
async function sendWinbackIfNotSent(userId: string) {
  try {
    await prisma.notification.create({ data: { userId, segment: 'winback_7d' } })
  } catch {
    return // unique constraint violada = já foi enviado, não reprocessa
  }
  await sendPushToUser(userId, { title: '...', body: '...' })
}
```

O `create` funciona como um lock: se a linha já existe, a constraint falha e a função sai antes
de disparar o push — dedup sem precisar de uma checagem `SELECT` + `INSERT` separada (que teria
race condition entre as duas operações).

## Padrão avançado opcional: ntfy self-hosted (memrapp)

memrapp adiciona um terceiro canal via `binwiederhier/ntfy` rodando em container próprio no
`docker-compose.yml`. Serve dois propósitos:

1. **Servidor VAPID próprio** — o ntfy expõe seu próprio endpoint Web Push
   (`GET /v1/webpush`), então o Web Push do app usa o ntfy como intermediário em vez de
   implementar a lib `web-push` diretamente.
2. **SSE (Server-Sent Events) em foreground** — enquanto o app está aberto, o cliente mantém uma
   conexão `EventSource` aberta num tópico específico do ntfy:

```ts
const es = new EventSource(`${ntfyBase}/${topic}/sse`) // topic: ex "app-user-{userId}"
es.onmessage = (event) => {
  const notification = JSON.parse(event.data)
  showInAppToast(notification)
}
```

Isso dá notificação em tempo real dentro do app aberto (ex: "sua análise terminou") sem precisar
manter um servidor WebSocket próprio — o ntfy já resolve o pub/sub por tópico.

**Isso é opcional e avançado.** A maioria dos apps não precisa desse terceiro canal — Web Push +
FCM cobre a esmagadora maioria dos casos de uso de notificação. Só vale a complexidade adicional
de operar mais um container em produção quando o produto realmente precisa de atualização em
tempo real dentro do app aberto (ex: status de processamento assíncrono de longa duração) e você
quer evitar implementar e manter WebSocket próprio.

## Configuração nativa Android

`google-services.json` (ou `firebase/google-services.json`) é **versionado no repositório**, não
gerado em runtime — contém apenas identificadores públicos do projeto Firebase, sem segredo
sensível. É processado pelo Gradle durante o build Android, que roda **dentro do CI**
(`Dockerfile.android`), nunca durante dev local — dev local não builda o APK final, só roda a web
no browser ou o Tauri em modo dev desktop.

## Checklist para um app novo

- [ ] Web Push (VAPID) implementado como canal mínimo — funciona sem depender do Google
- [ ] FCM via Firebase Admin SDK obrigatório se o app tem versão Android/Tauri
- [ ] Credencial do Firebase como env var única em base64, nunca arquivo montado por volume
- [ ] Lazy singleton init do Firebase Admin (`getApps()[0]`) — nunca reinicializar por request
- [ ] Limpeza automática de tokens FCM inválidos (`messaging/registration-token-not-registered`)
      embutida na própria função de envio, não um processo separado que pode ser esquecido
- [ ] Função central `sendPushToUsers`/`sendPushToUser` — proibido implementar envio ad-hoc em
      rotas ou crons individuais
- [ ] Segmentação (all/premium/free) resolvida num único lugar, reusada por todas as origens de
      disparo (admin, cron, webhook)
- [ ] Dedup via registro único (userId + tipo + data) gravado ANTES do envio, não depois
- [ ] `google-services.json` versionado no repo, processado só durante build Android no CI
- [ ] Avaliar plugin Rust custom só se deep link/canal nativo for requisito real do produto —
      senão, `@tauri-apps/plugin-notification` + ponte simples é suficiente
- [ ] ntfy/SSE só se houver necessidade real de tempo real em foreground — não é default
