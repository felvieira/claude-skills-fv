---
scenario: 24-release-manager
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 950
tokens_out_approx: 1380
time_seconds: 55
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 4
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.3
notes: "Skill injected: scope gate before artefacts (constitution check), 3-layer rollback with owners, evidence checklist, B2B comms timeline with exact T-days, responsible matrix. Actionability docked slightly — file paths are illustrative not real (no repo audit). Discipline docked — treatment is longer than needed; some sections could be tighter."
---

# Pass B — Treatment (skill loaded): Release Manager v3.0

## Release Manager — v3.0 SaaS com Breaking Change

### 1. Fechamento de Escopo (antes de qualquer artefato)

Antes de gerar changelog ou plano, confirmar:

| Item | Status esperado antes do release |
|------|----------------------------------|
| 14 features aprovadas no Reviewer (skill 11) | Evidência de QA passa em staging |
| SAST rodado (Semgrep/CodeQL) | Zero CRITICAL/HIGH sem ADR justificando |
| Schema migration testada em snapshot de prod | Tempo medido, rollback SQL testado |
| API v2 ainda servindo em staging | Smoke test de contrato passando |
| Feature flags configuradas por segmento | Testadas em staging antes do rollout |

Se qualquer item pendente: **não prosseguir** — registrar bloqueio e acionável.

---

### 2. Changelog (interno, para engenharia e produto)

Arquivo: `CHANGELOG.md` na raiz. Seguir Conventional Commits agrupados por tipo:

```markdown
## [3.0.0] — YYYY-MM-DD

### Breaking Changes
- `POST /v2/orders` removido — migrar para `POST /v3/orders` (ver migration guide)
- Campo `customer_id` renomeado para `account_id` em todos os endpoints
- Schema: tabela `invoices` — coluna `status` migrada de ENUM para VARCHAR(32)

### Features (14)
- feat: [F01] Bulk import via CSV — endpoint `POST /v3/imports`
- feat: [F02] Webhooks configuráveis por evento
- ... (uma linha por feature, referenciando PR ou issue)

### Fixes
- fix: race condition em checkout paralelo (#341)

### Deprecations
- `GET /v2/reports` deprecated — sunset em 2026-08-22 (90 dias)
```

**Regra:** cada breaking change tem linha de migração. Cada feature referencia o artefato rastreável (PR/issue). Sem prosa desnecessária.

---

### 3. Release Notes (B2B, para clientes)

Documento separado — `docs/release-notes/v3.0.md` ou publicado no portal do cliente. Audiência: admin técnico do cliente, não engenheiro interno.

```markdown
# v3.0 — [Data de GA]

## O que muda para você

Esta versão introduz [2 frases de valor de negócio]. Para a maioria dos clientes,
nenhuma ação é necessária além da migração da API (detalhes abaixo).

## ⚠️ Ação necessária: migração da API até [data de sunset]

A versão v2 da API continuará funcionando até **[T+90 dias]**.
Se você usa integração via API, siga o [Guia de Migração v2→v3](#).

Tempo estimado de migração: 2–4 horas para a maioria das integrações.

## Novidades

**[Agrupadas por caso de uso, não por PR]**

- Importação em lote (até 10.000 registros via CSV)
- Webhooks configuráveis por tipo de evento
- [... demais features em linguagem de negócio]

## Suporte

Dúvidas sobre migração: [canal de suporte] ou [Slack dedicado para early adopters].
```

**Regra:** breaking change sempre acima do fold. Features agrupadas por benefício, não por engenharia. Sunset date explícita.

---

### 4. Rollout Gradual (B2B, 6-person team)

**Princípio:** B2B exige janelas comunicadas, não deploys silenciosos. Gate explícito antes de cada avanço.

```
Dia -7:  Deploy em staging completo → smoke suite full → sign-off QA
Dia -3:  Deploy em prod (infra, migrations, flags OFF) → validar schema ok
Dia  0:  Habilitar flags para cohort 1: 5% (internal + early-adopter opt-in)
         Soak: 48h. Gate: error rate <0.5% baseline, p99 lat <+20%, 0 tickets P1

Dia +2:  Go/no-go call (15 min). Se verde:
         Cohort 2: 25% (segmento low-risk)
         Soak: 24h. Mesmos gates.

Dia +3:  Cohort 3: 100%
         Monitorar 48h antes de fechar janela de rollback "fácil"
```

**Responsáveis (6 pessoas):**

| Papel | Pessoa | Responsabilidade |
|-------|--------|-----------------|
| Release Manager | [lead] | go/no-go decision, comunicação |
| DBA | [nome] | migration execution + rollback SQL |
| Backend | [nome] | flags, routing v2/v3, smoke |
| Frontend | [nome] | in-app banners, customer comms |
| QA | [nome] | gate metrics dashboard, smoke suite |
| On-call | [nome] | incident response, PagerDuty |

---

### 5. Plano de Rollback

Três camadas independentes, cada uma com dono e playbook:

**Camada 1 — Feature flags (tempo de resposta: <2 min)**
- Desabilitar flag de v3 routing → tráfego volta para handlers v2 sem redeploy
- Dono: Backend
- Trigger: error rate >2% por 5 min consecutivos

**Camada 2 — Application rollback (tempo: 5–10 min)**
- `kubectl rollout undo deployment/api` ou equivalente blue/green
- Dono: On-call
- Trigger: falha sistêmica não resolvida por flags em 15 min

**Camada 3 — Schema rollback (tempo: depende do volume)**
- Script SQL pré-testado em staging: `scripts/migrations/rollback-v3.0.sql`
- Dono: DBA
- Trigger: somente se layer 1+2 não resolve E migration é causa confirmada
- **Atenção:** se migration rodou >10 min em prod, forward-fix é mais seguro que rollback

**Decision tree:**
```
Error rate spike detectado
  → Flag off (2 min) → metrics green? → done
  → Ainda vermelho → app rollout undo (10 min) → green? → done
  → Ainda vermelho → DBA avalia schema rollback vs forward-fix
  → Comunicar clientes afetados em até 30 min após declarar incidente
```

---

### 6. Comunicação Interna e para Clientes

**Timeline:**

| T | Canal | Audiência | Conteúdo |
|---|-------|-----------|----------|
| -30 dias | Email | Admins B2B com integração API | Breaking change notice + migration guide |
| -14 dias | In-app banner | Todos os admins | Lembrete + link release notes draft |
| -7 dias | Email | Admins que ainda não migraram | Urgência + suporte dedicado |
| Dia 0 | Status page + Slack | Clientes early adopters | Release ao vivo, canal de suporte aberto |
| +48h | Email | Contas ainda em v2 | Follow-up com deadline de sunset |
| +7 dias | Status page | Todos | Rollout completo confirmado |

**Canais internos:**
- Slack `#releases`: updates de cada cohort com métricas
- Runbook compartilhado: Google Doc / Notion com checklists ao vivo
- Post-mortem agendado D+7 independente de incidentes

---

### 7. Evidências de Conclusão (antes de declarar release completo)

- [ ] Changelog commitado e PR mergeado em `main`
- [ ] Release notes publicadas no portal do cliente
- [ ] Tag `v3.0.0` criada e assinada no git
- [ ] GitHub Release criado apontando para o changelog
- [ ] Migration rodou sem erro em prod (log preservado)
- [ ] Smoke suite passou pós-deploy cohort 1
- [ ] Rollback SQL testado e disponível em `scripts/migrations/`
- [ ] Email T-0 enviado para lista de clientes com API integrada
