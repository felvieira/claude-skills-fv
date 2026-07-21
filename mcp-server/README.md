# Dev Team Kit — MCP Server

MCP server que expoe 38 tools do Dev Team Kit, apoiadas pelas 52 skills instaladas, para qualquer cliente MCP (Claude Code, Cursor, Windsurf, Gemini CLI, etc.).

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

## Design decision: slash commands vs MCP tools

The 26 slash commands (including `/constitution`, `/analyze`, `/checklist`) are **NOT** exposed as MCP tools. Rationale:

- **Slash commands** are interactive workflows that take freeform input, ask follow-up questions, and produce artifacts (files in the consumer repo). They belong in the agent's slash-command interface, not in the tool-use loop.
- **MCP tools** are programmatic, single-call functions with structured I/O. They are invoked transparently as part of agent reasoning, not as explicit user-driven workflows.

The 38 tools below are infrastructure (routing, context packs, image generation, scraping, session intelligence) — building blocks used by skills and commands. Adding `/constitution` as a tool would break the user-facing interaction model (the agent calling it without user intent).

If a slash command needs programmatic access from another tool, expose a **dedicated helper tool** (not the whole command). Currently none of the spec-driven commands need this.

## Tools (38)

### Knowledge (15)

| Tool | O que faz |
|------|-----------|
| `devkit_route_task` | Classifica pedido, preserva o pipeline legado e retorna a composicao minima de plugins/skills; recomenda plugins externos sem invoca-los |
| `devkit_list_plugins` | Lista plugins bundlados e externos, capacidades, risco e instrucao de instalacao |
| `devkit_get_skill` | Retorna SKILL.md + guide + template |
| `devkit_next_step` | Proxima skill no pipeline |
| `devkit_list_skills` | Lista 31 skills |
| `devkit_get_governance` | GLOBAL.md + policies |
| `devkit_get_template` | Template especifico |
| `devkit_get_patterns` | Patterns de AI integration |
| `devkit_get_code_snippets` | Hooks, components, types |
| `devkit_get_repo_audit` | Audit e assets persistidos |
| `devkit_recommend_model` | Model Routing (Fast/Balanced/Deep) — ver `policies/model-routing.md` |
| `devkit_get_skill_matrix` | Dependencias entre skills |
| `devkit_get_eval_cases` | Casos de teste |
| `devkit_context_pack` | Monta contexto minimo por task com audit, focus, git status e previews |
| `devkit_diff_brief` | Resume diff atual, status e working set para retomada ou review |

The MCP router runs the same fixtures as `scripts/eval-plugin-routing.mjs`, so a route must remain consistent across CLI, hooks and MCP clients.

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

### Session Intelligence (5)

| Tool | O que faz |
|------|-----------|
| `devkit_compress_output` | Comprime output verboso de bash (ANSI strip, dedup, truncação, opcionalmente cross-call dedup stage 0) antes de passar ao modelo |
| `devkit_dedup_status` | Inspeciona a janela de cross-call dedup (v2.9.1+); aceita `reset: true` pra zerar |
| `devkit_session_events` | Lê e filtra o log JSONL de eventos da sessão (.auto/events.jsonl) |
| `devkit_seen_files` | Lista todos os arquivos acessados na sessão, dedupados por path |
| `devkit_seen_errors` | Lista erros da sessão agrupados por hash normalizado |

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
