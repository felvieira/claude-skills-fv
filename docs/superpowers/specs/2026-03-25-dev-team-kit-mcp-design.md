# Dev Team Kit MCP Server — Design Spec

**Data:** 2026-03-25
**Status:** Draft
**Objetivo:** Versao MCP do projeto claude-skills-fv. O usuario acopla o MCP e qualquer pedido e roteado, classificado e executado pelo sistema de 29 skills com acesso a APIs reais.

---

## Visao Geral

O MCP server e o ponto unico de entrada pro kit de desenvolvimento. O LLM do cliente (Claude, Gemini, GPT, etc.) chama as tools, o MCP:

1. **Roteia** — classifica o pedido e monta o pipeline
2. **Fornece conhecimento** — entrega skills, policies, templates, patterns
3. **Executa** — faz scraping, busca, captura de screenshots, geracao de imagens via APIs reais

O LLM do cliente pensa. O MCP faz.

---

## Arquitetura

```
┌─────────────────────────────────────────┐
│           LLM do Cliente                │
│  (Claude, Gemini, GPT, OpenCode, etc.) │
│         ↕ MCP Protocol                  │
├─────────────────────────────────────────┤
│        dev-team-kit-mcp-server          │
│                                         │
│  ┌──────────────┐  ┌────────────────┐  │
│  │  Knowledge    │  │  Execution     │  │
│  │  Block        │  │  Block         │  │
│  │               │  │                │  │
│  │  - Skills     │  │  - Brave Search│  │
│  │  - Policies   │  │  - Firecrawl   │  │
│  │  - Templates  │  │  - Playwright  │  │
│  │  - Patterns   │  │  - fal.ai      │  │
│  │  - Audit      │  │  - Screenshots │  │
│  │  - Router     │  │  - Image Gen   │  │
│  └──────────────┘  └────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Persistence Block               │  │
│  │  - Artifacts, Context, Audit     │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Stack

| Aspecto | Escolha |
|---------|---------|
| Linguagem | TypeScript |
| SDK | `@modelcontextprotocol/sdk` |
| Transport | stdio (local) |
| Validacao | Zod |
| Diretorio | `mcp-server/` na raiz do repo |
| Distribuicao | `npx @felvieira/dev-team-kit-mcp` |

---

## Configuracao (API Keys)

```json
{
  "devTeamKit": {
    "command": "npx",
    "args": ["-y", "@felvieira/dev-team-kit-mcp"],
    "env": {
      "FAL_KEY": "fal-...",
      "BRAVE_SEARCH_KEY": "BSA...",
      "FIRECRAWL_KEY": "fc-..."
    }
  }
}
```

- `FAL_KEY` — obrigatorio pra geracao de imagens (skill 17)
- `BRAVE_SEARCH_KEY` — obrigatorio pra busca de concorrentes (skill 29)
- `FIRECRAWL_KEY` — opcional, fallback e Playwright

---

## Tools — Bloco Knowledge (Roteamento e Contexto)

### `devkit_route_task`

Classifica pedido em linguagem natural e retorna pipeline completo.

```
Input:  { description: string, project_context?: string }
Output: {
  type: "feature" | "bugfix" | "ui_improvement" | "refactor" | "migration" | "ai_feature" | "landing_page" | "hotfix" | "release",
  pipeline: [ { step: number, skill_id: string, skill_name: string, purpose: string } ],
  policies: string[],
  templates: string[]
}
```

Annotations: `readOnlyHint: true`

### `devkit_get_skill`

Retorna SKILL.md completa + skill-guide + template de output.

```
Input:  { skill_id: string }  // ex: "29-design-intelligence", "02-ui-ux-design"
Output: {
  skill_content: string,      // SKILL.md completo
  skill_guide?: string,       // docs/skill-guides/*.md se existir
  template?: string,          // template de output relevante
  integrations: string[]      // skills que integra
}
```

Annotations: `readOnlyHint: true`

### `devkit_next_step`

Dado estado atual do pipeline, retorna proxima skill com contexto de handoff.

```
Input:  {
  pipeline_type: string,
  current_step: number,
  completed_skills: string[],
  artifacts_produced: string[]
}
Output: {
  next_skill: { id: string, name: string, content: string },
  handoff_template: string,
  context_needed: string[]
}
```

Annotations: `readOnlyHint: true`

### `devkit_list_skills`

Lista todas as 29 skills.

```
Input:  {}
Output: { skills: [{ id: string, name: string, description: string, triggers: string[] }] }
```

Annotations: `readOnlyHint: true`

### `devkit_get_governance`

Retorna GLOBAL.md + policies relevantes.

```
Input:  { task_type?: string }
Output: {
  global: string,
  policies: [{ name: string, content: string }]
}
```

Annotations: `readOnlyHint: true`

### `devkit_get_template`

Retorna template especifico.

```
Input:  { template_name: string }  // ex: "handoff", "plan", "design-intelligence-dossier"
Output: { content: string }
```

Annotations: `readOnlyHint: true`

### `devkit_get_patterns`

Retorna patterns de AI integration.

```
Input:  { pattern?: string }  // ex: "hooks", "providers", "cost-efficiency", "security"
Output: { content: string }
```

Annotations: `readOnlyHint: true`

### `devkit_get_code_snippets`

Retorna hooks, components, types do `src/`.

```
Input:  { type: "hooks" | "components" | "stores" | "types" | "middleware" }
Output: { files: [{ path: string, content: string }] }
```

Annotations: `readOnlyHint: true`

### `devkit_get_repo_audit`

Retorna audit e asset inventory persistidos.

```
Input:  {}
Output: {
  audit?: string,       // docs/repo-audit/current.md
  assets?: string,      // docs/repo-audit/assets.md
  exists: boolean
}
```

Annotations: `readOnlyHint: true`

### `devkit_recommend_model`

Logica do LLM Selector (skill 16).

```
Input:  { task_type: string, complexity: "low" | "medium" | "high", risk: "low" | "medium" | "high" }
Output: {
  level: "Fast" | "Balanced" | "Deep",
  model_class: string,
  reason: string
}
```

Annotations: `readOnlyHint: true`

### `devkit_get_skill_matrix`

Retorna matriz de dependencias entre skills.

```
Input:  { skill_id?: string }
Output: { matrix: [{ skill: string, calls: string[], called_by: string[] }] }
```

Annotations: `readOnlyHint: true`

### `devkit_get_eval_cases`

Retorna casos de teste/eval.

```
Input:  { skill_id?: string, flow?: string }
Output: { cases: [{ name: string, content: string }] }
```

Annotations: `readOnlyHint: true`

---

## Tools — Bloco Execution (APIs Reais)

### `devkit_search_web`

Busca via Brave Search API.

```
Input:  {
  query: string,
  count?: number,          // default 5
  search_type?: "general" | "competitors" | "design_references"
}
Output: {
  results: [{ title: string, url: string, description: string }]
}
```

- Se `search_type: "competitors"`, adiciona filtros pra encontrar players do nicho
- Se `search_type: "design_references"`, busca em Awwwards, Dribbble, Behance
- Requer `BRAVE_SEARCH_KEY`

Annotations: `readOnlyHint: true, openWorldHint: true`

### `devkit_scrape_page`

Extrai conteudo estruturado de uma URL.

```
Input:  { url: string, format?: "markdown" | "html" | "text" }
Output: { content: string, title: string, images: string[] }
```

- Se `FIRECRAWL_KEY` disponivel, usa Firecrawl (rapido, limpo)
- Senao, usa Playwright como fallback (navega, extrai)

Annotations: `readOnlyHint: true, openWorldHint: true`

### `devkit_screenshot_page`

Tira screenshot full-page de uma URL via Playwright.

```
Input:  {
  url: string,
  full_page?: boolean,     // default true
  viewport?: { width: number, height: number }
}
Output: {
  image_path: string,      // caminho local do screenshot
  image_base64?: string    // base64 pra enviar pro LLM analisar
}
```

Annotations: `readOnlyHint: true, openWorldHint: true`

### `devkit_extract_images`

Parseia DOM de uma URL e baixa imagens relevantes.

```
Input:  {
  url: string,
  selector?: string,       // CSS selector pra filtrar (ex: ".hero img", ".card img")
  limit?: number           // default 10
}
Output: {
  images: [{ src: string, alt: string, local_path: string }]
}
```

Annotations: `readOnlyHint: true, openWorldHint: true`

### `devkit_generate_image`

Gera imagem via fal.ai API. Wrapper do `scripts/generate-image.py` existente.

```
Input:  {
  mode: "t2i" | "i2i" | "rembg" | "ico",
  prompt?: string,
  image_path?: string,     // pra i2i e rembg
  output_path?: string,
  model?: string,
  dimensions?: { width: number, height: number }
}
Output: {
  image_path: string,
  prompt_used: string,
  model_used: string,
  metadata: object
}
```

- Requer `FAL_KEY`

Annotations: `readOnlyHint: false, destructiveHint: false, idempotentHint: false`

### `devkit_analyze_visual_prompt`

Retorna prompt estruturado pro LLM analisar screenshots de concorrentes. Nao chama LLM — monta o prompt e retorna pro LLM do cliente executar.

```
Input:  {
  screenshots: string[],    // paths locais
  analysis_type: "competitive" | "trends" | "palette" | "typography" | "layout" | "cta"
}
Output: {
  prompt: string,           // prompt estruturado pra analise visual
  images: string[]          // paths das imagens pra o LLM ler
}
```

Annotations: `readOnlyHint: true`

---

## Tools — Bloco Persistence

### `devkit_save_artifact`

Salva artefato no lugar certo do projeto.

```
Input:  {
  type: "spec" | "dossier" | "audit" | "assets" | "plan" | "handoff" | "context" | "custom",
  content: string,
  filename?: string,
  project_path?: string    // raiz do projeto consumidor
}
Output: { saved_path: string }
```

Annotations: `readOnlyHint: false, destructiveHint: false`

### `devkit_get_artifact`

Recupera artefato salvo.

```
Input:  { type: string, filename?: string, project_path?: string }
Output: { content: string, path: string, exists: boolean }
```

Annotations: `readOnlyHint: true`

### `devkit_save_context`

Persiste foco, decisoes, blockers, proximos passos.

```
Input:  {
  focus: string,
  decisions?: string[],
  blockers?: string[],
  next_steps?: string[],
  project_path?: string
}
Output: { saved_path: string }
```

Annotations: `readOnlyHint: false, destructiveHint: false`

### `devkit_get_context`

Recupera contexto da sessao anterior.

```
Input:  { project_path?: string }
Output: { focus?: string, decisions?: string[], blockers?: string[], next_steps?: string[], exists: boolean }
```

Annotations: `readOnlyHint: true`

---

## Estrutura de Pastas

```
mcp-server/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── index.ts                  # Entry point, McpServer init, transport
│   ├── constants.ts              # API URLs, defaults, limits
│   ├── types.ts                  # TypeScript interfaces
│   ├── tools/
│   │   ├── knowledge/
│   │   │   ├── route-task.ts     # Classificacao + pipeline
│   │   │   ├── get-skill.ts     # Skill + guide + template
│   │   │   ├── next-step.ts     # Proximo passo do pipeline
│   │   │   ├── list-skills.ts   # Listagem das 29 skills
│   │   │   ├── get-governance.ts # GLOBAL + policies
│   │   │   ├── get-template.ts  # Templates
│   │   │   ├── get-patterns.ts  # AI patterns
│   │   │   ├── get-code.ts      # Hooks, components, types
│   │   │   ├── get-repo-audit.ts # Audit + assets
│   │   │   ├── recommend-model.ts # LLM Selector
│   │   │   ├── skill-matrix.ts  # Dependencias
│   │   │   └── eval-cases.ts    # Casos de teste
│   │   ├── execution/
│   │   │   ├── search-web.ts    # Brave Search API
│   │   │   ├── scrape-page.ts   # Firecrawl / Playwright fallback
│   │   │   ├── screenshot.ts    # Playwright screenshot
│   │   │   ├── extract-images.ts # DOM parse + download
│   │   │   ├── generate-image.ts # fal.ai API
│   │   │   └── visual-prompt.ts # Prompt builder pra analise visual
│   │   └── persistence/
│   │       ├── save-artifact.ts
│   │       ├── get-artifact.ts
│   │       ├── save-context.ts
│   │       └── get-context.ts
│   ├── services/
│   │   ├── brave-search.ts      # Brave Search API client
│   │   ├── firecrawl.ts         # Firecrawl API client
│   │   ├── fal-ai.ts            # fal.ai API client
│   │   ├── playwright.ts        # Playwright browser automation
│   │   └── file-reader.ts       # Le arquivos do kit (skills, policies, etc.)
│   ├── lib/
│   │   ├── classifier.ts        # Classifica tipo de task
│   │   ├── pipeline-engine.ts   # Monta pipeline por tipo
│   │   └── skill-loader.ts      # Parseia SKILL.md (frontmatter + content)
│   └── schemas/
│       ├── task.ts              # Zod schemas de task/pipeline
│       ├── skill.ts             # Zod schemas de skill
│       └── artifact.ts          # Zod schemas de persistencia
└── dist/                        # Build output
```

---

## Contagem Total de Tools

| Bloco | Tools | Descricao |
|-------|-------|-----------|
| Knowledge | 12 | Roteamento, skills, policies, templates, patterns, code, audit, model, matrix, evals |
| Execution | 6 | Search, scrape, screenshot, extract images, generate image, visual prompt |
| Persistence | 4 | Save/get artifact, save/get context |
| **Total** | **22** | |

---

## Fluxo Tipico de Uso

### Exemplo: "Quero melhorar a interface do meu app fitness"

1. LLM chama `devkit_route_task({ description: "melhorar interface app fitness" })`
   - MCP retorna: tipo `ui_improvement`, pipeline `[29-design-intelligence, 02-ui-ux, 04-frontend]`

2. LLM chama `devkit_get_skill({ skill_id: "29-design-intelligence" })`
   - MCP retorna: SKILL.md com todas as instrucoes de pesquisa competitiva

3. LLM segue a skill e chama `devkit_search_web({ query: "app fitness hipertrofia", search_type: "competitors" })`
   - MCP usa Brave Search e retorna top 5 concorrentes

4. LLM chama `devkit_search_web({ query: "fitness app design awwwards dribbble", search_type: "design_references" })`
   - MCP retorna referencias visuais

5. LLM chama `devkit_screenshot_page({ url: "https://concorrente1.com" })` pra cada concorrente
   - MCP usa Playwright e retorna screenshots

6. LLM chama `devkit_extract_images({ url: "https://dribbble.com/search/fitness-app" })`
   - MCP parseia DOM e baixa imagens de referencia

7. LLM chama `devkit_analyze_visual_prompt({ screenshots: [...], analysis_type: "competitive" })`
   - MCP retorna prompt estruturado, LLM analisa os screenshots com sua propria vision

8. LLM chama `devkit_generate_image({ mode: "t2i", prompt: "moodboard fitness app..." })`
   - MCP usa fal.ai e retorna moodboard gerado

9. LLM chama `devkit_save_artifact({ type: "dossier", content: "..." })`
   - MCP salva dossie em `docs/design-intelligence/dossier.md`

10. LLM chama `devkit_next_step(...)` e recebe skill 02 (UI/UX) com template de handoff

---

## Decisoes de Design

| Decisao | Escolha | Motivo |
|---------|---------|--------|
| Transport | stdio | MCP local, sem overhead de HTTP |
| LLM | Nenhum interno | IA e de quem chama (padrao MCP) |
| Brave Search | Obrigatorio pra busca | Google via Playwright e fragil (CAPTCHAs) |
| Firecrawl | Opcional | Playwright e fallback gratuito |
| fal.ai | Obrigatorio pra imagens | Script ja existe no kit |
| Playwright | Bundled | Screenshots e fallback de scraping |
| Prefix nas tools | `devkit_` | Evita colisao com outros MCPs |
| Skills como dados | Le do filesystem | Nao duplica conteudo, sempre atualizado |

---

## Dependencias Principais

```json
{
  "@modelcontextprotocol/sdk": "latest",
  "zod": "^3.22",
  "playwright": "^1.40",
  "gray-matter": "^4.0",
  "glob": "^10.0"
}
```

Opcionais (quando API key disponivel):
- `@anthropic-ai/sdk` — NAO necessario (LLM e do cliente)
- Brave Search — fetch HTTP direto
- Firecrawl — fetch HTTP direto
- fal.ai — fetch HTTP direto (ou reutilizar script Python existente)

---

## Proximos Passos

1. Aprovar este spec
2. Criar implementation plan via `writing-plans`
3. Scaffoldar `mcp-server/` com package.json, tsconfig, estrutura
4. Implementar bloco Knowledge (12 tools)
5. Implementar bloco Execution (6 tools)
6. Implementar bloco Persistence (4 tools)
7. Testar com MCP Inspector
8. Publicar no npm como `@felvieira/dev-team-kit-mcp`
