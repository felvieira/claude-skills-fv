---
scenario: 18-repo-auditor
pass: treatment
model: claude-opus-4-7
tokens_in_approx: 2400
tokens_out_approx: 2100
time_seconds: 55
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.0
notes: "audit persistido em docs/repo-audit/, harnessability score, splits (routes/schema/services/infra), handoff explicito"
---

# Auditoria do repo Node.js + Express + Mongo legado

Voce esta na situacao classica que a skill `18-repo-auditor` resolve: contexto disperso, sem fotografia operacional. A regra ouro: **nao explore o codigo direto — produza primeiro um artefato persistido em `docs/repo-audit/current.md` que o resto das skills va consumir.** Isso evita re-leitura cara a cada task.

## Plano de execucao (1 dia util)

### 1) Bootstrap do diretorio de auditoria (5 min)

```bash
mkdir -p docs/repo-audit/history
touch docs/repo-audit/current.md
```

Se o kit estiver em `.bot/`, usar `.bot/docs/repo-audit/`.

### 2) Coleta de sinais (20 min)

Rodar em paralelo, capturando saidas brutas pra alimentar o relatorio:

```bash
cat package.json | jq '{name,version,engines,scripts,dependencies,devDependencies}'
node -v && npm -v
git log --oneline -30
git log --since="6 months ago" --pretty=format:"%an" | sort -u | wc -l
npm outdated --json
npm audit --json
find . -maxdepth 3 -name "*.md" -not -path "./node_modules/*"
ls -la .env* 2>/dev/null
find . -name "Dockerfile*" -o -name "docker-compose*" -o -name ".github" -type d
```

### 3) Deteccao de splits (10 min)

Pra Express + Mongo, vao existir com altissima probabilidade:

- **routes.md** — `grep -rn "router\.\(get\|post\|put\|delete\|patch\)" src/ routes/ api/`
- **schema.md** — `find . -name "*.model.js" -o -name "*Schema*.js"` + Mongoose `mongoose.Schema(...)`
- **services.md** — `find . -name "*Service.js" -o -path "*/services/*"`
- **infra.md** — Dockerfile, `.github/workflows/`, ecosystem.config.js (PM2), Procfile

`components.md` provavelmente NAO se aplica (backend puro).

### 4) Preencher `current.md` (40 min)

Estrutura usando `templates/audit.md`:

```markdown
# Repo Audit — <nome-do-projeto>

> Ultima revisao: 2026-05-22 | Auditor: skill 18 | Proxima revisao sugerida: 2026-08-22

## Stack detectada
- Runtime: Node.js v<X> (de package.json `engines.node`)
- Framework: Express v<Y>
- DB: MongoDB via Mongoose v<Z>
- Auth: <jwt|session|passport — detectar>
- Testes: <jest|mocha|none> com coverage <N>%
- Lint: <eslint config|none>

## Estrutura
- `src/` ou raiz: <padrao>
- `routes/` → `controllers/` → `services/` → `models/` (verificar)
- Ver `routes.md` para mapa completo de endpoints
- Ver `schema.md` para modelos Mongoose
- Ver `services.md` para camada de logica

## Governanca
- [ ] `memory/constitution.md` — AUSENTE (sugerido: rodar `/constitution`)
- [ ] ADRs em `docs/adr/` — AUSENTE
- [ ] `AGENTS.md` ou `CLAUDE.md` — verificar

## Riscos & gaps
- README desatualizado (confirmado pelo usuario)
- npm audit: <N high, M critical> (preencher)
- npm outdated: <K> deps com major bumps disponiveis
- TODOs no codigo: `grep -rn "TODO\|FIXME\|HACK" --include="*.js" | wc -l`
- Codigo morto suspeito: pastas sem mod ha > 18 meses

## Harnessability Score
- Static typing: 0 (JS puro, sem JSDoc strict)
- Linter: <+15 se .eslintrc, senao 0>
- Module boundaries: <+15 se padrao routes/controllers/services claro>
- Testes > 60%: <verificar coverage>
- CI: <+10 se .github/workflows/ existe>
- AGENTS.md/CLAUDE.md: <+10 se existe>
- Audit recente: +5 (este artefato)
- Constitution: 0 (ausente)
- Dep scanner: <+5 se dependabot.yml ou .snyk>

**Total estimado: 30-50/100 — Media harnessability**

## Ambient Affordances
**Top 3 gaps esperados:**
- Sem TypeScript / sem JSDoc strict (refactor inseguro)
- Sem constitution / ADRs (decisoes implicitas)
- Cobertura provavelmente < 40%

**Recomendacao:** skill 23 (migration-refactor) ou skill 38 (architecture-deepener) ANTES de feature pesada.

## Automacoes Recomendadas (modo recommend)

### Alta prioridade
- [ ] `/constitution` — projeto maduro (4 anos) sem governanca formal
- [ ] Hook `PreToolUse` bloqueando edicao de `.env*` files
- [ ] Subagent `security-auditor` antes de proximo release

### Media prioridade
- [ ] Skill 03 (backend-api) para padronizar novos endpoints
- [ ] Skill 06 (security-review) — Mongo + Express tem patterns classicos de NoSQL injection
- [ ] Skill 20 (observability-sre) — adicionar logs estruturados e healthcheck
- [ ] MCP server do MongoDB para queries diretas

### Baixa prioridade
- [ ] Skill 10 (documenter) para reescrever README
- [ ] Skill 05 (qa-testing) para subir coverage

## Proxima skill sugerida
1. Se objetivo e estabilizar: skill 06 (security-review) → skill 20 (observability)
2. Se objetivo e evoluir: skill 38 (architecture-deepener) → skill 03 (backend-api)
3. Se objetivo e documentar: skill 10 (documenter) consumindo este audit
```

### 5) Gerar splits enxutos (30 min)

Cada split com **~200 linhas max** usando notacao compacta. Exemplo `routes.md`:

```markdown
# Routes

## /api/users [auth: jwt]
- GET / → UserController.list — paginated
- POST / → UserController.create — body: {name,email,password}
- GET /:id → UserController.get
- PUT /:id → UserController.update [auth: owner]
- DELETE /:id → UserController.delete [auth: admin]

## /api/auth
- POST /login → AuthController.login
- POST /register → AuthController.register
- POST /refresh → AuthController.refresh [auth: refresh-token]
```

### 6) Handoff

Entregar pro Orchestrator (skill 09):
- **Caminho:** `docs/repo-audit/current.md` + splits
- **Confirmado:** stack, fluxos principais, riscos top-3
- **Incerto:** cobertura real de testes (rodar `npm test -- --coverage`), uso real de cada endpoint (precisa de logs de prod ou analytics)
- **Proxima skill:** baseado no objetivo do usuario (ver "Proxima skill sugerida" no audit)

## Por que esse caminho economiza semanas

- Toda skill futura le `docs/repo-audit/current.md` (200 linhas) em vez de re-escanear 200+ arquivos
- Splits permitem leitura cirurgica (so abre `schema.md` quando vai mexer em model)
- `history/` mantem snapshots — se uma decisao foi tomada com stack X em mar/2026, sabemos o contexto
- Harnessability score ja indica se `/swarm` autonomous e viavel (provavelmente nao neste repo — supervisao com `/auto`)

**Tempo total: 1 dia util. ROI: cada task subsequente economiza ~70% do tempo de exploracao.**
