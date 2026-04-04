# Code Exploration Policy

## Objetivo
Reduzir consumo de tokens na exploracao de codigo priorizando ferramentas de code intelligence sobre leitura bruta de arquivos.

## Hierarquia de Preferencia

Sempre tente o nivel mais alto disponivel primeiro. So descer de nivel quando o anterior nao esta disponivel ou nao resolveu.

### Nivel 1 — Graph (estrutural)
Ferramenta: **codebase-memory-mcp**
- `search_graph`: busca por funcoes, classes, tipos no grafo AST
- `trace_call_path`: quem chama X e o que X chama (call chain)
- `get_architecture`: visao geral — linguagens, pacotes, entry points, rotas, hotspots

Quando usar: entender estrutura do repo, call paths, impacto de mudancas, dependencias entre modulos.

### Nivel 2 — Symbol (tatico)
Ferramenta: **cymbal**
- `cymbal investigate <symbol>`: source + callers + impacto (substitui 15-20 tool calls)
- `cymbal structure`: entry points, hotspots, pacotes mais importados
- `cymbal impact <symbol>`: o que quebra se X mudar
- `cymbal trace <symbol>`: call graph descendente

Quando usar: lookup rapido de simbolo especifico, analise de impacto pontual, diff scoped.

### Nivel 3 — Semantic (por intent)
Ferramenta: **ory/lumen**
- `semantic_search`: busca por significado, nao por texto literal

Quando usar: encontrar codigo por descricao ("authentication flow", "rate limiting logic"), quando nao se sabe o nome exato do simbolo.

### Nivel 4 — Bruto (fallback)
Ferramentas nativas: **Grep, Glob, Read**

Quando usar: apenas quando niveis 1-3 nao estao disponíveis ou nao resolveram.

## Regras

1. Nunca ler arquivo inteiro para entender estrutura — use `get_architecture` ou `cymbal structure`
2. Nunca grep por nome de funcao para achar callers — use `trace_call_path` ou `cymbal impact`
3. Nunca varrer diretorio inteiro para mapear componentes — use `search_graph` com filtro de tipo
4. Se nenhuma ferramenta externa esta instalada, esta policy nao muda nada — fallback normal
5. Em caso de duvida sobre qual nivel usar, comece pelo mais alto disponivel

## Exemplos

| Tarefa | Sem policy | Com policy |
|---|---|---|
| Quem chama essa funcao? | Grep → Read 5 arquivos → Grep | `trace_call_path` (1 call) |
| Como o repo esta organizado? | Glob → Read 10 arquivos | `get_architecture` (1 call) |
| Onde implementa autenticacao? | Grep "auth" → Read 8 matches | `semantic_search("authentication flow")` |
| Impacto de mudar X? | Manual, incompleto | `cymbal impact X` (1 call) |
| Achar funcao mas nao sabe o nome? | Grep tentativa-e-erro | `semantic_search("description")` |

## Deteccao de Disponibilidade

O arquivo `.bot/.env.tools` indica quais ferramentas estao instaladas. Gerado pelo `setup/install.sh`.

Em Claude Code, o hook `pre-tool-enforcer.mjs` detecta automaticamente e sugere a ferramenta correta quando o agente tenta usar Grep/Read/Glob.
