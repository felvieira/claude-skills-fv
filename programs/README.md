# Programs

Declarative cognitive program definitions for the Dev Team Kit.

A **program** is an ordered sequence of protocol shells (or slash commands) composing a multi-step workflow. Programs make pipelines auditable, composable, and easy to reference from the orchestrator.

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
| [pipeline-discovery](pipeline-discovery.md) | Full discovery: interrogation → PRD → issues → TDD loop → ship |
| [spec-driven-development](spec-driven-development.md) | Constitution-anchored pipeline with /checklist + /analyze gates between artifacts |
| [detective-spec](detective-spec.md) | Reverse-engineer specs from legacy: recon → modules → rules → flows → ADRs |
| [loop-polishing](loop-polishing.md) | Auto-loop with quality polishing pass before commit |
