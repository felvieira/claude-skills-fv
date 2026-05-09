# Protocol Shell Evals

Golden test cases for subagents with protocol shell I/O contracts.

## Purpose

These golden tests define the expected input/output shape for each protocol-shell-equipped subagent. They serve as:
1. Regression guards — detect when a subagent's output shape drifts
2. Schema validation reference — each case links to its JSON Schema in `schemas/skill-io/`
3. Eval baseline — used by `evals/` CI to confirm structural correctness

## Running

```bash
node scripts/validate-schema.mjs --all schemas/skill-io/
```

## Structure

Each subdirectory corresponds to one subagent:
- `detective-contracts/golden.json`
- `semgrep-triager/golden.json`
- `code-reviewer/golden.json`

## Adding new cases

1. Copy an existing `golden.json`
2. Add a new object to the `cases` array
3. Run `node scripts/validate-schema.mjs` to verify the schema still validates
