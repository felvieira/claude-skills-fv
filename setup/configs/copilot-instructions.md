# Dev Team Kit

Este repositorio usa um kit de skills em `.bot/` para desenvolvimento estruturado com 27 especialistas coordenados por um Orquestrador.

## Ordem de Leitura
1. `.bot/GLOBAL.md` — regras universais
2. `.bot/policies/` — regras compartilhadas
3. `.bot/docs/repo-audit/current.md` se existir
4. `.bot/README.md` — documentacao completa
5. `.bot/skills/*/SKILL.md` — especialistas
6. `.bot/docs/skill-guides/` — sob demanda
7. `.bot/patterns/ai-integration/` — para features de IA

## Regras Principais
- Iniciar por Repo Auditor se `.bot/docs/repo-audit/current.md` nao existir
- Reutilizar auditoria antes de reexplorar o repo
- Responder curto por padrao
- Agir primeiro quando houver default seguro
- Nunca pular QA (skill 05), Security (skill 06) e Reviewer (skill 11)
- Handoffs curtos seguindo `.bot/policies/handoffs.md`

## Pipeline Padrao
PO → UI/UX → Backend → Frontend → Motion → Copy → SEO → QA → Security → Reviewer → Deploy
