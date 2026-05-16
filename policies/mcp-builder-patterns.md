# MCP Server Builder Patterns

**Objetivo:** padrões para criar MCP (Model Context Protocol) servers de alta qualidade que permitam LLMs interagir com serviços externos via tools bem desenhadas.

**Quando aplicar:**
- usuário pede "criar MCP server para X"
- integrar serviço externo (API REST/GraphQL, banco, ferramenta) ao Claude/Cursor/Windsurf
- expor tools customizadas via skill 25 (ai-integration-architect)

**Inspiração:** padrões oficiais Anthropic para construção de MCP servers.

---

## Decisão: Python (FastMCP) ou Node/TypeScript (MCP SDK)?

| Cenário | Stack recomendada |
|---|---|
| Serviço HTTP simples, prototipo rápido | **Python + FastMCP** |
| Integração com tooling Node existente, performance tipada | **Node/TS + @modelcontextprotocol/sdk** |
| Ecossistema do projeto consumidor | espelhar (não introduzir runtime novo) |

## Anatomia mínima de um MCP server

```
mcp-server/
├── package.json (ou pyproject.toml)
├── src/
│   ├── index.ts           # bootstrap + transport (stdio)
│   ├── tools/             # 1 arquivo por tool
│   ├── resources/         # opcional — assets read-only
│   └── prompts/           # opcional — prompts reutilizáveis
└── README.md              # auth, env vars, lista de tools
```

## Princípios de design de tools

### 1. Naming é interface
- Verbo + objeto: `search_docs`, `create_issue`, `list_users`
- **NUNCA** `get_data`, `do_thing` — agente não vai entender quando invocar
- Prefixo namespace se houver muitas tools: `gh_create_pr`, `gh_list_issues`

### 2. Description vende a tool
- Frase 1: o que faz (verbo de ação)
- Frase 2: quando usar (gatilho contextual)
- Frase 3 (opcional): quando NÃO usar
- Listar exemplos de input no schema

**Bom:**
```
description: "Search the GitHub repository for issues matching a query.
Use when the user asks about open issues, mentions issue numbers, or
needs to find related work. Do NOT use for code search (use grep_code)."
```

**Ruim:**
```
description: "Searches GitHub."
```

### 3. Input schema é contrato
- Validação Zod (Node) ou Pydantic (Python) **obrigatória**
- Defaults sensatos para parâmetros opcionais
- Erros descritivos: "labels deve ser array de strings, não objeto"
- Limites explícitos: `max: 100` em listagens, `max_length: 5000` em strings

### 4. Output deve ser JSON estruturado
- **Nunca** retornar prosa solta — agente precisa parsear
- Schema do output documentado (JSON Schema ou TS type)
- Erros como `{ error: { code, message, details } }`, não exception

### 5. Idempotência onde possível
- `create_*` deve aceitar `idempotency_key` ou checar duplicatas
- `delete_*` deve ser safe-by-default (`?dry_run=true`)
- Operações destrutivas pedem confirmação explícita no schema

## Auth e segurança

- Secrets via env var, nunca hardcoded
- README documenta env vars obrigatórias e onde obter
- Tokens com escopo mínimo (read-only se possível)
- Rate limiting respeitado (não fazer 100 calls em loop)
- Logs **nunca** vazam tokens — sanitizar antes de imprimir

## Test patterns

- Cada tool tem golden case em `tests/tools/<tool>.test.ts`
- Mock do serviço externo (não bater API real em CI)
- Snapshot do output schema — quebra de contrato bloqueia merge
- Smoke test: spawn server + invocar 1 tool de cada categoria

## Distribution

- Publicar no npm/PyPI com nome `@org/mcp-<service>` ou `mcp-<service>`
- README inclui:
  - Bloco JSON pronto para copiar em `claude-settings.json` / `mcp.json`
  - Lista completa de tools com 1 linha de descrição
  - Troubleshooting (auth fails, rate limit, conexão)

## Anti-padrões

- **Tool genérica `execute(command)`** — bypassa todo o sistema de tipos. Quebrar em N tools específicas.
- **Output em natural language** — "Found 3 issues in your repo!" — agente não consegue iterar. Devolver `{ count: 3, issues: [...] }`.
- **Sem timeout** — tool que trava 30min congela o agente. Default 30s, max 5min.
- **Tool exposta sem auth check** — qualquer cliente MCP pode chamar; assumir confiança zero.
- **Múltiplos transportes** — escolher um (stdio padrão); não suportar SSE+WebSocket+stdio simultaneamente.

## Integração com nosso kit

- Skill 25 (ai-integration-architect) referencia esta policy ao recomendar MCP server
- Skill 35 (skill-author) aponta para esta policy quando uma skill expõe tool customizada
- Nosso `mcp-server/` (37 tools) segue estes padrões — usar como referência viva
