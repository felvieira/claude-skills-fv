# Programs Schema (Executable YAML)

**Objetivo:** definir o schema canônico do formato declarativo `programs/*.yml` — pipelines executáveis com gates humanos, conditional steps, parallel steps e variable substitution.

**Inspiração:** [github/spec-kit `workflows/speckit/workflow.yml`](https://github.com/github/spec-kit/blob/main/workflows/speckit/workflow.yml) + extensões nossas (when, parallel, vars).

## Relação com `programs/*.md`

- **`programs/*.md`** = **descritivo** — explica o fluxo, when/why/handoff, decisões de design. Para humanos lerem.
- **`programs/*.yml`** = **executável** — máquina parseia e roda. Para agente executar via `/run-program <nome>`.

Ambos coexistem. O `.md` é fonte da verdade conceitual; o `.yml` é a implementação mecânica.

## Schema completo

```yaml
schema_version: "1.0"

program:
  id: <slug>                    # obrigatório, único
  name: <string>                # obrigatório, human-readable
  version: <semver>             # obrigatório, ex: "1.0.0"
  description: <string>         # obrigatório, 1 frase
  authors: [<string>]           # opcional

requires:                       # opcional — pré-requisitos
  kit_version: ">=1.6.0"        # versão mínima do nosso kit
  commands: [<id>]              # commands que devem existir
  skills: [<id>]                # skills que devem estar instaladas
  policies: [<path>]            # policies referenciadas

inputs:                         # opcional — parâmetros do program
  <name>:
    type: <string|number|boolean|enum|array>
    required: <bool>            # default: false
    default: <value>            # opcional
    enum: [...]                 # se type=enum
    prompt: <string>            # texto para AskUserQuestion

steps:                          # obrigatório, ≥ 1 step
  - id: <slug>                  # obrigatório, único no program
    type: <command|gate|parallel|conditional>
    when: <expr>                # opcional — só roda se condição true
    on_error: <abort|continue|retry>  # default: abort

    # --- type: command ---
    command: <slash-command>    # ex: /spec
    args: <string>              # opcional, suporta ${vars}
    capture: <name>             # opcional — salva output em ${steps.<id>.<name>}

    # --- type: gate ---
    message: <string>           # pergunta para o humano
    options: [<string>]         # default: [approve, reject]
    on_reject: <abort|continue|retry|run:<step_id>>

    # --- type: parallel ---
    parallel:                   # lista de steps que rodam em paralelo
      - <step>
      - <step>

    # --- type: conditional ---
    if: <expr>
    then: [<steps>]
    else: [<steps>]             # opcional
```

## Variable substitution

Sintaxe `${...}`:

- **`${inputs.<name>}`** — valor de input do programa
- **`${steps.<step_id>.output}`** — stdout/result do step anterior
- **`${steps.<step_id>.capture.<name>}`** — variável capturada explícita
- **`${env.<NAME>}`** — variável de ambiente
- **`${date}`**, **`${date:ISO}`**, **`${date:YYYY-MM-DD}`** — data atual

## Conditional expressions (campo `when` ou `if`)

Subset seguro de expressões — **NÃO** é JS arbitrário:

| Expressão | Significado |
|---|---|
| `inputs.foo == "bar"` | igualdade |
| `inputs.foo != "bar"` | desigualdade |
| `steps.X.exit_code == 0` | sucesso do step X |
| `steps.X.output contains "error"` | substring check |
| `file_exists("path")` | arquivo existe no projeto |
| `not <expr>` | negação |
| `<expr> and <expr>` | conjunção |
| `<expr> or <expr>` | disjunção |

Parser implementado em `scripts/run-program.mjs`. Expressões inválidas = abort com mensagem clara.

## Gate behavior

```yaml
- id: review-spec
  type: gate
  message: "Spec ok? Revisar docs/specs/foo.md antes de prosseguir."
  options: [approve, request-changes, reject]
  on_reject: abort                 # ou continue, retry, run:<step_id>
```

- Gates **bloqueiam** execução esperando resposta humana via `AskUserQuestion`
- `on_reject: run:<step_id>` permite loop (ex: rejeitar volta pra `/spec` editar)
- Se rodando em modo `--auto-yes`, gates são **auto-approved** com warning

## Parallel steps

```yaml
- id: review-suite
  type: parallel
  parallel:
    - id: code-review
      type: command
      command: /review
    - id: security-review
      type: command
      command: /security-review
    - id: test-run
      type: command
      command: /test
```

- Despacha via `Task` tool em uma mensagem (multiple tool uses)
- Espera **todos** completarem antes do próximo step
- Se `on_error: continue`, falha de um não bloqueia os outros

## Conditional execution

```yaml
- id: deploy
  type: command
  command: /ship
  when: steps.tests.exit_code == 0 and inputs.skip_deploy != true

- id: skip-tests-warning
  type: conditional
  if: inputs.skip_tests == true
  then:
    - id: warn
      type: command
      command: /echo "WARNING: tests skipped per user request"
```

## Anti-padrões

- **Step sem id** — viola lookup de `${steps.X.output}`
- **Gate sem mensagem clara** — humano não sabe o que aprovar
- **Loop infinito** (`on_reject: run:self`) — executor detecta e aborta após 3 iterações
- **Variable não declarada** — referência a `${steps.X}` quando X não existe → abort
- **Conditional sempre false** — step morto. Executor warning.
- **Parallel com dependência interna** — race condition. Validador bloqueia se step interno referencia outro do mesmo bloco.

## Validador

`scripts/validate-program.mjs` checa antes de executar:
- Schema válido (campos obrigatórios, tipos)
- IDs únicos
- Referências `${steps.X}` apontam pra step que existe
- Sem loops infinitos óbvios
- Conditional expressions parseáveis

CI roda validador em todos `programs/*.yml` no `validate.yml` workflow.

## Executor

`scripts/run-program.mjs` — parser + executor. Comando público é `/run-program <nome>`.

Flags:
- `--dry-run` — mostra plano sem executar
- `--auto-yes` — gates auto-approved (CI / autônomo)
- `--from <step_id>` — retoma de um step específico (após falha)
- `--input <key=value>` — passa input explícito

## Integração com outras policies

- `policies/handoffs.md` — programs implementam a cadeia canônica documentada lá
- `policies/quality-gates.md` — gates do program respeitam os gates do quality-gates
- `policies/verification-before-completion.md` — todo step que afirma "feito" deve capturar output verificável
- `policies/source-driven.md` — variable substitution permite ancoragem em fonte
