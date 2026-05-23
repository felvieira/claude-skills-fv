# Dev Team Kit — Analyze Doc

Self-contained quality report for the Dev Team Kit, generated from the eval-bench results and 3 end-to-end tests run during sessions 2026-05-22/23.

## Pages

| Language | File | What it covers |
|---|---|---|
| 🌎 English | [`index.en.html`](./index.en.html) | Full test report — 53 isolation cenarios + 3 E2E tests + v2.10.1 fixes |
| 🇧🇷 Português | [`index.pt-BR.html`](./index.pt-BR.html) | Same content in Portuguese |

## How to view

Open either HTML file directly in any browser — fully offline, no server required:

```
file:///D:/Repos/claude-skills-fv/analyze-doc/index.en.html
```

Or, if hosted on GitHub Pages:

```
https://felvieira.github.io/claude-skills-fv/analyze-doc/index.en.html
```

## What's inside

- **Hero summary** — 54 skills/agents evaluated, 92.6% pass rate, +1.84 avg delta
- **Overview** — what was tested and how (isolation + E2E + process-based)
- **Before / After** — 5 real text examples (PO spec, semgrep-triager, Security, Debugger, Pipeline)
- **Test 1 — App from scratch** — 33/33 tests, simulated /swarm flow
- **Test 2 — Manual pipeline** — PO → Orchestrator → Backend → QA → Security → Reviewer with handoffs
- **Test 3 — Feature in existing repo** — 8/8 tests, stack respected
- **Wave 1-5 — Isolation bench** — every skill and subagent with baseline/treatment/delta
- **Process-based** — auto-loop, swarm, 7 programs YAML, slash commands
- **v2.10.1 Fixes** — bench-driven fixes with measured before/after
- **Token savings** — 13% single-call / 98% re-run reduction
- **Honesty** — what didn't work and why

## Methodology

- **Rubric:** 5 criteria × 1-5 scale (specificity, completeness, correctness, actionability, discipline) → normalized to 1-5
- **Pass threshold:** delta ≥ 1.5 (treatment minus baseline)
- **Model:** claude-sonnet-4-6 for both baseline and treatment (controlled variable)
- **Scenarios:** real prompts in `eval-bench/scenarios/`
- **Outputs:** every Pass A and Pass B saved in `eval-bench/outputs/` for audit

## Source data

- `../eval-bench/outputs/` — all 53 baseline+treatment pairs
- `../eval-bench/scenarios/` — scenario definitions per skill/agent
- `../eval-bench/reports/final-report.md` — synthesized markdown report
- `../docs/releases/SESSION-2026-05-23-FINAL-REPORT.md` — session summary

## License

Apache-2.0. See [`../LICENSE`](../LICENSE) and [`../NOTICE`](../NOTICE).
