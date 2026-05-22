---
scenario: 28-claude-md-generator
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 980
time_seconds: 25
quality_score: 3.3
quality_breakdown:
  specificity: 4
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
notes: "generic monorepo CLAUDE.md template; good structure but no interview protocol, no repo-audit step, no placeholders indicating what to verify, no rationale for question ordering"
---

# Pass A — Baseline (no skill)

**Scenario:** "Quero gerar um CLAUDE.md inteligente pro repo monorepo (apps/web em Next.js + apps/api em NestJS + packages/ui shared). Que perguntas faria pro dev antes de gerar? Que conteúdo final?"

---

## Questions I'd ask the developer before generating

1. What is the primary purpose of this monorepo? (SaaS, internal tool, OSS, etc.)
2. What package manager and workspace tool is used? (pnpm workspaces, turborepo, nx, yarn workspaces, etc.)
3. What test frameworks are in place? (Jest, Vitest, Playwright, Supertest)
4. What is the CI/CD pipeline? (GitHub Actions, GitLab CI, Vercel preview, etc.)
5. What linting/formatting rules exist? (ESLint config, Prettier, commitlint, husky hooks)
6. What database and ORM? (Prisma, TypeORM, Drizzle, raw SQL)
7. What authentication strategy? (JWT, sessions, NextAuth, Passport)
8. What environment variables are required per app? (and are there `.env.example` files?)
9. Are there naming conventions for files/folders/exports? (kebab-case, PascalCase, etc.)
10. What should Claude NOT touch? (generated files, migration files, lock files, vendor directories)
11. Is there a shared type layer between API and web? (e.g., shared DTOs in `packages/types`)
12. Are there any AI features already in the codebase that need special handling?

---

## Final CLAUDE.md content

```markdown
# CLAUDE.md — Monorepo

## Stack Overview

| Layer | Tech | Location |
|---|---|---|
| Frontend | Next.js 14 (App Router) | `apps/web/` |
| Backend | NestJS | `apps/api/` |
| Shared UI | React components + Tailwind | `packages/ui/` |
| Package manager | pnpm + workspaces | `pnpm-workspace.yaml` |
| Build system | Turborepo | `turbo.json` |

## Project Structure

```
apps/
  web/        # Next.js frontend — App Router, RSC, SSR
  api/        # NestJS REST/GraphQL API
packages/
  ui/         # Shared React components (consumed by apps/web)
  types/      # Shared TypeScript types and DTOs
  config/     # Shared ESLint, Tailwind, TS configs
```

## Commands

```bash
# Install all dependencies (from root)
pnpm install

# Dev (all apps in parallel)
pnpm dev

# Dev single app
pnpm --filter @repo/web dev
pnpm --filter @repo/api dev

# Build all
pnpm build

# Run tests
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## Architecture Rules

### apps/web (Next.js)
- Use App Router (`app/`) — no `pages/` directory
- Server Components by default; add `'use client'` only when necessary
- Fetch data in Server Components using `fetch()` with `next.revalidate`
- State management: Zustand for client state, React Query for server state
- Styles: Tailwind CSS — no inline styles or CSS modules unless needed for animations

### apps/api (NestJS)
- Module-based structure: each domain in its own module folder
- DTOs live in `dto/` subdirectory of each module; use `class-validator` decorators
- Services contain business logic; controllers are thin (no logic, only route handling)
- Database: TypeORM/Prisma (migrations managed via `pnpm db:migrate`)
- Authentication: Passport JWT guards; use `@Roles()` decorator for authorization

### packages/ui
- Each component exported from its own file; index.ts barrel per folder
- Props interfaces use `ComponentNameProps` convention
- No server-only imports allowed here (this code runs in browser and server)
- Storybook available: `pnpm storybook`

### packages/types
- Shared DTOs and interfaces — single source of truth
- Backend and frontend both import from here
- No runtime logic; types only

## Development Conventions

### File Naming
- Components: `PascalCase.tsx` (e.g. `UserCard.tsx`)
- Utilities/hooks: `camelCase.ts` (e.g. `useAuth.ts`)
- API modules: `kebab-case.module.ts`, `kebab-case.service.ts`
- Tests: `*.spec.ts` (unit), `*.e2e-spec.ts` (E2E)

### Import Paths
- Use `@repo/ui`, `@repo/types` for packages (never relative `../../../packages/`)
- Within `apps/web`: use `@/` alias for `src/`
- Within `apps/api`: use `@/` alias for `src/`

### Commits
- Conventional commits enforced: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`
- Scope: use app or package name (`feat(web):`, `fix(api):`, `chore(ui):`)

## Testing Strategy

| Layer | Tool | Location |
|---|---|---|
| Unit (API) | Jest + `@nestjs/testing` | `apps/api/src/**/*.spec.ts` |
| Unit (Web) | Vitest + Testing Library | `apps/web/src/**/*.test.tsx` |
| Integration (API) | Supertest | `apps/api/test/*.e2e-spec.ts` |
| E2E | Playwright | `apps/web/e2e/` |

Run unit tests before pushing. E2E runs in CI only.

## Environment Variables

### apps/web (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

### apps/api (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
PORT=3001
```

Each app has a `.env.example` — copy and fill before running.

## Files Claude Should NOT Modify

- `**/migrations/` — database migrations (run via CLI, never edit manually)
- `**/generated/` — code-generated files (Prisma client, GraphQL types)
- `pnpm-lock.yaml` — lockfile (updated automatically by pnpm)
- `turbo.json` — build pipeline config (only change with intent)

## AI Features (if applicable)

If extending AI features, see `packages/ai/` for the provider adapter layer.
Use the shared `generateCompletion()` utility — do not call provider SDKs directly.
```

---

## Self-assessment (baseline)

**Strengths:**
- Covers the main structural areas (stack, commands, conventions, testing, env vars, no-touch files)
- Questions cover most critical unknowns (package manager, DB, auth, test frameworks)

**Weaknesses:**
- No structured interview protocol — just a flat list of questions
- Template is generic: `packages/types` and `packages/config` were invented, not confirmed
- No step to run Repo Auditor (skill 18) first to auto-discover what's already in the repo
- No mention of how to verify conventions (e.g., "check existing files before asserting naming rules")
- No rationale for why questions are ordered that way
- No placeholder markers like `<!-- TODO: confirm with dev -->` for speculative sections
- Does not distinguish between "confirmed" vs "assumed" content
