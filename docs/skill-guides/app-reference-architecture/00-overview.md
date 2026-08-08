# Arquitetura de Referência — Apps Next.js + Tauri (Felipe/FV)

> Documento gerado em 2026-08-08 a partir de engenharia reversa de 3 apps em produção:
> **gastos-app** (Cadê o Dinheiro), **memrapp** (Memra), **personal-styslist-ai** (VisaLab).
> Objetivo: extrair o "molde" arquitetural comum aos três para que todo app novo nasça
> na mesma estrutura, sem reinventar auth, pagamento, push, build Tauri, Docker e CI/CD
> a cada projeto.

Este é o índice. Os outros arquivos desta pasta detalham cada dimensão:

| Arquivo | Conteúdo |
|---|---|
| [01-stack-e-estrutura.md](01-stack-e-estrutura.md) | Stack base, estrutura de pastas, convenções de env vars |
| [02-autenticacao-dual.md](02-autenticacao-dual.md) | NextAuth/Supabase web + JWT/Bearer Tauri, CORS, middleware |
| [03-tauri-build-estatico.md](03-tauri-build-estatico.md) | Script de swap de config, blackout de rotas server-side, detecção runtime |
| [04-pagamentos.md](04-pagamentos.md) | Stripe + Google Play IAP + Pix, webhooks, modelo de Subscription, créditos |
| [05-push-notifications.md](05-push-notifications.md) | FCM, Web Push/VAPID, ntfy, notificação local, plugins Tauri Rust custom |
| [06-docker-cicd.md](06-docker-cicd.md) | Dockerfiles multi-stage, entrypoints, GitHub Actions Android, Coolify |
| [07-analytics-observability.md](07-analytics-observability.md) | GA4, Google Ads, cron jobs, health checks, admin panel |
| [08-worker-e-filas.md](08-worker-e-filas.md) | Padrão avançado do VisaLab: BullMQ, worker separado, robustez operacional |
| [09-decisoes-e-variantes.md](09-decisoes-e-variantes.md) | Onde os 3 apps divergem e por quê — guia de decisão pra apps novos |

## Os 3 apps de referência

### gastos-app (Cadê o Dinheiro)
Next.js 16 + Prisma/PostgreSQL + NextAuth (web) + JWT custom (Tauri) + Stripe + Google Play IAP
+ FCM/Web Push + Docker + GitHub Actions (Android). O app **mais "canônico"** dos três — dual
auth simples com secret compartilhado, build Tauri via script de swap de config bem documentado,
multi-pagamento convergindo numa única tabela `Subscription`.

### memrapp (Memra)
Next.js 16 + PostgreSQL puro (sem ORM, `pg` direto) + Supabase Auth (só identity, não dados) +
Stripe + Google Play IAP + Pix (Abacate Pay) + push tri-canal (FCM + ntfy + local) + arquitetura
de dados em 3 camadas (Supabase auth / Postgres Docker fonte de verdade / SQLite client-side
offline-first) + cron via container dedicado (25 jobs) + plugins Tauri Rust customizados
(`tauri-plugin-fcm`, `tauri-plugin-install-referrer`).

### personal-styslist-ai (VisaLab)
Monorepo pnpm workspaces (`apps/web` + `apps/mobile` + `packages/*` compartilhados) + Prisma/
PostgreSQL + NextAuth + JWT custom + worker BullMQ separado (Redis, múltiplas filas/crons,
heartbeat, job timeout, reaper de jobs órfãos) + multi-provider de pagamento via registry pattern
(Stripe + Mercado Pago + Abacate Pay) + Google Play IAP com plugin Rust custom + sistema de
créditos com ledger append-only + MinIO para storage de imagens + pipeline de IA em 3 estágios
(OpenAI Vision + FAL.AI). **O app mais avançado operacionalmente** — é a referência para apps
que processam IA de forma assíncrona/pesada.

## O molde comum (TL;DR)

Todo app novo deste "family pattern" segue esta espinha dorsal:

1. **Next.js App Router**, TypeScript, deploy web via Docker + Coolify.
2. **Tauri v2** para gerar APK Android a partir do MESMO código-fonte, via um script de build
   que troca `next.config.mjs`/`.env.local` e "apaga" temporariamente tudo que não sobrevive a
   `output: 'export'` (API routes, Server Actions, `getServerSession`/`cookies()` em Server
   Components) — restaurando tudo no `finally`.
2. **Auth dual**: cookie de sessão para a web, Bearer token (JWT ou Supabase access token) para
   o app Tauri, resolvido pela MESMA função de auth em cada rota de API (checa header
   `Authorization` primeiro, cai pro cookie se ausente).
3. **Pagamento dual**: Stripe (cartão, web e Tauri via checkout externo) + Google Play Billing
   (IAP nativo, obrigatório pela política do Play Store quando o app vende conteúdo digital) +
   opcionalmente Pix (BR). Tudo converge para uma tabela `Subscription`/`subscriptions` única
   com campo `platform`/`source` para saber a origem.
4. **Push dual**: Web Push (VAPID) pra PWA/browser + FCM (Firebase Admin SDK) pro Android via
   Tauri, com um plugin Rust custom quando se quer push nativo real (não apenas WebView).
5. **CI/CD**: nenhum workflow builda o APK localmente em produção — sempre via GitHub Actions
   rodando um `Dockerfile.android` (Ubuntu + Node + Java 17 + Rust + Android SDK/NDK), assinado
   com keystore vindo de secret base64, publicado via `r0adkll/upload-google-play@v1`. Deploy web
   é via Coolify observando o repo Git (sem workflow de deploy custom).
6. **Ícones Android são pré-gerados e commitados** — o container de build não tem ImageMagick,
   só copia.

## Como usar esta documentação

Se você (ou um agente) está começando um app novo que precisa desse pacote completo (login +
pagamento + push + landing + app web + APK + deploy), leia os arquivos 01 a 07 em ordem — cada
um tem exemplos de código extraídos dos 3 apps reais, com decisão de "qual variante escolher"
quando os apps divergem (ver 09). Se o app precisar de processamento assíncrono pesado (IA,
imagem, filas), leia também o 08.

Essa mesma documentação foi condensada na skill `59-app-reference-architecture` do
`claude-skills-fv`, para uso direto por agentes Claude Code em projetos novos.
