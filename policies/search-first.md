# Search-First Policy

Antes de implementar, pesquise.

## A Regra

Toda task de implementacao, integracao ou refactor exige pelo menos uma etapa de pesquisa antes de escrever codigo. O objetivo e entender o estado atual antes de mudar qualquer coisa.

## Pesquisa Minima por Tipo de Task

| Tipo | Pesquisa obrigatoria |
|---|---|
| Nova feature | `docs/repo-audit/current.md` + patterns similares no codigo + docs da lib (Context7) |
| Bug fix | logs/stack trace + ocorrencias do pattern (Grep) + fluxo de execucao antes de mudar |
| Integracao | docs da API/lib (Context7 ou web) + versao instalada + exemplos de uso |
| Refactor | mapear dependencias (Grep usages) + entender impacto em tests + surface de API |
| Migracao | `docs/repo-audit/current.md` + mapeamento completo de referencias + risco de rollback |

## Como Executar a Pesquisa

**Fontes internas (preferencia):**

1. `docs/repo-audit/current.md` — estado atual do repo, stack, convencoes
2. `docs/repo-audit/assets.md` — assets visuais e tokens
3. `docs/context/` — foco atual, working set, decisoes recentes
4. Glob + Grep no codigo — patterns existentes, convencoes, dependencias

**Fontes externas (quando necessario):**

1. Context7 MCP — documentacao atualizada de libs (`mcp__context7__resolve-library-id` + `mcp__context7__query-docs`)
2. Web search — APIs externas, breaking changes, exemplos da comunidade
3. Playwright MCP — inspecionar UI em producao ou staging antes de mudar comportamento visual

## Output da Pesquisa

Nao e necessario criar documento formal. O resultado e contexto acumulado usado na task.

Se a pesquisa revelar algo nao-obvio e reutilizavel (padroes do projeto, gotchas de libs, decisoes de arquitetura), persistir em `docs/context/` ou salvar como learned skill.

## Excecoes

- Hotfixes criticos com fix trivial e isolado (ex: typo, config errada, valor hardcoded)
- Tasks puramente mecanicas sem dependencias (renomear variavel, atualizar microcopy)

## Integracao com Orchestrator

O Orchestrator (skill 09) executa pesquisa como etapa obrigatoria do protocolo de execucao para tasks de implementacao, integracao e refactor. Ver `skills/09-orchestrator/SKILL.md`.

## Relacao com Outras Policies

- `policies/iterative-retrieval.md` — como estruturar a pesquisa em rounds progressivos quando o escopo e grande
- `policies/cost-optimization.md` — reutilizar repo-audit e working set evita releitura desnecessaria
