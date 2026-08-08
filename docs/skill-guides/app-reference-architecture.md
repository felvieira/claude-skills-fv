# App Reference Architecture — Índice do Guia Detalhado

> Este guia é grande demais (~2500 linhas) para um único arquivo — está modularizado em
> `docs/skill-guides/app-reference-architecture/`. Leia o arquivo específico que precisar, não
> todos de uma vez.

| Arquivo | Conteúdo | Quando consultar |
|---|---|---|
| [00-overview.md](app-reference-architecture/00-overview.md) | Resumo dos 3 apps de origem e o molde comum (TL;DR) | Primeira leitura, visão geral |
| [01-stack-e-estrutura.md](app-reference-architecture/01-stack-e-estrutura.md) | Stack base, Prisma vs `pg` puro, route groups, convenção de env vars, monorepo vs single-app | Setup inicial do projeto |
| [02-autenticacao-dual.md](app-reference-architecture/02-autenticacao-dual.md) | JWT custom vs Supabase Auth, CORS Tauri, middleware bypass, código de referência completo | Implementando auth |
| [03-tauri-build-estatico.md](app-reference-architecture/03-tauri-build-estatico.md) | Script de build Tauri, blackout de rotas server-side, stubs client-side, workarounds Windows/Docker | Configurando o build do APK |
| [04-pagamentos.md](app-reference-architecture/04-pagamentos.md) | Stripe + Google Play IAP + Pix, schema de Subscription, webhooks idempotentes, sistema de créditos | Implementando pagamento |
| [05-push-notifications.md](app-reference-architecture/05-push-notifications.md) | Web Push/VAPID, FCM, plugins Tauri Rust custom, ntfy (avançado) | Implementando push |
| [06-docker-cicd.md](app-reference-architecture/06-docker-cicd.md) | Dockerfiles multi-stage, entrypoint com migrations, GitHub Actions Android, Coolify | Configurando deploy/CI |
| [07-analytics-observability.md](app-reference-architecture/07-analytics-observability.md) | GA4 server-side, cron sem serverless, health checks, painel admin | Configurando observability |
| [08-worker-e-filas.md](app-reference-architecture/08-worker-e-filas.md) | BullMQ, robustez operacional (heartbeat, timeout, reaper, GC) — só se o app processa algo pesado | Se a variante escolhida precisa de worker |
| [09-decisoes-e-variantes.md](app-reference-architecture/09-decisoes-e-variantes.md) | Tabela de trade-off de cada decisão + recomendação por tipo de app | Ao decidir entre as variantes |

## Origem

Extraído por engenharia reversa em 2026-08-08 de 3 apps reais em produção do autor:
**gastos-app** (Cadê o Dinheiro), **memrapp** (Memra), **personal-styslist-ai** (VisaLab). Cópia
completa também disponível em `C:\Users\Administrador\Downloads\arquitetura-referencia-apps\`
para consulta fora do contexto de skill.
