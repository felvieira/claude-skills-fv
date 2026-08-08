---
name: app-reference-architecture
description: |
  Molde arquitetural completo para apps novos que precisam de login, pagamento, push, landing
  page, web app e APK Android a partir do mesmo codigo-fonte (Next.js + Tauri v2), deploy via
  Docker/Coolify e build/publicacao de APK via GitHub Actions. Extraido por engenharia reversa de
  3 apps reais em producao do autor (gastos-app, memrapp, VisaLab) para que todo app novo nasca na
  mesma estrutura testada, sem reinventar auth dual, build estatico Tauri, multi-pagamento
  (Stripe + Google Play IAP + Pix) ou push multi-canal a cada projeto.
  Trigger em: "novo app", "app do zero", "greenfield mobile", "Next.js + Tauri", "APK do zero",
  "arquitetura de referencia", "auth dual web e app", "gerar APK a partir do Next.js",
  "template de SaaS", "monetizar app mobile", "Google Play IAP", "assinatura Stripe e Play Store",
  "mesma estrutura dos outros apps", "boilerplate de app", "starter kit mobile+web".
argument-hint: "[--fase=setup|auth|pagamento|push|tauri|docker|cicd] [--app-tipo=saas-simples|conteudo|ia-pesada]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# App Reference Architecture — Molde Next.js + Tauri para Apps Novos

Skill de arquitetura de referência. Não resolve um domínio de negócio — resolve a espinha
dorsal técnica que todo app novo do autor precisa (auth dual, pagamento dual, push dual, build
Tauri, Docker, CI/CD) para que um app novo comece na estrutura já validada em produção, em vez de
reinventar essas decisões a cada projeto.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`,
`policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`,
`policies/tool-safety.md` e `policies/evals.md`.

Para exemplos de código completos e comparação linha a linha entre as variantes dos 3 apps de
origem, consultar `docs/skill-guides/app-reference-architecture.md` apenas quando necessário —
este SKILL.md cobre o suficiente para decisões e setup inicial.

Complementa e não substitui `03-backend-api`, `15-mobile-tauri`, `07-deploy-docker` e
`25-ai-integration-architect` — esta skill decide a ARQUITETURA GERAL (quais peças existem, como
se encaixam); as skills de domínio implementam cada peça em profundidade.

## Quando Usar

- iniciar um app novo que precisa de login web + app nativo Android a partir do mesmo código
- decidir como estruturar auth para servir web (cookie) e Tauri/APK (Bearer token) ao mesmo tempo
- integrar pagamento que precisa funcionar tanto na web (Stripe) quanto dentro de um APK
  distribuído pela Play Store (Google Play Billing é obrigatório nesse caso)
- configurar push notification que funcione em PWA (Web Push) e Android nativo (FCM)
- resolver o problema de rodar Next.js App Router (Server Components, Server Actions, API routes)
  dentro de um build estático do Tauri (`output: 'export'`)
- montar Dockerfile + GitHub Actions para publicar automaticamente um APK assinado na Play Store
- decidir se um app precisa de monorepo, worker assíncrono (BullMQ), ou sistema de créditos —
  ou se a versão simples (single-app, sem worker, assinatura pura) já resolve

## Quando Nao Usar

- app que é só web, sem plano de virar APK/app nativo (não precisa da complexidade de auth dual,
  build Tauri, IAP) — nesse caso, `03-backend-api` + `04-frontend-integration` bastam
- app que é só mobile nativo (Swift/Kotlin puro, sem camada Next.js compartilhada) — Tauri não se
  aplica, essa skill não ajuda
- decisão de UI/UX, copy de marketing, ou SEO da landing — use `02-ui-ux-design`,
  `13-marketing-copy`, `14-seo-specialist`
- implementação detalhada de uma única peça já decidida (ex: só escrever o webhook do Stripe) —
  use `03-backend-api` direto, esta skill é para a decisão de arquitetura geral, não a
  implementação linha a linha de cada endpoint

## Entradas Esperadas

- que tipo de app está sendo criado (SaaS simples / conteúdo com IA leve / IA pesada com
  processamento assíncrono) — determina qual variante de cada decisão usar (ver seção Variantes)
- se o app precisa de APK Android desde o início ou só mais adiante
- público-alvo (BR-only afeta decisão de Pix; internacional não precisa)
- se já existe alguma decisão herdada (ex: "já decidimos usar Supabase") que restringe as opções

## Saidas Esperadas

- decisão registrada de cada peça (auth, ORM, pagamento, push, monorepo ou não, worker ou não)
  com justificativa curta, não só a escolha
- estrutura de pastas inicial do projeto (route groups, `api/`, `actions/`, `lib/`)
- arquivos de configuração base: `next.config.ts` + `next.config.tauri.mjs`,
  `scripts/build-tauri.js`, `.env.example` comentado, `Dockerfile` + `Dockerfile.android`,
  workflow `.github/workflows/android-release.yml`
- handoff claro para as skills de implementação (backend, frontend, deploy) com a arquitetura já
  decidida, para não retrabalhar decisão estrutural no meio da implementação

## Responsabilidades

### 1. Levantar o tipo de app e mapear pra uma variante de referência

Antes de decidir qualquer peça isolada, classificar o app numa das 3 famílias (ver
`docs/skill-guides/app-reference-architecture.md` seção "Resumo — pontos de partida" para o
detalhe de cada uma):

- **SaaS simples** (dashboards, produtividade, finanças pessoais) → Prisma, JWT custom, single
  app, Stripe+IAP, Web Push+FCM, sem worker, sem créditos — padrão gastos-app.
- **Conteúdo/comunidade com IA leve** (chat, personas, multi-persona de IA em texto) → considerar
  Supabase Auth se OAuth pronto importa, Pix se público for BR, avaliar push tri-canal só se
  precisar de tempo real — padrão memrapp.
- **IA pesada** (geração de imagem/vídeo, análise de arquivo, processamento >10s) → Prisma, worker
  BullMQ obrigatório, sistema de créditos (custo variável real por uso), monorepo só se mobile e
  web realmente divergirem em feature set — padrão VisaLab.

Se o usuário não souber, perguntar: "o app processa algo pesado por usuário (IA de imagem/vídeo,
arquivo grande) ou é majoritariamente CRUD/dashboard?" — essa resposta sozinha decide worker e
créditos, os dois itens de maior custo de implementação.

### 2. Auth dual (web + Tauri)

Decidir entre JWT custom (secret compartilhado com NextAuth) ou Supabase Auth com resolução em
cascata (Bearer token → cookie). Ver seção "1. Auth" em
`docs/skill-guides/app-reference-architecture.md` para o código de referência de cada variante,
CORS allowlist obrigatória para origens Tauri, e o middleware bypass seguro.

Regra não-negociável, independente da variante: **uma única função central de auth chamada por
toda rota de API protegida** — nunca duplicar a checagem de sessão rota a rota.

### 3. Build estático do Tauri sobre o App Router

Esta é a peça mais técnica e mais fácil de fazer errado. O padrão é sempre: script que faz
backup/swap de config e env, "apaga" temporariamente (renomeia, nunca deleta) tudo que não
sobrevive a `output: 'export'` (API routes, Server Actions, layouts com `getServerSession()`),
builda, e restaura tudo no `finally` — nunca manter dois códigos-fonte permanentemente
divergentes. Ver seção "2. Build Tauri" no guia detalhado para o script de referência completo.

Verificar SEMPRE, ao planejar uma feature nova: se ela usa Server Action, existe (ou vai existir)
uma rota de API irmã que o stub client-side do build Tauri pode chamar? Decidir isso no design da
feature, não depois que o build Tauri já quebrou.

### 4. Pagamento dual (Stripe + Google Play IAP [+ Pix])

Google Play Billing não é opcional se o app vende assinatura/conteúdo dentro de um APK publicado
na Play Store — é exigência de política da plataforma. Modelo de dados sempre unificado: uma
única tabela `Subscription` com campo `platform`/`status` cobrindo `active`/`trialing`/
`grace_period`/`canceled`/`past_due`/`account_hold` — nunca uma tabela por provider, nunca um
campo booleano solto `isPremium`. RTDN do Google Play é push-only sem garantia — sempre com cron
de reconciliação diário. Ver seção "3. Pagamentos" no guia para schema completo, webhook
idempotente, e quando vale sistema de créditos em vez de assinatura pura.

### 5. Push dual (Web Push + FCM)

Web Push (VAPID) para PWA/browser, FCM (Firebase Admin SDK, credencial JSON base64 numa env var)
para Android via Tauri. Função central que envia pros dois canais em paralelo, filtra por
segmento, limpa tokens inválidos automaticamente. ntfy self-hosted como terceiro canal é
avançado/opcional — só adicionar se o produto precisa de atualização em tempo real com o app em
foreground. Ver seção "4. Push" no guia.

### 6. Docker + CI/CD

`Dockerfile` multi-stage (deps/builder/runner) pro web, `Dockerfile.android` separado (Ubuntu +
Node + Java 17 + Rust + Android SDK/NDK) pro build do APK — sempre dentro de container, nunca
build local em produção. GitHub Actions dispara por tag, publica via
`r0adkll/upload-google-play@v1`. Deploy web via Coolify observando o Git, sem workflow de deploy
customizado. Ver seção "5. Docker/CI-CD" no guia para os Dockerfiles e workflow completos.

### 7. Registrar a decisão e entregar para implementação

Depois de decidida cada peça, produzir um resumo curto (não um documento longo) com: variante
escolhida por peça + 1 linha de justificativa, e entregar para `03-backend-api`/
`04-frontend-integration`/`07-deploy-docker` implementarem. Esta skill não escreve a
implementação completa do zero — decide a arquitetura e aponta pros exemplos de referência.

## Variantes — tabela de decisão rápida

| Peça | Opção A | Opção B | Default recomendado |
|---|---|---|---|
| Auth | JWT custom (secret compartilhado c/ NextAuth) | Supabase Auth (cascata Bearer→cookie) | A, salvo se já usa Supabase |
| ORM | Prisma | `pg` puro + migrations SQL | Prisma |
| Estrutura | Single Next.js app | Monorepo pnpm workspaces | Single-app, migrar só sob dor real |
| Pagamento | Stripe + Google Play IAP | + Pix (Abacate Pay/Mercado Pago) | A é o mínimo obrigatório; Pix só se público BR |
| Push | Web Push + FCM | + ntfy self-hosted (tri-canal) | A, tri-canal só se precisar tempo real |
| Cobrança | Assinatura pura (free/premium) | Sistema de créditos (ledger) | A, créditos só se custo variável por uso for alto |
| Processamento | Síncrono (rota de API normal) | Worker separado (BullMQ + Redis) | A, worker só se operação não cabe em request/response |

Detalhe completo de cada trade-off em `docs/skill-guides/app-reference-architecture.md`, seção
"Guia de Decisão".

## Anti-Padroes

### "Reimplementar a checagem de auth em cada rota"
Gera drift entre rotas (uma esquece de checar o Bearer, outra esquece o cookie). Sempre uma
função central (`getAuthUserId`/`getAuthenticatedUser`) chamada por toda rota protegida.

### "Deletar em vez de renomear no script de build Tauri"
Se o script de build estático deleta arquivos (API routes, layouts) em vez de renomear pra
`.bak`, uma interrupção no meio do build (Ctrl+C, crash) deixa o código-fonte real quebrado
permanentemente. Sempre rename + restore no `finally`, nunca delete.

### "Campo booleano solto pra saber se é pagante"
`isPremium: boolean` fica dessincronizado do `status` real da assinatura assim que existe
`grace_period`/`trialing`/`account_hold`. Sempre uma função central que resolve o plano a partir
do `status` + datas, lida toda vez, nunca um campo mutado em paralelo.

### "Confiar 100% em webhook sem cron de reconciliação"
Todo webhook (Stripe, RTDN do Google Play) pode falhar silenciosamente em entregar um evento.
Todo sistema de pagamento precisa de um cron de reconciliação que confere o estado real via API
do provider e corrige divergência — sem isso, "paguei mas continuo free" é bug de produção
inevitável, não hipotético.

### "Stub do build Tauri divergindo do código real sem aviso"
Quando um layout/página tem uma versão real (com `getServerSession()`) e uma versão stub (usada
só durante o build Tauri), mudar a lógica de uma sem atualizar a outra é bug garantido e
silencioso — só aparece testando o APK. Deixar comentário cruzado nos dois arquivos apontando um
pro outro.

### "Adicionar worker/créditos/monorepo por precaução"
Essas três peças são a maior fonte de complexidade evitável. Só adicionar sob sinal concreto (ver
tabela de decisão) — "pode ser que precise no futuro" não é sinal concreto.

## Evidencia de Conclusao

- variante de cada peça (auth, ORM, pagamento, push, estrutura, cobrança, processamento) decidida
  e justificada, não deixada em aberto
- estrutura de pastas inicial criada seguindo o padrão de route groups
- `.env.example` comentado variável por variável desde o commit inicial
- script de build Tauri com padrão backup/swap/restore implementado antes da primeira feature
- handoff registrado para as skills de implementação com a arquitetura já fechada

## Handoff

### Recebe de
- **Orchestrator (skill 09)**: quando a task classificada é "app novo greenfield com mobile"
- **Program Router (skill 39)**: via program `adversarial-dev` ou composição ad-hoc quando o
  usuário pede um app do zero com o pacote completo (login+pagamento+push+APK)

### Entrega para
1. **Backend Developer (skill 03)**: implementa as rotas de API decididas (auth, pagamento,
   push, cron) seguindo os exemplos de referência do guia
2. **Frontend Developer (skill 04)**: implementa hooks (`useTauriSafeSession`), interceptor de
   fetch, componentes de UI que respeitam `isTauri()`
3. **Mobile/Desktop Developer (skill 15)**: setup detalhado do Tauri em si (permissões, ícones,
   plugins nativos) — esta skill decide QUE Tauri é usado e COMO se integra ao build; a 15
   aprofunda a configuração Tauri isolada
4. **DevOps/Deployer (skill 07)**: Dockerfiles e workflow de CI/CD detalhados a partir da decisão
   desta skill
5. **AI Integration Architect (skill 25)**: se a variante escolhida for "IA pesada", aprofunda o
   pipeline de IA/worker além do que esta skill decide na arquitetura geral

## Integracao com Pipeline

- Chamada no início de qualquer app novo greenfield que precisa da stack completa (web+APK+
  pagamento+push) — antes de `01-po-feature-spec` definir features específicas de domínio, essa
  skill já deveria ter decidido a espinha dorsal técnica
- Não substitui `18-repo-auditor` — se o app já existe e a dúvida é "como esse repo já estruturou
  isso", use o Repo Auditor primeiro para mapear o estado real antes de aplicar esta skill
- Consome os mesmos princípios de `15-mobile-tauri` (Tauri v2, build nativo) mas foca na
  integração completa com auth/pagamento/push — a 15 é mais genérica (qualquer app Tauri, mesmo
  sem esse pacote de monetização)
- Registra decisão para `10-documenter` gerar o ADR correspondente se a decisão for não-óbvia
  (ex: por que Supabase em vez de JWT custom neste app específico)
