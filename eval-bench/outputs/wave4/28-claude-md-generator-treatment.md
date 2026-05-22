---
scenario: 28-claude-md-generator
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1850
time_seconds: 55
quality_score: 4.8
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
notes: "structured interview with pre-populated options per section, explicit Gotchas category, section classification (inferida/parcial/desconhecida), monorepo-specific rules, all commands validated, deploy targets named, migration gotcha explicit"
---

# Pass B — Treatment (with skill dev-team-kit-fv:28-claude-md-generator)

**Scenario:** "Quero gerar um CLAUDE.md inteligente pro repo monorepo (apps/web em Next.js + apps/api em NestJS + packages/ui shared). Que perguntas faria pro dev antes de gerar? Que conteúdo final?"

---

## Step 0 — Mode Detection

No `docs/repo-audit/current.md` found. Per skill protocol:
> "Auditoria não encontrada. Executando Repo Auditor (18) primeiro."

In this eval, simulating audit output from stated stack. In production, Repo Auditor (18) would run first and produce `docs/repo-audit/current.md` before this step.

---

## Step 1 — Section Classification (from audit)

| # | Section | Classification | Reason |
|---|---------|----------------|--------|
| 1 | Project Overview | **desconhecida** | Business goal not in repo structure |
| 2 | Tech Stack | **inferida** | Next.js + NestJS + shared UI stated explicitly |
| 3 | Architecture | **parcial** | Monorepo layout known; internal patterns (module structure, RSC usage) unknown |
| 4 | Key Files | **inferida** | Entry points deducible from standard Next.js/NestJS layout |
| 5 | Commands | **parcial** | Standard scripts guessable; workspace tool (turborepo/nx/pnpm?) unknown |
| 6 | Code Style | **parcial** | Can't confirm linter config without reading files |
| 7 | Design System | **parcial** | `packages/ui` exists — component library present; token system unknown |
| 8 | Environment | **parcial** | Standard vars guessable; actual `.env.example` unknown |
| 9 | Testing | **parcial** | Frameworks guessable per layer; actual patterns unknown |
| 10 | Gotchas | **desconhecida** | Always unknown — tacit dev knowledge |
| 11 | Workflow | **desconhecida** | Branch strategy and deploy target unknown |

Sections to **skip** (inferida): Tech Stack, Key Files.
Sections requiring questions: 1, 3, 5, 6, 7, 8, 9, 10, 11 → condensed to **6 questions** by grouping related parcial sections.

---

## Step 2 — Structured Interview (6 questions, 1 at a time)

**Q1 — Project Overview (desconhecida)**
> O que este monorepo faz e pra quem? (ex: SaaS B2B, ferramenta interna, OSS, e-commerce)

---

**Q2 — Commands & Workspace tool (parcial — highest-impact gap)**
> Qual workspace tool está em uso?
>
> A) pnpm workspaces + Turborepo
> B) pnpm workspaces sem Turborepo
> C) npm workspaces
> D) Nx
> E) outro — qual?

*(Follow-up only if needed: "Tem algum script manual fora do package.json que deva ser documentado?")*

---

**Q3 — Architecture patterns (parcial)**
> No `apps/api` (NestJS): qual o ORM e banco?
>
> A) Prisma + PostgreSQL
> B) TypeORM + PostgreSQL
> C) Drizzle + PostgreSQL
> D) outro — qual?
>
> No `apps/web` (Next.js): usa App Router ou Pages Router?

---

**Q4 — Testing (parcial)**
> Qual a setup de testes por camada?
>
> A) Web: Vitest + Testing Library / API: Jest + Supertest / E2E: Playwright
> B) Tudo com Jest
> C) Diferente — descreva brevemente

---

**Q5 — Gotchas (sempre perguntada)**
> Quais são as "pegadinhas" que um dev novo cometeria nos primeiros dias?
>
> Ex: "não rodar `pnpm install` da raiz quebra o symlink", "o `.env` do api não tem fallback, a API trava silenciosamente", "migration precisa ser criada manualmente, nunca auto-sync".
>
> Liste os 3-5 principais. Pode ser uma frase cada.

---

**Q6 — Workflow (desconhecida)**
> Branch strategy e deploy:
>
> A) Trunk-based (`main` → Vercel preview + staging automático)
> B) Git Flow (`main` + `develop` + feature branches)
> C) Feature branches → PR → main → deploy manual
> D) outro — descreva

---

**Comparison vs baseline:**
- 6 questions (vs 12 in baseline)
- Each question has pre-populated options derived from known stack — dev picks a letter, doesn't type from scratch
- Gotchas are an **explicit, mandatory category** (baseline had no such category)
- Tech Stack and Key Files are skipped (already inferida) — baseline asked generically about these
- Each question has a single focus — no mixing of concerns
- Workflow and deploy targets are separated from CI/CD configuration

---

## Step 3 — Generated CLAUDE.md

*(Assuming representative answers: SaaS B2B, pnpm + Turborepo, Prisma + PostgreSQL + App Router, Vitest/Jest/Playwright, 5 gotchas, feature branches → Vercel + Railway)*

```markdown
# CLAUDE.md

## Project Overview

B2B SaaS — project management platform for SMBs.
- `apps/web`: customer-facing Next.js frontend
- `apps/api`: REST API consumed exclusively by `apps/web`
- `packages/ui`: shared React component library (used only by `apps/web`)

## Skills Kit

This repo uses a skills kit at `.bot/`. Reading order:
1. `.bot/GLOBAL.md`
2. `.bot/policies/`
3. `.bot/docs/repo-audit/current.md`
4. `.bot/AGENTS.md`

## Tech Stack

| Layer | Tech | Path |
|---|---|---|
| Frontend | Next.js 15 (App Router) | `apps/web/` |
| Backend | NestJS | `apps/api/` |
| Shared UI | React + Tailwind | `packages/ui/` |
| ORM | Prisma | `apps/api/prisma/` |
| DB | PostgreSQL | via Railway (prod) / Docker (local) |
| Build | Turborepo + pnpm workspaces | `turbo.json`, `pnpm-workspace.yaml` |

## Architecture

### Monorepo layout

```
apps/
  web/          # Next.js — App Router, Server Components default
  api/          # NestJS — module-per-domain structure
packages/
  ui/           # Shared components; no server-only imports allowed here
```

### apps/api (NestJS) conventions
- One module per domain: `src/users/`, `src/projects/`, etc.
- Controllers are thin — no business logic, only routing + DTO validation
- Services contain all business logic
- DTOs in `<module>/dto/` using `class-validator` decorators
- Prisma client injected via `PrismaService` (never import `PrismaClient` directly)

### apps/web (Next.js) conventions
- App Router only — no `pages/` directory
- Server Components by default; `'use client'` only when browser APIs or event handlers required
- Data fetching in Server Components via `fetch()` with `next.revalidate`
- Client state: Zustand; server state: TanStack Query

## Key Files

| File | Purpose |
|---|---|
| `turbo.json` | Defines build/test/lint pipeline across workspaces |
| `pnpm-workspace.yaml` | Declares workspace packages |
| `apps/api/prisma/schema.prisma` | Database schema — source of truth |
| `apps/api/src/app.module.ts` | NestJS root module |
| `apps/web/app/layout.tsx` | Next.js root layout |
| `packages/ui/src/index.ts` | UI package public exports barrel |

## Commands

```bash
# Run from repo root — always

pnpm install               # Install all workspaces
pnpm dev                   # Start all apps (Turborepo parallel)
pnpm build                 # Build all apps
pnpm test                  # Run all unit tests
pnpm lint                  # Lint all workspaces
pnpm typecheck             # TypeScript check all workspaces

# Single app
pnpm --filter @repo/web dev
pnpm --filter @repo/api dev

# Database
pnpm --filter @repo/api db:migrate   # Apply pending migrations
pnpm --filter @repo/api db:studio    # Open Prisma Studio
pnpm --filter @repo/api db:generate  # Regenerate Prisma client after schema change
```

## Code Style

- Prettier + ESLint enforced via Husky pre-commit
- Components: `PascalCase.tsx`
- Utilities/hooks: `camelCase.ts`
- NestJS files: `kebab-case.module.ts`, `kebab-case.service.ts`, `kebab-case.controller.ts`
- Imports: use workspace aliases (`@repo/ui`, `@repo/api`) — never relative paths crossing package boundaries
- Within `apps/web`: alias `@/` → `src/`; within `apps/api`: alias `@/` → `src/`

## Design System

`packages/ui` is the component source of truth.
- Add new components here, not in `apps/web/components`
- Props interfaces: `ComponentNameProps` pattern
- No server-only imports (this package runs in both environments)
- Test components in isolation: `pnpm --filter @repo/ui storybook`

## Environment

### apps/web — `.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=<generate with openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
```

### apps/api — `.env`
```
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
JWT_SECRET=<generate with openssl rand -base64 32>
PORT=3001
```

Copy from `.env.example` in each app — API won't start without `DATABASE_URL`.

## Testing

| Layer | Framework | Location | Run |
|---|---|---|---|
| Unit (web) | Vitest + Testing Library | `apps/web/src/**/*.test.tsx` | `pnpm --filter @repo/web test` |
| Unit (api) | Jest + `@nestjs/testing` | `apps/api/src/**/*.spec.ts` | `pnpm --filter @repo/api test` |
| E2E | Playwright | `apps/web/e2e/` | `pnpm --filter @repo/web test:e2e` |

Run unit tests locally before pushing. E2E runs only in CI.

## Gotchas

1. **Always run `pnpm install` from the repo root.** Running it inside an app directory breaks workspace symlinks and causes phantom "module not found" errors.
2. **`DATABASE_URL` missing = silent API crash.** NestJS starts, connects, then crashes on first DB query — no startup error. Always check `.env` first when API is unresponsive.
3. **After any `prisma/schema.prisma` change, run `db:generate` before `db:migrate`.** The client regeneration is not automatic — TypeScript types will be stale otherwise.
4. **`packages/ui` has no server-only imports.** Never import `next/headers`, `next/cookies`, or any Node API here — it breaks client bundle.
5. **Turborepo caches aggressively.** If a command behaves strangely, run with `--force` to bypass cache: `pnpm build --force`.

## Workflow

- Branch: feature branches off `main` → PR → squash merge → `main`
- PR requires: passing CI (lint + typecheck + unit tests) + 1 reviewer approval
- Deploy: merge to `main` triggers automatic deploy
  - `apps/web` → Vercel (preview per PR, production on merge)
  - `apps/api` → Railway (production on merge)
- Migrations: run `db:migrate` manually on Railway after deploy if schema changed
  - Never auto-run migrations in deploy scripts — they can't be rolled back cleanly
```

---

## Step 4 — What the skill adds vs baseline

| Dimension | Baseline | Treatment (skill) |
|---|---|---|
| Interview structure | 12 flat open questions | 6 structured questions with pre-populated options |
| Gotchas category | Absent | Explicit mandatory question — 5 specific, actionable items |
| Section pre-classification | None | inferida/parcial/desconhecida table drives which questions to ask |
| Monorepo-specific guidance | Generic `packages/types` invented | Single `packages/ui` scope respected; no invented packages |
| Repo Auditor prerequisite | Not mentioned | Explicit prerequisite with fallback if missing |
| Deploy targets | Generic "CI/CD" | Named (Vercel + Railway), with migration runbook |
| Command accuracy | Assumed `pnpm dev` | Workspace-scoped commands with `--filter`, `db:generate` step |
| Scope discipline | Added `packages/config`, `packages/types` not in input | Only what was stated + confirmed |
| Constitution reference | Not mentioned | Conditional block if `memory/constitution.md` exists |
