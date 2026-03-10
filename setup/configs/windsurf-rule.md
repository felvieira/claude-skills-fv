---
trigger: always_on
---

# Dev Team Kit

Este repositorio usa um kit de skills em `.bot/` para desenvolvimento estruturado.

## Ordem de Leitura
1. `.bot/GLOBAL.md` — regras universais
2. `.bot/policies/` — regras compartilhadas
3. `.bot/docs/repo-audit/current.md` se existir
4. `.bot/README.md` — documentacao completa
5. `.bot/skills/*/SKILL.md` — especialistas
6. `.bot/docs/skill-guides/` — sob demanda
7. `.bot/patterns/ai-integration/` — para features de IA

## Auditoria
- se `.bot/docs/repo-audit/current.md` nao existir, iniciar por Repo Auditor
- reutilizar antes de reexplorar o repo

## Defaults
- responder curto por padrao
- agir primeiro quando houver default seguro
- usar tools com minimo privilegio
