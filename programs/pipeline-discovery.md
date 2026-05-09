# Program: pipeline-discovery

## Intent
Full discovery flow: requirement interrogation → PRD publication → issue slicing → TDD loop → ship.

## Sequence
```
/grill-me{turns='until-convergence', output='requirements'}
→ /to-prd{input=requirements, publish=true, label='needs-triage'}
→ /to-issues{input=prd, slices='vertical', tracker='github'}
→ /loop{agent='claude', polish='standard', tdd=true, per_issue=true}
→ /ship{changelog=true, version_bump='minor'}
```

## Protocol / Command refs
- `/grill-me` → `.claude/commands/grill-me.md`
- `/to-prd` → `.claude/commands/to-prd.md`
- `/to-issues` → `.claude/commands/to-issues.md`
- `/loop` → `scripts/auto-loop/` + `.claude/commands/loop.md`
- `/ship` → `.claude/commands/ship.md`

## Inputs
```yaml
input:
  feature_description: string   # initial feature description (can be vague)
  tracker: enum(github|linear|jira)  # default: github
  tdd: boolean                  # default: true
```

## Abort conditions
- `/grill-me`: user types `done` or no new requirements after 3 consecutive turns
- `/to-prd`: fails to publish (tracker auth missing) → halt and report
- `/loop`: circuit breaker trips (stall / quality-stall / permanent error / token cap)
- `/ship`: review or security gate fails → halt and report, do not publish

## Notes
- Use this program for large or ambiguous features needing parallel execution + tracker publication + TDD by slice.
- For small, well-defined tasks: use classic `/pipeline` instead.
- See `skills/09-orchestrator/SKILL.md` → "Dois Fluxos de Pipeline" for the decision tree.
