# Quickstart

Guia curto para usar o kit no dia a dia sem reler tudo.

## Ordem recomendada

1. Ler `GLOBAL.md`
2. Ler `docs/repo-audit/current.md` se existir
3. Iniciar pelo `Repo Auditor` se a auditoria estiver ausente ou desatualizada
4. Deixar o `Orchestrator` definir o pipeline minimo suficiente

## Instalacao em repo existente

- manter `AGENTS.md` na raiz do repo
- instalar o kit em `.bot/`
- usar `templates/AGENTS-root.md` como base para o `AGENTS.md` do repo consumidor
- consultar `docs/setup-bot-folder.md` para a estrutura recomendada

## Fluxos mais comuns

### Feature nova
`Repo Auditor -> PO -> UI/UX -> Backend -> Frontend -> QA -> Security -> Reviewer`

### Bugfix
`Repo Auditor` se faltar contexto -> skill afetada -> QA -> Security -> Reviewer

### Landing page
`Repo Auditor -> Copy -> UI/UX -> Frontend -> Image Generator` quando necessario `-> SEO -> QA -> Reviewer`

### Infra/operacao
`Repo Auditor -> skill afetada -> Observability SRE -> Security/QA conforme risco -> Reviewer -> Deploy`

### Release formal
pipeline normal `-> Release Manager -> Deploy`

### Feature de IA no app
`Repo Auditor -> AI Integration Architect -> Prompt Engineer` quando necessario `-> Backend/Frontend -> QA -> Security -> Reviewer`

### Feature de video no app
`Repo Auditor -> AI Integration Architect -> Video Integration Specialist -> Prompt Engineer` quando necessario `-> Backend/Frontend -> QA -> Security -> Reviewer`

### Migracao grande
`Repo Auditor -> Migration Refactor Specialist -> skill afetada -> QA -> Security -> Reviewer -> Deploy`

## Quando chamar skills novas

- `Asset Librarian`: quando houver duvida sobre logos, icones, imagens, fontes ou consistencia visual
- `Image Generator`: quando precisar gerar ou adaptar asset novo sem destoar do app
- `Data Analytics`: quando a feature precisar de tracking, KPI ou funil
- `Accessibility Specialist`: quando houver fluxo critico, compliance ou maior rigor de UX inclusiva
- `Migration Refactor Specialist`: quando a mudanca for estrutural, incremental ou de legacy
- `Observability SRE`: quando a mudanca tocar monitoramento, logs, tracing, readiness, alerta ou rollback
- `Release Manager`: quando a entrega precisar de release notes, changelog e rollout controlado
- `AI Integration Architect`: quando a task for integrar texto, imagem ou video no app do usuario
- `Prompt Engineer`: quando a qualidade, reproducao ou custo do prompt for parte central da feature
- `Video Integration Specialist`: quando a task envolver video generativo no app
- `Playwright MCP`: quando for importante subir o app, navegar, validar visualmente e tirar screenshots

## Regra de economia de token

- reutilizar `docs/repo-audit/current.md`
- reutilizar `docs/repo-audit/assets.md` para contexto visual
- reutilizar `patterns/ai-integration/` em vez de redesenhar plumbing de IA do zero
- reutilizar MCPs locais de browser automation quando validacao visual real for importante
- abrir `docs/skill-guides/` so sob demanda
- evitar reauditar o repo inteiro sem mudanca relevante
