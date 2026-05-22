# Token savings — reproducible benchmark

This page is the source of truth for the Dev Team Kit's compression claims. Every percentage we publish ties back to a fixture in [`bench/fixtures/`](../../bench/fixtures/) and a runner you can execute yourself: [`bench/run.mjs`](../../bench/run.mjs).

> Methodology adapted from [claudioemmanuel/squeez](https://github.com/claudioemmanuel/squeez) (Apache-2.0) — versioned fixtures + A/B baseline harness. Implementation is ours, in TypeScript, zero runtime deps. See [`NOTICE`](../../NOTICE).

## What we measure

Two numbers per fixture, plus an aggregate:

| Metric | What it captures |
|---|---|
| **single-call reduction** | What the intra-call pipeline (strip ANSI → dedup adjacent → collapse listings → hint filter → head/tail) saves the first time the agent sees that output. |
| **second-run reduction** | What cross-call MinHash dedup saves when the same command runs again later in the session. Identical or ≥85% similar outputs are replaced with a short marker (`[squeez-style: identical to call #N]` / `[squeez-style: ~87% similar to call #N]`). |

Both matter and they measure different things. Single-call helps every output; second-run is what compounds inside autonomous loops (`/auto`, `/swarm`).

## Reproduce

```bash
cd mcp-server && npm run build
cd ..
node bench/run.mjs
```

To export results to a file:

```bash
node bench/run.mjs --json > docs/benchmarks/latest-run.json
```

## Current fixtures

| Fixture | Source | Lines | Why it's representative |
|---|---|---|---|
| `npm-install.txt` | `npm install` of a typical Express+Mongoose+Redis stack | ~45 | Mix of deprecation warnings, HTTP fetches, timing lines, and a meaningful summary. |
| `git-log.txt` | `git log --since=...` over a busy week | ~50 | Author/Date/commit hash blocks with the body indented — exactly what `git log` hint filters. |
| `test-jest.txt` | `jest` running 28 tests across 4 suites | ~35 | Status lines + per-test timing + final summary. |
| `eslint.txt` | `eslint .` on a small TS project | ~25 | Error/warning lines grouped by file — typical lint noise. |
| `grep-output.txt` | `grep -rn export src/` | ~24 | High-density results that don't benefit from heavy filtering — measures the floor. |

These five are intentionally small (~7-8 KB total) so the harness runs in milliseconds. Add bigger fixtures as needed; the runner discovers them automatically.

## How we keep this honest

- **Versioned fixtures, public PRs.** Anyone can open a PR adding their own scenario.
- **Token approximation is `bytes ÷ 4`** and the runner says so. We don't dress up numbers with a tokenizer that depends on a specific model.
- **No regex tweaks per-fixture.** The compressor's hint dispatch is the same code that runs in production through the MCP server.
- **No re-runs that skew averages.** Each fixture is processed twice in `bench/run.mjs` — once with `crossCall: false` (single), once after the cache is seeded (second-run). Numbers are independent.

## What the numbers do *not* tell you

- **Real-world session totals.** A long autonomous session sees the same commands many times; cumulative savings tend to drift *upward* from the second-run number because the cache catches more matches over time.
- **Model-specific token counts.** Use `--json` and run your own tokenizer if you need a per-model figure.
- **Latency.** The compressor is fast (linear in bytes for the intra-call pipeline, O(N+M) for Jaccard merge), but if your bottleneck is latency rather than tokens, this benchmark won't show it.

## Roadmap for the bench

- Real-world session capture: pipe a `/swarm` JSONL log through the compressor and compare cumulative tokens-in vs tokens-out across N iterations.
- Per-host comparison: same fixtures run through the compressor with different hint configurations, to surface where hints over- or under-filter.
- Regression CI: any PR that regresses aggregate reduction by >5 points fails the workflow.

## Past results

When we publish run results, they land in [`docs/benchmarks/`](.) with a date stamp:

- `latest-run.json` — most recent capture
- `runs/YYYY-MM-DD-<commit-sha>.json` — historical snapshots

We are not pre-populating fake "before/after" numbers here. Run the bench, paste the table, link the commit. That is the only number that matters.
