---
name: illustration-studio
description: |
  Estúdio de ícones e ilustrações SVG: um conjunto, um estilo, sempre. Parte de um brief (assunto,
  contexto, humor, o que o conjunto nunca pode parecer), fixa regras de traço, grade, paleta e
  formas, desenha cada ícone com poucas peças reutilizáveis, confere com um linter determinístico
  (viewBox, traço 2, pontas redondas, pixels inteiros, margem de segurança, peso parecido) e exporta
  sprite, componentes React e folha de contato. Também extrai regras (não adjetivos) de uma
  referência. Favicon/PWA/OG é a skill 36; imagem raster por IA é a 17; diagrama é a 76.
  Trigger em: "conjunto de ícones", "icon set", "ícones SVG", "desenhar ícones", "ilustração",
  "ilustrações vetoriais", "estilo de ícone", "grade de ícones", "keyline", "sprite de ícones",
  "pacote de ícones", "design de ícones", "linha de ícones", "icon pack", "line icons",
  "ícones consistentes", "ícones com traço", "illustration studio".
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(node *)
metadata:
  argument-hint: "<nome do conjunto> <quantidade> [onde aparece e em que tamanho]"
  version: "1.0.0"
---

# Illustration Studio — um conjunto, um estilo, sempre

Desenha um conjunto de ícones SVG que parece feito por uma mão só. O modelo não "tem bom gosto":
tem regras medidas. Sem regra escrita, cada ícone sai com traço, canto e peso diferentes.

## Governança Global

Segue `GLOBAL.md`, `policies/execution.md`, `policies/claim-verification.md` e
`policies/verification-before-completion.md`. Texto que o conjunto exibir (nomes, legendas) passa por
`policies/anti-ai-writing.md`.

Duas regras sem exceção:

1. **Referência é fonte de estilo, nunca de conteúdo.** Copiar o desenho de um ícone de terceiros é
   cópia; extrair "traço 2, raio 2, densidade baixa" é método. Ver `references/REFERENCE.md`.
2. **Nada é "pronto" sem o linter e sem olhar a folha de contato.** O linter pega regra de texto; só o
   olho pega "apertando os olhos ainda lê?".

## Quando Usar

- criar um conjunto novo de ícones (5 a 60) com identidade própria
- fazer ícones novos combinarem com um conjunto que já existe
- extrair as regras de estilo de uma referência e aplicá-las a assuntos diferentes
- revisar um conjunto inconsistente (traços diferentes, pesos desiguais, cantos vivos)
- entregar sprite SVG + componentes React + folha de contato

## Quando Nao Usar

- favicon, ícones de PWA, OG image: skill 36 (`36-web-asset-generator`)
- imagem raster, foto, ilustração pintada por modelo de imagem: skill 17
- diagrama ou fluxograma validado: skill 76
- animar ícones (morph, spring): skill 12 (`12-motion-design`)
- UI inteira ou design system: skill 02

## Entradas Esperadas

Nome do conjunto, quantidade, onde aparecem e em que tamanho, três palavras de humor e o que o
conjunto nunca pode parecer. Opcional: uma referência (imagem ou SVG) para extrair regras.

## Saidas Esperadas

Em `<destino>/icons/`: um `.svg` por ícone (`NN-nome.svg`), `STYLE.md` do conjunto (regras medidas),
`palette.json` (6 cores com papel). Em `<destino>/dist/`: `sprite.svg`, `Icons.tsx`,
`contact-sheet.html` (+ `.png`) e o relatório do linter.

## Fluxo (cada etapa tem um arquivo; leia só o da etapa)

| Etapa | Arquivo | O que decide |
|---|---|---|
| 1 DEFINE | `references/BRIEF.md` | assunto, contexto e tamanho, humor, o que nunca parecer |
| 2 RULES | `references/STYLE.md` | traço 2, cantos 2, um destaque por ícone, peso igual |
| 3 LAYOUT | `references/GRID.md` | tela 24, margem 2, keylines, tamanho óptico, pixels inteiros |
| 4 COLOR | `references/PALETTE.md` | seis cores com hex e papel, contraste AA |
| 5 BUILD | `references/SHAPES.md` | círculos, retângulos e arcos; no máximo 12 pontos; grupos nomeados |
| 6 EXTRACT | `references/REFERENCE.md` | só quando houver referência: medir, escrever regra, fechar |
| 7 REVIEW | `references/CHECK.md` | 16/24/48 px, apertar os olhos, pesos lado a lado, nota 1-10 |
| 8 SHIP | `references/EXPORT.md` | SVG limpo, sprite, componentes React, folha de contato |

Ordem: 1 → (6 se houver referência) → 2 → 3 → 4 → 5 → 7 → 8. Volte a 5 enquanto houver ícone abaixo de 8.

## Comandos

```bash
# linter (etapa 7): erros de regra + peso visual desigual; --strict falha com erro
node scripts/svg-icon-lint.mjs <pasta-de-icones> --palette <palette.json> --strict

# exportação (etapa 8): sprite.svg, Icons.tsx, contact-sheet.html (+ .png com --png)
node scripts/svg-icon-export.mjs <pasta-de-icones> --out <dist> --palette <palette.json> --png
```

Exemplo completo e passando no linter: `assets/examples/` (8 ícones + `palette.json`).

## Anti-Padroes

- **Adjetivo no lugar de regra** ("moderno, limpo, amigável"): não verificável. Escreva "traço 2, raio 2, 1 destaque".
- **Caminho à mão livre**: mais de 12 pontos quase sempre é um ícone que não vai reproduzir em outro tamanho.
- **Um destaque por ícone é teto, não meta**: ícone sem destaque é válido.
- **Corrigir o linter na saída em vez de no desenho**: arredondar coordenada com script esconde o erro de grade.

## Gotchas

Falhas vistas construindo o conjunto de exemplo:

- Tirar a tag `<svg>` raiz perde `fill`/`stroke`/`stroke-width`/`linecap`/`linejoin`, que os filhos herdavam. Qualquer
  reembrulho (sprite, folha de contato, componente) precisa repassar esses atributos, senão sai tudo preto e cheio.
- Arco `a` cuja corda é maior que o diâmetro é escalado e estoura a margem: a nuvem saiu em x=22.5. O linter
  pega (`safe-area`); conferir o ponto final do arco antes de aprovar.
- Traços curtos (raios do sol de 2 unidades) viram pontos a 16 px. Prefira raios de 3+ ou agrupe, e veja a 16 px.
- O peso visual calculado é geometria do traço, não pixels: use como alarme de outlier (padrão ±50% da mediana),
  não como nota.

## Evidencia de Conclusao

- `svg-icon-lint.mjs --strict` com 0 erros e os avisos justificados
- folha de contato aberta e cada ícone com nota >= 8 (registrar as notas)
- `STYLE.md` do conjunto com os valores medidos, não adjetivos

## Handoff

Para a skill 04 (integrar `Icons.tsx`/sprite no frontend), 36 (se o conjunto vira favicon/PWA), 02 (se vira
parte de design system), 12 (se os ícones vão animar).

## Integracao com Pipeline

Entra depois do design system (02) e antes da implementação (04). Pode ser chamada por 09 (orchestrator)
quando a tarefa pede identidade visual própria. Acervo de ícones existentes: 19 (asset-librarian).
