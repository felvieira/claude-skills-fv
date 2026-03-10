# AGENTS.md

## Objetivo
Este repositorio usa um kit de skills em `.bot/` para orientar agentes de coding com contexto persistido, baixo desperdicio de token e handoffs curtos.

## Ordem de Leitura
1. `.bot/GLOBAL.md`
2. `.bot/policies/`
3. `.bot/docs/repo-audit/current.md` se existir
4. `.bot/README.md` ou `README.md`
5. `.bot/skills/*/SKILL.md`
6. `.bot/docs/skill-guides/` somente sob demanda
7. `.bot/patterns/ai-integration/` quando a task envolver integracao de IA no app

## Regra de Auditoria Inicial
- se `.bot/docs/repo-audit/current.md` nao existir, iniciar por `Repo Auditor`
- se existir, reutilizar antes de reexplorar o repo inteiro
- se houver sinais de desatualizacao relevante, atualizar a auditoria antes de continuar

## Sinais de Reauditoria
- mudanca de stack, framework ou tooling principal
- mudanca relevante em assets, branding ou design tokens
- mudanca relevante em testes, deploy ou observabilidade
- reestruturacao grande de pastas ou convencoes
- mudanca relevante em integracoes de IA, providers ou prompts

## Defaults
- responder curto por padrao
- agir primeiro quando houver default seguro
- usar tools com minimo privilegio
- registrar handoff curto e objetivo
