---
name: diagram-validated
description: |
  Skill de geração de diagrama técnico com conclusão sustentada por evidência, não por afirmação —
  gera SVG determinístico a partir de contrato JSON, valida geometria (colisão de rótulo, seta órfã,
  nó sobreposto) e faz readback visual em PNG antes de declarar o diagrama pronto. Cobre 14 tipos de
  UML (class, sequence, state machine, ER, deployment, etc.) e diagramas de arquitetura/fluxo, em 12
  estilos visuais nomeados.
  Trigger em: "diagrama de arquitetura", "diagrama de classe", "diagrama de sequência", "UML",
  "diagrama de deployment", "diagrama ER", "state machine diagram", "gerar diagrama técnico",
  "diagrama com validação", "SVG determinístico", "diagrama fica desalinhado", "roteamento ortogonal",
  "geometry-safe diagram", "diagrama de componentes".
allowed-tools: Read, Grep, Glob, Write, Bash(python *), Bash(python3 *), Bash(magick *)
metadata:
  argument-hint: "<tipo-de-diagrama> <contrato.json> [--style N]"
---

# Diagram Validated — Diagrama Técnico com Evidência, Não Afirmação

O princípio que governa esta skill: **avalie, não afirme** — a conclusão de que um diagrama está pronto é sustentada por validador e evidência de render, nunca pelo modelo dizendo que "parece correto" ao olhar o SVG cru. Aplica aos diagramas a mesma disciplina que as skills 11 e 53 aplicam a código: verificação mecânica antes de declarar concluído.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/verification-before-completion.md`, `policies/self-correcting-sensors.md` e `policies/tool-safety.md`.

**Adaptação de motor de renderização — leia antes de usar:** o projeto de origem (ver `## Fontes`) converte SVG→PNG via Puppeteer controlando Chrome headless. Essa dependência não foi portada — exigiria Node + download de binário Chromium (~200MB) só para rasterizar. Esta skill usa **ImageMagick** (`magick`, já presente no ambiente de referência) como motor de conversão. Fidelidade testada e confirmada para: retângulo com `rx` (border-radius), texto com `font-family`/`font-size`, `linearGradient`, `marker` (seta) com `orient="auto"`. Não testado: `foreignObject`, `filter` (blur/drop-shadow via SVG filter), fontes customizadas via `@font-face` embutido. Se o diagrama usar algum desses recursos, verificar o PNG de saída com atenção redobrada antes de confiar na fidelidade — o Chrome do upstream tem suporte SVG mais completo que o delegate do ImageMagick.

## Quando Usar

- gerar diagrama de arquitetura, fluxo, ou qualquer um dos 14 tipos UML a partir de descrição em linguagem natural
- diagrama que precisa ficar consistente entre re-gerações (mesma entrada → mesmo layout, sem jitter de posição)
- documentação técnica (ADR, doc de arquitetura) que vai publicar um diagrama e precisa confiar que ele renderiza sem seta cortada ou rótulo sobreposto
- diagrama de sequência, classe, ER, state machine, deployment, ou os outros 9 tipos UML cobertos

## Quando Nao Usar

- diagrama de conhecimento/dependência do próprio codebase — isso é o graphify (`graphify-out/graph.html`), já instalado e mantido
- decidir *qual* tipo de diagrama usar para um conteúdo (tabela, diagrama, ou lista) — isso é `skills/10-documenter/SKILL.md` (seção "Roteamento de Representação")
- ilustração decorativa, arte, ou qualquer SVG sem intenção de rigor geométrico — isso é `skills/17-image-generator` ou `anthropic-skills:canvas-design`
- diagrama que precisa de interatividade real de aplicação (zoom/pan customizado ligado a dados vivos) — considerar uma solução de app dedicada em vez de SVG estático

## Entradas Esperadas

- tipo de diagrama (um dos 14 UML, ou `architecture`/`flow` para diagramas livres)
- descrição do conteúdo em linguagem natural, a partir da qual o Diagram Contract (JSON) é montado
- estilo visual desejado (um dos 12, ver tabela abaixo) — se não especificado, usar o estilo 1 (Flat Icon) como padrão

## Saidas Esperadas

- `diagrama.svg` — SVG determinístico, mesma entrada sempre produz o mesmo layout
- `diagrama.png` — readback visual, gerado via `magick`, usado para a verificação antes de declarar pronto
- relatório de validação (geometria + visual) confirmando: sem seta órfã, sem rótulo sobreposto, sem nó fora do canvas

## Protocolo

### 1. Montar o Diagram Contract (JSON)

Antes de gerar SVG, estruturar o conteúdo como IR semântico — containers, nós com `kind`, setas com `flow` (direção), âncoras de porta explícitas. Não gerar SVG diretamente de prosa sem passar por essa estrutura intermediária: é o que garante determinismo entre re-gerações.

### 2. Escolher o tipo e o estilo

**14 tipos UML suportados:** Class, Component, Deployment, Package, Composite Structure, Object, Use Case, Activity, State Machine, Sequence, Communication, Timing, Interaction Overview, ER. Mais dois tipos livres: `architecture` e `flow`, para diagramas que não seguem uma notação UML formal.

**12 estilos visuais:**

| # | Estilo | Uso |
|---|---|---|
| 1 | Flat Icon (padrão) | uso geral, ícones planos |
| 2 | Dark Terminal | contexto de dev tools, CLI |
| 3 | Blueprint | arquitetura técnica formal |
| 4 | Notion Clean | documentação leve, minimalista |
| 5 | Glassmorphism | apresentação, marketing técnico |
| 6 | Claude Official | branding Anthropic |
| 7 | OpenAI Official | branding OpenAI |
| 8 | Dark Luxury | SVG autorado por IA, não gerado por template — usar com cautela, menos previsível |
| 9 | C4 Review Canvas | diagrama C4 (contexto/container/componente) |
| 10 | Cloud Fabric | arquitetura cloud/infra |
| 11 | Event Transit | arquitetura orientada a evento, filas, streams |
| 12 | Ops Pulse | observabilidade, dashboards operacionais |

### 3. Validar antes de renderizar

```bash
python3 scripts/fireworks.py validate <tipo> <contrato.json>
```

Confirma que o contrato é válido antes de gastar o passo de render — falha rápido em vez de gerar SVG malformado.

### 4. Renderizar

```bash
python3 scripts/fireworks.py render <tipo> <contrato.json> diagrama.svg --report layout.json
```

O `layout.json` reporta as posições calculadas — usar para debugar um roteamento inesperado sem precisar abrir o SVG.

### 5. Checar geometria (antes do readback visual)

```bash
python3 scripts/fireworks.py check diagrama.svg
```

Verifica: integridade de XML e marker, nó semântico, região reservada, rótulo, canvas, sobreposição de aresta, e cruzamento de aresta. Roteamento ortogonal determinístico com waypoints exatos — uma seta não "passa por cima" de um nó por acidente de layout.

### 6. Readback visual (evidência final antes de declarar pronto)

```bash
magick diagrama.svg diagrama.png
```

**Este é o passo que substitui o `export-png` do upstream** (que usa Puppeteer). Depois de gerar o PNG, olhar o resultado — não presumir que passou no `check` geométrico significa que está visualmente correto. Os dois são checks complementares: `check` pega problema estrutural (aresta não conectada, sobreposição), o PNG pega problema que só aparece ao renderizar (cor ilegível, texto cortado por fonte diferente da esperada, elemento fora do viewBox visualmente mesmo que matematicamente "dentro").

**Nunca pular este passo e declarar o diagrama pronto só porque o `check` passou.** Validador geométrico e evidência de render são as duas pernas do "avalie, não afirme" — uma sem a outra é afirmação disfarçada de validação.

## Anti-Padroes

- declarar o diagrama pronto sem rodar `check` — pula a validação estrutural
- declarar o diagrama pronto sem gerar e olhar o PNG — pula a validação visual, mesmo que `check` tenha passado
- gerar SVG direto de prosa sem passar pelo Diagram Contract — perde o determinismo entre re-gerações
- usar estilo 8 (Dark Luxury, autorado por IA) esperando a mesma previsibilidade dos outros 11 estilos gerados por template
- assumir fidelidade total do ImageMagick para SVG com `foreignObject`, `filter`, ou fonte customizada embutida sem verificar o PNG com atenção redobrada

## Evidencia de Conclusao

- `check` rodado e sem erro de geometria (XML, marker, nó, região reservada, rótulo, canvas, sobreposição/cruzamento de aresta)
- PNG gerado via `magick` e inspecionado visualmente — não só "o comando rodou sem erro"
- se o diagrama usa recurso SVG fora do testado (foreignObject, filter, fonte embutida), isso foi checado com atenção extra no PNG

## Handoff

### Recebe de

- Skill 10 (documenter) — quando a decisão de "isso vira diagrama" já foi tomada pela tabela de roteamento de representação
- Skill 38 (architecture-deepener) — quando a arquitetura investigada precisa de diagrama para o ADR

### Entrega para

- Skill 10 (documenter) — diagrama pronto para embutir em doc/ADR
- Skill 38 (architecture-deepener) — diagrama de arquitetura como artefato de suporte

Seguir `policies/handoffs.md`.

## Integracao com Pipeline

- **Orchestrator (09):** roteia para cá quando o pedido é diagrama técnico com necessidade de precisão geométrica, distinto de ilustração livre (skill 17) ou grafo de codebase (graphify)
- **Documenter (10):** consumidor primário — a tabela de roteamento de representação da 10 decide *que* algo vira diagrama; esta skill decide *como* gerar esse diagrama com rigor

## Fontes

Skill adaptada de [yizhiyanhua-ai/fireworks-tech-graph](https://github.com/yizhiyanhua-ai/fireworks-tech-graph) (MIT) — o princípio "avalie, não afirme" (citado verbatim do README do projeto), os 14 tipos de diagrama UML, os 12 estilos nomeados, o pipeline validate→render→check, e a disciplina de verificação de geometria (marker, região reservada, sobreposição/cruzamento de aresta) foram traduzidos e adaptados. **Divergência deliberada do upstream:** o motor de conversão SVG→PNG do projeto original usa Puppeteer/Chrome headless (`scripts/svg2png.js`); esta skill usa ImageMagick (`magick`) para evitar a dependência de Node + download de binário Chromium — fidelidade visual testada e confirmada para os elementos SVG comuns em diagrama técnico (retângulo, texto, gradiente, marker/seta), não testada para `foreignObject`/`filter`/fonte embutida.
