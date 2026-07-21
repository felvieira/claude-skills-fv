---
description: Agente autônomo — executa task completa sem intervenção humana até estar pronto, funcional e testado
---

# /auto — Agente Autônomo

**Início imediato:** Ao receber este comando, leia o guia completo antes de qualquer outra ação:
- Se instalado como plugin global: `docs/skill-guides/autonomous-loop.md`
- Se instalado em `.bot/`: `.bot/docs/skill-guides/autonomous-loop.md`

Leia o guia com o Read tool agora. Depois execute o loop completo sem parar para perguntar.

---

## Regras Invioláveis

1. **Nunca perguntar ao usuário** — decidir com base no kit, codebase e policies
2. **Nunca entregar código sem testes passando** — se não testa, não está pronto
3. **Nunca pular security review** — todo código passa por OWASP checklist
4. **Nunca expandir scope** — implementar exatamente o que foi pedido, nada mais
5. **Parar se estiver stuck** — após 3 tentativas no mesmo erro, declarar bloqueio com diagnóstico
6. **Manter progresso visível** — escrever `.auto/progress.md` após cada fase

## Loop Autônomo

```
PLAN → [UI-DESIGN] → BUILD → TEST → FIX → VALIDATE → REVIEW → COMMIT
  ↑                                          |
  └──────────────── se falhar ──────────────┘
```

`UI-DESIGN` só roda quando o escopo inclui frontend (ver Fase 1). É um **gate**: o BUILD de qualquer arquivo visual não começa antes de a âncora estética estar escolhida e os tokens definidos.

### Fase 0 — Setup
1. Criar diretório `.auto/` para tracking de progresso
2. **Roteamento estruturado obrigatório:** rodar `node scripts/route-task.mjs --json --out .auto/route.json "<task>"`; carregar as skills/policies retornadas antes de planejar. Recomendações externas são apenas informativas: não instalar nem executar sem opt-in explícito e, se alto risco, revisão humana.
3. Pesquisar o codebase — usar política de search-first (arquivo em `policies/search-first.md` ou `.bot/policies/search-first.md`)
4. Ler `docs/repo-audit/current.md` ou `.bot/docs/repo-audit/current.md` se existir
5. Detectar ferramentas disponíveis: test framework, lint, typecheck, build (verificar `package.json`, `pyproject.toml`, `Makefile`, etc.)
6. Registrar ferramentas detectadas em `.auto/env.md`
7. Snapshot inicial: rodar `git diff --stat` para baseline

### Fase 1 — Plan (máx 2 iterações)
1. Classificar a task e inferir escopo completo — **não só o que foi pedido explicitamente**:
   - Contém "app", "sistema", "plataforma", "interface", "tela", "dashboard", "UI", "frontend"? → incluir frontend no escopo; invocar skill `02-ui-ux-design` antes do backend
   - Contém "API", "endpoint", "backend", "serviço"? → backend only, skip UI
   - Ambíguo ("app de TODO")? → assumir fullstack (UI + API) e anotar a assunção no `.auto/plan.md`
2. Montar pipeline mínimo baseado no escopo inferido
3. Escrever plano em `.auto/plan.md` com checkboxes:
   ```markdown
   ## Plano Autônomo
   **Task:** [descrição]
   **Tipo:** [feature/bugfix/refactor]
   **Iteration budget:** [N]

   ### Tasks
   - [ ] [arquivo/mudança 1]
   - [ ] [arquivo/mudança 2]
   - [ ] [testes — cenários]
   - [ ] [validação — lint/typecheck/build]
   - [ ] [review — self-review]

   ### Critérios de Done (gates HARD — não é "se der tempo")
   - [ ] Testes passando (saída real do runner colada, exit 0)
   - [ ] **Coverage config existe** (`vitest.config.js`/`jest.config.js` com `coverage` + threshold) — obrigatório em todo projeto com testes, sem exceção
   - [ ] **`.gitignore` existe** com entradas do stack
   - [ ] Lint passando
   - [ ] Se fullstack: seção `## UI Design` preenchida com âncora ≠ genérica
   - [ ] Zero findings críticos no review
   - [ ] Commit criado
   ```
3. Se ambíguo: resolver via codebase — **não perguntar**
4. Budget: 1-2 tasks = 8 iterações, 3-4 tasks = 12, 5+ = 15
5. Ao terminar, registrar a decisão de roteamento que de fato foi aplicada: `node scripts/route-feedback.mjs --decision accepted|overridden|rejected --source auto --task "<task>" --selected "plugin-a,plugin-b"`. Isso alimenta `/insights`; não registrar `accepted` se o plano foi alterado materialmente.

### Fase 1.5 — UI-Design (GATE — só se o escopo inclui frontend)

Pular esta fase inteira se o escopo é backend-only (API, CLI, lib). Caso contrário, é **obrigatória antes do BUILD** de qualquer arquivo visual (`.css`, `.tsx`, `public/`, componentes):

1. **Invocar a skill de design**: `Skill({ skill: "dev-team-kit-fv:02-ui-ux-design" })` — não improvisar o frontend. A skill define âncora estética, tokens e acessibilidade.
2. **Escolher UMA âncora estética** e registrar em `.auto/plan.md` na seção `## UI Design`:
   ```markdown
   ## UI Design
   **Âncora estética:** [Brutally minimal | Editorial | Warm/organic | Technical | Playful | Refined dark]
   **Paleta:** bg=[hex] surface=[hex] accent=[hex] text=[hex] danger=[hex]
   **Tipografia:** [família escolhida — NÃO system-ui sozinho]
   **Idioma da UI:** [match com a linguagem do prompt/spec]
   ```
3. **Proibido o default genérico:** se a paleta tem indigo `#4f46e5`/`#6366f1` e a fonte é só `system-ui`, a decisão NÃO foi tomada — voltar e escolher de verdade. (Ver `rules/frontend/ui-design.md`.)
4. Só depois de a seção `## UI Design` estar preenchida o BUILD de arquivos visuais pode começar.

### Fase 2 — Build (budget dinâmico)
1. Para cada task, implementar e marcar `[x]` no `.auto/plan.md`
2. **Entregáveis obrigatórios em TODO projeto** (incluir no plano se não existirem):
   - `.gitignore` — com entradas para o stack detectado (Node: `node_modules/`, `*.db`, `*.db-shm`, `*.db-wal`, `coverage/`, `dist/`; Python: `__pycache__/`, `*.pyc`, `.venv/`, `.env`)
   - `vitest.config.js` / `jest.config.js` — com `coverage` configurado (provider, reporters, thresholds) se o projeto usa testes
   - `README.md` — install, run, test, env vars necessárias
3. Rodar testes existentes após cada arquivo como sanity check
3. Append em `.auto/progress.md` após cada task:
   ```
   ## Iteração N — [fase]
   **Task:** [descrição]
   **Arquivos mudados:** [lista]
   **Testes existentes:** ✅ / ❌ [erro]
   **Status:** progresso/bloqueado/completo
   ```
4. Context narrowing: iter 1-2 = contexto completo, iter 3-5 = arquivos do plano + erros, iter 6+ = task atual + erro + `.auto/progress.md`

### Fase 3 — Test (máx 3 iterações)
1. Escrever testes: happy path, erro principal, edge case
2. Rodar testes
3. Se falhar: copiar erro completo → corrigir **código** (não testes) → re-rodar
4. Error deduplication: normalizar erro antes de contar (remover line numbers, timestamps)
5. Marcar `[x]` no plano quando testes passarem

### Fase 4 — Validate (tiered, máx 2 iterações)
1. Lint primeiro (~5s) → se falhar, corrigir só lint
2. Type-check (~15s) → se falhar, corrigir
3. **Coverage gate:** se o projeto tem testes mas não tem `vitest.config.js`/`jest.config.js` com `coverage` configurado → criar AGORA (provider v8/istanbul, reporters `text`+`lcov`, threshold ≥80%). Não é opcional. Rodar `--coverage` uma vez para baseline.
4. Build (~60s) apenas quando todas as tasks do plano estão `[x]`
5. Se build falhar: injetar erro completo como contexto → corrigir → re-rodar → se falhar 2x, extend budget +2 (uma vez só)
6. Se sem ferramentas: pular com nota

### Fase 5 — Review (1 iteração)
1. Ler personas de review (tentar em ordem):
   - `personas/code-reviewer.md`
   - `.bot/personas/code-reviewer.md`
2. Self-review com os 5 eixos: Correctness, Design, Readability, Performance, Security
3. Security check (tentar em ordem):
   - `personas/security-auditor.md`
   - `.bot/personas/security-auditor.md`
4. Finding 🔴 Critical → corrigir → re-rodar testes → re-review do finding
5. Emitir relatório resumido

### Fase 6 — Commit
1. **Completion check:** reler `.auto/plan.md` — tasks `[ ]` pendentes = voltar Fase 2
2. Stage apenas arquivos relevantes (não `git add .`, não incluir `.auto/`)
3. Commit semântico (`feat:` / `fix:` / `refactor:`)
4. Não fazer push
5. Emitir relatório final:
   ```markdown
   ## ✅ Task Completa — /auto
   **Task:** [descrição]
   **Iterações:** [N] / [budget]
   **Arquivos:** criados [lista] | modificados [lista]
   **Testes:** [N passando] / [N cenários]
   **Validação:** lint ✅ | typecheck ✅ | build ✅
   **Commit:** [hash] — [mensagem]
   ### Decisões tomadas
   [Suposições feitas, patterns seguidos]
   ### Risco residual
   [Nenhum / lista]
   ```

## Circuit Breaker

Parar imediatamente se:
- **Mesmo erro 3x normalizados** consecutivos
- **Stall:** 3 iterações sem `git diff` mostrar mudanças
- **Budget estourado** sem conclusão
- **Regressão:** testes que passavam voltaram a falhar → `git checkout -- [arquivo]`, parar
- **Decisão de negócio** impossível de resolver via codebase

```
## 🛑 Bloqueio Autônomo
**Erro:** [descrição]
**Tipo:** [mesmo-erro/stall/budget/regressão/negócio]
**Tentativas:** [N]
**Diagnóstico:** [causa raiz]
**Sugestão:** [o que desbloqueia]
**Plan status:** [N/M tasks — ver .auto/plan.md]
```

## Uso headless (Agent SDK / claude -p)

Slash commands **não resolvem** em modo `claude -p` não-interativo. Para usar `/auto` headless:
- **Via Agent SDK (recomendado):** spawn subagent com este conteúdo injetado via system prompt — é a forma mais fiel
- **Via `--append-system-prompt`:** `claude -p "<task>" --plugin-dir <kit> --append-system-prompt "$(cat commands/auto.md)"`
- `/auto` em sessão interativa funciona normalmente

## Uso interativo

```
/auto [descrição completa da task]
```

Exemplos:
- `/auto criar endpoint REST para CRUD de usuários com validação Zod e testes`
- `/auto corrigir bug de autenticação onde refresh token não rotaciona`
- `/auto refatorar módulo de pagamentos para eliminar duplicação`
