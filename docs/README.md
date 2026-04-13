# Mapa da Documentacao

## Estrutura atual do kit

- `repo-audit/` - Auditoria persistida do repositorio (`current.md`, `assets.md`)
- `skill-guides/` - Guias auxiliares carregados sob demanda por cada skill (inclui `skill-discovery.md` e `context-engineering.md`)
- `context/` - Gerenciado automaticamente pelo Context Manager e pelos tools de working set
- `plans/` - Planos de implementacao

## Artefatos operacionais diarios

- `context/current-focus.md` - foco persistido da sessao
- `context/working-set.json` - arquivos quentes, decisoes e proximos passos
- `context/session-YYYY-MM-DD.md` - resumo de handoff por sessao
- `repo-audit/current.md` - fotografia reutilizavel do repo
- `repo-audit/assets.md` - inventario visual reutilizavel

## Fluxo enxuto recomendado

1. Se faltar contexto, usar `Repo Auditor`
2. Antes de explorar demais, montar um `context pack`
3. Durante a implementacao, manter o `working set` atualizado
4. Antes de review ou retomada, gerar um `diff brief`
5. Em sessoes longas, consultar `track_cost` para detectar releitura e loops

## Estrutura sugerida para repos consumidores

- `features/` - Documentacao por feature (objetivo, regras, fluxo, API, UI)
- `architecture/` - Visao geral, padroes front/back, ADRs
- `api/` - Contratos de API, erros, paginacao
- `ops/` - Setup, deploy, observabilidade

## Como Usar

1. Repo novo? Rode `Repo Auditor` para criar `repo-audit/current.md`
2. Nova feature? Crie pasta em `features/<nome>/`
3. Decisao arquitetural? Crie ADR em `architecture/decisions/`
4. Novo endpoint? Documente em `api/` ou na feature
5. Mudanca de infra? Atualize `ops/`
6. Precisa de guia detalhado? Consulte `skill-guides/`
