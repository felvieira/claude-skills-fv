# Program: comprehensive-review

## Intent
Sync PR com main → 5 review agents especializados em paralelo (code/errors/tests/comments/docs) + security review obrigatório → synthesize com decision matrix → auto-fix CRITICAL/HIGH → post comment no GitHub.

## Sequence
```
scope{bash, gh pr view}
→ sync{bash, gh pr checkout + merge main}
→ parallel-review{trigger_rule='all_done', 5 prompts em paralelo}
  ├─ code-review{context=fresh, sonnet}      → review-code.md
  ├─ error-handling{context=fresh, claude}    → review-errors.md
  ├─ test-coverage{context=fresh, claude}     → review-tests.md
  ├─ comment-quality{context=fresh, haiku}    → review-comments.md
  └─ docs-impact{context=fresh, haiku}        → review-docs.md
→ security{/security-review, context=fresh}
→ synthesize{prompt, agrega 6 reviews → synthesis.md com decision matrix}
→ auto-fix{conditional based on inputs.auto_fix}
  └─ fix-issues{prompt, applies CRITICAL/HIGH fixes}
→ post-comment{bash, gh pr comment --body-file synthesis.md}
→ gate-final{gate, humano dá override}
```

## Protocol / Command refs
- `parallel-review` usa `type: prompt` inline (não slash commands) com `context: fresh` em cada agente — isolamento total
- `security` usa `/security-review` (skill 06)
- Agentes despachados via `Task` em uma mensagem (parallel dispatch)
- Artifacts em `$ARTIFACTS_DIR/pr-<N>/` por PR

## Inputs
```yaml
input:
  pr_number: number          # PR a revisar
  auto_fix: enum             # critical-only | critical-and-high | none
```

## Diferença vs `/review` (skill 11)

| Aspecto | /review (skill 11) | comprehensive-review |
|---|---|---|
| Escopo | code quality geral | 5 dimensões especializadas em paralelo |
| Agentes | 1 reviewer | 5 + security = 6 agentes paralelos |
| Synthesize | informal | formal `synthesis.md` com decision matrix |
| Auto-fix | não | sim, configurável por severity |
| Post no GitHub | não | sim (`gh pr comment`) |
| Custo | baixo (1 LLM call) | médio (6 paralelos + synthesize + fix) |
| Quando usar | review rápido pré-merge | review final pre-release ou PR crítico |

## Trigger rule `all_done`
- Espera **todos os 5 agentes** terminarem (sucesso OU falha)
- Diferente de `all_success` (que aborta se um falhar) — aqui falha de 1 agent não bloqueia os outros
- `synthesize` consolida o que conseguiu, marca o agent faltante na decision matrix

## Quando usar

**Sim:**
- PR crítico (auth, payments, deploy)
- Release major
- PR > 500 linhas modificadas
- Code review humano não disponível mas precisa rigor

**Não:**
- PR trivial (typo, format) — `/review` resolve
- Draft / WIP PRs — espere ficar maduro
- Sem GitHub (program usa `gh` CLI) — adaptar pra Linear/Jira se precisar

## Abort conditions
- `scope` falha (PR não existe) → abort
- `sync` com conflito não-trivial → flag mas continua (merge conflict não bloqueia review)
- `synthesize` não consegue ler `review-*.md` → abort
- `post-comment` falha (sem `gh` auth) → flag warning, mantém artifacts locais

## Notes
- Inspirado em [coleam00/archon archon-comprehensive-pr-review](https://github.com/coleam00/archon/blob/main/.archon/workflows/defaults/archon-comprehensive-pr-review.yaml)
- 4 modelos diferentes nos agents (sonnet, claude default, haiku) — cost optimization: tarefas rotineiras (comments/docs) em haiku, profundas (code/errors) em sonnet
- Para review de PR sem auto-fix: `inputs.auto_fix = "none"` — só relatório
- Para Pareto da qualidade: `critical-only` é default — fix do essencial sem risco de inflar PR
