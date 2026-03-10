# Skill Call Matrix

Matriz curta de quem costuma chamar quem.

## Inicio de trabalho

- `Orchestrator` chama `Repo Auditor` quando faltar contexto confiavel do repo
- `Repo Auditor` pode chamar `Asset Librarian` quando houver identidade visual relevante

## Fluxo visual

- `UI/UX` chama `Asset Librarian` para inventario visual
- `UI/UX` ou `Frontend` chamam `Image Generator` quando precisarem de asset novo
- `Image Generator` deve reutilizar `Asset Librarian` e `Repo Auditor`

## Fluxo de produto

- `PO` chama `Data Analytics` quando a feature precisar de medicao formal
- `Frontend` e `Backend` consomem o plano de eventos definido por `Data Analytics`
- `Orchestrator` chama `AI Integration Architect` quando o app precisar integrar IA
- `AI Integration Architect` chama `Prompt Engineer` quando o prompt for parte critica da feature
- `AI Integration Architect` chama `Video Integration Specialist` quando a modalidade for video
- `Video Integration Specialist` consulta `Prompt Engineer` para prompts cinematograficos

## Fluxo de qualidade

- `UI/UX`, `Frontend` ou `QA` chamam `Accessibility Specialist` quando o fluxo exigir validacao dedicada
- `Deploy` e `Backend` chamam `Observability SRE` quando a operacao precisar de sinais melhores

## Fluxo estrutural

- `Orchestrator` chama `Migration Refactor Specialist` para legacy, upgrades grandes ou rollout incremental
- `Reviewer` pode devolver findings para `Migration Refactor Specialist` quando o risco for estrutural

## Fluxo final

- `Reviewer` aprova
- `Release Manager` prepara release formal quando necessario
- `Deploy` executa a liberacao
