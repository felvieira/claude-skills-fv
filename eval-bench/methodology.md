# Eval Bench — Methodology

## What we are measuring

For every skill and subagent in the kit, we want a defensible answer to a single question: **does invoking this specific kit artifact produce meaningfully better output than letting the same model answer cold?**

If yes — by how much, on what dimension, at what token cost.
If no — flag it. A skill that doesn't help is dead weight.

## Rubric (5 criteria, 1-5 each, max 25)

Every scenario is scored on the same axes. Criteria are deliberately generic so they apply equally to a "write a spec" output and a "review code" output.

| # | Criterion | What we look for |
|---|---|---|
| 1 | **Specificity** | Does the output cite the actual stack, file names, conventions of the input — or is it generic boilerplate? |
| 2 | **Completeness** | Does it cover the criteria the scenario lists as required, or does it skip steps? |
| 3 | **Correctness** | Is what it says actually true (no hallucinated APIs, no fictional libraries, no broken syntax)? |
| 4 | **Actionability** | Could the reader take the output and execute on it in <10 minutes, or do they need to ask 5 clarifying questions first? |
| 5 | **Discipline** | Did it respect scope (no scope creep), respect existing patterns (no rewriting), and surface risks rather than hide them? |

Each criterion: **1 = absent**, **3 = adequate**, **5 = excellent**. Total per output: 5-25.

Convert to 1-5 scale for the summary: `(total - 5) / 4` rounded to 1 decimal.

## Pass / fail threshold

A skill **passes** when `delta_quality_score ≥ 1.5` (out of 5, after normalization).

Reasoning:
- Below 1.5: the lift is inside noise. The skill might still be useful (token cost, time), but quality alone doesn't justify it.
- 1.5-3: meaningful improvement. The skill earns its place.
- 3+: transformative. The skill is doing real work the model alone wouldn't do.

We also report **delta_tokens** and **time_seconds** but those don't gate pass/fail. A skill that produces +0.5 quality for -70% tokens is fine.

## Before / after protocol

For each scenario, two independent runs:

### Pass A — Baseline (without kit)
- Use `general-purpose` subagent (no skill loaded)
- Same model tier as Pass B (Sonnet default)
- Prompt: the **input** field of the scenario, verbatim
- No reference to the kit, no policy mention, no template injection
- Output goes to `eval-bench/outputs/<wave>/<id>-baseline.md`

### Pass B — Treatment (with kit)
- Use `general-purpose` subagent with `isolation: "worktree"`
- Prompt instructs first action: `Skill({ skill: "dev-team-kit-fv:NN-name" })`
- For subagents: dispatch directly via `Agent({ subagent_type: "dev-team-kit-fv:name" })`
- Same input as Pass A
- Output goes to `eval-bench/outputs/<wave>/<id>-treatment.md`

## How scoring happens

For this run, scoring is done by **the synthesis step at the end** (Wave 6: synthesis), which reads each pair of outputs and scores them against the scenario's rubric. This is automation-friendly but biased — same model scores both outputs.

Mitigation:
- The rubric is published per scenario before runs start.
- Raw outputs are committed to git — anyone can re-score later.
- We publish baseline + treatment side by side, not just our verdict.

For future runs, scoring should be done by a different model (e.g. Opus scoring Sonnet outputs) or by humans on a sample. Documented as roadmap.

## Token accounting

Each output writes a frontmatter block at the top:

```yaml
---
scenario: 01-po-feature-spec
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 1240
tokens_out_approx: 2870
time_seconds: 42
quality_score: 4.2
quality_breakdown:
  specificity: 5
  completeness: 4
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.7
notes: "cited stack correctly, used PO template, asked 0 clarifying questions"
---
```

This makes every output self-describing. The synthesis step just aggregates frontmatter, no parsing of prose required.

## Scenario file shape

Every scenario in `scenarios/skills/` and `scenarios/agents/` follows this template:

```markdown
# <id> — <human readable name>

## Input

<the realistic user prompt, verbatim>

## Required output elements

- <bullet 1>
- <bullet 2>
- ...

## Pass threshold

quality_score ≥ <N> on the 1-5 scale

## Rubric weights (optional override)

If this scenario weights criteria differently than the default 1:1:1:1:1.

## Notes for runners

<anything specific the runner needs to know>
```

## Bias and limitations we explicitly accept

1. **Same-model scoring.** Mitigation above. Will revisit when budget allows Opus scoring Sonnet, or human sampling.
2. **One scenario per skill.** A skill that nails one scenario but fails on adjacent ones still scores high here. Future work: 3 scenarios each, vary inputs.
3. **No statistical significance test.** Single run per pass. Could be re-run N times for variance, but cost scales linearly.
4. **No human cross-check.** The whole bench runs LLM end-to-end. Marketing claim should say "self-evaluated" or "automated bench" — never "human-validated."

## What this bench does NOT measure

- Real-world latency under user think-time (we measure model time only).
- Cost in dollars (we report tokens, not pricing — pricing changes).
- Integration cost (how long to install the kit, configure hooks, etc.).
- Long-horizon tasks that need >1 turn (autonomous loops). Sister bench in `bench/` partially covers re-run efficiency.

## Reproducibility

- All scenarios live in git
- All outputs land in git after a run
- Synthesis reads only git-tracked files
- Anyone can re-run and submit a PR with their own results in `eval-bench/outputs/runs/<date>-<sha>/`
