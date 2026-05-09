# Program: detective-spec

## Intent
Reverse-engineer executable specs from a legacy codebase without modifying any source files.

## Sequence
```
/recon{target=module_path, output='_detective_sdd/00-overview.md'}
→ /detective-contracts{scope=input.scope, depth='deep'}
→ /detective-business-rules{input=contracts}
→ /detective-flows{input=contracts, trigger=entry_points}
→ /detective-adrs{input=all_above, output='_detective_sdd/04-adrs/'}
→ /traceability{output='_detective_sdd/99-traceability.md'}
```

## Protocol / Command refs
- `/recon` → phase 1 of `skills/33-detective-spec/SKILL.md`
- `/detective-contracts` → `.claude/agents/detective-contracts.md`
- `/detective-business-rules` → `.claude/agents/detective-business-rules.md`
- `/detective-flows` → `.claude/agents/detective-flows.md`
- `/detective-adrs` → `.claude/agents/detective-adrs.md`
- `/traceability` → phase 6 of `skills/33-detective-spec/SKILL.md`

## Inputs
```yaml
input:
  module_path: path             # legacy module or directory to analyze
  scope: enum(file|dir|pkg)     # default: dir
  phases: list<integer>         # optional: run only specific phases (1-5)
```

## Abort conditions
- Any phase: confidence=low on >50% of findings → warn user, offer to continue or halt
- Write attempt outside `_detective_sdd/` or `.detective/` → hard stop (see `policies/detective-write-guardrails.md`)
- Checkpoint resume: if `.detective/state.json` exists, resume from last completed phase

## Notes
- All subagents in this program are read-only except for writing to `_detective_sdd/`.
- Graphify god nodes become priority modules for phase 2.
- See `skills/33-detective-spec/SKILL.md` for full phase descriptions.
