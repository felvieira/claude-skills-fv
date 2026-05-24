# Model Routing — O que é Real vs. Sugestão

## Problema

O kit tem `policies/model-routing.md` (regras de tier) e `hooks/scripts/model-routing-hook.mjs` (hook PreToolUse). A impressão é que o routing acontece automaticamente. **Não acontece.** Este doc separa o que é enforcement real do que é sugestão.

---

## O que o hook FAZ (sugestão, não enforcement)

O `model-routing-hook.mjs` roda em `PreToolUse` e emite `additionalContext` — texto que aparece como contexto adicional no prompt do modelo. Ele **não pode** forçar um modelo diferente.

| Trigger | O que o hook faz |
|---|---|
| `EnterPlanMode` | Emite sugestão: "considere `/model opus`" |
| `ExitPlanMode` | Emite sugestão: "considere `/model sonnet`" |
| `Agent` spawn sem `model:` | Detecta keywords no prompt, emite tier recomendado |

O modelo **pode ignorar** a sugestão. O hook não tem como verificar se foi seguida.

## O que é enforcement REAL

O routing real só funciona por **código explícito** que passa `model:` ao spawnar subagents:

```typescript
// ✅ ENFORCEMENT REAL — modelo é forçado aqui
Agent({ subagent_type: "general-purpose", model: "opus",   prompt: "plan auth architecture..." })
Agent({ subagent_type: "general-purpose", model: "sonnet", prompt: "implement login endpoint..." })
Agent({ subagent_type: "general-purpose", model: "haiku",  prompt: "rename variables in 3 files" })

// ❌ SÓ SUGESTÃO — hook sugere, modelo pode ignorar
Agent({ subagent_type: "general-purpose", prompt: "plan auth architecture..." })
// hook detecta "plan" → emite "tier: deep → opus" → modelo talvez siga
```

## Por que a limitação existe

Claude Code expõe o hook lifecycle com estes outputs possíveis:

```json
{ "continue": true }                          // passa através
{ "continue": false, "message": "blocked" }  // bloqueia
{ "continue": true, "hookSpecificOutput": { "additionalContext": "..." } }  // injeta contexto
```

Não existe `{ "override_model": "opus" }`. A API de hooks não tem esse campo. O hook **não pode reescrever o payload da tool call**.

---

## Regra canônica: como fazer routing REAL no kit

### Para orquestradores (skill 09, skill 40, /swarm, /auto)

Sempre passar `model:` explícito ao spawnar Agent:

```typescript
// Tier mapping (seguir policies/model-routing.md)
const TIERS = {
  fast:     "haiku",  // rename, format, boilerplate
  balanced: "sonnet", // impl, docs, QA
  deep:     "opus",   // security, arch, orchestration
};

// Ao spawnar em /swarm ou /auto:
Agent({
  subagent_type: "general-purpose",
  model: TIERS.deep,           // arquitetura e orquestração
  isolation: "worktree",
  prompt: buildSlicePrompt(slice),
});
```

### Para features de produto (route handlers, server actions)

Usar `callLLM({ tier: "balanced" })` do adapter OpenRouter — o tier resolve o modelo via `.env`.

### Para o hook existente

O hook continua útil como **safety net** pra subagents que esquecem de passar `model:`. Ele não garante o tier, mas aumenta a probabilidade de o modelo escolher certo no próximo turno.

---

## Status atual do enforcement no kit

| Componente | Enforcement real? |
|---|---|
| `/swarm` prompts de orquestrador | ⚠️ Parcial — instrui o modelo a usar tiers, mas é texto |
| `model-routing-hook.mjs` | ❌ Apenas sugestão via additionalContext |
| `openrouter/config.ts` (template) | ✅ Real — `tier` resolve `LLM_MODEL_*` do .env hardcoded |
| Agent spawns em skills numeradas | ❌ Maioria não passa `model:` explicitamente |
| Subagents `agents/*.md` | ❌ Não têm campo de model — herdado do parent |

## O que fazer (roadmap)

1. **Short-term (sem code):** instrução em `AGENTS.md` e `policies/skills-vs-agents.md` mandando sempre passar `model:` em Agent() calls
2. **Medium-term:** update nas skills 09, 40, e nos prompts de `/swarm`/`/auto` pra incluir `model:` explícito por fase
3. **Long-term:** o hook poderia **bloquear** (não só sugerir) Agent spawns sem `model:` definido — tradeoff é ser mais rígido e interromper mais vezes

## Referências

- `policies/model-routing.md` — tiers e mapeamento por skill (autoridade sobre O QUE usar)
- `hooks/scripts/model-routing-hook.mjs` — implementação atual (só sugestão)
- `templates/stack-default/openrouter/config.ts` — enforcement real via env var para features de produto
- `skills/09-orchestrator/SKILL.md` — seção "Como spawnar subagents com tier correto"
