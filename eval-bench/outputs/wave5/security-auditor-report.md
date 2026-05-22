---
scenario: security-auditor
skill_evaluated: dev-team-kit-fv:06-security-review
note: scenario referenced "security-auditor" subagent which does not exist; nearest artifact is skill 06-security-review; treatment run with that skill
baseline_score: 2.75
treatment_score: 4.5
delta_quality_score: +1.75
pass_fail: PASS
delta_tokens: +4480 (baseline ~1300 total, treatment ~6220 total)
---

# Eval Report — security-auditor scenario

**Result: PASS** (delta +1.75, threshold ≥ 1.5)

## Score breakdown

| Criterion | Baseline | Treatment |
|---|---|---|
| Specificity | 3 | 5 |
| Completeness | 3 | 5 |
| Correctness | 4 | 5 |
| Actionability | 3 | 4 |
| Discipline | 3 | 4 |
| **Total (raw)** | **16/25** | **23/25** |
| **Normalized (1-5)** | **2.75** | **4.5** |

## What the skill added

The playbook enforced three things the generic answer skipped: (1) the bcrypt cost-factor minimum of 12 (a concrete, checkable rule absent from the baseline); (2) per-finding PoC attack commands, not just prose descriptions; (3) an explicit deploy-block decision with a numbered pre-conditions list. The OWASP-keyed structure also surfaced the NoSQL injection risk from unvalidated `email` input — missed entirely in the baseline.

## Caveats

The scenario named `security-auditor` as the artifact under test. That subagent does not exist in the kit; the actual security artifact is `06-security-review`. The delta is attributable to that skill's playbook. If a dedicated `security-auditor` subagent were added, it could potentially score higher still (subagent isolation gives a fresh context, no cross-contamination).
