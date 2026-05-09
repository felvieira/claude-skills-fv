# Program: loop-polishing

## Intent
Auto-loop execution with a structured quality polishing pass before each commit.

## Sequence
```
/loop.iterate{agent=input.agent, max_tokens=input.max_tokens}
→ /loop.score{scoring='scripts/auto-loop/scoring.mjs'}
→ /loop.circuit_check{stall=true, quality_stall=true}
→ /polish{level=input.polish_level}
→ /loop.commit{message=auto}
```

## Protocol / Command refs
- `/loop.iterate` → `scripts/auto-loop/runner.mjs`
- `/loop.score` → `scripts/auto-loop/scoring.mjs`
- `/loop.circuit_check` → `scripts/auto-loop/circuit-breaker.mjs`
- `/polish` → polish pass in `scripts/auto-loop/index.mjs` (--polish flag)
- `/loop.commit` → commit step in `scripts/auto-loop/runner.mjs`

## Inputs
```yaml
input:
  agent: enum(claude|codex)     # default: claude
  polish_level: enum(none|light|standard|full)  # default: standard
  max_tokens: integer           # optional token cap
  stop_when: string             # optional: natural language stop condition
```

## Scoring integration
Each iteration produces a score via `iterationScore()` in `scoring.mjs`.
If 3 consecutive scores < 0.3, `shouldStall()` returns true → circuit breaker trips with `quality-stall` reason.

## Abort conditions
- `quality-stall`: 3 consecutive iteration scores below 0.3
- Classic stall: 3 iterations without `git diff`
- Permanent error: same error 3× in a row
- Token cap: `max_tokens` exceeded
- `stop_when` condition met (agent reports `STOP_WHEN_MET: true`)
