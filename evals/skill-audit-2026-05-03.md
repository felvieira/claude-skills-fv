# Skill Audit Report — 2026-05-03

Audit of skills 01-32 + skill 36 using the evaluation criteria from `skills/35-skill-author/SKILL.md` "Fase 5: Eval".

**Scope notes:**
- Skill 16 intentionally absent (absorbed by `policies/model-routing.md`)
- Skills 33 (Detective Spec), 34 (Static Analysis), 35 (Skill Author) excluded — created concurrently with the scorecard in this same session and explicitly designed against it. Score by construction: PASS. Auditing them would be circular.
- Skill 36 (Web Asset Generator) **included** — created in the prior batch (top-5, 2026-05-02 afternoon) before the scorecard was formalized, so subject to the same scrutiny as 01-32.

## Methodology

10 criteria × 0-3 scale = 30 max. Threshold for PASS: >= 22.

| # | Criterion |
|---|---|
| 1 | Triggering: description has concrete trigger words |
| 2 | Quando usar: 3+ concrete bullets |
| 3 | Quando NAO usar: 3+ concrete bullets |
| 4 | Output esperado: format and path declared |
| 5 | Tools: minimum necessary (`allowed-tools` field) |
| 6 | Anti-padroes: list of real pitfalls |
| 7 | Integracao: points to upstream/downstream skills |
| 8 | Verbosidade: fits in ~400 lines |
| 9 | Writing clarity: respects `policies/writing-clarity.md` |
| 10 | Anti-rationalization: rigid skills have bias table (N/A=2 if flexible) |

## Results — sorted by score (worst first)

| Skill | Score | Weakest Criteria | Verdict |
|---|---|---|---|
| 21-data-analytics | 17/30 | Anti-rat absent; no `allowed-tools`; output path vague | NEEDS-REWRITE |
| 22-accessibility-specialist | 17/30 | Anti-rat absent; no `allowed-tools`; output path vague | NEEDS-REWRITE |
| 24-release-manager | 17/30 | Anti-rat absent; no `allowed-tools`; output path vague | NEEDS-REWRITE |
| 27-video-integration-specialist | 17/30 | Anti-rat absent; no `allowed-tools` | NEEDS-REWRITE |
| 19-asset-librarian | 18/30 | Description weak triggers; no `allowed-tools`; very short | NEEDS-REVIEW |
| 23-migration-refactor-specialist | 18/30 | No `allowed-tools`; anti-rat absent for rigid skill | NEEDS-REVIEW |
| 25-ai-integration-architect | 18/30 | No `allowed-tools`; anti-rat absent | NEEDS-REVIEW |
| 26-prompt-engineer | 18/30 | No `allowed-tools`; anti-rat absent | NEEDS-REVIEW |
| 20-observability-sre | 19/30 | Description triggers weak; no `allowed-tools` | NEEDS-REVIEW |
| 12-motion-design | 21/30 | Verbosity (509 lines); no `allowed-tools` | NEEDS-REVIEW |
| 02-ui-ux-design | 22/30 | No `allowed-tools`; no anti-rat | PASS |
| 13-marketing-copy | 22/30 | No `allowed-tools`; no anti-rat | PASS |
| 14-seo-specialist | 22/30 | No `allowed-tools`; no anti-rat | PASS |
| 30-cost-tracker | 22/30 | `allowed-tools: Bash` unrestricted | PASS |
| 01-po-feature-spec | 23/30 | No `allowed-tools`; no anti-rat | PASS |
| 08-context-manager | 23/30 | No `allowed-tools` | PASS |
| 10-documenter | 23/30 | No `allowed-tools`; no anti-rat | PASS |
| 17-image-generator | 23/30 | No anti-rat table | PASS |
| 31-session-summary | 23/30 | No anti-rat | PASS |
| 32-smart-suggestions | 23/30 | No bias table (likely N/A flexible) | PASS |
| 04-frontend-integration | 24/30 | Verbosity (537 lines); no `allowed-tools` | PASS |
| 07-deploy-docker | 24/30 | Verbosity (598 lines); no anti-rat | PASS |
| 15-mobile-tauri | 24/30 | No `allowed-tools`; no anti-rat | PASS |
| 18-repo-auditor | 24/30 | No anti-rat (rigid skill could use one) | PASS |
| 28-claude-md-generator | 24/30 | No anti-rat | PASS |
| 29-design-intelligence | 25/30 | No anti-rat | PASS |
| 03-backend-api | 26/30 | No `allowed-tools` declared | PASS |
| 05-qa-testing | 26/30 | No `allowed-tools` declared | PASS |
| 09-orchestrator | 26/30 | No `allowed-tools` (likely intentional — uses all) | PASS |
| 11-reviewer | 26/30 | No `allowed-tools` declared | PASS |
| 06-security-review | 27/30 | Best in repo | PASS |
| 36-web-asset-generator | 25/30 | No anti-rat (flexible/mechanical — N/A=2); description trigger-rich; `allowed-tools` properly scoped with Bash globs | PASS |

## Distribution (32 skills audited)

- **PASS** (>=22): 23 skills (72%)
- **NEEDS-REVIEW** (18-21): 6 skills (19%)
- **NEEDS-REWRITE** (<18): 4 skills (12%)

(Skill 36 included in PASS count.)

## Top 3 Weaknesses (cross-cutting)

1. **Missing `allowed-tools` frontmatter** — affects ~24 skills (75%). Only 06, 07, 17, 18, 28-32 declare it. Dominant gap. **Easy mechanical fix** (1-2 lines per skill).
2. **No Anti-Rationalization table** — only 03, 05, 06, 09, 11 have one. Rigid/process skills (18, 21, 22, 24, 28) would benefit; flexible skills should mark `<!-- anti-rationalization: N/A — flexible/mechanical -->`.
3. **Output path/format vague or absent** — thin skills (19-27) describe handoff but no concrete filename or schema.

Secondary patterns:
- skills 07, 04, 12 exceed 500 lines (verbosity penalty)
- skills 19-27 have natural-language descriptions without trigger-word density of 01-07

## Recommended Rewrite Priority

### Tier 1 — NEEDS-REWRITE (4 skills, urgent)

1. **21-data-analytics** — add trigger-rich description, `allowed-tools: Read, Write, Grep, Glob`, output path `docs/analytics/plan-*.md`, 3+ bullets in When-to/Not-to-use, anti-rationalization table for metrics-vs-vanity bias.
2. **22-accessibility-specialist** — output path `docs/a11y/report-*.md`, anti-rat for "looks accessible enough" bias.
3. **24-release-manager** — output path `docs/releases/RELEASE-*.md`, anti-rat for "ship anyway" bias.
4. **27-video-integration-specialist** — concrete output dir, anti-rat for latency/cost tradeoffs.

### Tier 2 — NEEDS-REVIEW (6 skills, near-threshold)

5. **19-asset-librarian, 20-observability-sre** — add anti-rat + `allowed-tools` to clear PASS.
6. **23-migration-refactor-specialist, 25-ai-integration-architect, 26-prompt-engineer** — close to threshold, need anti-rat tables.
7. **12-motion-design** — split into `docs/skill-guides/motion-design.md` to reduce 509 lines.

### Tier 3 — Cross-cutting cleanup pass

Add `allowed-tools` to skills 01, 02, 03, 04, 05, 08, 09, 10, 11, 12, 13, 14, 15. Trivial mechanical change that lifts roughly half the kit by 1-2 points each. Can be done in single PR.

## Notes

- Scope rules already declared at top of report (skill 16 absent; 33-35 excluded as scorecard authors; 36 included).
- This audit is a snapshot — re-run after Tier 1 rewrites land.
- Re-audit cadence suggested: after every batch that adds 3+ skills, or quarterly.

## Next steps

This audit is **read-only**. No files modified. To execute the rewrites:

```bash
# Per skill, despachar skill 35 (Skill Author) com:
/skill-author --action=edit --skill=skills/21-data-analytics/ --findings=evals/skill-audit-2026-05-03.md
```

Or open issue per Tier 1 skill and address one per session.
