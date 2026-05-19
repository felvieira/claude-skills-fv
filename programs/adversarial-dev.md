# Program: adversarial-dev

## Intent
Build app from scratch via GAN-inspired loop: Planner (cria spec com sprints) → state machine que alterna Generator (constrói) e Evaluator (tenta quebrar). Sprint só passa quando todos critérios atingem threshold.

## Sequence
```
plan{model='opus[1m]', context='fresh'}
→ init-workspace{bash, mkdir+git init}
→ adversarial-loop{loop, fresh_context per iter, max=60}
  → role=generator: lê spec + feedback anterior, implementa sprint, commit
  → role=evaluator: ATACA, scores 0-10 em 5 critérios, escreve feedback
  → se algum < threshold: retry generator (max 3 attempts)
  → se all >= threshold: avança sprint
  → se attempt > max_retries: ABORT_SPRINT
  → se all sprints passaram: COMPLETE
→ final-tests{bash}
→ gate-deliver{gate}
→ report{prompt, context='fresh', synthesize feedback files}
```

## Protocol / Command refs
- Sem slash commands externos — tudo é `prompt:` + `bash:` inline
- Usa `$ARTIFACTS_DIR/` para isolamento de workspace
- 5 critérios de scoring: feature completeness, edge cases, code quality, performance, security

## Inputs
```yaml
input:
  product_request: string             # descricao curta
  max_sprint_retries: number = 3      # max retries por sprint
  threshold: number = 7               # min score (0-10) por criterio
```

## Diferença vs `pipeline-discovery`

| Aspecto | pipeline-discovery | adversarial-dev |
|---|---|---|
| Quem valida | Reviewer + humano | Evaluator role (LLM adversário) |
| Iteração | Sequencial por slice | Alternância generator/evaluator no mesmo sprint |
| Critério de aprovação | Tests passam + review OK | 5 scores >= threshold |
| Use case | Feature em projeto existente | App from-scratch / greenfield |

## Quando usar

**Sim:**
- Greenfield app (vazia → MVP em sprints)
- Validação rigorosa (cada sprint precisa passar adversário antes de avançar)
- Exploração de design space (deixar planner ser opiniado)

**Não:**
- Bug fix pontual → use `/auto` ou `pipeline-discovery`
- Feature em codebase existente → use `spec-driven-development`
- Refactor → `/simplify` ou skill 23

## Abort conditions
- `plan` falha em gerar spec.md → abort
- `adversarial-loop` atinge `max_iterations: 60` → abort
- Algum sprint atinge `max_sprint_retries` → ABORT_SPRINT (loop reconhece e termina)
- `gate-deliver` rejeitado → abort

## Notes
- Inspirado em [Anthropic harness design article](https://www.anthropic.com/engineering/swe-bench-sonnet) + [coleam00/archon archon-adversarial-dev](https://github.com/coleam00/archon/blob/main/.archon/workflows/defaults/archon-adversarial-dev.yaml).
- **`fresh_context: true`** no loop garante que generator não vê crítica do evaluator no mesmo turn (evita contaminação) e vice-versa
- Threshold default 7/10 — ajustar conforme severidade do produto
- Para iteração mais rápida com qualidade menor: threshold 5, max_retries 2
- Para qualidade máxima: threshold 8, max_retries 5 (atenção ao custo)
