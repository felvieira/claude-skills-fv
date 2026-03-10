# Mapa da Documentacao

## Estrutura

- `features/` — Documentacao por feature (objetivo, regras, fluxo, API, UI)
- `architecture/` — Visao geral, padroes front/back, ADRs
- `api/` — Contratos de API, erros, paginacao
- `ops/` — Setup, deploy, observabilidade
- `context/` — Gerenciado automaticamente pelo Context Manager
- `plans/` — Planos de implementacao

## Como Usar

1. Nova feature? Crie pasta em `features/<nome>/`
2. Decisao arquitetural? Crie ADR em `architecture/decisions/`
3. Novo endpoint? Documente em `api/` ou na feature
4. Mudanca de infra? Atualize `ops/`
