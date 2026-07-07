---
description: Loop autônomo v2 — multi-agente (claude/codex), worktree paralelo, polishing pass, quick wins do gnhf
---

# /loop — Autonomous Loop v2

Invoca `scripts/auto-loop.mjs` para executar uma task de forma completamente autônoma. Versão 2 adiciona suporte multi-agente (claude + codex), worktree integrado com modo paralelo, passe de qualidade configurável (polishing pass), e quick wins inspirados no [gnhf](https://github.com/kunchenguid/gnhf).

**Diferença em relação ao `/auto`:**
- `/auto` — prompt-based: Claude lê o protocolo e executa no contexto atual
- `/loop` — process-based: Node.js roda o agente como subprocess, iterando até done

## Uso

```bash
# Task única (default)
node scripts/auto-loop.mjs "sua task aqui"

# Em repos consumidores (instalado em .bot/)
node .bot/scripts/auto-loop.mjs "sua task aqui"

# Multi-task em paralelo (worktrees isolados)
node scripts/auto-loop.mjs --worktree --parallel 3 \
  -- "implementar feature A" \
  -- "adicionar testes módulo B" \
  -- "refatorar API C"
```

## Flags

| Flag | Descrição | Default |
|------|-----------|---------|
| `--agent claude\|codex` | Agente a usar | `claude` |
| `--model <name>` | Modelo (apenas para `claude`) | `claude-sonnet-4-5` |
| `--max-iterations <n>` | Cap de iterações | auto (8/12/15) |
| `--max-tokens <n>` | Aborta quando tokens cumulativos passam de `n` | unlimited |
| `--stop-when "<cond>"` | Encerra loop quando agente reporta condição satisfeita | — |
| `--polish none\|light\|standard\|full` | Passe de qualidade após validation | `standard` |
| `--worktree` | Roda em git worktree isolado | false |
| `--parallel <n>` | Roda `n` tasks em paralelo (requer `--worktree`, max 8) | 1 |
| `--no-prevent-sleep` | Não previne sleep do sistema durante a run | false |
| `--validate` | Validação completa em cada iteração | false |
| `--no-commit` | Não fazer commit automático ao concluir | false |
| `--push` | Push após commit | false |
| `--verbose` | Mostrar output completo do agente | false |
| `-h, --help` | Mostrar ajuda | — |

## Exit codes

| Código | Significado |
|--------|-------------|
| `0` | Sucesso |
| `1` | Erro de uso (flag inválida, args faltando) |
| `2` | Erro permanente do agente (auth, low credits) |
| `3` | Retry exhausted (backoff esgotado) |
| `4` | Mesmo erro repetido (circuit breaker) |
| `5` | Stall (sem progresso em git diff) |
| `6` | Token cap atingido |
| `7` | Polish incompleto (commitou mesmo assim) |
| `130` | Interrompido pelo usuário (SIGINT) |
| `99` | Erro fatal |

## Polishing levels

Roda **depois** que lint/typecheck/test/build passam, e **antes** do commit. Usa skills do próprio kit como prompts adicionais para o agente.

| Nível | Skills rodadas | Retries em issues bloqueantes |
|-------|---------------|-------------------------------|
| `none` | (nenhuma) | 0 |
| `light` | `simplify` | 0 |
| `standard` (default) | `simplify` + `review` | 1 |
| `full` | `simplify` + `review` + `security-review` + `test` | 3 |

Issues não-bloqueantes viram comentários em `progress.md` mas não impedem commit. Se retries esgotam com bloqueante remanescente, commita mesmo e marca `polish_incomplete: true` em `.auto/session.json` (exit 7).

## Exemplos

```bash
# Task simples (polish=standard por default)
node scripts/auto-loop.mjs "criar endpoint REST /api/health com teste"

# Sem polish (comportamento v1)
node scripts/auto-loop.mjs "adicionar campo email" --polish=none

# Polish completo (review + security + cobertura de teste)
node scripts/auto-loop.mjs "implementar JWT auth" --polish=full

# Codex em vez de Claude
node scripts/auto-loop.mjs "refatorar módulo X" --agent codex

# Cap de tokens (aborta gracefully se exceder)
node scripts/auto-loop.mjs "task longa" --max-tokens 5000000

# Encerra cedo se condição em linguagem natural for satisfeita
node scripts/auto-loop.mjs "adicionar healthcheck" --stop-when "endpoint /health retorna 200"

# 3 features em paralelo, cada uma em worktree próprio
node scripts/auto-loop.mjs --worktree --parallel 3 \
  -- "feature A com testes" \
  -- "feature B com docs" \
  -- "fix bug X"

# Resume: rodando de novo na mesma branch auto/<slug> retoma a sessão
node scripts/auto-loop.mjs "task original" --worktree
```

## Padrões implementados

### Herdados do v1
| Padrão | Implementação |
|--------|--------------|
| Plan tracking | Checkboxes em `.auto/plan.md` |
| Inter-iteration memory | `.auto/progress.md` append-only |
| Context narrowing | 3 tiers: full → focused → minimal |
| Tiered validation | lint → typecheck → test → build |
| Error dedup | MD5 hash normalizado (sem line numbers/timestamps) |
| Completion override | Re-lê plano antes de parar — `[ ]` aberto = não done. Anti-parada-prematura: se a parada foi disparada por (a) sucesso já na 1ª iteração ou (b) 2+ falhas consecutivas do mesmo erro normalizado, insere 1 rodada extra perguntando "há mais melhorias/transformações promissoras a explorar?" antes de aceitar a parada como final. |
| Dynamic budget | 8 / 12 / 15 conforme complexidade |
| Validation feedback loop | Erro vira contexto da próxima iteração |
| Stall detection | 3 iterações sem `git diff` = stuck |
| Build-fix extension | +2 iterações se build falha na última (uma vez só) |

### Novos no v2
| Padrão | Implementação |
|--------|--------------|
| Multi-agente | Adapter para claude + codex (interface comum) |
| Worktree integrado | `--worktree` cria `<repo>-auto-worktrees/<slug>/`, branch `auto/<slug>`, preserva se há commits |
| Modo paralelo | `--parallel N` orquestra runners isolados, agrega logs prefixados, tabela final |
| Polishing pass | `--polish` roda skills `simplify`/`review`/`security-review`/`test` antes do commit |
| Token cap | `--max-tokens` aborta quando uso cumulativo excede |
| Stop-when | `--stop-when` injeta instrução `STOP_WHEN_MET: true\|false` no prompt |
| Prevent-sleep | Cross-OS: `caffeinate` (mac) / `systemd-inhibit` (linux) / `SetThreadExecutionState` (win) |
| JSONL debug log | `.auto/runs/<runId>/debug.jsonl` com `error.cause` chain |
| Backoff classificado | permanent (abort) / retryable (expo backoff até 5x) / transient (próxima iter) |
| Graceful interrupt | Ctrl+C 1x = graceful (termina iter atual), 2x = força (130) |
| Resume robusto | Detecta prompt diff, oferece continuar/new-branch/quit |

## Circuit breaker

Para automaticamente quando:
- Mesmo erro 3x consecutivos (normalizado)
- 3 iterações sem mudanças em `git diff` (stall)
- Budget estourado
- Task reportada como bloqueada pelo agente
- Token cap atingido (exit 6)
- Erro permanente do agente (low credits, auth) (exit 2)
- Retry exhausted após backoff exponencial (exit 3)

## Feedback Categorizado

Cada iteração loga, ao lado do exit code existente, uma das 5 categorias de feedback (metadado adicional, não substitui os exit codes):

| Categoria | Significado |
|---|---|
| `invalid-input` | Comando/args malformados |
| `blocked-by-constraint` | Violou regra/lint/dependência |
| `tool-failure` | Erro de ambiente/ferramenta, não da lógica da task |
| `crash` | Falha não classificada |
| `success-with-metric` | Passou + métrica objetiva (testes verdes, delta de coverage, lint limpo) |

**Fontes:** anti-parada-prematura e feedback categorizado adaptados de COMPILOT (Merouani, Kara Bernou, Baghdadi — PACT 2025, "Agentic Auto-Scheduling: An Experimental Study of LLM-Guided Loop Optimization") — RQ6 do paper mostra ablation com +23-40% de resultado ao dar feedback empírico vs. rodar sem feedback; o paper também documenta o padrão de parada prematura (após ganho grande ou após falhas repetidas) que motivou a rodada extra acima.

## Arquivos gerados

```
.auto/
  plan.md                    ← plano com checkboxes [x]/[ ]
  progress.md                ← log append-only por iteração
  env.md                     ← ferramentas detectadas + git baseline
  session.json               ← estado para resume (prompt, agent, model, polish, etc.)
  runs/<runId>/
    debug.jsonl              ← debug log estruturado com error.cause chain
    polish-<skill>.md        ← output filtrado de cada skill no polish pass
```

> `.auto/` está no `.gitignore` — não é commitado.

## Worktree paralelo

Layout em disco quando `--worktree --parallel N`:

```
<repo>/                                ← repo principal, intocado
<repo>-auto-worktrees/
  ├── <slug-1>/                        ← worktree run 1, branch auto/<slug-1>
  └── <slug-2>/                        ← worktree run 2, branch auto/<slug-2>
```

- Slug derivado da task (primeiras 6 palavras, kebab-case, max 40 chars).
- Colisão de slug → sufixo `-1`, `-2`.
- Worktree **com commits** ao final → preservado, imprime `git worktree remove ...` para cleanup.
- Worktree **sem commits** → removido automaticamente no exit.
- Trade-off: `git worktree` compartilha `.git` mas duplica working tree. 3 runs num repo de 500MB ≈ 1.5GB extra.

## Quando usar /loop vs /auto

- **`/auto`** — Claude executa autonomamente no contexto atual da conversa.
- **`/loop`** — processo externo real que roda agente como subprocess, multi-task em paralelo, polish pass, resume entre invocações.

## Limpeza

Após uma run com `--worktree`, se você mergear a branch e quiser remover o worktree:

```bash
# Remover worktree (path foi impresso pelo runner ao final)
git worktree remove "<path>" --force

# Após delete manual ou merge, prune refs órfãos
git worktree prune

# Branch local merged em main mas remote ainda não sabe — force delete:
git branch -D auto/<slug>
```

## Referências

- Design: [`docs/plans/2026-04-30-auto-loop-v2-design.md`](../../docs/plans/2026-04-30-auto-loop-v2-design.md)
- Implementação: [`docs/plans/2026-04-30-auto-loop-v2-implementation.md`](../../docs/plans/2026-04-30-auto-loop-v2-implementation.md)
- Gap fixes: [`docs/plans/2026-04-30-auto-loop-v2-gap-fixes.md`](../../docs/plans/2026-04-30-auto-loop-v2-gap-fixes.md)
- Fonte das flags: [`scripts/auto-loop/args.mjs`](../../scripts/auto-loop/args.mjs)
- Inspiração externa: [gnhf](https://github.com/kunchenguid/gnhf)
