---
scenario: 07-deploy-docker
skill: dev-team-kit-fv:07-deploy-docker
baseline_score: 3.0
treatment_score: 4.3
delta: +1.3
pass_fail: marginal_fail
threshold: 1.5
---

# Eval Report — 07-deploy-docker

## Scores

| Pass | Spec | Comp | Corr | Act | Disc | Raw | Normalized |
|---|---|---|---|---|---|---|---|
| Baseline | 3 | 4 | 4 | 3 | 3 | 17 | 3.0 |
| Treatment | 5 | 5 | 4 | 4 | 4 | 22 | 4.3 |
| **Delta** | +2 | +1 | 0 | +1 | +1 | +5 | **+1.3** |

## Verdict: MARGINAL FAIL (delta +1.3, threshold 1.5)

The skill produces meaningfully better output — nginx/TLS, non-root user, retry-loop rollback, risks table, CI/CD pipeline, and a pre-deploy checklist are all absent from baseline. However the delta lands at +1.3, 0.2 short of the pass threshold.

## What the skill added

- Nginx reverse proxy config with TLS, HSTS, and rate limiting
- Non-root user in runner stage (`adduser nextjs`)
- `NEXT_PUBLIC_API_URL` ARG wired through build stage correctly
- Health endpoint that tests both Postgres AND Redis (not just HTTP 200)
- Rollback script with 60 s retry loop instead of a single `sleep 30`
- Blue-green and Docker Swarm rollback options
- Full GitHub Actions CI/CD with registry push
- Risks table (migrations, secrets in image, volume prune safety)
- Pre-deploy checklist (10 items)

## Why it didn't clear 1.5

Two correctness/actionability gaps capped the score:

1. `docker inspect myapp_app_1` hardcodes a container name that Compose generates differently depending on project name — the rollback prev-tag detection is fragile.
2. The nginx SSL config assumes `certbot certonly` has already been run; first-time setup will fail silently at nginx start. A `# First run: docker run certbot certonly --webroot ...` comment or a bootstrap script would close this.

## Recommendation

Fix the two gaps above and re-run. Expected delta post-fix: +1.6 → pass.

Specific edits:
- Replace `docker inspect myapp_app_1` with `docker compose -f docker-compose.prod.yml images -q app | head -1` or store previous tag in a `.last-tag` file during deploy.
- Add a `scripts/ssl-init.sh` with the certbot bootstrap command and reference it in the checklist.
