# Harness Categories — Vocabulário Canônico

> **Inspiração:** Birgitta Böckeler, *"Harness engineering for coding agent users"* (Thoughtworks, 2026-04-02).
> **Status:** mandatória. Esta policy fornece o vocabulário canônico para classificar guides (feedforward) e sensors (feedback) em 3 categorias de regulação.

## Mental Model

O kit inteiro é um **regulator** (cibernética) que governa o LLM via:

- **Guides (feedforward)** — antecipam comportamento, steeram antes da ação. Aumentam probabilidade de acerto na primeira tentativa.
- **Sensors (feedback)** — observam depois da ação, alimentam o loop de auto-correção. Especialmente potentes quando emitem mensagens **otimizadas pra consumo do LLM** (instruções de fix, não só erros).

Sem feedforward, agente vai cego. Sem feedback, repete os mesmos erros. **Kit precisa dos dois.**

## Execução

| Tipo | Características | Quando usar |
|---|---|---|
| **Computational** | Determinístico, rápido (ms-s), barato | Toda mudança / pre-commit. Não falha por não-determinismo. |
| **Inferential** | LLM-based, mais lento (s-min), mais caro | Validação semântica, judgment calls. Não roda em todo commit. |

## As 3 categorias de regulação

### 1. Maintainability Harness

Regula **qualidade interna do código**. Quase tudo que o kit já tinha.

| Direção | Computational | Inferential |
|---|---|---|
| **Feedforward** | `policies/code-exploration.md`, `policies/anti-ai-writing.md`, `templates/*.md`, hooks `pre-tool-enforcer`, `model-routing-hook` | Skills 04/03 (frontend/backend), `AGENTS.md`, `GLOBAL.md`, `policies/skills-vs-agents.md` |
| **Feedback** | `check-consistency.mjs`, `check-hook-scripts-exist.mjs`, `schema-validator.mjs`, hook `post-tool-verifier`, hook `ai-writing-detector` | subagent `code-reviewer`, `anti-ai-writing`, skill 11 (reviewer) |

**Falhas que captura:** duplicação, complexidade, naming inconsistente, file too long, AI-flavored prose, missing tests.

### 2. Architecture Fitness Harness

Regula **características arquiteturais não-funcionais**. Equivalente a [Fitness Functions](https://www.thoughtworks.com/insights/articles/fitness-function-driven-development).

| Direção | Computational | Inferential |
|---|---|---|
| **Feedforward** | `policies/context-engineering.md`, `policies/programs-schema.md`, `templates/harness/*` (v2.5.0+), specs em `docs/specs/`, ADRs | Skills 38 (architecture-deepener), 20 (observability), 22 (a11y), 14 (SEO), `programs/refactor-safely.yml` |
| **Feedback** | dependency cruiser, archunit-style structural tests, performance budgets, lighthouse scores, mutation testing | subagent `security-auditor`, skill 38 architecture fitness review, `/drift-scan` (v2.5.0+) |

**Falhas que captura:** module boundary violations, performance regression, observabilidade insuficiente, a11y drift, SEO drift, security drift.

**O que ainda falta no kit:** declarar fitness functions em YAML rodáveis pelo `/run-program`. Roadmap v2.5.1.

### 3. Behaviour Harness

Regula **comportamento funcional** da aplicação. **A mais difícil.** A Birgitta nomeia explicitamente como problema aberto da indústria.

| Direção | Computational | Inferential |
|---|---|---|
| **Feedforward** | Specs em `docs/specs/`, PRDs, `/spec`, `/grill-me`, acceptance criteria (DADO/QUANDO/ENTAO) | Skill 01 (PO), `/checklist`, `/analyze`, `/clarify` |
| **Feedback** | Test suite (vitest, jest, playwright), mutation testing, approved-fixtures pattern (v2.5.0+), contract tests | Skill 05 (QA), 37 (TDD), subagent `test-engineer`, manual testing, `/swarm` Phase 3 |

**Falhas que captura:** spec não implementada, regressão funcional, edge case esquecido, contrato quebrado.

**O que ainda falta no kit (e na indústria):** confiança nos testes AI-gerados não é alta o suficiente pra eliminar revisão humana. **Aqui o humano ainda é fundamental.** Approved fixtures (skill 37 v2.5.0+) é uma das poucas técnicas que aumenta isso de verdade.

## Tabela mestra — sensors do kit categorizados

| Sensor | Categoria | Exec | Quando dispara | Output |
|---|---|---|---|---|
| `pre-tool-enforcer` | Maintainability | Comp | PreToolUse | Warning sobre repetição de read/search |
| `agent-dispatch-validator` | Maintainability | Comp | PreToolUse | Bloqueia skill-as-subagent + fix sugerido |
| `model-routing-hook` | Maintainability | Comp | PreToolUse | Sugere model adequado pra fase |
| `pre-execution-gate` | Behaviour | Comp+Inf | UserPromptSubmit | ENRICH / GUIDED ENRICH p/ prompt vago |
| `post-tool-verifier` | Maintainability | Comp | PostToolUse | Sugere learned-skill se debugging pattern |
| `ai-writing-detector` | Maintainability | Comp | PostToolUse | Flagga padrões de AI-flavored writing |
| `constitution-watcher` | Architecture | Comp | PostToolUse | Avisa drift de constitution |
| `context-guard-stop` | Maintainability | Comp | Stop | Sugere /compact se contexto alto |
| `stop-savings-summary` | Meta | Comp | Stop | Mostra savings ao final |
| Subagent `code-reviewer` | Maintainability | Inf | sob demanda | Review com severities |
| Subagent `security-auditor` | Architecture | Inf | sob demanda | Audit OWASP + CVE |
| Subagent `test-engineer` | Behaviour | Inf | sob demanda | Geração de testes |
| Subagent `anti-ai-writing` | Maintainability | Inf | sob demanda | Flagga 29 patterns |
| `check-consistency.mjs` | Maintainability | Comp | CI | Doc vs realidade |
| `schema-validator.mjs` | Maintainability | Comp | CI | Hook output schema |

## Princípios

### Princípio 1 — Keep quality left (Birgitta)

> Quanto mais cedo pegar, mais barato fixar. Mover sensors pra esquerda na timeline do change lifecycle (pre-commit → pipeline → continuous drift).

Implicação prática:
- Sensors **computacionais baratos** rodam toda mudança (PreToolUse + PostToolUse hooks)
- Sensors **inferenciais caros** rodam menos vezes (sob demanda, pipeline pós-integração, `/swarm` Phase 3)
- Sensors **de drift** rodam continuamente fora do change lifecycle (`/drift-scan` agendado)

### Princípio 2 — Feedback com instrução de auto-correção

Sensor que só diz "tem um problema" é menos útil que sensor que diz "tem um problema **e aqui está o fix**". O `agent-dispatch-validator` (v2.2.1) é o padrão canônico: bloqueia + retorna mensagem acionável + código de correção.

Aplicar isso a:
- Custom linter messages
- Erro do `pre-execution-gate` (já faz parcialmente)
- Erros de schema (já corrigido em v2.4.1)
- Novos sensors a serem criados

### Princípio 3 — Variety reduction (Ashby's Law)

Um regulator precisa de ao menos a mesma variedade que o sistema que governa. **LLM tem variedade quase infinita** — produz qualquer coisa. Reduzir variedade do espaço gerado (via topologias, templates, programs) torna o harness mais cobrindo possível.

Implicação: `programs/`, `templates/harness/` (v2.5.0+) e harness templates por topologia são **defesas estruturais**, não overhead.

### Princípio 4 — Harness coherence

Guides e sensors **não podem contradizer entre si**. Se `policies/X.md` diz "faça A" mas o hook Y bloqueia A, o agente fica confuso e gasta tokens reconciliando.

Eval suite (v2.5.0+ roadmap): `scripts/check-harness-coherence.mjs` que escaneia policies vs hooks e flagga contradições.

### Princípio 5 — Reduce review toil, don't replace review

Harness não substitui revisão humana — direciona ela. Boa harness libera humano de "encontrar bug óbvio" pra focar em "decisão arquitetural ambígua" e "alinhamento com intenção do negócio".

## Harnessability score

Avaliar quão "harness-friendly" um projeto é. Influencia confiança do kit nesse projeto. Critérios (mapeados pelo `skill 18 repo-auditor` em v2.5.0+):

| Sinal | Pontos |
|---|---|
| Linguagem com static typing forte (TS strict, Rust, Go, Java) | +20 |
| Linter configurado (eslint, ruff, clippy) | +15 |
| Module boundaries claros (DDD, hexagonal, feature folders) | +15 |
| Testes existentes com cobertura > 60% | +15 |
| CI configurado | +10 |
| `AGENTS.md` ou `CLAUDE.md` presente | +10 |
| `docs/repo-audit/current.md` recente (<30d) | +5 |
| Constitution definida em `memory/constitution.md` | +5 |
| Dependency scanner (dependabot, renovate) | +5 |

**Score 0-30:** harnessability baixa. Kit ainda funciona mas requer mais supervisão humana. Considerar legacy patterns (skill 23 migration-refactor).
**Score 31-60:** harnessability média. Kit produtivo, alguns gaps. Considerar skills 38 (architecture-deepener) + 06 (security-review).
**Score 61-85:** harnessability boa. Kit roda com pouca supervisão.
**Score 86-100:** harnessability alta. Modo `/swarm` autonomous é viável.

## Roadmap

Items mapeados pelo artigo da Birgitta que ainda não estão no kit:

- v2.5.1 — `/run-fitness` command que roda fitness functions YAML declaradas em `programs/fitness/`
- v2.5.2 — `scripts/check-harness-coherence.mjs` (princípio 4)
- v2.6.0 — Harness coverage metric no `/savings` (sensors declarados vs sensors disparados)
- v2.7.0 — Approved fixtures pattern formalizado na skill 37

## Referências

- Birgitta Böckeler, [Harness engineering for coding agent users](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html), Thoughtworks (2026-04-02)
- W. Ross Ashby, "An Introduction to Cybernetics" (Ashby's Law)
- Neal Ford et al., "Fitness Function-Driven Development"
- Capers Jones, IBM SystemSciences — cost of defect
- `policies/skills-vs-agents.md` — exemplo de sensor com fix-message acionável
- `policies/quality-gates.md` — keep quality left applied to gates
- `docs/inspiration/` — precedentes Stripe/OpenAI
