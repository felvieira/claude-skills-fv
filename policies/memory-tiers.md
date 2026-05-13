# Memory Tiers Policy

Hierarquia de 4 tiers de memória do kit, inspirada no modelo de consolidação humana (working → episodic → semantic → procedural).

## Os 4 Tiers

| Tier | Artefato | Lifecycle | Quem gerencia |
|---|---|---|---|
| **Working** | `devkit_working_set`, `.auto/progress.md`, `.auto/plan.md` | Sessão atual | Hook Stop / runner |
| **Episodic** | `devkit_context_pack`, `docs/repo-audit/current.md` | Por sessão ou feature | Hook SessionEnd / skill 31 |
| **Semantic** | `learned-skills/*.md` com score 0-1 | Persiste; decay semanal | Post-tool-verifier hook / skill 30 |
| **Procedural** | `skills/*/SKILL.md`, `programs/`, `templates/` | Permanente; versionado | Skill 35 (Skill Author) |

## Regras de Promoção

### Working → Episodic
Acontece automaticamente ao fechar uma feature, mudar de foco, ou via hooks `Stop`/`SessionEnd`.
- Salvar resumo em `devkit_context_pack` com: foco, decisões, blockers, próximo passo.
- Máximo 500 tokens por entrada.

### Episodic → Semantic
Quando o mesmo padrão, decisão ou solução aparece em ≥ 2 sessões distintas:
- Criar entrada em `learned-skills/<slug>.md` com score inicial 0.5.
- A entrada deve capturar o padrão genérico, não o caso específico.

### Semantic → Procedural
Quando uma learned-skill atinge score ≥ 0.8 e é genérica o suficiente para todo projeto:
- Propor formalização via skill 35 (Skill Author).
- Mover de `learned-skills/` para `skills/NN-name/SKILL.md` ou `templates/`.

## Score e Decay em `learned-skills/`

| Evento | Delta de score |
|---|---|
| Criação | 0.5 |
| Uso confirmado (solução aplicada) | +0.1 |
| Menção sem uso | +0.05 |
| Uma semana sem uso | -0.05 |
| Contradição detectada | -0.2 |
| Score < 0.3 | → mover para `learned-skills/.archive/` |
| Score ≥ 0.8 | → candidato à promoção Procedural |

## Privacy — O que nunca entra em nenhum tier

- API keys, tokens, secrets, senhas
- PII (emails, CPF, cartão, endereços pessoais)
- Payloads completos com dados sensíveis
- Qualquer valor que não possa aparecer num commit público

Ver `policies/persistence.md → Segurança` para a regra completa.

## Token Budget por Tier

| Tier | Budget de injeção no SessionStart |
|---|---|
| Working (current-focus) | Sempre injetar (1–3 linhas) |
| Semantic (learned-skills) | Até 800 tokens (score ≥ 0.5 first) |
| Episodic (context-pack) | Até 700 tokens |
| Procedural (skill-discovery) | Até 500 tokens (truncar após 2000 chars) |
| **Total default** | **2000 tokens** (override: `DEVKIT_SESSION_INJECT_TOKENS`) |

## Referências

- `policies/persistence.md` — o que persistir e quando
- `policies/token-efficiency.md` — custo de tokens e cache
- `hooks/scripts/session-start.mjs` — injeção no SessionStart com budget guard
- `src/stores/` — implementação dos stores de memória no MCP server
- Inspiração: [rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) 4-tier model + decay logic
