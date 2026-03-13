# CLAUDE.md Generator Skill — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create skill 28-claude-md-generator that consumes Repo Auditor output, conducts an intelligent interview with the dev, and generates a project-specific CLAUDE.md.

**Architecture:** Single skill file (SKILL.md) following kit conventions. The skill is a behavioral prompt — no runtime code. It also requires a CLAUDE.md output template and integration with the Orchestrator.

**Tech Stack:** Markdown (SKILL.md), kit conventions (YAML frontmatter, Portuguese body)

**Spec:** `docs/superpowers/specs/2026-03-12-claude-md-generator-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `skills/28-claude-md-generator/SKILL.md` | Main skill definition — all 5 phases |
| Create | `templates/claude-md-output.md` | Output template for generated CLAUDE.md |
| Modify | `skills/09-orchestrator/SKILL.md` | Add skill 28 to pipeline after Repo Auditor |
| Modify | `templates/CLAUDE-root.md` | Add note about running skill 28 for new projects |
| Modify | `README.md` | Add skill 28 to the skills table |

---

## Chunk 1: Core Skill File

### Task 1: Create the skill directory

**Files:**
- Create: `skills/28-claude-md-generator/SKILL.md`

- [ ] **Step 1: Create directory**

```bash
mkdir -p skills/28-claude-md-generator
```

- [ ] **Step 2: Write SKILL.md with YAML frontmatter and intro**

Create `skills/28-claude-md-generator/SKILL.md` with the YAML frontmatter, intro paragraph, and Governanca Global section. Content from the spec skeleton (lines 234-251):

```yaml
---
name: claude-md-generator
description: |
  Gera CLAUDE.md inteligente para projetos consumidores. Consome output do Repo Auditor,
  faz entrevista guiada com o dev e produz um CLAUDE.md especifico, conciso e acionavel.
  Use apos o Repo Auditor (18) ter mapeado o repositorio.
  Trigger em: "gerar claude.md", "criar claude.md", "onboarding", "setup claude md",
  "contexto do projeto", "documentar projeto para agente".
argument-hint: "[caminho-do-projeto]"
allowed-tools: Read, Grep, Glob, Edit, Write
---

# CLAUDE.md Generator

Gera um CLAUDE.md especifico e acionavel para o projeto consumidor, baseado na auditoria do Repo Auditor e entrevista com o desenvolvedor.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/handoffs.md`, `policies/quality-gates.md` e `policies/evals.md`.
```

- [ ] **Step 3: Verify frontmatter matches kit pattern**

Compare YAML fields against `skills/18-repo-auditor/SKILL.md`:
- `name`: ✓ kebab-case
- `description`: ✓ multi-line with pipe, includes trigger keywords
- `argument-hint`: ✓ optional arg format
- `allowed-tools`: ✓ explicit list

- [ ] **Step 4: Commit**

```bash
git add skills/28-claude-md-generator/SKILL.md
git commit -m "feat: scaffold skill 28 claude-md-generator with frontmatter"
```

### Task 2: Add Quando Usar / Quando Nao Usar / Entradas / Saidas

**Files:**
- Modify: `skills/28-claude-md-generator/SKILL.md`

- [ ] **Step 1: Append sections**

Add to SKILL.md after Governanca Global:

```markdown
## Quando Usar

- apos o Repo Auditor (18) ter gerado `docs/repo-audit/current.md`
- quando o projeto consumidor nao tem CLAUDE.md
- quando o CLAUDE.md existente esta generico ou desatualizado
- quando um novo dev precisa de onboarding rapido

## Quando Nao Usar

- em scaffolds vazios sem codigo
- como substituto do Repo Auditor — esta skill consome output da auditoria, nao produz
- para editar uma unica secao de um CLAUDE.md existente — editar manualmente
- no repositorio do kit em si (claude-skills-fv)

## Entradas Esperadas

- `docs/repo-audit/current.md` (ou `.bot/docs/repo-audit/current.md`)
- respostas do dev na entrevista interativa

## Saidas Esperadas

- `CLAUDE.md` na raiz do projeto consumidor
- conteudo especifico, conciso e em ingles
```

- [ ] **Step 2: Commit**

```bash
git add skills/28-claude-md-generator/SKILL.md
git commit -m "feat(28): add usage criteria and I/O sections"
```

### Task 3: Add Responsabilidades and Prerequisite Fallback

**Files:**
- Modify: `skills/28-claude-md-generator/SKILL.md`

- [ ] **Step 1: Append sections**

```markdown
## Prerequisito e Fallback

Se `docs/repo-audit/current.md` nao existir quando esta skill for invocada:
1. Emitir aviso: "Auditoria nao encontrada. Executando Repo Auditor (18) primeiro."
2. Invocar Repo Auditor (18) no repositorio alvo
3. Continuar com a Fase 1 apos a auditoria estar disponivel

## Responsabilidades

1. Consumir `docs/repo-audit/current.md` e classificar cada secao como `inferida`, `parcial` ou `desconhecida`
2. Conduzir entrevista interativa com o dev, perguntando apenas sobre gaps (1 pergunta por vez, com opcoes pre-populadas baseadas no audit)
3. Gerar draft do CLAUDE.md com ate 11 secoes, omitindo secoes vazias
4. Apresentar draft para aprovacao do dev e iterar ate aprovacao
5. Escrever CLAUDE.md na raiz do projeto consumidor
```

- [ ] **Step 2: Commit**

```bash
git add skills/28-claude-md-generator/SKILL.md
git commit -m "feat(28): add responsibilities and fallback behavior"
```

### Task 4: Add Phase 1 — Audit Ingestion

**Files:**
- Modify: `skills/28-claude-md-generator/SKILL.md`

- [ ] **Step 1: Append Phase 1**

```markdown
## Fase 1 — Ingestao do Audit

Ler `docs/repo-audit/current.md` (ou `.bot/docs/repo-audit/current.md`).

Extrair informacoes sobre: stack, comandos, estrutura de diretorios, testes, deploy, riscos.

Classificar cada uma das 11 secoes do CLAUDE.md como:
- `inferida` — dados suficientes no audit para gerar a secao
- `parcial` — tem algo mas precisa confirmar com o dev
- `desconhecida` — precisa perguntar ao dev

### Secoes do CLAUDE.md

| # | Secao | Classificacao Tipica |
|---|-------|---------------------|
| 1 | Project Overview | parcial ou desconhecida (objetivo de negocio nao esta no audit) |
| 2 | Tech Stack | geralmente inferida |
| 3 | Architecture | geralmente inferida |
| 4 | Key Files | sempre inferida (entry points, configs, modulos-chave) |
| 5 | Commands | parcial (package.json/Makefile cobre parte, mas pode ter scripts manuais) |
| 6 | Code Style | parcial (eslint/prettier configs dão pistas, mas convencoes verbais nao) |
| 7 | Design System | inferida se frontend; omitir inteiramente se nao houver frontend |
| 8 | Environment | parcial (.env.example ajuda, mas pode haver vars nao documentadas) |
| 9 | Testing | parcial (framework detectavel, patterns nao) |
| 10 | Gotchas | sempre desconhecida — conhecimento tacito do dev |
| 11 | Workflow | parcial (CI/CD config ajuda, branch strategy nao) |
```

- [ ] **Step 2: Commit**

```bash
git add skills/28-claude-md-generator/SKILL.md
git commit -m "feat(28): add phase 1 audit ingestion"
```

### Task 5: Add Phase 2 — Intelligent Interview

**Files:**
- Modify: `skills/28-claude-md-generator/SKILL.md`

- [ ] **Step 1: Append Phase 2**

```markdown
## Fase 2 — Entrevista Inteligente (~5-8 perguntas)

Perguntar APENAS sobre secoes `parcial` ou `desconhecida`. Cada pergunta deve vir pre-populada com dados do audit.

### Padroes de Pergunta por Secao

| Secao | Se inferida | Se parcial | Se desconhecida |
|-------|-------------|------------|-----------------|
| Project Overview | Pular | "Detectei X. Qual o objetivo de negocio?" | "O que este projeto faz e pra quem?" |
| Tech Stack | Pular | "Encontrei A, B, C. Faltou algo?" | "Qual a stack principal?" |
| Architecture | Pular | "Estrutura parece X. Algum pattern relevante?" | "Como o codigo esta organizado?" |
| Key Files | Sempre inferida | Sempre inferida | Sempre inferida |
| Code Style | Pular | "Vi convencao X. Outras regras?" | "Alguma convencao de estilo?" |
| Design System | Pular (sem frontend: omitir) | "Usando X. Tokens customizados?" | Pular se nao houver frontend |
| Commands | Pular | "Encontrei X comandos. Outros fora dos scripts?" | "Quais os comandos principais?" |
| Environment | Pular | "Encontrei .env com X vars. Outros necessarios?" | "Vars de ambiente obrigatorias?" |
| Testing | Pular | "Encontrei framework X. Patterns de teste?" | "Abordagem de testes?" |
| Gotchas | **Sempre perguntar** | **Sempre perguntar** | **Sempre perguntar** |
| Workflow | Pular | "Deploy via X. Branch strategy?" | "Workflow de dev?" |

### Regras da Entrevista

- 1 pergunta por mensagem via conversa direta (nao via tool)
- Oferecer opcoes inline quando possivel (ex: "A) X  B) Y  C) outro")
- Fallback aberto quando opcoes nao se aplicam
- Dev pode pular qualquer pergunta (secao omitida ou usa dados inferidos)
- **Gotchas sao sempre perguntadas** — conhecimento tacito que analise de codigo nao captura
- **Design System e omitido inteiramente** para repos sem frontend detectado no audit
```

- [ ] **Step 2: Commit**

```bash
git add skills/28-claude-md-generator/SKILL.md
git commit -m "feat(28): add phase 2 intelligent interview"
```

### Task 6: Add Phase 3 — Draft Generation

**Files:**
- Modify: `skills/28-claude-md-generator/SKILL.md`

- [ ] **Step 1: Append Phase 3**

```markdown
## Fase 3 — Geracao do Draft

Montar CLAUDE.md com ate 11 secoes. Omitir secoes vazias.

### Ordem das Secoes

1. Project Overview
2. Tech Stack
3. Architecture
4. Key Files (sempre inferida do audit)
5. Commands
6. Code Style
7. Design System (omitir para repos sem frontend)
8. Environment
9. Testing
10. Gotchas
11. Workflow

### Referencia ao Kit

Se o diretorio `.bot/` existir no repo alvo, adicionar secao no topo:

```
## Skills Kit

This repo uses a skills kit at `.bot/`. Reading order:
1. `.bot/GLOBAL.md`
2. `.bot/policies/`
3. `.bot/docs/repo-audit/current.md` (if exists)
4. `.bot/AGENTS.md`
```

### Principios de Qualidade

- Conciso: cada secao max 10-15 linhas
- Acionavel: todo comando deve ser copy-paste ready
- Especifico: zero conselho generico. "Use meaningful names" → fora. "Always prefix API routes with /api/v1" → dentro
- Atual: validar comandos contra package.json / Makefile / pyproject.toml
- YAGNI: se uma secao teria so 1 linha vaga, omitir

### Template de Output

Usar `templates/claude-md-output.md` como base para o CLAUDE.md gerado.

### Monorepos

Para monorepos com multiplos packages/workspaces:
- Gerar UM unico CLAUDE.md na raiz
- Incluir tabela de packages na secao Architecture
- Nao gerar CLAUDE.md por package
- Mencionar convencoes complexas de packages especificos em Gotchas
```

- [ ] **Step 2: Commit**

```bash
git add skills/28-claude-md-generator/SKILL.md
git commit -m "feat(28): add phase 3 draft generation"
```

### Task 7: Add Phase 4 + 5, Evidence, and Handoff

**Files:**
- Modify: `skills/28-claude-md-generator/SKILL.md`

- [ ] **Step 1: Append remaining sections**

```markdown
## Fase 4 — Review com o Dev

- Apresentar o draft completo na conversa
- Dev aprova ou pede ajustes
- Iterar ate aprovacao

## Fase 5 — Escrita do Arquivo

- Escrever `CLAUDE.md` na raiz do projeto consumidor
- Se ja existir um CLAUDE.md, mostrar diff e perguntar antes de sobrescrever
- Sem backup — git cuida do historico

## Evidencia de Conclusao

- `CLAUDE.md` criado ou atualizado na raiz do projeto
- secoes relevantes preenchidas com dados reais (nao placeholders)
- dev aprovou o conteudo
- comandos documentados validados contra o repo

## Handoff

Entregar:
- caminho do CLAUDE.md gerado
- quais secoes foram inferidas vs perguntadas
- gaps que o dev escolheu pular
- recomendacao: rerodar apos mudancas grandes de stack

Seguir `policies/handoffs.md`.
```

- [ ] **Step 2: Commit**

```bash
git add skills/28-claude-md-generator/SKILL.md
git commit -m "feat(28): add phases 4-5, evidence and handoff"
```

---

## Chunk 2: Output Template

### Task 8: Create the output template

**Files:**
- Create: `templates/claude-md-output.md`

- [ ] **Step 1: Create template file**

Create `templates/claude-md-output.md`:

```markdown
# {Project Name}

{1-2 sentence description of what this project does and who it's for.}

## Tech Stack
- {Concise list: framework, language, key libraries}

## Architecture
{Brief directory tree with purpose of key folders, max 8-10 lines}

## Key Files
| File | Purpose |
|------|---------|
| {path} | {purpose} |

## Commands
| Command | Description |
|---------|-------------|
| `{cmd}` | {what it does} |

## Code Style
- {Convention bullets — only non-obvious ones}

## Design System
- {Tokens, component library, theme approach}

## Environment
| Variable | Purpose | Required |
|----------|---------|----------|
| {VAR} | {purpose} | {Yes/No} |

## Testing
- {Framework, patterns, how to run specific tests}

## Gotchas
- {Non-obvious patterns, quirks, things that break unexpectedly}

## Workflow
- {Branch strategy, PR process, deploy flow}
```

- [ ] **Step 2: Commit**

```bash
git add templates/claude-md-output.md
git commit -m "feat: add CLAUDE.md output template for skill 28"
```

---

## Chunk 3: Kit Integration

### Task 9: Add skill 28 to Orchestrator pipeline

**Files:**
- Modify: `skills/09-orchestrator/SKILL.md`

- [ ] **Step 1: Read current Orchestrator and locate insertion point**

Find the section starting with `## Skill Inicial: Repo Auditor` in `skills/09-orchestrator/SKILL.md`. It contains:

```markdown
## Skill Inicial: Repo Auditor

Quando o repositorio ainda nao tiver auditoria valida em `docs/repo-audit/current.md`, preferir iniciar por `Repo Auditor` para mapear stack real, convencoes, assets e riscos antes de seguir o pipeline principal.
```

- [ ] **Step 2: Add skill 28 reference after Repo Auditor section**

Append immediately after the "Skill Inicial: Repo Auditor" section (before the next `##` heading):

```markdown

## Skill Pos-Audit: CLAUDE.md Generator

Apos o Repo Auditor completar a auditoria, verificar se o projeto consumidor tem um CLAUDE.md util.
Se nao existir ou estiver generico/desatualizado, acionar `CLAUDE.md Generator` (28) para gerar um CLAUDE.md especifico e acionavel antes de seguir o pipeline principal.
```

- [ ] **Step 3: Update Pipeline Base shorthand**

Find the line `Repo Auditor -> PO -> UI/UX -> Backend -> Frontend -> Motion -> Copy -> SEO -> QA -> Security -> Reviewer -> Deploy` in the Pipeline Base section and update to:

```
Repo Auditor -> CLAUDE.md Generator -> PO -> UI/UX -> Backend -> Frontend -> Motion -> Copy -> SEO -> QA -> Security -> Reviewer -> Deploy
```

- [ ] **Step 4: Commit**

```bash
git add skills/09-orchestrator/SKILL.md
git commit -m "feat(09): add skill 28 to orchestrator pipeline"
```

### Task 10: Update CLAUDE-root.md template

**Files:**
- Modify: `templates/CLAUDE-root.md`

- [ ] **Step 1: Append note about skill 28**

Add after the "Auditoria Inicial" section:

```markdown

## CLAUDE.md Inteligente
- se o CLAUDE.md da raiz estiver generico, rodar `CLAUDE.md Generator` (skill 28) apos o Repo Auditor
- a skill faz entrevista guiada e gera um CLAUDE.md especifico para o projeto
```

- [ ] **Step 2: Commit**

```bash
git add templates/CLAUDE-root.md
git commit -m "feat: reference skill 28 in CLAUDE-root template"
```

### Task 11: Add skill 28 to README skills table

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Find the skills table in README.md**

Search for the skills listing section. Add row for skill 28:

```
| 28 | CLAUDE.md Generator | Gera CLAUDE.md inteligente para projetos consumidores |
```

Insert after the row for skill 27.

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add skill 28 to README skills table"
```

---

## Chunk 4: Validation

### Task 12: Manual validation checklist

- [ ] **Step 1: Verify SKILL.md structure matches kit convention**

Compare `skills/28-claude-md-generator/SKILL.md` sections against `skills/18-repo-auditor/SKILL.md`:
- ✓ YAML frontmatter (name, description, argument-hint, allowed-tools)
- ✓ Governanca Global
- ✓ Quando Usar / Quando Nao Usar
- ✓ Entradas Esperadas / Saidas Esperadas
- ✓ Responsabilidades (numbered)
- ✓ Operational content (phases)
- ✓ Evidencia de Conclusao
- ✓ Handoff

- [ ] **Step 2: Verify output template has all 11 sections**

Read `templates/claude-md-output.md` and confirm 11 sections present.

- [ ] **Step 3: Verify Orchestrator references skill 28**

Read `skills/09-orchestrator/SKILL.md` and confirm new section exists.

- [ ] **Step 4: Verify CLAUDE-root.md mentions skill 28**

Read `templates/CLAUDE-root.md` and confirm new section exists.

- [ ] **Step 5: Final commit with all files**

```bash
git status
```

All files should be committed. If any unstaged, add and commit.
