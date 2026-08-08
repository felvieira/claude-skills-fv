---
description: Sintetiza repo-audit + detective-spec + narrativa de produto em .project-memory/manifest.yaml versionado no repo consumidor
---

# catalog-project

Objetivo: criar ou atualizar `.project-memory/manifest.yaml` no repo consumidor com stack, capacidades, integrações e narrativa de produto rastreáveis a evidência.

Fluxo:
- rodar dentro do repo consumidor (raiz do produto, não do kit)
- se `docs/repo-audit/current.md` não existir ou estiver desatualizado → disparar `Repo Auditor` primeiro
- se `_detective_sdd/00-overview.md` não existir → disparar `Detective Spec` primeiro (ou usar o que já existir)
- procurar conteúdo de produto no repo consumidor de forma exaustiva, não superficial — o objetivo é que quem ler a seção `product` do manifest tenha tudo que precisa pra escrever um post/anúncio externo sem re-perguntar a uma IA "o que esse sistema faz": `README.md` inteiro (não só o primeiro parágrafo), `docs/pricing*`, `docs/landing*`, páginas de marketing/landing dentro de `app/`/`src/` (seção hero, FAQ, tabela de planos), `CHANGELOG.md` para funcionalidades recentes, e também `_detective_sdd/00-overview.md`/`02-business-rules/` já gerados neste mesmo fluxo — usar o que existir, nunca inventar
  - `product.summary`: o que o produto É (1-2 frases)
  - `product.problemSolved`: que dor/problema ele resolve pro usuário — distinto do summary, foca na motivação de uso, não na descrição funcional
  - `product.features`: lista EXAUSTIVA de funcionalidades voltadas a usuário (não técnicas) — varrer README completo + CHANGELOG + `_detective_sdd/00-overview.md`, não parar nas primeiras 3-4 óbvias
  - `product.monetization`: como o produto ganha dinheiro em linguagem simples — ex. "freemium com upgrade pago", "100% gratuito, sem monetização", "paga por uso via créditos consumíveis". Derivar da presença/ausência real de billing (`docs/repo-audit/current.md`, capabilities de billing) cruzado com o que o README/pricing diz
  - `product.plans`: TODOS os planos encontrados, com preço e a lista completa de limites/features de cada um — não resumir "vários planos", listar cada um
- procurar histórico de sessões em `docs/context/session-*.md` do repo consumidor (formato gerado por `31-session-summary`) — se existirem, sintetizar cada arquivo numa entrada de `sessions:` (ver schema abaixo); se não existir nenhum, omitir a seção inteira (nunca inventar sessão)
- procurar dados operacionais no repo consumidor: `.env`, `.env.example`, `.env.production` (para envVars), `docker-compose.yml`/`vercel.json`/`README.md`/`DEPLOY.md` (para addresses de produção — domínio, URL da API, dashboard), e qualquer doc com métricas já coletadas (ex. `docs/metrics.md`, seção de analytics no README) — sintetizar em `operations:` (ver schema abaixo)
  - **AVISO DE SEGURANÇA — decisão explícita do usuário, não default do kit**: `operations.envVars[].value` grava o VALOR REAL de cada variável, incluindo secrets (API keys, senhas de banco, tokens), lido diretamente do `.env` do repo consumidor. Isso deixa credenciais em texto puro dentro de `manifest.yaml`, versionado no git do repo consumidor, e visível a qualquer agente de IA que consultar o project-brain (UI ou MCP). Só prossiga com valores reais se o usuário já confirmou esse tradeoff nesta conversa — se não tiver certeza, pare e confirme antes de ler qualquer `.env`. Se o usuário preferir a opção segura, grave só `name` (sem `value`) por variável, extraído de `.env.example`
  - **antes de gravar qualquer valor real de env var**: rodar `git remote -v` no repo consumidor. Se houver QUALQUER remote configurado (GitHub, GitLab, servidor próprio, não importa se privado ou público) — avisar o usuário explicitamente ("este repo tem remote configurado: `<url>`; secrets gravados no manifest vão junto no próximo push, mesmo que o repo seja privado hoje") e aguardar confirmação antes de prosseguir com valores reais. Sem remote (`git remote -v` vazio) → repo é só local, pode prosseguir sem essa pausa adicional (mas o aviso do item acima ainda vale)
- procurar instrumentação de tracking/analytics no repo consumidor: `docs/tracking*`, `TRACKING_PLAN.md`, arquivos de eventos (ex. `lib/analytics/*`, `*/events.ts`), e chamadas reais no código (`gtag(...)`, `window.gtag`, SDK do GA4/Google Ads/Meta Pixel, `analytics.track(...)`) — sintetizar em `analytics:` (ver schema abaixo). Cada evento listado precisa apontar pra onde foi encontrado (`source: <file:line ou doc>`); nunca inventar nome de evento ou funil que não esteja no código/doc. Se o repo não tem nenhuma chamada de tracking nem doc de plano, omitir a seção inteira
- sintetizar tudo em `.project-memory/manifest.yaml` seguindo o schema:

```yaml
schemaVersion: 1

project:
  id: <slug-kebab-case do nome do repo>
  name: <Nome Legível>
  path: <caminho absoluto do repo>

status: production  # production | active | paused | archived — inferir do estado do repo (git log recente, presença de deploy config, etc) ou perguntar se ambíguo

stack:
  frontend: [...]
  backend: [...]
  database: [...]
  auth: [...]
  # outras categorias conforme detectado

capabilities:
  <nome-capacidade>: true|false
  # extraído de _detective_sdd/01-modules/ e 02-business-rules/ — o que o sistema realmente faz

integrations:
  - name: <nome do serviço externo>
    category: <pagamento|ia|storage|email|...>
    mode: <opcional>
    internalDependency: <opcional — id de OUTRO projeto catalogado em project-brain.config.json, só se essa integração for na verdade uma chamada de infra pra outro produto seu, ex. "SMTP via creator-api" onde "creator-api" também está catalogado>
    # outras categorias conforme detectado

product:
  # OPCIONAL — só preencher se houver fonte real (README/landing/pricing/changelog) no repo consumidor.
  # Nunca inventar copy de marketing que não exista no repo — se não houver fonte, omitir a seção inteira.
  # Objetivo: quem ler isso deve ter tudo pra escrever um post externo sobre o produto sem perguntar de novo.
  summary: <1-2 frases do que o produto é e faz, extraído do README/hero da landing>
  problemSolved: <qual dor/problema real o produto resolve pro usuário — motivação de uso, não descrição funcional>
  valueProposition: <a frase de proposta de valor, se existir explicitamente em algum lugar>
  features: [...]           # lista EXAUSTIVA de funcionalidades em linguagem de usuário — varrer README completo + CHANGELOG + overview, não parar nas óbvias
  values: [...]              # princípios/valores declarados do produto, se existirem (ex. "privacy-first", "self-host friendly")
  monetization: <como o produto ganha dinheiro em linguagem simples — "freemium", "100% gratuito", "paga por créditos", etc — só se houver evidência real>
  plans:                     # TODOS os planos encontrados, com preço e lista completa de limites/features de cada um
    - name: <nome do plano>
      price: <opcional>
      features: [...]
  faq:                        # só se houver FAQ real no repo
    - question: <pergunta>
      answer: <resposta>

analytics:
  # OPCIONAL — só preencher com evidência real de tracking no repo consumidor (docs/tracking*, TRACKING_PLAN.md, chamadas gtag/GA4/Ads/Meta Pixel no código).
  # Objetivo: mostrar o que é medido, quando dispara, e em qual funil — pra criador de SaaS bater o olho sem reconstruir isso do zero.
  platforms: [...]           # plataformas de tracking realmente conectadas, ex. "Google Ads (conversion tracking)", "GA4" — não aspiracional
  events:
    - name: <nome literal do evento como disparado no código, ex. "sign_up">
      trigger: <o que o usuário faz pra disparar, e onde no fluxo>
      funnel: <opcional — estágio/funil que esse evento pertence, se o tracking plan agrupar assim>
      source: <onde foi encontrado — file:line ou caminho de doc>
  funnels: [...]              # funis nomeados descritos no tracking plan, texto livre, ex. "Onboarding: signup → email_verified → first_note_created"

sessions:
  # OPCIONAL — só preencher a partir de docs/context/session-YYYY-MM-DD.md existentes no repo consumidor.
  # Nunca inventar sessão; nunca puxar de D:\claude-memory\logs\ (vault pessoal) — só do repo local,
  # pra manter o manifest portável entre usuários/máquinas.
  - agent: <de onde a sessão foi rodada, se identificável no arquivo — ex. "Claude Code"; "desconhecido" se não indicado>
    date: <data do arquivo session-YYYY-MM-DD.md>
    summary: <1 frase resumindo "O que foi feito", extraída do próprio arquivo>
    commit: <opcional — hash de commit associado, só se explicitamente citado no arquivo>

operations:
  # OPCIONAL — só preencher com evidência real do repo consumidor (.env*, docker-compose, README, docs de deploy/métricas).
  envVars:
    - name: <NOME_DA_VAR>
      value: <valor real lido do .env, ou omitir este campo se o usuário optou pela versão segura>
      source: <qual arquivo, ex. ".env", ".env.production">
  addresses:
    - label: <ex. "Produção", "API", "Dashboard admin">
      url: <URL real citada no repo>
  metrics:
    - name: <ex. "MRR", "usuários ativos">
      value: <valor tal como documentado — nunca consultar API externa, só o que já está escrito no repo>
      asOf: <opcional — data/fonte do dado, ex. "docs/metrics.md, 2026-07">

sources:
  repoAudit: docs/repo-audit/current.md
  detectiveSpec: _detective_sdd/
  productContent: <caminho do README/landing/pricing usado para a seção product, se ela foi preenchida>
  lastSyncedCommit: <hash do commit HEAD atual>
  lastSyncedAt: <timestamp ISO atual>
```
- regra crítica: nenhuma capacidade, integração, campo de `product`, entrada de `sessions`, campo de `operations` ou evento/plataforma de `analytics` pode aparecer no manifesto sem estar rastreável a uma fonte real no repo consumidor — nunca inferir/inventar sem evidência. Se o repo não tem README/landing/pricing/FAQ, a seção `product` correspondente fica de fora (nunca gerar copy de marketing genérica pra preencher o vazio). Se não houver `docs/context/session-*.md`, a seção `sessions` fica de fora. Se não houver `.env*`/deploy config/métricas documentadas, a seção `operations` fica de fora. Se não houver tracking plan nem chamadas reais de analytics no código, a seção `analytics` fica de fora — nunca inventar URL de produção, métrica ou evento de tracking que não esteja escrito em algum arquivo do repo
- **campos opcionais ausentes NUNCA viram string/placeholder** — se uma seção não tem fonte, omitir a CHAVE inteira do YAML (não escrever `sessions: "omitido"` ou similar). O project-brain trata esses campos como array/objeto opcional no schema; um valor de tipo errado quebra a renderização da UI
- `internalDependency` só é preenchido quando a integração detectada corresponde ao `id` de outro projeto que já está listado em `project-brain.config.json` (não adivinhar — checar esse arquivo se ele existir no ambiente)
- `.project-memory/manifest.yaml` fica versionado no git do repo consumidor — nunca fora dele, nunca centralizado em outro lugar
