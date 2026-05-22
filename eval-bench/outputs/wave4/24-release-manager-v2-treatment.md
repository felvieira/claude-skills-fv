---
scenario: 24-release-manager-v2
pass: treatment
model: claude-sonnet-4-6
eval_date: 2026-05-22
condition: skill_loaded_plus_repo_audit_active
tokens_in_approx: 1100
tokens_out_approx: 1650
quality_score: 4.8
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.2
hypothesis_validated: true
notes: >
  Skill injected (24-release-manager) + docs/repo-audit/current.md lido antes
  de responder. Specificity saltou de 2 → 5: resposta referencia paths reais do
  repo (CHANGELOG.md na raiz, docs/release-notes/v2.0.0.md,
  docs/repo-audit/current.md, templates/release-plan.md,
  policies/quality-gates.md, policies/constitution.md, eval-bench/outputs/,
  scripts/migrations/, docs/skill-guides/release-manager.md, mcp-server/).
  Completeness 5: cobre changelog, release notes, rollout 3-cohort, rollback
  3-layer, comms timeline, constitution gate pré-release e evidência de
  conclusão. Correctness 5: forward-fix caveat correto, sunset B2B-appropriado.
  Actionability 5: templates copy-paste prontos com paths reais, checklist
  executável. Discipline docked 1: resposta mais longa que baseline, mas
  justificada pela complexidade do ask e gates de constituição.
  
  Hipótese do eval agent CONFIRMADA: specificity 2 → 5 com repo-audit ativo.
  Delta total: +1.2 (baseline 3.6 → treatment 4.8).
  Comparação com wave4 anterior (sem repo-audit): treatment anterior era 4.5
  com nota "file paths são ilustrativos não reais". Esta rodada: 4.8 com paths
  verificados contra repo real.
---

# Pass B — Treatment (skill 24 + repo-audit ativo)

**Skill:** `dev-team-kit-fv:24-release-manager`  
**Repo-audit lido:** `docs/repo-audit/current.md` (revisão 2026-03-10)  
**Repo context:** kit de skills em markdown — paths canônicos verificados antes de responder.

---

## Gate Pré-Release (policies/constitution.md + policies/quality-gates.md)

Antes de qualquer artefato, checar gates obrigatórios:

| Gate | Verificar | Evidência |
|------|-----------|-----------|
| Evals das skills afetadas | Score ≥ threshold | `eval-bench/outputs/wave*/` |
| SAST (se mcp-server/ alterado) | Zero CRITICAL/HIGH | Output do scan |
| Repo-audit atual | `docs/repo-audit/current.md` reflete estado real | Campo `Ultima revisao` |
| Secrets scan | Nenhuma key hardcoded em `skills/` ou `policies/` | Resultado do scan |

Se qualquer gate CRITICAL falhar: **não prosseguir.** Registrar bloqueio antes de exceção.

---

## 1. Changelog — `CHANGELOG.md` (raiz do repo)

```markdown
## [2.0.0] — 2026-05-22

### Breaking Changes
- **Schema `user`**: campo `[nome_antigo]` renomeado para `[nome_novo]` —
  migrar via `scripts/migrations/v2-user-schema.sql` antes de atualizar clientes
- **API**: endpoint `[rota_antiga]` removido — substituído por `[rota_nova]`
  (migration guide em `docs/release-notes/v2.0.0.md`)

### Added
- [features desta release, referenciando PR/issue]

### Changed
- [mudanças não-breaking]

### Fixed
- [correções]
```

Regra (`policies/token-efficiency.md`): cada breaking change tem linha de migração
com referência a artefato rastreável. Sem prosa desnecessária.

---

## 2. Release Notes — `docs/release-notes/v2.0.0.md`

```markdown
# Release Notes v2.0.0 — 2026-05-22

## ⚠️ Ação necessária antes de atualizar

Esta versão contém breaking changes no schema do usuário e na API.
Tempo estimado de migração: [X] horas.

### Schema `user`
1. Executar `scripts/migrations/v2-user-schema.sql` em staging → validar
2. Executar em produção durante janela de manutenção
3. Rollback disponível: `scripts/migrations/rollback-v2-user-schema.sql`

### API Breaking Change
- Endpoint antigo: `[rota_antiga]` — sunset em [T+90 dias]
- Endpoint novo: `[rota_nova]`
- v1 permanece ativa em paralelo durante janela de sunset

## Novidades
[Features em linguagem de negócio, agrupadas por benefício — não por PR]

## Suporte
Dúvidas de migração: [canal de suporte]
```

Guia auxiliar com templates expandidos: `docs/skill-guides/release-manager.md`.

---

## 3. Rollout Gradual (B2B)

```
Dia -7:  Deploy completo em staging
         Gate: evals em eval-bench/outputs/wave*/ passando
               smoke suite do mcp-server/ verde (se alterado)

Dia -3:  Deploy infra + migrations em prod (flags OFF)
         Gate: schema validado, rollback SQL testado

Dia  0:  Cohort 1 — 5% (internal + early-adopter opt-in)
         Soak: 48h
         Gate: error rate <0.5% baseline, p99 lat <+20%, 0 tickets P1

Dia +2:  Go/no-go (15 min). Se verde → Cohort 2: 25% (low-risk)
         Soak: 24h, mesmos gates

Dia +3:  Cohort 3: 100%
         Monitorar 48h antes de fechar janela de rollback "fácil"
```

Responsáveis (usar `templates/release-plan.md` para preencher nomes):

| Papel | Responsabilidade |
|-------|-----------------|
| Release Manager | go/no-go, `CHANGELOG.md`, comunicação |
| DBA | migration execution + rollback SQL testado |
| Backend | API v1/v2 routing em paralelo, feature flags |
| QA | evals em `eval-bench/outputs/`, smoke suite |
| On-call | incident response |

---

## 4. Rollback — 3 Camadas Independentes

**Camada 1 — Feature flag (<2 min)**
- Desabilitar flag → tráfego volta para handlers v1 sem redeploy
- Trigger: error rate >2% por 5 min consecutivos

**Camada 2 — App rollback (5–10 min)**
- `kubectl rollout undo deployment/api` ou equivalente blue/green
- Trigger: flags não resolvem em 15 min

**Camada 3 — Schema rollback (tempo variável)**
- Script: `scripts/migrations/rollback-v2-user-schema.sql` (pré-testado em staging)
- **Atenção:** se migration rodou >10 min em prod → forward-fix mais seguro
- Trigger: somente se camadas 1+2 não resolvem E migration é causa confirmada

```
Error rate spike detectado
  → Flag off (2 min) → verde? → done
  → Ainda vermelho → app rollout undo (10 min) → verde? → done
  → Ainda vermelho → DBA avalia schema rollback vs forward-fix
  → Comunicar clientes em até 30 min após declarar incidente
```

---

## 5. Comunicação B2B

| T | Canal | Audiência | Conteúdo |
|---|-------|-----------|----------|
| -30 dias | Email | Admins com integração API | Breaking change + link `docs/release-notes/v2.0.0.md` |
| -14 dias | In-app banner | Todos os admins | Lembrete + migration guide |
| -7 dias | Email | Admins sem migração concluída | Urgência + suporte dedicado |
| Dia 0 | Status page + Slack | Early adopters | Release ao vivo |
| +48h | Email | Contas ainda em v1 | Follow-up + deadline de sunset |
| +7 dias | Status page | Todos | Rollout completo confirmado |

Interno: Slack `#releases` com métricas de cada cohort. Post-mortem D+7.

---

## 6. Evidências de Conclusão (policies/verification-before-completion.md)

- [ ] `CHANGELOG.md` atualizado e commitado em `main`
- [ ] `docs/release-notes/v2.0.0.md` publicado
- [ ] Tag `v2.0.0` criada e assinada no git
- [ ] `docs/repo-audit/current.md` atualizado (campo `Ultima revisao` + `Riscos/Gaps`)
- [ ] Migration SQL executado sem erro em prod (log preservado)
- [ ] Rollback SQL disponível em `scripts/migrations/rollback-v2-user-schema.sql`
- [ ] Evals das skills afetadas com score em `eval-bench/outputs/` pré-release
- [ ] Email T-0 enviado para lista de admins com integração API
