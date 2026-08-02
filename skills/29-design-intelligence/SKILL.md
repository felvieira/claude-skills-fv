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

**Selecao de modelo:** seguir `policies/model-routing.md`

O Model Routing define o tier adequado para analisar screenshots (tipicamente Deep para analise multimodal). Funciona independente do ambiente.

### Geracao de Moodboard (obrigatorio)

**Execucao:** delegar para Image Generator (skill 17)

Montar super-prompt enriquecido com insights da analise e fazer handoff para o skill 17 gerar moodboards proprietarios.

**Regra default da skill 17** (aplica automaticamente): moodboard sem referência → `grok-imagine` ($0.020/img × 4 painéis = $0.080). Com screenshots de referência → `gemini-25-flash` ($0.039/img). Override só se moodboard precisar de tipografia complexa (`--model gemini-3-pro`).

## Modo Redesign — Auditoria de UI Existente

Ponto de entrada 2 (linha "Melhoria de UI existente") usa este protocolo em vez das Fases 1-2 abaixo — aqui não há concorrente pra pesquisar, a UI existente É o material de análise. Aplica-se quando o usuário pede pra melhorar/redesenhar algo que já está construído.

### Scan → Diagnose → Fix

1. **Scan**: ler o código da UI existente — framework, método de estilização (Tailwind, CSS vanilla, styled-components), estrutura de componentes.
2. **Diagnose**: rodar o checklist de 7 dimensões abaixo, listando todo padrão genérico, ponto fraco e estado faltante encontrado.
3. **Fix**: aplicar upgrades na ordem de prioridade, trabalhando com a stack existente (não trocar framework/lib no meio do redesign).

### Checklist de 7 dimensões

| Dimensão | O que checar |
|---|---|
| Tipografia | fontes default do browser, hierarquia fraca, variação de peso insuficiente, largura de linha excessiva, palavra órfã |
| Cor e superfície | paleta inconsistente, saturação, fundo genérico, qualidade de sombra — sinal clássico: "gradiente roxo/azul de IA" |
| Layout | viés de centralização, grid de cards genérico, unidades de viewport, alinhamento e espaçamento inconsistentes |
| Interatividade e estados | hover state ausente, foco sem indicador, falta de estado de loading/empty/error, feedback de navegação |
| Conteúdo | nomes repetitivos, dados irreais, tom de copy genérico ("Elevate", "Seamless"), avatares idênticos |
| Componentes | cards genéricos, badges em formato pill, carrossel de 3 cards, modal-para-tudo, círculos de avatar padronizados |
| Código e omissões | HTML não-semântico, estilo inline, dimensões hardcoded, gaps de acessibilidade, ausência estratégica (link legal, página 404, validação de formulário) |

### Ordem de execução dos upgrades

`troca de fonte → limpeza de cor → estados interativos → layout/espaçamento → substituição de componente → design de estados → polimento tipográfico`

Preservar estrutura de URL, labels de navegação e nomes de campo de formulário existentes, salvo aprovação explícita do usuário — redesign visual não é desculpa pra quebrar link externo ou integração já em uso.

**Artefato:** `docs/design-intelligence/redesign-audit.md`, seguindo a mesma estrutura de dossiê da Fase 5, com a seção "7 dimensões" substituindo a análise competitiva.

## Fases de Execucao (pesquisa competitiva — ponto de entrada 1)

### Fase 1: Discovery

1. Consultar Asset Librarian (skill 19) para inventariar o que o projeto ja tem
2. Brave Search: buscar top 5 concorrentes diretos
3. Brave Search: buscar referencias em Awwwards, Dribbble, Behance
4. Playwright: navegar, screenshot full-page, extrair imagens do DOM

**Artefato:** `docs/design-intelligence/01-discovery.md`

### Fase 2: Analise Visual Competitiva

1. Model Routing (`policies/model-routing.md`) define tier para analise multimodal
2. Enviar screenshots para analise estruturada
3. Modelo retorna: paletas, tipografia, layouts, CTAs, hierarquia, padroes de conversao
4. Comparar concorrentes entre si: padrao do nicho vs diferencial

**Artefato:** `docs/design-intelligence/02-analysis.md`

### Fase 3: Estrategia e Briefing

1. Cruzar tendencias do nicho com identidade atual do projeto
2. Definir recomendacoes: paleta, tipografia, hierarquia, CTAs
3. Classificar: copiar (padroes que funcionam) / evitar (cliches) / diferenciar (oportunidades)
4. **Checar diversidade estrutural:** antes de fechar a recomendacao de layout, buscar dossies anteriores em `docs/design-intelligence/` (deste workspace ou de outros projetos, se acessiveis) e listar quais estruturas de secao (formato de hero, grid de features, layout de pricing) ja foram recomendadas recentemente. Se a estrutura proposta repete uma ja usada em projeto anterior sem justificativa (ex: o nicho realmente exige aquele padrao), marcar como risco de "mesma forma de novo" na secao 4 do dossie e propor uma variacao estrutural alternativa antes de seguir para o moodboard.
5. Montar briefing estruturado para Image Generator (skill 17)

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
- `Model Routing (policy)`: define tier de modelo para analise de screenshots. Ver `policies/model-routing.md`
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

## Fontes

- Checagem de diversidade estrutural (Fase 3) inspirada na função "Redesign" de [usehallmark.com](https://www.usehallmark.com/) — garantir que a mesma forma estrutural não se repita sem justificativa entre projetos.
- Protocolo Scan → Diagnose → Fix e checklist de 7 dimensões ("Modo Redesign") inspirados em [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) (redesign-skill).

## Codigo Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.
