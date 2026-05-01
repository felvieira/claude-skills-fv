# Quality Gates Policy

## Objetivo
Definir o que realmente bloqueia uma entrega.

## Gate Obrigatorio
- problema principal resolvido
- mudanca coerente com o contexto
- risco relevante explicitado
- validacao minima realizada ou impossibilidade explicada
- handoff claro quando houver proxima etapa

## Guideline, nao Gate Absoluto
- tamanho de funcao
- quantidade de comentarios
- formato exato de pastas
- stack preferida
- estilo idealizado de arquitetura

## Rejeitar quando
- existe contradicao funcional
- ha regressao relevante nao tratada
- ha falha de seguranca importante
- falta validacao minima essencial
- falta documentacao obrigatoria do contexto

## Revalidacao
- repetir QA quando houver mudanca funcional
- repetir Security quando houver mudanca em auth, dados, validacao ou superficie de ataque
- repetir Reviewer quando houver correcao apos rejeicao

## Evals do Sistema
- seguir `policies/evals.md` quando a mudanca afetar prompts, skills, tools, templates ou governanca global

## Regra de Commit Trailers

Commits com decisao arquitetural, trade-off ou risco lateral DEVEM incluir trailers relevantes.

Aplicar `templates/commit-trailers.md`:
- `Constraint:` quando restricao externa limitou opcoes
- `Rejected:` quando alternativa foi desconsiderada
- `Not-tested:` quando algo ficou fora da cobertura por motivo valido
- `Scope-risk:` quando mudanca pode impactar outros modulos

Nao aplicar em commits triviais (typo, rename, lint, docs simples).

## Polish levels (auto-loop v2)

The auto-loop runner runs a configurable quality pass before commit, controlled by `--polish`:

| Level    | Skills run                                       | Retries on blocking issues |
|----------|--------------------------------------------------|----------------------------|
| `none`   | (none)                                           | 0                          |
| `light`  | `simplify`                                       | 0                          |
| `standard` (default) | `simplify` + `review`                | 1                          |
| `full`   | `simplify` + `review` + `security-review` + `test` | 3                        |

The polish pass runs **after** lint/typecheck/test/build pass and **before** commit. Blocking issues retry up to the configured budget; non-blocking issues are logged but don't block commit. If retries exhaust with blocking issues remaining, the run commits anyway and marks `polish_incomplete: true` in `.auto/session.json`.
