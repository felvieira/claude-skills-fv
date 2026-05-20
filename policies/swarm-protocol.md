# Swarm Protocol

**Objetivo:** definir o que `/swarm` faz, em que ordem, com que garantias. Modo de autonomia total: do prompt ao PR mergeable, sem intervenção humana (a menos que algo crítico requeira).

**Quando usar:** task que se beneficia de **"manda e esquece"** — feature completa, fix de issue do GitHub, refactor com PR. Quer voltar pra PR pronto.

**Quando NÃO usar:** task que exige controle granular passo-a-passo (`/auto`/`/loop`), exploração de design (`/run-program spec-driven-development`), greenfield from scratch (`/run-program adversarial-dev`).

## Princípios invioláveis

1. **Isolamento por worktree** — sempre. `/swarm` nunca toca o working tree atual.
2. **Fresh context por story** — Ralph pattern. Cada story implementada com sessão limpa pra não inflar contexto.
3. **Self-fix automático** — após review, fixes CRITICAL/HIGH aplicam sozinhos. MEDIUM/LOW são reportados.
4. **PR sempre** — `/swarm` termina com PR aberto. Sem PR = task não terminou.
5. **Circuit-breaker presente** — se story falha 3x mesmo erro, aborta essa story e segue. Se 3 stories abortam, aborta swarm inteiro.
6. **Logs persistentes** — `.swarm/<run-id>/` mantém tudo: stories, iterations, validation outputs, review findings, fixes aplicados.
7. **Cleanup opt-in** — worktree NUNCA é deletado automático no fim. Você decide quando.

## Phases (7)

### Phase 0 — Setup (deterministic)

```
.swarm/<timestamp>-<slug>/
├── prompt.txt              # input original
├── plan.md                 # PRD ou story list extraída
├── stories.json            # parseável: [{id, title, status, attempts}]
├── workspace/              # git worktree isolado
├── iterations/             # uma pasta por iteração do loop
├── review/                 # outputs dos 5+ agentes paralelos
├── fixes/                  # fixes aplicados auto
└── log.jsonl               # event log estruturado
```

Bash determinístico:
- `git worktree add .swarm/<id>/workspace -b swarm/<slug>`
- `cd workspace && git checkout main && git pull`
- Detect tools: `npm test`, `cargo test`, etc → salva em `.swarm/<id>/tools.json`

### Phase 1 — PRD / Stories (AI, fresh context)

Se input é:
- **Texto livre** ("implementar X") → gera PRD com user stories
- **Issue #N** → `gh issue view N` + parseia em stories
- **Path para PRD existente** → lê e extrai stories
- **Já estruturado** (`stories.json` passado) → skip

Output: `plan.md` (PRD) + `stories.json` (array de stories com `id`, `title`, `acceptance_criteria`, `status: pending`).

### Phase 2 — Ralph Loop (AI, fresh context PER STORY)

Pseudo:
```
while (story = next_pending(stories.json)) {
  iter = 0
  while (iter < max_iter_per_story) {
    iter++
    fresh_session = spawn_claude(
      prompt = "implementar story ${story.id}: ${story.title}\nAC: ${story.acceptance_criteria}\nplan: $ARTIFACTS_DIR/plan.md",
      tools = [Read, Edit, Write, Bash],
      context = fresh
    )

    result = run_validation()  // npm test || cargo test || ...
    if (result.passed) {
      mark_story_done(story.id)
      break
    }

    if (circuit_breaker.same_error_3x(result.error)) {
      mark_story_aborted(story.id, "circuit-breaker")
      break
    }
  }

  if (aborted_stories >= 3) {
    abort_swarm("3+ stories aborted")
  }
}

emit_completion("<result>COMPLETE</result>")
```

Cada iteração:
- Spawn como subagent via Task (fresh_context = true)
- Recebe `plan.md` + `story.id` + `acceptance_criteria` + tools list
- Implementa, roda validation, reporta status

### Phase 3 — Quality Gates (parallel, fresh context cada)

Despacha 4 subagents simultâneos via `Agent` tool (single message, 4 tool calls em paralelo):

```typescript
Agent({ subagent_type: "dev-team-kit-fv:code-reviewer", ... })
Agent({ subagent_type: "dev-team-kit-fv:security-auditor", ... })
Agent({ subagent_type: "dev-team-kit-fv:test-engineer", ... })
Agent({ subagent_type: "dev-team-kit-fv:anti-ai-writing", ... })  // v2.2.0+
```

Cada um output em `.swarm/<id>/review/<agent>.md` com severity + file:line + suggested fix.

⚠ Esses 4 nomes são **subagents válidos** (sem número, kebab-case). NUNCA passar nome de skill numerada aqui — ver `policies/skills-vs-agents.md`.

### Phase 4 — Synthesize

AI step (`context: fresh`): lê os 4 reviews + plan.md, gera `synthesis.md` com decision matrix:
```
CRITICAL findings (N): [...] → auto_fix
HIGH findings (M):    [...] → auto_fix
MEDIUM findings (P):  [...] → report_only
LOW findings (Q):     [...] → report_only
```

### Phase 5 — Self-Fix Aggressive

Pra cada finding `auto_fix`:
- Spawn fresh subagent com prompt "aplicar fix para finding X em arquivo Y:linha Z"
- Capturar diff
- Aplicar
- Commit com message `swarm/fix: <severity> - <finding-summary>`

Após todos os fixes:
- Re-roda validation completa
- Se quebrou: rollback e marca como `needs-manual-fix`

### Phase 6 — PR

```bash
cd .swarm/<id>/workspace
git fetch origin main
git rebase origin/main || handle_conflict()
git push -u origin swarm/<slug>

# PR body = plan.md + synthesis.md + lista de stories DONE + fixes aplicados
PR_URL=$(gh pr create \
  --title "feat: ${title_extracted}" \
  --body-file .swarm/<id>/pr-body.md \
  --label "swarm-generated")

# Posta synthesis como comment
gh pr comment $(basename $PR_URL) --body-file .swarm/<id>/synthesis.md
```

### Phase 7 — Report

Output final:
```
✅ Swarm run completed
   - 5 stories implementadas
   - 0 stories abortadas
   - 8 fixes aplicados (3 CRITICAL, 5 HIGH)
   - 12 findings reportados (4 MEDIUM, 8 LOW)
   - PR: https://github.com/.../pull/142

Artifacts: .swarm/2026-05-19T15-30-22-auth-social/
Worktree: kept (run `git worktree remove .swarm/.../workspace` to clean up)
```

## Modos de execução

### Manual (default)
```
/swarm "implementar auth social"
```
Roda completo, todas as phases, **pausa em gates críticos** (review humano pode override).

### Autonomous (Nível 3 do intent-classifier)
Quando `~/.claude/dev-team-kit-config.json` tem `intent_classifier.autonomous: true`:
- Hook intent-classifier sugere `/swarm` para prompts de feature
- `/swarm` roda com `--auto-yes` implícito
- **Zero gates humanos**
- Termina em PR aberto

### Configuração

User-wide override em `~/.claude/dev-team-kit-config.json`:
```jsonc
{
  "swarm": {
    "max_stories_per_run": 10,
    "max_iter_per_story": 5,
    "circuit_breaker_threshold": 3,
    "auto_merge": false,           // ⚠ NUNCA true sem CI verde
    "auto_cleanup_worktree": false, // só quando PR mergeado
    "review_agents": ["code-reviewer", "security-auditor", "test-engineer", "anti-ai-writing"],
    "self_fix_severity": ["critical", "high"],
    "skip_phases": []              // ex: ["review"] pra rodar mais rápido
  }
}
```

## Anti-padrões

- **Rodar `/swarm` no working tree atual** — sempre worktree. Bloqueado se branch atual tem mudanças não-commitadas.
- **`auto_merge: true`** — só se você confia 100% no CI. Recomendado: false sempre.
- **`auto_cleanup_worktree: true` sem PR mergeado** — perde context se quiser debugar.
- **Skip review phase** — perde a parte mais valiosa do swarm.
- **Loop sem `max_iter_per_story`** — risco de gastar tokens sem fim.
- **Spawn de stories em paralelo** (não-Ralph) — race conditions com git. Mantém serial.

## Integração

- **Hook intent-classifier**: quando autonomous, sugere `/swarm` (não programs separados)
- **Skill 09 (orchestrator)**: respeita `/swarm` como pipeline completo, não interfere
- **Skill 39 (program-router)**: quando autonomous + intent claramente de "feature completa" → roteia pra `/swarm`
- **policies/verification-before-completion.md**: cada phase do swarm tem output verificável (logs, diff, PR URL)
- **policies/quality-gates.md**: gates do swarm respeitam quality gates do kit
- **policies/anti-ai-writing.md**: anti-ai-writing agent na review phase aplica os 29 padrões

## Diff vs alternativas

| Aspecto | `/auto` | `/loop` | `/swarm` |
|---|---|---|---|
| Tipo | prompt-based | process-based | process-based + multi-phase |
| Worktree | opcional | opcional (`--worktree`) | **sempre** obrigatório |
| Fresh context | herda sessão | herda sessão | **fresh per story** (Ralph) |
| Multi-agent review | não | não | **sim** (4 paralelos) |
| Self-fix automático | não | não | **sim** (CRITICAL/HIGH) |
| PR auto | não | não | **sim** (sempre termina em PR) |
| Multi-story | task única | task única | **N stories de um PRD** |
| Cleanup | sessão limpa no fim | manual | manual (worktree fica até você decidir) |
| Use case | task pequena | task média/única | feature completa do prompt ao PR |

## Roadmap

- v2.0.0: implementação inicial (este arquivo + script + slash command)
- v2.1.0: auto-merge se CI verde + branch protection passou
- v2.2.0: dashboard `.swarm/dashboard.html` com status de runs
- v2.3.0: integração com Linear/Jira além de GitHub Issues

## Inspiração

- Ralph loop pattern: [coleam00/archon `archon-ralph-dag.yaml`](https://github.com/coleam00/archon/blob/main/.archon/workflows/defaults/archon-ralph-dag.yaml)
- Fix-github-issue + self-fix: [coleam00/archon `archon-fix-github-issue.yaml`](https://github.com/coleam00/archon/blob/main/.archon/workflows/defaults/archon-fix-github-issue.yaml)
- Comprehensive review (5 agents): nosso program `comprehensive-review` (v1.7.0)
- Worktree integration: nosso `/loop` (v1.0.0)
- Adversarial scoring: nosso program `adversarial-dev` (v1.7.0)
