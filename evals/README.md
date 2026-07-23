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

## O que estes evals NAO cobrem: boot real do MCP server

Todo caso neste diretorio (`routing/`, `triggers/`, `skills/`, etc.) e uma asserção de
string/keyword sobre o que o roteador RECOMENDA para um prompt dado. Isso e um modo de falha
("recomendou o plugin errado"). Existe um segundo modo de falha, diferente e igualmente real:
"o sistema que recomenda nem sobe" (build quebrado, MCP server crasha no boot, schema de tool
malformado). Nenhum eval aqui detecta isso — todos rodam contra fixtures estaticas, sem spawnar
processo nenhum.

`scripts/verify-mcp-runtime.mjs` cobre esse segundo modo: sobe o MCP server buildado
(`mcp-server/dist/index.js`) como processo real, fala JSON-RPC real via stdio
(`initialize` + `tools/list`) e valida que a resposta traz uma lista de tools não vazia dentro
de 10s. Roda dentro de `scripts/devkit-doctor.mjs` (quando `mcp-server/dist` existe) e no CI
(`.github/workflows/validate.yml`). Ver `policies/plugin-catalog.md` (secao "Validation") para
detalhes.
