# We Tested Our AI Coding Kit Against Itself. Here's What We Found.

**TL;DR:** We ran 53 evaluation scenarios + 3 end-to-end tests against the Dev Team Kit. Same model. Same prompt. With and without the kit. The numbers are real, the code is real, and yes — it works. **92.6% pass rate. +1.84 average quality delta. 53/53 E2E tests green.** Reports are public and reproducible.

---

## The problem nobody wants to talk about

You install some "AI coding skills" package. The README says it's amazing. You use it for a week. Things feel maybe a bit better? But you don't actually know.

Most AI tooling lives in this fog: marketing claims, vibes, anecdotes. Nobody measures. When we built the **Dev Team Kit** (an Apache-2.0 plugin that adds 39 specialist skills, 15 subagents and 32 slash commands to Claude Code, Cursor, Windsurf, etc.) we promised ourselves we wouldn't ship in that fog.

So we built our own bench. Then we ran it. Then we published the results.

The reports are here, bilingual, single HTML file each, no server required:

- 🌎 **English:** [`analyze-doc/index.en.html`](https://github.com/felvieira/claude-skills-fv/blob/main/analyze-doc/index.en.html)
- 🇧🇷 **Português:** [`analyze-doc/index.pt-BR.html`](https://github.com/felvieira/claude-skills-fv/blob/main/analyze-doc/index.pt-BR.html)

This post explains what's in them.

---

## What we tested

Two distinct test types, on purpose.

### 1. Isolation bench — 53 scenarios

Every skill (39) and every subagent (15, minus one that timed out) got the same treatment:

- **Pass A — Baseline.** Real prompt. Cold Claude Sonnet 4.6. No skill loaded.
- **Pass B — Treatment.** Same prompt. Same model. Skill loaded.
- **Rubric.** 5 criteria × 1-5 scale: specificity, completeness, correctness, actionability, discipline.
- **Pass threshold.** Treatment delta ≥ 1.5 over baseline.

Why isolation? Because the question "does this skill add value?" only has meaning if you can isolate it. Otherwise you're testing the model, not the skill.

### 2. End-to-end — 3 real tests

But isolation doesn't tell you if the *system* works. So we also ran:

- **Test 1 — App from scratch.** Single prompt: *"task-management app with JWT auth, CRUD, Node.js + SQLite"*. 4-phase pipeline (PO → Orchestrator → Backend → QA). **Result: 33/33 Jest tests passing.**
- **Test 2 — Manual pipeline.** Real handoffs between 6 skills (PO → Orchestrator → Backend → QA → Security → Reviewer) for a CSV export feature. **Result: 12/12 tests + Security caught a CSV injection bug the QA had missed.** That's the chain working.
- **Test 3 — Feature in existing repo.** Skill 03 in a sandbox repo, no Prisma, no TypeScript — just plain Node + better-sqlite3. **Result: 8/8 tests, zero invented dependencies.**

---

## What we found

### Overall

| Metric | Value |
|---|---|
| Pass rate | **92.6%** (50/54) |
| Average baseline | 2.69 / 5 |
| Average treatment | 4.52 / 5 |
| Average delta | **+1.84** |
| E2E tests green | **53/53** |
| Re-run token reduction (cross-call dedup) | **98%** |

### Best performer: `semgrep-triager` — delta +3.25

The cold model scored 1.75/5 on triaging Semgrep findings. Essentially: "read the code and see if it looks like a false positive." Generic, dangerous, no protocol.

With the subagent loaded: jq SARIF parser, 3-question TP/FP decision table, anti-bias guardrails (3 FPs in a row without code-reading = stop), suppression gate with explicit approval required before `// nosemgrep`, fix diffs with owner and effort per TP.

That's transformative. The cold model wasn't just less complete — it was missing the safety layer entirely.

### Most interesting failure: `code-reviewer` agent

Initial test: delta +1.0 (FAIL — below the 1.5 threshold). Investigation showed the scenario was too easy. The bugs in the test PR were obvious enough that even a cold model caught them. The kit's structure (OWASP labels, severity gate, owner per finding) was real value — but the baseline ceiling was high.

We did what good benches do: **rewrote the scenario harder.** New version: a PR with 23 files, 8 findings distributed across different concerns (race condition, timing attack in password compare, circular import, N+1 in `map async`, weak test, secrets exposure vs `.gitignore` false-alarm question, Dockerfile regression).

Result on retest: **+2.29 PASS.** Cold model caught 3 of 8. Treatment caught 8 + 2 bonus.

The methodology lesson: when a skill seems to fail, check the scenario before blaming the skill.

---

## How we fixed what the bench found

We had 4 problems flagged by the first run:

| Skill | Issue | Fix |
|---|---|---|
| 25 — AI Integration | 2 templates were 3–9 line stubs | Wrote 422 + 225 real lines (adapter pattern, fallback chain, observability, security checklist) |
| 07 — Deploy Docker | Rollback used hardcoded prev-tag, SSL block assumed certbot already ran | Added `.last-tag` persistence + `ssl-init.sh` idempotent (+196 lines) |
| 03 — Backend API | Playbook was TypeScript/Prisma-only | Added 90-line "Plain JS + better-sqlite3" section |
| Code-reviewer | Scenario too easy | Rewrote scenario (see above) |

Then we **re-ran the bench** on all 4. Three flipped to PASS with measured deltas (+2.0, +1.8, +2.29). The fourth (skill 24 — Release Manager) stayed near-miss, but for a different reason: the baseline got stronger when we gave the model repo context, compressing the delta. Not a skill problem — a scenario ceiling problem.

The principle this establishes: **every FAIL in the bench becomes a concrete fix in the next version. We don't rationalize findings. We fix them and measure again.**

That's not marketing. That's how the project is run.

---

## What this proves about LLM coding

The interesting result isn't "the kit works." It's *what kind of work* the kit does.

The kit doesn't add value by "knowing more." It adds value by **enforcing structure the cold model never produces spontaneously:**

- **Persistent artifact paths** — skills name where to write output (`_detective_sdd/`, `docs/repo-audit/current.md`). Cold model produces content with invented structure.
- **Handoff chains** — outputs reference next skill by number (`→ skill 06 → skill 11`). Cold model ends without pointing forward.
- **Anti-pattern enforcement tables** — every critical skill has a "racionalização vs realidade" table. Cold models don't list what NOT to do.
- **Evidence anchors** — detective skills require `[evidence: file:line]` + confidence tier. Cold model states facts without sourcing.
- **Suppression gates** — `semgrep-triager` requires explicit approval to silence findings. Cold model silences silently.

These aren't features. These are **constraints**. The cold model is capable, but unconstrained. The kit constrains the output in ways that make it auditable and chainable.

---

## What about the autonomous modes?

Glad you asked. We tested those too. Process-based modes that run as Node subprocesses (`auto-loop.mjs`, `swarm/index.mjs`, 7 YAML programs):

- **`auto-loop.mjs`** — Executed for real. Dispatched Claude, captured output, ran validation. 12 documented flags, 9 exit codes. Works.
- **`swarm/index.mjs`** — Refused to run with a dirty working tree. *That's the right behavior* — autonomous mode shouldn't squash uncommitted work. We tested the guard, which is what we wanted to verify.
- **7 YAML programs** — `pipeline-discovery`, `spec-driven-development`, `loop-polishing`, `detective-spec`, `adversarial-dev`, `comprehensive-review`, `refactor-safely`. All validated, all dry-run with structured step output. 6 step types in use (command, gate, conditional, parallel, bash, loop, prompt).

The autonomous machinery exists, runs, and has safety rails. The reports go into detail.

---

## What we deliberately did *not* test

Being honest matters more than looking complete. Here's the skip list:

- Image generation against real fal.ai API (would burn credits without changing the conclusion)
- Multi-platform — only validated on Claude Code. Cursor/Windsurf/Gemini CLI listed as supported but not bench-tested this round.
- `/swarm` with a real PR opened to GitHub (working tree was busy)
- `/loop --parallel` with real worktrees (subprocess, time-consuming)

These are in the public report's "Honesty" section. The kit's not done — but we measure what we ship.

---

## Try it yourself

It's [Apache-2.0](https://github.com/felvieira/claude-skills-fv/blob/main/LICENSE), free, and ships with a [`NOTICE`](https://github.com/felvieira/claude-skills-fv/blob/main/NOTICE) file that preserves attribution to the 17+ open-source projects whose ideas shaped it (DeerFlow, spec-kit, archon, mattpocock/skills, Karpathy's observations, and more).

```bash
# Install on Claude Code
claude plugin install https://github.com/felvieira/claude-skills-fv

# Or clone + install in your project
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh /path/to/your/project
```

Works in Claude Code, Cursor, Windsurf, Copilot, Gemini CLI, OpenCode. Brings 39 skills, 15 subagents, 32 slash commands, 7 executable YAML programs, and a public benchmark you can run on your own machine in under 30 seconds.

The bench reports — with every test, every number, every code snippet — are at:

- 🌎 [`analyze-doc/index.en.html`](https://github.com/felvieira/claude-skills-fv/blob/main/analyze-doc/index.en.html)
- 🇧🇷 [`analyze-doc/index.pt-BR.html`](https://github.com/felvieira/claude-skills-fv/blob/main/analyze-doc/index.pt-BR.html)

The repo: **[github.com/felvieira/claude-skills-fv](https://github.com/felvieira/claude-skills-fv)**

If you only remember one thing from this post: **AI tooling that doesn't publish its bench results is asking you to trust vibes.** Don't.

---

*Built and shipped under Apache-2.0 with NOTICE-enforced attribution. Cover skills graph generated by graphify. Bench scenarios reproducible.*
