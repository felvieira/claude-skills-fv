---
scenario: 24-release-manager-v2
pass: baseline
model: claude-sonnet-4-6
eval_date: 2026-05-22
condition: cold_no_skill_no_repo_audit
tokens_in_approx: 120
tokens_out_approx: 380
quality_score: 3.6
quality_breakdown:
  specificity: 2
  completeness: 4
  correctness: 5
  actionability: 3
  discipline: 4
pass_fail: n/a
delta_vs_baseline: n/a
notes: >
  Generic but structurally sound. Covers all 4 requested areas (changelog,
  release notes, rollout, comms). No file paths, no repo context, no template
  references. Specificity low — tools mentioned (feature flags, kubectl) are
  correct but not grounded in any project reality. Actionability docked —
  developer must still figure out where files go, what templates exist, what
  gates apply. Discipline clean: tight, no scope creep.
---

# Pass A — Baseline (cold, no skill, no repo-audit)

**Input:** "Vamos fazer release v2.0.0 do nosso SaaS B2B (mudança de schema do user + breaking API change). Como organizo changelog, release notes, rollout gradual e comunicação?"

---

## Changelog

Use Conventional Commits. Crie seção `### Breaking Changes` no topo do `CHANGELOG.md`,
com entry para cada contrato quebrado + caminho de migração. Separe em `Added`,
`Changed`, `Removed`, `Fixed`.

Cada breaking change tem: o que mudou, por que, e o passo de migração.

## Release Notes (cliente)

Documento separado do changelog. Escreva para o admin técnico do cliente, não para o
engenheiro interno:

1. Breaking change acima do fold, com data de sunset da API antiga
2. Ação necessária: o que o cliente precisa fazer e quando
3. Novidades agrupadas por benefício de negócio, não por PR
4. Link para migration guide

## Rollout Gradual

Habilite via feature flag por segmento. Fluxo:

```
Staging → 5% (canary) → 25% → 100%
```

Gate a cada passo: error rate <0.5% baseline, p99 latência dentro de +20%, zero P1
tickets do cohort. B2B exige janelas comunicadas — não deploy silencioso.

## Schema Migration

Script transacional testado em snapshot de produção. Rollback SQL pronto antes de
executar. Medir tempo: se >5 min em prod, forward-fix em vez de rollback é mais seguro.

## Comunicação B2B

| T | Ação |
|---|------|
| -30 dias | Email para admins: breaking change notice + migration guide |
| -14 dias | In-app banner para todos os admins |
| -7 dias | Lembrete final para quem ainda não migrou |
| Dia 0 | Status page + Slack para early adopters |
| +48h | Follow-up para contas ainda em v1 |

## Rollback

- Feature flag: desabilitar flag → tráfego volta para v1 sem redeploy (<2 min)
- App: rollout undo (kubectl ou equivalente, 5–10 min)
- Schema: SQL script pré-testado (somente se flag + app não resolvem)
