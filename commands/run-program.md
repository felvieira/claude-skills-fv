---
description: Executa um program declarativo (YAML) de programs/ — pipelines com gates humanos, conditional steps, parallel steps e variable substitution
---

# /run-program — Executable YAML Pipelines

**Objetivo:** parsear e executar `programs/<nome>.yml` como pipeline declarativo. Cada step pode ser um command, gate humano, bloco paralelo, ou conditional. Variable substitution via `${inputs.X}` e `${steps.X.output}`.

**Inspiração:** [github/spec-kit `workflows/`](https://github.com/github/spec-kit/tree/main/workflows) + extensões nossas (when, parallel, conditional, vars).

## Quando usar

- pipelines repetidos que mereçam consistência (spec-driven, pipeline-discovery, loop-polishing, detective-spec)
- fluxos com múltiplos review gates onde "humano decide entre passos"
- equipes que precisam de **mesmo pipeline executado igual** por agentes diferentes

## Quando NÃO usar

- task de 1 ou 2 steps — overhead desproporcional
- exploração sem fluxo definido
- iteração ad-hoc onde o próximo passo depende de algo dinâmico não modelável

## Pré-requisitos

- arquivo `programs/<nome>.yml` existe
- todos os commands referenciados estão disponíveis (`/spec`, `/plan`, etc)
- inputs do programa serão pedidos via `AskUserQuestion` se obrigatórios

## Processo

### Passo 1 — Validar o program

```bash
node scripts/validate-program.mjs programs/<nome>.yml
```

Se inválido: abort com lista de erros.

### Passo 2 — Resolver inputs

Para cada input em `inputs:` do YAML:
- Se passado via `--input <key>=<value>`, usar
- Se obrigatório e ausente, usar `AskUserQuestion` com o `prompt` do schema
- Se opcional, usar `default` (ou pedir confirmação se `--ask-all`)

### Passo 3 — Resolver variable substitution

Antes de executar cada step:
- Substituir `${inputs.X}` por valor real
- Substituir `${steps.Y.output}` ou `${steps.Y.capture.Z}` por output capturado anteriormente
- Substituir `${date}`, `${env.X}`, etc.

Referências a steps que **ainda não rodaram** → erro de runtime.

### Passo 4 — Executar steps em ordem

Para cada step do array `steps[]`:

1. **Avaliar `when`** — se false, skip (warning no log)
2. **Despachar pelo tipo:**
   - `command` → invocar slash command via Task ou direto
   - `gate` → `AskUserQuestion` com options; respeitar `on_reject`
   - `parallel` → despachar todos via Task em 1 mensagem; aguardar todos
   - `conditional` → avaliar `if`; rodar `then[]` ou `else[]`
3. **Capturar output** se `capture: <name>` declarado
4. **Tratar erros** conforme `on_error` (abort/continue/retry)

### Passo 5 — Log estruturado

Manter `.run-program/<program-id>-<timestamp>.log.json`:

```json
{
  "program_id": "spec-driven-development",
  "started_at": "...",
  "inputs": {...},
  "steps": [
    {"id": "grill", "status": "ok", "duration_ms": 1234, "output_summary": "..."},
    {"id": "spec", "status": "ok", "capture": {"spec_path": "docs/specs/foo.md"}},
    {"id": "gate-checklist", "status": "approved", "operator_response": "approve"}
  ],
  "finished_at": "...",
  "exit_status": "success"
}
```

### Passo 6 — Output final

Resumo no console:

```
✓ Program spec-driven-development completed (8/8 steps)
  Total time: 23m 12s
  Artifacts:
    - docs/specs/dark-mode.md
    - docs/analysis/2026-05-18-dark-mode.md
  Log: .run-program/spec-driven-development-20260518T143012.log.json
```

## Flags

- `--list` — lista programs disponíveis em `programs/*.yml`
- `--describe <name>` — mostra descrição + inputs + steps sem executar
- `--dry-run` — mostra o plano resolvido (com variables substituídas) sem executar
- `--auto-yes` — gates auto-aprovam (CI / autônomo). **Warning** logado em cada gate skipado.
- `--from <step_id>` — retoma a partir de um step (útil após falha)
- `--input <key>=<value>` — passa input explícito (repetível)
- `--no-log` — não cria log persistente

## Anti-padrões

- **`--auto-yes` em pipeline crítico** (deploy, security) — perde valor dos gates
- **`--from <step>` sem entender** por que step anterior falhou — pode propagar erro
- **Modificar `programs/*.yml` durante execução** — comportamento indefinido. Editar entre runs.

## Integração

- Validado por `scripts/validate-program.mjs`
- Executado por `scripts/run-program.mjs`
- Schema em `policies/programs-schema.md`
- 4 programs prontos em `programs/*.yml`

## Handoff

- Programa completo → próxima fase manual (ex: deploy, communication)
- Falha em step → relatar qual + sugerir `--from <step>` para retomar após fix
- Gate rejeitado → respeitar `on_reject` do schema

**Uso:**
```
/run-program spec-driven-development
/run-program pipeline-discovery --input tracker=github --auto-yes
/run-program loop-polishing --dry-run
/run-program --list
```
