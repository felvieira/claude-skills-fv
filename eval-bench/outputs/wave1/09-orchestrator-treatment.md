---
scenario: 09-orchestrator
pass: treatment
model: claude-opus-4-7
tokens_in_approx: 4200
tokens_out_approx: 2400
time_seconds: 75
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 4
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.0
notes: "Classified task, picked Modo A, applied vertical slicing (Google as Slice 1, GitHub as Slice 2), surfaced pre-execution gate, mapped pipeline base por slice, flagged Context7 + repo-audit checks. Held discipline — refused to dump implementation code, delegated to Backend/Frontend skills."
---

# Plano de Execucao — Autenticacao Social (Google + GitHub)

## 1. Classificacao da Task

| Campo | Valor |
|---|---|
| Tipo | Feature multi-camada (DB + back + front + auth flow) |
| Complexidade | Media |
| Risco | Alto (toca auth, dados de usuario, superficie de ataque) |
| Modo de pipeline | **A — `/pipeline` Classico** (stack ja definida, escopo claro) |
| Multi-camada? | **Sim → vertical slicing obrigatorio** |

Nao e Modo B (`/pipeline-discovery`) porque:
- briefing ja e claro (2 providers especificos, stack definida)
- nao precisa publicar PRD em issue tracker
- 1 worker basta (slices pequenos e sequenciais por dependencia)

## 2. Pre-Execution Gate

Sinais concretos presentes no prompt:
- stack nomeada (`Next.js`, `Prisma`, `PostgreSQL`)
- escopo delimitado (Google + GitHub, nao "todos os providers")
- contexto claro ("app existente")

**Veredito:** contexto suficiente. Bypass do gate. Prosseguir.

## 3. Pesquisa Obrigatoria (search-first + source-driven)

Antes de invocar Backend/Frontend, esta task **exige**:

- [ ] **`docs/repo-audit/current.md`** — se nao existir, invocar Skill 18 (Repo Auditor) primeiro. Auditoria deve confirmar:
  - versao do Next.js (App Router ou Pages Router muda o handler)
  - versao do Prisma e local de `schema.prisma`
  - se ha `User` model existente (conflita com adapter)
  - se ha session/auth lib ja instalada
- [ ] **Context7 MCP** para Auth.js v5 (NextAuth beta) — API mudou de v4 para v5, modelo nao deve depender de memoria
- [ ] **Context7 MCP** para `@auth/prisma-adapter` — schema models exigidos
- [ ] **Grep** por `auth`, `session`, `next-auth`, `nextauth` no repo para detectar implementacoes parciais ou conflitos

**Se essas pesquisas nao forem feitas, esta como implementacao cega.** Anti-rationalization: "posso pular pesquisa" = falso.

## 4. Vertical Slicing (REGRA OBRIGATORIA — feature multi-camada)

**PROIBIDO** plano "DB primeiro, back depois, front depois". Quebra em slices end-to-end.

### Plano (Vertical Slices)

| # | Slice | Worker | Inclui | Depende de |
|---|---|---|---|---|
| 0 | **Foundation** — Prisma models de auth + AUTH_SECRET + `lib/auth.ts` esqueleto | A | migration Account/Session/User/VerificationToken + config Auth.js base + middleware shell | nada |
| 1 | **Login com Google** ponta-a-ponta | A | OAuth app Google + provider config + botao na UI + callback test + session persistida | Slice 0 |
| 2 | **Login com GitHub** ponta-a-ponta | A | OAuth app GitHub + provider config + botao na UI + callback test + account linking validado | Slice 0 (paralelo com Slice 1 apos Slice 0 fechar) |
| 3 | **Protecao de rotas + logout** | A | middleware com matcher real do projeto + signOut UI + redirects + teste e2e | Slices 1 e 2 |

Slice 1 e Slice 2 paralelizam apos Slice 0 (compartilham foundation, mas providers sao independentes).

Tamanho de cada slice: ~150-300 linhas, 1-3 horas. Conforme heuristica de `policies/vertical-slices.md`.

## 5. Pipeline Base — Dentro de Cada Slice

Cada slice roda o pipeline base reduzido para feature multi-camada com auth:

```
[Slice 0]
Repo Auditor (uma vez) → CLAUDE.md Generator (se necessario) →
PO (spec curta do slice) → Backend (Prisma + Auth.js config) →
QA (migration + smoke) → Security (rev. secrets) → Reviewer

[Slice 1 e 2 em paralelo]
PO (spec do provider especifico) → UI/UX (botao + estado de loading) →
Backend (provider config + callback) → Frontend (action server + UI) →
QA (e2e do login flow) → Security (callback URL, CSRF, account linking) →
Reviewer

[Slice 3]
PO (acceptance dos fluxos protegidos) → Backend (middleware) →
Frontend (signOut + guards) → QA (e2e protegido + logout) →
Security (sessao revogada, cookie flags) → Accessibility Specialist (focus management nos botoes) →
Reviewer → Deploy
```

### Skills puladas com justificativa

| Skill | Pulada? | Justificativa |
|---|---|---|
| Design Intelligence (29) | sim | nao e overhaul de UI, e adicao de 2 botoes |
| Motion (12) | sim | login flow nao exige animacoes alem de loading state padrao |
| Copy (13) | sim | "Entrar com Google/GitHub" e copy convencional |
| SEO (14) | sim | pagina de login geralmente nao indexada |
| Image Generator (17) | sim | logos oficiais Google/GitHub via lib (ex: `react-icons` ou SVG inline conforme branding guidelines) |
| Data Analytics (21) | **nao pular** se houver tracking de signup/login no projeto — checar repo-audit |
| Observability SRE (20) | **nao pular** — auth e fluxo critico, exige logs estruturados de signin/signout/error |
| AI Integration (25) | sim | nao envolve IA |

## 6. Riscos e Blockers

| Risco | Severidade | Mitigacao |
|---|---|---|
| Conflito de `User` model existente com PrismaAdapter | Alto | Repo Auditor + Grep antes de migration |
| Account linking entre Google e GitHub do mesmo email | Alto | NUNCA usar `allowDangerousEmailAccountLinking: true` sem revisao de Security |
| `AUTH_URL` errado em prod → callback quebra | Medio | checklist de env vars no Deploy |
| Session strategy: JWT vs database | Medio | decidir no Slice 0 com base em volume esperado e necessidade de revogacao |
| Cookies sem flags seguras em prod | Alto | Security review obrigatorio antes de Deploy |
| Mistura App Router / Pages Router | Medio | Repo Auditor confirma roteamento antes |

## 7. Handoff — Proxima Etapa

**Etapa atual:** Plano apresentado, aguardando aprovacao.

**Proxima skill a invocar:** `Skill({ skill: "dev-team-kit-fv:18-repo-auditor" })` para gerar/validar `docs/repo-audit/current.md` antes de Slice 0.

Apos auditoria, despachar Slice 0 com handoff:

```markdown
## Handoff → Backend (Slice 0)
- Contexto: ver docs/repo-audit/current.md secao Auth/Sessions
- Objetivo: Prisma models de auth + Auth.js v5 base + middleware shell (sem providers ainda)
- Entrada: schema.prisma atual, AUTH_SECRET ainda a gerar
- Output esperado: migration aplicada, lib/auth.ts compilavel, smoke do dev server passa
- Criterio de aceitacao: `npx prisma migrate dev` ok + `npm run dev` sobe sem erro
- Search-first: Context7 MCP para next-auth v5 + @auth/prisma-adapter
```

## 8. Criterio de Conclusao

A feature esta pronta quando:
- [ ] Os 4 slices passaram por QA + Security + Reviewer
- [ ] Migration aplicada sem afetar `User` existente
- [ ] Login Google e Login GitHub funcionam em dev e em staging
- [ ] Account linking validado (mesmo email → mesma conta OU contas separadas conforme decisao do Slice 0)
- [ ] Middleware protege rotas autenticadas; logout limpa sessao
- [ ] Cookies com `httpOnly`, `secure`, `sameSite=lax` em prod
- [ ] Documenter atualizou docs de auth (`/docs/auth.md` ou ADR)
- [ ] Release Manager preparou changelog se for release formal

---

**Nota de disciplina:** Este plano nao implementa codigo. Implementacao e responsabilidade de Backend (skill 03) e Frontend (skill 04) **dentro de cada slice**, com pesquisa prevista via Context7 MCP. O Orquestrador para aqui e aguarda aprovacao do plano ou ajuste do escopo.
