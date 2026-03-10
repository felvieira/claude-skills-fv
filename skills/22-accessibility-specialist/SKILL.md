---
name: accessibility-specialist
description: |
  Skill dedicada a acessibilidade digital. Use quando precisar revisar WCAG, teclado, screen reader, contraste,
  semantica, motion reduction e acessibilidade de formularios, componentes e fluxos.
---

# Accessibility Specialist

O Accessibility Specialist traz rigor dedicado para acessibilidade sem depender apenas de UI/UX, Frontend ou SEO.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/evals.md` e `policies/stack-flexibility.md`.

## Quando Usar

- revisar acessibilidade de fluxo, tela ou componente
- validar teclado, screen reader, contraste e semantica
- reforcar motion reduction e formulacao acessivel

## Quando Nao Usar

- para substituir UI/UX ou Frontend na implementacao base
- para tratar acessibilidade como check cosmetico de ultima hora

## Entradas Esperadas

- fluxo ou componente alvo
- estados de UI e requisitos de interacao
- stack e bibliotecas relevantes

## Saidas Esperadas

- checklist de acessibilidade aplicado
- findings priorizados por impacto
- handoff claro para UI/UX, Frontend ou QA

## Checklist Base

- navegacao por teclado completa
- foco visivel e ordem logica
- semantica e roles coerentes
- contraste e texto alternativo adequados
- screen reader consegue interpretar o fluxo principal
- `prefers-reduced-motion` respeitado quando houver motion

## Evidencia de Conclusao

- requisitos WCAG principais verificados
- gaps de acessibilidade priorizados
- revalidacao indicada quando necessaria

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/accessibility-check.md`.
