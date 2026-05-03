> 🇧🇷 [Versão em Português](README.pt-BR.md) · 🌎 English version

# Dev Team Kit — 35 Specialist Skills for Coding Agents

![Version](https://img.shields.io/badge/version-1.0.0-0f766e)
![Skills](https://img.shields.io/badge/skills-35-1d4ed8)
![Plugin](https://img.shields.io/badge/Claude%20Code-plugin-f59e0b)
![License](https://img.shields.io/badge/license-MIT-7c3aed)

> A complete team of software specialists inside your coding agent.  
> Every task is routed to the right specialist, run on the right model, and shipped at production quality.

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
Backend, frontend, mobile (Tauri), observability, analytics, accessibility (WCAG), refactoring, release, documentation — **35 specialists in total**. Each task goes to the right professional, on the right AI model (Haiku for simple, Sonnet for medium, Opus for architecture) — you don't pay Opus to generate boilerplate.

### 🔌 Works with everything you already use
Native **Claude Code** plugin + universal MCP server that runs in **Cursor, Windsurf, Copilot, Gemini CLI** and any MCP-compatible agent. **Zero vendor lock-in.** Switched tools? Your team comes with you.

### 🆓 All free, MIT, open source
No subscription. No trial. No hidden premium tier. Clone it, install it, use it forever — including in commercial projects.

---

## What It Is

The **Dev Team Kit** is a set of 35 specialized skills that turns any compatible coding agent into a complete development team — with orchestrator, backend, frontend, QA, security, deploy, design, copy, SEO, observability and more.

**What you get:**

- **Structured pipeline** — every task goes through the right steps, in the right order, no improvising
- **QA, Security and Reviewer mandatory** — no delivery ships without validation
- **Automatic model routing** — haiku for boilerplate, sonnet for implementation, opus for architecture
- **Lifecycle hooks** — the agent detects vague context, re-reads files before editing, monitors token cost
- **Built-in MCP server** — 36 tools exposed for any MCP client
- **Persistent memory** — working set, context pack, learned skills with confidence scoring accumulated per project
- **Multi-platform install** — Claude Code, Cursor, Windsurf, Copilot, Gemini CLI and more

---

## Quick Install

### Mode 1 — Global Plugin (Claude Code)

Installs the 35 skills and hooks globally. Works in any project with no extra configuration.

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

In the table below, treat `dev-team-kit` as 36 tools backed by the 35 skills.
The MCP exposes 36 tools backed by the installed skills.

### Install Modes Compared

| What gets installed | Global Plugin | /devkit-install-fv | Direct Bash |
|---|:---:|:---:|:---:|
| 35 skills | ✅ | ✅ | ✅ |
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

## The 35 Specialists

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
| 35 | **Skill Author** | meta-skill to create, edit, eval and optimize the kit's own skills — sustains the kit as it grows past 35 specialists |

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
| `sarif-parsing` | Multiple SARIF sources: parse, dedup, aggregate into single report (Semgrep + CodeQL + others) | Read, Bash, Write |
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
├── skills/               ← 35 specialists (*/SKILL.md)
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

## Timestamp Log

### 2026-04-04

- aligned setup for installation in `.bot/`, automatic hooks, local MCP `dev-team-kit` and installer smoke test
- fixed hooks to read config in installed mode and reduce learned skills context injection
- implemented `devkit_context_pack`, `devkit_diff_brief`, `devkit_working_set` and expanded telemetry in `devkit_track_cost`
- added setup profiles `lean`, `daily-dev` and `research`, with non-interactive mode
- updated main docs, MCP README, quickstart and operations guides with token economy focus

### 2026-04-08

- unified model routing into a single policy (`policies/model-routing.md`), absorbing skill 16 (llm-selector)
- added `model-routing-hook.mjs` hook for enforcement on plan mode and subagent spawns
- updated references in cost-tracker, cost-optimization, orchestrator, design-intelligence and hooks policy

### 2026-04-09

- added Claude Code plugin manifest (`.claude-plugin/plugin.json`) with 31 skills, hooks and commands
- added `/devkit-install-fv` slash command for full `.bot/` install from the global plugin
- README redesigned with hero section, specialists table with per-skill description, install modes comparison and multi-platform compatibility table

### 2026-04-11

- added Hook Profiles (`minimal`/`standard`/`strict`) with env vars `DEVKIT_HOOK_PROFILE` and `DEVKIT_DISABLED_HOOKS`
- implemented Confidence Scoring on learned skills: score 0-1, weekly decay, usage boost, auto-archive below 0.3
- added `search-first.md` policy: mandatory research before implementing
- added `iterative-retrieval.md` policy: progressive retrieval in 3 rounds for subagents
- `context-guard-stop` improved with proactive 50% warning and smart 75% block message

### 2026-05-03 (Items 2-3-4 batch — kit maintenance)

- **5 new dispatchable subagents** for skill 34 Static Analysis pipeline: `semgrep-scanner` (parallel scans by language), `semgrep-triager` (TP/FP classification), `codeql-runner` (interprocedural taint tracking), `sarif-parsing` (multi-tool dedup), `variant-analysis` (bug variant hunting + reusable rule generation). Skill 34 updated: removed "planejados" stub, integrated dispatch instructions in pipeline.
- **Subagent count: 9 → 14** registered in `plugin.json`. README subagent table reorganized into 3 categories: Core (5), Detective Spec (4), Static Analysis (5).
- **`evals/skill-audit-2026-05-03.md`**: full audit of skills 01-32 against the scorecard from skill 35. Result: 22 PASS, 6 NEEDS-REVIEW, 4 NEEDS-REWRITE. Top cross-cutting gap: 75% of skills miss `allowed-tools` frontmatter (mechanical fix). Tier-1 rewrite priority for next batch: skills 21 (data-analytics), 22 (accessibility), 24 (release-manager), 27 (video-integration).
- **Cleanup**: removed merged git worktrees (`busy-tesla-e51016`, `cool-pascal-f3482a`, `top5-skills`) and their branches.
- **Verified pre-existing concern**: README mentions "36 MCP tools" — confirmed accurate (`mcp-server/src/index.ts` has 36 `registerTool` calls). MCP tools are orthogonal to skill count, so 32→35 skills doesn't change tool count. False alarm from cycle-1 review of top-5 batch.

### 2026-05-02 (afternoon — Top 5 skills batch)

- **Skill 34 — Static Analysis:** automated security and bug scan via Semgrep (default, broad coverage) + CodeQL (interprocedural taint tracking). SARIF output, severity triage (Critical/High/Medium/Low/Info), FP suppression with justification, custom rules in `tools/semgrep/`, CI integration via `--error --severity=ERROR`. Recommended rulesets per language. Feeds findings to skill 06 (Security Review) and triggers variant analysis when bug patterns recur.
- **Skill 35 — Skill Author:** meta-skill for creating, editing, evaluating and optimizing the kit's own skills. Defines obligatory SKILL.md template (frontmatter + 11 standard sections), description optimization for triggering, allowed-tools minimization, eval scorecard (10 criteria × 0-3 scale, threshold 22/30 for merge), pipelines for create/edit/eval/optimize. Sustains kit consistency as it grows past 35 specialists.
- **Skill 36 — Web Asset Generator:** generates favicons (multi-size ICO + PNG), PWA icons (incl. maskable with 80% safe area), Open Graph (1200x630) and Twitter card (1200x675) images, web manifest, browserconfig.xml, and ready-to-paste HTML snippet with all meta tags. Three tooling options: realfavicongenerator CLI, ImageMagick, or programmatic Sharp. Anti-patterns covered: stock OG images, blurred 16px favicons, transparent Apple icons, missing maskable, relative URLs in OG tags.
- **`policies/writing-clarity.md`:** 10 timeless Strunk rules adapted for agent output — omit needless words, active voice, affirmative form, definite language, concrete over abstract, banned filler words, technical terms in English. Applies to commits, error messages, handoffs, slash command output and generated docs across all skills.
- **`.claude/agents/debugger.md` upgraded:** added explicit Evidence Ledger (hypothesis → evidence → status table), 10-row anti-rationalization table covering the most common debugger fallacies, heuristics by bug class (race condition, memory leak, perf regression, auth/permission, off-by-one, encoding), confidence scoring, and rules for when to escalate to other skills.

### 2026-05-02

- **Skill 33 — Detective Spec:** reverse-engineering pipeline for legacy systems inspired by [Reversa](https://github.com/sandeco/reversa), adapted to the kit. 5-phase pipeline (recon → modules → business rules → flows → retroactive ADRs) with checkpoint/resume in `.detective/state.json`, output in `_detective_sdd/` (overview, module contracts, extracted business rules, end-to-end flows, retroactive ADRs, traceability map). Every spec is traceable to `file:line` or `commit-sha` with confidence scoring (high/medium/low).
- **4 detective subagents** dispatchable via Task tool: `detective-contracts`, `detective-business-rules`, `detective-flows`, `detective-adrs` — all read-only.
- **Hard-guardrail policy** (`policies/detective-write-guardrails.md`): writes restricted to `.detective/` and `_detective_sdd/`, zero modification to legacy code, verifiable via two complementary checks (filtered `git status --porcelain` for untracked + `git diff --name-only --diff-filter=MDARCT HEAD` for tracked) — single-check would silently miss modifications to tracked files.
- **`/detective-spec` slash command** with scope (`--module=`, `--feature=`), single-phase (`--phase=N`) and resume support.
- **Graphify integration:** god nodes become priority modules; community detection groups `01-modules/`; bridges identify inter-module contracts.

### 2026-04-13

- **Agent Intelligence v2:** anti-rationalization tables in 5 critical skills (orchestrator, QA, reviewer, security, backend), confusion management protocol (STOP-NAME-OPTIONS-WAIT), source-driven development policy with source hierarchy and orchestrator integration, ideation frameworks guide (SCAMPER, HMW, First Principles, JTBD), simplify-ignore hook protecting critical blocks from automatic simplification via PreToolUse/PostToolUse.
- **Agent Intelligence v3:** 10 slash commands mapping development phases to skills (`/spec`, `/plan`, `/build`, `/test`, `/review`, `/simplify`, `/ship`, `/pipeline`, `/best`, `/auto`), discovery meta-skill with decision tree and 6 core operating behaviors, session-start bootstrap with automatic skill-discovery injection, 3 agent personas with structured output (code-reviewer, security-auditor, test-engineer) referenced by skills 11/06/05, context engineering policy with 5-level hierarchy and 3 trust levels, plugin validation CI with GitHub Actions. `/auto` command for full autonomous execution with 10 patterns adapted from production loops: progress tracking via checkboxes in `.auto/plan.md`, inter-iteration memory in `.auto/progress.md`, progressive context narrowing (3 levels), tiered validation (lint→typecheck→build with timeouts), error deduplication (normalizes line numbers/timestamps before comparing), completion override (re-read plan before commit), dynamic iteration budget, validation feedback loop (error becomes context for next attempt), stall detection (3 iterations without git diff = stop), build-fix extension (+2 iterations). v3 cross-vertical integration: plugin.json with 10 commands, install.sh copies personas/ and .claude/commands/, AGENTS.md/GLOBAL.md/templates/platform configs all updated, minimal profile disables session-start.

---

> 🇧🇷 [Leia em Português](README.pt-BR.md)
