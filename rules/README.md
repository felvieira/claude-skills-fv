# Rules — path-scoped coding standards

Always-on coding standards that the Claude Code harness attaches automatically based on which files you touch. Inspired by [affaan-m/ECC](https://github.com/affaan-m/ECC) `rules/` (the `paths:` glob mechanism), adapted to this kit's voice and scope.

## How it works

Claude Code natively reads `.claude/rules/**/*.md`. Each file may carry frontmatter:

```yaml
---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
```

The harness attaches a rule **only when an edited file matches one of its globs**. A Go session never loads Python rules — so this stays token-cheap no matter how many languages you add.

Files in `common/` have **no `paths:`** → they always apply (language-agnostic principles).

## Layering (CSS-specificity model)

- `common/` = universal principles, no language-specific code.
- `<language>/` = extends common with concrete tools, idioms, examples.
- On conflict, **language-specific wins** (specific overrides general), same as `.gitignore` precedence.

Every language file opens with `> Extends [common/xxx.md](../common/xxx.md)`.

## Rules vs Skills

- **Rules** = standards that apply broadly, always-on, scoped by file type ("80% coverage", "no hardcoded secrets", "parameterized queries"). They tell you *what*.
- **Skills** (`skills/NN-name/`) = deep playbooks loaded on demand for a task. They tell you *how*.

Rules are the cheap always-on guardrail; skills are the expensive on-demand reference. Rules keep `CLAUDE.md` lean — house style lives here, scoped, instead of in one giant always-loaded file.

## Install

`setup/install.sh` copies the whole `rules/` tree to the consumer repo's `.claude/rules/dev-team-kit/`. The harness picks them up from there.

Manual:

```bash
mkdir -p .claude/rules/dev-team-kit
cp -r rules/common .claude/rules/dev-team-kit/
cp -r rules/typescript .claude/rules/dev-team-kit/   # add languages your repo uses
cp -r rules/python .claude/rules/dev-team-kit/
cp -r rules/react .claude/rules/dev-team-kit/
```

> **Do NOT flatten** (`rules/*/`) into one directory. `common/` and language dirs share filenames (`security.md`, `testing.md`...); flattening makes language files clobber common and breaks the `../common/` references.

## Languages shipped (MVP)

- `common/` — 8 agnostic files (always apply)
- `typescript/` — TS/JS
- `python/` — Python
- `react/` — React/Next.js (`.tsx`/`.jsx`)

## Adding a language

1. `mkdir rules/<lang>/`
2. Add the files you have content for: `coding-style.md`, `testing.md`, `patterns.md`, `security.md` (only what's worth saying — don't pad).
3. Each file starts with frontmatter `paths:` glob + `> Extends [common/xxx.md](../common/xxx.md)`.
4. Reference an existing skill for the deep *how* when one fits.
