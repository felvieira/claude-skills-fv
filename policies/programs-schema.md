# Programs Schema (Executable YAML)

**Objetivo:** definir o schema canônico do formato declarativo `programs/*.yml` — pipelines executáveis com gates humanos, conditional steps, parallel steps e variable substitution.

**Inspiração:** [github/spec-kit `workflows/speckit/workflow.yml`](https://github.com/github/spec-kit/blob/main/workflows/speckit/workflow.yml) + extensões nossas (when, parallel, vars).

## Por que programs existem (Ashby's Law + variety reduction)

> Birgitta Böckeler (Thoughtworks): *"An LLM-based coding agent can produce almost anything, but committing to a topology narrows that space, making a comprehensive harness more achievable. Defining topologies is a variety-reduction move."*

A [Lei de Ashby da Variedade Requerida](https://en.wikipedia.org/wiki/Variety_(cybernetics)) diz: um regulator precisa ter ao menos a mesma **variety** que o sistema que governa. LLMs têm variety quase infinita — produzem qualquer coisa. Sensors deterministas têm variety limitada.

**Soluções pra fechar o gap:**

1. **Reduzir variety do sistema** — programs/topologies/templates constrangem o LLM a um espaço menor de outputs possíveis. Cada program é uma "variety-reduction move" que torna o harness mais cobertor possível.

2. **Aumentar variety do regulator** — mais sensors, mais inferenciais. Caro.

A estratégia preferida do kit é (1): use `/run-program` quando possível pra constranger o espaço de outputs, ao invés de tentar cobrir N possibilidades com sensors.

**Implicação:** novos programs devem ser priorizados sempre que houver um pattern recorrente. Cada program criado equivale a "reduzimos a variety do sistema neste ponto" e o harness fica naturalmente mais cobertor.

Ver `policies/harness-categories.md` para o framework completo de regulação.

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
    type: <command|prompt|bash|gate|loop|parallel|conditional>
    when: <expr>                # opcional — só roda se condição true
    on_error: <abort|continue|retry>  # default: abort

    # --- isolation & routing (v1.7.0+) ---
    context: <inherit|fresh>    # default: inherit. fresh = sessão limpa, zero contexto anterior
    provider: <claude|codex>    # default: inherit (skill 09 model-routing decide)
    model: <haiku|sonnet|opus|opus[1m]|sonnet-4-6>  # opcional — override do model-routing

    # --- type: command ---
    command: <slash-command>    # ex: /spec
    args: <string>              # opcional, suporta ${vars}
    capture: <name>             # opcional — salva output em ${steps.<id>.<name>}

    # --- type: prompt (v1.7.0) — step ad-hoc sem slash command ---
    prompt: |
      Multi-line prompt direto.
      Suporta ${inputs.X} e ${steps.X.output}.
      Variável especial $ARGUMENTS = inputs do program serializados.
    allowed_tools: [Read, Write, Edit, Grep, Glob, Bash]   # opcional, default = all

    # --- type: bash (v1.7.0) — deterministic shell, sem AI ---
    bash: |
      set -euo pipefail
      bun run validate
      echo "tests=passed" >> $GITHUB_OUTPUT
    timeout: <seconds>          # default: 300
    capture_output: <bool>      # default: true (acessível via ${steps.X.output})

    # --- type: gate ---
    message: <string>           # pergunta para o humano
    options: [<string>]         # default: [approve, reject]
    on_reject: <abort|continue|retry|run:<step_id>>

    # --- type: loop (v1.7.0) — iterate até token/condição ---
    loop:
      prompt: <inline-prompt>          # prompt rodado a cada iteração
      command: <slash-command>         # alternativa: rodar slash command em loop
      until: <TOKEN>                   # string que indica completion (ex: COMPLETE, APPROVED)
      max_iterations: <int>            # default: 10
      fresh_context: <bool>            # default: false. true = cada iteração com sessão limpa (Ralph pattern)
      interactive: <bool>              # default: false. true = pausa esperando humano antes de cada iter
      on_max_reached: <abort|continue> # default: abort

    # --- type: parallel ---
    parallel:                   # lista de steps que rodam em paralelo
      - <step>
      - <step>
    trigger_rule: <all_success|one_success|all_done>  # v1.7.0. default: all_success
                                # all_success = espera todos OK (fail = abort)
                                # one_success = segue assim que UM completar OK
                                # all_done    = espera todos finalizarem (OK ou fail)

    # --- type: conditional ---
    if: <expr>
    then: [<steps>]
    else: [<steps>]             # opcional
```

## Step types (v1.7.0 expanded)

| Type | Purpose | When to use |
|---|---|---|
| `command` | Invoca slash command (`/spec`, `/plan`, etc) | Steps que já tem skill dedicada |
| `prompt` | Prompt inline ad-hoc | Step único que não merece slash command próprio |
| `bash` | Shell deterministic, sem AI | Build, test, git ops, validations |
| `gate` | Pausa esperando aprovação humana | Checkpoint entre fases críticas |
| `loop` | Itera até token / max | Iteração incremental (story-by-story, fix-until-pass) |
| `parallel` | Despacha N steps em paralelo | Quality gates independentes |
| `conditional` | Branching if/then/else | Fluxos divergentes por input |

## Variable substitution

Sintaxe `${...}`:

- **`${inputs.<name>}`** — valor de input do programa
- **`${steps.<step_id>.output}`** — stdout/result do step anterior
- **`${steps.<step_id>.capture.<name>}`** — variável capturada explícita
- **`${steps.<step_id>.exit_code}`** — exit code do step (0=success)
- **`${steps.<step_id>.iterations}`** — número de iterações (só para `type: loop`)
- **`${env.<NAME>}`** — variável de ambiente
- **`${date}`**, **`${date:ISO}`**, **`${date:YYYY-MM-DD}`** — data atual
- **`$ARGUMENTS`** — em `type: prompt`, todos os inputs serializados como texto (compat com Archon)
- **`$ARTIFACTS_DIR`** — em `type: bash`/`prompt`, diretório para artifacts do program (default: `.run-program/<program-id>-<timestamp>/`)

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
- `trigger_rule`:
  - `all_success` (default) — espera todos OK; falha de um aborta
  - `one_success` — segue assim que UM completar OK; cancela os outros
  - `all_done` — espera todos finalizarem (sucesso ou falha), agrega resultados
- Se `on_error: continue` em step paralelo individual, falha dele não bloqueia o `trigger_rule` do parent

## Bash steps (v1.7.0)

```yaml
- id: validate
  type: bash
  bash: |
    set -euo pipefail
    npm test
    npm run lint
  timeout: 600
  capture_output: true
```

- **Deterministic** — não invoca AI, só roda comando shell
- Útil pra: build, test, lint, git ops, validações pre-flight
- Output capturado em `${steps.X.output}` se `capture_output: true` (default)
- Exit code disponível em `${steps.X.exit_code}` (0 = success)
- `timeout` em segundos (default 300, max 1800)
- **Nunca** rodar comandos destrutivos (`rm -rf`, `git push --force`) em programs sem `gate` antes

## Prompt steps (v1.7.0)

```yaml
- id: review
  type: prompt
  prompt: |
    Review all changes against the plan in $ARTIFACTS_DIR/plan.md.
    Focus on:
    - Did all tasks get implemented?
    - Are there security regressions?
    Output a summary to $ARTIFACTS_DIR/review.md.
  allowed_tools: [Read, Write, Edit, Grep, Glob]
  context: fresh
```

- **Step ad-hoc** sem precisar criar slash command próprio
- Útil pra: lógica específica do program que não vale skill nova
- `$ARGUMENTS` = todos inputs serializados como texto
- `allowed_tools` restringe ferramentas disponíveis (default: todas)
- Combinar com `context: fresh` para isolamento forte

## Loop primitive (v1.7.0)

```yaml
- id: implement-stories
  type: loop
  loop:
    prompt: |
      Read $ARTIFACTS_DIR/plan.md and find the next unimplemented story.
      Implement it. Run tests. If passing, mark story as DONE.
      When all stories are done, output: <result>COMPLETE</result>
    until: COMPLETE
    max_iterations: 20
    fresh_context: true
    on_max_reached: abort
```

- Roda `prompt` (ou `command`) repetidamente até output conter `until` token
- `fresh_context: true` — cada iteração começa do zero (Ralph pattern)
- `max_iterations` — hard limit; comportamento via `on_max_reached`
- `interactive: true` — pausa antes de cada iteração esperando ack humano (cuidado: bloqueia em auto-yes)
- `${steps.X.iterations}` disponível depois

## Context isolation (v1.7.0)

| Modo | Comportamento |
|---|---|
| `context: inherit` (default) | Step herda contexto da sessão atual — pode ver tudo da conversa |
| `context: fresh` | Step roda como subagent zero — só vê inputs explícitos via args/prompt |

Use `fresh` quando:
- Quer evitar contaminação entre planning e implementation
- Quer reduzir custo (subagent zero = contexto mínimo)
- Step é avaliador/crítico (não deve "ver" o que foi gerado)

Implementação: agente despacha via `Task` tool com prompt isolado.

## Model routing per step (v1.7.0)

```yaml
- id: complex-architecture
  type: prompt
  prompt: "Design module boundaries for ..."
  provider: claude
  model: opus[1m]

- id: simple-formatting
  type: bash
  bash: "prettier --write src/"
  # provider/model irrelevantes para bash
```

- `provider` — força provider específico (`claude` ou `codex`)
- `model` — força model específico, sobrescreve `policies/model-routing.md`
- Sem declarar, segue heurística automática do orchestrator (skill 09)

Use override quando:
- Step crítico merece Opus extended thinking (`opus[1m]`)
- Step massivo barato pode rodar Haiku (`haiku`)
- Comparação A/B entre providers (gerar com Claude, revisar com Codex)

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
- **`loop:` sem `max_iterations`** — risco de loop infinito + custo. Validador exige max_iterations explícito.
- **`bash:` com comando destrutivo sem `gate` antes** — `rm -rf`, `git push --force`, etc. Validador flag warning; executor exige confirmação adicional.
- **`prompt:` muito longo** (> 5k chars) — flag warning. Considere virar slash command.
- **`context: fresh` em step que precisa de capture anterior** — quando step roda em sessão limpa, NÃO pode acessar `${steps.X.output}` por context inheritance. Tem que passar via `args` ou `prompt` explícitos.
- **`provider: codex` em step com tool específico de Claude** — incompatível. Validador flag warning.
- **`trigger_rule: one_success` em parallel onde TODOS são críticos** — perde validação. Use só quando first-wins é semanticamente correto (ex: failover).

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

## Stream-chain pattern (v2.19.0+)

> **Inspiração:** [ruvnet/ruflo](https://github.com/ruvnet/ruflo) — `stream-chain run` formaliza explicitamente `output_step_N → input_step_N+1`. Adaptado: nosso schema já suporta via `${steps.X.output}`, mas merece nome e documentação dedicada. Ver `docs/inspiration/ruflo-evaluation.md`.

### Definição

**Stream-chain** = composição linear de steps onde **output de cada step é input do próximo**, sem branching nem paralelismo. Cada elo da corrente transforma o dado adiante.

### Quando é stream-chain vs pipeline genérico

| Padrão | Característica | Exemplo no kit |
|--------|----------------|----------------|
| Stream-chain | Cadeia linear, output→input, transformação progressiva | `discover → spec → plan → build → test` |
| Pipeline com gates | Stream-chain + checkpoints humanos entre elos | `programs/spec-driven-development.yml` |
| Fan-out (parallel) | 1 input → N workers paralelos | `programs/comprehensive-review.yml` |
| Scatter-gather | fan-out + agregação | `/multi-plan` (claude+codex) |

### Schema canônico de stream-chain

```yaml
steps:
  - id: extract
    type: command
    command: /spec
    capture: spec_path

  - id: refine
    type: prompt
    prompt: |
      Refinar o spec em ${steps.extract.capture.spec_path}.
      Output: docs/specs/<feature>-refined.md
    capture: refined_path

  - id: plan
    type: command
    command: /plan
    args: "--input=${steps.refine.capture.refined_path}"
```

Cada step **lê explicitamente** o output do anterior via `${steps.X.capture.<name>}` ou `${steps.X.output}`. Sem isso, é só sequência (não stream-chain).

### Vantagens de modelar como stream-chain

1. **Cada elo é debugável isolado** — `--from <step_id>` retoma da quebra
2. **Capture explícito** força contratos de output entre steps
3. **Validador detecta** referência a step inexistente
4. **Encaixa em pipelines maiores** — stream-chain é a building block, não o pipeline inteiro

### Anti-padrões específicos

- ❌ Stream-chain implícito (steps em sequência sem usar `${steps.X.output}`) — viola o contrato; é só lista, não corrente
- ❌ Stream-chain com `context: fresh` em todos os elos — se cada step começa do zero, capture não chega. Use `inherit` ou passe via `args` explícito
- ❌ Misturar stream-chain com `parallel` no mesmo nível — escolha um. Parallel é fan-out, não chain
- ❌ Chain com mais de 7 elos — flag warning. Stream longa demais perde rastreabilidade. Quebre em sub-programs

### Cross-refs

- `${steps.X.capture.<name>}` — sintaxe canônica
- `--from <step_id>` flag de retomada
- `programs/pipeline-discovery.yml` — exemplo real de stream-chain longa
- skill 40 (parallel-dispatcher) — quando NÃO usar stream-chain (fan-out)

## Integração com outras policies

- `policies/handoffs.md` — programs implementam a cadeia canônica documentada lá
- `policies/quality-gates.md` — gates do program respeitam os gates do quality-gates
- `policies/verification-before-completion.md` — todo step que afirma "feito" deve capturar output verificável
- `policies/source-driven.md` — variable substitution permite ancoragem em fonte
