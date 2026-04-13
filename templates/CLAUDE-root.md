# CLAUDE.md

Este repositorio usa um kit de skills em `.bot/` para orientar agentes de coding.

## Ordem de Leitura
1. `.bot/GLOBAL.md`
2. `.bot/policies/`
3. `.bot/docs/repo-audit/current.md` se existir
4. `.bot/README.md`
5. `.bot/skills/*/SKILL.md`
6. `.bot/docs/skill-guides/` somente sob demanda
7. `.bot/patterns/ai-integration/` quando a task envolver IA

## Auditoria Inicial
- se `.bot/docs/repo-audit/current.md` nao existir, iniciar por `Repo Auditor`
- se existir, reutilizar antes de reexplorar o repo

## CLAUDE.md Inteligente
- se o CLAUDE.md da raiz estiver generico, rodar `CLAUDE.md Generator` (skill 28) apos o Repo Auditor
- a skill faz entrevista guiada e gera um CLAUDE.md especifico para o projeto

## Design Intelligence
- para construir ou melhorar interfaces, rodar `Design Intelligence` (skill 29) antes do UI/UX
- pesquisa concorrentes, analisa tendencias visuais do nicho, gera moodboards e entrega dossie estrategico
- em melhoria de UI existente, pula o PO e vai direto: `Design Intelligence -> UI/UX -> Frontend`

## Slash Commands

Use estes atalhos em vez de lembrar nomes de skills:
- `/spec` — especificar feature | `/plan` — montar pipeline | `/build` — implementar
- `/test` — testar | `/review` — review + security | `/simplify` — refatorar
- `/ship` — release e deploy | `/pipeline` — ciclo completo | `/best` — auditoria de boas práticas
- `/auto` — agente autônomo que executa task completa sem intervenção

## Personas de Review

Para reviews estruturados com output padronizado:
- `.bot/personas/code-reviewer.md` — 5 eixos de review + severity labels
- `.bot/personas/security-auditor.md` — 5 scopes de auditoria + PoC para criticals
- `.bot/personas/test-engineer.md` — 5 tipos de cenário + coverage analysis

## Sessao e Custo
- ao encerrar sessao longa, rodar `Session Summary` (skill 31) para registrar contexto
- `Cost Tracker` (skill 30) gera relatorio de custo quando solicitado
- `Smart Suggestions` (skill 32) sugere proxima acao quando nao souber por onde comecar
