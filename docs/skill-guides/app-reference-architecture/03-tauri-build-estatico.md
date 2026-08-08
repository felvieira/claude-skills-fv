# Build Estático do Tauri sobre Next.js App Router

Este é o problema técnico mais recorrente e mais bem resolvido nos 3 apps: o Tauri empacota o
frontend como arquivos estáticos (`output: 'export'`), mas o Next.js App Router foi desenhado
para rodar com servidor (Server Components, Server Actions, API routes, `getServerSession()`,
`cookies()`). Os 3 apps resolvem isso da MESMA forma estrutural: um script que **transforma
temporariamente o código-fonte antes do build**, builda, e **restaura tudo depois** — nunca
mantém dois códigos-fonte permanentemente divergentes.

## Por que não usar duas branches ou dois repositórios

Já foi tentado implicitamente e descartado nos 3 apps — o custo de manter features em paralelo
em dois lugares supera o custo de um script de transformação. O padrão observado é sempre
**um único código-fonte, transformado em build-time**.

## As duas configs do Next.js

```
next.config.ts          → build web normal (output: 'standalone' para Docker)
next.config.tauri.mjs   → build estático (output: 'export'), usado SÓ durante o build Tauri
```

```js
// next.config.tauri.mjs
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }, // next/image precisa disso sem servidor
  typescript: { ignoreBuildErrors: true }, // stubs gerados no script podem ter tipos frouxos
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, path: false, crypto: false }
    }
    return config
  },
}
```

Módulos exclusivos de Tauri (plugins nativos) precisam virar no-op no build **web**, não no
build Tauri — é o inverso do que se imagina à primeira vista:

```js
// next.config.ts (build web) — aliasa pra módulo vazio, pois o browser normal não tem __TAURI__
webpack: (config) => {
  config.resolve.alias['@tauri-apps/plugin-shell'] = false
  config.resolve.alias['algum-plugin-iap-nativo'] = false
  return config
}
```

## O script orquestrador (`scripts/build-tauri.js`)

Estrutura comum aos 3 apps — os nomes variam, a lógica não:

```js
async function main() {
  try {
    backupAndSwapConfigs()      // next.config.ts → .bak; next.config.tauri.mjs → next.config.mjs
                                 // .env.local → .bak; .env.tauri (ou .env.android) → .env.local
    blackoutServerOnlyRoutes()  // renomeia todo app/api/**/route.ts → .bak (API routes não
                                 // existem em export estático — o app chama a API remota)
    replaceServerLayouts()      // troca layouts/páginas que usam getServerSession()/cookies()
                                 // por stubs client-side equivalentes
    removeDynamicRoutes()       // move pastas [param] pra fora de app/ temporariamente —
                                 // export estático exige generateStaticParams(), mais simples
                                 // remover do build mobile se a rota não é usada no app nativo
    injectBuildMetadata()       // grava NEXT_PUBLIC_APP_VERSION lendo tauri.conf.json

    execSync('npx next build', { stdio: 'inherit' })
  } finally {
    cleanup() // restaura TUDO — configs, env, rotas de API, layouts, rotas dinâmicas
  }
}

// Restaura mesmo se o processo for interrompido (Ctrl+C) ou crashar
process.on('SIGINT', cleanup)
process.on('SIGTERM', cleanup)
process.on('uncaughtException', (err) => { cleanup(); throw err })
```

### Blackout de rotas de API — a técnica central

```js
function blackoutServerOnlyRoutes() {
  const apiRoutes = glob.sync('app/api/**/route.{ts,tsx,js}')
  for (const file of apiRoutes) {
    fs.renameSync(file, file + '.bak')
  }
  // grava a lista em .renamed-routes.json para o cleanup saber o que reverter
}

function cleanup() {
  const renamed = JSON.parse(fs.readFileSync('.renamed-routes.json', 'utf-8'))
  for (const file of renamed) {
    fs.renameSync(file + '.bak', file)
  }
}
```

O Next.js, ao ver `output: 'export'`, já falha o build se encontrar uma API route — então
simplesmente não pode existir no momento do build. Renomear (não deletar!) é o que garante que
o `finally` sempre consegue restaurar, mesmo que o processo seja interrompido no meio.

### Server Actions viram stubs client-side

Uma página com `"use server"` não compila em export estático. O padrão é substituir por uma
versão que chama a API remota via `fetch` comum:

```ts
// ANTES (app/settings/people/page.tsx, produção web) — usa Server Action
async function addPerson(formData: FormData) {
  'use server'
  await prisma.person.create({ data: { name: formData.get('name') } })
}

// DEPOIS (stub gerado pelo script, só existe durante o build Tauri)
async function addPerson(name: string) {
  await fetch(`${getApiUrl()}/api/people`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
}
```

Isso exige que exista uma rota de API equivalente (`app/api/people/route.ts`) — na prática, todo
fluxo que usa Server Action no app web precisa TER uma rota de API irmã para o app Tauri poder
usar. Decida isso desde o design da feature, não depois.

### Layouts server-side viram stubs client-only

```ts
// ANTES: (dashboard)/layout.tsx usa getServerSession() pra redirecionar não-autenticados
export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return <AppShell>{children}</AppShell>
}

// DEPOIS (stub): checagem de auth via hook client-side em vez de getServerSession()
'use client'
export default function DashboardLayout({ children }) {
  const { status } = useTauriSafeSession()
  if (status === 'unauthenticated') return <Redirect to="/login" />
  return <AppShell>{children}</AppShell>
}
```

**Gotcha documentado no gastos-app**: o stub e o original podem divergir com o tempo se alguém
mexe na lógica real e esquece do stub. Deixe um comentário BEM visível no arquivo real apontando
pro stub, e vice-versa:
```
// Se você mudar a lógica de submit/redirect aqui, atualize também o stub em
// scripts/build-tauri.js (array SERVER_LAYOUTS) — eles precisam ficar em sincronia.
```

### Landing/marketing nunca aparece dentro do app Tauri

Os 3 apps decidiram que o usuário do APK nunca deveria ver a landing page pública — o app abre
direto no dashboard (se logado) ou no onboarding (se não). Isso é feito por um componente
montado tanto na landing real quanto no seu stub estático:

```tsx
// components/TauriRedirect.tsx
'use client'
export function TauriRedirect() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, status } = useTauriSafeSession()

  useEffect(() => {
    if (!isTauri() || pathname !== '/') return
    if (status === 'loading') return
    if (user?.onboardingCompleted) router.replace('/dashboard')
    else router.replace('/onboarding')
  }, [status, user, pathname])

  if (isTauri() && pathname === '/') return <SplashScreen />
  return null
}
```

## Detecção de runtime — um único ponto de verdade

```ts
// lib/env.ts
export function isTauri(): boolean {
  if (typeof window === 'undefined') return false
  // Tauri v2 expõe __TAURI_INTERNALS__; v1/builds antigos expõem __TAURI__.
  // Checar ambos cobre os dois casos sem custo.
  return !!(window as any).__TAURI_INTERNALS__ || !!(window as any).__TAURI__
}
```

Usado em TODO lugar que precisa mudar comportamento: navegação mobile vs desktop, qual URL de
API usar, se mostra ou não a landing, se injeta o Bearer no fetch, etc. Nunca duplique essa
checagem com uma lógica ligeiramente diferente em outro arquivo.

## Workarounds de ambiente Windows/Docker (comuns aos 3 apps)

- **`EXDEV` ao mover diretórios em Docker**: `fs.renameSync` falha cruzando devices/layers no
  Docker. Usar sempre `fs.cpSync(src, dest, { recursive: true })` + `fs.rmSync(src, { recursive:
  true })` em vez de `renameSync` para qualquer movimentação de pasta dentro do script de build.
- **`EISDIR` no webpack cache do Windows**: certas pastas (nomes com parênteses como `(auth)`,
  paths muito longos) quebram o cache do webpack no Windows. Mover temporariamente essas pastas
  pra fora de `app/` antes do build e restaurar depois é o mesmo padrão do blackout de rotas.
- **`node-cron` não funciona em bundle client-side**: se alguma lib server-only vaza para o
  bundle do build estático (import indireto), aliasar para um stub vazio no
  `next.config.tauri.mjs`, mesmo padrão dos plugins Tauri nativos no build web.

## Comandos finais (após o build estático gerar `out/`)

```bash
npx tauri android init      # gera src-tauri/gen/android (uma vez, ou re-gerado no CI)
npx tauri android build --apk --target aarch64
```

O `frontendDist` do `tauri.conf.json` aponta pra pasta `out/` gerada pelo `next build` com
`output: 'export'`:

```json
{
  "build": {
    "frontendDist": "../out",
    "beforeBuildCommand": "npm run build:tauri"
  }
}
```

## Checklist para um app novo

- [ ] Duas configs Next.js: `next.config.ts` (web) e `next.config.tauri.mjs` (export estático)
- [ ] Script `scripts/build-tauri.js` com backup/swap/build/`finally`-restore
- [ ] Todo Server Action tem uma rota de API irmã, usável pelo stub client-side do build Tauri
- [ ] Todo layout/page com `getServerSession()`/`cookies()` tem um stub client-only equivalente
- [ ] `isTauri()` centralizado em um único arquivo
- [ ] `TauriRedirect` (ou equivalente) impede a landing pública de aparecer dentro do APK
- [ ] Usar `cpSync`+`rmSync` em vez de `renameSync` para mover pastas (compatibilidade Docker)
- [ ] Rotas dinâmicas (`[param]`) removidas do build mobile se não usadas pelo app nativo
