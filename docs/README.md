# Mapa da Documentacao

## Estrutura

- `repo-audit/` — Auditoria persistida do repositorio (current.md, assets.md)
- `skill-guides/` — Guias auxiliares carregados sob demanda por cada skill
- `context/` — Gerenciado automaticamente pelo Context Manager
- `plans/` — Planos de implementacao
- `features/` — Documentacao por feature (objetivo, regras, fluxo, API, UI)
- `architecture/` — Visao geral, padroes front/back, ADRs
- `api/` — Contratos de API, erros, paginacao
- `ops/` — Setup, deploy, observabilidade

## Como Usar

1. Repo novo? Rode `Repo Auditor` para criar `repo-audit/current.md`
2. Nova feature? Crie pasta em `features/<nome>/`
3. Decisao arquitetural? Crie ADR em `architecture/decisions/`
4. Novo endpoint? Documente em `api/` ou na feature
5. Mudanca de infra? Atualize `ops/`
6. Precisa de guia detalhado? Consulte `skill-guides/`
