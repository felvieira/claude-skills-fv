---
name: frontend-slides
description: |
  Skill de geração de apresentações (decks) em HTML single-file, com palco fixo 1920×1080 que
  escala uniformemente (letterbox, nunca reflow). Antes de escrever o deck inteiro, gera 3 previews
  reais de uma única slide (preset seguro, template ousado, curinga) para o usuário escolher por
  imagem, não por descrição em prosa. Cobre 12 presets nomeados, exporta para PDF via Playwright e
  deploy no Vercel.
  Trigger em: "criar uma apresentação", "gera os slides", "deck de apresentação", "slides em HTML",
  "apresentação para pitch", "slide deck", "converte esse PPTX", "apresentação estilo Keynote",
  "deck single-file", "slides fixos 16:9", "apresentação sem usar PowerPoint",
  "exportar essa apresentação em PDF".
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(python *), Bash(bash *), Bash(npx playwright *)
metadata:
  argument-hint: "<tema-da-apresentação> [--from-pptx <arquivo>]"
---

# Frontend Slides — Decks HTML com Palco Fixo

Apresentação como página web real, não como export de ferramenta de slide. O palco é fixo em 1920×1080 e escala como uma unidade — o conteúdo nunca reflui por dispositivo, porque um slide desenhado pra ficar bonito em 1920×1080 vira ilegível se colunas rearranjam sozinhas num viewport menor.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/anti-ai-writing.md`.

**Gate anti-AI-slop:** antes de entregar, confirmar que nenhuma das escolhas abaixo caiu em clichê de geração automática — ver seção "Anti-AI-Slop" adiante. Se o deck usa Inter, Arial, Roboto ou fonte de sistema, ou gradiente roxo-sobre-branco, recomeçar a escolha tipográfica/cromática antes de entregar.

## Quando Usar

- pedido de apresentação/deck/slides para pitch, demo, relatório, ou aula
- converter um PPTX existente para uma versão web navegável
- apresentação que precisa rodar em qualquer navegador sem instalar PowerPoint/Keynote
- deck que precisa ser exportável em PDF mantendo o layout exato

## Quando Nao Usar

- landing page ou site estruturado como jornada de scroll — isso é `skills/64-scroll-storytelling/SKILL.md`
- documento longo em prosa (relatório, PRD) — isso é `skills/10-documenter/SKILL.md` ou um Artifact em Markdown
- apresentação que o usuário já pediu explicitamente em PowerPoint/Google Slides nativo (`.pptx` de saída, não HTML) — usar a skill/ferramenta de geração de PPTX apropriada, não esta
- diagrama técnico isolado sem contexto de apresentação inteira — isso é `skills/76-diagram-validated/SKILL.md`

## Entradas Esperadas

- tema/conteúdo da apresentação, ou arquivo `.pptx` existente para converter
- audiência e contexto (pitch investidor, demo técnica, aula, relatório interno) — muda o tom e a ousadia visual apropriada
- preferência de vibe quando o usuário já tiver uma (ex.: "quero algo estilo terminal/dev tools") — se não tiver, as 3 previews da Fase 2 cobrem esse espaço

## Saidas Esperadas

- deck HTML single-file completo, com `engine/viewport-base.css` incluído por inteiro
- 3 previews de uma única slide (Fase 2) antes de construir o deck completo
- PDF exportado quando pedido, via `references/export-pdf.sh`
- deploy no Vercel quando pedido, via `references/deploy.sh`

## Protocolo

### 1. Palco fixo — regra não-negociável

Todo slide é desenhado em 1920×1080. O `engine/viewport-base.css` (copiado por inteiro, nunca editado) trava o viewport do navegador, cria o `.deck-stage` de 1920×1080 com `transform-origin: 0 0`, e o JavaScript da apresentação aplica `transform: scale(...)` para caber no viewport real — letterbox/pillarbox quando a proporção não bate, nunca reflow de conteúdo.

**Nunca usar `display: none/block` para trocar de slide** — isso quebra o layout. Usar `.active`/`.visible`, que o CSS já resolve via `visibility`/`opacity`/`pointer-events`.

### 2. Três previews antes de construir o deck inteiro

Antes de escrever a apresentação completa, gerar **3 HTMLs de uma única slide** — mostrar, não descrever:

| Slot | Tipo | Fonte |
|---|---|---|
| Preview A | Preset seguro | um dos 12 presets nomeados (ver tabela abaixo) |
| Preview B | Template ousado | direção visual mais arriscada, alinhada à vibe pedida |
| Preview C | Curinga | outra direção ousada, ou design customizado pro tema específico |

**Regra:** cada preview parece um primeiro slide real do deck — sem metadado interno visível ("Opção A", nome do preset, "preview.md"). O usuário aponta qual gostou, ou pede um quarto rumo.

### 3. Os 12 presets nomeados

| # | Preset | Vibe |
|---|---|---|
| 1 | Bold Signal | confiante, moderno, alto impacto |
| 2 | Electric Studio | energético, vibrante |
| 3 | Creative Voltage | criativo, elétrico |
| 4 | Dark Botanical | escuro, orgânico |
| 5 | Notebook Tabs | calmo, focado, estilo caderno |
| 6 | Pastel Geometry | suave, geométrico |
| 7 | Split Pastel | dividido, pastel |
| 8 | Vintage Editorial | editorial, retrô |
| 9 | Neon Cyber | cyberpunk, neon |
| 10 | Terminal Green | dev tools, terminal |
| 11 | Swiss Modern | minimalista, grid preciso |
| 12 | Paper & Ink | calmo, editorial, papel |

Cada preset tem tipografia e paleta próprias — não misturar fonte/cor de dois presets diferentes no mesmo deck. Detalhe completo de tipografia/cor por preset em `references/style-presets.md`.

**Pegadinha de CSS a evitar:** `right: -clamp(...)` ou `margin-left: -min(...)` são descartados silenciosamente pelo navegador — CSS não aceita `-` direto antes de uma função. Envolver em `calc(-1 * clamp(...))` sempre que precisar negar o valor de uma função CSS.

### 4. Anti-AI-Slop — o que nunca escolher

- **Fontes banidas:** Arial, Inter, Roboto, ou qualquer fonte de sistema sem carregamento explícito. Escolher uma fonte com caráter, específica da vibe do preset escolhido.
- **Paleta banida:** gradiente roxo sobre fundo branco — o clichê mais reconhecível de design gerado por IA.
- **Layout banido:** padrão previsível, "cookie-cutter", genérico o bastante pra caber em qualquer apresentação de qualquer tema.
- **Movimento:** preferir **um** page-load bem orquestrado com reveals escalonados (`animation-delay`) a várias micro-interações espalhadas — um momento coreografado gera mais impacto que ruído disperso.
- **Fundo:** camadas de gradiente CSS ou padrão geométrico para dar atmosfera, em vez de cor sólida plana.

### 5. Converter PPTX existente

`references/extract-pptx.py <input.pptx> <output_dir>` (requer `python-pptx`) extrai título, conteúdo e imagens de cada slide — usar como matéria-prima para reconstruir no palco fixo, não como conversão automática 1:1 (o PPTX original não segue a disciplina anti-slop desta skill).

### 6. Exportar e publicar

- `references/export-pdf.sh <caminho.html> [saida.pdf]` — captura via Playwright, `--compact` renderiza em 1280×720 para arquivo menor
- `references/deploy.sh <caminho>` — deploy no Vercel, aceita pasta ou arquivo HTML único, detecta imagens referenciadas automaticamente

## Anti-Padroes

- editar o `engine/viewport-base.css` para "resolver" um comportamento específico — o motor é a base compartilhada; comportamento bespoke vai em CSS/JS próprio da apresentação, não no arquivo base
- usar `display: none/block` pra trocar slide, quebrando o cálculo de layout do palco fixo
- pular a Fase 2 (3 previews) e ir direto pro deck completo — o usuário não teve chance de redirecionar cedo, quando é barato
- descrever os 3 previews em texto em vez de gerar os HTMLs reais — "mostrar, não descrever" é o ponto central da Fase 2
- misturar tipografia/cor de dois presets diferentes no mesmo deck
- Inter/Arial/Roboto, gradiente roxo-sobre-branco, ou qualquer combinação do gate anti-slop

## Evidencia de Conclusao

- deck HTML completo com `engine/viewport-base.css` incluído por inteiro, sem edição
- 3 previews foram gerados e um foi escolhido (ou o usuário pediu um 4º rumo) antes do deck completo
- gate anti-AI-slop conferido: sem fonte de sistema, sem gradiente roxo-sobre-branco, sem layout genérico
- reduced-motion respeitado (`prefers-reduced-motion` já coberto pelo `viewport-base.css`)

## Handoff

### Recebe de

- Skill 01 (po-feature-spec) — quando a apresentação é parte de uma entrega de produto (pitch de feature, relatório de release)
- Skill 13 (marketing-copy) — quando o deck é material de venda e o copy já foi definido

### Entrega para

- Skill 22 (accessibility-specialist) — quando a apresentação precisa de auditoria formal de acessibilidade além do reduced-motion já coberto
- Humano — para revisão de conteúdo e escolha final entre os 3 previews

Seguir `policies/handoffs.md`.

## Integracao com Pipeline

- **Orchestrator (09):** roteia para cá quando o pedido é apresentação/deck, distinto de landing page scroll-driven (skill 64) ou documento em prosa (skill 10)
- **Diagram Validated (76):** consumidor esperado quando um slide do deck precisa de um diagrama técnico rigoroso embutido

## Fontes

Skill adaptada de [zarazhangrui/frontend-slides](https://github.com/zarazhangrui/frontend-slides) (MIT). `engine/viewport-base.css` é copiado quase-verbatim (mecanismo genérico de palco fixo, sem acoplamento ao resto do repo original) — mesmo padrão de curadoria aplicado à skill 64 (scroll-storytelling). Os 12 nomes de preset, o mecanismo de 3 previews da Fase 2, e os princípios anti-AI-slop foram traduzidos e adaptados; a paleta/tipografia detalhada de cada preset fica em `references/style-presets.md`. **Nota de manutenção:** o repositório de origem está sem atividade desde 2026-06-23, com issues e PRs abertos não endereçados pelo mantenedor original — esta skill assume manutenção própria do conteúdo curado a partir daqui, sem depender de atualizações futuras do upstream.
