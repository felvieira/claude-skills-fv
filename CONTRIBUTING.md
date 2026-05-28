> 🌎 English version · 🇧🇷 [Versão em Português](CONTRIBUTING.pt-BR.md)

# Contributing to the Dev Team Kit

Thanks for your interest in contributing! This guide covers how to add skills, fix bugs, propose improvements, and keep the kit consistent.

---

## Table of Contents

- [Project structure](#project-structure)
- [Adding a new skill](#adding-a-new-skill)
- [Editing existing skills](#editing-existing-skills)
- [Adding slash commands](#adding-slash-commands)
- [Adding a new policy](#adding-a-new-policy)
- [Adding a program](#adding-a-program-declarative-yaml-pipeline)
- [Adding a subagent](#adding-a-subagent)
- [Editing hooks](#editing-hooks)
- [Checklist before opening a PR](#checklist-before-opening-a-pr)
- [Commit conventions](#commit-conventions)

---

## Project structure

```text
.
├── skills/           ← one folder per skill (01-po-feature-spec, 02-ui-ux-design, ...)
│   └── NN-name/
│       └── SKILL.md  ← the skill prompt
├── commands/         ← slash commands (/spec, /plan, /build, /loop, ...) — autodiscovery
├── agents/           ← subagents dispatchable via the Task tool — autodiscovery
├── policies/         ← shared rules across skills
├── programs/         ← declarative YAML pipelines (.yml) + descriptive (.md)
├── personas/         ← structured-output personas
├── hooks/            ← hooks PreToolUse / PostToolUse / SessionStart / Stop / UserPromptSubmit
│   ├── scripts/      ← each hook is a Node .mjs
│   ├── hooks.json    ← canonical hook registry by event
│   └── config.json   ← defaults + profiles (minimal/standard/strict)
├── evals/            ← versioned fixtures (triggers/, commands/, programs/)
├── docs/skill-guides/← operational guides (skill-discovery, autonomous-loop, ...)
├── scripts/          ← utilities (auto-loop.mjs, check-consistency.mjs, eval-triggers.mjs, ...)
├── mcp-server/       ← TypeScript MCP server (exposes 37 tools)
├── setup/            ← installer (install.sh) and platform configs
└── templates/        ← handoff, plan, review, rejection templates
```

> **Autodiscovery (since v1.5.2):** the plugin discovers skills, commands and agents from the
> `skills/`, `commands/` and `agents/` directories automatically. There is **no** registration
> array in `.claude-plugin/plugin.json` — just create the file in the right directory.

---

## Adding a new skill

1. **Create the folder** with the next available number:
   ```bash
   mkdir skills/NN-skill-name
   ```

2. **Write `SKILL.md`** following the template of existing skills:
   - `## Role` section — who the agent is
   - `## Inputs` section — what it receives
   - `## Process` section — how it runs (use `### Step N`)
   - `## Output` section — what it delivers
   - `## Handoff` section — which skill it passes to next
   - `## Persona` section (optional) — reference to `personas/*.md`

3. **Create the eval fixture** at `evals/triggers/NN-skill-name.json` with `should_trigger` (≥10 prompts that must activate it) and `shouldnt_trigger` (≥5 that must not). Run `node scripts/eval-triggers.mjs` — should-accuracy must be ≥80% and shouldnt ≤20%.

4. **Update the counters** in every canonical spot: `README.md` + `README.pt-BR.md` (badge + table), `docs/WIKI.md` + `docs/WIKI.pt-BR.md` (header), `docs/SKILLS-OVERVIEW.md` (header), `.claude-plugin/plugin.json` (description + version), `mcp-server/package.json`, `CHANGELOG.md`.

5. **Run the checks** (the skill is autodiscovered — no manual registration in plugin.json):
   ```bash
   node scripts/check-consistency.mjs
   node scripts/eval-triggers.mjs
   node scripts/skill-health.mjs   # 0 overlaps, 0 dead policies, rich description
   ```

---

## Editing existing skills

- Edit only `skills/NN-name/SKILL.md`
- If you change the `## Handoff` section, update dependent skills
- If you add a `## Persona`, create the file in `personas/` and reference the full path
- Run `node scripts/check-consistency.mjs` before committing

---

## Adding slash commands

1. **Create `commands/name.md`** with frontmatter (autodiscovered — no manual registration):
   ```markdown
   ---
   description: Short command description
   ---
   ```

2. **Add to the slash-command table** in **ALL** canonical spots:
   - `README.md` + `README.pt-BR.md` (table in the commands section)
   - `AGENTS.md` ("Slash Commands" table)
   - `docs/WIKI.md` + `docs/WIKI.pt-BR.md` (full aihero-format entry: what / when / problem / example / takeaway)
   - `docs/SKILLS-OVERVIEW.md` (short entry in the commands index)

3. **If the command introduces a new pipeline:**
   - create the declarative `programs/<name>.yml` + descriptive `programs/<name>.md` and register in `programs/README.md`
   - update `policies/handoffs.md` with the canonical chain
   - if the command has authority over other decisions (like `/constitution`): update relevant skills (`skills/NN-*/SKILL.md`) to consult it

4. **Eval coverage:**
   - create `evals/commands/<name>/golden.json` with 3-4 cases covering happy path, edge cases, anti-patterns
   - if the command is backed by a subagent: also `evals/protocol-shells/<subagent>/`

5. **Consistency check** (the command is autodiscovered from `commands/` — no manual registration):
   - for a structural command, add an assertion in `scripts/check-consistency.mjs` validating that `commands/<name>.md` exists
   - run `node scripts/check-consistency.mjs` before committing — it must pass

6. **Semver bumps:**
   - `MAJOR` if you removed/renamed an existing command
   - `MINOR` if it's a new command
   - `PATCH` if it's just a doc update
   - bump in `README.md` (badge), `README.pt-BR.md` (badge), `.claude-plugin/plugin.json`, `mcp-server/package.json`, `docs/SKILLS-OVERVIEW.md` (header)
   - add a `CHANGELOG.md` entry with Added/Changed/Sources sections

7. **Git tag + GitHub Release** when merging to main:
   - `git tag vX.Y.Z -m "..."`
   - `gh release create vX.Y.Z --title "..." --notes-from-tag`

---

## Adding a new policy

Policies in `policies/*.md` are rules shared across multiple skills.

1. **Create `policies/<name>.md`** with sections:
   - `## Objective` (1-2 lines)
   - `## When to apply` (concrete list of situations)
   - `## Rules` or `## Principles` (body)
   - `## Anti-patterns` (what to avoid)
   - `## Integration` (related skills/policies)

2. **Update affected skills:** add `policies/<name>.md` to the "Global Governance" section of every skill that should consult it.

3. **Cross-references:** if the policy relates to existing ones (e.g. `quality-gates.md`, `writing-clarity.md`), add a bidirectional link.

4. **CHANGELOG:** Added entry with source/inspiration if applicable.

5. **Semver bump:**
   - `MINOR` if it's a new policy
   - `PATCH` if it's an update to an existing policy

Recent examples (v1.5.0): `mcp-builder-patterns.md`, `verification-before-completion.md`, `receiving-code-review.md`, `memory-consolidation.md` — all follow this structure.

---

## Adding a program (declarative YAML pipeline)

Programs in `programs/*.yml` are pipelines executable via `/run-program`. Canonical format in `policies/programs-schema.md`.

1. **Create `programs/<name>.yml`** following the schema:
   - `schema_version: "1.0"`
   - `program: { id, name, version, description, authors }`
   - `requires:` (optional — kit_version, commands, skills, policies)
   - `inputs:` (parameters asked via AskUserQuestion)
   - `steps:` (array of command/gate/parallel/conditional)

2. **Validate:**
   ```bash
   node scripts/validate-program.mjs programs/<name>.yml
   ```
   Must return `✓` before committing.

3. **Create `programs/<name>.md`** (descriptive) explaining:
   - When to use / When NOT to use
   - Design decisions (why these gates, this parallel, this conditional)
   - Difference vs other programs
   - Notes / handoff

4. **Register in `programs/README.md`** in the Index table with links to both files.

5. **Optional eval coverage** in `evals/programs/<name>/golden.json` (3+ cases covering happy path, gate rejection, missing input).

6. **CHANGELOG + semver bump:**
   - `MINOR` if it's a new program
   - `PATCH` if it's an adjustment to an existing program

Examples (v1.6.0): `pipeline-discovery.yml`, `spec-driven-development.yml`, `loop-polishing.yml`, `detective-spec.yml`.

---

## Adding a subagent

Subagents live in `agents/` (autodiscovered since v1.5.2) and follow the Claude Code frontmatter format.

1. **Create `agents/name.md`** with the required frontmatter:
   ```markdown
   ---
   name: agent-name
   description: Clear description of what the agent does and when it should be invoked
   tools: Read, Grep, Glob, Bash   ← only the tools needed
   model: sonnet                    ← sonnet | opus | haiku
   ---

   # Agent Name

   [Agent prompt here — be specific about process and output]
   ```
   The plugin discovers the subagent automatically — there is **no** manual registration in `plugin.json`.

2. **Document in `AGENTS.md`** — add a row to the subagents table.

3. **Run the consistency check** and add a `CHANGELOG.md` entry.

**Best practices:**
- Keep the prompt under 2,000 chars — reference `personas/` or `skills/` by link instead of duplicating
- Set `tools:` with least privilege — test-engineer needs Edit/Write, code-reviewer does not
- Use `model: opus` only for the orchestrator — the cost is high

---

## Editing hooks

Hooks live in `hooks/scripts/`. Each `.mjs` file is a Node.js hook. To **add** a hook:

1. **Create `hooks/scripts/hook-name.mjs`** — read stdin (the JSON payload), never block on error (`try/catch` + `process.exit(0)`), emit `hookSpecificOutput.additionalContext` (UserPromptSubmit/PostToolUse) or `systemMessage` (SessionStart) when you need to talk to the agent.
2. **Register in `hooks/hooks.json`** under the right event (`UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`).
3. **Declare defaults in `hooks/config.json`** in its own section (e.g. `"my_hook": { "enabled": true }`) so users can customize without editing code.
4. **Add to the `minimal` profile** in `config.json` (`hook_profiles.profiles.minimal.disabled`) if the hook is "noisy" (suggestions/warnings) — the minimal profile disables everything non-essential.
5. **Honor `isHookDisabled("hook-name")`** at the start (from `utils.mjs`) to respect profiles and `DEVKIT_DISABLED_HOOKS`.

- Test locally: `echo '{"prompt":"..."}' | node hooks/scripts/hook-name.mjs`
- Validate syntax: `node --check hooks/scripts/hook-name.mjs`
- Hooks are copied to `.bot/hooks/` by the installer (and `setup/install.sh` must know about new hooks)

---

## Checklist before opening a PR

```
[ ] node scripts/check-consistency.mjs passes with no errors
[ ] node scripts/eval-triggers.mjs passes (if you added/edited a skill — should ≥80%, shouldnt ≤20%)
[ ] node scripts/skill-health.mjs clean (0 overlaps, 0 dead policies, rich descriptions)
[ ] node --check on the edited script (.mjs) — valid syntax
[ ] .claude-plugin/plugin.json parses as valid JSON (version bumped if needed)
[ ] Counters in sync (README.md, README.pt-BR.md, WIKI.md, WIKI.pt-BR.md, SKILLS-OVERVIEW.md)
[ ] README.md in English, README.pt-BR.md in Portuguese (no language leakage)
[ ] CHANGELOG.md updated with the new version
[ ] Commit follows the conventions below
```

---

## Commit conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Type | When to use |
|------|-------------|
| `feat:` | New skill, command, hook or feature |
| `fix:` | Bug fix in a skill, script or config |
| `docs:` | Change to README, guides, CHANGELOG |
| `refactor:` | Reorganization with no behavior change |
| `chore:` | Maintenance (deps, CI, build scripts) |

**Examples:**
```
feat: add skill 33-design-tokens
fix: fix stall detection in auto-loop.mjs
docs: add context engineering guide
```

---

## Questions?

Open an [issue](https://github.com/felvieira/claude-skills-fv/issues) describing what you want to add or fix.

---

> 🌎 English version · 🇧🇷 [Versão em Português](CONTRIBUTING.pt-BR.md)
