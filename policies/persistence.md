# Persistence Policy

## Objetivo
Persistir apenas o que gera valor entre sessoes.

## Persistir
- foco atual
- decisoes importantes
- trade-offs
- blockers
- dependencias entre frentes
- proximos passos
- status resumido das etapas
- auditoria reutilizavel do repositorio quando houver valor recorrente

## Nao Persistir
- conversa operacional longa
- raciocinio descartado
- exploracao sem resultado
- checklist gigante sem valor futuro
- repeticao de contexto ja estabelecido

## Formato Ideal
Cada item persistido deve caber em 1 a 3 linhas.

## Rotina
- atualizar quando houver mudanca de fase
- atualizar quando houver decisao relevante
- atualizar quando surgir blocker real
- limpar ruido ao trocar de foco

## Auditoria de Repositorio
- quando existir `docs/repo-audit/current.md`, reutilizar esse resumo antes de reexplorar o repo inteiro
- atualizar a auditoria quando stack, convencoes, assets, testes, deploy ou observabilidade mudarem de forma relevante
- em repos que instalarem o kit em `.bot/`, aplicar a mesma regra para `.bot/docs/repo-audit/current.md`

## Segurança — O que nunca persistir

Nunca persistir em `learned-skills/`, `devkit_context_pack`, `devkit_working_set` ou qualquer artefato de memória do kit:

- API keys, tokens, secrets, senhas ou credenciais de qualquer tipo
- PII (nomes, emails, CPF, dados de cartão, endereços pessoais)
- Payloads completos de requests/responses de API com dados sensíveis
- Stack traces com dados de produção que exponham estrutura interna sensível
- Qualquer valor que pertença a `.env`, `.env.local` ou arquivos de segredo

**Regra prática:** se o valor não pode aparecer num commit público, não pode aparecer num artefato de memória.

## Memory Tiers — Hierarquia de Memória

O kit usa 4 tiers de memória, inspirados no modelo humano de consolidação:

| Tier | Artefato no kit | Analogia | Lifecycle |
|---|---|---|---|
| **Working** | `devkit_working_set`, `.auto/progress.md` | Memória de trabalho | Dura a sessão atual |
| **Episodic** | `devkit_context_pack`, `docs/repo-audit/current.md` | "O que aconteceu" | Por sessão/feature |
| **Semantic** | `learned-skills/` com score 0-1 | "O que sei" | Persiste; decai semanalmente |
| **Procedural** | `skills/*/SKILL.md`, `programs/` | "Como fazer" | Permanente; versionado |

**Regras de promoção:**
- Working → Episodic: ao fechar uma feature ou mudar de foco (automático via hooks Stop/SessionEnd)
- Episodic → Semantic: quando o mesmo padrão aparece em ≥2 sessões distintas → criar entrada em `learned-skills/`
- Semantic → Procedural: quando a learned-skill atinge score ≥ 0.8 e é genérica o suficiente para virar skill permanente → propor via skill 35 (Skill Author)

**Decay de score em `learned-skills/`:**
- Score inicial: 0.5 na criação
- Boost: +0.1 a cada uso confirmado
- Decay: -0.05 por semana sem uso
- Archive: score < 0.3 → mover para `.archive/`

## Token Budget na Injeção de Contexto

Ao injetar memória no `SessionStart`, respeitar o orçamento:

- **Default:** 2000 tokens para contexto injetado (learned-skills + focus + skill-discovery)
- **Override:** variável `DEVKIT_SESSION_INJECT_TOKENS=N` no ambiente
- **Prioridade de corte** (se orçamento excedido): cortar nesta ordem:
  1. learned-skills com score mais baixo
  2. repo-audit (injetar só o resumo, não o full)
  3. skill-discovery (truncar após 2000 chars — já implementado no hook)
- **Nunca cortar:** current-focus (1-3 linhas, sempre injetar)
