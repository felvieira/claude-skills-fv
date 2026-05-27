---
title: Avaliação — ruvnet/ruflo (multi-agent orchestration platform)
date: 2026-05-27
type: inspiration-evaluation
status: evaluated-do-not-absorb
related: docs/inspiration/harness-engineering.md
---

# Avaliação — ruvnet/ruflo

## TL;DR

[ruvnet/ruflo](https://github.com/ruvnet/ruflo) (MIT, 55.6k ⭐, 22.2M downloads) **não é skill kit** comparável ao nosso — é uma **plataforma completa de orquestração multi-agent** que envelopa Claude Code de fora. Não absorvemos a plataforma; absorvemos 3 conceitos pontuais.

## Escala (pra contexto)

- **98 agents** + **60+ commands** + **30 skills** + **314 MCP tools**
- **33 plugins separados** (`ruflo-swarm`, `ruflo-rag-memory`, `ruflo-federation`, `ruflo-neural-trader`, `ruflo-iot-cognitum`, `ruflo-sparc`, `ruflo-hive-mind`, `ruflo-knowledge-graph`, etc)
- Daemon próprio (`agentdb.rvf`), CLI próprio (`npx ruflo`), workspace pnpm + crates Rust em `v3/`
- Marketing maduro: Cognitum.One agentic appliance, flow.ruv.io UI, goal.ruv.io planner, summit Budapest 2026

## Por que NÃO absorvemos a plataforma

| Razão | Detalhe |
|-------|---------|
| Product fit divergente | Ruflo é B2B platform com appliance/sponsor/summit. Nosso kit é toolkit dev-team opinionated minimalista |
| Surface enorme | 314 MCP tools ≠ filosofia "MCP minimalista" do nosso kit |
| Federation cross-machine | Over-engineered pra nosso uso (1 dev / 1 máquina típico) |
| Daemon + AgentDB | Complexity tax alta. Markdown + `.bot/learned-skills/` resolve nosso caso |
| Plugin marketplace | Não vamos virar marketplace |
| v3 com Rust crates | Não distribuímos binários |
| Witness manifest Ed25519 | Não distribuímos binários (de novo) |

## Conceitos que VALEM aprender (e ações tomadas)

### 1. Separação **Plugin Lite vs CLI Full** (explícita no README)

Ruflo é cirúrgico: avisa que plugin lite ≠ instalação completa. Tabela comparativa logo no topo.

**Nosso problema análogo:** temos `devkit-install-fv` que instala tudo no consumer repo. Não temos modo lite.

**Ação tomada:** documentar explicitamente em `WIKI.md` os 3 modos de instalação (Mode 1 plugin global / Mode 2 full kit per repo / Mode 3 direct Bash). Mode 1 é nosso "lite".

### 2. **Stream-chain** como abstração explícita

Ruflo formaliza `output_step_N → input_step_N+1` como comando dedicado (`claude-flow stream-chain run`).

**Nosso problema análogo:** nossos `programs/*.yml` fazem isso, mas implícito.

**Ação tomada:** extender `policies/programs-schema.md` com seção "Stream-chain pattern" (item 13 do plano v2.19.0).

### 3. **Truth-score numérico + verification threshold**

Ruflo cita "0.95 quality threshold" + auto-rollback ao falhar. Conceito: cada output recebe score; abaixo de threshold → reverte.

**Nosso problema análogo:** `policies/verification-before-completion.md` é qualitativo. Falta score quantitativo opcional.

**Ação tomada:** estender `policies/verification-before-completion.md` com seção "Score numérico opcional" (item 12 do plano v2.19.0).

### 4. **Tool-descriptions audit (ADR-112 do ruflo)**

Ruflo exige: toda MCP tool description precisa responder "use isso ao invés do nativo quando?". CI guard fails se descrição é fraca.

**Nosso problema análogo:** descriptions soltas em skills/agents/commands.

**Ação tomada:** integrar no `scripts/skill-health.mjs` (item 8 do plano) — detecção de description curta/fraca.

### 5. **ReasoningBank pattern** (recommendStrategy by context)

Ruflo tem TypeScript class com `recordExperience(task, outcome, context)` + `recommendStrategy(taskType, context)`. Conceito: experiências viram recomendações por contexto.

**Nosso problema análogo:** `.bot/learned-skills/<slug>.md` é o equivalente markdown-only. Mais simples por design.

**Ação tomada:** **não trocar** pelo deles (overhead enorme). Estudar pattern de `recommendStrategy(taskType, context) → strategy` se evoluirmos o sistema. v2.20.0+.

## O que descartamos

- **33 plugins ruflo:** off-scope (trader, IoT, market-data, browser-automation pesado, neural-trader)
- **AgentDB** (`.rvf` files, daemon, lock files): complexidade alta, valor marginal
- **Federation cross-machine:** over-engineered
- **314 MCP tools:** anti-padrão do nosso minimalismo MCP
- **Witness manifest Ed25519:** não distribuímos binários
- **SPARC methodology / Hive-mind / Consensus skills:** nosso `/swarm` cobre o caso real

## Quando recomendar Ruflo aos usuários

Adicionado em `docs/WIKI.md → External complementary plugins`:

> Use Ruflo quando você precisar de:
> - coordenação cross-machine de agents (federation)
> - 100+ agents reais rodando paralelo em produção
> - RAG memory + knowledge graph integrados
> - plugin marketplace ecosystem
> - swarm intelligence com self-learning persistente

Nosso kit cobre o caso **dev-team toolkit local**. Ruflo cobre **plataforma multi-agent enterprise**. São complementares, não competidores.

## Lições gerais (meta)

1. **Separação Lite/Full no README é crítica** — usuário precisa saber em <30s o que está instalando
2. **Stream-chain merece nome** — abstração implícita não é abstração
3. **Score quantitativo opcional** — verification qualitativa é OK como default, mas dar opção de score ajuda em CI/release gates
4. **Description audit em CI** — descrições de tools/skills decaem; gate sistemático evita drift
5. **Não copiar tudo de quem é maior** — Ruflo tem 195k+98×60+... mas nem todo problema deles é nosso

## Referências

- Ruflo repo: https://github.com/ruvnet/ruflo
- Cognitum.One (sponsor/appliance): https://cognitum.one
- README do Ruflo (Plugin Lite vs CLI Full): https://github.com/ruvnet/ruflo#quick-start
- ADR-112 (tool-descriptions audit): https://github.com/ruvnet/ruflo/tree/main/verification
- Nosso `docs/inspiration/harness-engineering.md` — outras absorções de mesma linha
