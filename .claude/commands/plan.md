---
description: Classificar task e montar pipeline mínimo suficiente (skill 09 — Orchestrator)
---

# /plan — Planejamento de Pipeline

**Objetivo:** Analisar a task, classificar tipo (feature, bugfix, refactor, etc.) e montar o pipeline mínimo suficiente.

**Skill ativada:** 09 — Orchestrator

**Input esperado:** Descrição da task ou spec já criada.

**Output esperado:**
- Para feature multi-camada: **tabela de vertical slices** (cada slice = feature ponta-a-ponta com DB+back+front+teste) + atribuição de worker por slice + dependências
- Pipeline ordenado **dentro de cada slice** com skills necessárias, modelo sugerido por etapa, critérios de done
- Para bugfix/refactor/single-layer: pipeline simples sem slicing

**Policies relevantes:**
- `policies/vertical-slices.md` — **obrigatória** para feature multi-camada (front+back+DB)
- `policies/model-routing.md` — tier certo por etapa
- `policies/search-first.md` — pesquisa antes de planejar
- `policies/source-driven.md` — decisões baseadas em fontes

**Uso:** `/plan [descrição da task ou referência à spec]`
