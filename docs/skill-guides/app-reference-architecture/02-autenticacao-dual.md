# Autenticação Dual (Web + Tauri/APK)

Todo app da família resolve o mesmo problema: **o mesmo backend Next.js precisa autenticar
dois clientes diferentes** — o navegador (que usa cookies de sessão) e o app Tauri empacotado
como APK (que roda como um cliente "externo" chamando a API remota via HTTP puro, sem cookies
persistentes confiáveis entre sessões do WebView).

Existem duas variantes observadas nos 3 apps. Escolha uma — não misture.

## Variante A — JWT custom com secret compartilhado (gastos-app, VisaLab)

A mais simples de implementar do zero. Web usa NextAuth (cookie), Tauri usa um JWT próprio
assinado com o MESMO secret do NextAuth (`NEXTAUTH_SECRET`), gerado por uma rota de API dedicada.

### Geração do token (`lib/jwt.ts`)

```ts
import jwt from 'jsonwebtoken'

const JWT_EXPIRES_IN = '30d'

function getJwtSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error('NEXTAUTH_SECRET não configurado')
  return secret
}

export function generateTauriToken(userId: string, email: string, name?: string) {
  return jwt.sign({ userId, email, name }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN })
}

export function validateTauriToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as { userId: string; email: string }
}
```

Reusar `NEXTAUTH_SECRET` evita gerenciar um segredo a mais, mas acopla os dois sistemas — girar
o secret do NextAuth invalida todos os JWTs Tauri em circulação. Aceitável na prática porque o
app força re-login silencioso quando o token expira.

### Rotas de API dedicadas para o app nativo

```
app/api/auth/login/route.ts          → valida credenciais, retorna { token, expiresIn, user }
app/api/auth/register/route.ts       → mesmo padrão para cadastro
app/api/auth/generate-token/route.ts → web troca sessão NextAuth por um JWT (ex: ao instalar o
                                        app depois de já estar logado no navegador)
```

### Helper universal de auth em toda rota de API

Todo endpoint que precisa saber "quem é o usuário" chama a MESMA função, que resolve em cascata:

```ts
// lib/api-helpers.ts
export async function getAuthUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { userId } = validateTauriToken(authHeader.slice(7))
      return userId
    } catch {
      return null
    }
  }
  const session = await getServerSession(authOptions)
  return session?.user?.id ?? null
}
```

Isso é o ponto mais importante do padrão: **nunca duplicar a lógica de "quem está logado" por
rota** — uma função central, chamada em toda rota de API protegida.

### Client-side: detectar Tauri e injetar o Bearer automaticamente

```ts
// lib/env.ts
export function isTauri(): boolean {
  return process.env.NEXT_PUBLIC_IS_TAURI === 'true' ||
    (typeof window !== 'undefined' && !!(window as any).__TAURI__)
}

export function getApiUrl(): string {
  if (isTauri()) return process.env.NEXT_PUBLIC_API_URL || 'https://seudominio.com'
  return '' // web usa paths relativos, mesma origem
}
```

```ts
// lib/tauri-fetch-interceptor.ts — instalado uma vez em layout.tsx raiz
export function installTauriFetchInterceptor() {
  if (!isTauri()) return
  const original = window.fetch
  window.fetch = (input, init = {}) => {
    const token = localStorage.getItem('tauri_auth_token')
    if (token) {
      init.headers = { ...init.headers, Authorization: `Bearer ${token}` }
    }
    return original(input, init)
  }
}
```

Com isso, o resto do app (hooks, componentes) chama `fetch('/api/...')` normalmente — o
interceptor cuida de anexar o token sem precisar mudar cada chamada.

### Hook de sessão unificado

```ts
// hooks/useTauriSafeSession.ts
export function useTauriSafeSession() {
  const nextAuthSession = useSession() // ignorado se isTauri()
  const [tauriUser, setTauriUser] = useState<TauriUser | null>(null)

  useEffect(() => {
    if (!isTauri()) return
    function checkToken() {
      const token = localStorage.getItem('tauri_auth_token')
      if (!token || isTauriJwtExpired(token)) {
        localStorage.removeItem('tauri_auth_token')
        setTauriUser(null)
        return
      }
      setTauriUser(decodeTauriJwt(token))
    }
    checkToken()
    const interval = setInterval(checkToken, 60_000)
    window.addEventListener('storage', checkToken)
    window.addEventListener('visibilitychange', checkToken)
    return () => { clearInterval(interval); /* remove listeners */ }
  }, [])

  return isTauri() ? { user: tauriUser, status: tauriUser ? 'authenticated' : 'unauthenticated' }
                    : nextAuthSession
}
```

Sem refresh token nesta variante — 30 dias fixos, expira e força novo login. Simples e
suficiente para apps onde re-login ocasional não é fricção crítica.

## Variante B — Supabase Auth com resolução em cascata (memrapp)

Mais robusta quando você já usa Supabase como provider de auth (Google/Apple/magic link prontos)
e não quer reimplementar hashing de senha/OAuth. Aqui não existe um "JWT customizado" — o Tauri
manda o **access token do Supabase** direto no header `Authorization`.

```ts
// lib/supabase/server.ts
export async function getAuthenticatedUser(request: NextRequest) {
  // 1. Bypass de teste E2E — NUNCA em produção (checagem hardcoded)
  if (process.env.E2E_TEST_BYPASS_AUTH === '1' && process.env.NODE_ENV !== 'production') {
    return MOCK_E2E_USER
  }

  // 2. Bearer token (chamadas do Tauri/APK)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const supabase = createClientFromToken(authHeader.slice(7))
    const { data: { user } } = await supabase.auth.getUser()
    if (user) return user
  }

  // 3. Cookie de sessão (web) — com retry para erros de rede transitórios em Docker
  for (let attempt = 0; attempt < 2; attempt++) {
    const supabase = createServerClient(/* ... cookies() do Next ... */)
    const { data: { user }, error } = await supabase.auth.getUser()
    if (user) return user
    if (!isTransientError(error)) break
    await sleep(attempt === 0 ? 500 : 1000)
  }
  return null
}

function createClientFromToken(accessToken: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  )
}
```

Vantagens sobre a Variante A: refresh token nativo do Supabase (sessões de longa duração sem
forçar re-login), OAuth pronto, RLS no Postgres se você usar o Postgres do próprio Supabase.
Desvantagem: mais uma dependência externa (Supabase) na cadeia crítica de auth, e neste padrão
específico (memrapp) o Postgres de dados da aplicação NÃO é o do Supabase — só a tabela
`auth.users` vive lá (ver [08-worker-e-filas.md](08-worker-e-filas.md) e a nota sobre
arquitetura de dados em 3 camadas). Se for usar Supabase, decida explicitamente se o Postgres de
dados também será o do Supabase ou um Postgres Docker à parte.

### Admin: allowlist simples por email (ambas as variantes)

Nenhum dos 3 apps usa uma coluna `role` no banco para admin — todos usam uma allowlist de e-mails
via env var, checada por uma função central:

```ts
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}
```

## CORS para origens Tauri (obrigatório em ambas as variantes)

O WebView do Tauri roda em uma origem especial que o navegador trataria como cross-origin. Toda
rota de API que o app Tauri chama precisa devolver os headers CORS corretos — **inclusive em
respostas de erro** (401, 500), senão o browser bloqueia a leitura do corpo antes mesmo do app
conseguir decidir se deve tentar refresh de token.

```ts
// lib/cors.ts
export const TAURI_ORIGINS = [
  'tauri://localhost',
  'http://tauri.localhost',
  'https://tauri.localhost',
]

export function getAllowedOrigins(): string[] {
  return [
    process.env.NEXT_PUBLIC_SITE_URL!,
    process.env.NEXT_PUBLIC_SITE_URL_WWW ?? '',
    ...TAURI_ORIGINS,
    process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : '',
  ].filter(Boolean)
}

export function withCors(response: NextResponse, origin: string | null): NextResponse {
  if (origin && getAllowedOrigins().includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
  }
  return response
}
```

Nunca reflita uma origem `null`/opaca de volta no header — isso abriria CORS para qualquer site.

## middleware.ts — bypass seguro para o Tauri

Se você usa `next-auth`'s `withAuth` middleware para proteger rotas, ele intercepta a origem
Tauri antes mesmo dela chegar nas suas rotas de API. O bypass precisa ser condicional e
restritivo (nunca "libera geral para essa origem"):

```ts
// middleware.ts
const isTauriOrigin = req.headers.get('origin') === 'http://tauri.localhost'
const hasBearerOrIsPreflight =
  req.method === 'OPTIONS' || req.headers.get('authorization')?.startsWith('Bearer ')

if (isTauriOrigin && hasBearerOrIsPreflight) {
  return NextResponse.next() // deixa a rota de API validar o Bearer sozinha
}
```

Sem o `hasBearerOrIsPreflight`, qualquer requisição poderia forjar o header `Origin` para pular
a autenticação do middleware — o bypass só é seguro porque a rota de API por trás AINDA exige
um Bearer token válido.

**Gotcha real (gastos-app)**: se o seu middleware também faz redirect de host canônico
(`seudominio.com` → `www.seudominio.com`), o bypass de origem Tauri precisa vir ANTES desse
redirect — o WebView do Tauri trata redirect cross-host em `fetch()` como erro fatal
(`net::ERR_INVALID_REDIRECT`), não como um redirect normal seguido pelo browser.

## Checklist para um app novo

- [ ] Escolher Variante A (JWT custom) ou B (Supabase) — não misturar
- [ ] Uma função central de auth por rota de API (nunca duplicar a checagem de sessão)
- [ ] `isTauri()` centralizado em um único lugar (`lib/env.ts`)
- [ ] Interceptor de fetch injeta o Bearer automaticamente (evita esquecer em alguma chamada)
- [ ] CORS allowlist explícita incluindo as 3 variantes de origem Tauri
- [ ] CORS aplicado em TODAS as respostas de erro das rotas `/api/mobile/*` ou equivalente
- [ ] Middleware bypassa a origem Tauri só quando há Bearer/preflight, nunca "libera geral"
- [ ] Admin via allowlist de e-mail em env var, não coluna de role
