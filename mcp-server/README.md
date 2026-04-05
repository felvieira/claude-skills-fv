# Dev Team Kit — MCP Server

MCP server que expoe 32 tools do Dev Team Kit, apoiadas pelas 32 skills, para qualquer cliente MCP (Claude Code, Cursor, Windsurf, Gemini CLI, etc.).

## Setup

```bash
cd mcp-server
npm install
npm run build
```

## Configuracao

### Claude Code (.claude/settings.json)

```json
{
  "mcpServers": {
    "dev-team-kit": {
      "command": "node",
      "args": ["/caminho/para/mcp-server/dist/index.js"],
      "env": {
        "FAL_KEY": "fal-...",
        "BRAVE_SEARCH_KEY": "BSA...",
        "FIRECRAWL_KEY": "fc-..."
      }
    }
  }
}
```

### Windsurf (.windsurf/mcp.json)

Mesmo formato acima.

### Gemini CLI (.gemini/settings.json)

Mesmo formato acima.

### Via npx (apos publicacao)

```json
{
  "mcpServers": {
    "dev-team-kit": {
      "command": "npx",
      "args": ["-y", "@felvieira/dev-team-kit-mcp"],
      "env": {
        "FAL_KEY": "fal-...",
        "BRAVE_SEARCH_KEY": "BSA..."
      }
    }
  }
}
```

## API Keys

| Key | Obrigatoria | Onde obter |
|-----|-------------|-----------|
| `FAL_KEY` | Recomendada | [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys) |
| `BRAVE_SEARCH_KEY` | Recomendada | [brave.com/search/api](https://brave.com/search/api/) |
| `FIRECRAWL_KEY` | Opcional | [firecrawl.dev](https://firecrawl.dev/) |

Prioridade de leitura: env vars > .env.local > .env

## Tools (32)

### Knowledge (14)

| Tool | O que faz |
|------|-----------|
| `devkit_route_task` | Classifica pedido e retorna pipeline com skills |
| `devkit_get_skill` | Retorna SKILL.md + guide + template |
| `devkit_next_step` | Proxima skill no pipeline |
| `devkit_list_skills` | Lista 32 skills |
| `devkit_get_governance` | GLOBAL.md + policies |
| `devkit_get_template` | Template especifico |
| `devkit_get_patterns` | Patterns de AI integration |
| `devkit_get_code_snippets` | Hooks, components, types |
| `devkit_get_repo_audit` | Audit e assets persistidos |
| `devkit_recommend_model` | LLM Selector (Fast/Balanced/Deep) |
| `devkit_get_skill_matrix` | Dependencias entre skills |
| `devkit_get_eval_cases` | Casos de teste |
| `devkit_context_pack` | Monta contexto minimo por task com audit, focus, git status e previews |
| `devkit_diff_brief` | Resume diff atual, status e working set para retomada ou review |

### Execution (6)

| Tool | O que faz | API Key |
|------|-----------|---------|
| `devkit_search_web` | Busca via Brave Search | BRAVE_SEARCH_KEY |
| `devkit_scrape_page` | Scraping via Firecrawl ou Playwright | FIRECRAWL_KEY (opcional) |
| `devkit_screenshot_page` | Screenshot via Playwright | — |
| `devkit_extract_images` | Extrai imagens do DOM | — |
| `devkit_generate_image` | Gera imagem via fal.ai | FAL_KEY |
| `devkit_analyze_visual_prompt` | Prompt de analise visual | — |

### Persistence (12)

| Tool | O que faz |
|------|-----------|
| `devkit_save_artifact` | Salva artefato no lugar certo |
| `devkit_get_artifact` | Recupera artefato |
| `devkit_save_context` | Persiste foco e decisoes |
| `devkit_get_context` | Recupera contexto anterior |
| `devkit_track_cost` | Rastreia custo com sinais reais de leitura, busca, escrita e repeticao |
| `devkit_working_set` | Persiste arquivos quentes, foco, decisoes e proximos passos |
| `devkit_session_summary` | Gera resumo da sessao para handoff |
| `devkit_smart_suggestions` | Sugere proxima acao baseado no estado do projeto |
| `devkit_learned_skills` | Lista, le e salva learned skills do projeto |
| `devkit_ambiguity_score` | Mede ambiguidade antes de executar uma task |
| `devkit_suggest_trailers` | Sugere trailers de commit a partir do diff |
| `devkit_context_guard` | Avalia uso de contexto antes de encerrar |

## Desenvolvimento

```bash
npm run dev     # watch mode
npm run build   # build
npm start       # run
```

## Testar

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```
