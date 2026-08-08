# Stack Base e Estrutura de Pastas

Os 3 apps de referência (gastos-app, memrapp, VisaLab) convergem numa stack comum e divergem em
pontos pontuais e conscientes (ORM vs SQL puro, single-app vs monorepo). Este arquivo documenta
o que copiar por padrão e quando desviar.

## Stack comum

- **Next.js (App Router)** — todos os 3 apps. Web app + API routes no mesmo processo.
- **TypeScript** em tudo, sem exceção.
- **PostgreSQL** como banco relacional principal nos 3 apps.
- **React 19**.
- **Zod** para validação de schema (entrada de API, forms, env vars).
- **Package manager**: `npm` nos apps single-repo (gastos-app, memrapp). `pnpm` com workspaces
  no monorepo (VisaLab) — `pnpm` é o que faz sentido ter múltiplos `package.json` compartilhando
  `node_modules` via hoisting.
- **Docker** para build e deploy web, com Dockerfiles separados por alvo (web vs Android).
- **Tauri v2** para gerar o APK a partir do mesmo código-fonte (detalhado em
  `03-tauri-build-estatico.md`).

## ORM: Prisma vs Postgres puro

Dois padrões observados, ambos em produção com sucesso. Escolha um e não misture.

### Prisma (gastos-app, VisaLab) — default recomendado

```prisma
// prisma/schema.prisma
generator client {
  provider      = "prisma-client-js"
  output        = "../src/generated/prisma"
  binaryTargets = ["native", "debian-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Gerar o client num local customizado dentro de `src/` (em vez do default `node_modules/.prisma`)
facilita imports consistentes (`@/generated/prisma`) e evita alguns problemas de resolução de
módulo em builds Docker multi-stage. `binaryTargets` precisa incluir o target da imagem Docker
de runtime (`debian-openssl-3.0.x` é comum em imagens `node:slim`), senão o client falha em
runtime com erro de binary engine ausente — só aparece em produção, nunca em dev local.

Trade-off: produtividade alta (tipagem automática a partir do schema, autocomplete, migrations
declarativas) em troca de um passo de build extra (`prisma generate`) que precisa rodar toda vez
que o schema muda, e que historicamente é fonte de bugs de deploy quando esquecido no Dockerfile
(ver `06-docker-cicd.md`, item sobre `prisma generate` vs `next build`).

### Postgres puro via `pg` (memrapp)

Sem ORM. Um wrapper fino em cima do driver `pg` (`node-postgres`):

```ts
// lib/db/postgres.ts
import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    })
  }
  return pool
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const { rows } = await getPool().query(text, params)
  return rows
}
```

Migrations como arquivos SQL puro, numerados sequencialmente e versionados no repo:

```
migrations/
  030_add_user_preferences.sql
  031_add_streak_tracking.sql
  032_add_ai_credits_config.sql
  ...
  059_add_reengagement_pushes.sql
```

Aplicadas por um script no entrypoint do container, cada migration em sua própria transação com
rollback automático se falhar:

```js
// scripts/start-with-migration.mjs (padrão, não literal)
for (const file of pendingMigrations) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(fs.readFileSync(file, 'utf-8'))
    await client.query(
      'INSERT INTO schema_migrations (filename, applied_at) VALUES ($1, now())',
      [file]
    )
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err // falha o boot do container — nunca sobe com migration parcial
  } finally {
    client.release()
  }
}
```

Trade-off: controle total sobre a query (útil quando há queries muito customizadas — agregações
pesadas, CTEs recursivas, tuning fino de índice), zero dependência de geração de código (sem
passo `generate` no build, sem binary engine pra empacotar no Docker), mas perde tipagem
automática (os tipos de retorno de `query<T>()` são manuais/confiados) e exige disciplina de
numerar e nunca editar uma migration já aplicada em produção.

### Recomendação

**Prisma como default** para app novo — produtividade e tipagem ganham na maioria dos casos, e o
time não precisa reaprender SQL puro pra cada feature simples de CRUD. Use Postgres puro só se:
(a) o time já tem essa preferência estabelecida, ou (b) o domínio do app depende de queries muito
customizadas (analytics pesado, full-text search complexo, particionamento manual) onde a camada
de abstração do ORM atrapalha mais do que ajuda.

## Estrutura de pastas do App Router

Route groups (`(nome)`) não aparecem na URL — servem só para agrupar rotas sob layouts
diferentes. Os 3 apps usam esse recurso para separar contextos com necessidades de layout/auth
distintas:

```
src/app/
  (auth)/              # layout sem nav/sidebar — login, register, forgot-password
    login/page.tsx
    register/page.tsx
    layout.tsx
  (dashboard)/          # layout com nav/sidebar, exige sessão — o app logado
    expenses/page.tsx
    cards/page.tsx
    layout.tsx
  (marketing)/           # landing pública, sem sessão, SEO-first
    page.tsx
    layout.tsx
  admin/                # painel interno, checagem de role admin no layout
    page.tsx
    layout.tsx
  api/                  # API routes, uma subpasta por domínio
    auth/
    expenses/
    stripe/
    iap/
    cron/
    admin/
  actions/              # Server Actions ("use server"), separadas de api/
    onboarding-actions.ts
```

Por que route groups em vez de pastas soltas: `(auth)/layout.tsx` pode ser um shell minimalista
(sem sidebar, sem checagem de sessão — o usuário ainda não está logado) enquanto
`(dashboard)/layout.tsx` faz a checagem de sessão e renderiza a navegação principal. Sem grupos,
você acaba duplicando lógica de "se está numa rota X, esconde a sidebar" espalhada em condicionais
dentro de um único layout raiz.

`api/` com subpasta por domínio de negócio (não por verbo HTTP) — `api/expenses/route.ts` lida
com GET/POST de despesas, não `api/get-expenses/` + `api/create-expense/`. Domínios
transversais (auth, pagamento, push, cron, admin) ganham sua própria subpasta de topo dentro de
`api/`.

**memrapp foge do padrão de propósito**: sem grupos `(app)`/`(marketing)` — `app/page.tsx` já É
a home autenticada, e a landing pública fica isolada em `app/landing/`. Funciona porque o produto
tem uma superfície pública muito menor que os outros dois apps. Não é a recomendação default, mas
mostra que o padrão de route groups é uma conveniência, não uma exigência rígida do framework.

## Convenção de múltiplos arquivos de env por contexto

Cada app mantém vários arquivos de env separados por alvo de execução, nunca um único `.env`
compartilhado entre web e Tauri:

```
.env.example         # template completo, comitado, MUITO comentado
.env.local           # dev local, git-ignorado
.env.tauri            # build Tauri desktop, valores dummy para secrets não usados no client
.env.tauri.android    # build Tauri Android especificamente (memrapp: .env.android)
.env.android.example  # template do acima, comitado
```

`.env.example` não é um template genérico de "copie e preencha" — cada variável tem um comentário
explicando propósito e, quando aplicável, como obter/gerar o valor:

```bash
# .env.example (estilo real observado nos 3 apps)

# Secret usado pelo NextAuth para assinar cookies de sessão E pelos JWTs do app Tauri
# (mesma chave — ver 02-autenticacao-dual.md). Gerar com: openssl rand -base64 32
NEXTAUTH_SECRET=

# URL completa do Postgres. Em dev local, aponta pro container docker-compose.
# Formato: postgresql://user:password@host:5432/dbname
DATABASE_URL=

# Credencial de service account do Firebase, em JSON, codificada em base64.
# Gerar: Firebase Console > Project Settings > Service Accounts > Generate new private key,
# depois: cat serviceAccount.json | base64 -w 0
FIREBASE_ADMIN_SDK_JSON=

# Par de chaves VAPID para Web Push. Gerar com: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:contato@seudominio.com

# Stripe. Chaves de teste em dashboard.stripe.com/test/apikeys, produção requer conta ativada.
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=
```

O motivo de investir nesse nível de comentário: esse arquivo é o ponto de entrada de qualquer
pessoa (ou agente) configurando o app do zero. Um `.env.example` mal comentado custa horas de
"por que essa var existe" toda vez que alguém clona o repo.

`.env.tauri`/`.env.android` existem porque o build Tauri roda `next build` com
`output: 'export'`, que ainda assim referencia (mas nunca usa em runtime) variáveis de server
como `STRIPE_SECRET_KEY` — sem elas o build falha ao avaliar módulos que importam essas envs no
topo do arquivo. A convenção é preencher esses arquivos com valores dummy (`sk_dummy_not_used`)
só para o build não quebrar, já que o binário Tauri nunca executa código server-side de verdade.

### Múltiplos `.dockerignore` por alvo de build

```
.dockerignore          # default, usado se nenhum outro for especificado
.dockerignore.web       # build da imagem web (Dockerfile)
.dockerignore.android   # build da imagem Android (Dockerfile.android) — ignora mais agressivo,
                         # não precisa de nada relacionado a Prisma binary engines web etc.
```

Cada `Dockerfile*` referencia o `.dockerignore` correspondente via `--build-context` ou copiando
o arquivo certo para `.dockerignore` antes do build (depende de como o script de build orquestra
— ver `06-docker-cicd.md`). O ganho é build mais rápido e imagem menor: o build Android não
precisa copiar artefatos web (ex: `.next/cache`) e vice-versa.

## Monorepo vs single-app: quando vale a pena

**Default recomendado: single Next.js app** servindo web e Tauri a partir do mesmo código-fonte
(gastos-app, memrapp). Mais simples de configurar, deployar e debugar — um único `package.json`,
um único processo de dev, um único lugar para procurar qualquer coisa.

**Monorepo pnpm workspaces só quando web e mobile realmente divergem** a ponto de precisar de
builds e deploys independentes com código compartilhado tipado entre eles. Sinal de que vale a
pena: o app mobile não é só "o mesmo Next.js exportado estático", mas um cliente com ciclo de
release próprio, ou o worker/backend cresceu a ponto de precisar rodar como processo separado do
Next.js web.

Estrutura observada no VisaLab (o único dos 3 que é monorepo):

```
pnpm-workspace.yaml     # packages: ['apps/*', 'packages/*']
.npmrc                  # node-linker=hoisted, shamefully-hoist=true (workaround de symlink
                         # em filesystems exFAT no Windows — sem isso, pnpm falha silenciosamente
                         # ao linkar pacotes locais em alguns setups Windows)
apps/
  web/                  # Next.js principal: app + API + worker BullMQ, deploy próprio
  mobile/               # Next.js com output: export, casca do Tauri, deploy próprio (build APK)
packages/
  types/                # tipos compartilhados, depende de @prisma/client do apps/web
  validation/            # schemas Zod compartilhados entre web e mobile
  api-client/            # cliente HTTP tipado que o mobile usa pra falar com apps/web
```

Sem Turborepo/Nx — orquestração manual via um script Node custom (`scripts/dev.mjs`) que sobe
web + worker + mobile juntos em dev, autodetectando portas livres. Ferramentas de orquestração de
monorepo (Turborepo, Nx) adicionam valor em builds incrementais com cache distribuído; num
monorepo de 2 apps + 3 packages, o ganho não compensa a complexidade de configuração adicional —
um script simples resolve.

Para a maioria dos apps novos, **não comece com monorepo**. Comece single-app; migre para
monorepo só quando sentir a dor concreta de código duplicado entre web e mobile crescendo demais
para copiar manualmente.

## Testes

- **Vitest** para unit/integration — presente em memrapp e VisaLab (`vitest.config.ts`,
  `__tests__/` ou pasta `e2e/` para specs mais pesadas). Escolha natural sobre Jest em projetos
  Vite/Next modernos: mais rápido, config mais simples, ESM nativo.
- **Playwright** para E2E — presente em memrapp (`playwright.config.ts`, pasta `e2e/`). Cobre
  fluxos críticos de ponta a ponta (login, checkout) que testes unitários não capturam.

Nem todo app precisa dos dois desde o dia 1, mas Vitest para lógica de negócio pura (cálculo de
plano, resolução de status de assinatura, dedução de créditos) é barato de manter e paga o
investimento rápido — esse tipo de lógica é exatamente onde bugs silenciosos custam caro (ver
`04-pagamentos.md`).

## Checklist para um app novo

- [ ] Next.js App Router + TypeScript + PostgreSQL como baseline, sem exceção
- [ ] Decidir Prisma vs `pg` puro ANTES de escrever a primeira query — Prisma por default
- [ ] Se Prisma: `output` customizado do client em `src/generated/prisma` + `binaryTargets`
      incluindo o target da imagem Docker de runtime
- [ ] Se `pg` puro: pasta `migrations/*.sql` numerada + script de aplicação transacional no
      entrypoint do Docker, nunca editar uma migration já aplicada em produção
- [ ] Route groups `(auth)`, `(dashboard)`, `(marketing)` — ou equivalente do domínio — para
      separar layouts sem afetar URL
- [ ] `api/` organizada por domínio de negócio, não por verbo HTTP
- [ ] `.env.example` completo e comentado variável por variável, sempre atualizado a cada nova
      env introduzida
- [ ] `.env.tauri`/`.env.android` com dummies para secrets de server não usados em runtime Tauri
- [ ] `.dockerignore` separado por alvo de build se houver mais de um Dockerfile
- [ ] Decidir monorepo só se houver sinal concreto de deploy/release independente entre web e
      mobile — senão, single-app
- [ ] Vitest configurado desde cedo para lógica de negócio crítica (planos, pagamento, créditos)
