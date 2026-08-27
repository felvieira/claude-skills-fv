# Dev Team Kit — Wiki Completa

> **Versão:** 68 skills · 16 subagents · 45 slash commands · 61 policies · 29 hooks · 22 rules
> **Última atualização:** 2026-07-10 (v2.40.0 — skill 53 doubt-driven-review, absorvida de addyosmani/agent-skills)
> **Repo:** https://github.com/felvieira/claude-skills-fv
> **Instalação:** `claude plugin install https://github.com/felvieira/claude-skills-fv`

> 🌎 **English version:** [`docs/WIKI.md`](./WIKI.md)
>
> ⚠️ **Nota:** este espelho PT cobre os conceitos e fluxos do kit, mas o detalhe item-por-item das skills mais recentes (44-51) vive completo na [WIKI.md (EN)](./WIKI.md) e no [SKILLS-OVERVIEW.md](./SKILLS-OVERVIEW.md). Em caso de divergência, a contagem de base é a do `scripts/check-consistency.mjs`.

Wiki única do kit. Cada item segue o formato do post [5 Agent Skills I Use Every Day](https://www.aihero.dev/5-agent-skills-i-use-every-day) — **nome, o que faz, quando usar, problema que resolve, exemplo concreto, takeaway** —, mas aqui temos **tudo** (skills + subagents + commands + policies + plugin).

---

## Sumário

1. [Como o kit funciona em 60 segundos](#1-como-o-kit-funciona-em-60-segundos)
2. [Os 2 fluxos: clássico vs discovery](#2-os-2-fluxos-clássico-vs-discovery)
3. [Princípio fundamental: Vertical Slicing](#3-princípio-fundamental-vertical-slicing)
4. [Slash commands (23) — atalhos por fase](#4-slash-commands-23)
5. [Skills (62) — especialistas por categoria](#5-skills-62)
6. [Subagents (16) — despacháveis via Task tool](#6-subagents-16)
7. [Policies (22) — regras compartilhadas](#7-policies-22)
8. [Plugin: como o kit é distribuído](#8-plugin-como-o-kit-é-distribuído)
9. [MCP server: 37 tools por trás dos panos](#9-mcp-server-37-tools-por-trás-dos-panos)
10. [Quando usar o quê: árvore de decisão](#10-quando-usar-o-quê-árvore-de-decisão)
11. [Inspirações e atribuições](#11-inspirações-e-atribuições)

---

## 1. Como o kit funciona em 60 segundos

Você instala o kit num projeto. A partir daí, qualquer agente compatível (Claude Code, Cursor, Windsurf, Copilot, Gemini CLI) ganha **um time inteiro**: PO, designer, backend, frontend, QA, security, deploy, docs, observability, accessibility, etc.

Fluxo típico de uma feature nova:

```
você descreve a feature
  ↓
/spec ou /grill-me              ← PO entende e formaliza
  ↓
/plan                           ← orchestrator quebra em vertical slices
  ↓
/build (por slice, paralelo)    ← back+front+DB juntos
  ↓
/test                           ← QA prova que funciona
  ↓
/review                         ← Reviewer + Security validam
  ↓
/ship                           ← Release Manager + Deploy
```

Tudo guiado por **policies** (regras compartilhadas) e **model routing automático** (haiku para boilerplate, sonnet para implementação, opus para arquitetura — você não paga Opus pra gerar import statement).

---

## 2. Os 2 fluxos: clássico vs discovery

O kit tem **dois pipelines** para feature nova. Coexistem. Escolha por contexto.

### Modo A — `/pipeline` (clássico)

```
/spec → /plan → /build → /test → /review → /ship
```

**Use quando:** feature pequena/média (<1 sprint), spec já clara, equipe conhece o terreno, não precisa publicar PRD/issues no GitHub/Linear/Jira, TDD opcional.

### Modo B — `/pipeline-discovery` (com discovery + TDD)

```
/grill-me → /to-prd → /to-issues → /loop --worktree --parallel N → /ship
                       ↓                ↓
                       N issues        por slice: /build + skill 37 (TDD) + /review
                       no tracker
```

**Use quando:** feature grande/nova/ambígua, briefing vago, equipe nova, vai paralelizar com 2+ workers, precisa publicar PRD + issues no tracker, código crítico que merece TDD enforced.

### Comparativo

| Aspecto | Modo A clássico | Modo B discovery |
|---|---|---|
| Discovery formal | não | **`/grill-me` obrigatório** |
| Output da spec | `docs/specs/X.md` (interno) | PRD em **issue tracker** |
| Quebra em slices | implícita (PO escreve) | **explícita** (`/to-issues` cria 1 issue por slice) |
| Paralelização | manual | **estrutural** (N workers, 1 slice cada) |
| TDD | opcional | **obrigatório por slice** |
| Skill 38 (Architecture Deepener) | não chamado | opcional entre `/to-issues` e `/loop` |

Os 2 fluxos respeitam **`policies/vertical-slices.md`**. Diferença é nível de formalismo e publicação em tracker.

**Takeaway:** **escolha o fluxo errado uma vez** — não a feature errada — e você sente onde dói.

---

## 3. Princípio fundamental: Vertical Slicing

> **Toda feature multi-camada é entregue como uma fatia vertical (DB + back + front + teste e2e), nunca como camadas horizontais paralelas.**

### Errado (layered, paraleliza mas integra mal)

```
Worker A: faz todo o front (login + cadastro + recuperar senha)
Worker B: faz todo o back (login + cadastro + recuperar senha)
Worker C: faz todo o DB (login + cadastro + recuperar senha)
→ ninguém pode testar até os 3 acabarem
→ integração revela 80% dos bugs no fim
```

### Certo (vertical, paraleliza E integra ponta-a-ponta)

```
Worker A: feature de login (DB + back + front + teste e2e) → mergeável sozinho
Worker B: feature de cadastro (DB + back + front + teste e2e) → mergeável sozinho
Worker C: feature de recuperar senha (DB + back + front + teste e2e) → mergeável sozinho
→ cada worker entrega feature testável e demo-able
```

**Quem força isso:** orchestrator (skill 09) recusa plano layer-first. PO (skill 01) escreve user stories já como slices. `/plan` produz tabela de slices antes do build. `policies/vertical-slices.md` tem anti-padrões e heurísticas de tamanho.

**Quando NÃO aplicar:** task single-layer (só front OU só back), bug fix localizado, refactor cross-cutting, chore.

**Takeaway:** **paralelismo é diferente de coordenação.** Layered slicing paraleliza tarefas mas adia integração — é falsa eficiência.

---

## 4. Slash commands (23)

São atalhos por fase. Não precisa decorar nome de skill — chama o atalho, ele roteia.

### Comandos de fase (modo A — clássico)

#### `/spec` — Especificar feature

**O que faz:** PO escreve user stories, critérios de aceitação testáveis, prioridade, riscos.
**Quando usar:** ideia nova ou requisito vago precisa virar spec acionável.
**Problema que resolve:** evita "build sem entender o pedido", reduz retrabalho.
**Exemplo:** `/spec adicionar dark mode com persistência por usuário`
**Takeaway:** **toda feature começa aqui.** Pular spec custa 3-5x mais em rework.

#### `/plan` — Montar pipeline

**O que faz:** orchestrator classifica complexidade da task e define o pipeline mínimo (quais skills chamar, em que ordem). Quebra em vertical slices se for multi-camada.
**Quando usar:** task grande, não sabe por onde começar; quer um roadmap antes de codar.
**Problema que resolve:** evita rodar pipeline cheio quando bug fix simples basta.
**Exemplo:** `/plan migrar autenticação para OAuth2`
**Takeaway:** **pipeline é mínimo necessário.** Skills caras (security, deploy) só entram quando a task pede.

#### `/build` — Implementar

**O que faz:** Backend (skill 03) + Frontend (skill 04) com a stack real do projeto (lê `docs/repo-audit/current.md` antes).
**Quando usar:** spec pronta, implementar é o próximo passo.
**Problema que resolve:** consistência com convenções existentes em vez de "agente inventando estilo novo".
**Exemplo:** `/build implementar endpoint POST /api/orders conforme spec`
**Takeaway:** **stack vem da auditoria, não do treinamento.** Auditar repo primeiro evita mismatch.

#### `/test` — Escrever e rodar testes

**O que faz:** QA (skill 05) seguindo "prove-it" — happy path + error + edge case + regression.
**Quando usar:** após implementar, ou para preencher gap de cobertura, ou para validar fix.
**Problema que resolve:** "funciona local" sem teste = bug em produção esperando.
**Exemplo:** `/test cobrir orderService incluindo desconto VIP e estoque insuficiente`
**Takeaway:** **se diz que funciona, prova com teste.** Falar não conta.

#### `/review` — Review final + security

**O que faz:** Reviewer (skill 11) + Security (skill 06) validam o delta antes do merge.
**Quando usar:** PR pronto, antes de pedir review humano ou mergear.
**Problema que resolve:** pega bug óbvio, vulnerabilidade comum, débito antes de virar dívida.
**Exemplo:** `/review` (no contexto de PR aberto)
**Takeaway:** **Critical/High aberto = no merge.** Reviewer é gate, não sugestão.

#### `/best` — Auditoria de boas práticas

**O que faz:** Reviewer + Security + QA juntos auditam clean code, DRY, SOLID, OWASP.
**Quando usar:** antes de release, código herdado, ou sentindo "isso aqui tá feio".
**Problema que resolve:** débito técnico que ninguém quer abrir issue para tratar.
**Exemplo:** `/best src/services/billing/`
**Takeaway:** **rode antes de pedir refactor.** O relatório justifica o trabalho.

#### `/simplify` — Refatorar

**O que faz:** Migration & Refactor (skill 23) propõe simplificação preservando comportamento.
**Quando usar:** código funciona mas tá complicado; antes de adicionar feature em módulo god.
**Problema que resolve:** refactor "vamos limpar" sem critério vira novo bug.
**Exemplo:** `/simplify src/auth/middleware.ts (god function 200 linhas)`
**Takeaway:** **refactor com plano e teste de regressão.** Sem rede, vira regressão.

#### `/ship` — Release e deploy

**O que faz:** Release Manager (skill 24) + Deploy (skill 07) — changelog, versionamento, rollout, rollback plan.
**Quando usar:** feature pronta + testada + revisada, hora de subir.
**Problema que resolve:** deploy "no susto", rollback improvisado, changelog vazio.
**Exemplo:** `/ship v2.4.0 com migration de schema`
**Takeaway:** **deploy é evento documentado.** Rollback ensaiado vale mais que confiança cega.

#### `/pipeline` — End-to-end clássico

**O que faz:** orchestrator roda spec → plan → build → test → review → ship em sequência.
**Quando usar:** feature pequena/média, equipe conhece o terreno, sem necessidade de issue tracker.
**Problema que resolve:** pular fases por preguiça gera retrabalho 3x maior depois.
**Exemplo:** `/pipeline criar página de configurações de usuário`
**Takeaway:** **pipeline completo é desperdício para bug fix, vital para feature.**

### Comandos do fluxo discovery (modo B)

#### `/grill-me` — Interrogatório de plano

**O que faz:** PO em modo Deep Interview sempre-ativo. Faz **uma pergunta por vez**, recomenda resposta, caminha pela árvore de decisão até convergir.
**Quando usar:** ideia ainda vaga, antes de `/spec` ou `/to-prd`.
**Problema que resolve:** spec produzida com "unknown unknowns" silenciosos.
**Exemplo:** `/grill-me quero refazer o checkout para reduzir abandono`
**Takeaway:** **uma pergunta por turno + resposta sugerida.** Lista de 20 perguntas mata fluxo. Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me).

#### `/to-prd` — Conversa → PRD em issue tracker

**O que faz:** pega contexto da conversa atual e publica PRD no GitHub/Linear/Jira (label `needs-triage`). Não entrevista — sintetiza. Detecta tracker automaticamente (`gh auth status`, `LINEAR_API_KEY` env, `acli`); se nada disponível, salva em `docs/prd/`.
**Quando usar:** após `/grill-me` convergir, antes de `/to-issues`.
**Problema que resolve:** PRDs vivem em conversas perdidas; precisam de tracker para virar trabalho.
**Exemplo:** `/to-prd` (no contexto pós-grill-me)
**Takeaway:** **PRD vai pro tracker com label needs-triage.** Spec interna usa `/spec` em `docs/specs/`. Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-prd).

#### `/constitution` — Princípios governantes do projeto

**O que faz:** cria/atualiza `memory/constitution.md` no repo consumidor via 5 mini-entrevistas (Code Quality, Testing, UX, Performance, Security). A constituição tem **autoridade hierárquica** sobre PRD/plan/ADRs — conflito: constituição vence.
**Quando usar:** bootstrap de projeto, mudança organizacional (novo compliance, novo budget), onboarding do kit em projeto sem princípios formais.
**Problema que resolve:** princípios só vivem nas cabeças ou em ADRs espalhados; specs/plans/reviews não têm rubric objetivo para ancorar decisões.
**Exemplo:** `/constitution` (ou `/constitution focus: security`)
**Takeaway:** **princípios são não-negociáveis.** Para mudar: commit dedicado `chore(constitution)`, nunca diluição silenciosa em PR de feature. Adaptado de [github/spec-kit](https://github.com/github/spec-kit).

#### `/checklist` — Unit tests for English

**O que faz:** gera **checklist contextual por feature** (não fixa) cobrindo Completeness, Clarity, Consistency, Coverage, Edge Cases. Cruza com a constituição. Complementa (não substitui) os 13 checks fixos de `policies/prd-validation.md`.
**Quando usar:** após `/spec` ou `/to-prd`, antes de `/plan`. Ou para auditar PR que muda spec existente.
**Problema que resolve:** ambiguidades da spec que só aparecem em `/build` (retrabalho). Checklist fixa (13 checks) não pega problemas de domínio específico.
**Exemplo:** `/checklist docs/specs/dark-mode.md`
**Takeaway:** **a spec é "código em português"; esta checklist é a suíte de testes unitários dela.** Adaptado de [github/spec-kit](https://github.com/github/spec-kit) (conceito de Den Delimarsky).

#### `/analyze` — Cross-artifact consistency check

**O que faz:** auditoria **read-only** entre `memory/constitution.md` → `docs/specs/*.md` → `docs/plan/*.md` (ou ADRs) → issues do tracker. Detecta findings CRITICAL/HIGH/MEDIUM/LOW (conflitos com constituição, duplicação semântica, ambiguidade, gaps de cobertura, higiene). Gera matriz de rastreabilidade.
**Quando usar:** depois de `/to-issues` e antes de `/build`. Antes de `/ship` em release major. Após mudança grande na constituição.
**Problema que resolve:** o pipeline `/spec → /plan → /to-issues → /build` não tem gate validando se tasks ainda batem com a spec. Updates na constituição podem invalidar artefatos silenciosamente.
**Exemplo:** `/analyze --feature dark-mode --strict`
**Takeaway:** **CRITICAL = bloqueio total.** Constituição vence todos os conflitos. Relatório vai pra `docs/analysis/`. Adaptado de [github/spec-kit](https://github.com/github/spec-kit).

#### `/constitution` — Princípios governantes do projeto

**O que faz:** cria/atualiza `memory/constitution.md` no repo consumidor via 5 mini-entrevistas (Code Quality, Testing, UX, Performance, Security). A constituição tem **autoridade hierárquica** sobre PRD/plan/ADRs — conflito: constituição vence.
**Quando usar:** bootstrap de projeto, mudança organizacional (novo compliance, novo budget), onboarding do kit em projeto sem princípios formais.
**Problema que resolve:** princípios só vivem nas cabeças ou em ADRs espalhados; specs/plans/reviews não têm rubric objetivo para ancorar decisões.
**Exemplo:** `/constitution` (ou `/constitution focus: security`)
**Takeaway:** **princípios são não-negociáveis.** Para mudar: commit dedicado `chore(constitution)`, nunca diluição silenciosa em PR de feature. Adaptado de [github/spec-kit](https://github.com/github/spec-kit).

#### `/checklist` — Unit tests for English

**O que faz:** gera **checklist contextual por feature** (não fixa) cobrindo Completeness, Clarity, Consistency, Coverage, Edge Cases. Cruza com a constituição. Complementa (não substitui) os 13 checks fixos de `policies/prd-validation.md`.
**Quando usar:** após `/spec` ou `/to-prd`, antes de `/plan`. Ou para auditar PR que muda spec existente.
**Problema que resolve:** ambiguidades da spec que só aparecem em `/build` (retrabalho). Checklist fixa (13 checks) não pega problemas de domínio específico.
**Exemplo:** `/checklist docs/specs/dark-mode.md`
**Takeaway:** **a spec é "código em português"; esta checklist é a suíte de testes unitários dela.** Adaptado de [github/spec-kit](https://github.com/github/spec-kit) (conceito de Den Delimarsky).

#### `/analyze` — Cross-artifact consistency check

**O que faz:** auditoria **read-only** entre `memory/constitution.md` → `docs/specs/*.md` → `docs/plan/*.md` (ou ADRs) → issues do tracker. Detecta findings CRITICAL/HIGH/MEDIUM/LOW (conflitos com constituição, duplicação semântica, ambiguidade, gaps de cobertura, higiene). Gera matriz de rastreabilidade.
**Quando usar:** depois de `/to-issues` e antes de `/build`. Antes de `/ship` em release major. Após mudança grande na constituição.
**Problema que resolve:** o pipeline `/spec → /plan → /to-issues → /build` não tem gate validando se tasks ainda batem com a spec. Updates na constituição podem invalidar artefatos silenciosamente.
**Exemplo:** `/analyze --feature dark-mode --strict`
**Takeaway:** **CRITICAL = bloqueio total.** Constituição vence todos os conflitos. Relatório vai pra `docs/analysis/`. Adaptado de [github/spec-kit](https://github.com/github/spec-kit).

#### `/swarm` — Autonomia Total (v2.0.0)

**O que faz:** do prompt ao PR em um único comando. 7 phases: setup (worktree isolado) → PRD/stories → Ralph loop (fresh context POR story) → 4 agentes paralelos de review → synthesize → self-fix CRITICAL/HIGH automático → auto PR. Inspirado em Ralph loop + fix-github-issue + comprehensive-review do [coleam00/archon](https://github.com/coleam00/archon).
**Quando usar:** "manda e esquece" — feature completa, fix de issue GitHub, refactor com PR. Quer voltar pra PR pronto.
**Problema que resolve:** `/auto` e `/loop` não são 100% autônomos — sem enforcement de worktree, sem fresh context por story, sem auto-PR. `/swarm` é a peça que faltava.
**Exemplo:** `/swarm "implementar auth social com Google + GitHub"` ou `/swarm fix #142` ou `/swarm --prd docs/prd/foo.md`
**Takeaway:** **único comando que vai do prompt ao PR mergeable sem intervenção humana.** Em modo Autonomous (Nível 3), hook intent-classifier auto-roteia prompts de feature pra `/swarm`. Worktree NUNCA é deletado automaticamente — você decide cleanup.

#### Auto-orchestration (v1.8.0)

**O que faz:** kit detecta intent do seu prompt automaticamente e **sugere o program adequado** sem você precisar invocar `/run-program` manualmente. Hook `intent-classifier` classifica o prompt (6 tipos de intent) e emite `additionalContext` com sugestão. Skill 39 (program-router) confirma via `AskUserQuestion` com opções (dry-run / direto / ad-hoc / cancelar).
**Quando dispara:** qualquer prompt > 15 chars que não seja informacional ("o que é"), trivial ("fix typo"), ou já comece com `/`.
**Problema que resolve:** v1.7.0 deu engine; v1.8.0 fecha o loop — usuário não precisa lembrar quando rodar program vs pipeline informal.
**Exemplo:** Você diz "criar feature de autenticação social" → hook sugere `/run-program spec-driven-development` → skill 39 pergunta como rodar → executa
**Takeaway:** **4 níveis de autonomia** (manual / sugestão passiva / sugestão ativa / autônomo) configuráveis via hook config.

#### `/run-program` — Executa pipeline YAML declarativo

**O que faz:** parseia e executa `programs/<nome>.yml` como pipeline declarativo. Steps podem ser slash commands, **prompts inline**, **scripts bash**, gates humanos, **loops com `until:` token**, blocos paralelos (com `trigger_rule: all_success|one_success|all_done`), ou conditionals. Variable substitution via `${inputs.X}` e `${steps.X.output}`. **`context: fresh`** per-step para isolamento, **`provider:` / `model:`** para routing. v1.7.0: 6 tipos de step (command, prompt, bash, gate, loop, parallel, conditional). 7 programs incluindo `adversarial-dev` (GAN-inspired), `comprehensive-review` (5-agent paralelo) e `refactor-safely` (baseline tests + behavior preservation, v2.1.0).
**Quando usar:** pipelines repetidos que precisam consistência (spec-driven, pipeline-discovery, loop-polishing, detective-spec); fluxos com múltiplos review gates; equipes que precisam mesmo pipeline executado igual por agentes diferentes.
**Problema que resolve:** `programs/*.md` descreve o fluxo mas não é executável. Formato YAML é executável — máquina parseia, agente roda cada step, pausa em gates humanos, captura outputs pro próximo step.
**Exemplo:** `/run-program spec-driven-development` ou `/run-program loop-polishing --dry-run`
**Takeaway:** **pipeline declarativo + gates humanos = execução consistente entre agentes e sessões.** Inspirado em [github/spec-kit `workflows/`](https://github.com/github/spec-kit/tree/main/workflows) com extensões nossas (when/parallel/conditional/vars).

#### `/consolidate-memory` — Manutenção do vault de memória

**O que faz:** janitor periódico para `D:\claude-memory\` (ou path do vault) — merge de logs duplicados, archive de decisões stale, prune de backlinks quebrados, promote/demote de learned skills por score, normaliza tags inconsistentes. Workflow seguro: snapshot → dry-run → confirmação → apply → verify → report.
**Quando usar:** cron semanal, após uso intenso (50+ sessions), antes de release major do projeto consumidor, vault crescer além de 500 arquivos.
**Problema que resolve:** vault de memória acumula duplicatas, fatos stale e referências quebradas que erodem valor com o tempo. Sem limpeza periódica, busca semântica degrada e ocorre context rot.
**Exemplo:** `/consolidate-memory --dry-run` (auditoria) ou `/consolidate-memory --vault D:/claude-memory`
**Takeaway:** **nunca delete sem snapshot.** Workflow sempre faz backup primeiro. Complementa `policies/memory-tiers.md` (modelo 4-tier) com disciplina de manutenção.

#### `/humanize` — Remove padrões de escrita AI

**O que faz:** reescreve qualquer prosa (docs, PRDs, copy, changelogs, release notes) removendo os 29 padrões AI catalogados em `policies/anti-ai-writing.md`: inflação de significado, linguagem promocional, copula avoidance, signposting, conclusões genéricas, artefatos de chatbot e mais. Inclui passo de auto-auditoria ("O que ainda parece IA?") antes de entregar a versão final.
**Quando usar:** antes de publicar PRD no tracker, ao finalizar docs pela skill 10, antes de publicar copy (skill 13) ou artigos (skill 14). Útil como passe final em qualquer prosa gerada com assistência de IA.
**Problema que resolve:** texto gerado por IA tem padrões reconhecíveis que minam credibilidade. Humanos percebem mesmo sem conseguir nomear.
**Exemplo:** `/humanize docs/specs/dark-mode.md` ou texto inline
**Takeaway:** **não basta remover padrões ruins — injetar personalidade real.** Limpo-mas-sem-alma ainda parece IA. Adaptado de [blader/humanizer](https://github.com/blader/humanizer) (18.9k stars) + [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing).

#### `/to-issues` — PRD → vertical slices no tracker

**O que faz:** quebra PRD em N issues independentes (vertical slices/tracer bullets). Cada issue é HITL ou AFK. Publica todas com label `needs-triage`, em ordem de dependência.
**Quando usar:** após `/to-prd`, antes de `/loop --worktree --parallel N`.
**Problema que resolve:** workers paralelos sem issues atribuíveis = caos; layered slicing disfarçado de vertical.
**Exemplo:** `/to-issues #142` (referência ao PRD)
**Takeaway:** **cada issue corta TODAS as camadas.** Layered slicing é proibido (`policies/vertical-slices.md`). Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-issues).

#### `/pipeline-discovery` — Discovery + slicing + TDD

**O que faz:** orquestrador top-level. Roda fluxo completo `grill-me → to-prd → to-issues → loop+TDD → ship`. Publica PRD + N issues, paraleliza por slice, TDD por slice. **4 gates de aprovação humana obrigatórios** (PRD, issues, dispatch workers, deploy).
**Quando usar:** feature grande/nova/ambígua, equipe nova, vai paralelizar 2+ workers, código crítico.
**Problema que resolve:** spec rasa virando integration mess; trabalho não tracked; integração só no fim.
**Exemplo:** `/pipeline-discovery quero adicionar autenticação social (Google + GitHub)`
**Takeaway:** **discovery formal + issues no tracker + TDD por slice = qualidade alta com paralelização real.**

### Comandos autônomos / utilitários

#### `/auto` — Agente autônomo (1 sessão)

**O que faz:** executa task completa sem intervenção. 10 padrões de produção: progress tracking via checkboxes, inter-iteration memory, context narrowing progressivo, tiered validation (lint→typecheck→build), error deduplication, completion override, dynamic budget, validation feedback loop, stall detection, build-fix extension.
**Quando usar:** task complexa que você quer entregar overnight; quer ir tomar café e voltar com PR pronto.
**Problema que resolve:** agente ficar travado no mesmo erro 3x sem detectar.
**Exemplo:** `/auto refatorar todo módulo billing para usar nova lib de pagamentos`
**Takeaway:** **fire and forget — mas com circuit breaker.** Stall detection economiza centenas de iterações.

#### `/loop` — Auto-loop v2 (multi-agente, paralelo)

**O que faz:** loop autônomo v2. Multi-agente (claude + codex), worktree integrado, paralelização real (`--worktree --parallel N`), polishing pass configurável (`none|light|standard|full`).
**Quando usar:** várias features independentes overnight; quer 4 PRs prontos amanhã de manhã.
**Problema que resolve:** orquestrar workers paralelos manualmente é caro e propenso a conflito.
**Exemplo:** `node scripts/auto-loop.mjs "task" --worktree --parallel 4 --polish standard`
**Takeaway:** **paralelismo real exige worktrees.** Sem isso, 2 workers no mesmo repo = chaos.

#### `/worktree` — Worktree isolado

**O que faz:** cria git worktree isolado, copia `.env*`, valida ambiente em background.
**Quando usar:** trabalhar em paralelo sem afetar branch atual; antes de executar plano grande.
**Problema que resolve:** stash + checkout = perde estado mental e arquivos não-commitados.
**Exemplo:** `/worktree feat/payments`
**Takeaway:** **branch ≠ worktree.** Worktree dá diretório físico isolado.

#### `/detective-spec` — Engenharia reversa de spec em legado

**O que faz:** entra em codebase legado, extrai contratos executáveis (módulos, regras de negócio, fluxos, ADRs retroativos) sem modificar 1 linha. Pipeline de 5 fases com checkpoint/resume em `.detective/state.json`. Output em `_detective_sdd/`. Inspirado em [Reversa](https://github.com/sandeco/reversa).
**Quando usar:** legado sem doc, vibe coded, antes de evoluir feature em módulo desconhecido, migração, onboarding.
**Problema que resolve:** time herda monolito de 5 anos sem doc — agente não sabe o que pode quebrar.
**Exemplo:** `/detective-spec --module=src/billing`
**Takeaway:** **zero writes no projeto legado.** Verificável via `git status`. Spec gerada vira contrato operacional consumível por outro agente.

### Comandos de instalação / utilitários do kit

#### `/devkit-install-fv` — Instalar kit em `.bot/` no repo consumidor

**O que faz:** instala o kit completo (skills + policies + templates + MCP + hooks + multi-platform configs) em `.bot/` do repo onde foi rodado.
**Quando usar:** primeira vez que vai usar o kit em um projeto.
**Problema que resolve:** instalação manual envolveria copiar 100+ arquivos.
**Exemplo:** `/devkit-install-fv`

#### `/audit-repo` — Auditoria do repositório

**O que faz:** Repo Auditor (skill 18) faz fotografia operacional do projeto (stack, convenções, riscos, entry points, tech debt) e persiste em `docs/repo-audit/current.md`.
**Quando usar:** primeiro contato com um repo; antes de feature grande.
**Problema que resolve:** agente lê `package.json` 50 vezes em vez de cachear o conhecimento.
**Exemplo:** `/audit-repo`
**Takeaway:** **auditoria persistida = economia de tokens.** Splits opcionais por tipo (`routes.md`, `schema.md`, `components.md`, etc).

#### `/inventory-assets` — Inventário de assets

**O que faz:** Asset Librarian (skill 19) cataloga logos, ícones, fontes, tokens visuais.
**Quando usar:** antes de gerar imagem nova (skill 17) — evita reinventar identidade visual.

#### `/plan-feature` — Planejamento de feature

**O que faz:** atalho legado para iniciar planejamento de feature. Hoje, prefira `/plan` ou `/pipeline-discovery`.

#### `/review-release` — Review pré-release

**O que faz:** auditoria conjunta antes de release final. Hoje, `/review` + `/best` cobrem.

---

## 5. Skills (62)

Cada skill é uma especialidade. Tem frontmatter com `description` (triggers de ativação), `allowed-tools` (escopo de ferramentas), e SKILL.md com protocolo. Skill 16 está intencionalmente ausente — o escopo dela foi consolidado em `policies/model-routing.md` para manter regras de escolha de modelo num só lugar.

### Categoria: Management & Coordination

#### Skill 08 — Context Manager

**O que faz:** rastreia foco, tasks abertas, hot files e handoffs entre sessões longas.
**Quando ativar:** sessão longa com várias features paralelas; risco de perder contexto.
**Problema que resolve:** agente esquece o que estava fazendo após compactação automática.

#### Skill 09 — Orchestrator

**O que faz:** Tech Lead. Classifica complexidade da task, define pipeline mínimo, delega para skills, adapta em caso de rejeição. Conhece os 2 fluxos (clássico vs discovery) e escolhe.
**Quando ativar:** task complexa, várias skills candidatas, precisa de roteamento.
**Problema que resolve:** rodar pipeline cheio para bug fix simples queima tokens à toa.
**Takeaway:** **orchestrator é o cérebro do kit.** Sem ele, você roteia manualmente.

#### Skill 10 — Documenter

**O que faz:** registra decisões, contratos de API, operações e impactos em docs vivos. Atua transversal — toda mudança relevante de regra/contrato passa por aqui.
**Quando ativar:** feature ou refactor que muda comportamento documentado.

#### Skill 11 — Reviewer

**O que faz:** valida o delta final antes do release — qualidade, escopo, risco. 5 eixos: correctness, design, readability, performance, security.
**Quando ativar:** sempre antes de merge ou release.
**Problema que resolve:** "achei que tava bom" sem critério vira bug em produção.
**Takeaway:** **Reviewer é gate, não opinião.** Critical aberto = no merge.

#### Skill 17 — Image Generator

**O que faz:** gera ou adapta assets visuais (hero, mascote, illustration, background, layout, icon) via fal.ai (5 modelos: gpt-image-1-mini, Gemini 2.5 Flash, Gemini 3 Pro, gpt-image-1.5, Grok Imagine). Vendor-agnostic — alternativas (Replicate, OpenAI direto, Stability) suportadas.
**Quando ativar:** projeto precisa de imagem nova ou derivada.
**Problema que resolve:** "imagem aqui" placeholder em landing page.
**Takeaway:** **decisão por modelo é por custo + qualidade.** Pipeline multi-modelo (iterar barato → validar médio → final premium) custa $0.10-$0.50 por hero. Detalhes em `docs/skill-guides/image-generator-models.md`.

#### Skill 18 — Repo Auditor

**O que faz:** snapshot operacional do repo (stack, convenções, assets, testes, deploy, observability, riscos). Persiste em `docs/repo-audit/current.md` + splits por tipo (`routes.md`, `schema.md`, `components.md`, `services.md`, `infra.md`).
**Quando ativar:** primeiro contato com repo; mudança grande de stack; antes de feature grande.
**Problema que resolve:** agente reler 200 arquivos toda vez = $$$.
**Takeaway:** **auditoria é cache.** Atualizar só quando muda.

#### Skill 19 — Asset Librarian

**O que faz:** cataloga logos, ícones, fontes, tokens visuais e assets reutilizáveis em `docs/repo-audit/assets.md`.
**Quando ativar:** projeto com identidade visual estabelecida; antes de skill 17 ou 36.
**Problema que resolve:** Image Generator inventa estilo novo ignorando o que já existe.

#### Skill 20 — Observability SRE

**O que faz:** define logs estruturados, métricas, tracing, alertas e plano de rollback.
**Quando ativar:** antes de subir feature crítica em produção.
**Problema que resolve:** "não sabemos por que caiu" porque ninguém colocou log.

#### Skill 21 — Data Analytics

**O que faz:** define eventos de tracking, naming, funnels, KPIs do produto.
**Quando ativar:** feature nova com impacto de produto que precisa medir.

#### Skill 22 — Accessibility Specialist

**O que faz:** revisa WCAG 2.2, navegação por teclado, semântica HTML, motion reduction.
**Quando ativar:** antes de release de feature com UI; auditoria periódica.

#### Skill 23 — Migration & Refactor Specialist

**O que faz:** roda migrations incrementais, feature flags e rollback seguro. **Recebe plano de deepening da skill 38** e executa o refactor com TDD (skill 37).
**Quando ativar:** refactor grande, migração de stack, mudança que precisa de feature flag.
**Problema que resolve:** "vamos limpar" sem plano = regressão garantida.

#### Skill 24 — Release Manager

**O que faz:** organiza changelog, release notes, versionamento, gradual rollout.
**Quando ativar:** ciclo de release.

#### Skill 25 — AI Integration Architect

**O que faz:** desenha adapters de IA, gateways, streaming, fallbacks, custo de inferência.
**Quando ativar:** integração nova com LLM em produto.
**Problema que resolve:** acoplar produto a 1 vendor = lock-in caro depois.

#### Skill 26 — Prompt Engineer

**O que faz:** escreve e itera prompts, templates reutilizáveis, estratégias few-shot.
**Quando ativar:** prompt do produto precisa de iteração + eval sistemático.

#### Skill 27 — Video Integration Specialist

**O que faz:** integra video generativo com foco em UX, latência e formato.

#### Skill 28 — CLAUDE.md Generator

**O que faz:** gera `CLAUDE.md` inteligente para projetos consumidores do kit.
**Quando ativar:** primeira vez instalando o kit em um projeto.

#### Skill 30 — Cost Tracker

**O que faz:** rastreia custo de tokens e API calls por sessão, skill e tier de modelo.
**Quando ativar:** sempre — passivo, registra em background.
**Takeaway:** **se você não mede, você não otimiza.** Cost Tracker virou prática default.

#### Skill 31 — Session Summary

**O que faz:** consolida resumo de sessão para handoff limpo entre sessões longas.
**Quando ativar:** fim de sessão grande; antes de fechar IDE.

#### Skill 32 — Smart Suggestions

**O que faz:** sugere a próxima ação mais impactante baseado no estado real do projeto.
**Quando ativar:** "e agora, o que?" depois de mergear feature.

#### Skill 33 — Detective Spec

**O que faz:** engenharia reversa de spec em legado — extrai módulos, regras de negócio, fluxos, ADRs retroativos. **Zero writes** no projeto (verificável via `git status --porcelain`). Pipeline de 5 fases com checkpoint/resume.
**Quando ativar:** legado sem doc; vibe coded; onboarding em codebase grande.
**Problema que resolve:** agente não consegue evoluir o que não entende.
**Takeaway:** **spec gerada vira contrato operacional**, não doc para humano ler.

#### Skill 34 — Static Analysis

**O que faz:** scan automatizado via Semgrep + CodeQL com SARIF output, triagem de severidade (Critical/High/Medium/Low/Info), supressão de FP justificada, custom rules em `tools/semgrep/`. Despacha 5 subagents auxiliares para escala.
**Quando ativar:** pré-release, PR grande, auditoria periódica, variant analysis após bug.
**Problema que resolve:** review manual de segurança não pega tudo.

#### Skill 35 — Skill Author

**O que faz:** **meta-skill.** Cria, edita, avalia e otimiza as próprias skills do kit. Define template obrigatório de SKILL.md, eval scorecard (10 critérios × 0-3, threshold 22/30 para merge), pipelines para create/edit/eval/optimize.
**Quando ativar:** adicionar skill nova; refatorar skill existente; avaliar qualidade do kit.
**Problema que resolve:** kit cresce por copy-paste, cada skill diverge das convenções.
**Takeaway:** **skill que governa as outras skills.** Sustentabilidade do próprio kit.

#### Skill 36 — Web Asset Generator

**O que faz:** deriva assets web operacionais a partir de logo: favicons multi-tamanho, PWA icons (incl. maskable com 80% safe area), Open Graph (1200x630), Twitter card (1200x675), manifest, browserconfig, snippet HTML completo. 3 opções de tooling (realfavicongenerator CLI, ImageMagick, Sharp).
**Quando ativar:** antes do primeiro deploy; rebrand; adicionar suporte PWA; preparar landing.
**Problema que resolve:** deploy sem favicon, OG image em branco no WhatsApp, PWA sem maskable.
**Takeaway:** **handoff direto da skill 17** — skill 17 cria criativo, skill 36 deriva pacote operacional.

### Categoria: Product and Design

#### Skill 01 — PO (Feature Spec)

**O que faz:** escreve user stories, critérios de aceitação testáveis, prioridade, riscos. Tem **Deep Interview** (ambiguity > 0.7) e **Enrich Mode** (ambiguity 0.4-0.7) com inferência do repo-audit.
**Quando ativar:** toda feature começa aqui.
**Problema que resolve:** "build sem entender o pedido" → 3x rework.
**Takeaway:** **PO é o guardião do valor de negócio.** User stories já como vertical slices.

#### Skill 02 — UI/UX Designer

**O que faz:** define layout, sistema de tokens, responsividade, heurísticas de uso — e audita interface existente em dois modos que nunca se misturam: auditoria (nenhuma alteração de arquivo, produz achados classificados em norma/evidência/heurística/preferência e priorizados por severidade×alcance×frequência×confiança) e implementação (edição restrita à causa do achado, quando explicitamente autorizada). Detalhe do protocolo de auditoria em `references/audit-framework.md`; conteúdo por tipo de superfície em `references/marketing-surfaces.md`, `product-apps.md`, `forms-and-transactions.md`.
**Quando ativar:** feature com interface; rebranding; design system novo; revisar ou corrigir UI existente.
**Problema que resolve:** UI inventada por agente sem critério vira inconsistente. Sem o modo dual, pedido de "dá uma olhada nisso" vira edição não autorizada — o erro mais caro do protocolo de auditoria.

#### Skill 29 — Design Intelligence

**O que faz:** pesquisa concorrentes, captura screenshots, analisa tendências visuais, entrega dossier estratégico para UI/UX.
**Quando ativar:** feature inovadora ou rebranding — antes de UI/UX começar.
**Problema que resolve:** design "do nada" sem benchmark de mercado.

### Categoria: Development

#### Skill 03 — Backend Engineer

**O que faz:** APIs REST/GraphQL, contratos, auth, validação, banco, integrações.
**Quando ativar:** implementação backend.
**Problema que resolve:** API inventada sem ler convenções do projeto.

#### Skill 04 — Frontend Engineer

**O que faz:** React/Next.js, estado, chamadas API, performance, experiência.
**Quando ativar:** implementação frontend.

#### Skill 12 — Motion Designer

**O que faz:** animações, transições, micro-interações, comportamento visual coeso.
**Quando ativar:** feature precisa de motion (modal, toast, skeleton, scroll, hover).

#### Skill 15 — Mobile / Tauri

**O que faz:** extensão para apps desktop e mobile com Tauri + React Native.
**Quando ativar:** projeto vai além de web.

### Categoria: Content and Discovery

#### Skill 13 — Marketing Copy

**O que faz:** copy de produto, CTAs, landing pages, brand voice, mensagens de conversão.
**Quando ativar:** landing page, anúncio, email marketing.

#### Skill 14 — SEO Specialist

**O que faz:** metadata, schema.org, Core Web Vitals, sitemap, discoverability.
**Quando ativar:** site público; antes de Google indexar.

### Categoria: Quality and Delivery

#### Skill 05 — QA Engineer

**O que faz:** testes unitários, integração, E2E, cobertura, edge cases críticos. Filosofia "prove-it" — se diz que funciona, prova com teste. **Complementa skill 37 (TDD)** com edge cases não cobertos.
**Quando ativar:** pós-implementação; preencher gap; validar fix.
**Takeaway:** **falar não conta. Teste prova.**

#### Skill 06 — Security Reviewer

**O que faz:** OWASP Top 10, headers, CORS, CSRF, XSS, injection, exposição de dados. Pensa como atacante. Critical findings vêm com PoC.
**Quando ativar:** antes de deploy de feature crítica; toda PR que toca auth/input handling.
**Problema que resolve:** descobrir vulnerabilidade na conta do cliente é tarde demais.

#### Skill 07 — Deploy Engineer

**O que faz:** containerização, CI/CD, blue-green rollout, rollback, infra as code.
**Quando ativar:** deploy novo; mudança de infra.

#### Skill 37 — TDD Engineer

**O que faz:** **red-green-refactor enforced.** 1 teste → 1 implementação → repete. Combate "horizontal slicing" no nível de teste (escrever todos os testes antes de toda implementação produz testes ruins). Tabela anti-rationalization com 9 falácias comuns. Pareia com skill 38 para identificar deep modules antes do RED.
**Quando ativar:** feature complexa; bug fix em código crítico; refactor; design de módulo novo.
**Problema que resolve:** testes em massa testam shape em vez de behavior; quebram em refactor sem motivo.
**Takeaway:** **testes verificam comportamento via interface pública, não detalhes de implementação.** Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd).

#### Skill 38 — Architecture Deepener

**O que faz:** encontra **deepening opportunities** (deletion test, deep modules, seams). Glossário arquitetural rigoroso (Module/Interface/Implementation/Depth/Seam/Adapter/Leverage/Locality). **Não modifica código** — propõe candidatos. Skill 23 (Migration & Refactor) executa.
**Quando ativar:** semanalmente; antes de delegar manutenção a agente em módulo complexo; pós-Detective em legado; review de PR que adiciona módulo.
**Problema que resolve:** módulos shallow (interface tão complexa quanto implementação) que viram god files e bloqueiam evolução.
**Takeaway:** **deletion test é o coração.** Se deletar concentra complexidade, módulo estava ganhando seu lugar. Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture).

#### Skill 39 — Program Router

**O que faz:** decide qual program declarativo (`programs/*.yml`) rodar baseado na classificação da task — um match heurístico contra um catálogo (pipeline-discovery, spec-driven-development, loop-polishing, detective-spec, adversarial-dev, comprehensive-review). Trabalha em par com o hook `intent-classifier` (que sugere) e consulta `memory/constitution.md`, que pode forçar um pipeline específico.
**Quando ativar:** usuário pergunta "qual program pra X"; usuário pede feature/review/discovery sem invocar slash explícito; hook `intent-classifier` já sugeriu e usuário quer confirmação; entre tasks, ao planejar o próximo passo.
**Problema que resolve:** pipelines ad-hoc improvisados para tasks que já batem com um program declarativo comprovado — desperdiçando a estrutura (gates, dry-run, inputs definidos) que esses programs já encapsulam.
**Diferente de:** Skill 09 (Orchestrator) monta pipelines informais quando nenhum program serve; Skill 39 só roteia para um program existente e devolve para 09 em caso de baixa confiança ou decline. O hook `intent-classifier` só sugere — Skill 39 confirma ou refuta e dispatcha.
**Takeaway:** **nunca force um program numa task exploratória** — decline-and-ask é melhor que match errado, e a constitution sempre sobrepõe a classificação heurística quando declara um pipeline obrigatório.

#### Skill 40 — Parallel Dispatcher

**O que faz:** playbook para despachar N slices, reviews ou tarefas independentes via subagents em paralelo sem cair na armadilha skill-vs-agent. Define 3 caminhos canônicos — subagents nativos (Caminho A), worktree + general-purpose com skill invocada dentro do prompt (Caminho B), ou `/swarm` para autonomia total (Caminho C) — além de decision tree, template de prompt self-contained e 6 anti-padrões registrados (passar nome de skill como `subagent_type`, mencionar skill sem invocar, split layer-first, mensagens sequenciais em vez de fan-out single-message, esquecer `model:`, esquecer `isolation: "worktree"`).
**Quando ativar:** despachar N slices verticais de uma feature, N reviews em paralelo (code/security/test/prosa), pipeline de static analysis (semgrep + codeql), ou qualquer cenário scatter-gather com trabalho independente.
**Problema que resolve:** confusão do modelo entre "skill" (playbook) e "subagent" (turno isolado) — passar uma skill numerada direto como `subagent_type` gera `InputValidationError`, e esquecer `model:` ou `isolation: "worktree"` causa desperdício de budget ou race conditions entre worktrees.
**Diferente de:** Skill 09 (Orchestrator) decide *qual* pipeline rodar; Skill 40 decide *como* paralelizar corretamente N unidades independentes desse pipeline. Skill 39 (Program Router) escolhe um `programs/*.yml`; Skill 40 é a mecânica de dispatch depois que o trabalho paralelo já foi decidido.
**Takeaway:** nunca passe nome de skill como `subagent_type` — skills carregam playbooks, agents executam turnos isolados; paralelizar uma skill significa N agents `general-purpose` (cada um em seu worktree) cujo prompt instrui invocar a skill internamente.

#### Skill 41 — Publicador de Blog

**O que faz:** compositora ponta a ponta que transforma um assunto, URL ou texto pronto em um post de blog HTML totalmente original — escreve o corpo (via skill 13 para voz/tom), providencia cover e imagens inline (skill 17 fal.ai ou screenshots Playwright da skill 42), gera um bloco de LinkedIn obrigatório, monta o post via `new-post.mjs`, comita, dá push no repo de blog configurado e retorna a URL pública no GitHub Pages.
**Quando ativar:** usuário pede "publica um post sobre X," cola uma URL e diz "cria um post baseado nisso," ou cola um texto pronto e diz "vira post."
**Problema que resolve:** publicar um post hoje significa escrever, buscar imagens, montar o copy de distribuição no LinkedIn e dar push no repo como passos manuais separados — isso comprime tudo em um único comando que termina com uma URL pública.
**Diferente de:** skill 13 (Marketing Copy) só escreve o texto, sem publicar; skill 42 fornece screenshots mas não compõe nem publica; editar um post existente usa a Edit tool diretamente, não esta skill.
**Takeaway:** **autoral, nunca adaptação** — o post precisa soar como se o dono do blog tivesse escrito do zero; creditar a fonte ou deixar qualquer rastro de adaptação (ex.: "fonte original," "segundo {autor}") é anti-padrão duro, checado via grep antes de declarar a conclusão.

#### Skill 42 — Blog Screenshot

**O que faz:** captura screenshots reais de URLs/elementos navegáveis via Playwright MCP (já presente no harness padrão do kit) — cuida de viewport, dispensa de cookie banners, captura full-page vs. viewport vs. elemento, scroll até âncora e saída em PNG/JPG.
**Quando ativar:** a skill 41 (blog-publisher) precisa de imagem real de algo navegável em vez de gerada; documentação técnica precisa mostrar a UI real de um site/dashboard; comparação visual antes/depois de mudança em landing page; captura de relatório HTML renderizado (ex.: `analyze-doc/index.html`).
**Problema que resolve:** posts e docs que referenciam uma UI real mas acabam ilustrados com mockups falsos ou genéricos em vez do que a página realmente mostra.
**Diferente de:** skill 17 (image-generator), usada para imagens conceituais/abstratas que não existem pra serem navegadas; skill 36 (web-asset-generator), usada pra logos/ícones/favicons — nenhuma das duas captura uma página já renderizada.
**Takeaway:** sempre ajustar o viewport antes de capturar (o padrão do Playwright é 1280×720, errado pra um cover de blog 1500×750) e limpar cookie banners antes — um overlay não removido num screenshot público é um erro bobo e constrangedor.

#### Skill 43 — Canary Deployment

**O que faz:** cobre rollout gradual de release em produção com observação contínua de métricas e rollback automático. Suporta três estratégias — traffic-based (roteamento com peso via service mesh/ALB), feature flag (código gated em runtime) e blue-green (switch entre ambientes paralelos) — mais uma tabela padrão de métricas (error rate, p95/p99 latency, conversão, saturação, custo por request) com thresholds e gatilhos de abort. Estratégia e thresholds adaptados do slash command `/canary` do repositório [garrytan/gstack](https://github.com/garrytan/gstack) (MIT), além de conceitos do Google SRE Book.
**Quando ativar:** promover em produção uma release já aprovada com risco não trivial de regressão; validar mudança de comportamento em tráfego real antes do rollout completo; liberar uma feature gradualmente por percentual de usuários ou segmento.
**Problema que resolve:** um artefato aprovado ainda carrega risco de blast radius — canary limita a exposição fatiando o tráfego e revertendo automaticamente assim que uma métrica cruza o threshold, em vez de um corte tudo-ou-nada.
**Diferente de:** Skill 24 (Release Manager) decide *o quê* vai ao ar e publica o changelog; Skill 07 (Deploy/Docker) builda e publica o artefato; Canary Deployment só manipula roteamento/flags sobre um artefato já buildado e já aprovado, cuidando do "como" da exposição. Skill 20 (Observability SRE) fornece os dashboards/SLOs dos quais o canary depende e lidera o postmortem em caso de rollback.
**Takeaway:** rollback não é limpeza opcional — é acionado por runbooks pré-testados (< 5 min) e gatilhos automáticos (2+ amostras consecutivas quebradas, alarme externo de paginação, abort manual, timeout de step); um canary sem observabilidade com lag < 60s vira aposta cega.

#### Skill 44 — Zoom Out

**O que faz:** produz um mapa de módulos e callers antes de tocar código numa área desconhecida — "visão de bairro" em vez de mergulhar direto nos arquivos. Prioriza `graphify-out/graph.json` + `GRAPH_REPORT.md` em vez de Grep/Read brutos (política global de graph-first); sem graph, cai para descoberta estrutural via Glob (entry points, agrupamentos por pasta, arquivos grandes/hub) mais rastreamento de callers/callees via Grep. Adaptado de [mattpocock/skills/engineering/zoom-out](https://github.com/mattpocock/skills/tree/main/skills/engineering/zoom-out) (MIT).
**Quando ativar:** ao iniciar trabalho em módulo que o agente não conhece bem; usuário diz "estou perdido nesse código"; antes de propor refactor ou architecture change (alimenta skill 38); antes de explorar com Grep/Read direto; como prelúdio da skill 33 (Detective Spec) em código legado.
**Problema que resolve:** agentes que começam a editar um módulo desconhecido direto tendem a perder callers, duplicar lógica já existente ou quebrar convenções — porque nunca construíram um mapa mental de como a área se encaixa antes de tocar nela.
**Diferente de:** skill 18 (Repo Auditor) perfila o repositório inteiro uma vez (stack/convenções/risco); skill 44 mapeia uma área específica sob demanda, usando o vocabulário de domínio da constitution/audit em vez de termos genéricos. Skill 38 (Architecture Deepener) propõe fixes estruturais; 44 só mapeia, não julga nem refatora.
**Takeaway:** **produza o mapa enquanto explora, não depois** — um dump completo de `find . -name "*.ts"` não é mapa, é fuga; o mapa precisa falar a língua do próprio projeto, não termos genéricos.

#### Skill 45 — Handoff Context

**O que faz:** produz um pacote prospectivo de handoff para outro agente, modelo ou dev humano pegar a task de onde parou sem contexto da sessão atual — snapshot do estado git, pendências verificadas (testes/build/TODOs), um próximo passo concreto e armadilhas conhecidas. Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff) (MIT), distinguido explicitamente da skill 31 (retrospectiva).
**Quando ativar:** você vai parar e outra pessoa continua amanhã; o contexto está se esgotando e uma sessão fresca é iminente; a task será delegada para um agente externo (codex:rescue, freelancer, outro time); handoff entre skills do pipeline.
**Problema que resolve:** "continue de onde parei" sem dizer onde parou — quem chega depois reexplora um estado que já era conhecido, ou repete um caminho morto já descartado.
**Diferente de:** skill 31 (session-summary) é retrospectiva (o que foi feito, para o mesmo modelo/sessão); a skill 45 é prospectiva (o que falta + como continuar, para quem chega cego) — session-summary registra, handoff-context delega.
**Takeaway:** **um próximo passo, não um roadmap** — o output é um único comando/edição acionável com resultado esperado e critério de sucesso, salvo em `docs/handoffs/YYYY-MM-DD-<slug>.md`.

#### Skill 46 — Monitor de Canário Pós-Deploy

**O que faz:** vigia a produção depois que o deploy fecha 100%, comparando métricas e screenshots ao vivo contra um baseline pré-deploy para pegar regressões silenciosas (console errors, queda de performance, páginas quebradas). Adaptado de [gstack/canary](https://github.com/garrytan/gstack/tree/main/canary) (MIT, Garry Tan), redirecionado para a janela pós-rollout em vez da janela de rollout gradual.
**Quando ativar:** logo depois que o deploy atinge 100% de rollout, nas primeiras 2-24h; mudanças de alto risco (migration, refactor, upgrade de framework); projetos sem observability robusta que já cubra esse gap.
**Problema que resolve:** "passou no canary com 5%" não significa "saudável com 100%" — regressões silenciosas que só aparecem sob tráfego completo passam despercebidas sem uma vigilância ativa pós-deploy.
**Diferente de:** a skill 43 (canary-deployment) atua *durante* o rollout de 0%→100% e decide promover-ou-abortar o próprio deploy; esta skill só começa quando o rollout já terminou e decide manter-ou-rollback a produção, escalando pra skill 43 ou skill 24 (release-manager) em caso de abort.
**Takeaway:** nunca faz rollback automático por padrão — reverter produção é decisão humana; esta skill só detecta, registra em `docs/canary-runs/` e escala após 2 falhas consecutivas.

#### Skill 47 — Conformidade de Padrões

**O que faz:** Extrai as convenções de codificação concretas do codebase existente — naming, estrutura de arquivos, tratamento de erros, estilo de testes, imports, design de API, padrões assíncronos, DI — a partir de amostras representativas, e salva como um "mapa de estilo de código" em `memory/patterns.md` (cache de 14 dias, renovado com `--update`). Toda skill de geração de código passa a consultar esse mapa como restrição obrigatória antes de escrever código novo.
**Quando ativar:** Ao iniciar uma feature em codebase existente com convenções estabelecidas; antes de gerar novo módulo, service, teste, hook ou componente; quando o usuário diz "coda igual ao resto", "segue o padrão", "não reinventa"; como pré-requisito das skills 01, 02, 03.
**Problema que resolve:** Um agente que ignora as convenções do projeto produz código tecnicamente correto mas arquiteturalmente dissonante — acumulando dívida técnica silenciosa. Esta skill impõe "código com sotaque do projeto" em vez do estilo padrão do agente.
**Diferente de:** Skill 18 (repo-auditor) captura stack/frameworks/riscos em `docs/repo-audit/current.md` — uma fotografia, não regras de estilo aplicáveis. Skill 33 (detective-spec) extrai regras de negócio implícitas, não convenções de código. Skill 44 (zoom-out) mapeia módulos e callers, não estilo de código. Só a skill 47 produz restrições de estilo concretas e consultáveis (`memory/patterns.md`).
**Takeaway:** Skill 18 diz "o projeto usa NestJS + TypeORM"; a skill 47 diz "services injetam repositórios via constructor, métodos públicos são sempre `async`, erros são lançados como `AppException(code, message)`" — e bloqueia código novo que desvie sem uma exceção justificada e comentada.

#### Skill 48 — Research Prep (Preparação de Pesquisa)

**O que faz:** coleta e organiza informação técnica multi-fonte antes de escrever docs, PRDs, ADRs ou artigos — busca em docs oficiais, GitHub (repos + issues), Stack Overflow, papers e blogs de engenharia de referência. Ranqueia as fontes por um score de autoridade (oficial 40% + recência 30% + profundidade 20% + comunidade 10%) e descarta o que pontuar abaixo de 4.0. Output é um dossiê estruturado em `memory/research/<slug>.md`. Adaptada de [addozhang/openclaw-forge](https://github.com/addozhang/openclaw-forge) (MIT).
**Quando ativar:** antes de escrever doc técnico, ADR, artigo ou PRD sobre tecnologia não dominada; ao comparar alternativas (frameworks, libs, abordagens arquiteturais); em due diligence técnica ("vamos adotar X?"); como prerequisito das skills 10 (documenter), 01 (po-feature-spec), 26 (prompt-engineer), 41 (blog-publisher).
**Problema que resolve:** escrever sem pesquisar é opinar sem evidência — esta skill garante que exista uma base de fontes citadas e ranqueadas antes de qualquer skill de produção começar a redigir.
**Diferente de:** Skill 18 (repo-auditor) mapeia o stack do projeto atual; Skill 29 (design-intelligence) faz benchmark competitivo de produto/UX, não fontes técnicas; Skill 33 (detective-spec) extrai regras de negócio de código legado, não referências externas. A Skill 48 é a única que ranqueia fontes técnicas externas por autoridade.
**Takeaway:** fonte com score abaixo de 4.0 é ruído, não sinal — cachear resultados por 7 dias evita repesquisar o mesmo tópico a cada pedido.

#### Skill 49 — Context Budget

**O que faz:** audita o peso de contexto carregado — CLAUDE.md (global + projeto), descrições de agents/*.md, descrições de MCP servers ativos, rules path-scoped disparadas, skills invocadas na sessão, e histórico de conversa acumulado. Estima tokens por componente, reporta headroom disponível e emite alertas de overflow em 80%/95%.
**Quando ativar:** sessão parece lenta ou respostas degradam (possível overflow de contexto); depois de habilitar um MCP server novo; antes de `/swarm` ou `/loop --parallel`; repo com `.bot/` instalado.
**Problema que resolve:** bloat de contexto invisível — você não sabe qual componente está comendo 40% da sua janela até as respostas começarem a degradar.
**Diferente de:** Skill 30 (Cost Tracker) rastreia custo de completions em runtime; Context Budget rastreia o que já está carregado antes de qualquer completion.
**Takeaway:** descrições de agents/*.md costumam ser o maior custo fixo — 16 agents × ~500 tokens cada = 8k tokens sempre presentes.

#### Skill 50 — Direct Response Copy

**O que faz:** copywriting de direct response — anúncios, páginas de vendas, e-mails de venda, legendas de Instagram, roteiros de VSL. Traz uma biblioteca de fórmulas de headline em 20 categorias de gatilho (357 modelos clássicos PT-BR destilados em fórmulas parametrizadas), os 8 gatilhos mentais (escassez, urgência, autoridade, reciprocidade, prova social, razão-por-quê, antecipação, dor×prazer) com estrutura de storytelling de venda, e copy de engajamento pro Instagram. Gate de integridade obrigatório: todo claim precisa ser verificável, sem depoimento fabricado, escassez/urgência só quando real.
**Quando ativar:** escrever headline/criativo de anúncio, sequência de e-mail de lançamento, página de vendas de infoproduto, legenda de Instagram com CTA de interação; escolher o gatilho mental certo pro estágio de consciência do avatar.
**Problema que resolve:** copy de venda escrita direto da oferta, sem pesquisa de avatar e sem estratégia de gatilho — headline genérica que não converte nada, ou pior, claim não-verificável que queima a marca.
**Diferente de:** Skill 13 (Marketing Copy) cobre copy de produto — landing page estrutural, microcopy, brand voice. Skill 50 cobre direct response — o leitor clica/assina/compra agora ou a peça falhou.
**Takeaway:** **a fórmula é o esqueleto, a pesquisa de avatar é a carne, e o gate de integridade não é negociável** — um `{slot}` preenchido com claim improvável não vai ao ar.

#### Skill 51 — UX Research

**O que faz:** discovery qualitativo — entrevista com usuário, persona baseada em pesquisa, journey/empathy map, teste de usabilidade qualitativo, arquitetura de informação, card sorting, proposição de valor. Produz os artefatos de pesquisa que alimentam o PO (01) e o UI/UX (02). Destilado de *UX Design* de Fabricio Teixeira (Casa do Código).
**Quando ativar:** incerteza sobre quem é o usuário ou se um problema vale a pena resolver; roteirizar uma entrevista; construir uma persona a partir de dados reais; mapear uma jornada; planejar um teste de usabilidade.
**Problema que resolve:** o time projeta a partir da própria intuição — mas "você não é o usuário". Personas viram ficção decorativa; features são construídas pra ninguém.
**Diferente de:** Skill 02 (UI/UX) desenha a interface *a partir* da pesquisa; 51 produz a pesquisa. Skill 22 (a11y técnico), 29 (competitivo visual), 21 (instrumentação quantitativa) são não-objetivos explícitos.
**Takeaway:** **pesquisa que não pode mudar uma decisão é teatro** — e uma persona sem entrevista por trás é proto-persona, marcada como hipótese, não fato. Pipeline: Problema → [51] → PO (01) → UI/UX (02).

#### Skill 52 — UI Polish

**O que faz:** o passo de detalhe visual que faz um componente já construído parecer refinado em vez de "ok" — border radius concêntrico, alinhamento óptico, sombra em vez de borda, animações interrompíveis, split/stagger de entrada, saída sutil, animação contextual de ícone (valores exatos: scale 0.25→1, blur 4px→0, spring bounce 0), font smoothing, tabular numbers, text wrapping (balance/pretty), image outline (preto/branco puro, nunca tintado), scale on press (0.96), skip animation on load, sem `transition: all`, `will-change` moderado, hit area mínima de 40×40px. Absorvida do agent skill externo [jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) (MIT).
**Quando ativar:** revisar ou polir um componente depois que Frontend (04) e/ou Motion Design (12) já construíram; feedback subjetivo tipo "parece off" ou "precisa de polish"; passo final antes do Reviewer (11).
**Problema que resolve:** componentes funcionalmente corretos mas que parecem genéricos — raios aninhados desencontrados, bordas que não se adaptam ao fundo, animações de entrada/saída abruptas, números que causam layout shift, hit targets minúsculos.
**Diferente de:** Skill 12 (Motion Design) é dona do sistema de tokens de animação e da orquestração em escala; 52 é ajuste pontual de detalhe, inclusive em motion. Skill 02 (UI/UX) define estrutura e âncora estética; 52 checa se a execução não desviou dela. Skill 04 (Frontend) é dona da lógica/estado do componente; 52 nunca toca nisso.
**Takeaway:** **interfaces raramente falham por uma coisa grande — falham por uma dúzia de pequenos desencontros somados.** Output sempre é uma tabela Before/After em markdown agrupada por princípio, mais um checklist de revisão.

#### Skill 53 — Doubt-Driven Review

**O que faz:** revisão adversarial **em voo** para decisão não-trivial — diferente do gate pós-hoc de PR/deploy da skill 11. Loop limitado em 5 passos: CLAIM (nomear a decisão + por que importa, 2-3 linhas) → EXTRACT (menor unidade revisável — artefato + contrato, sem o raciocínio) → DÚVIDA (despachar revisor de contexto fresco via `Agent` tool com prompt adversarial — "encontre problemas", nunca "isso tá bom?") → RECONCILIA (classificar cada finding em ordem de precedência: contrato mal-lido / válido-acionável / trade-off válido / ruído) → PARA (findings triviais, 3 ciclos, ou override explícito do usuário). Regra dura: nunca passar a CLAIM ao revisor — só ARTEFATO + CONTRATO, ou a independência do revisor fica viesada em direção à concordância. Absorvida de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT, 76.7k stars), skill `doubt-driven-development`.
**Quando ativar:** prestes a tomar decisão arquitetural sob incerteza; prestes a commitar código não-trivial (lógica de branching, fronteira de módulo/service, propriedade não-verificável tipo thread-safety); prestes a afirmar um fato não-óbvio ("isso é seguro", "isso escala"); trabalhando em código desconhecido.
**Problema que resolve:** resposta confiante não é resposta correta — sessões longas silenciosamente transformam suposições em "fatos", e na hora do PR (gate da skill 11) corrigir rota já é caro. Esta skill pega direção errada cedo, quando ainda é barato consertar.
**Diferente de:** Skill 11 (Reviewer) é veredito sobre artefato pronto; 53 é postura aplicada por decisão, em voo. Skill 40 (Parallel Dispatcher) fornece a mecânica de dispatch que 53 consome (`Agent` tool, `subagent_type: code-reviewer`) — 53 nunca invoca uma skill de dentro do subagent despachado, e é explicitamente restrita ao orquestrador da sessão principal, não pra ser chamada de dentro de outro subagent (nested-spawn é o anti-padrão que `policies/skills-vs-agents.md` proíbe).
**Takeaway:** **o output do revisor é dado, não veredito — você ainda é o orquestrador.** Reclassificar cada finding contra o texto do artefato (não carimbar sem questionar) é o que separa dúvida real de teatro de dúvida; três ciclos não-resolvidos são informação sobre o artefato, não motivo pra moer um quarto sozinho.

#### Skill 54 — Video Analysis

**O que faz:** extrai informação estruturada de vídeo — transcrição, quebra por cena, texto em tela, fluxo de UI demonstrado numa gravação — e transforma no que o pipeline consegue consumir (spec, relato de bug, achados de UX).
**Quando ativar:** o bug chegou como screen recording; demo de concorrente precisa ser analisada; gravação de sessão de usuário tem a resposta de por que um fluxo é abandonado.
**Problema que resolve:** vídeo é opaco para o resto do kit. Sem esta etapa, quem assiste transcreve os achados na mão e perde detalhe entre assistir e escrever.

#### Skill 55 — Marketing Reporting & Analytics

**O que faz:** operação de analytics de marketing — estrutura de relatório de performance de Ads/GA4 (fórmulas de ROAS/CPA/CTR, seções adaptadas ao público), checklist de setup técnico GA4+GTM em 4 fases ("configurado" só depois da validação da fase 4, não na instalação da tag), auditoria de infraestrutura de dados em 8 categorias com PASS/FAIL/PARTIAL e severidade, e calculadoras de CAC payback/ROI/ROAS com custo totalmente carregado e payback ajustado por churn.
**Quando ativar:** relatório de campanha a entregar; GA4/GTM a configurar ou auditar; alguém pergunta se o investimento em aquisição se paga.
**Diferente de:** a skill 21 (Data Analytics) define o que trackear *dentro do produto*; a 55 configura e audita a *ferramenta de marketing* e o retorno financeiro. A skill 59 é dona da cadeia clique→receita ponta a ponta.

#### Skill 56 — Responsive Conversion

**O que faz:** converte UI desktop-first em mobile funcional, e é dona dos padrões de interação que a conversão expõe. Catálogo sintoma→causa→fix (`min-width: auto` como causa real de "não pega 100%", `dvh` vs `vh`, `env(safe-area-inset-*)` para notch e barra de gestos, caça a scroll horizontal), protocolo de auditoria em 4 fases testado em 320/390/768px, tabela de decisão modal vs. bottom sheet com requisitos inegociáveis (focus trap, retorno de foco, scroll lock iOS-safe), e confirmação de ação destrutiva por reversibilidade.
**Quando ativar:** componente não preenche o container, conteúdo corta na tela, apareceu scroll horizontal, modal estoura a viewport, ou uma UI web precisa de versão mobile.
**Diferente de:** a skill 02 decide como a interface **vai** parecer antes de existir; a 56 conserta a que já existe e quebrou.

#### Skill 57 — Mobile UX Foundations

**O que faz:** as decisões que antecedem o layout, cada uma ancorada em dado biométrico ou fisiológico e não em gosto — ergonomia da zona do polegar (onde a navegação pode morar, por que ação destrutiva fica no canto difícil), fisiologia do dark mode (`#121212` como base, nunca preto puro: halation, smearing OLED, elevação morta), performance percebida (limiares 100ms/1s/10s; skeleton entre 1–10s, nada abaixo de 1s), UX de auth/onboarding (passkeys, NIST SP 800-63B contra regra draconiana de senha, permission priming) e a taxonomia de padrão de onboarding ligada ao momento de ativação.
**Quando ativar:** antes de decidir onde fica a navegação, antes de escolher as superfícies do dark mode, quando o usuário abandona no primeiro uso, ou quando o app "parece lento" sem ser lento.

#### Skill 58 — i18n & Localization

**O que faz:** prepara o produto para outro idioma, região ou direção de escrita **antes** de existir tradutor — externalização de string com chave semântica, plural via API da plataforma (2 formas funcionam em pt/en e quebram em russo e árabe), formatters por locale sobre armazenamento canônico, +30% de expansão de texto como piso de teste, propriedades lógicas para RTL (incluindo o que **não** espelha: número, logo, ícone de mídia) e pseudolocale/RTL como teste de regressão.
**Quando ativar:** antes de fixar largura de botão, alinhamento ou formato de data — mesmo num produto que hoje é só pt-BR.
**Problema que resolve:** i18n é trabalho de arquitetura, não de tradutor. Frase concatenada, botão de largura fixa, data montada à mão e `margin-left` quebram no contato com outro idioma, e nenhum tradutor conserta.

#### Skill 59 — Closed-Loop Revenue

**O que faz:** fecha a cadeia do clique pago até a margem — identidade (GCLID/UTM/`transaction_id`/CRM, cada um com uma função e não intercambiáveis), backend como fonte de verdade da receita (o `purchase` client-side perde pagamento assíncrono, dispara duas vezes no refresh e morre com bloqueador), reconciliação com **tolerância declarada** que bloqueia escala de mídia quando estourada, e a conta que muda decisão: break-even ROAS = 1 / margem de contribuição.
**Quando ativar:** a receita do analytics não bate com o backend; decidir se a campanha é realmente lucrativa; o bidding de lead gen está aprendendo com formulário preenchido em vez de venda fechada.
**Takeaway:** **com margem de 40%, um ROAS de 2,0 aparece verde no painel e destrói valor.**

#### Skill 60 — App Reference Architecture

**O que faz:** molde para apps novos que precisam de login + pagamento + push + web + APK Android a partir de um único código-fonte Next.js + Tauri v2, extraído por engenharia reversa de 3 apps do autor em produção. Cobre auth dual (cookie de sessão para web, Bearer JWT ou token Supabase para o app Tauri, resolvido por uma função central por rota), o problema do build estático (script que renomeia — nunca deleta — Server Actions e layouts com `getServerSession()` antes do `next build --output export`, restaurando num `finally`), pagamento dual (Stripe + Google Play Billing, obrigatório pela política da Play Store para assinatura dentro de APK), push dual, e uma tabela de decisão que transforma as divergências dos 3 apps de origem em escolha explícita.
**Quando ativar:** começar um app desse formato, em vez de rederivar auth, pagamento, push e build Tauri do zero.

#### Skill 61 — Content Growth Engine

**O que faz:** estratégia de conteúdo como sistema de aquisição, não calendário de publicação, em 6 fases (Descobrir, Criar, Otimizar, Paralelo, Alto impacto, Medir). Prioriza por **intenção comercial e não por volume de busca** (50 buscas de um diretor de compras valem mais que 5.000 de estudante — volume dimensiona o esforço, intenção decide a ordem) e **começa pelo fundo do funil**, onde 100 visitas convertem o que 10.000 de topo não convertem. Inclui baseline reproduzível de citação em IA (conjunto fixo de prompts, sessão limpa, datado por modelo — mudar os prompts invalida a série histórica), cota reservada de refresh de 30–40%, objeções de call de vendas como fonte do conteúdo de fundo de funil, e cadência dimensionada contra capacidade real.
**Quando ativar:** montar plano de conteúdo do zero; priorizar pauta maior que a capacidade de produção; decidir entre publicar novo ou atualizar antigo; o tráfego cresceu mas o pipeline não.
**Diferente de:** ela decide *o que produzir e em que ordem*. Schema e marcação são da skill 14, copy da 13/50, publicação da 41, instrumentação de receita da 59.
**Takeaway:** **tráfego não é o produto — pipeline é.** Sessão está de fora das métricas de sucesso de 6 meses de propósito: sobe sozinha e não paga salário.

#### Skill 62 — Persona-Driven Issue Audit

**O que faz:** audita em massa um produto existente via personas simuladas, ponta a ponta até PR, e roda mesmo sem nenhuma persona pré-escrita — na ausência de fonte primária, infere de 3 a 5 proto-personas lendo o próprio repositório (rotas, formulário, texto de erro, README, locale), rotula cada uma com sua fonte (`inferida-do-repo`/`pesquisa-real`/`escrita-manual`) e oferece uma janela de confirmação humana sem bloquear o funil. Um agente de teste impersona cada persona (técnica, não-técnica, baixa familiaridade, adversarial) contra um ambiente real, abre issue deduplicada por fricção real (rota + causa raiz como chave de dedup, não título — título varia por persona, rota não), um agente de análise de solução comenta causa e trade-offs por issue sem corrigir nada, uma frota de até 10 agentes com contexto fresco pega uma issue cada e ou abre PR (confiança alta) ou comenta `wontfix`/`needs-human` com motivo específico (confiança baixa), um reviewer aprova ou rejeita cada PR com a mesma régua de qualquer outra PR, e o que sobra vai para uma triagem humana leve antes da distribuição ao time.
**Quando ativar:** produto precisa de varredura ampla de usabilidade/navegação antes de um marco; suspeita de que bugs de UX estão sendo perdidos porque QA só testa o caminho feliz de um perfil técnico; volume de findings tornaria o review humano item-a-item o gargalo.
**Diferente de:** o `/swarm` constrói feature *nova* a partir de spec, story a story; esta skill audita produto *existente*, persona → issue em vez de story. A skill 06 é dona de qualquer achado de segurança que apareça no caminho — nunca misturado na mesma issue que um achado de UX. Os critérios de aprovação da skill 11 valem sem alteração na fase de review; esta skill só decide o volume e o corte de confiança que chega até ela.
**Problema que resolve:** transformar uma auditoria exploratória em 100 issues rastreadas é fácil; transformar isso em sinal sem tornar o review o novo gargalo é o problema de verdade. O funil — não a contagem bruta de issues — é o que importa: cada fase existe para que a próxima receba menos, com mais contexto.
**Takeaway:** **PR aprovada não é PR mergeada.** Merge continua decisão humana, mesma regra do `--auto-merge` do `/swarm`.

#### Skill 63 — Mobile Paywall & Checkout

**O que faz:** UI/UX de seleção de plano e checkout de pagamento em apps mobile — periodicidade, plano, cupão, Google Play Billing, Google Pay e PSPs externos (Stripe, Mercado Pago). É dona da decisão de arquitetura de cobrança (quando Play Billing é obrigatório vs. quando PSP externo é permitido — não é decisão puramente visual), do fluxo periodicidade → plano → cupão → pagar → autenticar → confirmar, da hierarquia de plano-alvo sem manipulação, dos estados de pagamento (processing/3DS/pending/succeeded/failed) com a regra de que "voltou do 3DS" não é sinônimo de aprovado nem de recusado, e do campo de cupão collapsed por padrão (campo visível sinaliza que existe preço melhor e manda usuário sem código caçar um — pesquisa de checkout da Baymard). Guia detalhado dividido em 8 arquivos em `docs/skill-guides/mobile-paywall-checkout/`.
**Quando ativar:** desenhar ou revisar tela de assinatura/seleção de plano; decidir Play Billing vs. Stripe vs. Mercado Pago; posicionar o campo de cupão; especificar estados de pagamento e recuperação de 3DS.
**Diferente de:** a skill 60 é dona do modelo de dados de backend (tabela `Subscription` unificada, RTDN, reconciliação) — a 63 consome isso pra decisão de UI, nunca duplica o schema. `skills/02-ui-ux-design/references/marketing-surfaces.md` cobre a página de preço *pública*, sem transação real; a 63 é o paywall in-app com `PaymentSheet`/purchase sheet de verdade por trás.
**Takeaway:** **código promocional do Google Play e cupão de comerciante não são a mesma coisa** — promo code do Play concede teste grátis, não um motor genérico de "25% off"; mostrar "25% aplicado" na UI quando o purchase sheet vai cobrar o preço cheio quebra confiança e viola a exigência de consistência de preço do Play.

#### Skill 64 — Scroll Storytelling

[Omitted long context line]
**Quando ativar:** landing page ou site inteiro estruturado como jornada de scroll (não só uma seção com fade-in); pedido no estilo "Apple product page" ou site de referência citado desse tipo; vídeo/sequência de imagem que precisa scrubar conforme o usuário rola; pinning de seção, pan horizontal, ou "mundo" contínuo que a rolagem atravessa.
**Diferente de:** a skill 12 (motion-design) é dona da mecânica genérica de easing/spring e dos motion tokens — a skill 64 os consome pro timing de UI, mas decide a arquitetura completa da página (estrutura, jornada narrativa, variedade de device por seção, gramática de página). A skill 02 (ui-ux-design) decide paleta/tipografia/âncora estética do zero — a skill 64 consome essa decisão pra escolher o "world" (ver `references/worlds.md`).
**Takeaway:** **cinco seções que se comportam idêntico são uma seção mostrada cinco vezes** — uma página inteira construída de um único device repetido (mesmo diorama de argila, mesmo texto centralizado, mesmo contador `01/06`, mesmo "scroll to explore" piscando) se reconhece de longe; variedade por beat da jornada é o produto de fato, garantida por uma entrevista obrigatória de 8 perguntas antes de gerar qualquer coisa.

#### Skill 65 — Using Git Worktrees

[Omitted long context line]
**Quando ativar:** antes de executar um plano de implementação que pode conflitar com o branch atual; usuário pede trabalho paralelo sem afetar o workspace corrente; incerteza se a sessão já está dentro de um worktree isolado (risco de aninhar worktree dentro de worktree).
**Diferente de:** `commands/worktree.md` continua sendo o dispatcher enxuto (cria worktree, copia `.env*`, roda install/lint em background) — a skill 65 é o protocolo completo, acionado quando as garantias extras importam: detecção de isolamento com guard de submodule, preferência por ferramenta nativa (`EnterWorktree`/`ExitWorktree` antes de `git worktree add` cru), e baseline de testes obrigatória antes de liberar a task.
**Takeaway:** **uma baseline suja torna toda falha futura ambígua** — pular o passo de baseline de testes significa que um bug introduzido pela task não pode ser distinguido de um que já existia; detectar isolamento existente primeiro (via `git rev-parse --git-dir` vs `--git-common-dir`, protegido contra falso positivo dentro de submodules) evita aninhar um worktree dentro de outro por engano.

#### Skill 66 — Game Architecture Design

[Omitted long context line]
**Quando ativar:** desenhar um sistema de jogo novo (combate, skill, IA, narrativa, UI, geração procedural) antes de escrever código de engine; decidir entre paradigmas de arquitetura (entidade rica vs data-driven vs protótipo descartável); revisar criticamente um GDD, mecânica, nível ou economia em busca do que está fraco, arriscado ou insuficientemente validado; modelar números de balance (dano, custo, drop rate, curva de XP) que precisam ser defensáveis, não chutados.
**Diferente de:** a skill 67 (game-engine-development) é dona do código real Unity C#/Unreal C++ — a skill 66 decide *o que* construir e *por quê*, entregando a decisão arquitetural e os números; nunca gera código de engine sozinha.
**Takeaway:** **as duas fontes investigadas pra game dev tinham perfis de licença opostos** — a fonte de design/arquitetura tinha profundidade real (17-26 references por skill) mas sem licença declarada, então o conteúdo desta skill é escrita totalmente original inspirada pelo *gap*, não texto portado; a fonte de código de engine (skill 67) era MIT, então essa sim portou código real com atribuição. Mesma investigação, duas regras de absorção diferentes dependendo do que cada fonte realmente permitia.

#### Skill 67 — Game Engine Development

[Omitted long context line]
**Quando ativar:** implementar um sistema de jogo em Unity (C#) — MonoBehaviour, ScriptableObject, pooling, gerenciamento de estado; implementar em Unreal Engine (C++) — Actor, Component, UPROPERTY/UFUNCTION exposto a Blueprint; aplicar um padrão de design de jogo específico (ECS, state machine, object pooling, spatial partitioning); otimizar performance (draw calls, pressão de garbage collection, LOD/culling, profiling); implementar networking multiplayer (arquitetura servidor-autoritativo, predição de cliente, lag compensation).
**Diferente de:** a skill 66 (game-architecture-design) é dona da decisão de design e dos números de balance — a skill 67 só constrói; não decide o que construir nem por quê.
**Takeaway:** **não finja cobertura que a fonte não tem** — a fonte MIT de onde esta skill porta código ([Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills)) cobre Unity e Unreal com código de produção real, mas tem zero conteúdo de Godot em qualquer lugar do repositório; a skill diz isso explicitamente numa seção "Cobertura de Godot" em vez de responder pergunta de Godot silenciosamente com chute com sabor de Unity.

#### Skill 68 — Character Animation 3D

[Omitted long context line]
**Quando ativar:** riggar um personagem 3D humanoide via AccuRIG e normalizá-lo no Blender; fazer retargeting de movimento de qualquer fonte (mocap, text-to-motion, vídeo) sobre um rig certificado; decidir qual tecnologia de IA de motion serve pra um caso (text-to-motion vs video-to-motion vs pose estimation vs ferramenta de retargeting); rodar Blender headless (`--background --python`) como parte de um pipeline de build; escrever ou debugar a matemática de retargeting via delta de quaternion relativo à rest pose.
**Diferente de:** a skill 67 (game-engine-development) é dona do código de engine runtime (Unity C#/Unreal C++) — a skill 68 fica a montante disso, produzindo o `character.glb`/`animation.glb` certificados que a engine consome; nunca escreve código de gameplay sozinha. A skill 69 (character-pipeline-2d) assume que a saída 3D desta skill já existe e foca em derivar assets 2D a partir dela.
**Takeaway:** **o AI Deep Search do próprio AccuRIG não é um gerador text-to-motion** — é busca semântica sobre uma biblioteca já existente de 4500+ movimentos curados, ferramenta fundamentalmente diferente de um modelo de síntese como SayMotion ou MDM que inventa uma sequência nova a partir de um prompt; confundir os dois leva a esperar geração de ação inédita de uma feature de busca que só pode devolver o que alguém já capturou.

#### Skill 69 — Character Pipeline 2D

[Omitted long context line]
**Quando ativar:** escolher entre as cinco estratégias de produção 2D pra um projeto; projetar ou validar um `MotionPlan.json` (intenção/timing/fases/contatos/eventos, nunca rotação de bone crua); derivar sprites/atlases de um rig 3D já existente via render ortográfico; gerar arte 2D de personagem nativamente com Qwen-Image-Layered/Qwen-Image-Edit e tratar occlusion completion; configurar ComfyUI como servidor de inferência headless, ou escolher ferramenta de rig 2D esqueletal (Blender+Grease Pencil vs Spine vs LoongBones); desenhar o CLI `assetctl` ou a camada de CI/testes do pipeline de asset.
**Diferente de:** a skill 68 (character-animation-3d) é dona da matemática AccuRIG→Blender→retargeting que produz o GLB certificado que esta skill consome — a 69 nunca duplica isso; ela parte de um asset 3D já certificado (ou arte 2D nativa) e foca no `MotionPlan` como contrato do LLM-diretor, na derivação 2D e na orquestração/teste do pipeline.
**Takeaway:** **nunca pedir rotação de bone a uma LLM** — tirar Euler angles ou quaternions de um modelo de linguagem é um erro de arquitetura esperando pra acontecer; o único trabalho da LLM é emitir um `MotionPlan.json` validado por schema (intenção, fases, contatos, eventos), e um `MotionResolver` determinístico — não o modelo — transforma isso em transforms reais, o que também fecha caminhos de prompt injection que output executável deixaria aberto.

---

## 6. Subagents (16)

Subagents são especialistas dispatcháveis via `Task` tool. Diferente de skills (que são markdown carregado pelo orchestrator), subagents rodam em sessão isolada com contexto próprio. Ideal para tarefas com escopo bem definido que se beneficiam de fresh context.

### Core (5)

#### `code-reviewer`
Senior code reviewer focado em clean code, DRY, SOLID, correctness, performance e security. **Quando usar:** PR review, feature concluída, qualquer código antes de merge. **Tools:** Read, Grep, Glob, Bash.

#### `security-auditor`
Auditor de segurança especializado em web. Pensa como atacante, reporta como defensor. **Quando usar:** auth flows, input handling, deps, CORS, headers, pré-deploy. **Tools:** Read, Grep, Glob, Bash.

#### `test-engineer`
QA "Prove-It". Happy path, error, edge case, regression, performance. **Quando usar:** escrever testes, preencher cobertura, validar regressões. **Tools:** Read, Grep, Glob, Bash, Edit, Write.

#### `orchestrator`
Tech Lead. Classifica task, define pipeline mínimo, coordena skills. **Quando usar:** task complexa, várias skills candidatas. **Tools:** todas.

#### `debugger`
Root cause sistemático: hipótese → evidência → fix mínimo. **Evidence Ledger** explícito + **anti-rationalization table** com 10 falácias comuns. Heurísticas por classe de bug (race, leak, perf, auth, off-by-one, encoding). **Quando usar:** bug, comportamento inesperado, falha que não consegue explicar. **Tools:** Read, Grep, Glob, Bash, Edit.

### Detective Spec (4) — fases do `/detective-spec`

#### `detective-contracts`
Fase 2: extrai contratos de módulo (API pública, dependências, invariantes, consumidores) de código legado. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-business-rules`
Fase 3: extrai regras de negócio escondidas em validações, constantes mágicas, transições de estado, mensagens de erro, testes. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-flows`
Fase 4: reconstrói fluxos end-to-end (entry → side effects) com edge cases, estado mutado, falhas. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-adrs`
Fase 5: infere ADRs retroativos + sintetiza overview + traceability. Read-only. **Tools:** Read, Grep, Glob, Bash.

### Static Analysis (5) — pipeline da skill 34

#### `semgrep-scanner`
Repo multi-linguagem: scans Semgrep em paralelo por categoria de linguagem, agrega SARIF. **Tools:** Read, Grep, Glob, Bash.

#### `semgrep-triager`
Batch >20 findings: classifica TP/FP/needs-investigation lendo contexto fonte, propõe fixes. **Approval gate obrigatório** antes de aplicar `nosemgrep:` no código. **Tools:** Read, Grep, Glob, Write.

#### `codeql-runner`
Bug precisa taint tracking interprocedural: orquestra build de database CodeQL + queries. Cache por commit hash em `.detective-scan/codeql-db/<lang>/`. **Tools:** Read, Grep, Glob, Bash.

#### `sarif-parsing`
Múltiplas fontes SARIF: parse, dedup, agrega em relatório único. Diff vs baseline. Extrai tool name de `runs[].tool.driver.name`, não de `input_filename`. **Tools:** Read, Glob, Bash, Write.

#### `variant-analysis`
Bug confirmado → caça variantes do mesmo padrão, gera custom rule reusável para CI. **Approval gate obrigatório** antes de `git add tools/semgrep/<rule>.yml`. **Tools:** Read, Grep, Glob, Bash, Write.

### Conteúdo (1)

#### `anti-ai-writing`
Revisa prosa (docs, PRDs, copy, changelogs, comentários de código) procurando os 29 padrões de AI-generated writing. Espelho da skill `41-blog-publisher` / `/humanize`. Read + Write para marcar inline. **Tools:** Read, Grep, Glob, Write.

### Qualidade (1)

#### `silent-failure-hunter`
Agente review-only com tolerância zero a falha silenciosa: `catch{}` vazio, erro convertido em `null`/`[]` sem contexto, fallback `.catch(() => [])` que esconde a falha, stack trace perdido, rethrow genérico, async/rollback faltando. Lente estreita e profunda que `code-reviewer` e `security-auditor` não miram específico. Reporta findings (local/severidade/impacto/fix); não corrige. Adaptado de [affaan-m/ECC](https://github.com/affaan-m/ECC). **Tools:** Read, Grep, Glob, Bash.

---

## 7. Policies (51)

Policies são regras compartilhadas que governam comportamento das skills. Toda skill cita as policies que segue. **Top 5 mais importantes:**

#### `tool-safety.md`
Tools com mínimo privilégio. Classes de risco (baixo/médio/alto). Aprovação obrigatória para alto risco. **Por que importa:** agente rodando comando destrutivo sem confirmar = problema.

#### `vertical-slices.md`
Toda feature multi-camada entregue como vertical slice (DB+back+front+e2e), nunca layered. **Por que importa:** layered slicing paraleliza tarefas mas adia integração.

#### `quality-gates.md`
Critical/High aberto = no merge. Reviewer + QA + Security são gates, não sugestões. **Por que importa:** gate enforçado é o que diferencia código pro de código indie.

#### `model-routing.md`
Haiku para boilerplate, Sonnet para implementação, Opus para arquitetura. Substitui o que seria a skill 16 (llm-selector) — escolha de modelo vive como policy, não como skill separada. **Por que importa:** Opus para gerar `import x from 'y'` queima dinheiro.

#### `writing-clarity.md`
10 regras de Strunk adaptadas para output de agente. Voz ativa, sem palavras-tampão, frases curtas. Aplica a commits, error messages, handoffs, slash command output, docs. **Por que importa:** prosa LLM-style fluffy queima tokens e tempo de leitura.

### Demais policies

| Policy | O que faz |
|---|---|
| `anti-rationalization.md` | Combate vieses cognitivos do agente ("isso parece ok") |
| `code-exploration.md` | Como explorar codebase de forma eficiente em tokens |
| `confusion-management.md` | STOP-NAME-OPTIONS-WAIT quando requisito é ambíguo |
| `context-engineering.md` | Hierarquia de 5 níveis + 3 trust levels para gerenciar contexto |
| `cost-optimization.md` | Práticas para reduzir custo de API (+ tabela de shell commands comprimidos) |
| `dense-output-mode.md` | Densidade da resposta proporcional à pergunta. Modos DENSE/NORMAL/EXPANDED + 7 flags inline + off-switch |
| `detective-write-guardrails.md` | Hard guardrail: writes só em `.detective/` e `_detective_sdd/` |
| `documentation-i18n.md` | Convenções para docs multi-idioma |
| `evals.md` | Framework de avaliação para skills, prompts, tools |
| `execution.md` | Princípios de execução: agir primeiro com default seguro |
| `handoffs.md` | Formato consistente de handoff entre skills |
| `hooks.md` | Lifecycle hooks em settings.json |
| `iterative-retrieval.md` | Retrieval progressivo em 3 rodadas para subagents |
| `persistence.md` | Quando e como persistir contexto |
| `search-first.md` | Pesquisa obrigatória antes de implementar |
| `source-driven.md` | Toda afirmação ancorada em fonte (file:line, ADR, commit) |
| `stack-flexibility.md` | Skills não acoplam a vendor único |
| `token-efficiency.md` | Compressão de output para economizar tokens |

---

## 8. Plugin: como o kit é distribuído

### Manifesto: `.claude-plugin/plugin.json`

Schema oficial do Claude Code. Lista:
- **68 skills** em `skills/NN-nome/SKILL.md`
- **16 agents** em `.claude/agents/<name>.md`
- **23 commands** em `.claude/commands/<name>.md` (cc-format) + `commands/<name>.md` (kit-format)
- **hooks** em `hooks/hooks.json` (lifecycle: SessionStart, PreToolUse, PostToolUse, Stop)

### Modos de instalação (3 opções)

#### Modo 1 — Plugin global (Claude Code)

```bash
claude plugin install https://github.com/felvieira/claude-skills-fv
```

Instala globalmente: 68 skills, hooks, 23 commands. Funciona em qualquer projeto sem config adicional. **Não inclui:** policies, MCP server, templates, docs (esses ficam no `.bot/`).

#### Modo 2 — Kit completo por repo (`/devkit-install-fv`)

Com plugin instalado, dentro do repo alvo:

```
/devkit-install-fv
```

Instala `.bot/` completo: MCP server (37 tools), policies, templates, docs, hooks, learned-skills, configs multi-plataforma (Cursor, Windsurf, Copilot, Gemini CLI, OpenCode, Antigravity).

#### Modo 3 — Bash direto

```bash
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh /caminho/projeto
```

Suporta perfis não-interativos: `--profile lean`, `--no-input`, `--yes`.

### Comparativo dos modos

| O que entra | Plugin global | `/devkit-install-fv` | Bash direto |
|---|:---:|:---:|:---:|
| 68 skills | ✓ | ✓ | ✓ |
| Hooks (lifecycle) | ✓ | ✓ | ✓ |
| Slash commands | ✓ | ✓ | ✓ |
| Policies | ✗ | ✓ | ✓ |
| MCP server (37 tools) | ✗ | ✓ | ✓ |
| Templates de handoff | ✗ | ✓ | ✓ |
| Docs + repo-audit | ✗ | ✓ | ✓ |
| Configs multi-plataforma | ✗ | ✓ | ✓ |
| Learned skills por projeto | ✗ | ✓ | ✓ |

### Plataformas compatíveis

| Plataforma | Skills | Hooks | MCP | Slash Commands |
|---|:---:|:---:|:---:|:---:|
| **Claude Code** | ✓ nativo | ✓ | ✓ | ✓ |
| **Cursor** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **Windsurf** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **GitHub Copilot** | ✓ via `.bot/` | ✗ | ✗ | ✗ |
| **Gemini CLI** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **OpenCode** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **Antigravity** | ✓ via `.bot/` | ✗ | ✓ | ✗ |

---

## 9. MCP server: 37 tools por trás dos panos

O kit inclui um **MCP server próprio** (`mcp-server/src/index.ts`) com **37 tools** expostas para qualquer cliente MCP (Cursor, Windsurf, Gemini CLI, etc).

Tools são ortogonais às skills — implementam capacidades de baixo nível que as skills consomem:

- **Skill loading:** `devkit_load_skill`, `devkit_list_skills`
- **Pipeline:** `devkit_classify_task`, `devkit_get_pipeline`
- **Context management:** `devkit_context_pack`, `devkit_working_set`, `devkit_diff_brief`
- **Cost tracking:** `devkit_track_cost`, `devkit_get_cost_summary`
- **Templates:** `devkit_get_template`
- **Learned skills:** `devkit_save_learned_skill`, `devkit_get_learned_skills`
- **Project intel:** auditoria, asset inventory, tech stack detection
- **Suggestions:** `devkit_get_suggestions` (próxima ação mais impactante)
- **Output compression:** `devkit_compress_output` (reduz noise de logs/stack traces)

### Quando o MCP server é útil

- Você quer usar o kit em **outro IDE** que não Claude Code (Cursor, Windsurf, Gemini CLI)
- Você quer **integrar o kit a um pipeline próprio** (CI, custom CLI)
- Você quer **rastreabilidade de custo** estruturada por sessão/skill/modelo

### Quando NÃO precisa

- Você só usa Claude Code com plugin global (skills carregam direto, sem MCP)
- Bug fix simples — overhead não compensa

---

## 10. Quando usar o quê: árvore de decisão

```
o que você quer fazer?
│
├── Adicionar feature nova
│   ├── ideia vaga, briefing curto                 → /grill-me primeiro
│   ├── feature pequena/média, spec já clara       → /spec → /pipeline (clássico)
│   ├── feature grande/nova/ambígua, paralelizar   → /pipeline-discovery
│   ├── PRD pronto em conversa, falta tracker      → /to-prd
│   ├── PRD publicado, falta quebrar em issues     → /to-issues
│   ├── spec pronta, single-layer (só front/back)  → /build → /test
│   └── várias features overnight                  → /loop --worktree --parallel N
│
├── Corrigir bug
│   ├── reproduzível, fix óbvio    → /build (com teste de regressão)
│   ├── não consegue explicar      → debugger subagent
│   └── achou padrão recorrente    → variant-analysis subagent
│
├── Refatorar
│   ├── código complicado          → /simplify
│   ├── identificar shallow modules → skill 38 (Architecture Deepener)
│   └── arquitetura antiga         → /detective-spec primeiro, depois skill 23
│
├── Validar antes de release
│   ├── review final               → /review
│   ├── auditoria boas práticas    → /best
│   ├── security scan automatizado → skill 34 (Static Analysis)
│   └── auditoria do repo          → /audit-repo
│
├── Trabalhar com legado
│   ├── extrair spec               → /detective-spec
│   ├── identificar refactors      → skill 38 (Architecture Deepener)
│   └── migration grande           → skill 23 (Migration & Refactor)
│
├── Gerar assets visuais
│   ├── hero, mascote, illustration → skill 17 (fal.ai)
│   ├── favicon/PWA/OG da landing   → skill 36 (Web Asset Generator)
│   └── inventariar o que já tem    → /inventory-assets
│
├── Setup inicial em um projeto
│   ├── primeiro contato            → /audit-repo
│   ├── instalar kit no .bot/       → /devkit-install-fv
│   └── gerar CLAUDE.md             → skill 28
│
├── Manutenção do próprio kit
│   ├── adicionar skill nova        → skill 35 (Skill Author)
│   ├── auditar qualidade das skills → skill 35 com scorecard
│   └── revisar policies antigas    → skill 35 + revisão manual
│
└── Deploy / release
    ├── release patch/minor         → /ship
    ├── changelog ausente           → skill 24 (Release Manager)
    └── plano de rollback           → skill 20 (Observability) + 7 (Deploy)
```

---

## 11. Inspirações e atribuições

O kit não nasceu do zero. Foi composto a partir de:

### Adaptações diretas

- **[mattpocock/skills](https://github.com/mattpocock/skills)** ([AI Hero post](https://www.aihero.dev/5-agent-skills-i-use-every-day)) — `/grill-me`, `/to-prd`, `/to-issues`, skill 37 (TDD Engineer), skill 38 (Architecture Deepener). Adaptados ao kit (frontmatter, integração com policies, gates de aprovação).
- **[Reversa](https://github.com/sandeco/reversa)** — skill 33 (Detective Spec). Adaptado para integrar com Graphify + repo-audit + memória persistente.
- **Strunk & White — Elements of Style** — `policies/writing-clarity.md`. 10 regras adaptadas para output de agente.

### Inspirações conceituais

- **[Anthropic skills ecosystem](https://docs.claude.com/en/docs/claude-code/skills)** — formato de SKILL.md, frontmatter, descrição com triggers.
- **[Cursor / Windsurf rules pattern](https://docs.cursor.com/context/rules)** — convenções de regras compartilhadas.
- **[OpenAI gpt-5.4 prompting guide](https://platform.openai.com/docs/guides/prompt-engineering)** — patterns para Codex/GPT integration.

### Filosofia

- **Vertical slicing** — clássico XP/Lean (Kent Beck, "Tracer Bullets" do Hunt & Thomas).
- **Deep modules** — John Ousterhout, *A Philosophy of Software Design*.
- **Anti-rationalization tables** — viés cognitivo aplicado a debugging (Daniel Kahneman style).

---

## Próximos passos

- Quer testar? Instale: `claude plugin install https://github.com/felvieira/claude-skills-fv`
- Quer estender? Use skill 35 (Skill Author) para adicionar skill nova respeitando o template.
- Quer entender mais? Leia `AGENTS.md` (regras universais) e `policies/` (regras compartilhadas).
- Encontrou bug? Abra issue: https://github.com/felvieira/claude-skills-fv/issues

**Última auditoria de consistência:** `evals/skill-audit-2026-05-03.md` (22 PASS, 6 NEEDS-REVIEW, 4 NEEDS-REWRITE).
