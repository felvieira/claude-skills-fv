# Model Routing — Design Spec

**Data:** 2026-04-08
**Status:** Aprovado

## Problema

O kit tem regras de seleção de modelo espalhadas em dois lugares (`skills/16-llm-selector/SKILL.md` e `policies/cost-optimization.md`), mas nenhum enforcement automático. Agentes spawnam subagents sem definir `model` explicitamente, e ninguém sugere troca de model ao entrar/sair de plan mode. Resultado: custo 5x mais alto que o necessário em tasks simples.

## Objetivo

Unificar regras de seleção de modelo em uma policy única e adicionar enforcement ativo via hook para:

1. Sugerir `/model opus` ao entrar em plan mode (Claude Code)
2. Sugerir `/model sonnet` ao sair de plan mode (Claude Code)
3. Alertar quando subagent é spawnado sem `model` explícito
4. Manter integração com cost-tracker (skill 30)

## Escopo

### In scope

- `policies/model-routing.md` — policy unificada (nova)
- `hooks/scripts/model-routing-hook.mjs` — hook de enforcement (novo)
- `hooks/hooks.json` — registro do hook
- `hooks/config.json` — seção `model_routing`
- `policies/cost-optimization.md` — seção "Seleção de Modelo" simplificada
- `policies/hooks.md` — seção "Model Routing"
- `skills/30-cost-tracker/SKILL.md` — referência atualizada
- `GLOBAL.md` — referência à policy
- `README.md` — hook table + seção model routing
- `docs/skill-guides/model-routing.md` — guia de referência rápida (novo)
- `skills/16-llm-selector/SKILL.md` — **deletar** (absorvido pela policy)

### Out of scope

- Troca automática do model da conversa principal (impossível via Claude Code API)
- Skill wrapper intermediária para subagent spawning
- Integração com billing real de provedores

## Abordagem Escolhida: B — Policy + Hook

**Descartada A** (policy-only): enforcement é "trust the agent" — sem garantia.
**Descartada C** (policy + hook + skill wrapper): over-engineering, overhead de 1 tool call extra por subagent sem ganho proporcional.

**B escolhida** porque:
- Mesmo padrão que já funciona no kit (pre-tool-enforcer para code-exploration)
- Hook é bonus para Claude Code; policy funciona em qualquer ambiente
- Subagent `model` param é controlável via policy sem wrapper

## Alcance por Ambiente

| Camada | Claude Code | Outros (Cursor, etc.) |
|---|---|---|
| Policy (regras de seleção) | ✅ funciona | ✅ funciona |
| Hook (sugestão ativa de /model) | ✅ funciona | ❌ não existe |
| Subagent model param | ✅ Agent tool aceita | ❌ depende do harness |

## Design: `policies/model-routing.md`

Fonte única de regras. Absorve o conteúdo do llm-selector e adiciona enforcement.

### Tiers

| Tier | Model | Quando usar |
|---|---|---|
| Fast | haiku | boilerplate, rename, microcopy, formatação, templates, checklist |
| Balanced | sonnet | implementação, testes, integração, debug simples, docs, design |
| Deep | opus | arquitetura, security review, debug complexo, orquestração, decisões críticas |

### Mapeamento por skill

| Skills | Tier padrão |
|---|---|
| PO, UI/UX, Backend, Frontend, QA, Documenter, Motion, Copy, Mobile | Balanced |
| Security, Reviewer, Orchestrator | Deep |
| Deploy, Context Manager, SEO | Fast ou Balanced conforme risco |

### Regras de upgrade/downgrade

Subir de tier quando houver:
- Múltiplos módulos ou serviços interagindo
- Impacto estrutural de longo prazo
- Segurança, auth ou dados sensíveis
- Debugging entre camadas

Descer de tier quando houver:
- Tarefa repetitiva com padrão conhecido
- Ajuste mecânico ou de baixo risco
- Geração a partir de template existente

### Enforcement para subagents

Ao spawnar Agent, SEMPRE definir `model` explicitamente. Nunca herdar do parent sem avaliar complexidade.

Keywords de detecção por tier:

| Keywords no prompt | Tier sugerido |
|---|---|
| plan, architect, design, review security, strategy | Deep (opus) |
| implement, fix, test, debug, refactor, integrate | Balanced (sonnet) |
| rename, format, boilerplate, template, checklist | Fast (haiku) |

Exemplos corretos:
```
Agent(prompt="plan the auth migration architecture", model="opus")
Agent(prompt="implement login endpoint per plan", model="sonnet")
Agent(prompt="rename variables in 3 files", model="haiku")
```

### Enforcement para plan mode (Claude Code)

- `EnterPlanMode` → considerar `/model opus`
- `ExitPlanMode` → considerar `/model sonnet`
- Hook sugere automaticamente (Claude Code only)

## Design: `hooks/scripts/model-routing-hook.mjs`

Roda em `PreToolUse`. Intercepta 3 tool calls:

| Tool | Ação |
|---|---|
| `EnterPlanMode` | Sugere `/model opus` |
| `ExitPlanMode` | Sugere `/model sonnet` |
| `Agent` | Verifica se `model` param está presente; se não, sugere tier por keywords |

### Anti-spam

- Tracking via `.bot/.hook-session.json` campo `last_model_suggestion_ms`
- Intervalo mínimo: 60s (configurável)
- Não repete se agente já escolheu model

### Config em `hooks/config.json`

```json
"model_routing": {
  "suggest_on_plan_mode": true,
  "suggest_on_agent_spawn": true,
  "min_suggestion_interval_ms": 60000,
  "plan_model": "opus",
  "exec_model": "sonnet",
  "fast_model": "haiku"
}
```

### Detecção de tier por keywords (Agent spawn)

1. Lê input do tool call
2. Verifica presença de `model` parameter
3. Se ausente: analisa keywords do prompt → sugere tier
4. Se presente: passa silenciosamente

### Output de exemplo

```
⚡ Model Routing: Entrando em plan mode.
   Considere: /model opus (melhor raciocinio pra arquitetura e decisoes)
   Volte pra sonnet ao sair do plan mode.
```

```
⚡ Model Routing: Subagent sem model explicito.
   Prompt sugere task de implementacao → recomendado: model: "sonnet"
   Ver policies/model-routing.md para regras completas.
```

## Modificações em arquivos existentes

### `hooks/hooks.json`

Adicionar entrada em `PreToolUse`:
```json
{ "event": "PreToolUse", "script": ".bot/hooks/scripts/model-routing-hook.mjs" }
```

### `policies/cost-optimization.md`

Seção "Seleção de Modelo (LLM Selector)" simplificada para apontar à policy.

### `skills/30-cost-tracker/SKILL.md`

Referência de "LLM Selector (16)" → "Model Routing policy (`policies/model-routing.md`)".

### `policies/hooks.md`

Nova seção "Model Routing" no final.

### `GLOBAL.md`

Nova linha após referência de code-exploration:
```
- Definir `model` explicito ao spawnar subagents — ver `policies/model-routing.md`
```

### `README.md`

- Hook table: nova linha para `model-routing-hook`
- Seção de features: menção ao model routing

### `skills/16-llm-selector/` (diretório)

**Deletar.** Conteúdo absorvido pela policy. Skill 30 (cost-tracker) atualizada para referenciar a policy diretamente.

## Integração com Cost Tracker (skill 30)

- Cost-tracker já rastreia "modelo usado" por skill (linha 61 do SKILL.md)
- Subagents com `model` explícito tornam esse rastreamento mais preciso
- Hook pode logar sugestões aceitas/ignoradas para análise de custo
- Referência atualizada de llm-selector → model-routing policy mantém a integração funcional

## Dependências e Ordem de Implementação

1. `policies/model-routing.md` — base para tudo
2. `hooks/scripts/model-routing-hook.mjs` + `hooks/config.json` — enforcement
3. `hooks/hooks.json` — registro
4. Edits em arquivos existentes (cost-tracker, cost-optimization, hooks.md, GLOBAL.md)
5. Delete skill 16
6. `docs/skill-guides/model-routing.md` — doc final
7. `README.md` — atualização de documentação

## Critérios de Sucesso

- [ ] Policy única que substitui llm-selector sem perda de informação
- [ ] Hook sugere model em plan mode entry/exit
- [ ] Hook alerta subagent spawn sem model explícito
- [ ] Anti-spam funcional (60s)
- [ ] Cost-tracker referencia policy corretamente
- [ ] Skill 16 removida sem referências quebradas
- [ ] README atualizado
