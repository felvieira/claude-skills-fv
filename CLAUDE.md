# Claude Code — Dev Team Kit

Este repositorio e um kit de skills para agentes de coding. Leia os arquivos nesta ordem:

1. `GLOBAL.md` — regras universais
2. `policies/` — regras compartilhadas
3. `AGENTS.md` — objetivo e uso do kit
4. `README.md` — documentacao completa com pipeline, skills e stack

## Uso em repos consumidores

Quando instalado em `.bot/` de outro repo, o agente deve ler o `AGENTS.md` da raiz do repo consumidor, que aponta para `.bot/`.

## Economia de contexto

- reutilizar `docs/repo-audit/current.md` antes de explorar o repo
- abrir `docs/skill-guides/` apenas sob demanda
- consultar `patterns/ai-integration/` para features de IA

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current

<!-- CLAUDE-MEMORY-SETUP -->
## Memoria Persistente (ai-memory)

Migrado em 2026-09-04 do vault Zettelkasten (`D:\claude-memory\`) para
[ai-memory v2.0](https://github.com/akitaonrails/ai-memory). Captura automatica
via hooks — sem save manual. Ver `~/.claude/CLAUDE.md` para detalhes do
servidor/binario/MCP.

### Regra de 3 Camadas
1. **Primeiro:** consulte `graphify-out/graph.json` neste repo para entender estrutura e conexoes
2. **Segundo:** pergunte em linguagem natural ("onde paramos", "ja discutimos X") ou rode
   `ai-memory search "query" --project claude-skills-fv` para contexto de sessoes anteriores
3. **Terceiro:** so leia arquivos de codigo brutos ao editar ou quando as camadas acima nao resolverem

### Graphify
- Graph disponivel em: `graphify-out/graph.json` (gerado automaticamente)
- Para atualizar apos refatoracoes: `graphify . --update`
- NAO edite arquivos dentro de `graphify-out/` manualmente

### Historico migrado
Os 75 `architecture/claude-skills-fv/decisions.md` (antigo vault) e todos os
logs de sessao deste projeto foram importados como paginas `ai-memory` sob o
projeto `claude-skills-fv` (tag `migrated`). O vault antigo em
`D:\claude-memory\` fica congelado como arquivo morto.
<!-- /CLAUDE-MEMORY-SETUP -->
