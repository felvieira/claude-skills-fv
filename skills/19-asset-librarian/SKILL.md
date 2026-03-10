---
name: asset-librarian
description: |
  Skill para inventariar e organizar imagens, icones, logos, fontes, tokens visuais e referencias graficas do projeto.
  Use quando precisar mapear assets existentes, evitar inconsistencias visuais e apoiar UI/UX, Frontend e Image Generator.
---

# Asset Librarian

O Asset Librarian transforma o contexto visual do repositorio em inventario reutilizavel para evitar assets que destoem do produto.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/handoffs.md` e `policies/evals.md`.

## Quando Usar

- mapear imagens, icones, logos, fontes e tokens visuais existentes
- preparar base para `Image Generator`, `UI/UX` ou `Frontend`
- identificar incoerencias ou duplicacoes visuais

## Quando Nao Usar

- para gerar asset novo sem necessidade de inventario
- para substituir o julgamento visual de UI/UX

## Entradas Esperadas

- estrutura de assets do repositorio
- design tokens, logos, icones, favicons, imagens e fontes existentes

## Saidas Esperadas

- inventario visual reutilizavel
- resumo de identidade visual do app
- gaps e riscos de consistencia

## Persistencia

Persistir em `docs/repo-audit/assets.md`.

## Conteudo Minimo

- logos e marcas
- icones e favicons
- ilustracoes, backgrounds e mascotes
- fontes e design tokens relevantes
- notas de estilo, paleta, contraste e mood
- duplicacoes, conflitos e assets obsoletos

## Evidencia de Conclusao

- `docs/repo-audit/assets.md` criado ou atualizado
- assets principais catalogados
- identidade visual resumida para reutilizacao

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/asset-inventory.md`.
