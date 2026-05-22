# Eval Bench — Quality Validation Across All 39 Skills + 15 Subagents

**Goal:** prove (or disprove) the kit's value with measurable before/after evidence per flow. Each skill and subagent gets a realistic scenario, runs in isolation, and produces output that we score against a published rubric.

## Why this exists

The marketing says "39 specialists save tokens and improve quality." This bench tests if that's true. Output is auditable, reproducible, and pinned to git.

Sister to `bench/` (compressor token savings) — that one measures **mechanical** efficiency. This one measures **output quality**.

## Folder layout

```
eval-bench/
├── README.md                          ← this file
├── methodology.md                     ← rubric, metrics, before/after protocol
├── scenarios/
│   ├── skills/
│   │   ├── 01-po-feature-spec.md      ← input + expected output + rubric
│   │   ├── 02-ui-ux-design.md
│   │   └── ... (39 files)
│   └── agents/
│       ├── code-reviewer.md
│       └── ... (15 files)
├── outputs/
│   ├── wave1/                         ← raw output from each subagent run
│   ├── wave2/
│   └── ...
└── reports/
    ├── per-skill.md                   ← one row per skill, scored
    ├── per-agent.md
    └── final-report.md                ← aggregate ROI + verdict
```

## Run protocol

Each scenario goes through 2 passes:

1. **Baseline (without kit):** generic LLM prompt, no skill loaded, no policies. Captures "AI solo" output.
2. **Treatment (with kit):** invoke the specific skill or subagent. Captures "AI + Dev Team Kit" output.

Both passes use the same input, same model tier. The delta is what we report.

## Metrics tracked

| Metric | How |
|---|---|
| `quality_score` (1-5) | Manual rubric per scenario, 5 criteria each |
| `tokens_in` / `tokens_out` | Counted approximately (bytes/4) |
| `time_seconds` | Wall clock |
| `pass_fail` | Boolean against scenario's published threshold |
| `delta_score` | treatment - baseline |
| `delta_tokens` | difference in output size |

## Verdict criteria

- A skill passes if it scores **+1.5 or more** on quality_score vs baseline
- A skill fails if score is **equal or worse** than baseline (kit hurt rather than helped)
- Anything in between is "marginal" and flagged for review

## Reproducing

```bash
# After cloning the repo:
node eval-bench/runners/run-all.mjs --wave=1
# or
node eval-bench/runners/run-all.mjs --skill=01-po-feature-spec
```

See `methodology.md` for the full rubric and `scenarios/` for input specs.
