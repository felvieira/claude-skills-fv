---
description: Roda sensores de drift contra todo o codebase (não só diffs) — dead-code, large-files, stale-todos, dep-staleness, doc-code drift, test-coverage. Inspirado em "garbage collection" da OpenAI (Birgitta Böckeler).
argument-hint: "[--only sensor1,sensor2] [--threshold-lines 500] [--format markdown|json]"
allowed-tools: Bash(node:*)
---

# /drift-scan — Continuous Drift Detection

**Objetivo:** detectar **drift gradual** que os hooks no change-time (PreToolUse, PostToolUse) não pegam. Rodar contra todo o codebase periodicamente.

Inspirado em Birgitta Böckeler (Thoughtworks) — _"continuous drift sensors that monitor what gradually accumulates: dead code, dependency staleness, test coverage degradation"_. Ver `docs/inspiration/harness-engineering.md`.

## Sensores disponíveis

| Sensor | O que detecta | Custo |
|---|---|---|
| `large-files` | Arquivos > 400 linhas (configurável) | s |
| `dead-code` | Arquivos com exports sem importadores detectados | s-min |
| `stale-todos` | TODOs/FIXMEs > 90 dias (via git blame) | min |
| `dep-staleness` | Deps com major version atrasada (`npm outdated`) | min |
| `doc-code-drift` | Docs referenciando arquivos que não existem mais | s |
| `test-coverage` | Arquivos sem teste correspondente | s |

## Como invocar

```bash
/drift-scan                                     # full scan, todos os sensores
/drift-scan --only large-files,stale-todos      # apenas 2 sensores
/drift-scan --threshold-lines 500               # threshold custom
/drift-scan --format json                       # output JSON
```

## Execute

Rode o script e mostre o output:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/drift-scan.mjs" $ARGUMENTS
```

Após o output, **interprete os 3 maiores insights**:
1. Categoria com mais findings — sugerir próxima ação
2. Finding crítico individual — se há finding de alta severity em arquivo central, destacar
3. Tendência (se rodou antes) — comparar com scans anteriores se disponível

## Quando rodar

- **Semanal** durante desenvolvimento ativo
- **Antes de release** (gate adicional além dos quality-gates normais)
- **Após mergir branch grande** (drift acumulado durante o branch)
- **Sob suspeita** — quando algo parece estranho mas você não sabe o quê

## Pareando com outros comandos

| Finding | Próximo comando |
|---|---|
| Muitos `large-files` | `/simplify` ou `/run-program refactor-safely` |
| Muitos `dead-code` | Revisão manual (sensor pode ter false positives) — verificar dynamic imports antes de deletar |
| Muitos `stale-todos` | `/auto` pra resolver os críticos ou converter em issues |
| `dep-staleness` com major bumps | `/run-program refactor-safely` por dep |
| `doc-code-drift` | `/auto` para atualizar docs ou deletar referências |
| Pouca cobertura | Skill 05 (`/test`) ou skill 37 (TDD) |

## Sensor: dead-code (atenção)

**Caveats importantes:**
- **Dynamic imports** (`import(varName)`) não são detectados → sensor pode marcar como dead falsamente
- **Re-exports complexos** (barrel files) podem mascarar uso
- **Entry points** (cli scripts, plugins) frequentemente não são importados de dentro do repo
- **Type-only imports** podem não ser detectados em todos os bundlers

Sempre **revisar manualmente** antes de deletar.

## Roadmap

- v2.5.1 — sensor `coverage-quality` (mutation testing summary)
- v2.5.1 — sensor `bundle-size-drift` (compara bundle vs último release)
- v2.6.0 — histórico de scans em `.bot/drift-history.jsonl` pra comparações temporais
- v2.6.0 — auto-disparo agendado via `/schedule weekly /drift-scan`

## Referências

- `scripts/drift-scan.mjs` — engine
- `docs/inspiration/harness-engineering.md` — Birgitta Böckeler
- `policies/harness-categories.md` — sensors categorizados
- `policies/quality-gates.md` — gates derivados
- Skill 30 (cost-tracker) — perspectiva de custo
- `/savings` — perspectiva de savings (complementar)
