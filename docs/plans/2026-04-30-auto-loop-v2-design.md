# Auto-Loop v2 — Design

**Data:** 2026-04-30
**Status:** Aprovado pelo usuário, pronto para plan de implementação
**Origem:** Comparação com [gnhf](https://github.com/kunchenguid/gnhf) — incorporar suas vantagens operacionais sem perder nossas vantagens de qualidade (validação em camadas, plan-checkbox, polishing pass).

## Objetivo

Transformar o `/loop` atual (Ralph-style, 669 linhas, single-file) num orquestrador autônomo que entrega tasks **prontas, funcionais, bonitas e testadas** com confiança alta o suficiente para rodar de noite e acordar com PRs prontos para merge.

## Escopo (decidido em brainstorming)

- **Agentes:** claude + codex (CLI direto, sem servidor local).
- **Worktree:** integrado ao loop, com modo paralelo (`--worktree --parallel N task1 -- task2 -- task3`).
- **Polishing pass configurável:** `--polish=none|light|standard|full`, default `standard`.
- **Quick wins do gnhf:** `--max-tokens`, `--stop-when`, prevent-sleep cross-OS, JSONL debug log com `error.cause`, backoff exponencial por tipo de erro, graceful interrupt em 2 estágios, resume robusto.
- **Arquitetura:** quebrar em módulos sob `scripts/auto-loop/`.

Fora de escopo: copilot/rovodev/pi, pacote npm publicável, configuração via `~/.auto-loop/config.yml` (pode vir depois).

## Arquitetura

```
scripts/auto-loop/
├── index.mjs              # entrypoint CLI, parse args, dispatch single vs parallel
├── runner.mjs             # main loop de uma run (substitui main() atual)
├── agents/
│   ├── index.mjs          # factory(name) → adapter
│   ├── claude.mjs         # adapter para `claude --print`
│   └── codex.mjs          # adapter para `codex exec`
├── worktree.mjs           # cria/preserva/limpa worktree, naming com colisão
├── parallel.mjs           # orquestra N runners simultâneos
├── polish.mjs             # passe de qualidade configurável
├── validation.mjs         # detect tools + tiered validation (lint→typecheck→test→build)
├── circuit-breaker.mjs    # erro deduplicado, stall, mesmo erro Nx
├── completion.mjs         # detect done/blocked + plan checkbox override
├── context.mjs            # buildContext em 3 tiers
├── plan.mjs               # parse/contar checkboxes em .auto/plan.md
├── session.mjs            # save/load .auto/session.json para resume
├── logger.mjs             # JSONL debug log + console pretty + terminal title
├── interrupt.mjs          # SIGINT 2-estágios + SIGTERM
├── prevent-sleep.mjs      # caffeinate / systemd-inhibit / SetThreadExecutionState
├── backoff.mjs            # classificador de erro + exponential backoff
└── stop-when.mjs          # avalia condição natural-language do agente
```

Cada módulo é um `.mjs` autocontido, importável, com 1-2 funções públicas. Substituível em testes via `vi.mock`.

`scripts/auto-loop.mjs` (single file atual) vira shim de compat: re-exporta `index.mjs`. Quem chamar `node scripts/auto-loop.mjs "task"` continua funcionando.

## Componentes principais

### Agent adapters

Interface comum:

```js
{
  name: 'claude' | 'codex',
  invoke({ prompt, model, timeout, signal }) → { output, error, status, tokens? }
  isPermanentError(err) → boolean   // ex: low credits → abort
  isRetryableError(err) → boolean   // ex: rate limit / network → backoff
}
```

`claude.mjs`: `claude --print --model <m> <prompt>`. Fallback sem `--model` se a CLI for antiga (lógica que já existe).

`codex.mjs`: `codex exec --full-auto <prompt>` (modo non-interactive equivalente). Tokens via stdout JSON quando disponível.

Token tracking: cada adapter tenta extrair `tokens.input + tokens.output` do output (formato varia por agente). `null` se não tiver — o cap `--max-tokens` simplesmente não dispara.

### Worktree integrado

```
<repo>/                              ← repo principal (intocado)
<repo>-auto-worktrees/
  ├── <slug-1>/                      ← worktree run 1, branch auto/<slug-1>
  └── <slug-2>/                      ← worktree run 2, branch auto/<slug-2>
```

- Slug derivado da task (primeiras 6 palavras, kebab-case).
- Colisão → sufixo `-1`, `-2`.
- Worktree com commits → preserva, imprime path + comando de limpeza.
- Worktree sem commits → remove no exit.
- Resume: detecta worktree existente com `auto/<slug>` matching, oferece continuar.

### Modo paralelo

`--worktree --parallel 3 -- task1 -- task2 -- task3`

`parallel.mjs` spawna 3 instâncias do runner em worktrees separados, agrega logs por run-id, imprime tabela final consolidada. Cada um tem seu próprio JSONL log + circuit breaker.

Limite hard: `--parallel` requer `--worktree` (sem worktree, runs paralelos batem no mesmo working tree).

### Polishing pass

Roda **depois** de validation passar e **antes** do commit final.

| Nível | O que roda |
|-------|-----------|
| `none` | nada (comportamento atual) |
| `light` | `simplify` skill nos arquivos alterados |
| `standard` (default) | `simplify` + `review`, 1 retry de fix se review apontar issues bloqueantes |
| `full` | `simplify` + `review` + `security-review` + `test` (cobertura mínima dos arquivos novos), até 3 retries |

Cada skill roda como prompt extra para o **mesmo agente**, com output filtrado pra `.auto/polish-<skill>.md`. Fix retries aproveitam o circuit breaker existente. Issues não-bloqueantes viram comentários no `progress.md` mas não impedem commit.

### Quick wins do gnhf

**`--max-tokens N`** — abort mid-iteration quando `cumulativeTokens >= N`. Tracking via adapter. Se agente não reporta, flag não dispara.

**`--stop-when "<condição>"`** — após cada iteração, agente recebe instrução adicional pra reportar `STOP_WHEN_MET: true|false` no output. Se true, encerra loop limpo. Persiste em `session.json` para resume.

**Prevent-sleep cross-OS** — `prevent-sleep.mjs` detecta plataforma:
- macOS: spawn `caffeinate -dimsu` em background, kill no exit.
- Linux: spawn `systemd-inhibit --what=sleep:idle sleep infinity`, kill no exit.
- Windows: PowerShell helper com `SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED)`.

Default `on`, flag `--no-prevent-sleep` desliga.

**JSONL debug log** — `.auto/runs/<run-id>/debug.jsonl`. Eventos: `iteration.start`, `agent.invoke`, `agent.result`, `validation.run`, `validation.result`, `commit`, `breaker.tripped`, `polish.start`, `polish.result`, `error` (com `error.cause` chain completo). Cada linha um objeto JSON com `ts`, `event`, `runId`, `iteration`, `payload`. Vital para diagnosticar falhas noturnas.

**Backoff exponencial classificado** — `backoff.mjs`:
- `permanent` (low credits, auth fail) → abort imediato com mensagem.
- `retryable` (rate limit, network, 5xx) → backoff `min(60s * 2^attempt, 600s)` até 5 tentativas, depois abort.
- `agent-reported` (agente devolveu erro mas processo OK) → próxima iteração imediata (comportamento atual).

**Graceful interrupt 2-estágios** — `interrupt.mjs`:
- 1º Ctrl+C → flag `gracefulStop`, deixa iteração atual terminar, depois sai limpo (commita se valid).
- 2º Ctrl+C → SIGKILL imediato, rollback se uncommitted.
- SIGTERM → equivalente ao 2º.

**Resume robusto** — `session.mjs` salva: prompt original, model, agent, max-tokens, stop-when, polish level, run-id, branch, commit history. Rerun em branch `auto/<slug>` existente:
- prompt igual → continua.
- prompt diferente → pergunta: update/new branch/quit.
- TTY indisponível (stdin pipe) → erro claro.

## Data flow

```
user invokes index.mjs
   ↓
parse args → dispatch:
   parallel? → parallel.mjs spawna N runners em worktrees
   single?   → runner.mjs (com ou sem worktree)
   ↓
runner.mjs:
   1. resolve agent adapter
   2. start prevent-sleep
   3. install signal handlers (interrupt.mjs)
   4. setup worktree if --worktree
   5. detect tools (validation.mjs)
   6. load/init session (session.mjs)
   7. open JSONL log (logger.mjs)
   ↓
   loop while iteration < max && !gracefulStop:
      build context (context.mjs)
      check token cap → abort if exceeded
      invoke agent (with backoff on retryable error)
      log JSONL
      check stop-when (stop-when.mjs)
      check completion (completion.mjs)
      run validation (validation.mjs)
      circuit-breaker checks (circuit-breaker.mjs)
      if validation fails → feedback into next iter
      if completion + plan complete + validation ok → break
   ↓
   if taskDone:
      polish pass (polish.mjs) per --polish level
      final validation
      commit
      preserve worktree (or cleanup if empty)
   ↓
   stop prevent-sleep, close log, write final report
```

## Error handling

- **Agent permanent error** (low credits, auth) → log to JSONL, print path, exit 2.
- **Agent retryable error** → backoff (60s → 120s → 240s → 480s, cap 600s), max 5 tentativas, depois abort com exit 3.
- **Agent reported failure in output** → next iter com erro como contexto, mesmo iteration count.
- **Validation fails** → next iter com erro, count incrementa, registra no breaker.
- **Same error 3x** → breaker trip, exit 4.
- **Stall (3 iters sem git diff)** → exit 5.
- **Token cap atingido** → graceful stop, commit if valid, exit 0 com mensagem.
- **stop-when matched** → graceful stop, commit if valid, exit 0.
- **Polish retry exhausted** → commita mesmo assim, marca `polish_incomplete: true` no session.
- **Worktree cleanup falha** → log warning, não falha o run.
- **SIGINT/SIGTERM** → ver interrupt 2-estágios.

Exit codes documentados no help (`auto-loop --help`).

## Testing strategy

**Padrão:** smoke tests node-based (mesmo padrão dos `scripts/test-*.mjs` existentes — não usa vitest/jest, segue convenção do repo).

`scripts/tests/auto-loop/`:
- `test-agents-claude.mjs` — mock spawn, valida CLI args.
- `test-agents-codex.mjs` — idem.
- `test-circuit-breaker.mjs` — erro normalizado, dedup, stall.
- `test-completion.mjs` — markers, semantic, plan override.
- `test-polish.mjs` — níveis, retry, fallback.
- `test-worktree.mjs` — naming, colisão, preserve/cleanup.
- `test-parallel.mjs` — agregação, isolamento.
- `test-backoff.mjs` — classificação, timing.
- `test-session.mjs` — save/load, prompt diff, resume flows.
- `test-stop-when.mjs` — parsing do output do agente.

Tests rodam em-memory com mocks de `child_process.spawn` e fs (tmpdir). Sem agente real. Cada arquivo é executável: `node scripts/tests/auto-loop/test-X.mjs`. Exit 0 = pass, exit 1 = fail. Runner agregador `scripts/tests/auto-loop/run-all.mjs`.

E2E manual: rodar `node scripts/auto-loop "adicionar campo X em form Y"` em repo de teste, validar branch, commits, JSONL.

## Migração / compat

- `scripts/auto-loop.mjs` continua existindo como shim que importa de `scripts/auto-loop/index.mjs`. Comando `node scripts/auto-loop.mjs "task"` segue funcionando.
- `.auto/` paths inalterados (plan.md, progress.md, env.md, session.json) — quem tem run em andamento não quebra.
- Novo: `.auto/runs/<run-id>/debug.jsonl` adicionado, mas paths antigos continuam.
- `commands/loop.md` atualiza com flags novas, mantém exemplos antigos.

## Riscos

1. **Codex CLI muda interface** — adapter quebra. Mitigação: testes de smoke no CI, version pinning documentado.
2. **Polish pass entra em loop infinito** — `simplify` reescreve, `review` aponta nova issue, loop. Mitigação: hard cap de 3 retries no `full`, breaker compartilhado.
3. **Paralelo + worktree pesado em disco** — 3 runs = 3 cópias do repo. Mitigação: usar `git worktree` (compartilha .git), documentar.
4. **`error.cause` em Node < 16.9** — feature relativamente nova. Mitigação: já requeremos Node 18+ no `package.json`, sem ação necessária.
5. **Prevent-sleep no Windows quebra se PowerShell bloqueado por política** — fallback silencioso, log warning.
6. **Polish skill prompts ficam stale** — skills evoluem, prompts no loop não. Mitigação: ler skill files em runtime, não hardcodar.

## Documentação (atualização obrigatória ao final)

**Arquivos a atualizar:**
- `commands/loop.md` — flags novas, exemplos atualizados, exit codes documentados, modo paralelo, polish levels.
- `README.md` (principal, **inglês**) — seção do `/loop` reescrita refletindo v2.
- `README.pt-BR.md` (novo, traduzido do README.md atual + atualizações v2) — versão pt-BR.
- `AGENTS.md` — mencionar suporte multi-agente (claude/codex).
- `policies/quality-gates.md` — adicionar polish levels como gate configurável.
- `skills/` que mencionam `/loop` (ex: `09-orchestrator/`, `04-frontend-integration/`) — referências atualizadas.

**Política bilíngue (nova, permanente):**
- README atual (pt-BR + título em inglês) renomeado para `README.pt-BR.md`.
- Novo `README.md` escrito em **inglês** passa a ser o canônico.
- Daqui em diante, qualquer mudança em README/docs principais é feita nos **dois** arquivos, com inglês como fonte primária.
- Adicionar nota no topo de cada README com link cruzado: `🇧🇷 [Português](README.pt-BR.md)` / `🇺🇸 [English](README.md)`.
- Registrar policy em `policies/documentation-i18n.md` (novo).

**Ordem de execução:**
1. Renomear `README.md` → `README.pt-BR.md`.
2. Criar novo `README.md` em inglês (tradução + atualizações v2).
3. Adicionar links cruzados em ambos.
4. Atualizar demais docs.
5. Criar `policies/documentation-i18n.md`.

## Próximo passo

Invocar `superpowers:writing-plans` para gerar plano de implementação detalhado em fases, com critérios de aceitação por etapa.
