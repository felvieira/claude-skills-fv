# Protocol Shells Policy

## When to use a protocol shell

ADD a protocol shell to a subagent when:
- The subagent has 2 or more callers (other subagents or slash commands)
- The subagent is referenced in an eval golden test
- The subagent is part of a multi-step `programs/` pipeline

DO NOT add a shell when:
- The subagent has only one caller and no eval coverage (overhead not justified)

## Input field types

Use these types exactly (case-sensitive):

| Type | Meaning |
|---|---|
| `string` | Any text value |
| `path` | Filesystem path (relative or absolute) |
| `list<string>` | Array of strings |
| `list<finding>` | Array of security/analysis finding objects |
| `integer` | Whole number |
| `boolean` | true/false |
| `enum(a\|b\|c)` | One of the listed values |

## Required output field

Every protocol shell MUST include `confidence: high|medium|low` in its output.
This is the canonical signal for callers to decide whether to propagate the result.

## Versioning

- Bump `meta.version` **patch** (e.g. `1.0.0` → `1.0.1`) for any clarification change that preserves existing behavior.
- Bump **minor** (e.g. `1.0.0` → `1.1.0`) when adding a new optional output field.
- Bump **major** (e.g. `1.0.0` → `2.0.0`) when changing required fields or breaking output shape.

## Placement in subagent files

Insert the protocol shell as a `## Protocol Shell` section **before** the existing instructions in the subagent `.md` file.
Never replace existing instructions — the shell is additive metadata.

## Format reference

See `templates/protocol-shell.md` for the canonical template.
See `docs/skill-guides/protocol-shells.md` for worked examples.
