# Evals

Este diretorio guarda casos versionados para validar o comportamento do kit e evitar regressao em prompts, skills, policies e uso de tools.

## Estrutura
- `core/` para casos de governanca global
- `skills/` para casos por skill ou grupo de skills
- `tool-safety/` para risco, approvals, MCP e prompt injection

## Formato sugerido por caso
- objetivo
- entrada
- comportamento esperado
- evidencias minimas
- risco coberto

## Regra
Ao alterar `GLOBAL.md`, `policies/`, `templates/` ou uma skill relevante, atualize ou adicione casos neste diretorio seguindo `policies/evals.md`.
