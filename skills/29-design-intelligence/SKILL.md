---
name: design-intelligence
description: |
  Skill de Inteligencia de Design Competitivo e Geracao de UI. Use quando precisar pesquisar concorrentes,
  analisar tendencias visuais de um nicho, gerar moodboards, ou melhorar interface existente com base em
  benchmarking visual. Trigger em: "melhorar interface", "pesquisar concorrentes", "benchmark visual",
  "tendencias de design", "moodboard", "redesign", "design competitivo", "analise visual", "referencia UI".
argument-hint: "[nicho ou descricao do projeto]"
allowed-tools: Read, Write, Bash, WebSearch, mcp__plugin_playwright_playwright__*
---

# Design Intelligence - Pesquisa Competitiva e Geracao de UI

Pesquisa concorrentes, analisa tendencias visuais do nicho, gera moodboards proprietarios e entrega dossie estrategico completo para o UI/UX Designer (skill 02) executar.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/tool-safety.md` e `policies/evals.md`.

## Quando Usar

- pesquisar concorrentes visuais de um nicho antes de construir interface
- melhorar interface existente com base em benchmarking visual e tendencias
- gerar moodboard e direcao visual antes do UI/UX comecar
- analisar o que os melhores do nicho estao fazendo (paleta, tipografia, layout, CTAs)

## Quando Nao Usar

- para implementar a interface (responsabilidade do UI/UX + Frontend)
- para gerar imagens isoladas sem contexto de pesquisa (usar skill 17 direto)
- para definir regras de negocio ou spec de feature (responsabilidade do PO)

## Pontos de Entrada no Pipeline

1. **Feature nova:** `PO -> Design Intelligence (29) -> UI/UX -> Frontend -> ...`
2. **Melhoria de UI existente:** `Design Intelligence (29) -> UI/UX -> Frontend -> ...` (pula o PO)

## Entradas Esperadas

- descricao do projeto ou nicho (ex: "landing page de app fitness com IA focado em hipertrofia")
- tipo de interface (landing page, dashboard, app mobile, SaaS, e-commerce)
- restricoes de branding existentes (se houver)
- URLs de concorrentes especificos (opcional)

## Saidas Esperadas

- dossie completo em `docs/design-intelligence/dossier.md`
- screenshots e imagens de referencia
- moodboards gerados via skill 17
- handoff claro para UI/UX (skill 02)

## Responsabilidades

1. Pesquisar e identificar top 3-5 concorrentes do nicho
2. Capturar screenshots e imagens de referencia dos concorrentes
3. Analisar padroes visuais competitivos (paleta, tipografia, layout, CTAs, conversao)
4. Definir estrategia visual: o que copiar, o que evitar, o que diferenciar
5. Gerar moodboards proprietarios via Image Generator (skill 17)
6. Consolidar dossie estrategico para o UI/UX

## Stack de Ferramentas

### Busca de Concorrentes (obrigatorio)

**Default:** Brave Search API via WebSearch
**Fallback:** WebSearch nativo do ambiente

Buscar:
- top 5 concorrentes diretos do nicho
- referencias em Awwwards, Dribbble, Behance para o nicho
- tendencias de design do segmento

### Captura Visual e Scraping (obrigatorio)

**Default:** Playwright MCP
**Opcional:** Firecrawl API (se disponivel no ambiente)

Acoes:
- navegar em cada resultado encontrado
- tirar screenshot full-page de cada concorrente
- extrair imagens relevantes (heros, cards, CTAs) parseando DOM e baixando `img[src]`
- salvar em `docs/design-intelligence/screenshots/` e `docs/design-intelligence/references/`

### Analise Visual (obrigatorio)

**Selecao de modelo:** delegar para LLM Selector (skill 16)

O LLM Selector escolhe o modelo multimodal adequado para analisar os screenshots. Isso garante que funcione independente do ambiente (Claude, Gemini, GPT, etc).

### Geracao de Moodboard (obrigatorio)

**Execucao:** delegar para Image Generator (skill 17)

Montar super-prompt enriquecido com insights da analise e fazer handoff para o skill 17 gerar moodboards proprietarios.

## Fases de Execucao

### Fase 1: Discovery

1. Consultar Asset Librarian (skill 19) para inventariar o que o projeto ja tem
2. Brave Search: buscar top 5 concorrentes diretos
3. Brave Search: buscar referencias em Awwwards, Dribbble, Behance
4. Playwright: navegar, screenshot full-page, extrair imagens do DOM

**Artefato:** `docs/design-intelligence/01-discovery.md`

### Fase 2: Analise Visual Competitiva

1. LLM Selector (skill 16) escolhe modelo multimodal
2. Enviar screenshots para analise estruturada
3. Modelo retorna: paletas, tipografia, layouts, CTAs, hierarquia, padroes de conversao
4. Comparar concorrentes entre si: padrao do nicho vs diferencial

**Artefato:** `docs/design-intelligence/02-analysis.md`

### Fase 3: Estrategia e Briefing

1. Cruzar tendencias do nicho com identidade atual do projeto
2. Definir recomendacoes: paleta, tipografia, hierarquia, CTAs
3. Classificar: copiar (padroes que funcionam) / evitar (cliches) / diferenciar (oportunidades)
4. Montar briefing estruturado para Image Generator (skill 17)

**Artefato:** `docs/design-intelligence/03-strategy.md`

### Fase 4: Moodboard

1. Handoff para Image Generator (skill 17) com super-prompt enriquecido
2. Skill 17 gera moodboards mesclando tendencias com identidade propria
3. Receber assets gerados

**Artefato:** `docs/design-intelligence/04-moodboard/` (imagens geradas)

### Fase 5: Dossie Final e Handoff

Consolidar tudo num documento unico:

**Artefato:** `docs/design-intelligence/dossier.md`

```markdown
# Design Intelligence Report — [nicho/projeto]

## 1. Concorrentes Analisados
- Top 3-5 com screenshots e URLs

## 2. Analise Visual Competitiva
- Paletas dominantes
- Tipografia e hierarquia
- Padroes de layout (hero, CTA, sections)
- Estrategia de conversao (CTAs, copy patterns)

## 3. Tendencias do Nicho
- O que os melhores estao fazendo
- Diferenciais visuais encontrados

## 4. Recomendacoes Estrategicas
- Paleta sugerida (com tokens)
- Tipografia sugerida
- Hierarquia de informacao
- CTAs e copy direction

## 5. Moodboard e Referencias Visuais
- Moodboards gerados via skill 17
- Screenshots curados dos concorrentes

## 6. Handoff para UI/UX
- Design tokens sugeridos
- Wireframe direction
- O que copiar, o que evitar, o que diferenciar
```

## Estrutura de Artefatos

```
docs/design-intelligence/
├── 01-discovery.md
├── 02-analysis.md
├── 03-strategy.md
├── 04-moodboard/
│   └── (imagens geradas pelo skill 17)
├── screenshots/
│   └── (screenshots full-page dos concorrentes)
├── references/
│   └── (imagens extraidas dos concorrentes)
└── dossier.md          <- output final pro UI/UX
```

## Resiliencia

Se uma fase falhar, a skill retoma da ultima fase completa. Cada fase salva artefato independente.

## Integracao com Outras Skills

- `Asset Librarian (19)`: fornece inventario de assets e identidade visual existente
- `LLM Selector (16)`: escolhe modelo multimodal para analise de screenshots
- `Image Generator (17)`: gera moodboards proprietarios a partir do briefing
- `UI/UX Designer (02)`: recebe o dossie final e executa a interface
- `Orchestrator (09)`: coordena quando esta skill entra no pipeline

## Evidencia de Conclusao

- concorrentes pesquisados e capturados
- analise visual estruturada produzida
- estrategia definida com copiar/evitar/diferenciar
- moodboards gerados via skill 17
- dossie final consolidado em `docs/design-intelligence/dossier.md`
- handoff claro para UI/UX (skill 02)

## Handoff

Entregar para UI/UX (skill 02):

- `docs/design-intelligence/dossier.md` com toda a inteligencia visual
- imagens de referencia e moodboards em `docs/design-intelligence/`
- design tokens sugeridos para o projeto
- direcao clara: copiar / evitar / diferenciar

Seguir `policies/handoffs.md` e `templates/handoff.md`.

## Codigo Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.
