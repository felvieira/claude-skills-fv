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
- `policies/constitution.md` — gates não-negociáveis (Security, Performance, Testing axes)

**Gate de constituição (se `memory/constitution.md` existir):**
- Eixo Security: SAST + dependency scan + secrets scan executados e zerados
- Eixo Performance: latência p95 / custos IA dentro do budget
- Eixo Testing: coverage mínimo atingido
- Recomendar `/analyze --strict` final antes de prosseguir

**Bloqueio:** qualquer princípio CRITICAL não satisfeito = **não publicar**. Exception requer ADR dedicado com aprovação dos owners da constituição.

**Uso:** `/ship [versão ou escopo do release]`
