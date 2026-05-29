# Policy — path-scoped rules system

## What it is

`rules/` ships always-on coding standards that the Claude Code harness attaches automatically based on which files an agent edits. Each language rule file carries `paths:` glob frontmatter; the harness loads it **only** when an edited file matches. `common/` files have no `paths:` and always apply.

Adapted from [affaan-m/ECC](https://github.com/affaan-m/ECC) `rules/` (the `paths:` mechanism + common/language layering), rewritten in this kit's voice and scoped to a small MVP.

## Why it exists (the gap it fills)

- **`CLAUDE.md` bloat is a real cost** — everything in it loads on every turn. House style scoped by file type belongs in path-scoped rules, not one giant always-loaded file. (See `policies/token-efficiency.md`.)
- **LLMs forget standards mid-session.** A rule re-attached by the harness on the relevant edit is more reliable than a one-time instruction.
- It's **token-cheap by construction**: a Go session never loads Python rules.

## Rules vs the rest of the kit

| Layer | When it loads | Tells you | Example |
|---|---|---|---|
| **rules/** | always-on, scoped by edited file glob | *what* the standard is | "parameterized SQL", "no `any`" |
| **skills/NN** | on demand, when the task matches | *how* to do the work | `04-frontend-integration` playbook |
| **policies/** | cited by skills, read on demand | *governance* of the kit itself | this file |
| **memory/patterns.md** (skill 47) | injected on SessionStart if fresh | the *repo's actual* conventions | "this repo uses X" |

Rules are the cheap always-on guardrail. Skill `47-pattern-conformity` is complementary: rules are the kit's opinionated defaults; `patterns.md` is what *this specific repo* already does (which wins when they differ — conform to the codebase).

## Layering (CSS-specificity)

`common/` = universal. `<language>/` extends it with concrete tools/examples and **overrides on conflict** (specific beats general). Every language file opens with `> Extends [common/xxx.md](../common/xxx.md)`.

## Install

`setup/install.sh` copies the whole `rules/` tree to the consumer's `.claude/rules/dev-team-kit/`. Copy the tree, never flatten (`common/` and language dirs share filenames).

## MVP scope (v2.25.0)

- `common/`: coding-style, testing, security, performance, patterns, git-workflow, code-review, development-workflow (8 files, no `paths:`).
- `typescript/`: coding-style, testing, security.
- `python/`: coding-style, testing, security.
- `react/`: patterns, security (`.tsx`/`.jsx`).

Add languages as repos demand (Go, Rust, Java, CSS, SQL) — see `rules/README.md → Adding a language`. Keep files tight: only standards worth restating, no padding.

## Safety

- Rules are advisory context, not executable. They never block.
- They do not duplicate skill content — they point at the skill for the deep *how*.
