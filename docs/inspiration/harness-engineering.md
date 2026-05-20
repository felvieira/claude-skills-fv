# Harness Engineering — Inspirações e precedentes

> Documento de referência cruzada com fontes externas que influenciaram o design do kit em v2.5.0+.

## Fonte primária

**Birgitta Böckeler**, *"Harness engineering for coding agent users"*, Thoughtworks (2026-04-02).
URL: https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html

Conceitos absorvidos:

| Conceito | Onde no kit | Versão |
|---|---|---|
| Agent = Model + Harness | `GLOBAL.md`, `policies/harness-categories.md` | v2.5.0 |
| Guides (feedforward) vs Sensors (feedback) | `policies/harness-categories.md` | v2.5.0 |
| Computational vs Inferential controls | `policies/harness-categories.md` tabela mestra | v2.5.0 |
| Steering loop | `/consolidate-memory`, learned-skills | pre-existente |
| Keep quality left | `policies/quality-gates.md` (atualizado) | v2.5.0 |
| Categorias: Maintainability / Architecture Fitness / Behaviour | `policies/harness-categories.md` | v2.5.0 |
| Harnessability | skill 18 (repo-auditor) score | v2.5.0 |
| Ambient affordances | skill 18 critérios | v2.5.0 |
| Ashby's Law / variety reduction | `policies/programs-schema.md` (atualizado) | v2.5.0 |
| Harness templates por topologia | `templates/harness/` | v2.5.0 |
| Drift detection | `/drift-scan` command | v2.5.0 |

## Outras inspirações citadas no artigo

### OpenAI — layered architecture com custom linters

O artigo cita o post da equipe OpenAI: *"layered architecture enforced by custom linters and structural tests, and recurring 'garbage collection' that scans for drift and has agents suggest fixes."*

**Quote-chave:** *"Our most difficult challenges now center on designing environments, feedback loops, and control systems."*

**Aplicação no kit:**
- Layered architecture → policies + skills numeradas por papel
- Custom linters → hooks com mensagens de auto-correção (`agent-dispatch-validator`)
- Garbage collection → `/drift-scan` (v2.5.0+), `/consolidate-memory`

### Stripe — minions com pre-push hooks heurísticos

Cita o write-up dos minions: *"pre-push hooks that run relevant linters based on a heuristic"* + *"shift feedback left"* + *"blueprints"* que integram sensors em workflows de agente.

**Aplicação no kit:**
- Pre-push heurísticos → hooks PreToolUse com matchers
- Shift feedback left → keep quality left princípio
- Blueprints → `programs/*.yml` + `templates/harness/*`

### Mutation testing e structural testing — resurgence

Ferramentas de testing que historicamente foram subutilizadas estão tendo um renascimento como sensors:
- Mutation testing (stryker, pitest, mutmut)
- Structural tests (ArchUnit, dep-cruiser)

**Aplicação no kit:**
- Skill 37 (TDD engineer) — pattern de approved fixtures
- `/run-fitness` v2.5.1 — runner de fitness functions estruturais
- `policies/quality-gates.md` — menciona mutation testing como gate opcional

### LSPs em coding agents

Cita aumento de chatter sobre integração de Language Servers e code intelligence em coding agents como **computational feedforward**.

**Aplicação no kit:**
- `policies/code-exploration.md` — preferir code intelligence (LSP, graphify, semantic search) sobre Grep/Read bruto
- Hook `pre-tool-enforcer` — sugere code intel tools antes de Grep

### "Janitor armies" e "garbage collection" de drift

Padrão emergente: agentes rodando contra todo o codebase periodicamente, não só nos diffs. Drift detection como categoria separada de change detection.

**Aplicação no kit:**
- `/drift-scan` v2.5.0+ — runner periódico de drift sensors
- Sensors cobertos: dead-code, dependency staleness, coverage quality, doc-vs-code drift

## Citações curtas pra apoiar decisões de design

### Defendendo programs/templates (variety reduction)

> "An LLM-based coding agent can produce almost anything, but committing to a topology narrows that space, making a comprehensive harness more achievable. Defining topologies is a variety-reduction move."
> — Birgitta Böckeler

### Defendendo `agent-dispatch-validator` (positive prompt injection)

> "Particularly powerful when they produce signals that are optimised for LLM consumption, e.g. custom linter messages that include instructions for the self-correction — a positive kind of prompt injection."
> — Birgitta Böckeler

### Defendendo `pre-execution-gate` ENRICH/GUIDED ENRICH

> "Correctness is outside any sensor's remit if the human didn't clearly specify what they wanted in the first place."
> — Birgitta Böckeler

### Defendendo harness coverage no `/savings`

> "We need a way to evaluate harness coverage and quality similar to what code coverage and mutation testing do for tests."
> — Birgitta Böckeler (pergunta aberta — kit responde via `/savings --coverage` v2.6.0)

### Defendendo presença humana no review (não substituição)

> "Harnesses are an attempt to externalise and make explicit what human developer experience brings to the table, but it can only go so far. (...) A good harness should not necessarily aim to fully eliminate human input, but to direct it to where our input is most important."
> — Birgitta Böckeler

## Vocabulário canônico absorvido

Estas palavras agora têm significado **preciso** no kit (não mais soltas):

| Palavra | Significado canônico |
|---|---|
| Harness | Tudo no agente exceto o modelo (system prompt, hooks, skills, policies, sensors) |
| Guide | Feedforward control. Antecipa e steera antes da ação. |
| Sensor | Feedback control. Observa depois e auto-corrige. |
| Computational | Determinístico, rápido, barato. CPU. |
| Inferential | LLM-based, mais lento, mais caro. GPU/NPU. |
| Regulator | O kit inteiro como sistema cibernético que governa o LLM |
| Variety | Espaço de outputs possíveis. LLM tem alta; topologia reduz. |
| Harnessability | Quão amenable um projeto é a ser regulado |
| Ambient affordance | Propriedade do ambiente que torna o agente mais governável (types, boundaries, frameworks) |
| Drift | Degradação gradual fora do change lifecycle |
| Fitness function | Sensor que regula uma característica arquitetural não-funcional |
| Topology | Tipo recorrente de serviço (CRUD API, event processor, dashboard) |

## Outras fontes complementares

- W. Ross Ashby, *"An Introduction to Cybernetics"* (1956) — Law of Requisite Variety
- Neal Ford, Rebecca Parsons, Patrick Kua, *"Building Evolutionary Architectures"* — Fitness Functions
- Capers Jones, *"Applied Software Measurement"* — Cost of Defect
- IBM SystemSciences research — cost of defect by stage

## Aplicação em CHANGELOG

Releases v2.5.0+ devem referenciar este arquivo + a Birgitta no CHANGELOG quando absorverem mais conceitos. Isso preserva audit trail intelectual.
