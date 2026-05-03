---
description: Pipeline completo end-to-end (skill 09 — Orchestrator)
---

# /pipeline — Pipeline Completo

**Objetivo:** Executar o ciclo completo de desenvolvimento: spec → plan → build → test → review → ship.

**Skill ativada:** 09 — Orchestrator (coordena todas as etapas)

**Fluxo:**
1. `/spec` — especificar com critérios de aceitação
2. `/plan` — classificar e **quebrar em vertical slices** se for feature multi-camada
3. **Para cada slice (paralelo se independentes):**
   - `/build` — DB + backend + frontend juntos no mesmo worktree
   - `/test` — teste e2e cobrindo a feature ponta-a-ponta
   - `/review` — review final + security do slice
4. `/ship` — release e deploy (após todos os slices mergeados)

**Input esperado:** Descrição completa da feature ou requisito (idealmente uma feature por vez; epic vira lista de slices).

**Output esperado:** Cada slice mergeado independentemente, demo-able. Feature completa quando todos os slices mergeados.

**Policies relevantes:**
- `policies/vertical-slices.md` — **obrigatória** para feature multi-camada (impede plano layer-first)
- Todas as policies do kit são aplicáveis conforme a etapa
- `policies/model-routing.md` — modelo certo por fase

**Uso:** `/pipeline [descrição da feature]`
