# Dev Team Kit — Full Wiki

> **Version:** 66 skills · 16 subagents · 45 slash commands · 61 policies · 29 hooks · 22 rules
> **Last updated:** 2026-07-10 (v2.40.0 — skill 53 doubt-driven-review, absorbed from addyosmani/agent-skills. Recent line: v2.35 auto-skillify · v2.36 direct-response-copy · v2.37 ux-research + ebook absorption · v2.38 ui-polish · v2.39 ponytail+repowise+COMPILOT · v2.40 doubt-driven-review)
> **Repo:** https://github.com/felvieira/claude-skills-fv
> **Install:** `claude plugin install https://github.com/felvieira/claude-skills-fv`

> 🇧🇷 **Versão em Português:** [`docs/WIKI.pt-BR.md`](./WIKI.pt-BR.md)

Single-page wiki of the entire kit. Every item follows the format from [5 Agent Skills I Use Every Day](https://www.aihero.dev/5-agent-skills-i-use-every-day) — **name, what it does, when to use, problem it solves, concrete example, takeaway** — but here we cover **everything**: skills + subagents + commands + policies + plugin.

---

## Table of Contents

1. [How the kit works in 60 seconds](#1-how-the-kit-works-in-60-seconds)
2. [The 2 flows: classic vs discovery](#2-the-2-flows-classic-vs-discovery)
3. [Core principle: Vertical Slicing](#3-core-principle-vertical-slicing)
4. [Slash commands (43) — shortcuts by phase](#4-slash-commands-43)
5. [Skills (62) — specialists by category](#5-skills-62)
6. [Subagents (16) — dispatchable via Task tool](#6-subagents-16)
7. [Policies (57) — shared rules](#7-policies-57)
8. [Plugin: how the kit is distributed](#8-plugin-how-the-kit-is-distributed)
9. [MCP server: 37 tools under the hood](#9-mcp-server-37-tools-under-the-hood)
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
| **Organ** | Multi-agent | 16 subagents dispatched via Task tool (`.claude/agents/`) |
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

## 4. Slash commands (43)

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

#### `/swarm` — Total Autonomy (v2.0.0)

**What it does:** prompt → PR in one command. 7 phases: setup (isolated worktree) → PRD/stories → Ralph loop (fresh context PER story) → 4-agent parallel quality review → synthesize → self-fix CRITICAL/HIGH automatically → auto PR creation. Inspired by Ralph loop + fix-github-issue + comprehensive-review from [coleam00/archon](https://github.com/coleam00/archon).
**When to use:** "manda e esquece" — feature complete, GitHub issue fix, refactor with PR. Wants to come back to a ready PR.
**Problem it solves:** `/auto` and `/loop` aren't 100% autonomous — no worktree enforcement, no fresh context per story, no auto-PR. `/swarm` is the missing piece.
**Example:** `/swarm "implement social auth with Google + GitHub"` or `/swarm fix #142` or `/swarm --prd docs/prd/foo.md`
**Takeaway:** **only command that goes from prompt to mergeable PR without human intervention.** In Autonomous mode (Level 3), intent-classifier hook auto-routes feature prompts to `/swarm`. Worktree NEVER deleted automatically — you decide cleanup.

#### Auto-orchestration (v1.8.0)

**What it does:** kit detects intent of your prompt automatically and **suggests the appropriate program** without you having to invoke `/run-program` manually. Hook `intent-classifier` classifies the prompt (6 intent types) and emits `additionalContext` with suggestion. Skill 39 (program-router) confirms via `AskUserQuestion` with options (dry-run / direto / ad-hoc / cancelar).
**When it triggers:** any prompt with > 15 chars that's not informational ("o que é"), trivial ("fix typo"), or already a slash command (`/...`).
**Problem it solves:** v1.7.0 gave the engine; v1.8.0 closes the loop — user doesn't need to remember when to run program vs informal pipeline.
**Example:** Você diz "criar feature de autenticação social" → hook sugere `/run-program spec-driven-development` → skill 39 pergunta como rodar → executa
**Takeaway:** **4 autonomy levels** (manual / passive suggestion / active suggestion / autonomous) configuráveis via hook config.

#### `/run-program` — Execute YAML pipeline programs

**What it does:** parses and executes `programs/<name>.yml` as a declarative pipeline. Steps can be slash commands, **inline prompts**, **bash scripts**, human gates, **loops with `until:` token**, parallel blocks (with `trigger_rule: all_success|one_success|all_done`), or conditionals. Variable substitution via `${inputs.X}` and `${steps.X.output}`. Per-step **`context: fresh`** for isolation, **`provider:` / `model:`** for routing. v1.7.0: 6 step types (command, prompt, bash, gate, loop, parallel, conditional). 7 programs shipped including `adversarial-dev` (GAN-inspired), `comprehensive-review` (5-agent parallel), and `refactor-safely` (baseline tests + behavior preservation, v2.1.0).
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

## 5. Skills (62)

Each skill is a specialty. Has frontmatter with `description` (activation triggers), `allowed-tools` (tool scope), and SKILL.md with protocol. Skill 16 is intentionally absent — its scope was folded into `policies/model-routing.md` to keep model selection rules in one place.

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

**What it does:** generates or adapts visual assets (hero, mascot, illustration, background, layout, icon) via FAL.AI. Single source of truth: `models/image-models.json` (5 models). Executes via `scripts/generate-image.mjs` (zero-dep Node 18+, works on any machine — no Python required).
**When to activate:** project needs a new or derived image. `/swarm` invokes automatically in Phase 2.5 when PRD/stories mention landing/sistema/UI new.
**Problem it solves:** "image here" placeholder on a landing page, and the previous Python dependency that only worked on the author's machine.
**Canonical default rule (v2.16.0):**
- text-to-image (no `--ref`) → **grok-imagine** ($0.020/img)
- edit/refine (with `--ref`) → **gemini-25-flash** ($0.039/img)
- Override only with justification (e.g., `--model gemini-3-pro` for complex typography in OG cards)
**Example:** `node scripts/generate-image.mjs --prompt "minimalist hero" --aspect 16:9 --out public/hero.jpg`
**Takeaway:** **default rule is canonical — no inventing.** Multi-model pipeline (iterate cheap → validate → final) still costs $0.10-$0.50 per hero. 6 consumer skills (02 UI/UX, 04 Frontend, 14 SEO, 19 Asset Librarian, 29 Design Intel, 36 Web Assets) all reference skill 17 for image needs.

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

**What it does:** defines layout, token system, responsiveness, usage heuristics — and audits existing UI in two modes that never mix: audit (no file changes, findings classified as norm/evidence/heuristic/preference, prioritised by severity×reach×frequency×confidence) and implementation (edit scoped to the finding's root cause, only when explicitly authorised). Audit protocol detail in `references/audit-framework.md`; per-surface content in `references/marketing-surfaces.md`, `product-apps.md`, `forms-and-transactions.md`.
**When to activate:** feature with interface; rebranding; new design system; reviewing or fixing existing UI.
**Problem it solves:** UI invented by an agent without criteria becomes inconsistent. Without the dual mode, "take a look at this" turns into an unauthorised edit — the costliest mistake the audit protocol exists to prevent.

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

#### Skill 39 — Program Router

**What it does:** decides which declarative program (`programs/*.yml`) to run based on task classification — a heuristic match against a catalog (pipeline-discovery, spec-driven-development, loop-polishing, detective-spec, adversarial-dev, comprehensive-review). Works in tandem with the `intent-classifier` hook (which suggests) and consults `memory/constitution.md`, which can force a specific pipeline.
**When to activate:** user asks "which program for X"; user requests a feature/review/discovery without an explicit slash command; hook `intent-classifier` already suggested and user wants confirmation; between tasks, when planning the next step.
**Problem it solves:** ad-hoc pipelines get improvised for tasks that already match a proven, declarative program — wasting the structure (gates, dry-run, defined inputs) those programs already encode.
**Distinct from:** Skill 09 (Orchestrator) builds informal pipelines when no program fits; Skill 39 only routes to an existing program and hands off to 09 on low-confidence or decline. The `intent-classifier` hook only suggests — Skill 39 confirms or refutes and dispatches.
**Takeaway:** **never force a program onto an exploratory task** — decline-and-ask beats a wrong match, and the constitution always overrides heuristic classification when it declares a mandatory pipeline.

#### Skill 40 — Parallel Dispatcher

**What it does:** playbook for dispatching N independent slices, reviews, or tasks via parallel subagents without falling into the skill-vs-agent trap. Defines 3 canonical paths — native subagents (Path A), worktree + general-purpose with a skill invoked inside the prompt (Path B), or `/swarm` for full autonomy (Path C) — plus a decision tree, a self-contained prompt template, and 6 registered anti-patterns (passing a skill name as `subagent_type`, mentioning a skill without invoking it, layer-first splitting, sequential messages instead of single-message fan-out, missing `model:` override, missing `isolation: "worktree"`).
**When to activate:** dispatching N vertical slices of a feature, N parallel reviews (code/security/test/prose), a static-analysis pipeline (semgrep + codeql), or any scatter-gather scenario with independent work.
**Problem it solves:** models conflating "skill" (playbook) with "subagent" (isolated turn) — passing a numbered skill directly as `subagent_type` throws `InputValidationError`, and forgetting `model:` or `isolation: "worktree"` causes budget waste or race conditions across worktrees.
**Distinct from:** Skill 09 (Orchestrator) decides *what* pipeline to run; Skill 40 decides *how* to fan out N independent units of that pipeline correctly. Skill 39 (Program Router) picks a `programs/*.yml`; Skill 40 is the dispatch mechanics once parallel work is already decided.
**Takeaway:** never pass a skill name as `subagent_type` — skills load playbooks, agents execute isolated turns; parallelizing a skill means N `general-purpose` agents (each in its own worktree) whose prompt instructs them to invoke the skill internally.

#### Skill 41 — Blog Publisher

**What it does:** end-to-end composer that turns a subject, URL, or raw text into a fully original HTML blog post — writes the body (via skill 13 for voice/tone), sources cover + inline images (skill 17 fal.ai or skill 42 Playwright screenshots), generates a mandatory LinkedIn share block, scaffolds the post via `new-post.mjs`, commits, pushes to the configured blog repo, and returns the live GitHub Pages URL.
**When to activate:** user says "publish a post about X," pastes a URL and says "make a post from this," or pastes finished text and says "turn this into a post."
**Problem it solves:** publishing a post today means writing, sourcing images, wiring up LinkedIn distribution copy, and pushing to the repo as separate manual steps — this collapses all of it into one command with a public URL at the end.
**Distinct from:** skill 13 (Marketing Copy) writes copy only, no publishing; skill 42 supplies screenshots but doesn't compose or publish; editing an existing post uses the Edit tool directly, not this skill.
**Takeaway:** **authorial, never adaptation** — the post must read as if the blog owner wrote it from scratch; crediting the source or leaving any trace of adaptation (e.g. "original source," "according to {author}") is a hard anti-pattern, checked by grep before completion is declared.

#### Skill 42 — Blog Screenshot

**What it does:** captures real screenshots of navigable URLs/elements via Playwright MCP (already in the kit's standard harness) — handles viewport sizing, cookie-banner dismissal, full-page vs. viewport vs. element capture, anchor scrolling, and PNG/JPG output.
**When to activate:** skill 41 (blog-publisher) needs a real image of something browsable rather than a generated one; technical docs need to show an actual site/dashboard UI; before/after visual comparison of a landing page change; capturing a rendered HTML report (e.g. an `analyze-doc/index.html`).
**Problem it solves:** blog posts and docs that reference real UI but end up illustrated with fake or generic mockups instead of what the page actually looks like.
**Distinct from:** skill 17 (image-generator), used for conceptual/abstract images that don't exist to be navigated to; skill 36 (web-asset-generator), used for logos/icons/favicons — neither captures an existing rendered page.
**Takeaway:** always resize the viewport before shooting (Playwright defaults to 1280×720, wrong for a 1500×750 blog cover) and strip cookie banners first — an uncleared overlay in a public screenshot is an easy, embarrassing miss.

#### Skill 43 — Canary Deployment

**What it does:** covers gradual production rollout with continuous metric observation and automatic rollback. Supports three strategies — traffic-based (weighted routing via service mesh/ALB), feature flag (runtime-gated code paths), and blue-green (parallel environment switch) — plus a default metrics table (error rate, p95/p99 latency, conversion, saturation, cost-per-request) with thresholds and abort triggers. Strategy and thresholds adapted from the `/canary` slash command in [garrytan/gstack](https://github.com/garrytan/gstack) (MIT), plus Google SRE Book concepts.
**When to activate:** promoting an already-approved release to production with non-trivial regression risk; validating behavior change on real traffic before full rollout; releasing a feature gradually by user percentage or segment.
**Problem it solves:** deploying an approved artifact still risks blast radius — canary limits exposure by slicing traffic and auto-reverting the moment metrics cross a threshold, instead of an all-or-nothing cutover.
**Distinct from:** Skill 24 (Release Manager) decides *what* ships and writes the changelog; Skill 07 (Deploy/Docker) builds and publishes the artifact; Canary Deployment only manipulates routing/flags on an already-built, already-approved artifact and owns the "how" of exposure. Skill 20 (Observability SRE) supplies the dashboards/SLOs canary depends on and leads postmortems after a rollback.
**Takeaway:** rollback is not optional cleanup — it's gated by pre-tested runbooks (< 5 min) and automatic triggers (2+ consecutive broken samples, external page, manual abort, step timeout); a canary without observability lag < 60s degrades into a blind bet.

#### Skill 44 — Zoom Out

**What it does:** produces a module-and-caller map before touching code in an unfamiliar area — "neighborhood view" instead of diving straight into files. Prefers `graphify-out/graph.json` + `GRAPH_REPORT.md` over raw Grep/Read (per the global graph-first policy); falls back to Glob-based structural discovery (entry points, folder groupings, large hub files) plus caller/callee tracing via Grep when no graph exists. Adapted from [mattpocock/skills/engineering/zoom-out](https://github.com/mattpocock/skills/tree/main/skills/engineering/zoom-out) (MIT).
**When to activate:** starting work in a module the agent doesn't know well; the user says "I'm lost in this code"; before proposing a refactor or architecture change (feeds skill 38); before raw Grep/Read exploration; as a prelude to skill 33 (Detective Spec) in legacy code.
**Problem it solves:** agents that start editing an unfamiliar module immediately tend to miss callers, duplicate existing logic, or break conventions — because they never built a mental map of how the area fits together before touching it.
**Distinct from:** skill 18 (Repo Auditor) profiles the whole repo once for stack/conventions/risk; skill 44 maps one specific area on demand, using the domain vocabulary from the constitution/audit rather than generic terms. Skill 38 (Architecture Deepener) proposes structural fixes; 44 only maps, it doesn't judge or refactor.
**Takeaway:** **produce the map while exploring, not after** — a full `find . -name "*.ts"` dump is not a map, it's avoidance; the map must speak the project's own vocabulary, not generic terms.

#### Skill 45 — Handoff Context

**What it does:** produces a prospective handoff package for another agent, model, or human dev to pick up the task with zero session context — snapshot of git state, verified pendencies (tests/build/TODOs), one concrete next step, and known pitfalls. Adapted from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/handoff) (MIT), explicitly distinguished from skill 31 (retrospective).
**When to activate:** stopping work with someone else continuing tomorrow; context is running out and a fresh session is imminent; delegating to an external agent (codex:rescue, freelancer, another team); handing off between skills in the pipeline.
**Problem it solves:** "continue where I left off" with no stated destination — the next person re-explores state that was already known, or repeats a dead end already ruled out.
**Distinct from:** skill 31 (session-summary) is retrospective (what was done, for the same model/session); skill 45 is prospective (what's left + how to continue, for a blind reader) — session-summary logs, handoff-context delegates.
**Takeaway:** **one next step, not a roadmap** — output is a single actionable command/edit with expected result and success criterion, saved to `docs/handoffs/YYYY-MM-DD-<slug>.md`.

#### Skill 46 — Post-Deploy Canary Monitor

**What it does:** watches production after a deploy closes 100%, comparing live metrics and screenshots against a pre-deploy baseline to catch silent regressions (console errors, perf drops, broken pages). Adapted from [gstack/canary](https://github.com/garrytan/gstack/tree/main/canary) (MIT, Garry Tan), retargeted to the post-rollout window instead of the gradual-rollout window.
**When to activate:** immediately after a deploy hits 100% rollout, for the first 2-24h; large-risk changes (migration, refactor, framework upgrade); projects without robust observability already covering this gap.
**Problem it solves:** "passed canary at 5%" does not mean "healthy at 100%" — silent regressions that only show up under full traffic go undetected without an active post-deploy watch.
**Distinct from:** Skill 43 (canary-deployment) operates *during* the 0%→100% rollout and decides promote-vs-abort on the deploy itself; this skill starts only once rollout is complete and decides keep-vs-rollback on production, escalating to skill 43 or skill 24 (release-manager) if it aborts.
**Takeaway:** never auto-rollback by default — production reversal is a human decision; this skill only detects, logs to `docs/canary-runs/`, and escalates after 2 consecutive failed checks.

#### Skill 47 — Pattern Conformity

**What it does:** Extracts the existing codebase's concrete coding conventions — naming, file structure, error handling, testing style, imports, API design, async patterns, DI — from representative sample files, and saves them as a "code style map" in `memory/patterns.md` (14-day cache, refreshed with `--update`). Every code-generation skill then consults this map as a hard constraint before writing new code.
**When to activate:** Starting a feature in an established codebase with existing conventions; before generating a new module, service, test, hook, or component; when the user says "code like the rest," "follow the pattern," "don't reinvent"; as a prerequisite for skills 01, 02, 03.
**Problem it solves:** Agents that ignore existing project conventions produce code that is technically correct but architecturally dissonant — quietly accumulating soft technical debt. This skill forces "code with the project's accent" instead of the agent's default style.
**Distinct from:** Skill 18 (repo-auditor) captures stack/frameworks/risks in `docs/repo-audit/current.md` — a snapshot, not enforceable style rules. Skill 33 (detective-spec) extracts implicit business rules, not coding conventions. Skill 44 (zoom-out) maps modules and callers, not code style. Only skill 47 outputs concrete, consultable style constraints (`memory/patterns.md`).
**Takeaway:** Skill 18 tells you "the project uses NestJS + TypeORM"; skill 47 tells you "services inject repositories via constructor, public methods are always `async`, errors are thrown as `AppException(code, message)`" — and blocks new code that deviates without a justified, commented exception.

#### Skill 48 — Research Prep

**What it does:** collects and organizes multi-source technical information before writing docs, PRDs, ADRs or articles — searches official docs, GitHub (repos + issues), Stack Overflow, papers and reference engineering blogs. Ranks sources by an authority score (official 40% + recency 30% + depth 20% + community 10%) and discards anything scoring below 4.0. Output is a structured `memory/research/<slug>.md` dossier. Adapted from [addozhang/openclaw-forge](https://github.com/addozhang/openclaw-forge) (MIT).
**When to activate:** before writing a technical doc, ADR, article or PRD about an unfamiliar technology; when comparing alternatives (frameworks, libs, architectural approaches); during technical due diligence ("should we adopt X?"); as a prerequisite for skills 10 (documenter), 01 (po-feature-spec), 26 (prompt-engineer), 41 (blog-publisher).
**Problem it solves:** writing without researching is opinion without evidence — this skill forces a cited, ranked source base to exist before any production skill starts drafting.
**Distinct from:** Skill 18 (repo-auditor) maps the current project's own stack; Skill 29 (design-intelligence) benchmarks competitor product/UX, not technical sources; Skill 33 (detective-spec) extracts business rules from legacy code, not external references. Skill 48 is the only one ranking external technical sources by authority.
**Takeaway:** a source with score below 4.0 is noise, not signal — cache results for 7 days to avoid re-researching the same topic on every request.

#### Skill 49 — Context Budget

**What it does:** audits loaded context weight — CLAUDE.md (global + project), agents/*.md descriptions, active MCP server descriptions, path-scoped rules triggered, skills invoked this session, and accumulated conversation history. Estimates tokens per component, reports headroom available, and emits overflow alerts at 80%/95% thresholds.
**When to activate:** session feels slow or responses degrade (possible context overflow); after enabling a new MCP server; before `/swarm` or `/loop --parallel`; repo with `.bot/` installed.
**Problem it solves:** invisible context bloat — you don't know which component is eating 40% of your window until it starts degrading responses.
**Distinct from:** Skill 30 (Cost Tracker) tracks runtime completion costs; Context Budget tracks what's loaded before any completion.
**Takeaway:** agents/*.md descriptions are often the biggest fixed cost — 16 agents × ~500 tokens each = 8k tokens always present.

#### Skill 50 — Direct Response Copy

**What it does:** direct response copywriting — ads, sales pages, sales emails, Instagram captions, VSL scripts. Ships a headline formula library in 20 trigger categories (357 classic PT-BR models distilled into parameterized formulas), the 8 mental triggers (scarcity, urgency, authority, reciprocity, social proof, reason-why, anticipation, pain×pleasure) with sales storytelling structure, and Instagram engagement copy. Hard integrity gate: every claim must be verifiable, no fabricated testimonials, scarcity/urgency only when real.
**When to activate:** writing ad headlines/creatives, launch email sequences, info-product sales pages, Instagram captions with interaction CTAs; choosing the right mental trigger for the avatar's awareness stage.
**Problem it solves:** sales copy written straight from the offer with no avatar research and no trigger strategy — generic headlines that convert nothing, or worse, unverifiable claims that burn the brand.
**Distinct from:** Skill 13 (Marketing Copy) covers product copy — structural landing pages, microcopy, brand voice. Skill 50 covers direct response — the reader clicks/signs up/buys now or the piece failed.
**Takeaway:** **the formula is the skeleton, the avatar research is the flesh, and the integrity gate is non-negotiable** — a `{slot}` filled with an unprovable claim doesn't ship.

#### Skill 51 — UX Research

**What it does:** qualitative discovery — user interviews, research-based personas, journey/empathy maps, qualitative usability testing, information architecture, card sorting, value proposition. Produces the research artifacts that feed the PO (01) and UI/UX (02). Distilled from Fabricio Teixeira's *UX Design* (Casa do Código).
**When to activate:** uncertainty about who the user is or whether a problem is worth solving; scripting an interview; building a persona from real data; mapping a journey; planning a usability test.
**Problem it solves:** the team designs from its own intuition — but "you are not the user." Personas get invented as decorative fiction; features get built for nobody.
**Distinct from:** Skill 02 (UI/UX) draws the interface *from* research; 51 produces the research. Skill 22 (a11y technical), 29 (visual competitive), 21 (quantitative instrumentation) are explicit non-goals.
**Takeaway:** **research that can't change a decision is theater** — and a persona with no interview behind it is a proto-persona, flagged as hypothesis, not fact. Pipeline: Problem → [51] → PO (01) → UI/UX (02).

#### Skill 52 — UI Polish

**What it does:** the small visual-detail pass that makes a built component feel refined instead of "fine" — concentric border radius, optical alignment, shadows over borders, interruptible animations, split/stagger enter, subtle exit, contextual icon animation (exact values: scale 0.25→1, blur 4px→0, spring bounce 0), font smoothing, tabular numbers, text wrapping (balance/pretty), image outlines (pure black/white, never tinted), scale-on-press (0.96), skip-animation-on-load, no `transition: all`, sparing `will-change`, 40×40px minimum hit area. Absorbed from the external agent skill [jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) (MIT).
**When to activate:** reviewing or polishing a component after Frontend (04) and/or Motion Design (12) already built it; subjective feedback like "feels off" or "needs polish"; final pass before Reviewer (11).
**Problem it solves:** components that are functionally correct but feel generic — mismatched nested radii, borders that don't adapt to backgrounds, jarring enter/exit animations, layout-shifting numbers, tiny hit targets.
**Distinct from:** Skill 12 (Motion Design) owns the animation token system and orchestration at scale; 52 is pointed, pass/fail detail fixes, including on motion. Skill 02 (UI/UX) defines structure and aesthetic anchor; 52 checks execution didn't drift from it. Skill 04 (Frontend) owns component logic/state; 52 never touches it.
**Takeaway:** **interfaces rarely fail from one big thing — they fail from a dozen small mismatches compounding.** Output is always a Before/After markdown table grouped by principle, plus a review checklist.

#### Skill 53 — Doubt-Driven Review

**What it does:** in-flight adversarial review for non-trivial decisions — distinct from Skill 11's post-hoc PR/deploy gate. Five-step bounded loop: CLAIM (name the decision + why it matters, 2-3 lines) → EXTRACT (smallest reviewable unit — artifact + contract, stripped of reasoning) → DOUBT (dispatch a fresh-context reviewer via the `Agent` tool with an adversarial prompt — "find issues," never "is this good?") → RECONCILE (classify every finding in precedence order: contract-misread / valid-actionable / valid-trade-off / noise) → STOP (trivial findings, 3 cycles, or explicit user override). Hard rule: never pass the CLAIM to the reviewer — only ARTIFACT + CONTRACT, or the reviewer's independence is biased toward agreement. Absorbed from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT, 76.7k stars), skill `doubt-driven-development`.
**When to activate:** about to make an architectural decision under uncertainty; about to commit non-trivial code (branching logic, module/service boundary crossing, unverifiable properties like thread-safety); about to assert a non-obvious fact ("this is safe," "this scales"); working in unfamiliar code.
**Problem it solves:** a confident answer is not a correct one — long sessions quietly turn assumptions into "facts," and by PR time (Skill 11's gate) course-correction is expensive. This skill catches wrong directions early, while they're still cheap to fix.
**Distinct from:** Skill 11 (Reviewer) is a verdict on a finished artifact; 53 is a posture applied per-decision, mid-flight. Skill 40 (Parallel Dispatcher) supplies the dispatch mechanics 53 consumes (`Agent` tool, `subagent_type: code-reviewer`) — 53 never invokes a skill from inside the spawned subagent, and is explicitly scoped to the main-session orchestrator, not to be called from inside another subagent (nested-spawn is the anti-pattern `policies/skills-vs-agents.md` forbids).
**Takeaway:** **the reviewer's output is data, not verdict — you're still the orchestrator.** Reclassifying every finding against the artifact text (not rubber-stamping) is what separates real doubt from doubt theater; three unresolved cycles is information about the artifact, not a reason to grind a fourth alone.

#### Skill 54 — Video Analysis

**What it does:** extracts structured information from video — transcript, scene breakdown, on-screen text, UI flows demonstrated in a screen recording — and turns it into something the pipeline can consume (a spec, a bug report, a set of UX findings).
**When to activate:** a bug arrives as a screen recording; a competitor demo needs analysing; a user-session recording holds the answer to why a flow is abandoned.
**Problem it solves:** video is opaque to the rest of the kit. Without this step, whoever watches it has to transcribe the findings by hand, and detail is lost between watching and writing.

#### Skill 55 — Marketing Reporting & Analytics

**What it does:** marketing analytics operations — Ads/GA4 performance report structure (ROAS/CPA/CTR formulas, sections adapted to the audience), a 4-phase GA4+GTM technical setup checklist ("configured" only after Phase 4 validation, not at tag install), an 8-category marketing data-infrastructure audit with PASS/FAIL/PARTIAL plus severity, and CAC-payback/ROI/ROAS calculators using fully-loaded cost and churn-adjusted payback.
**When to activate:** a campaign report is due; GA4/GTM needs configuring or auditing; someone asks whether acquisition spend is paying back.
**Distinct from:** Skill 21 (Data Analytics) defines what to track *inside the product*; 55 configures and audits the *marketing tool* and the financial return. Skill 59 owns the click→revenue chain end to end.

#### Skill 56 — Responsive Conversion

**What it does:** converts desktop-first UI into working mobile UI, and owns the interaction patterns that conversion exposes. Symptom→root-cause→fix catalogue (`min-width: auto` as the actual reason a flex/grid child "won't fill 100%", `dvh` vs `vh`, `env(safe-area-inset-*)` for notch and gesture bar, horizontal-scroll hunting), a 4-phase audit protocol tested at 320/390/768px, a modal vs. bottom-sheet decision table with non-negotiables (focus trap, focus return, iOS-safe scroll lock), and destructive-action patterns keyed to reversibility.
**When to activate:** a component doesn't fill its container, content is cut off, horizontal scroll appeared, a modal overflows the viewport, or a web UI needs a mobile version.
**Distinct from:** Skill 02 decides how an interface *will* look before it exists; 56 fixes one that already exists and broke.

#### Skill 57 — Mobile UX Foundations

**What it does:** the decisions that precede layout, each grounded in biometric or physiological data rather than taste — thumb-zone ergonomics (where navigation may live, why a destructive action belongs in the hard-to-reach corner), dark-mode physiology (`#121212` as base, never pure black: halation, OLED smearing, dead elevation), perceived performance (the 100ms/1s/10s thresholds; skeleton between 1–10s, nothing below 1s), auth/onboarding UX (passkeys, NIST SP 800-63B against draconian password rules, permission priming), and the onboarding-pattern taxonomy keyed to the activation moment.
**When to activate:** before choosing where navigation goes, before picking dark-mode surfaces, when users abandon on first use, or when the app "feels slow" without being slow.

#### Skill 58 — i18n & Localization

**What it does:** prepares a product for another language, region or writing direction *before* a translator exists — string externalisation with semantic keys, plural via the platform API (two forms work in pt/en and break in Russian and Arabic), locale formatters over canonical storage, +30% text expansion as the test floor, logical properties for RTL (including what must **not** mirror: numbers, logos, media icons), and pseudolocale/RTL as regression tests.
**When to activate:** before fixing button widths, alignment or date formats — even in a product that is pt-BR only today.
**Problem it solves:** i18n is architecture work, not translator work. A concatenated sentence, a fixed-width button, a hand-built date and `margin-left` all break on contact with another language, and no translator can fix any of them.

#### Skill 59 — Closed-Loop Revenue

**What it does:** closes the chain from paid click to margin — identity (GCLID/UTM/`transaction_id`/CRM, each with one job and not interchangeable), backend as the source of revenue truth (a client-side `purchase` misses async payments, double-fires on refresh and dies to blockers), reconciliation with a **declared tolerance** that blocks media scaling when exceeded, and the arithmetic that changes decisions: break-even ROAS = 1 / contribution margin.
**When to activate:** analytics revenue doesn't match the backend; deciding whether a campaign is actually profitable; lead-gen bidding is learning from submitted forms instead of closed deals.
**Takeaway:** **at a 40% margin, a ROAS of 2.0 looks green on the dashboard and destroys value.**

#### Skill 60 — App Reference Architecture

**What it does:** a blueprint for new apps that need login + payment + push + web + Android APK from a single Next.js + Tauri v2 codebase, reverse-engineered from three of the author's production apps. Covers dual auth (cookie session for web, Bearer JWT or Supabase token for the Tauri app, resolved by one central function per route), the static-export build problem (a script that renames — never deletes — Server Actions and `getServerSession()` layouts before `next build --output export`, restoring in a `finally`), dual payment (Stripe + Google Play Billing, mandatory by Play Store policy for in-APK subscriptions), dual push, and a decision table turning the three source apps' divergences into explicit choices.
**When to activate:** starting an app of this shape, rather than re-deriving auth, payment, push and Tauri build from scratch.

#### Skill 61 — Content Growth Engine

**What it does:** content strategy as an acquisition system rather than a publishing calendar, in six phases (Discover, Create, Optimise, Parallel, High-impact, Measure). Prioritises by **commercial intent, not search volume** (50 searches from a buying director beat 5,000 from a student — volume sizes the effort, intent sets the order) and **starts at the bottom of the funnel**, where 100 visits convert what 10,000 top-of-funnel visits do not. Includes a reproducible AI-citation baseline (fixed prompt set, clean sessions, dated per model — changing the prompts voids the time series), a reserved 30–40% refresh quota, sales-call objections as the bottom-funnel content source, and cadence sized against real capacity.
**When to activate:** building a content plan from scratch; prioritising a backlog bigger than production capacity; deciding whether to publish new or refresh old; traffic grew but pipeline didn't.
**Distinct from:** it decides *what to produce and in what order*. Schema and markup belong to Skill 14, copy to 13/50, publishing to 41, revenue instrumentation to 59.
**Takeaway:** **traffic is not the product — pipeline is.** Sessions are excluded from the six-month success metrics on purpose: they rise on their own and pay no salaries.

#### Skill 62 — Persona-Driven Issue Audit

**What it does:** mass-audits an existing product via simulated personas, end to end to PR, and runs even with zero personas pre-written — absent a primary source, it infers 3 to 5 proto-personas from the repository itself (routes, forms, error copy, README, locale), tags each with its source (`inferred-from-repo`/`real-research`/`hand-written`), and offers a non-blocking human confirmation window. A tester agent impersonates each persona (technical, non-technical, low-familiarity, adversarial) against a live environment, opens a deduplicated issue per real friction (route + root cause as the dedup key, not title — title varies by persona, route doesn't), a solution-analysis agent comments cause and trade-offs per issue without fixing anything, a fleet of up to 10 fresh-context agents each takes one issue and either opens a PR (high confidence) or comments `wontfix`/`needs-human` with a specific reason (low confidence), a reviewer approves or rejects each PR with the same bar as any other PR, and what survives goes to a light human triage before distribution to the team.
**When to activate:** a product needs a broad usability/navigation sweep before a milestone; suspicion that UX bugs are being missed because QA only tests the happy path of one technical profile; findings volume would make item-by-item human review the bottleneck.
**Distinct from:** `/swarm` builds a *new* feature from spec, story by story; this skill audits an *existing* product, persona → issue rather than story. Skill 06 owns any security finding surfaced along the way — never mixed into the same issue as a UX finding. Skill 11's approval criteria apply unchanged in the review phase; this skill only decides the volume and confidence cut that reaches it.
**Problem it solves:** turning an exploratory audit into 100 tracked issues is easy; turning it into signal without making review the new bottleneck is the actual problem. The funnel — not the raw issue count — is the point: each phase exists so the next one receives less, with more context.
**Takeaway:** **an approved PR is not a merged PR.** Merge stays a human decision, same rule as `/swarm`'s `--auto-merge`.

#### Skill 63 — Mobile Paywall & Checkout

**What it does:** UI/UX for plan selection and payment checkout in mobile apps — periodicity, plan, coupon, Google Play Billing, Google Pay, and external PSPs (Stripe, Mercado Pago). Owns the billing-architecture decision (when Play Billing is required vs. when an external PSP is allowed — not a purely visual call), the flow periodicity → plan → coupon → pay → authenticate → confirm, target-plan hierarchy without manipulation, payment states (processing/3DS/pending/succeeded/failed) with the rule that "returned from 3DS" is neither approved nor declined by itself, and the coupon field defaulting to collapsed (a visible field signals a better price exists and sends coupon-less users hunting for one — Baymard's checkout research). Detailed guide split across 8 files in `docs/skill-guides/mobile-paywall-checkout/`.
**When to activate:** designing or reviewing a subscription/plan-selection screen; deciding Play Billing vs. Stripe vs. Mercado Pago; positioning the coupon field; specifying payment states and 3DS recovery.
**Distinct from:** Skill 60 owns the backend data model (unified `Subscription` table, RTDN, reconciliation) — skill 63 consumes it for UI decisions, never duplicates the schema. `skills/02-ui-ux-design/references/marketing-surfaces.md` covers the *public* pricing page with no real transaction; skill 63 is the in-app paywall with a real `PaymentSheet`/purchase sheet behind it.
**Takeaway:** **a Google Play promo code and a merchant coupon are not the same thing** — Play promo codes grant a free trial, not a generic "25% off" engine; showing "25% applied" in the UI when the purchase sheet is about to charge full price breaks trust and violates Play's price-consistency requirement.

#### Skill 64 — Scroll Storytelling

[Omitted long context line]
**When to activate:** a landing page or full site framed as a scroll journey (not just a section with fade-in); "Apple-style landing page" or a cited reference site of that kind; a video/image sequence that must scrub frame-by-frame as the user scrolls; section pinning, horizontal pan, or a continuous "world" the scroll travels through.
**Distinct from:** skill 12 (motion-design) owns generic easing/spring mechanics and motion tokens — skill 64 consumes them for UI timing but decides the full page architecture (structure, narrative journey, per-section device variety, page grammar). Skill 02 (ui-ux-design) owns palette/typography/aesthetic-anchor decisions from scratch — skill 64 consumes that output to pick the "world" (see `references/worlds.md`).
**Takeaway:** **five sections that behave identically are one section shown five times** — a page built entirely from one repeated device (same clay diorama, same centered text, same `01/06` counter, same blinking "scroll to explore") is recognizable from across the room; variety per journey beat is the actual product, enforced by a mandatory 8-question interview before generating anything.

#### Skill 65 — Using Git Worktrees

[Omitted long context line]
**When to activate:** before executing an implementation plan that could conflict with the current branch; the user asks for parallel work without touching the current workspace; uncertainty about whether the session is already inside an isolated worktree (risk of nesting one worktree inside another).
**Distinct from:** `commands/worktree.md` stays the lean dispatcher (create worktree, copy `.env*`, run install/lint in background) — skill 65 is the full protocol invoked when the extra guarantees matter: isolation detection with a submodule guard, native-tool preference (`EnterWorktree`/`ExitWorktree` before raw `git worktree add`), and a mandatory test baseline before releasing the task.
**Takeaway:** **a dirty baseline makes every later failure ambiguous** — skipping the baseline-test step means a bug the task introduces can't be told apart from one that was already there; detecting existing isolation first (via `git rev-parse --git-dir` vs `--git-common-dir`, guarded against false positives inside submodules) prevents nesting a worktree inside a worktree by accident.

#### Skill 66 — Game Architecture Design

[Omitted long context line]
**When to activate:** designing a new game system (combat, skill, AI, narrative, UI, procedural generation) before writing any engine code; choosing between architecture paradigms (rich-entity vs data-driven vs throwaway prototype); critically reviewing a GDD, mechanic, level, or economy for what's weak, risky, or unvalidated; modeling balance numbers (damage, cost, drop rate, XP curve) that need to be defensible, not guessed.
**Distinct from:** skill 67 (game-engine-development) owns the actual Unity C#/Unreal C++ code — skill 66 decides *what* to build and *why*, delivering the architectural decision and the numbers; it never generates engine code itself.
**Takeaway:** **the two source repos investigated for game dev had opposite license profiles** — the design/architecture source had real depth (17-26 references per skill) but no declared license, so this skill's content is entirely original writing inspired by the *gap*, not ported text; the engine-code source (skill 67) was MIT, so that one *did* port real code with attribution. Same investigation, two different absorption rules depending on what each source actually allowed.

#### Skill 67 — Game Engine Development

[Omitted long context line]
**When to activate:** implementing a game system in Unity (C#) — MonoBehaviour, ScriptableObject, pooling, state management; implementing one in Unreal Engine (C++) — Actor, Component, UPROPERTY/UFUNCTION exposed to Blueprint; applying a specific game design pattern (ECS, state machine, object pooling, spatial partitioning); optimizing performance (draw calls, garbage-collection pressure, LOD/culling, profiling); implementing multiplayer networking (server-authoritative architecture, client prediction, lag compensation).
**Distinct from:** skill 66 (game-architecture-design) owns the design decision and the balance numbers — skill 67 only builds; it does not decide what system to build or why.
**Takeaway:** **don't fake coverage a source doesn't have** — the MIT source this skill ports from ([Jeffallan/claude-skills](https://github.com/Jeffallan/claude-skills)) covers Unity and Unreal with real production code, but has zero Godot content anywhere in the repository; the skill says so explicitly in a "Cobertura de Godot" section instead of quietly answering Godot questions with Unity-flavored guesses.

---

## 6. Subagents (16)

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

### Content (1)

#### `anti-ai-writing`
Reviews prose (docs, PRDs, copy, changelogs, code comments) for the 29 AI-generated writing patterns. Mirror of skill `41-blog-publisher` / `/humanize`. Read + Write so it can flag inline. **Tools:** Read, Grep, Glob, Write.

### Quality (1)

#### `silent-failure-hunter`
Review-only agent with zero tolerance for silent failures: empty `catch{}`, errors converted to `null`/`[]` without context, `.catch(() => [])` fallbacks that hide failure, lost stack traces, generic rethrows, missing async/rollback handling. Narrow, deep lens that `code-reviewer` and `security-auditor` don't target specifically. Reports findings (location/severity/impact/fix); doesn't fix. Adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC). **Tools:** Read, Grep, Glob, Bash.

---

## 7. Policies (57)

Policies are shared rules that govern skill behavior. Every skill cites the policies it follows. **Top 5 most important:**

#### `tool-safety.md`
Minimum-privilege tools. Risk classes (low/medium/high). Mandatory approval for high risk. **Why it matters:** an agent running a destructive command without confirming = problem.

#### `vertical-slices.md`
Every multi-layer feature delivered as a vertical slice (DB+back+front+e2e), never layered. **Why it matters:** layered slicing parallelizes tasks but delays integration.

#### `quality-gates.md`
Critical/High open = no merge. Reviewer + QA + Security are gates, not suggestions. **Why it matters:** an enforced gate is what separates production code from hobby code.

#### `model-routing.md`
Haiku for boilerplate, Sonnet for implementation, Opus for architecture. Replaces what would have been skill 16 (llm-selector) — model selection lives as policy, not as a separate skill. **Why it matters:** Opus to generate `import x from 'y'` burns money.

#### `writing-clarity.md`
10 Strunk rules adapted for agent output. Active voice, no filler words, short sentences. Applies to commits, error messages, handoffs, slash command output, docs. **Why it matters:** LLM-style fluffy prose burns tokens and reading time.

### Remaining policies

| Policy | What it does |
|---|---|
| `anti-rationalization.md` | Combats agent cognitive biases ("this looks ok") |
| `code-exploration.md` | How to explore codebase efficiently in tokens |
| `confusion-management.md` | STOP-NAME-OPTIONS-WAIT when requirement is ambiguous |
| `context-engineering.md` | 5-level hierarchy + 3 trust levels for context management |
| `cost-optimization.md` | Practices to reduce API cost (+ shell commands compressed table) |
| `dense-output-mode.md` | Response density proportional to question. DENSE/NORMAL/EXPANDED modes + 7 inline flags + off-switch |
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
- **66 skills** in `skills/NN-name/SKILL.md`
- **16 agents** in `.claude/agents/<name>.md`
- **23 commands** in `.claude/commands/<name>.md` (cc-format) + `commands/<name>.md` (kit-format)
- **hooks** in `hooks/hooks.json` (lifecycle: SessionStart, PreToolUse, PostToolUse, Stop)

### Install modes (3 options)

#### Mode 1 — Global plugin (Claude Code)

```bash
claude plugin install https://github.com/felvieira/claude-skills-fv
```

Installs globally: 66 skills, hooks, 23 commands. Works in any project without additional config. **Does not include:** policies, MCP server, templates, docs (those go in `.bot/`).

#### Mode 2 — Full kit per repo (`/devkit-install-fv`)

With plugin installed, inside the target repo:

```
/devkit-install-fv
```

Installs complete `.bot/`: MCP server (38 tools), policies, templates, docs, hooks, learned-skills, multi-platform configs (Cursor, Windsurf, Copilot, Gemini CLI, OpenCode, Antigravity).

#### Mode 3 — Direct Bash

```bash
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh /path/to/project
```

Supports non-interactive profiles: `--profile lean`, `--no-input`, `--yes`.

### Mode comparison

| What's included | Global plugin | `/devkit-install-fv` | Direct Bash |
|---|:---:|:---:|:---:|
| 66 skills | ✓ | ✓ | ✓ |
| Hooks (lifecycle) | ✓ | ✓ | ✓ |
| Slash commands | ✓ | ✓ | ✓ |
| Policies | ✗ | ✓ | ✓ |
| MCP server (37 tools) | ✗ | ✓ | ✓ |
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

## 9. MCP server: 37 tools under the hood

The kit includes its own **MCP server** (`mcp-server/src/index.ts`) with **37 tools** exposed for any MCP client (Cursor, Windsurf, Gemini CLI, etc).

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

- **[mattpocock/skills](https://github.com/mattpocock/skills)** ([AI Hero post](https://www.aihero.dev/5-agent-skills-i-use-every-day)) — `/grill-me`, `/to-prd`, `/to-issues`, skill 37 (TDD Engineer), skill 38 (Architecture Deepener), skill 43 (zoom-out), skill 44 (handoff-context). Adapted for the kit (frontmatter, policy integration, approval gates).
- **[Reversa](https://github.com/sandeco/reversa)** — skill 33 (Detective Spec). Adapted to integrate with Graphify + repo-audit + persistent memory.
- **[gstack / Garry Tan](https://github.com/garrytan/gstack)** — `policies/boil-the-lake.md` (completeness philosophy adapted from `ETHOS.md`); skill 45 (post-deploy-canary-monitor, adapted from `canary` skill).
- **[ECC / affaan-m](https://github.com/affaan-m/ECC)** — `/instinct-export`, `/instinct-import`, `/instinct-promote`, `/multi-plan`, `/aside`, `/skill-health` (all v2.19.0). Adapted to integrate with `.bot/learned-skills/` (our memory tiers) and skill 40 (parallel-dispatcher).
- **Strunk & White — Elements of Style** — `policies/writing-clarity.md`. 10 rules adapted for agent output.

### External complementary plugins

These cover use cases **outside** the dev-team scope of this kit. We don't absorb them — we point you to them.

- **[anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)** (Anthropic, Apache-2.0) — 11 official plugins for **non-dev roles**: sales, legal, finance, marketing, customer-support, data, bio-research, HR, product-management, operations, productivity. Install: `claude plugin marketplace add anthropics/knowledge-work-plugins`.
- **[mukul975/Anthropic-Cybersecurity-Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)** (Apache-2.0) — **754 cybersecurity skills** mapped to MITRE ATT&CK / NIST CSF 2.0 / D3FEND / NIST AI RMF / OWASP. Use as a deep complement to our skill 06 (security-review) and skill 34 (static-analysis) for forensics, AD attack/defense, malware analysis, APT hunting. Standard: `agentskills.io` (see `docs/inspiration/agentskills-io-evaluation.md`).
- **[ruvnet/ruflo](https://github.com/ruvnet/ruflo)** (MIT) — Full multi-agent orchestration platform with 98 agents, 314 MCP tools, 33 plugins, federation, self-learning swarm intelligence. Recommended when you need cross-machine agent coordination or production-grade swarm orchestration. See lessons learned in `docs/inspiration/ruflo-evaluation.md`.

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
