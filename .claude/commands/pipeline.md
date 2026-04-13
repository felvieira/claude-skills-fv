---
description: Pipeline completo end-to-end (skill 09 — Orchestrator)
---

# /pipeline — Pipeline Completo

**Objetivo:** Executar o ciclo completo de desenvolvimento: spec → plan → build → test → review → ship.

**Skill ativada:** 09 — Orchestrator (coordena todas as etapas)

**Fluxo:**
1. `/spec` — especificar com critérios de aceitação
2. `/plan` — classificar e montar pipeline
3. `/build` — implementar backend e/ou frontend
4. `/test` — escrever e rodar testes
5. `/review` — review final + security
6. `/ship` — release e deploy

**Input esperado:** Descrição completa da feature ou requisito.

**Output esperado:** Feature entregue end-to-end com evidências de cada etapa.

**Policies relevantes:**
- Todas as policies do kit são aplicáveis conforme a etapa
- `policies/model-routing.md` — modelo certo por fase

**Uso:** `/pipeline [descrição da feature]`
