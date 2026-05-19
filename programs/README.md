# Programs

Declarative cognitive program definitions for the Dev Team Kit.

A **program** is an ordered sequence of protocol shells (or slash commands) composing a multi-step workflow. Programs make pipelines auditable, composable, and easy to reference from the orchestrator.

## Two formats coexist (since v1.6.0)

| Format | Purpose | Read by |
|---|---|---|
| `programs/<name>.md` | **Descriptive** — explains the flow, when/why/handoff, design decisions | Humans |
| `programs/<name>.yml` | **Executable** — machine-parseable pipeline with gates, conditionals, parallel, variable substitution | `/run-program` + `scripts/run-program.mjs` |

Both coexist. The `.md` is the conceptual source of truth; the `.yml` is the mechanical implementation.

Schema reference: [`policies/programs-schema.md`](../policies/programs-schema.md).
Validator: `node scripts/validate-program.mjs`.
Executor: `/run-program <name>`.

## What belongs here

- Multi-step pipelines that involve 3+ protocol shells or slash commands in sequence
- Pipelines that are referenced by more than one skill or command
- Pipelines where the order and composition matter for correctness

## What does NOT belong here

- Single-skill invocations (just use the skill directly)
- Ad-hoc one-off sequences (use the orchestrator's pipeline selection)

## Format

Each program file follows this structure:

```markdown
# Program: <name>

## Intent
One sentence describing the goal.

## Sequence
```
/step.one{param='value'}
→ /step.two{param='value'}
→ /step.three{}
```

## Protocol / Command refs
- `/step.one` → source file or skill ref

## Abort conditions
- condition that stops the program early
```

## Index

| Program | Intent |
|---|---|
| [pipeline-discovery](pipeline-discovery.md) · [yml](pipeline-discovery.yml) | Full discovery: interrogation → PRD → issues → TDD loop → ship |
| [spec-driven-development](spec-driven-development.md) · [yml](spec-driven-development.yml) | Constitution-anchored pipeline with /checklist + /analyze gates between artifacts |
| [detective-spec](detective-spec.md) · [yml](detective-spec.yml) | Reverse-engineer specs from legacy: recon → modules → rules → flows → ADRs |
| [loop-polishing](loop-polishing.md) · [yml](loop-polishing.yml) | Auto-loop with quality polishing pass before commit |
| [adversarial-dev](adversarial-dev.md) · [yml](adversarial-dev.yml) | GAN-inspired: planner + generator/evaluator loop with adversarial scoring (5 criteria, threshold per sprint) |
| [comprehensive-review](comprehensive-review.md) · [yml](comprehensive-review.yml) | 5-agent parallel PR review (code/errors/tests/comments/docs) + security + synthesize + auto-fix CRITICAL/HIGH |
| [refactor-safely](refactor-safely.md) · [yml](refactor-safely.yml) | Refactor with behavior preservation: baseline tests + analyze read-only + atomic plan + execute with type-check + verify behavior + PR |
