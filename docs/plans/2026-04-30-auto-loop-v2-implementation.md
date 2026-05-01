# Auto-Loop v2 — Implementation Plan

**Design:** [2026-04-30-auto-loop-v2-design.md](./2026-04-30-auto-loop-v2-design.md)
**Strategy:** Implementação em fases. Cada fase tem critérios de aceitação verificáveis. Subagents rodam em paralelo dentro de cada fase quando os módulos são independentes.

## Phase 1 — Scaffolding (sequencial, base de tudo)

Cria a estrutura de diretórios + módulos sem lógica para que as fases seguintes possam rodar em paralelo sem colidir.

**Tarefas:**
1. Criar `scripts/auto-loop/` e `scripts/auto-loop/agents/`.
2. Criar stubs vazios com JSDoc de cada módulo listado no design (todos os `.mjs` exportando funções no-op).
3. Mover `scripts/auto-loop.mjs` para `scripts/auto-loop/_legacy.mjs` (referência).
4. Criar novo `scripts/auto-loop.mjs` como shim que faz `import('./auto-loop/index.mjs')`.
5. Criar `scripts/tests/auto-loop/` com `run-all.mjs` esqueleto.
6. Verificar que `node scripts/auto-loop.mjs --help` ainda funciona (mesmo que vazio).

**Aceitação:**
- `ls scripts/auto-loop/` lista todos os módulos do design.
- `node scripts/auto-loop.mjs --help` retorna 0.
- `_legacy.mjs` preservado como referência.

## Phase 2 — Core extraction (paralelo, 4 subagents)

Migra lógica do `_legacy.mjs` para módulos. Cada subagent pega um módulo independente.

**Subagent A — validation.mjs + plan.mjs:**
- Mover `detectTools()`, `runValidation()`, `runCommand()`.
- Mover `countPlanTasks()`, `hasPendingTasks()`, `calcBudget()`.
- Tests: `test-validation.mjs`, `test-plan.mjs`.

**Subagent B — completion.mjs + context.mjs:**
- Mover `detectCompletion()` + constantes `COMPLETION_MARKERS`/`BLOCKED_MARKERS`/patterns.
- Mover `buildContext()` (3 tiers).
- Tests: `test-completion.mjs`.

**Subagent C — circuit-breaker.mjs + session.mjs:**
- Mover classe `CircuitBreaker`, `normalizeError`, `hashError`.
- Criar `session.mjs`: `save({...})`, `load()`, `compareSession(a,b)`, `resolvePromptConflict()`.
- Tests: `test-circuit-breaker.mjs`, `test-session.mjs`.

**Subagent D — logger.mjs:**
- Console pretty (com prefixos, cores).
- JSONL debug log: `openLog(runId)`, `logEvent(event, payload)`, `closeLog()`.
- Helpers: `serializeError(err)` que extrai `error.cause` chain.
- Terminal title updater (`setTitle(text)`, restore on exit).
- Tests: `test-logger.mjs`.

**Aceitação por módulo:**
- Tests passam (exit 0 em `node scripts/tests/auto-loop/test-X.mjs`).
- Imports funcionam (`node -e "import('./scripts/auto-loop/X.mjs')"`).

## Phase 3 — Agent adapters (paralelo, 2 subagents)

**Subagent A — agents/claude.mjs:**
- Implementar interface comum: `name`, `invoke()`, `isPermanentError()`, `isRetryableError()`.
- Lógica do `runClaude()` legacy + fallback sem `--model`.
- Token extraction quando disponível.
- Classificação de erro: low credits → permanent, rate limit/network → retryable.
- Tests: `test-agents-claude.mjs`.

**Subagent B — agents/codex.mjs + agents/index.mjs + backoff.mjs:**
- Implementar adapter codex (`codex exec --full-auto <prompt>`).
- `agents/index.mjs`: factory `getAgent(name)` retorna adapter.
- `backoff.mjs`: `classify(err, adapter) → permanent|retryable|transient`, `withBackoff(fn, classify)`.
- Tests: `test-agents-codex.mjs`, `test-backoff.mjs`.

**Aceitação:**
- Factory retorna adapter correto por nome.
- Backoff faz expo (60s → 120s → 240s → 480s, cap 600s, max 5).
- Permanent error → throw imediato.

## Phase 4 — gnhf quick wins (paralelo, 3 subagents)

**Subagent A — prevent-sleep.mjs:**
- Detect platform: macOS / Linux / Windows.
- macOS: spawn `caffeinate -dimsu`, kill on exit.
- Linux: spawn `systemd-inhibit --what=sleep:idle sleep infinity`, kill on exit.
- Windows: PowerShell `[void][Win32]::SetThreadExecutionState(...)` em background process.
- Fallback silencioso se ferramenta indisponível, log warning.
- Tests: `test-prevent-sleep.mjs` (mock spawn, verifica args por plataforma).

**Subagent B — interrupt.mjs + stop-when.mjs:**
- `interrupt.mjs`: SIGINT 2-estágios, SIGTERM = force. Expõe `gracefulStop` flag + `forceStop` flag, registra handlers, restore on exit.
- `stop-when.mjs`: injeta instrução no prompt + parse `STOP_WHEN_MET: true|false` do output.
- Tests: `test-interrupt.mjs`, `test-stop-when.mjs`.

**Subagent C — runner.mjs + index.mjs (CLI):**
- `runner.mjs`: orquestra uma run completa usando todos os módulos. Substitui `main()` do legacy.
- `index.mjs`: parse args, dispatch single vs parallel, help text com exit codes.
- Args: `--agent`, `--max-iterations`, `--max-tokens`, `--stop-when`, `--polish`, `--worktree`, `--parallel`, `--no-prevent-sleep`, `--no-commit`, `--push`, `--model`, `--verbose`.
- Tests: `test-runner.mjs` (mock agent, valida fluxo).

**Aceitação:**
- `node scripts/auto-loop.mjs --help` lista todas as flags + exit codes.
- `node scripts/auto-loop.mjs "test"` (com mock) roda fluxo end-to-end.
- Ctrl+C 1x deixa iter terminar, 2x força.

## Phase 5 — Worktree + paralelo (sequencial, depende de Phase 4)

1. **worktree.mjs:**
   - `createWorktree(slug, baseRepo)` — gera `<repo>-auto-worktrees/<slug>`, branch `auto/<slug>`, sufixo na colisão.
   - `preserveOrCleanup(worktreePath)` — preserva se há commits, remove se vazio.
   - `findExistingWorktree(slug)` — para resume.
2. **parallel.mjs:**
   - `runParallel(tasks, opts)` — spawna N runners em worktrees, agrega output prefixado, tabela final.
   - Hard cap default 4, limit 8.
3. **Integração no `runner.mjs`:** flag `--worktree` cria worktree antes do loop, cleanup no exit.
4. **Integração no `index.mjs`:** `--parallel N -- task1 -- task2` dispatches para `parallel.mjs`.
5. Tests: `test-worktree.mjs`, `test-parallel.mjs`.

**Aceitação:**
- Worktree criado fora do repo principal.
- Resume detecta worktree existente.
- Runs paralelos isolados (cada um seu runId, log, breaker).

## Phase 6 — Polishing pass (sequencial, depende de Phase 4)

1. **polish.mjs:**
   - `getPolishLevel(name) → { skills: [...], retries: N }`.
   - `runPolishPass(level, agent, files, opts)` — itera nas skills, monta prompt com skill template + diff, invoca agent, parse output.
   - `classifyIssues(reviewOutput) → { blocking: [...], nonBlocking: [...] }`.
   - Retry loop com circuit breaker compartilhado.
2. **Integração no `runner.mjs`:** após validation final, antes do commit, chamar polish se `--polish !== 'none'`.
3. Mark `polish_incomplete: true` em session se retries esgotados.
4. Tests: `test-polish.mjs`.

**Aceitação:**
- `--polish=none` = comportamento legacy.
- `--polish=standard` (default) roda simplify + review.
- Retry de issue bloqueante usa breaker.
- Polish exhausted → commita mesmo, marca incomplete.

## Phase 7 — Tests integration

1. `scripts/tests/auto-loop/run-all.mjs`: roda todos os `test-*.mjs`, agrega resultado.
2. Adicionar npm script `npm run test:auto-loop` (se houver `package.json` raiz, criar; ou doc no README).
3. Smoke test E2E: rodar contra repo de teste com agent mockado.

**Aceitação:**
- `node scripts/tests/auto-loop/run-all.mjs` exit 0.
- Cobertura de todos os módulos novos.

## Phase 8 — Docs (paralelo, 3 subagents)

**Subagent A — README bilíngue:**
- Renomear `README.md` → `README.pt-BR.md`.
- Adicionar header com link cruzado em `README.pt-BR.md`.
- Criar novo `README.md` em **inglês**, traduzindo + atualizando seção `/loop` para v2.
- Adicionar header com link cruzado em `README.md`.

**Subagent B — Command + skill docs:**
- Atualizar `commands/loop.md` (flags novas, exit codes, exemplos paralelo, exemplos polish).
- Atualizar `AGENTS.md` (mencionar suporte multi-agente).
- Atualizar skills que referenciam `/loop`: `skills/09-orchestrator/`, demais que matchearem grep.

**Subagent C — Policies:**
- Criar `policies/documentation-i18n.md` (política bilíngue inglês primário + pt-BR).
- Atualizar `policies/quality-gates.md` (polish levels como gate).
- Adicionar entrada no `CHANGELOG.md`.

**Aceitação:**
- `README.md` em inglês, `README.pt-BR.md` em pt-BR, link cruzado nos dois.
- `commands/loop.md` documenta todas as flags v2.
- Policies criadas/atualizadas.

## Final — Verification + commit

1. Rodar `node scripts/tests/auto-loop/run-all.mjs` — exit 0.
2. Rodar `node scripts/auto-loop.mjs --help` — output sane.
3. Smoke test mínimo: `node scripts/auto-loop.mjs "echo hello" --no-commit --max-iterations 1` (com mock).
4. `git status` clean depois de testes (sem `.auto/` lixo).
5. Commit único com mensagem `feat(auto-loop): v2 — multi-agent, worktree, parallel, polishing pass`.

## Dependency graph

```
Phase 1 (scaffolding)
  ↓
Phase 2 (core extraction)  ─┐
Phase 3 (agents + backoff) ─┤
Phase 4 (quick wins)       ─┴→ Phase 5 (worktree+parallel)
                                Phase 6 (polish)
                                  ↓
                                Phase 7 (tests integration)
                                  ↓
                                Phase 8 (docs)
                                  ↓
                                Final (verify + commit)
```

Phases 2/3/4 paralelizáveis depois de Phase 1. Phases 5/6 sequenciais (dependem de runner.mjs).
