# Model Routing Guide

> Referencia rapida. Policy completa: `policies/model-routing.md`

## Tiers

| Tier | Model | Usar pra |
|---|---|---|
| Fast | haiku | rename, boilerplate, microcopy, templates |
| Balanced | sonnet | implementacao, debug, testes, design |
| Deep | opus | arquitetura, security, orquestracao |

## Subagents — Sempre definir model

```text
Agent(prompt="plan auth system", model="opus")
Agent(prompt="implement login", model="sonnet")
Agent(prompt="rename vars", model="haiku")
```

## Keywords de Deteccao

| Keywords no prompt | Tier sugerido |
|---|---|
| plan, architect, design, review security, strategy | Deep (opus) |
| implement, fix, test, debug, refactor, integrate | Balanced (sonnet) |
| rename, format, boilerplate, template, checklist | Fast (haiku) |

## Plan Mode

- EnterPlanMode → considere /model opus
- ExitPlanMode → considere /model sonnet
- Hook sugere automaticamente (Claude Code only)

## Upgrade/Downgrade

Subir: multiplos modulos, impacto estrutural, seguranca, debug cross-layer
Descer: tarefa repetitiva, ajuste mecanico, template existente

## Anti-patterns

| Errado | Certo |
|---|---|
| Opus pra renomear variaveis | Haiku — mecanico |
| Sonnet pra planejar migracao de DB | Opus — decisao arquitetural |
| Subagent sem model param | Sempre explicito |
| Ficar em opus apos sair de plan mode | Voltar pra sonnet |
