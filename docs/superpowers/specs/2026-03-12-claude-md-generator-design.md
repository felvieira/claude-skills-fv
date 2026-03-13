# Design: Skill 28 — CLAUDE.md Generator

**Date:** 2026-03-12
**Status:** Approved
**Author:** Brainstorming session

## Problem

The current CLAUDE.md generation workflow produces generic, template-based files that don't reflect the actual codebase. The existing `claude-md-improver` plugin only audits/improves existing files — it doesn't generate from scratch with deep context. Developers end up with boilerplate CLAUDE.md that Claude Code can't meaningfully use.

## Solution

A new skill (28-claude-md-generator) that consumes the Repo Auditor output, conducts an intelligent interview with the developer, and generates a project-specific CLAUDE.md with real, actionable content.

## Skill Identity

| Field | Value |
|-------|-------|
| Name | `28-claude-md-generator` |
| Trigger | Generate or update CLAUDE.md for a consumer project |
| Prerequisite | Repo Auditor (18) has run — `docs/repo-audit/current.md` exists |
| Output | `CLAUDE.md` at project root |
| Output language | English |
| Allowed tools | Read, Grep, Glob, Edit, Write |

## Pipeline Position

```
Repo Auditor (18) → CLAUDE.md Generator (28) → [dev continues working]
```

The Orchestrator (09) can invoke skill 28 automatically after skill 18 when it detects the project has no CLAUDE.md or the existing one is outdated.

## Prerequisite Fallback

If `docs/repo-audit/current.md` does not exist when skill 28 is invoked:
1. Emit a warning: "Repo audit not found. Running Repo Auditor (18) first."
2. Invoke Repo Auditor (18) on the target repo
3. Continue with Phase 1 once the audit is available

This ensures the skill works even when called directly, without the Orchestrator.

## When NOT to Use

- Empty scaffolds with no code yet — nothing to analyze
- As a substitute for Repo Auditor — this skill consumes audit output, not produces it
- To update a single section of an existing CLAUDE.md — edit manually instead
- For repos inside the kit itself (claude-skills-fv) — this generates CLAUDE.md for consumer projects

## Monorepo Handling

For monorepos with multiple packages/workspaces:
- Generate ONE `CLAUDE.md` at the monorepo root
- Include a packages table in the Architecture section listing each package and its purpose
- Do NOT generate per-package CLAUDE.md files (keep it simple)
- If specific packages have complex conventions, mention them in Gotchas

## Governance

This skill follows:
- `GLOBAL.md` — universal rules
- `policies/execution.md` — act first when safe default exists
- `policies/persistence.md` — what to save between sessions
- `policies/token-efficiency.md` — context compression
- `policies/tool-safety.md` — allowed operations
- `policies/handoffs.md` — delivery format
- `policies/evals.md` — validation criteria

## Workflow

### Phase 1 — Audit Ingestion

- Read `docs/repo-audit/current.md` (or `.bot/docs/repo-audit/current.md`)
- Extract: stack, commands, structure, tests, deploy, risks
- Classify each of the 11 CLAUDE.md sections as:
  - `inferred` — enough data from the audit
  - `partial` — some data, needs confirmation
  - `unknown` — must ask the developer

### Phase 2 — Intelligent Interview (~5-8 questions)

Ask ONLY about `partial` or `unknown` sections. Each question is pre-populated with detected context.

**Question patterns by section:**

| Section | If inferred | If partial | If unknown |
|---------|-------------|------------|------------|
| Project Overview | Skip | "Detected X. What's the business goal?" | "What does this project do and for whom?" |
| Tech Stack | Skip | "Found A, B, C. Missing anything?" | "What's the core stack?" |
| Architecture | Skip | "Structure looks like X. Any key patterns?" | "How is the code organized?" |
| Key Files | Always inferred | Always inferred | Always inferred |
| Code Style | Skip | "Saw convention X. Other rules?" | "Any style conventions?" |
| Design System | Skip (non-frontend: omit entirely) | "Using X library. Custom tokens?" | Skip if no frontend detected |
| Commands | Skip | "Found X commands. Others not in scripts?" | "Key dev commands?" |
| Environment | Skip | "Found .env with X vars. Others needed?" | "Required env vars?" |
| Testing | Skip | "Found X test framework. Patterns?" | "Testing approach?" |
| Gotchas | **Always ask** | **Always ask** | **Always ask** |
| Workflow | Skip | "Deploy via X. Branch strategy?" | "Dev workflow?" |

**Key Files** is always inferred from the audit — entry points, config files, and key modules are detected automatically. No question needed.

**Design System** is skipped entirely for non-frontend repos (no frontend framework detected in audit). Avoid asking meaningless questions.

**Gotchas are always asked** — they represent tacit developer knowledge that code analysis cannot surface.

**Interview rules:**
- 1 question per message via conversational prompting (not a tool — just ask the developer directly)
- Offer multiple-choice options inline when possible (e.g., "A) X  B) Y  C) something else")
- Open-ended fallback when options don't fit
- Developer can skip any question (section gets omitted or uses inferred data)

### Phase 3 — Draft Generation

Build CLAUDE.md using up to 11 sections. Omit empty sections.

**Section order:**
1. Project Overview
2. Tech Stack
3. Architecture
4. Key Files (always inferred from audit)
5. Commands
6. Code Style
7. Design System (omit for non-frontend repos)
8. Environment
9. Testing
10. Gotchas
11. Workflow

**Kit reference:** If `.bot/` directory exists in the target repo, prepend a kit section at the top:
```markdown
## Skills Kit

This repo uses a skills kit at `.bot/`. Reading order:
1. `.bot/GLOBAL.md`
2. `.bot/policies/`
3. `.bot/docs/repo-audit/current.md` (if exists)
4. `.bot/AGENTS.md`
```
This is a simplified version of `templates/CLAUDE-root.md` (which lists 7 items). The full template includes skills, skill-guides, and AI patterns — those are omitted here because the CLAUDE.md is for developers, not for agents navigating the kit. The kit section is a quick pointer; agents still read the full template via `.bot/AGENTS.md`.

**Quality principles:**
- Concise: each section max 10-15 lines
- Actionable: every command is copy-paste ready
- Specific: zero generic advice
- Current: commands validated against package.json / Makefile / pyproject.toml
- YAGNI: if a section would have only 1 vague line, omit it

### Phase 4 — Developer Review

- Present the full draft in the conversation
- Developer approves or requests edits
- Iterate until approved

### Phase 5 — Write File

- Write `CLAUDE.md` at the project root
- If a CLAUDE.md already exists, show a diff and ask before overwriting
- No backup files — git handles history

## Output Template

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

## Completion Evidence

- `CLAUDE.md` created or updated at project root
- All relevant sections populated with real data
- Developer approved the content
- Documented commands validated against the repo

## Handoff

Deliver:
- Path to generated CLAUDE.md
- Which sections were inferred vs. asked
- Any gaps the developer chose to skip
- Recommendation: re-run after major stack changes

Follow `policies/handoffs.md`.

## Design Decisions

1. **Why after Repo Auditor, not standalone?** — Avoids duplicate codebase analysis. The audit already has 80% of what's needed.
2. **Why interactive interview, not batch questionnaire?** — Pre-populated questions based on audit data make the conversation smarter and faster.
3. **Why always ask about gotchas?** — Code analysis can't surface tacit knowledge. This is the highest-value section for future Claude sessions.
4. **Why English output?** — Better LLM comprehension. The skill itself (SKILL.md) stays in Portuguese per kit convention.
5. **Why flexible kit reference?** — Projects with `.bot/` get the pointer; standalone projects get a self-contained file.
6. **Why no per-package CLAUDE.md in monorepos?** — Keep it simple. One root file with a packages table covers 90% of cases. Per-package files can be added manually if needed.

## SKILL.md Skeleton

The actual `skills/28-claude-md-generator/SKILL.md` should follow kit convention (Portuguese). Draft:

```yaml
---
name: claude-md-generator
description: |
  Gera CLAUDE.md inteligente para projetos consumidores. Consome output do Repo Auditor,
  faz entrevista guiada com o dev e produz um CLAUDE.md especifico, conciso e acionavel.
  Use apos o Repo Auditor (18) ter mapeado o repositorio.
argument-hint: "[caminho-do-projeto]"
allowed-tools: Read, Grep, Glob, Edit, Write
---

# CLAUDE.md Generator

Gera um CLAUDE.md especifico e acionavel para o projeto consumidor, baseado na auditoria do Repo Auditor e entrevista com o desenvolvedor.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/handoffs.md`, `policies/quality-gates.md` e `policies/evals.md`.

## Quando Usar

- apos o Repo Auditor (18) ter gerado `docs/repo-audit/current.md`
- quando o projeto consumidor nao tem CLAUDE.md
- quando o CLAUDE.md existente esta generico ou desatualizado
- quando um novo dev precisa de onboarding rapido

## Quando Nao Usar

- em scaffolds vazios sem codigo
- como substituto do Repo Auditor
- para editar uma unica secao de um CLAUDE.md existente
- no repositorio do kit em si

## Entradas Esperadas

- `docs/repo-audit/current.md` (output do Repo Auditor)
- respostas do dev na entrevista interativa

## Saidas Esperadas

- `CLAUDE.md` na raiz do projeto consumidor
- conteudo especifico, conciso e em ingles

## Responsabilidades

1. Consumir `docs/repo-audit/current.md` e classificar cada secao como inferida, parcial ou desconhecida
2. Conduzir entrevista interativa com o dev, perguntando apenas sobre gaps (1 pergunta por vez, com opcoes pre-populadas)
3. Gerar draft do CLAUDE.md com ate 11 secoes, omitindo secoes vazias
4. Apresentar draft para aprovacao do dev e iterar ate aprovacao
5. Escrever CLAUDE.md na raiz do projeto consumidor

## Evidencia de Conclusao

- CLAUDE.md criado ou atualizado
- secoes relevantes preenchidas com dados reais
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
