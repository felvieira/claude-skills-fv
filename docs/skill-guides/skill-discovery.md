# Skill Discovery — Meta-Skill de Navegação

Este guia é o mapa mental do kit. Quando não souber qual skill usar, comece aqui.

## Decision Tree — Tipo de Task → Skill(s) Sugerida(s)

| Tipo de Task | Caminho Recomendado |
|---|---|
| **Nova feature completa** | `/spec` → `/plan` → `/build` → `/test` → `/review` → `/ship` |
| **Bug / fix** | QA (05) → skill afetada (03/04) → Security (06) → Reviewer (11) |
| **Refactor / simplify** | `/simplify` → QA (05) → Reviewer (11) |
| **Review / deploy** | `/review` → `/ship` |
| **Dúvida / exploração** | Context Manager (08) → Repo Auditor (18) |
| **Melhoria de UI** | Design Intelligence (29) → UI/UX (02) → Frontend (04) → QA (05) |
| **Integração de IA** | AI Integration Architect (25) → Prompt Engineer (26) → Backend (03) |
| **Documentação** | Documenter (10) → Reviewer (11) |
| **Auditoria de boas práticas** | `/best` (Reviewer 11 + Security 06 + QA 05) |
| **Landing page** | Copy (13) → Design Intelligence (29) → UI/UX (02) → Frontend (04) → SEO (14) |
| **Release formal** | Reviewer (11) → Observability (20) → Release Manager (24) → Deploy (07) |
| **Task autônoma** (sem intervenção) | `/auto` — loop completo com circuit breaker |

## Slash Commands — Atalhos Rápidos

| Command | O que faz |
|---|---|
| `/spec` | Especificar feature com critérios de aceitação |
| `/plan` | Classificar task e montar pipeline |
| `/build` | Implementar com stack do projeto |
| `/test` | Escrever e rodar testes |
| `/review` | Review final + security audit |
| `/simplify` | Simplificar e refatorar código |
| `/ship` | Release e deploy |
| `/pipeline` | Pipeline completo end-to-end |
| `/best` | Auditoria de boas práticas, arquitetura, clean code e DRY |
| `/auto` | Agente autônomo — executa task completa sem intervenção |
| `/loop` | Loop subprocess idêntico ao ralph-starter — invoca `auto-loop.mjs` externamente |

## 6 Core Operating Behaviors

Regras universais que todo agente usando este kit deve seguir:

1. **Surface Assumptions** — explicitar suposições antes de agir. Nunca assumir silenciosamente.
2. **Manage Confusion** — ao detectar confusão, usar `policies/confusion-management.md` (STOP-NAME-OPTIONS-WAIT). Não adivinhar.
3. **Push Back When Warranted** — questionar instruções que contradizem policies ativas. O agente não é um executor cego.
4. **Enforce Simplicity** — YAGNI, DRY, mínimo suficiente. Complexidade precisa de justificativa explícita.
5. **Maintain Scope Discipline** — não expandir scope sem confirmação explícita do usuário. Um fix não vira refactor.
6. **Verify Don't Assume** — checar antes de afirmar. Usar `policies/search-first.md` antes de implementar.

## 10 Failure Modes to Avoid

Erros comuns que degradam a qualidade das entregas:

1. **Gerar código sem pesquisar o codebase primeiro** — sempre usar search-first antes de implementar
2. **Ignorar policies ativas** — policies existem por razão, não são opcionais
3. **Adivinhar em vez de perguntar** — usar STOP-NAME-OPTIONS-WAIT quando confuso
4. **Expandir scope sem confirmação** — scope creep é o maior inimigo de entregas rápidas
5. **Pular QA ou Security no pipeline** — nenhuma entrega sai sem validação
6. **Não citar fontes para decisões de framework** — usar `policies/source-driven.md`
7. **Repetir reads desnecessários** — reutilizar working set, repo-audit, current-focus
8. **Aceitar "parece certo" como evidência** — verificar com testes, logs ou ferramentas
9. **Não declarar plano antes de executar multi-step** — emitir plano inline antes de agir
10. **Ignorar sinais de context decay** — após 10+ mensagens, re-read antes de editar

## Integração com Outras Policies

- `policies/search-first.md` — pesquisa obrigatória antes de implementar
- `policies/iterative-retrieval.md` — retrieval progressivo para subagents
- `policies/anti-rationalization.md` — tabelas de racionalizações por skill
- `policies/source-driven.md` — hierarquia de fontes para decisões
- `policies/confusion-management.md` — protocolo STOP-NAME-OPTIONS-WAIT
- `policies/model-routing.md` — modelo certo por fase
- `policies/cost-optimization.md` — economia de tokens
