---
description: Classificar task e montar pipeline mínimo suficiente (skill 09 — Orchestrator)
---

# /plan — Planejamento de Pipeline

**Objetivo:** Analisar a task, classificar tipo (feature, bugfix, refactor, etc.) e montar o pipeline mínimo suficiente.

**Skill ativada:** 09 — Orchestrator

**Input esperado:** Descrição da task ou spec já criada.

**Output esperado:** Pipeline ordenado com skills necessárias, modelo sugerido por etapa, e critérios de done.

**Policies relevantes:**
- `policies/model-routing.md` — tier certo por etapa
- `policies/search-first.md` — pesquisa antes de planejar
- `policies/source-driven.md` — decisões baseadas em fontes

**Uso:** `/plan [descrição da task ou referência à spec]`
