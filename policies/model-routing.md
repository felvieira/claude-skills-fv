# Model Routing Policy

## Objetivo

Fonte unica de regras para selecao de modelo por tarefa, complexidade e fase de trabalho, com enforcement automatico via hooks.

## Tiers

| Tier | Model | Quando usar |
|---|---|---|
| Fast | haiku | boilerplate, rename, microcopy, formatacao, templates, checklist |
| Balanced | sonnet | implementacao, testes, integracao, debug simples, docs, design |
| Deep | opus | arquitetura, security review, debug complexo, orquestracao, decisoes criticas |

## Regra de Ouro: Subagents

Ao spawnar Agent, SEMPRE definir `model` explicitamente. Nunca herdar do parent sem avaliar complexidade.

Exemplos:

```text
Agent(prompt="plan the auth migration architecture", model="opus")
Agent(prompt="implement login endpoint per plan", model="sonnet")
Agent(prompt="rename variables in 3 files", model="haiku")
```

## Regra de Ouro: Plan Mode (Claude Code)

- `EnterPlanMode` → considerar `/model opus`
- `ExitPlanMode` → considerar `/model sonnet`
- Hook sugere automaticamente em Claude Code

## Mapeamento por Skill

| Skills | Tier padrao |
|---|---|
| PO, UI/UX, Backend, Frontend, QA, Documenter, Motion, Copy, Mobile | Balanced |
| Security, Reviewer, Orchestrator | Deep |
| Deploy, Context Manager, SEO | Fast ou Balanced conforme risco |

## Upgrade: Quando Subir de Tier

- Multiplos modulos ou servicos interagindo
- Impacto estrutural de longo prazo
- Seguranca, auth ou dados sensiveis
- Debugging entre camadas
- Dados sensiveis (PII, PCI) → sempre Deep

## Downgrade: Quando Descer de Tier

- Tarefa repetitiva com padrao conhecido
- Ajuste mecanico ou de baixo risco
- Geracao a partir de template existente

## Keywords de Deteccao por Tier

O hook `model-routing-hook.mjs` usa estas keywords para sugerir tier quando um subagent e spawnado sem `model` explicito:

| Keywords no prompt | Tier sugerido |
|---|---|
| plan, architect, design, review security, strategy, migration design | Deep (opus) |
| implement, fix, test, debug, refactor, integrate, build, create | Balanced (sonnet) |
| rename, format, boilerplate, template, checklist, lint, typo | Fast (haiku) |

Na duvida entre dois tiers, escolher o mais alto. O custo de subestimar e maior que o de superestimar.

## Exemplos Praticos

| Tarefa | Tier | Motivo |
|---|---|---|
| Criar migration Prisma simples | Fast | schema mecanico, sem logica |
| Implementar componente com form + validacao | Balanced | estado, validacao, UX |
| Revisar seguranca de auth flow | Deep | risco alto, vulnerabilidades |
| Refatorar modulo com 15 dependencias | Deep | efeito cascata, decisoes estruturais |
| Gerar seed de dados para dev | Fast | template, sem risco |
| Debugging de memory leak em SSR | Deep | multiplas camadas, analise profunda |
| Adicionar campo opcional em form existente | Fast | alteracao mecanica, baixo risco |

## Integracao com Cost Tracker (skill 30)

Subagents com `model` explicito permitem rastreamento preciso de custo por tier. O Cost Tracker usa o tier definido para calcular custo estimado por skill.

## Alcance por Ambiente

| Camada | Claude Code | Outros (Cursor, etc.) |
|---|---|---|
| Policy (este arquivo) | ✅ | ✅ |
| Hook (sugestao ativa) | ✅ | ❌ |
| Subagent model param | ✅ | depende do harness |

Em ambientes sem hooks, seguir estas regras manualmente.
