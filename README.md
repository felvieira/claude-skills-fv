<p align="center">
  <img src="banner.png" alt="Dev Team Kit"/>
</p>

> 🇧🇷 [Versão em Português](README.pt-BR.md) · 🌎 English version

# Dev Team Kit — 37 Specialist Skills for Coding Agents

![Version](https://img.shields.io/badge/version-1.5.2-0f766e)
![Skills](https://img.shields.io/badge/skills-37-1d4ed8)
![Plugin](https://img.shields.io/badge/Claude%20Code-plugin-f59e0b)
![License](https://img.shields.io/badge/license-MIT-7c3aed)

> A complete team of software specialists inside your coding agent.  
> Every task is routed to the right specialist, run on the right model, and shipped at production quality.

---

### 📖 Full Wiki — recommended starting point

| Language | Link |
|---|---|
| 🌎 **English** | [`docs/WIKI.md`](docs/WIKI.md) |
| 🇧🇷 **Português** | [`docs/WIKI.pt-BR.md`](docs/WIKI.pt-BR.md) |

Every skill, subagent, command, policy, plugin and MCP tool documented — in the format of [aihero.dev's "5 Agent Skills I Use Every Day"](https://www.aihero.dev/5-agent-skills-i-use-every-day).

---

## Why It Matters (For Anyone)

If you use AI to build product — whether you're an experienced dev, an indie hacker shipping SaaS, or someone who only knows how to describe what they want — this kit changes the game. In plain language, here's what it does:

### 💰 Saves your API bill (up to 70%)
AI loves to read everything: the entire output of an `npm install`, repeated stack traces, huge file lists. All of that turns into tokens, which turn into money. The kit **automatically compresses** that noise before sending it to the model — you only pay for what matters.

### 🧠 Understands what you want before it starts coding
Instead of a generic agent that "guesses" the implementation, the kit has an **orchestrator** that reads your request, classifies the complexity, and assembles the minimum sufficient pipeline. If you're vague, it asks. If you're clear, it runs. It never makes things up.

### 🗂️ Persistent memory across sessions
Most agents forget everything when you close the window. This one **remembers**: what you decided, which files matter, the patterns your project follows, the bugs that came up before. Result: less rework, fewer tokens spent re-contextualizing, and far sharper answers each session.

### 🤖 Autonomous mode — fire and forget
Hand off a complex task with `/auto` or `/loop` and go grab a coffee. The agent runs, tests, fixes, validates and **only stops when it's ready, working and tested**. There's a safety circuit: if it gets stuck on the same error 3 times, it detects and warns — no burning API for nothing.

### 🖼️ Professional image generation, no placeholders
Landing page with a gray "image here" box? Never again. The kit integrates **fal.ai** with prompts written by a generative-AI specialist — you describe the scene, the system translates it into a technical prompt, and delivers production-ready images. Illustrations, hero images, icons, mockups, all consistent with your brand.

### 🔒 Security before deploy, not after the leak
A **security auditor** thinks like an attacker and reviews the code before it reaches production. Critical findings come with a proof of concept. No more discovering vulnerabilities on the customer's account.

### 🧪 Tests that actually prove it works
A **QA engineer** that follows the "prove-it" principle: if you say it works, prove it with a test. No "looks ok". Covers happy path, failure paths, edge cases and regressions.

### 🎨 Design and copy that sell
- **Designer** with competitive analysis: looks at competitors and recommends what converts
- **Copywriter** specialized in marketing: ready-to-ship copy for landing pages, email, ads
- **SEO** that optimizes before Google indexes — your site is born findable

### 🚀 From zero to deploy without hiring 5 freelancers
Backend, frontend, mobile (Tauri), observability, analytics, accessibility (WCAG), refactoring, release, documentation — **37 specialists in total**. Each task goes to the right professional, on the right AI model (Haiku for simple, Sonnet for medium, Opus for architecture) — you don't pay Opus to generate boilerplate.

### 🔌 Works with everything you already use
Native **Claude Code** plugin + universal MCP server that runs in **Cursor, Windsurf, Copilot, Gemini CLI** and any MCP-compatible agent. **Zero vendor lock-in.** Switched tools? Your team comes with you.

### 🆓 All free, MIT, open source
No subscription. No trial. No hidden premium tier. Clone it, install it, use it forever — including in commercial projects.

---

## What It Is

The **Dev Team Kit** is a set of 37 specialized skills that turns any compatible coding agent into a complete development team — with orchestrator, backend, frontend, QA, security, deploy, design, copy, SEO, observability and more.

**What you get:**

- **Structured pipeline** — every task goes through the right steps, in the right order, no improvising
- **QA, Security and Reviewer mandatory** — no delivery ships without validation
- **Automatic model routing** — haiku for boilerplate, sonnet for implementation, opus for architecture
- **Lifecycle hooks** — the agent detects vague context, re-reads files before editing, monitors token cost
- **Built-in MCP server** — 36 tools exposed for any MCP client
- **Persistent memory** — working set, context pack, learned skills with confidence scoring accumulated per project
- **Multi-platform install** — Claude Code, Cursor, Windsurf, Copilot, Gemini CLI and more

### Built on Context Engineering principles

The kit's architecture maps to the [context engineering hierarchy](https://github.com/davidkimai/Context-Engineering): individual skills are **atoms**, templates are **molecules**, learned-skills + working-set are **cells**, dispatched subagents are **organs**, and protocol-shell-composed programs are the **emergent field layer**. New in v1.1: typed protocol shells for 3 pilot subagents, I/O schemas in `schemas/skill-io/`, iteration scoring in the auto-loop circuit breaker, and declarative `programs/` definitions. See `docs/WIKI.md → Context Engineering Stack`.

> **5-min tour:** [`docs/SKILLS-OVERVIEW.md`](docs/SKILLS-OVERVIEW.md) — every skill, mode, subagent and policy in one navigable page (aihero.dev format).

---

## Quick Install

### Mode 1 — Global Plugin (Claude Code)

Installs the 37 skills and hooks globally. Works in any project with no extra configuration.

```bash
# Via Claude Code CLI
claude plugin install https://github.com/felvieira/claude-skills-fv
```

What gets installed globally: skills, hooks, commands (`/audit-repo`, `/devkit-install-fv`, `/plan-feature`, `/review-release`, `/inventory-assets`).

### Mode 2 — Full Kit Per Repo (via command)

With the plugin installed, run inside the repo you want to configure:

```
/devkit-install-fv
```

This installs the full `.bot/`: MCP server, policies, templates, docs, hooks, learned-skills and multi-platform configs.

### Mode 3 — Direct Bash

```bash
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh /path/to/project
```

If the kit is already in `.bot/`, you can also run directly from the installed repo:

```bash
bash .bot/setup/install.sh
```

The installer ships `setup/` and every kit directory under `.bot/`. Supports non-interactive profile flags:
- `--profile lean` — installs without MCP and heavy scripts
- `--no-input` — no prompts, uses defaults
- `--yes` — accepts everything automatically

In the table below, treat `dev-team-kit` as 36 tools backed by the 37 skills.
The MCP exposes 36 tools backed by the installed skills.

### Install Modes Compared

| What gets installed | Global Plugin | /devkit-install-fv | Direct Bash |
|---|:---:|:---:|:---:|
| 37 skills | ✅ | ✅ | ✅ |
| Hooks (lifecycle) | ✅ | ✅ | ✅ |
| Slash commands | ✅ | ✅ | ✅ |
| Policies | ❌ | ✅ | ✅ |
| MCP server (36 tools) | ❌ | ✅ | ✅ |
| Handoff templates | ❌ | ✅ | ✅ |
| Docs + repo-audit | ❌ | ✅ | ✅ |
| Multi-platform configs | ❌ | ✅ | ✅ |
| Learned skills per project | ❌ | ✅ | ✅ |

---

## Supported Platforms

| Platform | Skills | Hooks | MCP | Slash Commands | Notes |
|---|:---:|:---:|:---:|:---:|---|
| **Claude Code** | ✅ | ✅ | ✅ | ✅ | full support — native plugin |
| **Cursor** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via AGENTS.md, MCP via config |
| **Windsurf** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via rules, MCP via `.windsurf/mcp.json` |
| **GitHub Copilot** | ✅ via `.bot/` | ❌ | ❌ | ❌ | skills via `.github/copilot-instructions.md` |
| **Gemini CLI** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via GEMINI.md, MCP via `.gemini/settings.json` |
| **OpenCode** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via AGENTS.md |
| **Antigravity** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via local config |

> For platforms without native hooks, the same rules live in `policies/hooks.md` — the agent applies them manually.

---

## The 37 Specialists

### Management and Coordination

| # | Skill | What it does |
|---|---|---|
| 08 | **Context Manager** | tracks focus, open tasks, hot files and handoffs across sessions |
| 09 | **Orchestrator** | defines the minimum sufficient pipeline, delegates to specialists, adapts on rejection |
| 10 | **Documenter** | records decisions, API contracts, operations and impacts in living docs |
| 11 | **Reviewer** | validates the final delta before release — quality, scope and risk |
| 17 | **Image Generator** | generates and adapts visual assets via fal.ai with t2i, i2i, rembg and Tauri icons support |
| 18 | **Repo Auditor** | full snapshot of the repo — stack, conventions, risks, entry points and tech debt |
| 19 | **Asset Librarian** | catalogs logos, icons, fonts, visual tokens and reusable assets |
| 20 | **Observability SRE** | defines structured logs, metrics, tracing, alerts and rollback plan |
| 21 | **Data Analytics** | defines tracking events, naming, funnels and product KPIs |
| 22 | **Accessibility Specialist** | reviews WCAG 2.2, keyboard navigation, HTML semantics and motion reduction |
| 23 | **Migration & Refactor Specialist** | runs incremental migrations, feature flags and safe rollback |
| 24 | **Release Manager** | organizes changelog, release notes, versioning and gradual rollout |
| 25 | **AI Integration Architect** | designs AI adapters, gateways, streaming, fallbacks and inference cost |
| 26 | **Prompt Engineer** | writes and iterates prompts, reusable templates and few-shot strategies |
| 27 | **Video Integration Specialist** | integrates generative video with focus on UX, latency and output formats |
| 28 | **CLAUDE.md Generator** | generates a smart `CLAUDE.md` for projects consuming the kit |
| 30 | **Cost Tracker** | tracks token cost and API calls per session, per skill and per model tier |
| 31 | **Session Summary** | consolidates a session summary for clean handoff between long sessions |
| 32 | **Smart Suggestions** | suggests the next most impactful action based on the project's real state |
| 33 | **Detective Spec** | reverse-engineers executable specs from legacy code — modules, business rules, flows, retroactive ADRs, zero writes outside `_detective_sdd/` |
| 35 | **Skill Author** | meta-skill to create, edit, eval and optimize the kit's own skills — sustains the kit as it grows past 37 specialists |
| 38 | **Architecture Deepener** | finds deepening opportunities (deletion test, deep modules) using domain glossary + architecture vocabulary; pairs with skill 23 (Migration & Refactor) for execution |

### Product and Design

| # | Skill | What it does |
|---|---|---|
| 01 | **PO** | writes spec, user stories, acceptance criteria and sets priority |
| 02 | **UI/UX Designer** | defines layout, token system, responsiveness and usage heuristics |
| 29 | **Design Intelligence** | researches competitors, captures screenshots, analyzes visual trends and ships a strategic dossier for UI/UX |
| 36 | **Web Asset Generator** | favicons (multi-size), PWA icons (incl. maskable), Open Graph and Twitter card images, manifest and meta tag snippets — derived from a logo or brand text |

### Development

| # | Skill | What it does |
|---|---|---|
| 03 | **Backend Engineer** | REST/GraphQL APIs, contracts, auth, validation, database and integrations |
| 04 | **Frontend Engineer** | React/Next.js, state, API calls, performance and app experience |
| 12 | **Motion Designer** | animations, transitions, micro-interactions and coherent visual behavior |
| 15 | **Mobile / Tauri** | optional extension for desktop and mobile apps with Tauri + React Native |

### Content and Discovery

| # | Skill | What it does |
|---|---|---|
| 13 | **Marketing Copy** | product copy, CTAs, landing pages, brand voice and conversion messaging |
| 14 | **SEO Specialist** | metadata, schema.org, Core Web Vitals, sitemap and discoverability |

### Quality and Delivery

| # | Skill | What it does |
|---|---|---|
| 05 | **QA Engineer** | unit, integration, E2E tests, coverage and critical edge cases |
| 06 | **Security Reviewer** | OWASP Top 10, headers, CORS, CSRF, XSS, injection and data exposure |
| 34 | **Static Analysis** | automated security and bug scan via Semgrep + CodeQL with SARIF output, severity triage and CI integration — feeds findings to skill 06 |
| 37 | **TDD Engineer** | red-green-refactor enforced; combats horizontal slicing anti-pattern (writing all tests before all impl); 1 test → 1 impl → repeat. Pairs with skill 38 for deep module identification |
| 07 | **Deploy Engineer** | containerization, CI/CD, blue-green rollout, rollback and infra as code |

---

## Main Pipeline

```mermaid
flowchart LR
    A[Task] --> B[Orchestrator 09]
    B --> C[Context Manager 08]
    B --> D[Minimum sufficient pipeline]
    D --> E[Specialists 01–32]
    E --> F[QA 05 + Security 06 + Reviewer 11]
    F --> G[Deploy 07 or Release 24]
    B --> H[Model routing per step]
```

### Common Pipelines

| Task type | Pipeline |
|---|---|
| Full feature | `PO → UI/UX → Backend → Frontend → Motion → Copy → SEO → QA → Security → Reviewer → Deploy` |
| Bug fix | `Backend → QA → Security → Reviewer → Deploy` |
| Critical hotfix | `Backend → Security → Reviewer → Deploy` |
| UI improvement | `UI/UX → Frontend → Motion → QA → Security → Reviewer → Deploy` |
| Landing page | `Copy → Design Intelligence → UI/UX → Frontend → SEO → QA → Reviewer` |
| AI integration | `Repo Auditor → AI Architect → Prompt Engineer → Backend → Observability → QA → Security → Reviewer` |
| Formal release | `Reviewer → Observability SRE → Release Manager → Deploy` |

---

## Model Routing — Right Model for Each Step

| Tier | Model | When to use |
|---|---|---|
| Fast | haiku | boilerplate, rename, microcopy, templates, formatting |
| Balanced | sonnet | implementation, tests, debug, integration, design |
| Deep | opus | architecture, security review, orchestration, critical decisions |

**Automatic enforcement (Claude Code):**
- `EnterPlanMode` → hook suggests `/model opus`
- `ExitPlanMode` → hook suggests `/model sonnet`
- Subagent without explicit `model` → hook warns and suggests tier by keywords

**On other environments:** follow `policies/model-routing.md` manually.

---

## Hook System — Intelligence on Lifecycle Events

| Hook | Event | What it does | Profile |
|------|-------|--------------|---------|
| `pre-execution-gate` | UserPromptSubmit | detects vague prompt and confirms before acting | standard, strict |
| `keyword-detector` | UserPromptSubmit | injects relevant skill or learned skill automatically | standard, strict |
| `context-guard-stop` | Stop | warns at 50% (non-blocking) and blocks at 75% with smart summary | all |
| `persistent-mode` | Stop | blocks stop while a pipeline is active | all |
| `pre-tool-enforcer` | PreToolUse | re-reads before editing, suggests code intelligence tools | all |
| `session-start` | SessionStart | restores state from previous session and injects skill-discovery | standard, strict |
| `post-tool-verifier` | PostToolUse | detects debugging patterns, suggests extracting a learned skill | standard, strict |
| `model-routing-hook` | PreToolUse | suggests model swap on plan mode and validates subagent spawns | standard, strict |
| `simplify-ignore` | PreToolUse + PostToolUse | protects `simplify-ignore-start/end` blocks from auto-simplification | standard, strict |

### Hook Profiles

Controlled by the env variable `DEVKIT_HOOK_PROFILE` (default: `standard`):

| Profile | Active hooks |
|---------|--------------|
| `minimal` | `context-guard-stop`, `persistent-mode`, `pre-tool-enforcer` |
| `standard` | all |
| `strict` | all |

- **`DEVKIT_HOOK_PROFILE`** — sets the active profile (`minimal`, `standard` or `strict`)
- **`DEVKIT_DISABLED_HOOKS`** — comma-separated list of hookIds to disable regardless of profile

### Context Guard — Strategic Compact

The `context-guard-stop` hook operates on two levels:
- **50%** — non-blocking warning: suggests `/compact` while there's still margin
- **75%** — smart block: shows current task hint, files edited in the session and decisions from the working set before blocking

---

## Subagents — Specialists Dispatchable via the `Task` Tool

The kit ships 14 Claude Code subagents in `.claude/agents/`, ready to dispatch with the `Task` tool or invoke from the prompt.

### Core (5)
| Subagent | When to use | Tools |
|---|---|---|
| `code-reviewer` | PR review, finished feature or any code before merge | Read, Grep, Glob, Bash |
| `security-auditor` | Auth flows, input handling, deps, CORS, headers, pre-deploy | Read, Grep, Glob, Bash |
| `test-engineer` | Write tests, fill coverage gaps, validate regressions | Read, Grep, Glob, Bash, Edit, Write |
| `orchestrator` | Classify a complex task, build pipeline, resolve skill overlap | all |
| `debugger` | Bug, unexpected behavior, failure you can't explain — uses Evidence Ledger + anti-rationalization table | Read, Grep, Glob, Bash, Edit |

### Detective Spec (4) — phases of `/detective-spec`
| Subagent | When to use | Tools |
|---|---|---|
| `detective-contracts` | Phase 2: extract module contracts (API, deps, invariants, consumers) from legacy code — read-only | Read, Grep, Glob, Bash |
| `detective-business-rules` | Phase 3: extract hidden business rules from validations, magic constants, state transitions, tests — read-only | Read, Grep, Glob, Bash |
| `detective-flows` | Phase 4: reconstruct end-to-end flows (entry → side effects) with edge cases and mutated state — read-only | Read, Grep, Glob, Bash |
| `detective-adrs` | Phase 5: infer retroactive ADRs and synthesize overview + traceability — read-only | Read, Grep, Glob, Bash |

### Static Analysis (5) — pipeline of skill 34
| Subagent | When to use | Tools |
|---|---|---|
| `semgrep-scanner` | Multi-language repo: parallel Semgrep scans by language category, aggregate SARIF | Read, Grep, Glob, Bash |
| `semgrep-triager` | >20 findings batch: classify TP/FP/needs-investigation reading source context, propose fixes | Read, Grep, Glob, Write |
| `codeql-runner` | Bug needs interprocedural taint tracking: orchestrate CodeQL database build + queries | Read, Grep, Glob, Bash |
| `sarif-parsing` | Multiple SARIF sources: parse, dedup, aggregate into single report (Semgrep + CodeQL + others) | Read, Glob, Bash, Write |
| `variant-analysis` | Confirmed bug → hunt variants of same pattern, generate reusable custom rule for CI | Read, Grep, Glob, Bash, Write |

**Invocation example:**

```
Dispatch the code-reviewer subagent to review changes in src/auth/login.ts
```

```
Use the debugger subagent to investigate the crash TypeError: Cannot read properties of undefined in api/users.ts
```

Subagents are copied to the consuming repo's `.claude/agents/` by `install.sh`.
See `docs/skill-guides/subagents.md` for the full guide on when to use each.

---

## MCP Server — 36 Tools for Any MCP Client

```json
{
  "mcpServers": {
    "dev-team-kit": {
      "command": "node",
      "args": [".bot/mcp-server/dist/index.js"],
      "env": {
        "FAL_KEY": "fal-...",
        "BRAVE_SEARCH_KEY": "BSA...",
        "FIRECRAWL_KEY": "fc-..."
      }
    }
  }
}
```

Works in Claude Code, Windsurf, Gemini CLI, Cursor and any MCP client.

| Block | Tools | Examples |
|-------|-------|----------|
| **Knowledge** | 14 | classify task, build pipeline, summarize diff, build context pack |
| **Execution** | 6 | competitor search (Brave), scraping (Playwright/Firecrawl), image generation (fal.ai) |
| **Persistence** | 12 | save context, working set, cost, learned skills and session guardrails |
| **Session Intelligence** | 4 | compress verbose output, read session JSONL log, list seen files/errors |

See `mcp-server/README.md` for full tool documentation.

---

## API Keys Required

| Key | What it's for | Where to get it |
|-----|---------------|-----------------|
| `FAL_KEY` | image generation (skill 17, MCP moodboards) | fal.ai/dashboard/keys |
| `BRAVE_SEARCH_KEY` | competitor research (skill 29, MCP) | brave.com/search/api |
| `FIRECRAWL_KEY` | advanced scraping (optional) | firecrawl.dev |

The installer prompts for each key and saves them in the project's `.env.local`.

---

## Daily Ergonomics

- read `docs/quickstart.md` to get into the flow fast
- reuse `docs/repo-audit/current.md` before exploring the repo
- use `devkit_context_pack` to start a task without re-reading half the repo
- use `devkit_diff_brief` to resume work or prep a review
- use `devkit_working_set` to persist hot files and next steps
- use `commands/` as operational shortcuts
- consult `docs/skill-call-matrix.md` when there's overlap between skills
- consult `docs/skill-guides/` only on demand
- consult `docs/skill-guides/ideation-frameworks.md` — SCAMPER, HMW, First Principles, JTBD for the ideation phase
- consult `docs/skill-guides/skill-discovery.md` — decision tree to pick the right skill per task type
- consult `docs/skill-guides/context-engineering.md` — context hierarchy, trust levels and packing strategies
- consult `docs/skill-guides/autonomous-loop.md` — `/auto` protocol for autonomous execution

---

## Slash Commands — Shortcuts by Development Phase

| Command | What it does | Skills activated |
|---------|--------------|------------------|
| `/spec` | Spec a feature with acceptance criteria | PO (01) |
| `/plan` | Classify task and build pipeline | Orchestrator (09) |
| `/build` | Implement with the project stack | Backend (03) + Frontend (04) |
| `/test` | Write and run tests | QA (05) |
| `/review` | Final review + security audit | Reviewer (11) + Security (06) |
| `/simplify` | Simplify and refactor code | Migration & Refactor (23) |
| `/ship` | Release and deploy | Release Manager (24) + Deploy (07) |
| `/pipeline` | Full end-to-end pipeline | Orchestrator (09) → all |
| `/best` | Best practices, clean code and DRY audit | Reviewer (11) + Security (06) + QA (05) |
| `/auto` | Autonomous agent — runs full task without intervention | All needed + circuit breaker |
| `/loop` | Multi-agent autonomous orchestrator (auto-loop v2) — claude + codex, parallel via worktree, polishing pass | `scripts/auto-loop/` |
| `/worktree` | Creates isolated git worktree, copies `.env*`, validates env in background | — |
| `/detective-spec` | Reverse-engineer specs from a legacy codebase — extracts contracts without touching the code | Detective Spec (33) |
| `/grill-me` | Relentless interrogation of an idea/plan — one question + suggested answer per turn | PO (01) Deep Interview |
| `/to-prd` | Convert current conversation into a PRD published in the issue tracker (label `needs-triage`) | PO (01) PRD mode |
| `/to-issues` | Break PRD into N independent issues (vertical slices) and publish to tracker | Orchestrator (09) + vertical-slices |
| `/pipeline-discovery` | FULL discovery flow: grill-me → to-prd → to-issues → loop+TDD → ship | Orchestrator (09) coordinated, all skills |
| `/constitution` | Bootstrap/update `memory/constitution.md` with governing principles (Code Quality, Testing, UX, Performance, Security) — hierarchical authority over PRD/plan/ADRs | PO (01) governance mode |
| `/checklist` | Generate contextual checklist per feature ("unit tests for English") — Completeness, Clarity, Consistency, Coverage, Edge Cases | PO (01) + validation |
| `/analyze` | Cross-artifact consistency check (read-only) — constitution → specs → plan → issues. Findings classified CRITICAL/HIGH/MEDIUM/LOW | Reviewer (11) audit mode |
| `/humanize` | Remove 29 AI writing patterns from any prose (docs, PRDs, copy, changelogs). Self-audits before final version. | Documenter (10) editor mode |
| `/consolidate-memory` | Memory vault janitor — merge duplicates, archive stale, prune index. Snapshot-first safe workflow. | Context Manager (08) janitor mode |
| `/constitution` | Bootstrap/update `memory/constitution.md` with governing principles (Code Quality, Testing, UX, Performance, Security) — hierarchical authority over PRD/plan/ADRs | PO (01) governance mode |
| `/checklist` | Generate contextual checklist per feature ("unit tests for English") — Completeness, Clarity, Consistency, Coverage, Edge Cases | PO (01) + validation |
| `/analyze` | Cross-artifact consistency check (read-only) — constitution → specs → plan → issues. Findings classified CRITICAL/HIGH/MEDIUM/LOW | Reviewer (11) audit mode |

### `/loop` — Auto-Loop v2 (Multi-Agent Orchestrator)

`scripts/auto-loop/` is an autonomous orchestrator that ships tasks **ready, working, polished and tested**. Run it overnight, wake up to a PR ready to merge.

```bash
# Basic usage (single run, claude agent)
node scripts/auto-loop "your task here"

# Pick the agent
node scripts/auto-loop "task" --agent codex
node scripts/auto-loop "task" --agent claude

# Isolated worktree + parallel (3 tasks in 3 worktrees)
node scripts/auto-loop --worktree --parallel 3 -- "task A" -- "task B" -- "task C"

# Configurable polishing pass (default: standard)
node scripts/auto-loop "task" --polish=full

# Fine-grained control
node scripts/auto-loop "task" --max-tokens 200000 --stop-when "tests cover the new endpoint"
```

**v2 features:**

| Feature | Detail |
|---------|--------|
| Multi-agent | adapters for `claude --print` and `codex exec`, common interface, swap via `--agent` |
| Integrated worktree | creates `<repo>-auto-worktrees/<slug>/` on branch `auto/<slug>`, preserved if committed |
| Parallel mode | `--worktree --parallel N` runs N isolated runners, aggregates logs by run-id |
| Polishing pass | `--polish=none\|light\|standard\|full` — `simplify` + `review` (+ `security-review` + `test` on `full`) before commit |
| Cross-OS prevent-sleep | macOS `caffeinate`, Linux `systemd-inhibit`, Windows `SetThreadExecutionState` |
| JSONL debug log | `.auto/runs/<run-id>/debug.jsonl` with full `error.cause` chain |
| Classified backoff | `permanent` aborts, `retryable` exponential (60s→600s, 5x), `agent-reported` retries immediately |
| Graceful interrupt | 1× Ctrl+C = finish iteration and exit clean, 2× = SIGKILL with rollback |
| Robust resume | `session.json` with prompt/model/agent/branch — rerun asks update/new branch/quit |
| Token cap | `--max-tokens N` aborts mid-run with clean commit if valid |
| Stop-when | `--stop-when "<condition>"` — agent reports `STOP_WHEN_MET: true|false` per iteration |

**Circuit breaker:** same error 3x, stall (3 iterations without `git diff`), budget exhausted, or task blocked — stops automatically.

**Exit codes:** `0` ok / `1` usage / `2` permanent error / `3` retryable exhausted / `4` breaker tripped / `5` stall / `6` token cap / `7` polish incomplete / `130` interrupted / `99` fatal.

**Production-ready:**
- 21 smoke tests under `scripts/tests/auto-loop/`, all green. Run: `node scripts/tests/auto-loop/run-all.mjs`.
- Cross-platform (macOS, Linux, **Windows**) — adapters spawn through the shell on Windows so `npm`-installed `.cmd` launchers resolve.
- Each run writes `.auto/runs/<runId>/status.json` with `{iterations, commits, exitCode, worktreePath, ...}` for parallel parents and external tooling to consume.
- Opt-in real-LLM smoke: `node scripts/tests/auto-loop/smoke-real.mjs` (manual, costs tokens).

**What changed 2026-04-30 → 2026-05-01:**
- Initial v2 release on 04-30: multi-agent (claude + codex), integrated worktree, parallel mode, polishing pass, gnhf-inspired flags (`--max-tokens`, `--stop-when`, prevent-sleep, JSONL log, classified backoff, 2-stage Ctrl+C, robust resume), bilingual docs.
- Gap fixes shipped 05-01: codex E2E test with fake CLI shim (zero tokens), polish skill-path verification + retry path test, runner+worktree integration test, status.json wired into parallel summary (was showing `-` placeholders), Windows portability fixes (`gitDiffSinceBaseline` no longer POSIX-only; adapters resolve `.cmd`/`.bat` launchers).
- Tests: 17 → 21, all passing. Commands and exit codes unchanged.

---

## Global Governance

- `GLOBAL.md` is the highest instruction layer
- `policies/` standardize execution, risk, persistence, quality and evaluation
- `templates/` reduce variation in handoff, plan, review and rejection
- `policies/tool-safety.md` — safe usage of write, network, MCP and external actions
- `policies/model-routing.md` — model tiers, enforcement and integration with cost-tracker
- `policies/evals.md` — minimum evidence for structural changes to the kit
- `policies/search-first.md` — research mandatory before implementing (feature, bugfix, integration, refactor)
- `policies/iterative-retrieval.md` — progressive retrieval in 3 rounds for delegated subagents and skills
- `policies/anti-rationalization.md` — common rationalization tables + rebuttals per critical skill
- `policies/source-driven.md` — mandatory source hierarchy for framework/lib decisions
- `policies/confusion-management.md` — STOP-NAME-OPTIONS-WAIT protocol for detected confusion
- `policies/context-engineering.md` — 5-level context hierarchy and 3 trust levels

### Instruction Hierarchy

1. `GLOBAL.md`
2. `policies/*.md`
3. `skills/*/SKILL.md`
4. `templates/*.md`

---

## Real Repo Structure

```text
.
├── .claude/              ← slash commands (/spec, /plan, /build, /test, /review, /simplify, /ship, /pipeline, /best, /auto, /loop)
│   └── commands/
├── .claude-plugin/       ← Claude Code plugin manifest
│   └── plugin.json
├── .github/              ← CI workflows (validate-plugin, validate)
│   └── workflows/
├── AGENTS.md
├── CLAUDE.md
├── GLOBAL.md
├── README.md
├── commands/             ← slash commands (/audit-repo, /devkit-install-fv, ...)
├── docs/
│   ├── quickstart.md
│   ├── repo-audit/
│   ├── skill-guides/
│   └── skill-call-matrix.md
├── evals/
├── hooks/                ← lifecycle hooks for Claude Code
│   ├── hooks.json
│   ├── config.json
│   └── scripts/
├── mcp-server/           ← MCP server with 36 tools
├── patterns/ai-integration/
├── personas/             ← agent personas (code-reviewer, security-auditor, test-engineer)
├── policies/             ← model-routing, tool-safety, cost-optimization, evals
├── scripts/              ← generate-image.py and utilities
├── setup/                ← multi-platform install.sh
├── skills/               ← 37 specialists (*/SKILL.md)
├── src/                  ← reusable hooks, stores, components and middleware
└── templates/            ← handoff, plan, review, rejection
```

---

## Installed Structure in the Consumer Repo

When installed via `/devkit-install-fv` or `setup/install.sh`:

```text
consumer-repo/
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── .claude/settings.json         ← hooks + MCP registered
├── .claude/commands/             ← slash commands (/spec, /plan, /build, /loop, ...)
├── .claude/agents/               ← subagents dispatchable via Task tool
├── .github/copilot-instructions.md
├── .windsurf/rules/dev-team-kit.md
├── .windsurf/mcp.json
├── .gemini/settings.json
└── .bot/
    ├── GLOBAL.md
    ├── commands/                 ← operational commands (/audit-repo, /devkit-install-fv, ...)
    ├── docs/                     ← skill-guides, repo-audit, quickstart
    ├── evals/
    ├── hooks/                    ← lifecycle hooks
    ├── learned-skills/           ← project-accumulated knowledge (score 0-1, weekly decay, auto-archived in .archive/ below 0.3)
    ├── mcp-server/               ← compiled and ready
    ├── patterns/ai-integration/
    ├── personas/                 ← code-reviewer, security-auditor, test-engineer
    ├── policies/
    ├── scripts/
    ├── setup/
    ├── skills/
    └── templates/
```

The consumer repo also receives `.claude/commands/` (10 slash commands) at the root, installed by `setup/install.sh`.


---

## Quick Validation

```bash
pytest scripts/tests -q
node scripts/check-consistency.mjs
cd mcp-server && npm run build
bash scripts/smoke-install.sh
```

---

## Contributing

Want to add a skill, fix a bug or propose an improvement? See the full guide in **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

**Quick summary:**
1. Create the skill in `skills/NN-name/SKILL.md` and register it in `plugin.json`
2. For slash commands, add them to `.claude/commands/` and register in `plugin.json`
3. Run `node scripts/check-consistency.mjs` before committing
4. Open a PR with an entry in `CHANGELOG.md`

---

## Changelog

Full release history in **[CHANGELOG.md](./CHANGELOG.md)**.

| Version | Date | Highlights |
|---|---|---|
| **v1.5.0** | 2026-05-15 | Absorb 6 external skill patterns into the kit: MCP builder patterns, verification-before-completion, receiving-code-review, memory consolidation; `/consolidate-memory` command; skill 18 `--recommend-automation` mode; skill 28 `audit` mode |
| **v1.4.2** | 2026-05-15 | Humanize gaps: evals for `/humanize`, consistency check assert, quality-gate prose section, skill-author note |
| **v1.4.1** | 2026-05-15 | `/humanize` command + `policies/anti-ai-writing.md` (29 patterns) + opt-in hook; gates in skills 10/13/14. From [blader/humanizer](https://github.com/blader/humanizer) |
| **v1.4.0** | 2026-05-15 | Release hygiene: docs aligned, Acknowledgements, quality-gates, constitution-watcher hook, evals migrated, tags + releases |
| **v1.3.x** | 2026-05-15 | **Spec-driven development**: `/constitution` (governing principles, 5 axes), `/checklist` (unit tests for English), `/analyze` (cross-artifact consistency); 4 critical skills consult constitution; canonical pipeline in handoffs.md; `programs/spec-driven-development.md`; inference-time-compute patterns from optillm |
| **v1.2.x** | 2026-05-13 | 13-check PRD validation (decoupled from Taskmaster); agent prompting patterns (layering A→B→C, agent-spec template, no-drift policy); 4-tier memory model; token budget in SessionStart hook |
| **v1.1.0** | 2026-05-09 | Context Engineering adoption: protocol shells (Pareto-lang), skill I/O schemas, iteration scoring, programs/ layer, 3 pilot subagents migrated |
| **v1.0.0** | 2026-04-30 | Auto-loop v2: multi-agent (claude + codex), parallel worktrees, polishing pass, circuit breaker, 21 smoke tests |

---

## Acknowledgements

This kit absorbs ideas from several open-source projects, decoupled from their original infrastructure and adapted to our skill kit model:

- **[github/spec-kit](https://github.com/github/spec-kit)** — `/constitution`, `/analyze`, `/checklist` commands and spec-driven development workflow (v1.3.0+). We do not adopt their CLI Python or `.specify/` directory; ideas are wired into our `memory/`, `docs/`, and slash command system.
- **[anombyte93/prd-taskmaster](https://github.com/anombyte93/prd-taskmaster)** — 13-check PRD quality validation (v1.2.1). We do not adopt the Taskmaster AI dependency or `script.py` layer; only the validation taxonomy and discovery question structure.
- **[algorithmicsuperintelligence/optillm](https://github.com/algorithmicsuperintelligence/optillm)** — inference-time compute patterns (MoA, Self-Consistency, BoN, PlanSearch, SPL, RTO) in `patterns/ai-integration/inference-time-compute.md` (v1.3.0). We do not adopt the proxy infrastructure or techniques requiring logit access.
- **[mattpocock/skills](https://github.com/mattpocock/skills)** — `/grill-me`, `/to-prd`, `/to-issues` commands.
- **[davidkimai/Context-Engineering](https://github.com/davidkimai/Context-Engineering)** — protocol shells (Pareto-lang), atom→field taxonomy, programs layer (v1.1.0).
- **[rohitg00/agentmemory](https://github.com/rohitg00/agentmemory)** — 4-tier memory consolidation model and privacy filter (v1.2.0).
- **[ClickUp Agent Prompting Guide](https://clickup.com/blog/agent-prompting-guide/)** — Five Building Block framework, layering A→B→C (v1.2.0).
- **[sandeco/reversa](https://github.com/sandeco/reversa)** — Detective Spec pipeline for legacy reverse-engineering (skill 33).
- **[aihero.dev](https://www.aihero.dev/5-agent-skills-i-use-every-day)** — documentation format for `docs/WIKI.md` and `docs/SKILLS-OVERVIEW.md`.
- **Anthropic Skills (`anthropic-skills:*`)** — `policies/mcp-builder-patterns.md` and `policies/memory-consolidation.md` + `/consolidate-memory` command (v1.5.0). Patterns absorbed; no runtime dependency on the external skill.
- **Superpowers (`superpowers:*`)** — `policies/verification-before-completion.md`, `policies/receiving-code-review.md`, parallelization section in `policies/execution.md` (v1.5.0). Patterns absorbed; no runtime dependency.
- **Claude Code Setup (`claude-code-setup:claude-automation-recommender`)** — `--recommend-automation` mode in skill 18 (v1.5.0). Pattern absorbed.
- **Claude MD Management (`claude-md-management:claude-md-improver`)** — `audit` mode in skill 28 (v1.5.0). Pattern absorbed.
- **[blader/humanizer](https://github.com/blader/humanizer)** + **[Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)** — 29 anti-AI writing patterns + `/humanize` command (v1.4.1).

---

> 🇧🇷 [Leia em Português](README.pt-BR.md)
