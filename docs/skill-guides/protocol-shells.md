# Protocol Shells — Authoring Guide

## What is a protocol shell?

A protocol shell is a typed, machine-readable header added to a subagent file that declares its input contract, process steps, and output contract. Inspired by [Pareto-lang](https://github.com/davidkimai/Context-Engineering/tree/main/60_protocols) from davidkimai/Context-Engineering.

Protocol shells make subagent handoffs auditable, enable I/O schema validation, and allow programs/ pipelines to compose subagents declaratively.

## Format

```markdown
---
version: "1.0"
type: protocol-shell
---

# Protocol Shell: <name>

## Intent
One sentence describing what this protocol does.

## Input
\`\`\`yaml
input:
  field_name: <type>        # description
  field_name_2: <type>      # description (optional)
\`\`\`

Supported types: `string`, `path`, `list<string>`, `list<finding>`, `integer`, `boolean`, `enum(a|b|c)`

## Process
\`\`\`
/operation.one{param='value'}
/operation.two{param='value'}
/operation.three{}
\`\`\`

## Output
\`\`\`yaml
output:
  field_name: <type>        # description
  confidence: high|medium|low
\`\`\`

## Meta
\`\`\`yaml
meta:
  version: "1.0.0"
  skill_ref: "skills/NN-name/SKILL.md"
  allowed_tools: [Read, Grep, Glob, Bash]
\`\`\`
```

## Rules

- **Add a shell when** the subagent has 2+ callers, is referenced in an eval golden test, or is part of a `programs/` pipeline.
- **Skip the shell when** the subagent has only one caller and no eval coverage.
- Every shell **must** include `confidence: high|medium|low` in its output — callers use this to decide whether to propagate the result.
- Insert the shell as a `## Protocol Shell` section **before** existing instructions in the subagent file. Never replace existing instructions.
- Use the exact type names listed in `policies/protocol-shells.md` (case-sensitive).
- Version bumps follow semver semantics: patch for clarifications, minor for new optional fields, major for breaking changes.

## Example 1: detective-contracts

```markdown
---
version: "1.0"
type: protocol-shell
---

# Protocol Shell: detective-contracts

## Intent
Extract module contracts (API surface, deps, invariants, consumers) from legacy code — read-only.

## Input
\`\`\`yaml
input:
  module_path: path         # path to the module file or directory to analyse
  scope: enum(file|dir|pkg) # analysis granularity
  depth: enum(shallow|deep) # how far to trace dependencies and consumers
\`\`\`

Supported types: `string`, `path`, `list<string>`, `list<finding>`, `integer`, `boolean`, `enum(a|b|c)`

## Process
\`\`\`
/scan.public_api{}
/extract.dependencies{}
/identify.invariants{}
/map.consumers{}
/output.contract_doc{}
\`\`\`

## Output
\`\`\`yaml
output:
  contract_path: path           # path to the generated contract document
  public_api: list<string>      # exported symbols (functions, classes, constants)
  dependencies: list<string>    # direct imports and external deps
  confidence: high|medium|low
\`\`\`

## Meta
\`\`\`yaml
meta:
  version: "1.0.0"
  skill_ref: "skills/33-detective-spec/SKILL.md"
  allowed_tools: [Read, Grep, Glob, Bash]
\`\`\`
```

## Example 2: semgrep-triager

```markdown
---
version: "1.0"
type: protocol-shell
---

# Protocol Shell: semgrep-triager

## Intent
Classify Semgrep findings as TP/FP/needs-investigation by reading source context.

## Input
\`\`\`yaml
input:
  sarif_path: path       # path to the SARIF file produced by Semgrep
  batch_limit: integer   # maximum number of findings to process in one run
  codebase_root: path    # root directory of the codebase for source lookup
\`\`\`

Supported types: `string`, `path`, `list<string>`, `list<finding>`, `integer`, `boolean`, `enum(a|b|c)`

## Process
\`\`\`
/parse.sarif{}
/read.source_context{}
/classify.finding{}
/generate.fix_suggestion{}
/generate.suppression{}
/output.triage_report{}
\`\`\`

## Output
\`\`\`yaml
output:
  true_positives: list<finding>        # confirmed real vulnerabilities
  false_positives: list<finding>       # confirmed non-issues with rationale
  needs_investigation: list<finding>   # ambiguous findings requiring human review
  confidence: high|medium|low
\`\`\`

## Meta
\`\`\`yaml
meta:
  version: "1.0.0"
  skill_ref: "skills/semgrep/SKILL.md"
  allowed_tools: [Read, Grep, Glob, Bash]
\`\`\`
```

## How to validate

```bash
node scripts/validate-schema.mjs schemas/skill-io/detective-contracts.json
```
