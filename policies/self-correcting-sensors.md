# Self-Correcting Sensors — Padrão Canônico

> **Inspiração:** Birgitta Böckeler (Thoughtworks): _"sensors that produce signals optimised for LLM consumption, e.g. custom linter messages that include instructions for the self-correction — a positive kind of prompt injection."_
> Ver `docs/inspiration/harness-engineering.md`.

## Princípio

Todo sensor (hook, validator, linter custom) que emite feedback deve responder estas 3 perguntas:

1. **O que está errado?** (o sintoma)
2. **Por quê?** (a causa raiz, se conhecida)
3. **Como corrigir?** (código pronto pra colar, ou passos explícitos)

Sensor que responde só (1) é menos útil. Sensor que responde (1+2+3) é uma "positive prompt injection" — o LLM lê e sabe exatamente o que fazer.

## Anti-padrão (não fazer)

```
❌ "Found duplication in src/auth.ts"
```

LLM sabe que tem duplicação, mas:
- Onde exatamente? (linha?)
- Com que outro código duplica?
- Como deduplicar? (extrair função? compartilhar tipo?)

**Resultado:** LLM ou pede mais info (waste) ou faz fix errado (waste pior).

## Padrão (fazer)

```
✅ "Found duplication: src/auth.ts:42-58 duplicates logic from src/utils/validation.ts:12-28.

   Suggested fix: extract shared validation to src/utils/validation.ts:
     export function validateEmail(input: string): Result<Email, string> {
       // ...exact lines 42-58 from auth.ts, made parameterizable...
     }

   Then update src/auth.ts:42 to: const result = validateEmail(input);"
```

LLM lê e:
- Sabe onde está o problema
- Sabe por que é problema (duplica X)
- Sabe a forma do fix (assinatura concreta)
- Pode aplicar sem ambiguidade

## Anatomia de um sensor self-correcting

Todo sensor deve retornar `additionalContext` com 4 seções:

```
[SensorName] <Severity> — <one-line summary>

Where:
  - file:line ou file:line-line
  - Multiple locations: ["src/a.ts:10", "src/b.ts:42"]

Why this matters:
  - Concrete consequence if not fixed
  - Reference to policy that requires this (when applicable)

Fix (option A):
  <ready-to-paste code or explicit steps>

Fix (option B, if applicable):
  <alternative — usually less invasive>

References: <policies/X.md OR specific docs>
```

## Auditoria atual (v2.8.0)

Status dos 17 hooks do kit contra este padrão. **Todos os corretivos foram refatorados para o padrão canônico em v2.8.0** — backlog 🟡/🔴 zerado.

| Hook | Self-correcting? | Status |
|---|---|---|
| `agent-dispatch-validator` | ✅ Excelente | Modelo canônico. Bloqueia + fornece 2 opções de fix + código pronto |
| `pre-execution-gate` | ✅ Bom | ENRICH/GUIDED ENRICH instrução vinculante com decision tree |
| `context-guard-stop` | ✅ Bom (v2.8.0) | Formato Where/Why/Fix com listas PRESERVE/DISCARD explícitas + alternative |
| `pre-tool-enforcer` | ✅ Bom (v2.8.0) | Repeated read/search/write — todos com fix options (a/b/c/d) e references |
| `model-routing-hook` | ✅ Bom | "Considere /model X (motivo) — link policy" |
| `intent-classifier` | ✅ Bom | Sugere command + reasoning + confidence |
| `keyword-detector` | ✅ Bom (v2.8.0) | LearnedSkill + SkillDetected explicam HOW to use + skip-conditions |
| `session-start` | ⚪ N/A | Informacional, não corretivo |
| `post-tool-verifier` | ✅ Bom (v2.7.3) | "Save as learned skill" + template YAML pronto-pra-colar + gate de 3 critérios |
| `ai-writing-detector` | ✅ Bom (v2.7.2) | Cada pattern emite `rewrite_hint` com fix pronto; output canônico |
| `constitution-watcher` | ✅ Bom (v2.7.3) | 4 passos numerados (analyze + bump + commit isolado + changelog) |
| `simplify-ignore` | ⚪ N/A | Behavior-only |
| `persistent-mode` | ✅ Bom (v2.8.0) | Block com 3 opções graceful: CONTINUE / ABORT GRACEFULLY / FORCE STOP (com comandos) |
| `stop-savings-summary` | ⚪ N/A | Informacional, não corretivo |
| `session-event-logger` | ⚪ N/A | Telemetria, não emite feedback |
| `verify-integrity` | ⚪ N/A | Setup-time, não runtime |
| `conflict-resolution-reminder` (v2.7.3) | ✅ Bom | Detecta resolução de trade-off + injeta 3 templates de `log-conflict-decision` prontos |

## Refactor backlog — ✅ ZERADO em v2.8.0

Todos os hooks corretivos do kit agora seguem o padrão canônico. O backlog histórico está preservado abaixo apenas para audit trail.

### High impact — ✅ DONE em v2.7.2 / v2.7.3

1. ~~**`ai-writing-detector`**~~ → ✅ v2.7.2 (`bba05da`). Cada pattern ganhou `rewrite_hint` colado no output.
2. ~~**`post-tool-verifier`**~~ → ✅ v2.7.3. Template YAML pronto-pra-colar + gate de 3 critérios para decidir antes de gravar.
3. ~~**`constitution-watcher`**~~ → ✅ v2.7.3. 4 passos numerados (analyze → bump → commit isolado → changelog).

### Medium impact — ✅ DONE em v2.8.0

4. ~~**`context-guard-stop`**~~ → ✅ v2.8.0. Block message com Where/Why + listas PRESERVE/DISCARD + alternative (end session) + references.
5. ~~**`pre-tool-enforcer`**~~ → ✅ v2.8.0. Repeated read (a/b/c/d options), repeated search (a/b/c options), write notice (a/b/c options + skip-if).
6. ~~**`persistent-mode`**~~ → ✅ v2.8.0. Block com 3 opções graceful nomeadas: CONTINUE / ABORT GRACEFULLY (com /pipeline-cancel) / FORCE STOP (com comandos rm bash + PS).
7. ~~**`keyword-detector`**~~ → ✅ v2.8.0. LearnedSkill com source/score/uses + How to use. SkillDetected com Where/Why/How to use (Skill tool) + skip-if (informational).

### Medium impact (legado — preservado para audit)

4. **`context-guard-stop`** — quando sugere `/compact`, dizer o que preservar:
   ```
   "/compact agora. Preserve: foco atual ('<last_prompt>') e arquivos modificados nesta sessão.
    Descarte: exploração inicial, docs já lidos."
   ```

5. **`pre-tool-enforcer`** — quando flagga repeated read, mostrar working-set:
   ```
   "File 'X' read 3x. Working set já tem este conteúdo em .bot/.tool-usage.json.
    Use Read with offset/limit pra ler apenas a parte nova, OU extraia learned-skill."
   ```

6. **`persistent-mode`** — em vez de "delete pipeline-active.json", explicar gracefully:
   ```
   "Pipeline X está ativo (step 3/7). Opções:
    (a) Continue: rode próximo step normalmente.
    (b) Abort gracefully: /pipeline-cancel — salva progresso pra retomar depois.
    (c) Force stop: delete .bot/docs/context/pipeline-active.json (perde progresso)."
   ```

### Low impact

7. **`keyword-detector`** — quando injeta learned skill, prefaciar com "Trigger encontrado: X. Aplique este skill assim: ..."

## Princípios derivados

### Princípio 1 — Citation always
Toda mensagem deve citar a policy ou doc que **explica** por que isso é regra. LLM aprende, futuras sessões precisam de menos contexto.

### Princípio 2 — Code over prose
Quando possível, **mostre código pronto** em vez de descrever em texto. "Use validateEmail()" > "extract a validation function".

### Princípio 3 — Multiple options when there's tradeoff
Se há mais de uma forma legítima de corrigir, **liste opções A/B** com tradeoff explícito. Evita o LLM escolher arbitrariamente.

### Princípio 4 — Severity matters
- **High** = bloquear ação (decision: block)
- **Medium** = warning forte, instrução vinculante via additionalContext
- **Low** = advisory passivo

### Princípio 5 — Don't repeat yourself
Se o mesmo sensor disparou nas últimas 3 ações, **não repita a mensagem inteira** — só lembre brevemente. Telemetria em `.bot/` permite isso.

## Templates

### Template: hook block com fix code

```typescript
process.stdout.write(JSON.stringify({
  decision: "block",
  reason: [
    `[${HOOK_ID}] ${SEVERITY} — ${ONE_LINE_SUMMARY}`,
    ``,
    `Where: ${LOCATION}`,
    ``,
    `Why this matters: ${CONSEQUENCE}`,
    `  (see ${POLICY_REF})`,
    ``,
    `Fix:`,
    FIX_CODE_OR_STEPS,
    ``,
    `Alternative: ${ALTERNATIVE_IF_ANY}`,
  ].join("\n"),
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason }
}));
```

### Template: hook warning (não-bloqueante)

```typescript
process.stdout.write(JSON.stringify({
  continue: true,
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    additionalContext: [
      `[${HOOK_ID}] ⚠ ${ONE_LINE_SUMMARY}`,
      ``,
      `Detected: ${EVIDENCE}`,
      `Consider: ${SUGGESTION}`,
      `Example: ${CODE_EXAMPLE}`,
      `See: ${POLICY_REF}`,
    ].join("\n")
  }
}));
```

## Roadmap

- ✅ v2.7.2 — `ai-writing-detector` com `rewrite_hint` por pattern (`bba05da`)
- ✅ v2.7.3 — `post-tool-verifier` com template YAML + `constitution-watcher` com 4 passos + `conflict-resolution-reminder` novo
- ✅ v2.8.0 — Medium impact zerado (`context-guard-stop`, `pre-tool-enforcer`, `persistent-mode`, `keyword-detector`) + **eval suite** em `evals/policies/self-correcting-sensors/` (8/8 cases verde, idempotente). Plugado no CI via `.github/workflows/validate-plugin.yml`.

A partir daqui o padrão self-correcting é **invariante mantido por eval no CI**. Hooks novos precisam passar pela suite pra entrar.

## Referências

- Birgitta Böckeler, ["Harness engineering for coding agent users"](https://martinfowler.com/articles/exploring-gen-ai/harness-engineering.html)
- `policies/harness-categories.md` — princípio 2 "Self-correcting feedback"
- `hooks/scripts/agent-dispatch-validator.mjs` — modelo canônico
- `policies/skills-vs-agents.md` — exemplo de policy + sensor coerentes
- `docs/inspiration/harness-engineering.md` — audit trail
