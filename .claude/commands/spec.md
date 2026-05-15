---
description: Especificar feature com critérios de aceitação (skill 01 — PO)
---

# /spec — Especificação de Feature

**Objetivo:** Transformar uma ideia ou requisito em especificação formal com critérios de aceitação claros.

**Skill ativada:** 01 — PO (Feature Spec)

**Input esperado:** Descrição da feature, contexto de negócio, público-alvo.

**Output esperado:** Spec com user stories, critérios de aceitação numerados, prioridade e riscos.

**Policies relevantes:**
- `policies/execution.md` — escopo e qualidade
- `policies/confusion-management.md` — STOP-NAME-OPTIONS-WAIT se requisito ambíguo
- `policies/prd-validation.md` — 13 checks fixos sobre qualidade da spec
- `policies/constitution.md` — se `memory/constitution.md` existir, spec deve respeitar os 5 eixos

**Handoff recomendado:**
- spec pronta → `/checklist <spec_path>` para gerar checklist contextual ("unit tests for English")
- só após checklist resolvido → `/plan`
- antes de `/build` (se já houver issues): rodar `/analyze` para cross-artifact consistency

**Uso:** `/spec [descrição da feature ou contexto]`
