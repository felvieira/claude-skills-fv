---
name: asset-librarian
description: |
  Skill para inventariar e organizar imagens, icones, logos, fontes, tokens visuais e referencias graficas do projeto.
  Use quando precisar mapear assets existentes, evitar inconsistencias visuais e apoiar UI/UX, Frontend e Image Generator.
  Trigger em: "asset librarian", "inventariar assets", "inventario de assets", "mapear assets", "organizar assets", "design tokens", "biblioteca de assets", "auditar assets visuais", "catalogar logos", "incoerencia visual".
---

# Asset Librarian

Transforma o contexto visual do repositorio em inventario reutilizavel. O objetivo concreto: antes que skill 17 (image) gere um asset novo ou skill 04 (frontend) escolha uma cor, esta skill ja mapeou o que existe — para o novo nao destoar e o velho nao ser duplicado.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/token-efficiency.md`, `policies/handoffs.md`, `policies/verification-before-completion.md` e `policies/evals.md`.

## Quando Usar

- mapear imagens, icones, logos, fontes e tokens visuais existentes (antes de gerar/escolher novos)
- preparar base para Image Generator (17), UI/UX (02) ou Frontend (04)
- identificar incoerencias (3 azuis levemente diferentes) ou duplicacoes (mesmo logo em 4 formatos espalhados)
- caçar assets obsoletos/orfaos (peso morto no bundle)

## Quando Nao Usar

- gerar asset novo sem necessidade de inventario (vai direto pra skill 17)
- substituir o julgamento de UI/UX sobre o que e "bonito/on-brand"
- auditoria de codigo geral (isso e skill 18-repo-auditor) — aqui o escopo e so visual

## Entradas Esperadas

- arvore do repositorio (paths de assets: `public/`, `assets/`, `src/assets/`, `static/`)
- design tokens existentes (CSS vars, Tailwind config, theme file)
- acesso aos arquivos para inspecao (dimensao, formato, peso)

## Saidas Esperadas

- inventario tabelado, persistido em `docs/repo-audit/assets.md`
- resumo de identidade visual (paleta, tipografia, mood) reutilizavel em 1 leitura
- lista de gaps, conflitos e obsoletos com acao sugerida

## Persistencia

Persistir em `docs/repo-audit/assets.md`. Complementa `current.md` (skill 18) — um e codigo/stack, o outro e visual. Reutilizar antes de reinventariar (cache).

## Como descobrir os assets (comandos)

```bash
# imagens e graficos por formato + tamanho
find . -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \
  -o -iname "*.svg" -o -iname "*.webp" -o -iname "*.avif" -o -iname "*.gif" \
  -o -iname "*.ico" \) -not -path "*/node_modules/*" -exec ls -lh {} \;

# fontes
find . -type f \( -iname "*.woff2" -o -iname "*.woff" -o -iname "*.ttf" -o -iname "*.otf" \) -not -path "*/node_modules/*"

# tokens: cores e fontes declaradas
grep -rEo "#[0-9a-fA-F]{3,8}|rgb\(|hsl\(" src/ | sort | uniq -c | sort -rn   # paleta real em uso
# Tailwind: ler tailwind.config.* (theme.colors, fontFamily)
# CSS vars: grep "--" nos arquivos de tema
```

## Formato do inventario (`docs/repo-audit/assets.md`)

```markdown
# Asset Inventory — <projeto>
> Gerado por skill 19 em <data>. Reutilizar antes de regerar.

## Identidade visual (resumo)
- Paleta primaria: #0F766E (teal), #1D4ED8 (blue), #F59E0B (amber)
- Tipografia: Inter (sans, UI), JetBrains Mono (code)
- Mood: tecnico, limpo, alto contraste

## Logos & marcas
| Asset | Path | Formato | Dimensao | Uso | Nota |
|---|---|---|---|---|---|
| Logo principal | public/logo.svg | SVG | vetor | header, OG | fonte de verdade |
| Logo PNG | src/assets/logo@2x.png | PNG | 512x512 | favicon-src | derivar do SVG |

## Icones & favicons
| ... | ... |

## Ilustracoes / backgrounds / mascotes
| ... |

## Fontes & tokens
| Token | Valor | Onde |
|---|---|---|
| --color-primary | #0F766E | theme.css |

## Gaps / conflitos / obsoletos
- CONFLITO: 3 tons de teal (#0F766E, #0D9488, #14B8A6) — consolidar em 1
- DUPLICADO: logo em 4 paths diferentes — single source + derivar
- OBSOLETO: hero-old.jpg (1.2MB) sem referencia no codigo — remover
- GAP: sem favicon maskable para PWA → handoff skill 36
```

## Checks de consistencia (o valor real)

1. **Paleta divergente** — cores quase-iguais (#0F766E vs #0D9488) sao quase sempre acidente. Consolidar.
2. **Logo duplicado** — mesmo logo em N formatos/paths sem single-source → escolher a fonte de verdade (SVG) e derivar o resto.
3. **Peso morto** — asset sem referencia no codigo (`grep` o nome do arquivo no src). Candidato a remover.
4. **Formato errado pra finalidade** — JPG onde devia ser SVG (logo), PNG gigante sem WebP/AVIF.
5. **Fonte nao otimizada** — TTF/OTF servido direto (devia ser WOFF2), sem `font-display: swap`.
6. **Gaps de plataforma** — falta favicon multi-size, apple-touch-icon, OG image, maskable PWA → handoff skill 36.

## Anti-padroes frequentes

- gerar asset novo (skill 17) sem checar se ja existe um equivalente → biblioteca incha e diverge
- inventario que so lista arquivos sem o resumo de identidade (paleta/tipografia/mood) → ninguem reusa
- ignorar `node_modules`/`.next`/`dist` no scan → ruido de assets de terceiros
- nao registrar a fonte-de-verdade do logo → cada um pega um arquivo diferente

## Evidencia de Conclusao

- `docs/repo-audit/assets.md` criado/atualizado com tabelas preenchidas
- resumo de identidade visual (paleta + tipografia + mood) em 1 leitura
- gaps, conflitos e obsoletos listados com acao sugerida (consolidar/remover/gerar)

## Handoff

- **Image Generator (17)** usa a paleta/mood pra gerar on-brand
- **Web Asset Generator (36)** preenche gaps de favicon/OG/PWA
- **UI/UX (02)** decide a consolidacao de tokens divergentes
- **Frontend (04)** aplica os tokens consolidados e remove peso morto
- Seguir `policies/handoffs.md` e, quando util, `templates/asset-inventory.md`
