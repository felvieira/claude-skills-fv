---
description: Mostra o que o dev-team-kit-fv salvou/preveniu nesta sessão (ou janela maior) — tokens economizados, custo, riscos prevenidos, hot files, decisões do gate
argument-hint: "[--since 24h|7d|30d] [--format markdown|json]"
allowed-tools: Bash(node:*)
---

# /savings — Quanto o kit te salvou

**Objetivo:** mostrar de forma honesta e auditável quanto o dev-team-kit-fv contribuiu durante seu uso — em tokens economizados, dinheiro, bugs prevenidos e tempo equivalente de dev.

Não é métrica de marketing. As heurísticas estão declaradas em `policies/savings-metrics.md` para você auditar.

## Como invocar

```bash
/savings              # all-time, projeto atual
/savings --since 24h  # últimas 24 horas
/savings --since 7d   # últimos 7 dias
/savings --since 30d  # últimos 30 dias
```

## O que mostra

| Seção | Conteúdo |
|---|---|
| **💰 Bottom line** | Tokens estimados, USD, bugs prevenidos, dev hours equivalentes, valor combinado |
| **🛡 Agent Dispatch Validator** | Quantas vezes bloqueou skill-as-subagent (evitando `InputValidationError`), top offenders |
| **🎯 Pre-Execution Gate** | Distribuição de decisões: concrete bypass / open discussion / enrich / guided enrich / force |
| **📂 Tool Usage** | Reads/searches/writes totais, bytes lidos, hot files (candidatos a learned-skill) |
| **⚙ Tool Call Activity** | Total calls, error rate, bytes returned, avg bytes/call (eficiência), span da atividade |
| **🧠 Intent Classifier** | Total classificações, LLM vs regex, distribuição por categoria |

## Execute

Rode o engine de relatório e mostre o output diretamente:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/savings-report.mjs" $ARGUMENTS
```

Após o output, **interprete brevemente** os 3 maiores insights:
1. O que mais economizou (qual hook foi MVP)
2. O que pode ser melhorado (hot files repetidos → criar learned-skill? Hooks ignorados → calibrar?)
3. Sugestão acionável para próxima semana

## Fontes de dados

| Arquivo | Origem | O que tem |
|---|---|---|
| `.auto/events.jsonl` | `session-event-logger` (PostToolUse) | toda tool call: ts, tool, args, status, bytes_out |
| `.bot/.tool-usage.json` | `pre-tool-enforcer` (PreToolUse) | reads/searches/writes counters, repeated signals, hot files |
| `.bot/agent-dispatch-errors.jsonl` | `agent-dispatch-validator` (PreToolUse, v2.2.1+) | blocked Agent dispatches com skill name como subagent_type |
| `.bot/pre-execution-gate.jsonl` | `pre-execution-gate` (UserPromptSubmit, v2.4.0+) | decisões do gate: concrete_bypass / open_discussion_bypass / enrich / guided_enrich / force_bypass / pass_through |
| `.swarm/classifier.jsonl` | `intent-classifier` (UserPromptSubmit) | classificações de intent: categoria, command sugerido, LLM vs regex |

Todas best-effort. Engine é fail-open: arquivos faltando = seção vazia, sem crash.

## Mini-resumo automático no Stop

O hook `stop-savings-summary` (v2.4.0+) mostra um resumo de 3 linhas **automaticamente** ao fim de sessões (throttled a 1 vez a cada 5 min) com link pro `/savings` completo.

Pra desativar o mini-resumo: `DEVKIT_DISABLED_HOOKS=stop-savings-summary`.

## Anti-padrões

- ❌ **Tratar os números como billing data** — são estimativas baseadas em heurísticas declaradas
- ❌ **Comparar com outros projetos** sem normalizar pelo tamanho (LOC, # de prompts) — pode enganar
- ❌ **Usar pra justificar custo do kit pra terceiros** sem mostrar a auditoria em `policies/savings-metrics.md`

## Referências

- `scripts/savings-report.mjs` — engine
- `hooks/scripts/stop-savings-summary.mjs` — mini-resumo automático
- `policies/savings-metrics.md` — heurísticas auditáveis
- `skills/30-cost-tracker/SKILL.md` — skill complementar com perspectiva de custo real
