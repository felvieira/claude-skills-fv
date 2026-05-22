# Compressor benchmark — reproducible token savings

This folder is the **public benchmark** for the Dev Team Kit's output compressor. It exists for one reason: when the README claims X% reduction, you should be able to verify the number on your own machine in under 30 seconds.

Pattern adapted from [claudioemmanuel/squeez](https://github.com/claudioemmanuel/squeez) (Apache-2.0) — versioned fixtures + A/B harness — see [`NOTICE`](../NOTICE).

## What it measures

For every fixture in `bench/fixtures/`:

1. **Single-call reduction** — what `compressOutput` saves on the *first* time it sees that text. The intra-call pipeline (strip ANSI, dedup adjacent, collapse listings, hint filter, head/tail truncate) does the work.
2. **Second-run reduction** — what happens when the same command runs again later in the session (think `/auto` re-running `npm test` 12 times). With `crossCall: true` the cache catches identical or ≥85% similar outputs and replaces them with a short marker.

Both numbers matter. Single-call is what every output gets. Second-run is what autonomous loops compound across iterations.

## Run it

```bash
cd mcp-server && npm run build     # compile TypeScript first
cd ..
node bench/run.mjs                 # human-readable table
node bench/run.mjs --json          # machine-readable
```

Output:

```
Dev Team Kit — compressor benchmark
==============================================================================

fixture               hint          bytes-in   single%   re-run%  re-run-match
------------------------------------------------------------------------------
eslint.txt            generic            980       30%       95%  exact #4
git-log.txt           git log           1872       45%       95%  exact #2
grep-output.txt       generic           1745       12%       95%  exact #3
npm-install.txt       npm install       1923       60%       95%  exact #1
test-jest.txt         test              1308       40%       95%  exact #5
------------------------------------------------------------------------------
AGGREGATE                                7828       38%       95%
```

(Numbers above are illustrative — real output depends on the current fixture set.)

## Add a fixture

1. Capture a real command output:
   ```bash
   npm install 2>&1 > bench/fixtures/npm-install-new.txt
   ```
2. (Optional) Strip secrets/paths from your output before committing.
3. Re-run `node bench/run.mjs`.
4. PR the fixture with a short note in `bench/fixtures/README-fixture-<name>.md` explaining what command produced it, on what stack.

The runner auto-discovers any `.txt` file under `bench/fixtures/`. The hint is inferred from the filename (`npm-install*` → `npm install`, `git-log*` → `git log`, `test*`/`*jest*` → `test`, otherwise `generic`).

## Token approximation

The runner reports tokens as `bytes ÷ 4`. That's the standard rough estimate for English + code text. It is **deliberately not** calling a real tokenizer:

- Zero runtime deps — the bench has to work on a fresh clone without `tiktoken` or similar.
- Relative numbers (single% vs re-run% vs aggregate) are what matter for tracking improvements over time.

If you need exact token counts for a specific model, pipe `--json` output through your tokenizer of choice.

## Why publish this

> *"Up to 70% token reduction"* in a README with no fixture is marketing.
> *"38% on this 7.8 KB corpus, reproducible with one command"* is engineering.

The full writeup lives in [`docs/benchmarks/token-savings.md`](../docs/benchmarks/token-savings.md).
