# Dev Team Kit — Fullstack Web Development

Kit completo de skills e codigo para desenvolvimento de aplicacoes web responsivas com time estruturado de 24 especialistas, coordenados por um Orquestrador e rastreados por um Context Manager.

## Governanca Global

O kit agora tem uma camada persistente de governanca para reduzir conflito entre skills, economizar token e padronizar handoffs:

- `GLOBAL.md` define comportamento universal da IA
- `policies/` concentra regras compartilhadas de execucao, qualidade, persistencia e economia de token
- `policies/tool-safety.md` define approvals, risco e hygiene para tools/MCP
- `policies/evals.md` define evidencia minima para evitar regressao em prompts, skills e tools
- `templates/` concentra formatos curtos de plano, handoff, review e rejeicao
- `skills/*/SKILL.md` ficam focadas no papel especifico de cada especialista

Hierarquia de instrucoes:

1. `GLOBAL.md`
2. `policies/*.md`
3. `skills/*/SKILL.md`
4. `templates/*.md`

## Ergonomia Diaria

Para uso rapido no dia a dia:

- leia `docs/quickstart.md`
- reutilize `docs/repo-audit/current.md` antes de reexplorar o repo inteiro
- reutilize `docs/repo-audit/assets.md` antes de gerar ou alterar assets visuais
- use `commands/` como atalhos operacionais
- consulte `docs/skill-call-matrix.md` quando houver duvida sobre overlap entre skills

## Instalacao em Repo Existente

Modo recomendado para usar este kit em um repo ja existente:

- manter `AGENTS.md` na raiz do repo consumidor
- copiar o kit para `.bot/`
- usar `templates/AGENTS-root.md` como base do `AGENTS.md` da raiz
- deixar o `Repo Auditor` criar ou atualizar `.bot/docs/repo-audit/current.md`

Ver `docs/setup-bot-folder.md` para a estrutura sugerida.

## Estrutura do Time

```
                              ┌──────────────┐
                              │ ORQUESTRADOR │ ← Coordena TUDO continuamente
                              │  (skill 09)  │
                              └──────┬───────┘
                                     │
                              ┌──────┴───────┐
                              │   CONTEXT    │ ← Rastreia progresso e foco
                              │   MANAGER    │
                              │  (skill 08)  │
                              └──────┬───────┘
                                     │
     ┌───────┬──────────┬────────────┼────────────┬──────────┬──────────┐
     ▼       ▼          ▼            ▼            ▼          ▼          ▼
  ┌─────┐ ┌──────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────┐ ┌─────────┐
  │ PO  │→│UI/UX │→│ Backend │→│ Frontend │→│ Motion │→│ Copy │→│   SEO   │
  │ 01  │ │  02  │ │   03    │ │    04    │ │   12   │ │  13  │ │   14    │
  └─────┘ └──────┘ └─────────┘ └────┬─────┘ └────────┘ └──────┘ └────┬────┘
                                     │                                 │
                                     │ (opcional)                      │
                                ┌────┴─────┐                          │
                                │  Mobile  │                          │
                                │  Tauri   │                          │
                                │   15     │                          │
                                └──────────┘                          │
                                                                      │
     ┌────────────────────────────────────────────────────────────────┘
     ▼
  ┌─────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐
  │ QA  │→│ Security │→│ Reviewer │→│ Deploy │ │ Documentador │
  │ 05  │ │    06    │ │    11    │ │   07   │ │     10       │
  └─────┘ └──────────┘ └──────────┘ └────────┘ └──────────────┘
                                                  ↑ (durante todo o dev)
```

## Pipeline de Desenvolvimento

### Pipeline Padrao (feature completa)

```
PO → UI/UX → Backend → Frontend → Motion → Copy → SEO → QA → Security → Reviewer → Deploy
```

Documentador atua em paralelo nas mudancas que alteram feature, API, arquitetura ou operacao.

### O Orquestrador decide — pode adaptar:

| Tipo de Tarefa | Pipeline |
|----------------|----------|
| Feature completa | Pipeline inteiro |
| Bug fix | Backend → QA → Security → Reviewer → Deploy |
| Hotfix critico | Backend → Security → Reviewer → Deploy |
| Melhoria de UI | UI/UX → Frontend → Motion → QA → Security → Reviewer → Deploy |
| Landing page | Copy → UI/UX → Frontend → Motion → SEO → QA → Security → Reviewer → Deploy |
| App mobile | Pipeline web + Mobile (Tauri) apos Frontend |

### Skills que NUNCA sao puladas
- QA (skill 05)
- Security (skill 06)
- Reviewer (skill 11)

### Skill transversal obrigatoria
- Documentador (skill 10) sempre participa quando houver mudanca de feature, contrato, arquitetura ou operacao

---

## Skills (24 especialistas)

### Gestao e Coordenacao

| # | Skill | Responsabilidade |
|---|-------|-----------------|
| 08 | **Context Manager** | Rastreia tarefas com as ferramentas de task/todo disponiveis, detecta mudanca de foco, reseta com historico resumido, persiste estado entre sessoes |
| 09 | **Orquestrador** | Lider tecnico continuo. Analisa tarefa, define pipeline, coordena entre etapas, adapta ordem |
| 10 | **Documentador** | Documenta por nivel de decisao: feature, contrato API, implementacao, operacao |
| 11 | **Reviewer** | Ultima porta antes do deploy. Checa codigo, testes, seguranca, docs. Nao documenta — valida |
| 16 | **LLM Selector** | Recomenda nivel de modelo por tarefa, otimizando custo vs qualidade |
| 17 | **Image Generator** | Gera e adapta assets visuais coerentes com o app, considerando identidade visual, assets existentes e output correto |
| 18 | **Repo Auditor** | Audita stack real, convencoes, assets, testes e riscos; persiste resumo reutilizavel em markdown |
| 19 | **Asset Librarian** | Organiza inventario de imagens, icones, logos, fontes e tokens visuais para manter consistencia do sistema |
| 20 | **Observability SRE** | Define logs, metricas, tracing, health checks, alertas, rollback e confiabilidade operacional |
| 21 | **Data Analytics** | Define eventos, funis, KPIs e naming de tracking para medir resultado real das features |
| 22 | **Accessibility Specialist** | Revisa WCAG, teclado, screen reader, contraste, semantica e motion reduction com rigor dedicado |
| 23 | **Migration Refactor Specialist** | Conduz migracoes grandes, legacy modernization, rollout incremental e rollback seguro |
| 24 | **Release Manager** | Coordena versionamento, changelog, release notes, rollout, rollback e comunicacao de release |

### Produto e Design

| # | Skill | Responsabilidade |
|---|-------|-----------------|
| 01 | **PO** | Feature spec, user stories, criterios de aceitacao, priorizacao |
| 02 | **UI/UX** | Design tokens, wireframes, responsividade, acessibilidade, Nielsen |

### Desenvolvimento

| # | Skill | Responsabilidade |
|---|-------|-----------------|
| 03 | **Backend** | Schema Prisma, API REST, auth JWT, validacao Zod, middlewares |
| 04 | **Frontend** | React/Next.js, Zustand, React Query, Skeleton loading, Axios |
| 12 | **Motion Design** | Animacoes, transicoes, micro-interacoes, Framer Motion, 60fps |
| 15 | **Mobile Tauri** | *(Opcional)* APK Android, apps Windows/Linux/macOS via Tauri |

### Conteudo e SEO

| # | Skill | Responsabilidade |
|---|-------|-----------------|
| 13 | **Marketing Copy** | Textos de venda, CTAs, landing page, microcopy, brand voice |
| 14 | **SEO Specialist** | Meta tags, schema markup, Core Web Vitals, sitemap, performance |

### Qualidade e Deploy

| # | Skill | Responsabilidade |
|---|-------|-----------------|
| 05 | **QA** | Vitest, Playwright, MSW, cobertura >= 80%, testes E2E |
| 06 | **Security** | OWASP Top 10, headers, CORS, CSRF, XSS, DRY review |
| 07 | **Deploy** | Docker multi-stage, nginx, CI/CD GitHub Actions, rollback |

---

## Como Funciona o Orquestrador

1. **Inicio**: Recebe tarefa → analisa escopo → classifica tipo → define pipeline e envolvimento do Documentador
2. **Comunica**: "Pipeline definido: [X] → [Y] → [Z]. Iniciando por [X]."
3. **Delega**: Invoca a primeira skill do pipeline
4. **Entre etapas**: Verifica handoff → atualiza Context Manager → decide proxima skill
5. **Adapta**: Pode pular skills desnecessarias, mudar ordem, ou voltar etapas
6. **Finaliza**: So libera quando Reviewer aprova

Todos os handoffs devem seguir `policies/handoffs.md` e, quando util, reutilizar `templates/handoff.md`.

---

## Como Funciona o Context Manager

1. **Cria tasks** ao iniciar qualquer trabalho usando a ferramenta de task/todo disponivel no ambiente
2. **Atualiza status** em tempo real (pending → in_progress → completed)
3. **Detecta mudanca de foco** — se a nova tarefa nao se relaciona com as atuais:
   - Arquiva contexto antigo em `docs/context/history.md` (1-2 linhas por task)
   - Limpa tasks antigas
   - Cria novas tasks pro novo foco
4. **Persiste** em `docs/context/current-focus.md` e `docs/context/history.md`
5. **Nunca acumula** mais de 15 tasks ativas

O que vale a pena persistir fica definido em `policies/persistence.md`.

---

## Como Funciona o LLM Selector

O Orquestrador invoca o LLM Selector (skill 16) ao iniciar cada etapa do pipeline para recomendar o nivel de modelo ideal:

| Nivel | Exemplo de modelo | Quando usar |
|-------|-------------------|-------------|
| Rapido | modelo rapido e barato | Tasks repetitivas, boilerplate, formatacao, commits |
| Balanceado | modelo geral equilibrado | Maioria das tasks: CRUD, testes, componentes, reviews simples |
| Profundo | modelo mais forte para raciocinio | Arquitetura, seguranca, debugging complexo, decisoes criticas |

O selector sugere o nivel e, se o ambiente suportar troca manual de modelo, pode sugerir o comando correspondente. Cada skill tem um nivel default com overrides por complexidade.

---

## Como Funciona o Image Generator

O Orchestrator aciona o skill 17 a qualquer momento que um asset visual for necessario:

1. **Analisa** o tipo de imagem (hero, icone, favicon, mascote, background)
2. **Engenheira o prompt** seguindo as guidelines por tipo
3. **Seleciona o modelo** (Gemini Flash por padrao, Gemini 3 Pro para tipografia, GPT-Image-1.5 para acabamento)
4. **Detecta o modo**: text-to-image (novo) ou image-to-image (derivar existente)
5. **Executa**: `python scripts/generate-image.py --type ... --model ... "prompt"`
6. **Pos-processa**: rembg (transparencia), ico (favicon), tauri-icons (desktop)
7. **Entrega paths** ao Orchestrator para continuar o pipeline

Setup: `pip install pillow rembg` + `FAL_KEY=...` no `.env.local`

---

## Stack Tecnica

Esta e a stack de referencia do kit. Se o repositorio real usar outra stack, adapte seguindo `policies/stack-flexibility.md`.

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18+ / Next.js 14+ (App Router) |
| Estado Global | Zustand + Immer + Devtools |
| Server State | TanStack React Query v5 |
| Estilo | Tailwind CSS |
| Animacoes | Framer Motion |
| Forms | React Hook Form + Zod / Custom useForm |
| HTTP | Axios (com interceptors de auth + CSRF) |
| Tipos | TypeScript (strict mode) |
| Testes Unit | Vitest + React Testing Library + MSW |
| Testes E2E | Playwright (Chrome, Firefox, Mobile) |
| Backend | Node.js + Express/NestJS + Prisma |
| Banco | PostgreSQL |
| Auth | JWT (access 15min em memoria) + Refresh Token (HttpOnly cookie 7d) |
| Mobile/Desktop | Tauri v2 (opcional) |
| Deploy | Docker (multi-stage) + Nginx + GitHub Actions |
| SEO | Schema.org JSON-LD, Open Graph, Core Web Vitals |

---

## Estrutura de Arquivos

### Skills (17 especialistas)

```
GLOBAL.md                               → Regras universais do kit
AGENTS.md                               → Entrada rapida para agentes compativeis
policies/                               → Regras persistentes compartilhadas
docs/skill-guides/                      → Anexos extensos carregados apenas quando necessario
templates/                              → Templates curtos de execucao
evals/                                  → Casos versionados de avaliacao
skills/
├── 01-po-feature-spec/SKILL.md       → Feature spec, user stories, priorizacao
├── 02-ui-ux-design/SKILL.md          → Design tokens, breakpoints, skeleton, Nielsen
├── 03-backend-api/SKILL.md           → Schema Prisma, API, auth, Zod validation
├── 04-frontend-integration/SKILL.md  → React Query, Zustand, Skeleton, Axios
├── 05-qa-testing/SKILL.md            → Vitest, MSW, Playwright E2E, fixtures
├── 06-security-review/SKILL.md       → OWASP, headers, CORS, CSRF, XSS, DRY
├── 07-deploy-docker/SKILL.md         → Docker, docker-compose, nginx, CI/CD
├── 08-context-manager/SKILL.md       → Tracking de tarefas, memoria, foco
├── 09-orchestrator/SKILL.md          → Lider tecnico, coordenacao de pipeline
├── 10-documenter/SKILL.md            → Documentacao por nivel de decisao
├── 11-reviewer/SKILL.md              → Validacao final antes do deploy
├── 12-motion-design/SKILL.md         → Animacoes, transicoes, Framer Motion
├── 13-marketing-copy/SKILL.md        → Copy de venda, landing page, CTAs
├── 14-seo-specialist/SKILL.md        → Meta tags, schema markup, Web Vitals
├── 15-mobile-tauri/SKILL.md          → Tauri, APK, apps desktop (opcional)
├── 16-llm-selector/SKILL.md          → Recomenda modelo LLM por complexidade
└── 17-image-generator/SKILL.md       → Geracao de imagens fal.ai + pos-processamento Python
```

### Codigo Fonte (pronto pra usar)

```
src/
├── hooks/
│   ├── index.ts              → Barrel export
│   ├── useApi.ts             → React Query: usePaginatedQuery, useDetailQuery, useApiMutation
│   ├── useAuth.ts            → Login, register, logout, refresh, me
│   ├── useDebounce.ts        → Debounce de valores e callbacks
│   ├── useForm.ts            → Form handling com validacao Zod
│   ├── useInfiniteScroll.ts  → Infinite scroll com React Query + IntersectionObserver
│   ├── useMediaQuery.ts      → Media queries + breakpoints pre-definidos
│   ├── usePagination.ts      → Paginacao com page numbers e navigation
│   └── useUtilities.ts       → useClickOutside, useKeyboard, useToggle, useCopyToClipboard
├── stores/
│   └── index.ts              → createStore factory, authStore, uiStore (com toasts)
├── components/
│   └── ui/
│       ├── Skeleton.tsx      → Skeleton + presets (Card, Table, UserList, Form, PageHeader) + HOC
│       └── ErrorBoundary.tsx → ErrorBoundary + ErrorState + EmptyState
├── lib/
│   └── index.ts              → API client (Axios), query keys factory, utils (cn, formatDate, etc.)
├── types/
│   └── index.ts              → ApiResponse, PaginatedResponse, User, Auth types
└── middleware.ts              → Next.js auth middleware (redirect + security headers)
```

### Documentacao

```
docs/
├── README.md                          → Mapa da documentacao
├── repo-audit/                        → Auditoria persistida do repositorio para reduzir releitura
│   ├── current.md                     → Fotografia operacional reutilizavel do repo
│   └── assets.md                      → Inventario visual reutilizavel para UI/UX e Image Generator
├── skill-guides/                      → Guias auxiliares carregados sob demanda
├── features/<feature>/                → Doc por feature
│   ├── README.md, rules.md, flow.md
│   ├── api.md, ui.md
├── architecture/                      → Visao geral e ADRs
│   ├── overview.md, frontend.md, backend.md
│   └── decisions/adr-NNN-*.md
├── api/                               → Contratos de API
│   ├── README.md, errors.md, pagination.md
├── ops/                               → Setup, deploy, observabilidade
│   ├── setup.md, deploy.md, observability.md
├── context/                           → Gerenciado pelo Context Manager
│   ├── current-focus.md, history.md
└── plans/                             → Planos de implementacao
```

---

## Hooks Disponiveis

### Data Fetching

| Hook | Descricao | Uso |
|------|-----------|-----|
| `usePaginatedQuery` | GET com paginacao automatica | Listagens |
| `useDetailQuery` | GET de recurso individual | Tela de detalhe |
| `useApiMutation` | POST/PATCH/DELETE generico | Criar, editar, deletar |
| `useCreateMutation` | Wrapper pra POST | Criacao |
| `useUpdateMutation` | Wrapper pra PATCH | Edicao |
| `useDeleteMutation` | Wrapper pra DELETE | Remocao |
| `useInfiniteScroll` | Infinite scroll com IntersectionObserver | Feeds, timelines |
| `usePagination` | Paginacao com pageNumbers e navigation | Tabelas, listagens |

### Auth

| Hook | Descricao | Uso |
|------|-----------|-----|
| `useAuth` | Login, register, logout, refresh | Toda auth flow |

### Forms

| Hook | Descricao | Uso |
|------|-----------|-----|
| `useForm` | Form handling completo com Zod | Formularios |

### UI/UX

| Hook | Descricao | Uso |
|------|-----------|-----|
| `useDebounce` | Debounce de valores | Search inputs |
| `useDebouncedCallback` | Debounce de funcoes | Event handlers |
| `useMediaQuery` | Media query reativa | Layout condicional |
| `useBreakpoint` | Breakpoints Tailwind | Responsividade |
| `useClickOutside` | Detecta click fora | Dropdowns, modals |
| `useKeyboard` | Atalhos de teclado | Shortcuts |
| `useToggle` | Boolean toggle | Menus, modals |
| `useCopyToClipboard` | Copiar texto | Botoes de copia |
| `useDocumentTitle` | Titulo da pagina | Page titles |

---

## Skeleton Presets

| Componente | Uso |
|------------|-----|
| `<Skeleton>` | Base (text, circular, rectangular) |
| `<CardSkeleton>` | Cards com imagem + texto |
| `<TableSkeleton>` | Tabelas (rows x cols configuravel) |
| `<UserListSkeleton>` | Lista de usuarios com avatar |
| `<FormSkeleton>` | Formularios com labels + inputs |
| `<PageHeaderSkeleton>` | Header de pagina + botoes |
| `withSkeleton(Component, Skeleton)` | HOC automatico |

---

## Seguranca — Nao-Negociaveis

- JWT access token no response body apenas para uso em memoria (15 min)
- Refresh token em HttpOnly cookie (7 dias)
- CSRF token em double-submit pattern
- CORS com origin explicita
- Bcrypt com cost >= 12
- Zod validation em TODA entrada
- Security headers (HSTS, CSP, X-Frame-Options...)
- npm audit sem HIGH/CRITICAL
- NUNCA localStorage/sessionStorage pra tokens
- Rate limiting em auth endpoints

---

## Deploy Rapido

```bash
docker compose up -d

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

./scripts/rollback.sh <tag-anterior>
```

---

## Instalacao de Dependencias

```bash
npm install zustand immer @tanstack/react-query axios zod framer-motion
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event
npm install -D @playwright/test msw

npm install express prisma @prisma/client zod bcryptjs jsonwebtoken cors helmet
npm install -D @types/express @types/bcryptjs @types/jsonwebtoken

npm install -D @tauri-apps/cli@latest
```

---

## Como Usar

1. Copie `GLOBAL.md`, `policies/`, `templates/`, `src/` e `skills/` pro seu projeto
2. Instale as dependencias listadas acima
3. Configure as env vars seguindo o `.env.example` da skill de deploy
4. Leia `GLOBAL.md` e as policies antes de adaptar as skills ao seu ambiente
5. Se `docs/repo-audit/current.md` nao existir ou estiver desatualizado, rode primeiro o **Repo Auditor** (skill 18)
6. Use `docs/skill-guides/` apenas quando precisar de exemplos extensos ou playbooks detalhados
7. Inicie pelo **Orquestrador** (skill 09) — ele analisa sua tarefa e define o pipeline
8. O **Context Manager** (skill 08) rastreia progresso automaticamente
9. O **Documentador** (skill 10) documenta durante o desenvolvimento
10. O **Reviewer** (skill 11) valida tudo antes de liberar pro deploy
11. Siga o fluxo definido pelo Orquestrador — ele adapta conforme necessidade

### Exemplo: Nova Feature Completa

```
1. Orquestrador analisa: "Feature de checkout"
2. Define pipeline: PO → UI/UX → Backend → Frontend → Motion → Copy → SEO → QA → Security → Reviewer → Deploy
3. Context Manager cria tasks pra cada etapa
4. PO escreve spec → handoff → UI/UX cria design → handoff → ...
5. Documentador documenta feature em docs/features/checkout/
6. Reviewer valida tudo → Deploy sobe
```

### Exemplo: Bug Fix

```
1. Orquestrador analisa: "Bug no calculo de frete"
2. Define pipeline: Backend → QA → Security → Reviewer → Deploy
3. Pula: PO, UI/UX, Frontend, Motion, Copy, SEO (nao afeta)
4. Backend corrige → QA testa → Security valida → Reviewer aprova → Deploy
```

### Exemplo: Landing Page

```
1. Orquestrador analisa: "Criar landing page de vendas"
2. Define pipeline: Copy → UI/UX → Frontend → Motion → SEO → QA → Security → Reviewer → Deploy
3. Copy define textos e CTAs primeiro
4. UI/UX cria design com os textos
5. Frontend implementa → Motion anima → SEO otimiza
6. QA → Security → Reviewer → Deploy
```

### Regras Globais

- **Codigo limpo**: Siga `GLOBAL.md` para comentarios, clareza e criterio de documentacao.
- **Sem pular etapas obrigatorias**: QA, Security e Reviewer seguem obrigatorios; Documentador e transversal quando houver mudanca relevante.
- **Handoff explicito**: Cada skill entrega algo concreto pra proxima seguindo `policies/handoffs.md`.
- **Context Manager**: Persistencia enxuta, focada no que ajuda a proxima sessao.
- **Repo Auditor**: Quando existir `docs/repo-audit/current.md`, reutilize esse resumo antes de reanalisar o repo inteiro.
- **Observability SRE**: Em mudancas operacionais, nao tratar monitoramento e rollback como detalhe opcional.
- **Orquestrador**: Sempre coordenando, adaptando e respeitando a hierarquia global.
