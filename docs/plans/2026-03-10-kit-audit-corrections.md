# Kit Audit Corrections — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all inconsistencies, missing content, and structural problems found in the comprehensive audit of the Dev Team Kit.

**Architecture:** Pure documentation/config changes. No source code modifications. Changes span skills/, docs/, templates/, and root-level markdown files.

**Tech Stack:** Markdown only. Git for cleanup.

**Scope:** 14 tasks organized in 3 chunks: Quick Fixes (5), Structural Updates (5), New Content (4).

---

## Chunk 1: Quick Fixes

Fixes that are small, obvious, and unambiguous. Each task is independent.

### Task 1: Remove duplicate skill directory

The old `skills/19-observability-sre/` was left behind when Asset Librarian took slot 19. The correct Observability SRE lives at `skills/20-observability-sre/`.

**Files:**
- Delete: `skills/19-observability-sre/` (entire directory)

- [ ] **Step 1: Verify the duplicate has identical or outdated content**

Run:
```bash
diff skills/19-observability-sre/SKILL.md skills/20-observability-sre/SKILL.md
```
Expected: files are identical or 19 is a subset of 20.

- [ ] **Step 2: Remove the duplicate directory**

Run:
```bash
rm -rf skills/19-observability-sre/
```

- [ ] **Step 3: Verify only 20-observability-sre remains**

Run:
```bash
ls skills/ | grep observability
```
Expected: only `20-observability-sre/`

- [ ] **Step 4: Commit**

```bash
git add -A skills/19-observability-sre/
git commit -m "fix: remove duplicate 19-observability-sre directory"
```

---

### Task 2: Fix "17 especialistas" in README.md

The "Estrutura de Arquivos" section (line 257) says "17 especialistas" and only lists skills 01-17. Must list all 27.

**Files:**
- Modify: `README.md:257-284`

- [ ] **Step 1: Replace the skills section header**

Change line 257:
```
### Skills (17 especialistas)
```
To:
```
### Skills (27 especialistas)
```

- [ ] **Step 2: Add skills 18-27 to the file structure listing**

After the line `└── 17-image-generator/SKILL.md`, add:
```
├── 18-repo-auditor/SKILL.md           → Audita stack, convencoes, assets, testes e riscos
├── 19-asset-librarian/SKILL.md        → Inventario de imagens, icones, logos, fontes e tokens
├── 20-observability-sre/SKILL.md      → Logs, metricas, tracing, health checks, alertas
├── 21-data-analytics/SKILL.md         → Eventos, funis, KPIs, tracking
├── 22-accessibility-specialist/SKILL.md → WCAG, teclado, screen reader, contraste
├── 23-migration-refactor-specialist/SKILL.md → Migracoes, legacy, rollout incremental
├── 24-release-manager/SKILL.md        → Versionamento, changelog, release notes, rollout
├── 25-ai-integration-architect/SKILL.md → Adapters, hooks, gateways para IA no app
├── 26-prompt-engineer/SKILL.md        → Prompts reutilizaveis para texto, imagem e video
└── 27-video-integration-specialist/SKILL.md → Video generativo no app
```

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "fix: update README skill list from 17 to 27 especialistas"
```

---

### Task 3: Update docs/README.md to reflect actual structure

Current `docs/README.md` only mentions `features/`, `architecture/`, `api/`, `ops/`, `context/`, `plans/`. Missing the most-used directories.

**Files:**
- Modify: `docs/README.md`

- [ ] **Step 1: Rewrite docs/README.md with complete structure**

Replace full content with:

```markdown
# Mapa da Documentacao

## Estrutura

- `repo-audit/` — Auditoria persistida do repositorio (current.md, assets.md)
- `skill-guides/` — Guias auxiliares carregados sob demanda por cada skill
- `context/` — Gerenciado automaticamente pelo Context Manager
- `plans/` — Planos de implementacao
- `features/` — Documentacao por feature (objetivo, regras, fluxo, API, UI)
- `architecture/` — Visao geral, padroes front/back, ADRs
- `api/` — Contratos de API, erros, paginacao
- `ops/` — Setup, deploy, observabilidade

## Como Usar

1. Repo novo? Rode `Repo Auditor` para criar `repo-audit/current.md`
2. Nova feature? Crie pasta em `features/<nome>/`
3. Decisao arquitetural? Crie ADR em `architecture/decisions/`
4. Novo endpoint? Documente em `api/` ou na feature
5. Mudanca de infra? Atualize `ops/`
6. Precisa de guia detalhado? Consulte `skill-guides/`
```

- [ ] **Step 2: Commit**

```bash
git add docs/README.md
git commit -m "fix: update docs/README.md with complete directory structure"
```

---

### Task 4: Add Video Integration Specialist to skill-call-matrix.md

The Video Integration Specialist (27) is referenced in the Orchestrator but missing from `docs/skill-call-matrix.md`.

**Files:**
- Modify: `docs/skill-call-matrix.md`

- [ ] **Step 1: Add Video Specialist to fluxo de produto**

After the line `- \`AI Integration Architect\` chama \`Video Integration Specialist\` quando a modalidade for video`, confirm it already exists.

If it exists, no change needed. If not, add under `## Fluxo de produto`:
```markdown
- `Video Integration Specialist` consulta `Prompt Engineer` para prompts cinematograficos
```

- [ ] **Step 2: Commit if changed**

```bash
git add docs/skill-call-matrix.md
git commit -m "fix: add Video Integration Specialist to skill-call-matrix"
```

---

### Task 5: Add "migracao grande" flow to quickstart.md

The Orchestrator defines a migration pipeline but quickstart.md doesn't include it.

**Files:**
- Modify: `docs/quickstart.md`

- [ ] **Step 1: Add migration flow after "Feature de video no app"**

Add:
```markdown
### Migracao grande
`Repo Auditor -> Migration Refactor Specialist -> skill afetada -> QA -> Security -> Reviewer -> Deploy`
```

- [ ] **Step 2: Commit**

```bash
git add docs/quickstart.md
git commit -m "fix: add migration flow to quickstart"
```

---

## Chunk 2: Structural Updates

Changes that affect how the kit is installed and discovered by agents.

### Task 6: Add patterns/ and scripts/ to setup-bot-folder.md

Consumer repos that install via `.bot/` will miss the AI integration patterns and the image generation script.

**Files:**
- Modify: `docs/setup-bot-folder.md`

- [ ] **Step 1: Update the structure tree**

Replace the structure section with:
```markdown
## Estrutura

\```text
repo/
├── AGENTS.md
└── .bot/
    ├── GLOBAL.md
    ├── README.md
    ├── policies/
    ├── templates/
    ├── skills/
    ├── patterns/
    │   └── ai-integration/
    ├── scripts/
    ├── docs/
    │   ├── repo-audit/
    │   └── skill-guides/
    ├── commands/
    └── evals/
\```
```

- [ ] **Step 2: Add note about patterns and scripts**

After "## Economia de Token", add:
```markdown
## Patterns e Scripts

- `patterns/ai-integration/` contem padroes reutilizaveis para integrar IA no app
- `scripts/` contem ferramentas auxiliares como `generate-image.py`
- copiar ambos para `.bot/` junto com o resto do kit
```

- [ ] **Step 3: Commit**

```bash
git add docs/setup-bot-folder.md
git commit -m "fix: add patterns/ and scripts/ to setup-bot-folder guide"
```

---

### Task 7: Update AGENTS-root.md template to reference patterns/

The template for consumer repos doesn't include patterns in the reading order.

**Files:**
- Modify: `templates/AGENTS-root.md`

- [ ] **Step 1: Add patterns to reading order**

After line `6. \`.bot/docs/skill-guides/\` somente sob demanda`, add:
```markdown
7. `.bot/patterns/ai-integration/` quando a task envolver integracao de IA no app
```

- [ ] **Step 2: Add patterns to sinais de reauditoria if missing**

Verify the section covers AI integration changes. If not, add:
```markdown
- mudanca relevante em integracoes de IA, providers ou prompts
```

- [ ] **Step 3: Commit**

```bash
git add templates/AGENTS-root.md
git commit -m "fix: add patterns/ reference to AGENTS-root template"
```

---

### Task 8: Create CLAUDE.md for Claude Code discovery

Claude Code reads `CLAUDE.md` as its primary entry point. Without it, the kit relies on users knowing to read AGENTS.md.

**Files:**
- Create: `CLAUDE.md`

- [ ] **Step 1: Write minimal CLAUDE.md**

```markdown
# Claude Code — Dev Team Kit

Este repositorio e um kit de skills para agentes de coding. Leia os arquivos nesta ordem:

1. `GLOBAL.md` — regras universais
2. `policies/` — regras compartilhadas
3. `AGENTS.md` — objetivo e uso do kit
4. `README.md` — documentacao completa com pipeline, skills e stack

## Uso em repos consumidores

Quando instalado em `.bot/` de outro repo, o agente deve ler o `AGENTS.md` da raiz do repo consumidor, que aponta para `.bot/`.

## Economia de contexto

- reutilizar `docs/repo-audit/current.md` antes de explorar o repo
- abrir `docs/skill-guides/` apenas sob demanda
- consultar `patterns/ai-integration/` para features de IA
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: add CLAUDE.md for Claude Code auto-discovery"
```

---

### Task 9: Add CLAUDE.md template for consumer repos

Consumer repos also need a CLAUDE.md that points to `.bot/`.

**Files:**
- Create: `templates/CLAUDE-root.md`

- [ ] **Step 1: Write template**

```markdown
# CLAUDE.md

Este repositorio usa um kit de skills em `.bot/` para orientar agentes de coding.

## Ordem de Leitura
1. `.bot/GLOBAL.md`
2. `.bot/policies/`
3. `.bot/docs/repo-audit/current.md` se existir
4. `.bot/README.md`
5. `.bot/skills/*/SKILL.md`
6. `.bot/docs/skill-guides/` somente sob demanda
7. `.bot/patterns/ai-integration/` quando a task envolver IA

## Auditoria Inicial
- se `.bot/docs/repo-audit/current.md` nao existir, iniciar por `Repo Auditor`
- se existir, reutilizar antes de reexplorar o repo
```

- [ ] **Step 2: Reference in setup-bot-folder.md**

Add to `docs/setup-bot-folder.md` after step 2 in "Fluxo recomendado":
```markdown
3. criar `CLAUDE.md` na raiz usando `templates/CLAUDE-root.md` (para Claude Code)
```
Renumber subsequent steps.

- [ ] **Step 3: Commit**

```bash
git add templates/CLAUDE-root.md docs/setup-bot-folder.md
git commit -m "feat: add CLAUDE.md template for consumer repos"
```

---

### Task 10: Add VERSION file

The kit has no version tracking. Adding a simple VERSION file enables consumers to know which version they installed.

**Files:**
- Create: `VERSION`

- [ ] **Step 1: Create VERSION file**

```
1.0.0
```

- [ ] **Step 2: Reference in README.md**

Add after the first heading in README.md:
```markdown
**Versao atual:** veja `VERSION`
```

- [ ] **Step 3: Commit**

```bash
git add VERSION README.md
git commit -m "feat: add VERSION file for kit versioning"
```

---

## Chunk 3: New Content — Guides and Evals

Missing skill guides and evals for critical skills.

### Task 11: Create skill guide for Image Generator (17)

The most complex transversal skill without a guide. Consumers need examples of prompt engineering by image type, model selection, and post-processing.

**Files:**
- Create: `docs/skill-guides/image-generator.md`

- [ ] **Step 1: Read the skill and script for reference**

Read: `skills/17-image-generator/SKILL.md` and `scripts/generate-image.py`

- [ ] **Step 2: Write the guide**

The guide should cover:
- setup completo (pip install, FAL_KEY)
- exemplos de prompt por tipo (hero, icone, favicon, mascote, background)
- decisao de modelo (Gemini Flash vs Gemini 3 Pro vs GPT-Image-1.5)
- text-to-image vs image-to-image
- pos-processamento (rembg, ico, tauri-icons)
- integracao com Asset Librarian e Repo Auditor
- erros comuns e troubleshooting

Keep under 200 lines. Use real command examples from the script.

- [ ] **Step 3: Commit**

```bash
git add docs/skill-guides/image-generator.md
git commit -m "docs: add skill guide for Image Generator (17)"
```

---

### Task 12: Create skill guide for LLM Selector (16)

Consumers need decision examples for when to use each model level.

**Files:**
- Create: `docs/skill-guides/llm-selector.md`

- [ ] **Step 1: Read the skill for reference**

Read: `skills/16-llm-selector/SKILL.md`

- [ ] **Step 2: Write the guide**

The guide should cover:
- tabela de decisao com exemplos concretos por skill e cenario
- quando fazer override do default
- como o Orchestrator invoca o selector
- exemplos de recomendacao para: commit message, CRUD, arquitetura, security review, debugging

Keep under 120 lines.

- [ ] **Step 3: Commit**

```bash
git add docs/skill-guides/llm-selector.md
git commit -m "docs: add skill guide for LLM Selector (16)"
```

---

### Task 13: Create evals for obligatory gate skills (QA, Security, Reviewer)

These 3 skills are "nunca puladas" but have zero evals. Each eval needs: happy path, edge case, and ambiguity case.

**Files:**
- Create: `evals/skills/qa-testing-gates.md`
- Create: `evals/skills/security-review-gates.md`
- Create: `evals/skills/reviewer-gates.md`

- [ ] **Step 1: Write QA eval**

```markdown
# QA Testing — Gate Eval

## Caso 1: Feature com cobertura suficiente
- Entrada: feature com unit tests + E2E + cobertura >= 80%
- Esperado: QA aprova, handoff para Security
- Criterio: nenhum teste critico ausente

## Caso 2: Feature sem E2E
- Entrada: feature com unit tests mas sem E2E
- Esperado: QA rejeita, pede E2E para fluxo principal
- Criterio: rejeicao especifica, nao generica

## Caso 3: Bugfix — escopo minimo
- Entrada: bugfix com teste de regressao apenas
- Esperado: QA aceita se o teste cobre o bug e nao ha regressao
- Criterio: nao exigir cobertura 80% em bugfix isolado

## Caso 4: Edge — cobertura abaixo mas critico coberto
- Entrada: feature com 72% cobertura mas todos os fluxos criticos testados
- Esperado: QA pode aceitar com nota, nao rejeicao automatica
- Criterio: avaliacao por risco, nao por numero

## Caso 5: Ambiguidade — testes passam mas sao frageis
- Entrada: testes que dependem de timing, ordem ou mock excessivo
- Esperado: QA sinaliza fragilidade, sugere refactor de testes
- Criterio: feedback construtivo, nao bloqueio absoluto
```

- [ ] **Step 2: Write Security eval**

```markdown
# Security Review — Gate Eval

## Caso 1: Feature sem vulnerabilidade
- Entrada: endpoint com Zod validation, JWT check, CORS correto
- Esperado: Security aprova
- Criterio: checklist OWASP satisfeito

## Caso 2: SQL injection possivel
- Entrada: query com string concatenation em vez de parametrized query
- Esperado: Security rejeita com finding especifico
- Criterio: identifica a linha e sugere correcao

## Caso 3: Token em localStorage
- Entrada: JWT armazenado em localStorage
- Esperado: Security rejeita, referencia regra de seguranca do kit
- Criterio: referencia a regra "NUNCA localStorage pra tokens"

## Caso 4: Edge — CORS permissivo em dev
- Entrada: CORS com origin "*" em ambiente de dev, restrito em prod
- Esperado: Security aceita com nota, verifica que prod esta restrito
- Criterio: avalia por ambiente, nao rejeita dev config automaticamente

## Caso 5: Ambiguidade — dependencia com CVE moderado
- Entrada: dependencia com CVE MODERATE sem exploit conhecido
- Esperado: Security registra risco, nao bloqueia
- Criterio: bloqueia apenas HIGH/CRITICAL conforme policy
```

- [ ] **Step 3: Write Reviewer eval**

```markdown
# Reviewer — Gate Eval

## Caso 1: Tudo aprovado
- Entrada: QA passou, Security passou, docs atualizados, handoff completo
- Esperado: Reviewer aprova para Deploy
- Criterio: validacao cruzada de todos os gates

## Caso 2: QA passou mas docs ausentes
- Entrada: feature nova sem documentacao
- Esperado: Reviewer rejeita, devolve para Documenter
- Criterio: identifica skill responsavel pela correcao

## Caso 3: Security nao executou
- Entrada: pipeline sem evidencia de Security review
- Esperado: Reviewer bloqueia, exige Security antes de aprovar
- Criterio: gate obrigatorio nao pode ser pulado

## Caso 4: Edge — rejeicao apos correcao
- Entrada: feature corrigida apos primeira rejeicao
- Esperado: Reviewer re-valida apenas o delta, nao tudo de novo
- Criterio: eficiencia na re-validacao

## Caso 5: Ambiguidade — qualidade subjetiva
- Entrada: codigo funcional, testado, seguro, mas com nomes pouco claros
- Esperado: Reviewer sugere melhoria, nao bloqueia
- Criterio: distingue gate real de guideline
```

- [ ] **Step 4: Commit**

```bash
git add evals/skills/qa-testing-gates.md evals/skills/security-review-gates.md evals/skills/reviewer-gates.md
git commit -m "docs: add evals for obligatory gate skills (QA, Security, Reviewer)"
```

---

### Task 14: Create skill guides for Context Manager (08) and Reviewer (11)

Two core skills without guides. Both are short guides focused on integration patterns.

**Files:**
- Create: `docs/skill-guides/context-manager.md`
- Create: `docs/skill-guides/reviewer.md`

- [ ] **Step 1: Read both skills for reference**

Read: `skills/08-context-manager/SKILL.md` and `skills/11-reviewer/SKILL.md`

- [ ] **Step 2: Write Context Manager guide**

Cover:
- como criar tasks no inicio de um pipeline
- exemplo de mudanca de foco com arquivamento
- formato de `docs/context/current-focus.md`
- formato de `docs/context/history.md`
- integracao com Orchestrator (quem decide vs quem rastreia)
- limite de 15 tasks e quando priorizar

Keep under 100 lines.

- [ ] **Step 3: Write Reviewer guide**

Cover:
- checklist de validacao: codigo, testes, seguranca, docs
- como emitir rejeicao com template
- diferenca entre gate e guideline
- workflow de re-validacao apos correcao
- integracao com Orchestrator no fluxo de rejeicao

Keep under 100 lines.

- [ ] **Step 4: Commit**

```bash
git add docs/skill-guides/context-manager.md docs/skill-guides/reviewer.md
git commit -m "docs: add skill guides for Context Manager (08) and Reviewer (11)"
```

---

## Resumo de Mudancas

| # | Tipo | Descricao | Arquivos |
|---|------|-----------|----------|
| 1 | fix | Remover dir duplicado 19-observability-sre | 1 dir |
| 2 | fix | README "17 → 27 especialistas" | README.md |
| 3 | fix | docs/README.md com estrutura completa | docs/README.md |
| 4 | fix | Video Specialist na skill-call-matrix | docs/skill-call-matrix.md |
| 5 | fix | Migracao no quickstart | docs/quickstart.md |
| 6 | fix | patterns/ e scripts/ no setup-bot-folder | docs/setup-bot-folder.md |
| 7 | fix | patterns/ no AGENTS-root template | templates/AGENTS-root.md |
| 8 | feat | CLAUDE.md para Claude Code | CLAUDE.md |
| 9 | feat | CLAUDE-root.md template | templates/CLAUDE-root.md |
| 10 | feat | VERSION file | VERSION, README.md |
| 11 | docs | Guide Image Generator (17) | docs/skill-guides/ |
| 12 | docs | Guide LLM Selector (16) | docs/skill-guides/ |
| 13 | docs | Evals QA, Security, Reviewer | evals/skills/ |
| 14 | docs | Guides Context Manager, Reviewer | docs/skill-guides/ |

**Total:** 14 tasks, ~14 commits, 0 source code changes.
