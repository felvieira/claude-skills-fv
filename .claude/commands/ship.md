---
description: Release e deploy (skills 24 + 07 — Release Manager + Deploy)
---

# /ship — Release e Deploy

**Objetivo:** Preparar release (changelog, versão, notas) e executar deploy.

**Skills ativadas:**
- 24 — Release Manager (changelog, versão, release notes, rollout)
- 07 — Deploy Engineer (CI/CD, containers, rollback)

**Input esperado:** Código aprovado pelo Reviewer, evidências de QA e Security.

**Output esperado:** Release criada, deploy executado, rollback plan documentado.

**Policies relevantes:**
- `policies/quality-gates.md` — zero findings críticos
- `policies/handoffs.md` — checklist de entrega

**Uso:** `/ship [versão ou escopo do release]`
