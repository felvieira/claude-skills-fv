# Docker e CI/CD

## Princípio geral

Nenhum dos 3 apps builda o APK "na mão" em produção. Todo build Android acontece dentro de um
`Dockerfile.android` rodado por GitHub Actions — reprodutível, sem depender da máquina de
ninguém ter Android SDK/NDK/Rust instalados corretamente. O deploy web, por outro lado, é feito
por Coolify observando o Git (sem workflow de deploy customizado) — os 3 apps NÃO têm um
workflow `deploy-web.yml`.

## Dockerfile web (produção)

Padrão multi-stage idêntico nos 3 apps: `deps` (instala dependências) → `builder` (gera
artefato) → `runner` (imagem final mínima, usuário não-root).

```dockerfile
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Valores DUMMY — só para satisfazer `next build`/`prisma generate` durante o build.
# O app NUNCA conecta de verdade nessas envs em build-time, só valida que existem.
ENV DATABASE_URL="postgresql://postgres:password@localhost:5432/app"
ENV NEXTAUTH_SECRET="build-time-placeholder"
ENV NEXTAUTH_URL="http://localhost:3000"
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npx prisma generate
RUN npx next build   # output: 'standalone' no next.config.ts

FROM node:20-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
RUN chown -R nextjs:nodejs .next/cache   # sem isso: EACCES em runtime, visto em produção real

USER nextjs
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
```

**Gotcha real**: se você usa `npx next build` direto (pulando `npm run build`), qualquer hook
`prebuild` do `package.json` NÃO roda — isso já causou bug em produção onde um script que
"carimbava" a versão do service worker (`stamp-sw-version.js`) nunca era chamado, deixando
`sw.js` com um placeholder `__BUILD_VERSION__` literal pra sempre, quebrando a invalidação de
cache do PWA. Se o build depende de um script de pré-processamento, chame-o explicitamente antes
do `next build` no Dockerfile, não confie no hook do npm.

**Se o ORM for Prisma**: gere o client num diretório customizado
(`generator client { output = "../src/generated/prisma" }`) e copie esse diretório pro runner —
o client default (`node_modules/.prisma`) às vezes não sobrevive limpo à cópia seletiva de
`node_modules` em builds standalone.

**Se o ORM for `pg` puro** (sem Prisma): o build standalone do Next.js costuma excluir módulos
nativos do bundle (`serverExternalPackages`) — copie manualmente os módulos do driver Postgres
pro runner (`pg`, `pg-connection-string`, `pg-pool`, `pg-protocol`, `pg-types`, etc.), senão o
container sobe e cai na primeira query com "module not found".

## docker-entrypoint.sh — migrations e seed no boot, não no build

```sh
#!/bin/sh
set -e

MAX_ATTEMPTS="${PRISMA_MIGRATION_MAX_ATTEMPTS:-30}"
RETRY_DELAY="${PRISMA_MIGRATION_RETRY_DELAY:-2}"

attempt=0
until npx prisma migrate deploy; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
    echo "Migrations falharam após $MAX_ATTEMPTS tentativas" >&2
    exit 1
  fi
  sleep "$RETRY_DELAY"
done

if [ -z "$SKIP_SEED" ]; then
  npx prisma db seed || echo "Warning: seed falhou, continuando mesmo assim..."
fi

exec "$@"
```

Migrations e seed rodam no **entrypoint do container em runtime**, nunca durante o build da
imagem Docker — o banco de dados não existe/não está acessível durante o build. O retry loop
existe porque o container do banco pode não estar pronto ainda quando o container da app sobe
(mesmo com `depends_on`, que só garante ordem de start, não prontidão).

Se o ORM for `pg` puro com migrations SQL manuais, o mesmo papel é feito por um script Node que
lê `migrations/*.sql` em ordem lexicográfica, aplica cada uma em transação própria (rollback
individual se falhar, nunca marca como aplicada se der erro), guarda o estado numa tabela
`schema_migrations`:

```js
// scripts/start-with-migration.mjs
for (const file of sortedSqlFiles) {
  const alreadyApplied = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file])
  if (alreadyApplied.rowCount > 0) continue
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(fs.readFileSync(file, 'utf-8'))
    await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
spawn('node', ['server.js'], { stdio: 'inherit' })
```

## Dockerfile.android — build do APK dentro de Docker

Base Ubuntu (não Alpine — Android SDK/NDK não têm suporte musl confiável), com toolchain
completa instalada na imagem:

```dockerfile
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y curl git build-essential unzip openjdk-17-jdk
# Node via tarball oficial, não script NodeSource (evita 403 intermitente)
RUN curl -fsSL https://nodejs.org/dist/v20.x.x/node-v20.x.x-linux-x64.tar.xz | tar -xJ -C /usr/local --strip-components=1

RUN curl https://sh.rustup.rs -sSf | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"
RUN rustup target add aarch64-linux-android armv7-linux-androideabi i686-linux-android x86_64-linux-android

# Android SDK Command Line Tools + platform-tools + build-tools + NDK
ENV ANDROID_HOME=/opt/android-sdk
RUN mkdir -p $ANDROID_HOME/cmdline-tools && \
    curl -o cmdline-tools.zip https://dl.google.com/android/repository/commandlinetools-linux-XXXX.zip && \
    unzip cmdline-tools.zip -d $ANDROID_HOME/cmdline-tools && \
    yes | $ANDROID_HOME/cmdline-tools/bin/sdkmanager --licenses && \
    $ANDROID_HOME/cmdline-tools/bin/sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;27.x.x"

# Memória limitada: evita OOM em runners com pouca RAM
ENV CARGO_BUILD_JOBS=1
ENV RUSTFLAGS="-C codegen-units=1"
ENV CARGO_INCREMENTAL=0
ENV GRADLE_OPTS="-Xmx1536m -Dorg.gradle.workers.max=1"

WORKDIR /app
COPY . .
RUN npm ci && npm rebuild @next/swc-linux-x64-gnu @tauri-apps/cli

# Ícones pré-gerados são só COPIADOS — o container não tem ImageMagick
COPY android-icons ./android-icons/
COPY android-signing/android-signing/. ./android-signing/

ENV TAURI_ENV_FILE=.env.tauri.android
RUN npm run build:tauri   # gera out/ com output: export

RUN npx tauri android init --ci
# injeta permissão BILLING no AndroidManifest.xml se algum plugin IAP for stub-aliased
# injeta google-services.json + classpath Firebase se usar FCM nativo
# injeta signingConfigs a partir de env vars ORG_GRADLE_PROJECT_RELEASE_*
RUN npx tauri android build --aab --apk --target aarch64 --ci

# zipalign + apksigner (APK) / jarsigner (AAB)
```

**Por que sempre reinstalar `node_modules` dentro do container**: dependências nativas
(`@next/swc-*`, bindings do Tauri CLI) são compiladas pra plataforma específica — se você copiar
`node_modules` de um host Windows/macOS, os binários nativos não funcionam no container Linux.
Sempre `npm ci`/`npm rebuild` de dentro do container, nunca copiar `node_modules` do host.

## Ícones Android: gerados localmente, commitados, só copiados no CI

O container de build não tem ImageMagick — ele **copia** ícones já prontos de `android-icons/`
no repo, não os gera. O fluxo correto:

```bash
# Local, uma vez (ou toda vez que o ícone mudar), exige ImageMagick instalado:
npm run android:icons   # roda scripts/generate-android-icons.js, escreve em android-icons/*

git add android-icons/   # OBRIGATÓRIO commitar — sem isso o CI não tem os ícones
```

`android-icons/` **não pode** estar no `.gitignore` — diferente do resto dos artefatos de build,
que geralmente são ignorados.

## GitHub Actions — build e publicação do APK

Workflow disparado por tag (`v*.*.*`) ou manualmente (`workflow_dispatch`, com escolha de
track: internal/alpha/beta/production):

```yaml
name: Android Release
on:
  push:
    tags: ['v*.*.*']
  workflow_dispatch:
    inputs:
      track:
        type: choice
        options: [internal, alpha, beta, production]
      deploy_play:
        type: boolean
        default: true

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4

      # Runners hospedados têm pouco espaço em disco — builds Android/Rust não cabem sem isso
      - name: Libera espaço em disco
        run: |
          sudo rm -rf /usr/share/dotnet /opt/ghc /usr/local/lib/android/sdk/ndk
          sudo swapoff -a
          sudo fallocate -l 8G /swapfile && sudo chmod 600 /swapfile
          sudo mkswap /swapfile && sudo swapon /swapfile

      - name: Decodifica keystore de assinatura
        run: echo "${{ secrets.ANDROID_KEYSTORE_BASE64 }}" | base64 -d > android-signing/release.jks

      - name: Build via Docker
        run: docker build -f Dockerfile.android -t app-android-build .

      - name: Extrai APK/AAB do container
        run: |
          docker create --name extract app-android-build
          docker cp extract:/app/src-tauri/gen/android/app/build/outputs/apk ./output/apk
          docker cp extract:/app/src-tauri/gen/android/app/build/outputs/bundle ./output/aab
          docker rm extract

      - name: Cria GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            output/apk/**/*.apk
            output/aab/**/*.aab
        # Release do GitHub ANTES do upload à Play Store: falha de compliance na Play Store
        # não pode bloquear a disponibilidade do APK pra quem já tem o link direto.

      - name: Upload para Google Play
        if: inputs.deploy_play != false
        uses: r0adkll/upload-google-play@v1
        continue-on-error: true   # falha de compliance da Play Store não derruba o workflow inteiro
        with:
          serviceAccountJsonPlainText: ${{ secrets.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON }}
          packageName: com.suaempresa.seuapp
          releaseFiles: output/aab/**/*.aab
          track: ${{ inputs.track || 'production' }}
```

**Gotcha real documentado**: um dos apps teve um bug onde, em push de tag (sem especificar
track manualmente), o upload caía silenciosamente em `internal` em vez de `production` —
sempre declare um default explícito pro `track`, nunca deixe a lib assumir.

**Versionamento**: `versionName` deriva da tag git (`v1.2.3` → `1.2.3`). `versionCode` (inteiro
que o Play Store usa pra saber se é uma versão mais nova) tem duas estratégias observadas:
epoch em minutos (garante monotonicidade estrita, sempre crescente, sem risco de colisão) ou
fórmula determinística a partir do semver (`major*1_000_000 + minor*10_000 + patch`). Prefira
epoch em minutos se builds manuais/re-releases da mesma versão são possíveis; a fórmula semver
falha se você precisar re-publicar a mesma versão duas vezes.

## docker-compose de produção (Coolify)

```yaml
networks:
  coolify:
    external: true   # Coolify provê Postgres/Redis gerenciados externamente

services:
  web:
    build: { context: ., dockerfile: Dockerfile }
    ports: ["3000:3000"]
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits: { cpus: '1', memory: 1G }
    networks: [coolify]

  cron:
    build: { context: ./cron }
    # container separado rodando `crond`, sem acesso direto ao banco —
    # só chama rotas HTTP protegidas por CRON_SECRET no serviço `web`
    networks: [coolify]
```

**Implemente sempre `GET /api/health`** — um dos apps analisados referenciava essa rota no
healthcheck do compose, mas ela não existia de fato no código-fonte (gap real encontrado na
auditoria). Rota mínima:

```ts
// app/api/health/route.ts
export async function GET() {
  try {
    await db.query('SELECT 1')
    return Response.json({ status: 'ok' })
  } catch {
    return Response.json({ status: 'error' }, { status: 503 })
  }
}
```

## Cron sem plataforma serverless (sem Vercel Cron)

Como o deploy é um container Docker próprio (não Vercel/Netlify), cron jobs são implementados
com um **container dedicado** rodando `crond` (Alpine), que bate em rotas HTTP protegidas por
secret — nunca lógica de cron dentro do processo principal do Next.js:

```dockerfile
# cron/Dockerfile
FROM alpine:3.19
RUN apk add --no-cache curl
COPY crontab /etc/crontabs/root
COPY run-job.sh /usr/local/bin/run-job.sh
CMD ["crond", "-f", "-l", "2"]
```

```
# cron/crontab
0 * * * * /usr/local/bin/run-job.sh notifications
0 6 * * * /usr/local/bin/run-job.sh reconcile-google-play-subscriptions
```

```sh
# cron/run-job.sh — captura status HTTP real, não confia em `curl -sf` silencioso
#!/bin/sh
JOB="$1"
STATUS=$(curl -s -o /tmp/response.json -w "%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "https://seudominio.com/api/cron/$JOB")
if [ "$STATUS" != "200" ]; then
  curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
    "https://seudominio.com/api/cron/alert-failure" \
    -d "{\"job\":\"$JOB\",\"status\":$STATUS}"
fi
```

O container cron não tem acesso a SMTP/infra de notificação — ele avisa o serviço `web` (que
tem) via uma rota HTTP dedicada de alerta, em vez de tentar montar sua própria notificação.

## Checklist para um app novo

- [ ] `Dockerfile` multi-stage (deps/builder/runner), usuário não-root no runner
- [ ] Valores dummy de env só em build-time, nunca reais — segredos reais só em runtime
- [ ] Migrations e seed rodam no entrypoint (runtime), nunca durante o build da imagem
- [ ] `docker-entrypoint.sh` com retry loop pra aguardar o banco ficar pronto
- [ ] Se `pg` puro: script de migration com transação por arquivo + tabela `schema_migrations`
- [ ] `Dockerfile.android` separado, Ubuntu base, toolchain completa, `node_modules` reinstalado
      dentro do container (nunca copiado do host)
- [ ] Ícones Android gerados localmente e commitados em `android-icons/` (fora do `.gitignore`)
- [ ] GitHub Actions com liberação de espaço em disco + swap antes do build Android
- [ ] Track do Google Play sempre explícito no workflow, nunca implícito
- [ ] `GET /api/health` implementado de verdade (não só referenciado no compose)
- [ ] Cron via container dedicado batendo em rotas HTTP protegidas por secret, nunca setInterval
      dentro do processo principal
