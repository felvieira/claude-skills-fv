---
description: Pipeline clássico end-to-end (spec → plan → build → test → review → ship)
---

# /pipeline — Pipeline Clássico

**Objetivo:** Executar o ciclo padrão de desenvolvimento de feature pequena/média: spec → plan → build → test → review → ship.

**Skill ativada:** 09 — Orchestrator (coordena todas as etapas)

**Fluxo:**
1. `/spec` — especificar com critérios de aceitação (markdown interno em `docs/specs/`)
2. `/plan` — classificar e montar pipeline mínimo. Se feature multi-camada: produz tabela de vertical slices.
3. **Para cada slice (paralelo se independentes):**
   - `/build` — DB + backend + frontend juntos no mesmo worktree
   - `/test` — teste e2e cobrindo a feature ponta-a-ponta
   - `/review` — review final + security do slice
4. `/ship` — release e deploy (após todos os slices mergeados)

**Quando usar este (`/pipeline` clássico):**
- feature pequena/média (<1 sprint)
- spec já clara, equipe conhece o terreno
- não precisa publicar PRD/issues no GitHub/Linear/Jira
- não precisa TDD enforced

**Quando usar o variante `/pipeline-discovery`:**
- feature grande/nova/ambígua, briefing vago, equipe nova com a área
- vai paralelizar com 2+ workers
- precisa publicar PRD + issues no issue tracker
- TDD obrigatório por slice

**Diferenças `/pipeline` vs `/pipeline-discovery`:** ver tabela em `.claude/commands/pipeline-discovery.md`.

**Input esperado:** Descrição completa da feature ou requisito (idealmente uma feature por vez; epic vira lista de slices).

**Output esperado:** Cada slice mergeado independentemente, demo-able. Feature completa quando todos os slices mergeados.

**Policies relevantes:**
- `policies/vertical-slices.md` — **obrigatória** para feature multi-camada (impede plano layer-first)
- Todas as policies do kit são aplicáveis conforme a etapa
- `policies/model-routing.md` — modelo certo por fase

**Uso:** `/pipeline [descrição da feature]`
