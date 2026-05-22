---
scenario: 19-asset-librarian
pass: treatment
model: claude-opus-4-7
tokens_in_approx: 950
tokens_out_approx: 1400
time_seconds: 45
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.0
notes: "persistencia em docs/repo-audit/assets.md, inventario estruturado, handoff p/ UI/UX e Image Generator"
---

# Inventario de Assets — Plano de Organizacao

Skill aplicada: `19-asset-librarian`. Output canonico vai em `docs/repo-audit/assets.md` (policy `persistence.md`).

## Diagnostico do problema

Voce tem **drift visual nao gerenciado**: 12 logos = pelo menos 9 deprecated, 5 fontes = inconsistencia tipografica garantida, 80 imagens sem catalogo = duplicatas e estilos conflitantes. Cada dev escolhe o que acha primeiro porque nao existe fonte canonica.

## Fase 1 — Auditoria (1-2h, antes de qualquer organizacao)

Antes de mover arquivo nenhum, gere `docs/repo-audit/assets.md` com o inventario bruto. Estrutura minima (template `templates/asset-inventory.md`):

```markdown
## Logos e marcas
- arquivo, dimensoes, formato, ultimo uso, status (oficial/variacao/deprecated)

## Icones e favicons
- set, formato, tamanhos, origem

## Ilustracoes, backgrounds, mascotes
- arquivo, contexto de uso, estilo (flat/3D/foto/sketch)

## Fontes e design tokens
- familia, pesos, formato (woff2/ttf), licenca, onde e carregada

## Notas de estilo
- paleta dominante, contraste, mood, inconsistencias detectadas

## Duplicacoes, conflitos, obsoletos
- lista explicita do que sai
```

Use `find assets/ -type f | sort` + olho humano. Nao automatize a classificacao — o ponto e voce **ver** o que tem.

## Fase 2 — Decisoes canonicas (reuniao curta, 30min)

Com inventario em maos, decida:

1. **Logos:** 1 primario + max 3 variacoes (mono, invertido, reduzido). Resto vai pra `deprecated/` (nao deleta ainda — pode ter referencia em historico).
2. **Fontes:** 2 maximo. 1 sans-serif UI + 1 display ou mono. Justifique cada uma no `assets.md`.
3. **Imagens:** classifique por uso (hero, thumb, OG, ilustracao, background). Marque duplicatas para consolidar.

Documenta cada decisao no `assets.md` na secao **Notas de estilo** — futuras geracoes (incluindo Image Generator) usam isso como prompt context.

## Fase 3 — Estrutura canonica

```
assets/
  brand/
    logo-primary.svg
    logo-mono.svg
    logo-invertido.svg
  fonts/
    inter-variable.woff2     # UI
    fraunces-variable.woff2  # display
  images/
    hero/
    thumbs/
    og/
    illustrations/
  icons/
  deprecated/   # nao deleta — quarentena
```

Naming: `kebab-case`, descritivo, sem versao (`logo-primary.svg`, nao `logo-v2-FINAL.svg`).

## Fase 4 — Politica anti-drift (a parte que falta na maioria dos times)

No `docs/repo-audit/assets.md`, **secao final obrigatoria**:

```markdown
## Como adicionar novo asset
1. Checar se existe similar no inventario
2. Se gerar nova imagem, usar Image Generator com prompt referenciando paleta/mood deste doc
3. Atualizar este arquivo no mesmo PR
4. UI/UX revisa antes de merge
```

## Handoffs (`policies/handoffs.md`)

- **UI/UX (`02-ui-ux-design`):** consome `assets.md` como base de design system
- **Image Generator (`17-image-generator`):** usa secao "Notas de estilo" como prompt context p/ nao destoar
- **Frontend (`04-frontend-integration`):** referencia paths canonicos, nao arquivos avulsos

## Gaps e riscos detectados (preencher pos-auditoria)

- [ ] licenca de fontes verificada?
- [ ] favicons em todos os tamanhos (16, 32, 180, 512)?
- [ ] OG cards padronizadas?
- [ ] imagens > 1MB precisam de Git LFS ou CDN

## Evidencia de conclusao

- [ ] `docs/repo-audit/assets.md` existe e cobre as 6 secoes minimas da skill
- [ ] decisoes de canonicidade documentadas (logos, fontes)
- [ ] secao "como adicionar novo asset" no doc
- [ ] PR de reorganizacao + atualizacao do `assets.md` no mesmo commit
