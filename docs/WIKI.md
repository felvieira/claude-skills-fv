# Dev Team Kit — Full Wiki

> **Version:** 37 skills · 14 subagents · 23 slash commands · 22 policies
> **Last updated:** 2026-05-04
> **Repo:** https://github.com/felvieira/claude-skills-fv
> **Install:** `claude plugin install https://github.com/felvieira/claude-skills-fv`

> 🇧🇷 **Versão em Português:** [`docs/WIKI.pt-BR.md`](./WIKI.pt-BR.md)

Single-page wiki of the entire kit. Every item follows the format from [5 Agent Skills I Use Every Day](https://www.aihero.dev/5-agent-skills-i-use-every-day) — **name, what it does, when to use, problem it solves, concrete example, takeaway** — but here we cover **everything**: skills + subagents + commands + policies + plugin.

---

## Table of Contents

1. [How the kit works in 60 seconds](#1-how-the-kit-works-in-60-seconds)
2. [The 2 flows: classic vs discovery](#2-the-2-flows-classic-vs-discovery)
3. [Core principle: Vertical Slicing](#3-core-principle-vertical-slicing)
4. [Slash commands (23) — shortcuts by phase](#4-slash-commands-23)
5. [Skills (37) — specialists by category](#5-skills-37)
6. [Subagents (14) — dispatchable via Task tool](#6-subagents-14)
7. [Policies (22) — shared rules](#7-policies-22)
8. [Plugin: how the kit is distributed](#8-plugin-how-the-kit-is-distributed)
9. [MCP server: 36 tools under the hood](#9-mcp-server-36-tools-under-the-hood)
10. [When to use what: decision tree](#10-when-to-use-what-decision-tree)
11. [Inspiration and attribution](#11-inspiration-and-attribution)

---

## Context Engineering Stack

This kit implements context engineering across all 5 levels of the atom→field hierarchy (inspired by [davidkimai/Context-Engineering](https://github.com/davidkimai/Context-Engineering)):

| Level | Concept | Kit Implementation |
|---|---|---|
| **Atom** | Single prompt | Individual skill (`skills/*/SKILL.md`) |
| **Molecule** | Few-shot examples | `templates/` — handoff, plan, review, protocol-shell formats |
| **Cell** | Memory + state | `learned-skills/`, `devkit_context_pack`, `devkit_working_set` |
| **Organ** | Multi-agent | 14 subagents dispatched via Task tool (`.claude/agents/`) |
| **Neural Field** | Semantic resonance | Protocol shells + `programs/` — typed I/O composing into orchestrated flows |

### What this means in practice

- **Protocol shells** (`templates/protocol-shell.md`) give every subagent a typed input/output contract in Pareto-lang format.
- **Skill I/O schemas** (`schemas/skill-io/`) are machine-readable JSON Schema definitions that enable validation and regression testing.
- **Programs** (`programs/`) are declarative cognitive programs — ordered sequences of protocol shells composing multi-step workflows (pipeline-discovery, detective-spec, loop-polishing).
- **Iteration scoring** (`scripts/auto-loop/scoring.mjs`) quantifies loop quality per iteration, feeding the circuit breaker alongside stall detection.

---

## 1. How the kit works in 60 seconds

You install the kit into a project. From that point on, any compatible agent (Claude Code, Cursor, Windsurf, Copilot, Gemini CLI) gains **an entire team**: PO, designer, backend, frontend, QA, security, deploy, docs, observability, accessibility, etc.

Typical flow for a new feature:

```
you describe the feature
  ↓
/spec or /grill-me              ← PO understands and formalizes
  ↓
/plan                           ← orchestrator breaks into vertical slices
  ↓
/build (per slice, parallel)    ← back + front + DB together
  ↓
/test                           ← QA proves it works
  ↓
/review                         ← Reviewer + Security validate
  ↓
/ship                           ← Release Manager + Deploy
```

Everything guided by **policies** (shared rules) and **automatic model routing** (haiku for boilerplate, sonnet for implementation, opus for architecture — you don't pay Opus to generate an import statement).

---

## 2. The 2 flows: classic vs discovery

The kit has **two pipelines** for new features. They coexist. Choose by context.

### Mode A — `/pipeline` (classic)

```
/spec → /plan → /build → /test → /review → /ship
```

**Use when:** small/medium feature (<1 sprint), spec already clear, team knows the codebase, no need to publish PRD/issues to GitHub/Linear/Jira, TDD optional.

### Mode B — `/pipeline-discovery` (with discovery + TDD)

```
/grill-me → /to-prd → /to-issues → /loop --worktree --parallel N → /ship
                       ↓                ↓
                       N issues        per slice: /build + skill 37 (TDD) + /review
                       in tracker
```

**Use when:** large/new/ambiguous feature, vague briefing, team is new to the area, will parallelize with 2+ workers, need to publish PRD + issues to tracker, critical code requiring TDD.

### Comparison

| Aspect | Mode A classic | Mode B discovery |
|---|---|---|
| Formal discovery | no | **`/grill-me` required** |
| Spec output | `docs/specs/X.md` (internal) | PRD in **issue tracker** |
| Slice breakdown | implicit (PO writes) | **explicit** (`/to-issues` creates 1 issue per slice) |
| Parallelization | manual | **structural** (N workers, 1 slice each) |
| TDD | optional | **mandatory per slice** |
| Skill 38 (Architecture Deepener) | not called | optional between `/to-issues` and `/loop` |

Both flows respect **`policies/vertical-slices.md`**. The difference is the level of formalism in discovery and tracker publication.

**Takeaway:** **choose the wrong flow once** — not the wrong feature — and you feel where it hurts.

---

## 3. Core principle: Vertical Slicing

> **Every multi-layer feature is delivered as a vertical slice (DB + back + front + e2e test), never as horizontal layers in parallel.**

### Wrong (layered, parallelizes but integrates badly)

```
Worker A: all front (login + signup + password reset)
Worker B: all back (login + signup + password reset)
Worker C: all DB (login + signup + password reset)
→ nobody can test until all 3 finish
→ integration reveals 80% of bugs at the end
```

### Right (vertical, parallelizes AND integrates end-to-end)

```
Worker A: login feature (DB + back + front + e2e test) → mergeable on its own
Worker B: signup feature (DB + back + front + e2e test) → mergeable on its own
Worker C: password reset (DB + back + front + e2e test) → mergeable on its own
→ each worker delivers a testable, demo-able feature
```

**Who enforces this:** orchestrator (skill 09) refuses layer-first plans. PO (skill 01) writes user stories already as slices. `/plan` produces a slice table before building. `policies/vertical-slices.md` has anti-patterns and size heuristics.

**When NOT to apply:** single-layer task (only front OR only back), localized bug fix, cross-cutting refactor, chore.

**Takeaway:** **parallelism is not the same as coordination.** Layered slicing parallelizes tasks but delays integration — that's false efficiency.

---

## 4. Slash commands (23)

These are phase shortcuts. No need to memorize skill names — call the shortcut, it routes.

### Phase commands (Mode A — classic)

#### `/spec` — Specify a feature

**What it does:** PO writes user stories, testable acceptance criteria, priority, risks.
**When to use:** new idea or vague requirement needs to become an actionable spec.
**Problem it solves:** avoids "building without understanding the request", reduces rework.
**Example:** `/spec add dark mode with per-user persistence`
**Takeaway:** **every feature starts here.** Skipping spec costs 3-5x more in rework.

#### `/plan` — Build the pipeline

**What it does:** orchestrator classifies task complexity and defines the minimum pipeline (which skills to call, in what order). Breaks into vertical slices if multi-layer.
**When to use:** large task, not sure where to start; want a roadmap before coding.
**Problem it solves:** avoids running the full pipeline when a simple bug fix suffices.
**Example:** `/plan migrate authentication to OAuth2`
**Takeaway:** **pipeline is minimum necessary.** Expensive skills (security, deploy) only enter when the task demands.

#### `/build` — Implement

**What it does:** Backend (skill 03) + Frontend (skill 04) with the project's real stack (reads `docs/repo-audit/current.md` first).
**When to use:** spec ready, implementing is the next step.
**Problem it solves:** consistency with existing conventions instead of "agent inventing a new style".
**Example:** `/build implement endpoint POST /api/orders per spec`
**Takeaway:** **stack comes from the audit, not from training.** Auditing the repo first prevents mismatch.

#### `/test` — Write and run tests

**What it does:** QA (skill 05) following "prove-it" — happy path + error + edge case + regression.
**When to use:** after implementing, or to fill coverage gaps, or to validate a fix.
**Problem it solves:** "works locally" without tests = bug in production waiting to happen.
**Example:** `/test cover orderService including VIP discount and out-of-stock`
**Takeaway:** **saying it works doesn't count. A test proves it.**

#### `/review` — Final review + security

**What it does:** Reviewer (skill 11) + Security (skill 06) validate the delta before merge.
**When to use:** PR ready, before requesting human review or merging.
**Problem it solves:** catches obvious bugs, common vulnerabilities, debt before it becomes a problem.
**Example:** `/review` (in the context of an open PR)
**Takeaway:** **Critical/High open = no merge.** Reviewer is a gate, not a suggestion.

#### `/best` — Best practices audit

**What it does:** Reviewer + Security + QA together audit clean code, DRY, SOLID, OWASP.
**When to use:** before release, inherited code, or when you sense "this feels wrong".
**Problem it solves:** technical debt nobody wants to open an issue for.
**Example:** `/best src/services/billing/`
**Takeaway:** **run before requesting a refactor.** The report justifies the work.

#### `/simplify` — Refactor

**What it does:** Migration & Refactor (skill 23) proposes simplification preserving behavior.
**When to use:** code works but it's messy; before adding a feature to a god module.
**Problem it solves:** "let's clean up" refactors without a plan become new bugs.
**Example:** `/simplify src/auth/middleware.ts (god function 200 lines)`
**Takeaway:** **refactor with a plan and a regression test.** Without a safety net, it becomes a regression.

#### `/ship` — Release and deploy

**What it does:** Release Manager (skill 24) + Deploy (skill 07) — changelog, versioning, rollout, rollback plan.
**When to use:** feature ready + tested + reviewed, time to ship.
**Problem it solves:** "surprise" deploys, improvised rollbacks, empty changelogs.
**Example:** `/ship v2.4.0 with schema migration`
**Takeaway:** **deploy is a documented event.** A rehearsed rollback beats blind confidence.

#### `/pipeline` — Classic end-to-end

**What it does:** orchestrator runs spec → plan → build → test → review → ship in sequence.
**When to use:** small/medium feature, team knows the terrain, no tracker publication needed.
**Problem it solves:** skipping phases out of laziness generates 3x more rework later.
**Example:** `/pipeline create user settings page`
**Takeaway:** **full pipeline is overkill for a bug fix, vital for a feature.**

### Discovery flow commands (Mode B)

#### `/grill-me` — Plan interrogation

**What it does:** PO in always-on Deep Interview mode. Asks **one question at a time**, recommends an answer, walks the decision tree until convergence.
**When to use:** idea still vague, before `/spec` or `/to-prd`.
**Problem it solves:** specs produced with silent "unknown unknowns".
**Example:** `/grill-me I want to redesign checkout to reduce abandonment`
**Takeaway:** **one question per turn + suggested answer.** A list of 20 questions kills flow. Adapted from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me).

#### `/to-prd` — Conversation → PRD in issue tracker

**What it does:** takes the current conversation context and publishes a PRD to GitHub/Linear/Jira (label `needs-triage`). Doesn't interview — synthesizes. Auto-detects tracker (`gh auth status`, `LINEAR_API_KEY` env, `acli`); if nothing available, saves to `docs/prd/`.
**When to use:** after `/grill-me` converges, before `/to-issues`.
**Problem it solves:** PRDs live in lost conversations; they need a tracker to become work.
**Example:** `/to-prd` (in post-grill-me context)
**Takeaway:** **PRD goes to the tracker with label needs-triage.** Internal spec uses `/spec` in `docs/specs/`. Adapted from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-prd).

#### `/constitution` — Governing principles for the project

**What it does:** creates/updates `memory/constitution.md` in the consumer repo via 5 mini-interviews (Code Quality, Testing, UX, Performance, Security). The constitution has **hierarchical authority** over PRD/plan/ADRs — conflict resolution: constitution wins.
**When to use:** project bootstrap, organizational change (new compliance framework, new cost budget), onboarding kit skills into an existing project without formal principles.
**Problem it solves:** principles only live in heads or scattered ADRs; specs/plans/reviews don't have an objective rubric to anchor decisions.
**Example:** `/constitution` (or `/constitution focus: security`)
**Takeaway:** **principles are non-negotiable.** To change a principle: dedicated `chore(constitution)` commit, never silent dilution in feature PR. Adapted from [github/spec-kit](https://github.com/github/spec-kit).

#### `/checklist` — Unit tests for English

**What it does:** generates a **contextual checklist per feature** (not fixed) covering Completeness, Clarity, Consistency, Coverage, Edge Cases. Cross-references the constitution. Complements (does not replace) the 13 fixed checks in `policies/prd-validation.md`.
**When to use:** after `/spec` or `/to-prd`, before `/plan`. Or to audit a PR that changes an existing spec.
**Problem it solves:** spec ambiguities that only surface during `/build` (rework). Fixed checklist (13 checks) doesn't catch domain-specific issues.
**Example:** `/checklist docs/specs/dark-mode.md`
**Takeaway:** **the spec is "code in English"; this checklist is its unit test suite.** Adapted from [github/spec-kit](https://github.com/github/spec-kit) (concept by Den Delimarsky).

#### `/analyze` — Cross-artifact consistency check

**What it does:** **read-only** audit between `memory/constitution.md` → `docs/specs/*.md` → `docs/plan/*.md` (or ADRs) → tracker issues. Detects CRITICAL/HIGH/MEDIUM/LOW findings (constitution conflicts, semantic duplication, ambiguity, coverage gaps, hygiene). Produces traceability matrix.
**When to use:** after `/to-issues` and before `/build`. Before `/ship` of a major release. After a big change to the constitution.
**Problem it solves:** the pipeline `/spec → /plan → /to-issues → /build` has no gate validating tasks still match spec. Constitution updates can silently invalidate existing artifacts.
**Example:** `/analyze --feature dark-mode --strict`
**Takeaway:** **CRITICAL = total blocker.** Constitution wins all conflicts. Report goes to `docs/analysis/`. Adapted from [github/spec-kit](https://github.com/github/spec-kit).

#### `/constitution` — Governing principles for the project

**What it does:** creates/updates `memory/constitution.md` in the consumer repo via 5 mini-interviews (Code Quality, Testing, UX, Performance, Security). The constitution has **hierarchical authority** over PRD/plan/ADRs — conflict resolution: constitution wins.
**When to use:** project bootstrap, organizational change (new compliance framework, new cost budget), onboarding kit skills into an existing project without formal principles.
**Problem it solves:** principles only live in heads or scattered ADRs; specs/plans/reviews don't have an objective rubric to anchor decisions.
**Example:** `/constitution` (or `/constitution focus: security`)
**Takeaway:** **principles are non-negotiable.** To change a principle: dedicated `chore(constitution)` commit, never silent dilution in feature PR. Adapted from [github/spec-kit](https://github.com/github/spec-kit).

#### `/checklist` — Unit tests for English

**What it does:** generates a **contextual checklist per feature** (not fixed) covering Completeness, Clarity, Consistency, Coverage, Edge Cases. Cross-references the constitution. Complements (does not replace) the 13 fixed checks in `policies/prd-validation.md`.
**When to use:** after `/spec` or `/to-prd`, before `/plan`. Or to audit a PR that changes an existing spec.
**Problem it solves:** spec ambiguities that only surface during `/build` (rework). Fixed checklist (13 checks) doesn't catch domain-specific issues.
**Example:** `/checklist docs/specs/dark-mode.md`
**Takeaway:** **the spec is "code in English"; this checklist is its unit test suite.** Adapted from [github/spec-kit](https://github.com/github/spec-kit) (concept by Den Delimarsky).

#### `/analyze` — Cross-artifact consistency check

**What it does:** **read-only** audit between `memory/constitution.md` → `docs/specs/*.md` → `docs/plan/*.md` (or ADRs) → tracker issues. Detects CRITICAL/HIGH/MEDIUM/LOW findings (constitution conflicts, semantic duplication, ambiguity, coverage gaps, hygiene). Produces traceability matrix.
**When to use:** after `/to-issues` and before `/build`. Before `/ship` of a major release. After a big change to the constitution.
**Problem it solves:** the pipeline `/spec → /plan → /to-issues → /build` has no gate validating tasks still match spec. Constitution updates can silently invalidate existing artifacts.
**Example:** `/analyze --feature dark-mode --strict`
**Takeaway:** **CRITICAL = total blocker.** Constitution wins all conflicts. Report goes to `docs/analysis/`. Adapted from [github/spec-kit](https://github.com/github/spec-kit).

#### `/run-program` — Execute YAML pipeline programs

**What it does:** parses and executes `programs/<name>.yml` as a declarative pipeline. Steps can be slash commands, human gates, parallel blocks, or conditionals. Variable substitution via `${inputs.X}` and `${steps.X.output}`. Validates schema, resolves inputs, runs in order, pauses at gates.
**When to use:** repeated pipelines that need consistency (spec-driven, pipeline-discovery, loop-polishing, detective-spec); flows with multiple review gates; teams that need the same pipeline executed identically by different agents.
**Problem it solves:** `programs/*.md` describes the flow but isn't executable. YAML format is executable — machine parses, agent runs each step, pauses at human gates, captures outputs for next step.
**Example:** `/run-program spec-driven-development` or `/run-program loop-polishing --dry-run`
**Takeaway:** **declarative pipeline + human gates = consistent execution across agents and sessions.** Inspired by [github/spec-kit `workflows/`](https://github.com/github/spec-kit/tree/main/workflows) with our extensions (when/parallel/conditional/vars).

#### `/consolidate-memory` — Memory vault maintenance

**What it does:** periodic janitor for `D:\claude-memory\` (or any vault path) — merges duplicate logs, archives stale architecture decisions, prunes broken backlinks, promotes/demotes learned skills based on score, normalizes inconsistent tags. Safe workflow: snapshot → dry-run → confirmation → apply → verify → report.
**When to use:** weekly cron, after intense usage (50+ sessions), before major release of consumer project, when vault grows beyond 500 files.
**Problem it solves:** memory vault accumulates duplicates, stale facts, and broken references that erode value over time. Without periodic cleanup, semantic search degrades and context rot sets in.
**Example:** `/consolidate-memory --dry-run` (audit) or `/consolidate-memory --vault D:/claude-memory`
**Takeaway:** **never delete without snapshot.** Workflow always backs up first. Complements `policies/memory-tiers.md` (4-tier model) with maintenance discipline.

#### `/humanize` — Remove AI writing patterns

**What it does:** rewrites any prose (docs, PRDs, copy, changelogs, release notes) removing the 29 AI writing patterns catalogued in `policies/anti-ai-writing.md`: significance inflation, promotional language, copula avoidance, signposting, generic conclusions, chatbot artifacts, and more. Includes a self-audit step ("What still sounds AI-generated?") before delivering the final version.
**When to use:** before publishing any PRD to the tracker, after generating docs with skill 10, before publishing copy (skill 13) or articles (skill 14). Also useful as a final pass on any AI-assisted prose.
**Problem it solves:** AI-generated text has recognizable patterns that undermine credibility. Humans notice even if they can't name them.
**Example:** `/humanize docs/specs/dark-mode.md` or inline text
**Takeaway:** **don't just remove bad patterns — inject actual personality.** Clean-but-soulless is still obviously AI. Adapted from [blader/humanizer](https://github.com/blader/humanizer) (18.9k stars) + [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing).

#### `/to-issues` — PRD → vertical slices in tracker

**What it does:** breaks PRD into N independent issues (vertical slices/tracer bullets). Each issue is HITL or AFK. Publishes all with label `needs-triage`, in dependency order.
**When to use:** after `/to-prd`, before `/loop --worktree --parallel N`.
**Problem it solves:** parallel workers without assignable issues = chaos; layered slicing disguised as vertical.
**Example:** `/to-issues #142` (reference to the PRD)
**Takeaway:** **each issue cuts through ALL layers.** Layered slicing is prohibited (`policies/vertical-slices.md`). Adapted from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-issues).

#### `/pipeline-discovery` — Discovery + slicing + TDD

**What it does:** top-level orchestrator. Runs full flow `grill-me → to-prd → to-issues → loop+TDD → ship`. Publishes PRD + N issues, parallelizes by slice, TDD per slice. **4 mandatory human approval gates** (PRD, issues, dispatch workers, deploy).
**When to use:** large/new/ambiguous feature, new team, will parallelize 2+ workers, critical code.
**Problem it solves:** shallow spec becoming integration mess; work not tracked; integration only at the end.
**Example:** `/pipeline-discovery I want to add social auth (Google + GitHub)`
**Takeaway:** **formal discovery + issues in tracker + TDD per slice = high quality with real parallelization.**

### Autonomous / utility commands

#### `/auto` — Autonomous agent (1 session)

**What it does:** runs full task without intervention. 10 production patterns: progress tracking via checkboxes, inter-iteration memory, progressive context narrowing, tiered validation (lint→typecheck→build), error deduplication, completion override, dynamic budget, validation feedback loop, stall detection, build-fix extension.
**When to use:** complex task you want delivered overnight; want to grab coffee and come back to a ready PR.
**Problem it solves:** agent stuck on the same error 3x without detecting it.
**Example:** `/auto refactor entire billing module to use new payment lib`
**Takeaway:** **fire and forget — but with a circuit breaker.** Stall detection saves hundreds of iterations.

#### `/loop` — Auto-loop v2 (multi-agent, parallel)

**What it does:** autonomous loop v2. Multi-agent (claude + codex), integrated worktree, real parallelization (`--worktree --parallel N`), configurable polishing pass (`none|light|standard|full`).
**When to use:** several independent features overnight; want 4 PRs ready tomorrow morning.
**Problem it solves:** manually orchestrating parallel workers is expensive and error-prone.
**Example:** `node scripts/auto-loop.mjs "task" --worktree --parallel 4 --polish standard`
**Takeaway:** **real parallelism requires worktrees.** Without them, 2 workers on the same repo = chaos.

#### `/worktree` — Isolated worktree

**What it does:** creates an isolated git worktree, copies `.env*`, validates environment in background.
**When to use:** work in parallel without affecting current branch; before executing a large plan.
**Problem it solves:** stash + checkout = losing mental state and uncommitted files.
**Example:** `/worktree feat/payments`
**Takeaway:** **branch ≠ worktree.** Worktree gives a physically isolated directory.

#### `/detective-spec` — Legacy reverse-engineering

**What it does:** enters a legacy codebase, extracts executable contracts (modules, business rules, flows, retroactive ADRs) without modifying a single line. 5-phase pipeline with checkpoint/resume in `.detective/state.json`. Output in `_detective_sdd/`. Inspired by [Reversa](https://github.com/sandeco/reversa).
**When to use:** legacy without docs, vibe coded, before evolving a feature in an unknown module, migration, onboarding.
**Problem it solves:** team inherits a 5-year monolith without docs — agent doesn't know what it can break.
**Example:** `/detective-spec --module=src/billing`
**Takeaway:** **zero writes on the legacy project.** Verifiable via `git status`. Generated spec becomes an operational contract consumable by another agent.

### Kit installation / utility commands

#### `/devkit-install-fv` — Install kit in `.bot/`

**What it does:** installs the full kit (skills + policies + templates + MCP + hooks + multi-platform configs) in `.bot/` of the current repo.
**When to use:** first time using the kit in a project.

#### `/audit-repo` — Repository audit

**What it does:** Repo Auditor (skill 18) creates an operational snapshot of the project (stack, conventions, risks, entry points, tech debt) and persists it in `docs/repo-audit/current.md`.
**When to use:** first contact with a repo; before a large feature.
**Takeaway:** **persisted audit = token savings.** Splits available by type (`routes.md`, `schema.md`, `components.md`, etc).

#### `/inventory-assets` — Asset inventory

**What it does:** Asset Librarian (skill 19) catalogs logos, icons, fonts, visual tokens.
**When to use:** before generating a new image (skill 17) — avoids reinventing visual identity.

#### `/plan-feature` — Feature planning

**What it does:** legacy shortcut for feature planning. Today prefer `/plan` or `/pipeline-discovery`.

#### `/review-release` — Pre-release review

**What it does:** joint audit before final release. Today `/review` + `/best` cover this.

---

## 5. Skills (37)

Each skill is a specialty. Has frontmatter with `description` (activation triggers), `allowed-tools` (tool scope), and SKILL.md with protocol. Skill 16 is intentionally absent (absorbed by `policies/model-routing.md`).

### Category: Management & Coordination

#### Skill 08 — Context Manager

**What it does:** tracks focus, open tasks, hot files and handoffs across long sessions.
**When to activate:** long session with several parallel features; risk of losing context.
**Problem it solves:** agent forgets what it was doing after automatic compaction.

#### Skill 09 — Orchestrator

**What it does:** Tech Lead. Classifies task complexity, defines minimum pipeline, delegates to skills, adapts on rejection. Knows the 2 flows (classic vs discovery) and chooses.
**When to activate:** complex task, several candidate skills, needs routing.
**Problem it solves:** running the full pipeline for a simple bug fix burns tokens for nothing.
**Takeaway:** **orchestrator is the kit's brain.** Without it, you route manually.

#### Skill 10 — Documenter

**What it does:** records decisions, API contracts, operations and impacts in living docs. Acts transversally — every relevant change in rule/contract goes through here.
**When to activate:** feature or refactor that changes documented behavior.

#### Skill 11 — Reviewer

**What it does:** validates the final delta before release — quality, scope, risk. 5 axes: correctness, design, readability, performance, security.
**When to activate:** always before merge or release.
**Problem it solves:** "I thought it was fine" without a criterion becomes a production bug.
**Takeaway:** **Reviewer is a gate, not an opinion.** Critical open = no merge.

#### Skill 17 — Image Generator

**What it does:** generates or adapts visual assets (hero, mascot, illustration, background, layout, icon) via fal.ai (5 models: gpt-image-1-mini, Gemini 2.5 Flash, Gemini 3 Pro, gpt-image-1.5, Grok Imagine). Vendor-agnostic — alternatives (Replicate, OpenAI direct, Stability) supported.
**When to activate:** project needs a new or derived image.
**Problem it solves:** "image here" placeholder on a landing page.
**Takeaway:** **model choice is by cost + quality.** Multi-model pipeline (iterate cheap → validate medium → final premium) costs $0.10-$0.50 per hero. Details in `docs/skill-guides/image-generator-models.md`.

#### Skill 18 — Repo Auditor

**What it does:** operational snapshot of the repo (stack, conventions, assets, tests, deploy, observability, risks). Persists in `docs/repo-audit/current.md` + type splits (`routes.md`, `schema.md`, `components.md`, `services.md`, `infra.md`).
**When to activate:** first contact with repo; large stack change; before a large feature.
**Problem it solves:** agent re-reads 200 files every time = $$$.
**Takeaway:** **audit is a cache.** Update only when things change.

#### Skill 19 — Asset Librarian

**What it does:** catalogs logos, icons, fonts, visual tokens and reusable assets in `docs/repo-audit/assets.md`.
**When to activate:** project with established visual identity; before skill 17 or 36.
**Problem it solves:** Image Generator invents a new style ignoring what already exists.

#### Skill 20 — Observability SRE

**What it does:** defines structured logs, metrics, tracing, alerts and rollback plan.
**When to activate:** before shipping a critical feature to production.
**Problem it solves:** "we don't know why it went down" because nobody added logging.

#### Skill 21 — Data Analytics

**What it does:** defines tracking events, naming, funnels, product KPIs.
**When to activate:** new feature with product impact that needs measuring.

#### Skill 22 — Accessibility Specialist

**What it does:** reviews WCAG 2.2, keyboard navigation, HTML semantics, motion reduction.
**When to activate:** before releasing a UI feature; periodic audit.

#### Skill 23 — Migration & Refactor Specialist

**What it does:** runs incremental migrations, feature flags and safe rollback. **Receives deepening plan from skill 38** and executes the refactor with TDD (skill 37).
**When to activate:** large refactor, stack migration, change that needs a feature flag.
**Problem it solves:** "let's clean up" without a plan = guaranteed regression.

#### Skill 24 — Release Manager

**What it does:** organizes changelog, release notes, versioning, gradual rollout.
**When to activate:** release cycle.

#### Skill 25 — AI Integration Architect

**What it does:** designs AI adapters, gateways, streaming, fallbacks, inference cost.
**When to activate:** new LLM integration in a product.
**Problem it solves:** coupling a product to 1 vendor = expensive lock-in later.

#### Skill 26 — Prompt Engineer

**What it does:** writes and iterates prompts, reusable templates, few-shot strategies.
**When to activate:** product prompt needs systematic iteration + eval.

#### Skill 27 — Video Integration Specialist

**What it does:** integrates generative video with focus on UX, latency and format.

#### Skill 28 — CLAUDE.md Generator

**What it does:** generates a smart `CLAUDE.md` for consumer projects of the kit.
**When to activate:** first time installing the kit in a project.

#### Skill 30 — Cost Tracker

**What it does:** tracks token cost and API calls per session, skill and model tier.
**When to activate:** always — passive, records in background.
**Takeaway:** **if you don't measure, you don't optimize.** Cost Tracker became default practice.

#### Skill 31 — Session Summary

**What it does:** consolidates a session summary for clean handoff between long sessions.
**When to activate:** end of a large session; before closing the IDE.

#### Skill 32 — Smart Suggestions

**What it does:** suggests the next most impactful action based on the project's real state.
**When to activate:** "what now?" after merging a feature.

#### Skill 33 — Detective Spec

**What it does:** reverse-engineering of specs in legacy — extracts modules, business rules, flows, retroactive ADRs. **Zero writes** on the project (verifiable via `git status --porcelain`). 5-phase pipeline with checkpoint/resume.
**When to activate:** legacy without docs; vibe coded; onboarding in large codebase.
**Problem it solves:** agent can't evolve what it doesn't understand.
**Takeaway:** **generated spec becomes an operational contract**, not a document for humans to read.

#### Skill 34 — Static Analysis

**What it does:** automated scan via Semgrep + CodeQL with SARIF output, severity triage (Critical/High/Medium/Low/Info), justified FP suppression, custom rules in `tools/semgrep/`. Dispatches 5 auxiliary subagents for scale.
**When to activate:** pre-release, large PR, periodic audit, variant analysis after a bug.
**Problem it solves:** manual security review doesn't catch everything.

#### Skill 35 — Skill Author

**What it does:** **meta-skill.** Creates, edits, evaluates and optimizes the kit's own skills. Defines mandatory SKILL.md template, eval scorecard (10 criteria × 0-3, threshold 22/30 for merge), pipelines for create/edit/eval/optimize.
**When to activate:** adding a new skill; refactoring an existing skill; evaluating kit quality.
**Problem it solves:** kit grows by copy-paste, each skill diverges from conventions.
**Takeaway:** **the skill that governs the other skills.** Sustainability of the kit itself.

#### Skill 36 — Web Asset Generator

**What it does:** derives operational web assets from a logo: multi-size favicons, PWA icons (incl. maskable with 80% safe area), Open Graph (1200x630), Twitter card (1200x675), manifest, browserconfig, complete HTML snippet. 3 tooling options (realfavicongenerator CLI, ImageMagick, Sharp).
**When to activate:** before first deploy; rebrand; adding PWA support; preparing a landing page.
**Problem it solves:** deploy without favicon, blank OG image on WhatsApp, PWA without maskable icon.
**Takeaway:** **direct handoff from skill 17** — skill 17 creates the creative, skill 36 derives the operational pack.

### Category: Product and Design

#### Skill 01 — PO (Feature Spec)

**What it does:** writes user stories, testable acceptance criteria, priority, risks. Has **Deep Interview** (ambiguity > 0.7) and **Enrich Mode** (ambiguity 0.4-0.7) with repo-audit inference.
**When to activate:** every feature starts here.
**Problem it solves:** "building without understanding the request" → 3x rework.
**Takeaway:** **PO is the guardian of business value.** User stories already as vertical slices.

#### Skill 02 — UI/UX Designer

**What it does:** defines layout, token system, responsiveness, usage heuristics.
**When to activate:** feature with interface; rebranding; new design system.
**Problem it solves:** UI invented by an agent without criteria becomes inconsistent.

#### Skill 29 — Design Intelligence

**What it does:** researches competitors, captures screenshots, analyzes visual trends, delivers strategic dossier for UI/UX.
**When to activate:** innovative feature or rebranding — before UI/UX starts.
**Problem it solves:** design "from nothing" without market benchmark.

### Category: Development

#### Skill 03 — Backend Engineer

**What it does:** REST/GraphQL APIs, contracts, auth, validation, database, integrations.
**When to activate:** backend implementation.
**Problem it solves:** API invented without reading project conventions.

#### Skill 04 — Frontend Engineer

**What it does:** React/Next.js, state, API calls, performance, experience.
**When to activate:** frontend implementation.

#### Skill 12 — Motion Designer

**What it does:** animations, transitions, micro-interactions, coherent visual behavior.
**When to activate:** feature needs motion (modal, toast, skeleton, scroll, hover).

#### Skill 15 — Mobile / Tauri

**What it does:** extension for desktop and mobile apps with Tauri + React Native.
**When to activate:** project goes beyond web.

### Category: Content and Discovery

#### Skill 13 — Marketing Copy

**What it does:** product copy, CTAs, landing pages, brand voice, conversion messaging.
**When to activate:** landing page, ad, email marketing.

#### Skill 14 — SEO Specialist

**What it does:** metadata, schema.org, Core Web Vitals, sitemap, discoverability.
**When to activate:** public site; before Google indexes.

### Category: Quality and Delivery

#### Skill 05 — QA Engineer

**What it does:** unit, integration, E2E tests, coverage, critical edge cases. "Prove-it" philosophy — if you say it works, prove it with a test. **Complements skill 37 (TDD)** with edge cases not covered.
**When to activate:** post-implementation; fill gaps; validate a fix.
**Takeaway:** **saying it works doesn't count. A test proves it.**

#### Skill 06 — Security Reviewer

**What it does:** OWASP Top 10, headers, CORS, CSRF, XSS, injection, data exposure. Thinks like an attacker. Critical findings come with PoC.
**When to activate:** before deploying a critical feature; every PR touching auth/input handling.
**Problem it solves:** discovering a vulnerability in the customer's account is too late.

#### Skill 07 — Deploy Engineer

**What it does:** containerization, CI/CD, blue-green rollout, rollback, infra as code.
**When to activate:** new deploy; infra change.

#### Skill 37 — TDD Engineer

**What it does:** **red-green-refactor enforced.** 1 test → 1 implementation → repeat. Combats "horizontal slicing" at the test level (writing all tests before all implementation produces bad tests). Anti-rationalization table with 9 common fallacies. Pairs with skill 38 to identify deep modules before RED.
**When to activate:** complex feature; bug fix in critical code; refactor; new module design.
**Problem it solves:** bulk tests test shape instead of behavior; break during refactors for no reason.
**Takeaway:** **tests verify behavior via public interface, not implementation details.** Adapted from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd).

#### Skill 38 — Architecture Deepener

**What it does:** finds **deepening opportunities** (deletion test, deep modules, seams). Strict architectural vocabulary (Module/Interface/Implementation/Depth/Seam/Adapter/Leverage/Locality). **Does not modify code** — proposes candidates. Skill 23 (Migration & Refactor) executes.
**When to activate:** weekly; before delegating maintenance to an agent in a complex module; post-Detective in legacy; PR review adding a new module.
**Problem it solves:** shallow modules (interface as complex as implementation) that become god files and block evolution.
**Takeaway:** **deletion test is the core.** If deleting concentrates complexity, the module was earning its place. Adapted from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture).

---

## 6. Subagents (14)

Subagents are specialists dispatchable via `Task` tool. Unlike skills (markdown loaded by the orchestrator), subagents run in an isolated session with their own context. Ideal for well-scoped tasks that benefit from fresh context.

### Core (5)

#### `code-reviewer`
Senior code reviewer focused on clean code, DRY, SOLID, correctness, performance and security. **When to use:** PR review, completed feature, any code before merge. **Tools:** Read, Grep, Glob, Bash.

#### `security-auditor`
Specialized web security auditor. Thinks like an attacker, reports like a defender. **When to use:** auth flows, input handling, deps, CORS, headers, pre-deploy. **Tools:** Read, Grep, Glob, Bash.

#### `test-engineer`
"Prove-It" QA. Happy path, error, edge case, regression, performance. **When to use:** write tests, fill coverage, validate regressions. **Tools:** Read, Grep, Glob, Bash, Edit, Write.

#### `orchestrator`
Tech Lead. Classifies task, defines minimum pipeline, coordinates skills. **When to use:** complex task, several candidate skills. **Tools:** all.

#### `debugger`
Systematic root cause: hypothesis → evidence → minimum fix. Explicit **Evidence Ledger** + **anti-rationalization table** with 10 common fallacies. Heuristics by bug class (race, leak, perf, auth, off-by-one, encoding). **When to use:** bug, unexpected behavior, failure you can't explain. **Tools:** Read, Grep, Glob, Bash, Edit.

### Detective Spec (4) — phases of `/detective-spec`

#### `detective-contracts`
Phase 2: extracts module contracts (public API, dependencies, invariants, consumers) from legacy code. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-business-rules`
Phase 3: extracts business rules hidden in validations, magic constants, state transitions, error messages, tests. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-flows`
Phase 4: reconstructs end-to-end flows (entry → side effects) with edge cases, mutated state, failures. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-adrs`
Phase 5: infers retroactive ADRs + synthesizes overview + traceability. Read-only. **Tools:** Read, Grep, Glob, Bash.

### Static Analysis (5) — pipeline of skill 34

#### `semgrep-scanner`
Multi-language repo: parallel Semgrep scans by language category, SARIF aggregation. **Tools:** Read, Grep, Glob, Bash.

#### `semgrep-triager`
Batch >20 findings: classifies TP/FP/needs-investigation reading source context, proposes fixes. **Mandatory approval gate** before applying `nosemgrep:` in code. **Tools:** Read, Grep, Glob, Write.

#### `codeql-runner`
Bug needs interprocedural taint tracking: orchestrates CodeQL database build + queries. Cache by commit hash in `.detective-scan/codeql-db/<lang>/`. **Tools:** Read, Grep, Glob, Bash.

#### `sarif-parsing`
Multiple SARIF sources: parse, dedup, aggregate into single report. Baseline diff. Extracts tool name from `runs[].tool.driver.name`, not from `input_filename`. **Tools:** Read, Glob, Bash, Write.

#### `variant-analysis`
Confirmed bug → hunts variants of the same pattern, generates reusable custom rule for CI. **Mandatory approval gate** before `git add tools/semgrep/<rule>.yml`. **Tools:** Read, Grep, Glob, Bash, Write.

---

## 7. Policies (22)

Policies are shared rules that govern skill behavior. Every skill cites the policies it follows. **Top 5 most important:**

#### `tool-safety.md`
Minimum-privilege tools. Risk classes (low/medium/high). Mandatory approval for high risk. **Why it matters:** an agent running a destructive command without confirming = problem.

#### `vertical-slices.md`
Every multi-layer feature delivered as a vertical slice (DB+back+front+e2e), never layered. **Why it matters:** layered slicing parallelizes tasks but delays integration.

#### `quality-gates.md`
Critical/High open = no merge. Reviewer + QA + Security are gates, not suggestions. **Why it matters:** an enforced gate is what separates production code from hobby code.

#### `model-routing.md`
Haiku for boilerplate, Sonnet for implementation, Opus for architecture. Absorbed skill 16 (llm-selector). **Why it matters:** Opus to generate `import x from 'y'` burns money.

#### `writing-clarity.md`
10 Strunk rules adapted for agent output. Active voice, no filler words, short sentences. Applies to commits, error messages, handoffs, slash command output, docs. **Why it matters:** LLM-style fluffy prose burns tokens and reading time.

### Remaining policies

| Policy | What it does |
|---|---|
| `anti-rationalization.md` | Combats agent cognitive biases ("this looks ok") |
| `code-exploration.md` | How to explore codebase efficiently in tokens |
| `confusion-management.md` | STOP-NAME-OPTIONS-WAIT when requirement is ambiguous |
| `context-engineering.md` | 5-level hierarchy + 3 trust levels for context management |
| `cost-optimization.md` | Practices to reduce API cost |
| `detective-write-guardrails.md` | Hard guardrail: writes only in `.detective/` and `_detective_sdd/` |
| `documentation-i18n.md` | Conventions for multi-language docs |
| `evals.md` | Evaluation framework for skills, prompts, tools |
| `execution.md` | Execution principles: act first with safe defaults |
| `handoffs.md` | Consistent handoff format between skills |
| `hooks.md` | Lifecycle hooks in settings.json |
| `iterative-retrieval.md` | Progressive retrieval in 3 rounds for subagents |
| `persistence.md` | When and how to persist context |
| `search-first.md` | Research required before implementing |
| `source-driven.md` | Every claim anchored in a source (file:line, ADR, commit) |
| `stack-flexibility.md` | Skills don't couple to a single vendor |
| `token-efficiency.md` | Output compression to save tokens |

---

## 8. Plugin: how the kit is distributed

### Manifest: `.claude-plugin/plugin.json`

Official Claude Code schema. Lists:
- **37 skills** in `skills/NN-name/SKILL.md`
- **14 agents** in `.claude/agents/<name>.md`
- **23 commands** in `.claude/commands/<name>.md` (cc-format) + `commands/<name>.md` (kit-format)
- **hooks** in `hooks/hooks.json` (lifecycle: SessionStart, PreToolUse, PostToolUse, Stop)

### Install modes (3 options)

#### Mode 1 — Global plugin (Claude Code)

```bash
claude plugin install https://github.com/felvieira/claude-skills-fv
```

Installs globally: 37 skills, hooks, 23 commands. Works in any project without additional config. **Does not include:** policies, MCP server, templates, docs (those go in `.bot/`).

#### Mode 2 — Full kit per repo (`/devkit-install-fv`)

With plugin installed, inside the target repo:

```
/devkit-install-fv
```

Installs complete `.bot/`: MCP server (36 tools), policies, templates, docs, hooks, learned-skills, multi-platform configs (Cursor, Windsurf, Copilot, Gemini CLI, OpenCode, Antigravity).

#### Mode 3 — Direct Bash

```bash
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh /path/to/project
```

Supports non-interactive profiles: `--profile lean`, `--no-input`, `--yes`.

### Mode comparison

| What's included | Global plugin | `/devkit-install-fv` | Direct Bash |
|---|:---:|:---:|:---:|
| 37 skills | ✓ | ✓ | ✓ |
| Hooks (lifecycle) | ✓ | ✓ | ✓ |
| Slash commands | ✓ | ✓ | ✓ |
| Policies | ✗ | ✓ | ✓ |
| MCP server (36 tools) | ✗ | ✓ | ✓ |
| Handoff templates | ✗ | ✓ | ✓ |
| Docs + repo-audit | ✗ | ✓ | ✓ |
| Multi-platform configs | ✗ | ✓ | ✓ |
| Learned skills per project | ✗ | ✓ | ✓ |

### Supported platforms

| Platform | Skills | Hooks | MCP | Slash Commands |
|---|:---:|:---:|:---:|:---:|
| **Claude Code** | ✓ native | ✓ | ✓ | ✓ |
| **Cursor** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **Windsurf** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **GitHub Copilot** | ✓ via `.bot/` | ✗ | ✗ | ✗ |
| **Gemini CLI** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **OpenCode** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **Antigravity** | ✓ via `.bot/` | ✗ | ✓ | ✗ |

---

## 9. MCP server: 36 tools under the hood

The kit includes its own **MCP server** (`mcp-server/src/index.ts`) with **36 tools** exposed for any MCP client (Cursor, Windsurf, Gemini CLI, etc).

Tools are orthogonal to skills — they implement low-level capabilities that skills consume:

- **Skill loading:** `devkit_load_skill`, `devkit_list_skills`
- **Pipeline:** `devkit_classify_task`, `devkit_get_pipeline`
- **Context management:** `devkit_context_pack`, `devkit_working_set`, `devkit_diff_brief`
- **Cost tracking:** `devkit_track_cost`, `devkit_get_cost_summary`
- **Templates:** `devkit_get_template`
- **Learned skills:** `devkit_save_learned_skill`, `devkit_get_learned_skills`
- **Project intel:** audit, asset inventory, tech stack detection
- **Suggestions:** `devkit_get_suggestions` (next most impactful action)
- **Output compression:** `devkit_compress_output` (reduces noise from logs/stack traces)

### When the MCP server is useful

- You want to use the kit in **another IDE** that's not Claude Code (Cursor, Windsurf, Gemini CLI)
- You want to **integrate the kit into your own pipeline** (CI, custom CLI)
- You want **structured cost traceability** per session/skill/model

### When you DON'T need it

- You only use Claude Code with the global plugin (skills load directly, no MCP)
- Simple bug fix — overhead doesn't pay off

---

## 10. When to use what: decision tree

```
what do you want to do?
│
├── Add a new feature
│   ├── vague idea, short briefing                → /grill-me first
│   ├── small/medium, spec already clear          → /spec → /pipeline (classic)
│   ├── large/new/ambiguous, will parallelize     → /pipeline-discovery
│   ├── PRD ready in conversation, needs tracker  → /to-prd
│   ├── PRD published, needs breakdown            → /to-issues
│   ├── spec ready, single-layer (only front/back)→ /build → /test
│   └── several features overnight               → /loop --worktree --parallel N
│
├── Fix a bug
│   ├── reproducible, obvious fix    → /build (with regression test)
│   ├── can't explain it             → debugger subagent
│   └── found recurring pattern      → variant-analysis subagent
│
├── Refactor
│   ├── messy code                   → /simplify
│   ├── identify shallow modules     → skill 38 (Architecture Deepener)
│   └── old architecture             → /detective-spec first, then skill 23
│
├── Validate before release
│   ├── final review                 → /review
│   ├── best practices audit         → /best
│   ├── automated security scan      → skill 34 (Static Analysis)
│   └── repo audit                   → /audit-repo
│
├── Work with legacy
│   ├── extract spec                 → /detective-spec
│   ├── identify refactors           → skill 38 (Architecture Deepener)
│   └── large migration              → skill 23 (Migration & Refactor)
│
├── Generate visual assets
│   ├── hero, mascot, illustration   → skill 17 (fal.ai)
│   ├── favicon/PWA/OG for landing   → skill 36 (Web Asset Generator)
│   └── inventory what already exists→ /inventory-assets
│
├── Initial setup in a project
│   ├── first contact                → /audit-repo
│   ├── install kit in .bot/         → /devkit-install-fv
│   └── generate CLAUDE.md           → skill 28
│
├── Kit maintenance
│   ├── add new skill                → skill 35 (Skill Author)
│   ├── audit skill quality          → skill 35 with scorecard
│   └── review old policies          → skill 35 + manual review
│
└── Deploy / release
    ├── patch/minor release          → /ship
    ├── missing changelog            → skill 24 (Release Manager)
    └── rollback plan                → skill 20 (Observability) + 07 (Deploy)
```

---

## 11. Inspiration and attribution

The kit wasn't built from scratch. It was composed from:

### Direct adaptations

- **[mattpocock/skills](https://github.com/mattpocock/skills)** ([AI Hero post](https://www.aihero.dev/5-agent-skills-i-use-every-day)) — `/grill-me`, `/to-prd`, `/to-issues`, skill 37 (TDD Engineer), skill 38 (Architecture Deepener). Adapted for the kit (frontmatter, policy integration, approval gates).
- **[Reversa](https://github.com/sandeco/reversa)** — skill 33 (Detective Spec). Adapted to integrate with Graphify + repo-audit + persistent memory.
- **Strunk & White — Elements of Style** — `policies/writing-clarity.md`. 10 rules adapted for agent output.

### Conceptual inspirations

- **[Anthropic skills ecosystem](https://docs.claude.com/en/docs/claude-code/skills)** — SKILL.md format, frontmatter, description with triggers.
- **[Cursor / Windsurf rules pattern](https://docs.cursor.com/context/rules)** — shared rules conventions.
- **[OpenAI gpt-5.4 prompting guide](https://platform.openai.com/docs/guides/prompt-engineering)** — patterns for Codex/GPT integration.

### Philosophy

- **Vertical slicing** — classic XP/Lean (Kent Beck, "Tracer Bullets" from Hunt & Thomas).
- **Deep modules** — John Ousterhout, *A Philosophy of Software Design*.
- **Anti-rationalization tables** — cognitive bias applied to debugging (Daniel Kahneman style).

---

## Next steps

- Want to try it? Install: `claude plugin install https://github.com/felvieira/claude-skills-fv`
- Want to extend it? Use skill 35 (Skill Author) to add a new skill following the template.
- Want to understand more? Read `AGENTS.md` (universal rules) and `policies/` (shared rules).
- Found a bug? Open an issue: https://github.com/felvieira/claude-skills-fv/issues

**Last consistency audit:** `evals/skill-audit-2026-05-03.md` (22 PASS, 6 NEEDS-REVIEW, 4 NEEDS-REWRITE).
