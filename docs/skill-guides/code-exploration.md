# Code Exploration Guide

> Referencia rapida para agentes. Policy completa: `policies/code-exploration.md`

## Hierarquia (usar de cima pra baixo)

| Nivel | Ferramenta | Quando usar | Exemplo |
|---|---|---|---|
| 1. Graph | codebase-memory | Estrutura, call paths, dependencias | `search_graph("UserService")` |
| 2. Symbol | cymbal | Lookup de simbolo, impacto pontual | `cymbal investigate handleAuth` |
| 3. Semantic | lumen | Busca por descricao, nao sabe o nome | `semantic_search("rate limiting")` |
| 4. Bruto | Grep/Glob/Read | Fallback quando 1-3 nao resolvem | `Grep pattern="handleAuth"` |

## Ferramentas Detalhadas

### codebase-memory-mcp (Graph)

Grafo AST indexado com 66 linguagens. Resolve em 1 call o que custaria 10-20 Grep+Read.

```
search_graph("funcao ou classe")     → definicao + contexto
trace_call_path("funcao")            → quem chama + quem e chamado
get_architecture()                   → visao geral do repo
```

**Economia:** ~120x menos tokens vs exploração bruta.

### cymbal (Symbol)

CLI de navegacao por simbolo. Substitui o fluxo Grep → Read → Grep encadeado.

```
cymbal investigate <symbol>   → source + callers + impacto (15-20 calls em 1)
cymbal structure              → entry points, hotspots, pacotes top
cymbal impact <symbol>        → o que quebra se mudar
cymbal trace <symbol>         → call graph descendente
```

**Economia:** 62-100% menos tool calls.

### ory/lumen (Semantic)

Busca por significado usando embeddings locais (Ollama). Util quando nao sabe o nome exato.

```
semantic_search("authentication flow")
semantic_search("database connection pooling")
```

**Economia:** 26-39% menos tokens vs grep tentativa-e-erro.

## Deteccao Automatica

O arquivo `.bot/.env.tools` indica quais ferramentas estao instaladas:

```
CODEBASE_MEMORY_AVAILABLE=1
CYMBAL_AVAILABLE=0
LUMEN_AVAILABLE=1
```

Em Claude Code, o hook `pre-tool-enforcer.mjs` sugere automaticamente a ferramenta correta quando o agente tenta Grep/Read/Glob.

## Quando Cair pro Fallback

- Ferramenta nao instalada (`.env.tools` = 0)
- Busca muito especifica (regex exato, pattern literal)
- Ferramenta retornou resultado incompleto
- Arquivo pequeno e conhecido (Read direto e mais rapido)

## Anti-patterns

| Errado | Certo |
|---|---|
| `Grep "handleAuth"` pra achar callers | `trace_call_path("handleAuth")` |
| `Glob **/*.ts` + Read 10 arquivos pra mapear repo | `get_architecture()` |
| `Grep "auth"` em 200 matches pra achar fluxo | `semantic_search("authentication flow")` |
| Ler arquivo inteiro pra entender estrutura | `cymbal structure` |
