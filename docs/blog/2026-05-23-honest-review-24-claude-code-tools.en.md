# 24 Claude Code Tools: What's Actually Worth Installing (Honest Review)

**TL;DR:** A LinkedIn list went around with 24 "essential" Claude Code tools. I opened all 24 repos, compared against what already ships in the Dev Team Kit, and marked what's worth it, what to skip, and what to be careful with. **9 are worth something, 15 are noise or user-side integrations.** The star counts in the original post had errors (some inflated, some underestimated — I'll bring the real numbers). This is the text I'd send a friend who asked "should I install this or not?".

---

## Why this review

Curated LinkedIn lists don't tell you what matters: **how much overlaps with what you already have, what license, who maintains it, and when the install cost is worth it**. This text covers the 24 items from the [original list](https://www.linkedin.com/), grouped by category, with an objective verdict.

Before you read: I maintain the [Dev Team Kit](https://github.com/felvieira/claude-skills-fv) (42 skills + 15 subagents + 32 commands + 19 hooks). I have bias — but my bias is **less tooling, better curated**. When something from the list improves the kit, I absorb. When it duplicates, I skip.

---

## How I read each repo

1. Resolved the `lnkd.in/*` shortlinks to real GitHub owners
2. Verified via `gh repo view`: stars, license, push date, primary language
3. Read README + folder structure of all 24
4. Compared against what the kit already covers
5. Honest verdict

None of this is hypothetical — it's all committed under `docs/blog/honest-review-24-tools.workings.md` (unpublished, my draft).

---

## The 9 that are worth it (in usefulness order)

### 1. `anthropics/skills/frontend-design` — ABSORB the pattern

**Repo:** `anthropics/skills`, subdir `skills/frontend-design`
**Stars:** 139k (parent repo), custom license
**What it does:** a 60-line SKILL.md that teaches the agent to commit to an aesthetic direction **before** coding UI.

Lists 11 aesthetic anchors (brutalist, editorial, retro-futuristic, organic, luxury, playful, etc.) and forces a choice. Bans generic fonts (Inter, Roboto, Arial, Space Grotesk) and cliché gradients (purple on white).

**Why it matters:** this is why 90% of AI-generated UIs look the same. Without aesthetic direction, the model falls back to defaults. With direction, it commits.

**What I did:** already absorbed in `dev-team-kit-fv` skill 02 (ui-ux-design). Added the 11 anchors, removed `Inter` as the default in design tokens, and credited the source.

### 2. `blader/humanizer` — ALREADY ABSORBED

**Stars:** 21k · MIT · last push April/2026
**What it does:** removes AI tells from any text. Based directly on the Wikipedia "Signs of AI writing" page.

Differentiator: it has a **Voice Calibration** section (asks the user for a writing sample before rewriting) and a **Personality and Soul** section that fights the opposite of AI slop — clean but soulless text.

**Why it matters:** AI slop isn't just keywords ("delve", "tapestry") — it's structure without opinion, sentences all the same length, no first person. `humanizer` solves both.

**What I did:** our `commands/humanize.md` already cited blader. Now I absorbed the full "Personality and Soul" section — side-by-side examples of "clean but no pulse" vs "has a pulse".

### 3. `AgriciDaniel/claude-seo` — ABSORB the GEO/AEO part

**Stars:** 7k · MIT · last push May/2026
**What it does:** 25 sub-skills + 18 sub-agents covering technical SEO + **GEO/AEO** (optimization to be cited by LLM / ChatGPT / Perplexity).

**Why it matters:** GEO is the most serious gap in SEO today. Content optimized for 2018 Google isn't optimized for 2026 LLMs. Concrete differences: atomic claims (1 fact per sentence), H2/H3 as direct questions, TL;DR at the top (LLMs cite it), comparison tables (LLMs extract), `llms.txt` at the root.

**What I did:** our skill 14-seo-specialist now has ~135 new lines on GEO/AEO. Citable structure, structured data (Article with author/datePublished/dateModified), E-E-A-T for LLMs, `llms.txt`, dedicated checklist.

### 4. `garrytan/gstack` — WORTH LOOKING (high overlap)

**Stars:** 101k · MIT · last push May/2026
**What it does:** Garry Tan's (YC CEO) "exact Claude Code setup". 23 tools as slash commands. Clear personas: CEO, Designer, Eng Manager, Release Manager, Doc Engineer, QA.

**Overlap with Dev Team Kit:** ~70%. Our kit has 42 skills covering the same ground (PO, UI/UX, Backend, Frontend, QA, Reviewer, Security, Release Manager, etc.).

**Where gstack wins:**
- `/canary` — canary deployments with gradual rollout (1% → 10% → 50% → 100%). **Our gap.**
- `/freeze`/`/guard`/`/unfreeze` — change control on critical branches.
- `--team` auto-update for shared repos.
- `/learn` — captures learned patterns per session.

**What I did:** created our skill 43-canary-deployment covering 3 strategies (traffic-based, feature flag, blue-green) with metric tables, automatic rollback, attribution to gstack.

**Recommendation:** if you have nothing, install gstack. If you already use Dev Team Kit, copy just `/canary` and maybe `/freeze`.

### 5. `obra/superpowers` — WORTH LOOKING (high overlap)

**Stars:** 204k · MIT · last push May/2026 · author Jesse Vincent
**What it does:** "complete development methodology". 14 composable skills via the official Claude Code marketplace. Philosophy: cold start → interrogated spec → TDD plan → subagent-driven implementation.

**Overlap with Dev Team Kit:** ~60%. Coinciding skills: dispatching-parallel-agents (= our skill 40), test-driven-development (= skill 37), using-git-worktrees (= skill worktree), receiving-code-review (= policy), writing-skills (= skill 35), systematic-debugging (= debugger agent).

**Where superpowers wins:**
- `verification-before-completion` skill — articulates it as "Iron Law" + "Gate Function" + "Rationalization Prevention" (excuses-vs-reality table).
- `requesting-code-review` — pattern for how to ask for a review (complements `receiving-code-review`).
- Official marketplace = simpler install.

**What I did:** enriched our `policies/verification-before-completion.md` with "Iron Law" and "Rationalization Prevention" from superpowers.

### 6. `heygen-com/hyperframes` — WORTH TRYING

**Stars:** 21k · Apache-2.0 · last push May/2026
**What it does:** "Write HTML. Render video. Built for agents." Video generation framework via HTML+GSAP+Tailwind where the agent is the author.

**Why it matters:** it's genuinely new. Our skill 27 (video-integration) covers integration with generation APIs (RunwayML, Pika, FAL.AI), but **doesn't cover rendering** of authored composition. If you need motion graphics or a custom explainer video, hyperframes fills the gap.

**Recommendation:** if your skill 27 (or equivalent) generates video, install `hyperframes` as a parallel skill. No overlap.

### 7. `openai/codex-plugin-cc` — ALREADY IN KIT (via official plugin)

**Stars:** 19k · Apache-2.0 · last push April/2026
**What it does:** OpenAI's official plugin to use Codex from inside Claude Code. 7 commands: `/codex:review`, `/codex:adversarial-review`, `/codex:rescue`, `/codex:status`, `/codex:result`, `/codex:cancel`, `/codex:setup`.

**Differentiator:** `/codex:adversarial-review` — second opinion that **questions the approach**, not just the implementation.

**What I did:** documented integration in `docs/skill-guides/codex-plugin-integration.md`. Our `codex:rescue` and `codex:setup` (visible in the env) already come from this plugin. Recommendation: install and use the 7 commands — no reason to reinvent.

### 8. `antfu/skills` — WORTH COPYING the conventions

**Stars:** 5k · MIT · last push May/2026 · author Anthony Fu (Vue/Vite core)
**What it does:** 17 curated skills using **git submodules** that reference upstream official docs (Vue, Nuxt, Pinia, Vite, Vitest, UnoCSS, etc.). When upstream updates, the skill updates with it.

**Why it matters:** two interesting patterns — (1) submodules to sync with external docs, (2) compact skills (~70 lines SKILL.md + separate `references/` for long details).

**Recommendation:** if you program Vue/Vite/Nuxt, install. If you maintain your own kit, copy the 2 patterns (submodules + compact format) — I'll evaluate adopting both in Dev Team Kit v3.

### 9. `vercel-labs/agent-browser` — SKIP for now

**Stars:** 34k · Apache-2.0 · Rust · last push May/2026
**What it does:** native Rust CLI for browser automation. Accessibility-tree snapshots with compact `@eN` refs. Claims fewer tokens vs Playwright.

**Why skip:** the "fewer tokens, faster" claims have no published benchmark vs Playwright MCP. The repo has a `benchmarks/` folder with scripts but **no results**. Chromium-only (Firefox and Safari excluded). And it's not an MCP server — it's CLI + Claude Skill, requires Bash wrapping.

**Recommendation:** Playwright MCP already covers your case. Wait for Vercel to publish a real benchmark with numbers before migrating.

---

## The 4 worth checking (partial value)

### `anthropics/financial-services` (27k stars, Apache-2.0)

Specific vertical (IB, PE, equity, wealth). Out of scope if you don't work in finance. **BUT** has a great architectural pattern: `plugins/agent-plugins/` (named agents self-contained) + `plugins/vertical-plugins/` (skills bundled by vertical) + `partner-built/`. Self-contained = install only what you need.

**Recommendation:** **don't install** if it's not your vertical. **Copy the pattern** if you maintain a modular kit. I documented how to adopt it in `docs/patterns/vertical-plugins.md`.

### `anthropics/claude-for-legal` (7.5k stars, Apache-2.0)

Same pattern as `financial-services` but legal vertical. Same recommendation: install only if you're in-house counsel; copy the pattern if you maintain a kit.

### `JuliusBrussee/caveman` (64k stars, MIT)

"Why use many token when few token do trick" — agent talks like a caveman to cut 65% of output tokens. It works, but with a cost: part of the technical info becomes ambiguous.

**Recommendation:** if you only do technical pair-programming and don't share output, worth trying. If you generate docs, PRs, or code reviews to read later, skip — cave-like output is hard to revisit. We declined absorbing it in Dev Team Kit v2.9.0 — we have `policies/dense-output-mode.md` that compresses without going caveman.

### `alirezarezvani/claude-skills` (16k stars, MIT, 329 skills)

The "everything bundle". 329 skills, 49 agents, 79 commands, 7 personas, 12 hosts.

**Recommendation: careful.** 329 skills is anti-pattern. Discovery becomes impossible, maintenance becomes unsustainable, and the author claims "POWERFUL/SOLID/GENERIC/WEAK" tiers — clear signal that lots of stuff is GENERIC or WEAK.

**But** their `SKILL-AUTHORING-STANDARD.md` has good ideas: 10KB cap per SKILL.md (forces extraction to `references/`), Python validators (`skill_validator.py`, `quality_scorer.py`) with `--json` + score 0-100, trigger eval loop with should/shouldn't pairs.

**What I'll do:** adopt 10KB cap + programmatic scorer in our skill 35-skill-author. **I won't** copy the quantity — quality > catalog.

---

## The 15 you can skip

### User-side MCPs (8 items) — these aren't "kit skills", they're user integrations

- `granola` (meeting notes) · `slack` · `notion` · `kondo` (LinkedIn DM) · `zapier` · `higgsfield` (video) · `perplexity` · agent-browser cited above

These are MCPs the **user** installs once in Claude Code. Nothing to "absorb" into a kit. You install if you use the matching product, skip if you don't. Good discovery list — but no curation merit.

### Off-scope verticals (2 items)

- `anthropics/financial-services` (unless you work in IB/PE)
- `anthropics/claude-for-legal` (unless you're a lawyer)

### Intro articles (2 items)

- `charliehills.substack.com/p/claude-code-for-normal-people`
- `charliehills.substack.com/p/build-your-1st-ai-agent-in-claude`

Onboarding for someone who's never used it. Skip if you're already here.

### Noisy bundles (2 items)

- `coreyhaines31/marketingskills` (30k stars) — 40 marketing tools. Overlaps our skill 13 (marketing-copy) + skill 14 (SEO). No clear advantage.
- `charlie947/social-media-skills` (1k stars) — "my content OS". Personal product, not a reusable kit.

### Direct overlap (1 item)

- `charlie947/ai-second-brain` (40 stars) — Karpathy-style wiki. Overlaps our `D:/claude-memory/` vault + `consolidate-memory` skill. No clear migration path.

### Curiosity (1 item)

- `PleasePrompto/notebooklm-skill` (6.6k stars) — browser automation on NotebookLM. Interesting curiosity, but if you need an LLM to query your docs, prefer your own RAG.

---

## What changed in Dev Team Kit

I just absorbed (commits landing in next release):

1. **Skill 02 (UI/UX)** — 11 aesthetic anchors + bans generic fonts (from anthropics/frontend-design)
2. **Skill 14 (SEO)** — full GEO/AEO section (from AgriciDaniel/claude-seo)
3. **Skill 43 (NEW — canary-deployment)** — gradual rollout + automatic rollback (from garrytan/gstack)
4. **`/humanize` command** — Personality and Soul section (from blader/humanizer)
5. **`verification-before-completion` policy** — Iron Law + Rationalization Prevention (from obra/superpowers)
6. **`vertical-plugins.md` doc** — architectural pattern (from anthropics/financial-services)
7. **`codex-plugin-integration.md` doc** — guide to the 7 commands from the official plugin

All credited via NOTICE/README/"External Sources" section per skill. Zero code copied — only patterns + ideas.

---

## How to decide what to install (rule of thumb)

1. **Just starting?** Install `obra/superpowers` or `garrytan/gstack`. Not both — pick one. Both are opinionated full frameworks.
2. **Already have your own kit?** Read the patterns from the 9 marked green above and absorb selectively. Don't install everything.
3. **User-side MCPs?** Install the ones you use (Slack if you live in Slack, Notion if you live there). These don't compete.
4. **Want "256+ skills" in a bundle?** Careful. Quantity ≠ quality. Giant catalogs have broken discovery.

---

## Attributions

All analyzed repos, with license:

| Repo | License | Stars |
|---|---|---|
| `garrytan/gstack` | MIT | 101k |
| `obra/superpowers` | MIT | 204k |
| `openai/codex-plugin-cc` | Apache-2.0 | 19k |
| `anthropics/financial-services` | Apache-2.0 | 27k |
| `anthropics/claude-for-legal` | Apache-2.0 | 7.5k |
| `alirezarezvani/claude-skills` | MIT | 16k |
| `coreyhaines31/marketingskills` | MIT | 30k |
| `charlie947/social-media-skills` | MIT | 1k |
| `anthropics/skills` (frontend-design) | custom | 139k |
| `heygen-com/hyperframes` | Apache-2.0 | 21k |
| `charlie947/ai-second-brain` | MIT | 40 |
| `PleasePrompto/notebooklm-skill` | MIT | 6.6k |
| `blader/humanizer` | MIT | 21k |
| `AgriciDaniel/claude-seo` | MIT | 7k |
| `antfu/skills` | MIT | 5k |
| `JuliusBrussee/caveman` | MIT | 64k |
| `perplexityai/modelcontextprotocol` | MIT | 2.2k |
| `vercel-labs/agent-browser` | Apache-2.0 | 34k |

Dev Team Kit is Apache-2.0 — compatible with all above. The 7 absorptions listed have explicit attribution in code + NOTICE + README.

---

## Where this review lives

Repository: [github.com/felvieira/claude-skills-fv](https://github.com/felvieira/claude-skills-fv)

Skill that wrote this post: `41-blog-publisher` (from the kit itself).
Skill that stripped AI slop from this text: `/humanize` (from the kit itself).

If you installed Dev Team Kit, you can run `/humanize <post>` on your next review — it'll read like a human wrote it, not a polite GPT.

— [@felvieira](https://github.com/felvieira)
