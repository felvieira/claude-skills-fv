---
scenario: 24-release-manager
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 720
time_seconds: 28
quality_score: 3.2
quality_breakdown:
  specificity: 2
  completeness: 4
  correctness: 5
  actionability: 4
  discipline: 3
pass_fail: n/a
delta_vs_baseline: n/a
notes: "Generic but solid. Covers all requested areas. No repo-specific context, no templates, no concrete artifacts. Discipline docked for minor scope creep (communication timeline went beyond ask). Specificity low — no file names, no tool references grounded in project reality."
---

# Pass A — Baseline (no skill): Release Manager

Scenario: v3.0 SaaS release with 14 new features, API breaking change, schema migration. Team of 6, B2B customers.

## Changelog

Use Conventional Commits categorization: `breaking`, `feat`, `fix`, `perf`, `deprecate`. Group entries by category, not by PR. Each entry: what changed, why it matters, migration path if breaking. Store in `CHANGELOG.md` at repo root, auto-generated via `git-cliff` or `release-please`.

## Release Notes (customer-facing)

Separate document from CHANGELOG. Write for your B2B buyer/admin, not the developer. Structure:
1. Executive summary (2 sentences: what this release does for them)
2. Breaking changes section — prominent, at top, with migration deadline
3. New capabilities grouped by use case (not by engineering PR)
4. Deprecation notices with dates
5. Link to migration guide

## API Breaking Change

- Version the API: `v2` continues to serve existing contracts, `v3` is the new surface
- Run both in parallel for a sunset window (minimum 90 days for B2B)
- Send direct email notice to all API consumers at least 30 days before GA
- Publish migration guide: old endpoint → new endpoint, diff of request/response shape, code samples in the 3 top languages your customers use

## Schema Migration

- Write migration as a transaction: `BEGIN; ALTER ...; COMMIT;`
- Test on production-sized snapshot (not dev fixtures)
- Measure migration duration; if >30 seconds, plan for online migration (zero-downtime strategy: expand/contract pattern)
- Have rollback SQL ready and tested before deploy window

## Rollout Strategy (6-person team, B2B)

1. Internal deploy → smoke test (day -7)
2. 5% of accounts (select low-risk / early-adopter segments) → 48h soak
3. 25% → 24h soak
4. 100% — only if error rate, latency, and support ticket delta are all green

Gate criteria per step: error rate <0.5% over baseline, p99 latency within 20% of baseline, zero P1 support tickets from cohort.

## Rollback Plan

- Database: schema rollback script tested in staging. If migration took <5 min, instant rollback is viable. If >5 min, forward-fix is safer.
- API: feature flag per customer segment; flip flag to route traffic back to v2 handlers without redeploy
- Application: blue/green or tagged container — `kubectl rollout undo` or equivalent
- Decision tree: who declares rollback (on-call lead), what signal triggers it (error rate >2% for 5 min), how long max before forced rollback decision (30 min)

## Communication Timeline

| T-30 days | Email all B2B admins: breaking change notice, migration guide link |
| T-14 days | In-app banner for affected users |
| T-7 days | Final reminder email |
| Launch day | Status page update, Slack announcement to customer channels |
| T+48h | Follow-up email to accounts still on v2 API |

## Team Coordination (6 people)

- 1 release manager owns the go/no-go gate
- 1 DBA owns migration execution and rollback
- 1 backend owns API v2/v3 routing and flag config
- 1 frontend owns in-app banner and customer comms coordination
- 1 QA owns smoke suite and gate metrics dashboard
- 1 on-call owns incident response during rollout window
