---
scenario: 38-architecture-deepener
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 210
tokens_out_approx: 520
time_seconds: 18
quality_score: 2.8
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "generic advice, no deep module theory, no TS-specific tooling beyond madge, fitness functions are vague proxies"
---

# Pass A — Baseline (no skill)

**Input:** Repo médio (45k linhas TS, 200 arquivos), módulos rasos demais (chamada A→B→C→D só pra passar valor). Como identifico onde aprofundar e onde extrair? Que fitness functions valeria automatizar?

---

## Identifying shallow module chains

A→B→C→D pass-through chains are "shallow orchestration" — each layer adds no logic, just routing. Signs to look for:

1. **Single-responsibility violation in the wrong direction** — a function/class whose entire body is one call with at most one arg transformation.
2. **High fan-out with low cyclomatic complexity** — tools like `ts-complexity` or raw `eslint` with `complexity` rule will surface files with many imports but trivially low logic.
3. **Caller == callee in disguise** — if removing the intermediate layer requires zero changes to types, it's a passthrough.

## Where to deepen vs. extract

| Signal | Action |
|---|---|
| Layer adds no invariant, no validation, no transformation | Collapse it (remove the middle node) |
| Layer exists only to satisfy a DI interface | Keep if you need the seam for tests; remove if you don't |
| Layer has a meaningful name but delegates 100% | Rename → inline → done |
| Two layers share 80%+ of their interface | Extract a shared abstraction they both use |
| Deep chain with diverging concerns at each node | Split the chain into two independent paths |

## Fitness functions to automate

1. **Passthrough ratio** — `(functions that delegate 100% of body to a single callee) / total functions` — should stay < 5%.
2. **Call chain depth** — AST traversal from any exported symbol, count max depth before logic appears. Alert if > 3.
3. **Interface-to-implementation ratio** — if every function in a file appears in the layer above with the same signature, it's a mirror. Flag for consolidation.
4. **Coupling distance** — number of hops between where a value is created and where it's consumed. High coupling distance + no transformation = passthrough smell.
5. **Dead interface detection** — interfaces implemented by exactly one class with no mock in tests = unnecessary abstraction layer.

## Practical starting point for a 45k/200-file repo

```bash
# Find all files with a single exported function that has exactly one statement
grep -r "export function" src/ | xargs eslint --rule '{"max-statements": [warn, 1]}'

# Dependency graph — visualize chain depth
npx madge --image dep-graph.svg src/
```

Then sort by chain depth descending, review top 20. That's your hit list.
