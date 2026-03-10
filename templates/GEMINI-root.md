# GEMINI.md

Este repositorio usa um kit de skills em `.bot/` para desenvolvimento estruturado.

As skills em `.bot/skills/*/SKILL.md` seguem o formato YAML frontmatter compativel com Antigravity.

## Ordem de Leitura
1. `.bot/GLOBAL.md`
2. `.bot/policies/`
3. `.bot/docs/repo-audit/current.md` se existir
4. `.bot/README.md`
5. `.bot/skills/*/SKILL.md`
6. `.bot/docs/skill-guides/` sob demanda
7. `.bot/patterns/ai-integration/` para features de IA

## Antigravity Skills
As skills tambem estao disponiveis em `.agent/skills/` para ativacao automatica pelo Antigravity.

## Auditoria Inicial
- se `.bot/docs/repo-audit/current.md` nao existir, iniciar por Repo Auditor
- reutilizar antes de reexplorar o repo
