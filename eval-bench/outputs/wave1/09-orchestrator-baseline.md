---
scenario: 09-orchestrator
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 80
tokens_out_approx: 1850
time_seconds: 45
quality_score: 2.8
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 2
pass_fail: baseline
delta_vs_baseline: 0
notes: "Generic Next.js auth answer. Cites NextAuth/Auth.js but doesn't structure as pipeline. No risk surfacing, no role separation, no decision gates."
---

# Autenticação Social (Google + GitHub) — Next.js + Prisma + PostgreSQL

Aqui vai o que fazer e em que ordem para adicionar Google + GitHub auth no app existente.

## Stack recomendada

A escolha padrão para este stack é **Auth.js (NextAuth v5)** com o **Prisma adapter**. Razões:

- Suporte nativo para OAuth Google e GitHub
- Prisma adapter já mapeia tabelas `User`, `Account`, `Session`, `VerificationToken`
- Funciona com App Router (server components) e Pages Router
- Sessions JWT ou database — recomendo database para revogação fácil

## Ordem de execução

### 1. Criar OAuth Apps nos providers
- **Google Cloud Console**: criar projeto → OAuth consent screen → credentials → Web application
  - Redirect URI: `https://seu-dominio/api/auth/callback/google` (e `http://localhost:3000/...` para dev)
- **GitHub**: Settings → Developer settings → OAuth Apps → New OAuth App
  - Callback URL: `https://seu-dominio/api/auth/callback/github`

Guardar `client_id` e `client_secret` de cada um.

### 2. Instalar dependências
```bash
npm install next-auth@beta @auth/prisma-adapter
```

### 3. Atualizar Prisma schema
Adicionar os models exigidos pelo adapter:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                 String  @id @default(cuid())
  userId             String
  type               String
  provider           String
  providerAccountId  String
  refresh_token      String? @db.Text
  access_token       String? @db.Text
  expires_at         Int?
  token_type         String?
  scope              String?
  id_token           String? @db.Text
  session_state      String?
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}
```

Rodar `npx prisma migrate dev --name add_auth_tables`.

### 4. Configurar Auth.js
Criar `auth.ts` na raiz:

```ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "database" },
})
```

### 5. Criar route handler
`app/api/auth/[...nextauth]/route.ts`:

```ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### 6. Variáveis de ambiente
`.env.local`:
```
AUTH_SECRET=<gerar com `openssl rand -base64 32`>
AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
DATABASE_URL=... (já existente)
```

### 7. Botões de login
Em qualquer server component:
```tsx
import { signIn } from "@/auth"

<form action={async () => { "use server"; await signIn("google") }}>
  <button>Entrar com Google</button>
</form>
```

### 8. Proteger rotas
Criar `middleware.ts`:
```ts
export { auth as middleware } from "@/auth"
export const config = { matcher: ["/dashboard/:path*"] }
```

Ou em server component:
```ts
const session = await auth()
if (!session) redirect("/login")
```

### 9. Testar fluxos
- Login Google → callback → user criado em DB → session persistida
- Login GitHub → mesmo fluxo
- Logout → session removida
- Conta linkada: mesmo email entre providers — Auth.js liga automaticamente se `allowDangerousEmailAccountLinking: true` (cuidado: phishing)

### 10. Deploy
- Setar `AUTH_URL` para domínio de produção
- Adicionar callback URLs de produção nos OAuth apps
- Configurar `secure cookies` (default em produção)

## Considerações

- Para escala alta, considere session JWT em vez de database
- Adicione RBAC depois (role field em User) — Auth.js não traz isso pronto
- Logs de auth: nada built-in, instrumente manualmente em callbacks

Pronto. Esse é o caminho mais limpo e padrão para o stack descrito.
