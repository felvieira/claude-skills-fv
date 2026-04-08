# Model Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify model selection rules into a single policy and add enforcement via hook for plan mode and subagent spawning.

**Architecture:** New `policies/model-routing.md` absorbs skill 16 (llm-selector). New `hooks/scripts/model-routing-hook.mjs` intercepts `EnterPlanMode`, `ExitPlanMode`, and `Agent` tools via `PreToolUse`. Existing files updated to reference the new policy. Skill 16 directory deleted.

**Tech Stack:** Node.js (ESM), Claude Code hooks API, Markdown policies

---

### Task 1: Create `policies/model-routing.md`

**Files:**
- Create: `policies/model-routing.md`

- [ ] **Step 1: Create the unified model routing policy**

```markdown
# Model Routing Policy

## Objetivo

Fonte unica de regras para selecao de modelo por tarefa, complexidade e fase de trabalho. Substitui `skills/16-llm-selector` e unifica com enforcement automatico via hooks.

## Tiers

| Tier | Model | Quando usar |
|---|---|---|
| Fast | haiku | boilerplate, rename, microcopy, formatacao, templates, checklist |
| Balanced | sonnet | implementacao, testes, integracao, debug simples, docs, design |
| Deep | opus | arquitetura, security review, debug complexo, orquestracao, decisoes criticas |

## Regra de Ouro: Subagents

Ao spawnar Agent, SEMPRE definir `model` explicitamente. Nunca herdar do parent sem avaliar complexidade.

Exemplos:
```text
Agent(prompt="plan the auth migration architecture", model="opus")
Agent(prompt="implement login endpoint per plan", model="sonnet")
Agent(prompt="rename variables in 3 files", model="haiku")
```

## Regra de Ouro: Plan Mode (Claude Code)

- `EnterPlanMode` → considerar `/model opus`
- `ExitPlanMode` → considerar `/model sonnet`
- Hook sugere automaticamente em Claude Code

## Mapeamento por Skill

| Skills | Tier padrao |
|---|---|
| PO, UI/UX, Backend, Frontend, QA, Documenter, Motion, Copy, Mobile | Balanced |
| Security, Reviewer, Orchestrator | Deep |
| Deploy, Context Manager, SEO | Fast ou Balanced conforme risco |

## Upgrade: Quando Subir de Tier

- Multiplos modulos ou servicos interagindo
- Impacto estrutural de longo prazo
- Seguranca, auth ou dados sensiveis
- Debugging entre camadas
- Dados sensiveis (PII, PCI) → sempre Deep

## Downgrade: Quando Descer de Tier

- Tarefa repetitiva com padrao conhecido
- Ajuste mecanico ou de baixo risco
- Geracao a partir de template existente

## Keywords de Deteccao por Tier

O hook `model-routing-hook.mjs` usa estas keywords para sugerir tier quando um subagent e spawnado sem `model` explicito:

| Keywords no prompt | Tier sugerido |
|---|---|
| plan, architect, design, review security, strategy, migration design | Deep (opus) |
| implement, fix, test, debug, refactor, integrate, build, create | Balanced (sonnet) |
| rename, format, boilerplate, template, checklist, lint, typo | Fast (haiku) |

Na duvida entre dois tiers, escolher o mais alto. O custo de subestimar e maior que o de superestimar.

## Exemplos Praticos

| Tarefa | Tier | Motivo |
|---|---|---|
| Criar migration Prisma simples | Fast | schema mecanico, sem logica |
| Implementar componente com form + validacao | Balanced | estado, validacao, UX |
| Revisar seguranca de auth flow | Deep | risco alto, vulnerabilidades |
| Refatorar modulo com 15 dependencias | Deep | efeito cascata, decisoes estruturais |
| Gerar seed de dados para dev | Fast | template, sem risco |
| Debugging de memory leak em SSR | Deep | multiplas camadas, analise profunda |
| Adicionar campo opcional em form existente | Fast | alteracao mecanica, baixo risco |

## Integracao com Cost Tracker (skill 30)

Subagents com `model` explicito permitem rastreamento preciso de custo por tier. O Cost Tracker usa o tier definido para calcular custo estimado por skill.

## Alcance por Ambiente

| Camada | Claude Code | Outros (Cursor, etc.) |
|---|---|---|
| Policy (este arquivo) | ✅ | ✅ |
| Hook (sugestao ativa) | ✅ | ❌ |
| Subagent model param | ✅ | depende do harness |

Em ambientes sem hooks, seguir estas regras manualmente.
```

- [ ] **Step 2: Commit**

```bash
git add policies/model-routing.md
git commit -m "feat: add model-routing policy — unified model selection rules"
```

---

### Task 2: Create `hooks/scripts/model-routing-hook.mjs`

**Files:**
- Create: `hooks/scripts/model-routing-hook.mjs`
- Read: `hooks/scripts/utils.mjs` (uses `readHookConfig`, `resolveBotPath`)
- Read: `hooks/scripts/pre-tool-enforcer.mjs` (reference for pattern)

- [ ] **Step 1: Create the hook script**

```javascript
#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { readHookConfig, resolveBotPath } from "./utils.mjs";

const PLAN_TOOLS = ["EnterPlanMode", "ExitPlanMode"];
const AGENT_TOOL = "Agent";

const DEEP_KEYWORDS = [
  "plan", "architect", "design", "review security", "strategy",
  "migration design", "security", "audit", "compliance",
];
const FAST_KEYWORDS = [
  "rename", "format", "boilerplate", "template", "checklist",
  "lint", "typo", "placeholder", "microcopy",
];

function getConfig() {
  return readHookConfig("model_routing", {
    suggest_on_plan_mode: true,
    suggest_on_agent_spawn: true,
    min_suggestion_interval_ms: 60000,
    plan_model: "opus",
    exec_model: "sonnet",
    fast_model: "haiku",
  });
}

function getSessionState() {
  try {
    return JSON.parse(readFileSync(resolveBotPath(".hook-session.json"), "utf-8"));
  } catch {
    return {};
  }
}

function saveSessionState(state) {
  mkdirSync(resolveBotPath(), { recursive: true });
  writeFileSync(resolveBotPath(".hook-session.json"), JSON.stringify(state, null, 2));
}

function canSuggest(config) {
  const now = Date.now();
  const session = getSessionState();
  const lastTime = session.last_model_suggestion_ms || 0;
  const interval = config.min_suggestion_interval_ms || 60000;
  if (now - lastTime < interval) return false;
  session.last_model_suggestion_ms = now;
  saveSessionState(session);
  return true;
}

function detectTier(prompt, config) {
  const lower = (prompt || "").toLowerCase();
  for (const kw of DEEP_KEYWORDS) {
    if (lower.includes(kw)) return { tier: "Deep", model: config.plan_model };
  }
  for (const kw of FAST_KEYWORDS) {
    if (lower.includes(kw)) return { tier: "Fast", model: config.fast_model };
  }
  return { tier: "Balanced", model: config.exec_model };
}

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => {
  inputBuffer += chunk;
});

process.stdin.on("end", () => {
  let input = {};
  try {
    input = JSON.parse(inputBuffer);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};
  const config = getConfig();

  // --- EnterPlanMode ---
  if (toolName === "EnterPlanMode" && config.suggest_on_plan_mode) {
    if (canSuggest(config)) {
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: [
            `⚡ Model Routing: Entrando em plan mode.`,
            `   Considere: /model ${config.plan_model} (melhor raciocinio pra arquitetura e decisoes)`,
            `   Volte pra ${config.exec_model} ao sair do plan mode.`,
            `   Ver policies/model-routing.md`,
          ].join("\n"),
        },
      }));
      return;
    }
  }

  // --- ExitPlanMode ---
  if (toolName === "ExitPlanMode" && config.suggest_on_plan_mode) {
    if (canSuggest(config)) {
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: [
            `⚡ Model Routing: Saindo de plan mode.`,
            `   Considere: /model ${config.exec_model} (execucao eficiente com menor custo)`,
            `   Use /model ${config.plan_model} apenas quando precisar planejar novamente.`,
            `   Ver policies/model-routing.md`,
          ].join("\n"),
        },
      }));
      return;
    }
  }

  // --- Agent spawn ---
  if (toolName === AGENT_TOOL && config.suggest_on_agent_spawn) {
    const hasModel = toolInput.model != null && toolInput.model !== "";
    if (!hasModel && canSuggest(config)) {
      const prompt = toolInput.prompt || toolInput.description || "";
      const { tier, model } = detectTier(prompt, config);
      process.stdout.write(JSON.stringify({
        continue: true,
        hookSpecificOutput: {
          additionalContext: [
            `⚡ Model Routing: Subagent sem model explicito.`,
            `   Prompt sugere task ${tier} → recomendado: model: "${model}"`,
            `   Defina model explicitamente ao spawnar Agent.`,
            `   Ver policies/model-routing.md`,
          ].join("\n"),
        },
      }));
      return;
    }
  }

  // --- Pass through ---
  process.stdout.write(JSON.stringify({ continue: true }));
});
```

- [ ] **Step 2: Commit**

```bash
git add hooks/scripts/model-routing-hook.mjs
git commit -m "feat: add model-routing hook — plan mode + agent spawn enforcement"
```

---

### Task 3: Update `hooks/config.json`

**Files:**
- Modify: `hooks/config.json`

- [ ] **Step 1: Add model_routing section**

Add after the `code_exploration` section (after line 20, before the closing `}`):

```json
  "model_routing": {
    "suggest_on_plan_mode": true,
    "suggest_on_agent_spawn": true,
    "min_suggestion_interval_ms": 60000,
    "plan_model": "opus",
    "exec_model": "sonnet",
    "fast_model": "haiku"
  }
```

The full file becomes:

```json
{
  "context_guard": {
    "warn_threshold": 0.60,
    "block_threshold": 0.75,
    "max_blocks_per_session": 2
  },
  "pre_execution_gate": {
    "enrich_threshold": 0.40,
    "block_threshold": 0.70,
    "max_guided_questions": 2
  },
  "keyword_detector": {
    "max_learned_skills_per_session": 3,
    "informational_context_window": 80
  },
  "code_exploration": {
    "suggest_on_tools": ["Read", "Grep", "Glob"],
    "min_suggestions_interval_ms": 30000,
    "env_file": ".bot/.env.tools"
  },
  "model_routing": {
    "suggest_on_plan_mode": true,
    "suggest_on_agent_spawn": true,
    "min_suggestion_interval_ms": 60000,
    "plan_model": "opus",
    "exec_model": "sonnet",
    "fast_model": "haiku"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/config.json
git commit -m "feat: add model_routing section to hooks config"
```

---

### Task 4: Register hook in `hooks/hooks.json`

**Files:**
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Add model-routing-hook to PreToolUse array**

Change the `PreToolUse` array from:

```json
"PreToolUse": [
  "hooks/scripts/pre-tool-enforcer.mjs"
]
```

To:

```json
"PreToolUse": [
  "hooks/scripts/pre-tool-enforcer.mjs",
  "hooks/scripts/model-routing-hook.mjs"
]
```

- [ ] **Step 2: Commit**

```bash
git add hooks/hooks.json
git commit -m "feat: register model-routing-hook in PreToolUse"
```

---

### Task 5: Update `policies/cost-optimization.md`

**Files:**
- Modify: `policies/cost-optimization.md:38-43`

- [ ] **Step 1: Simplify "Selecao de Modelo" section to point to model-routing**

Replace lines 38-43:

```markdown
## Selecao de Modelo (LLM Selector)

- Fast (haiku): rename, boilerplate, microcopy, formatacao
- Balanced (sonnet): implementacao, debug, design, testes
- Deep (opus): arquitetura, security, orquestracao, decisoes complexas
- Nao usar Deep pra tasks que Balanced resolve — custo 5x maior
```

With:

```markdown
## Selecao de Modelo

Ver `policies/model-routing.md` para regras completas de selecao e enforcement.
Resumo: Fast (haiku) < Balanced (sonnet) < Deep (opus). Nao usar Deep pra tasks que Balanced resolve — custo 5x maior.
```

- [ ] **Step 2: Commit**

```bash
git add policies/cost-optimization.md
git commit -m "refactor: simplify model selection in cost-optimization — point to model-routing policy"
```

---

### Task 6: Update `skills/30-cost-tracker/SKILL.md`

**Files:**
- Modify: `skills/30-cost-tracker/SKILL.md:61,93`

- [ ] **Step 1: Update model source reference on line 61**

Replace:

```markdown
| Modelo usado | LLM Selector output | claude-sonnet-4-20250514 |
```

With:

```markdown
| Modelo usado | Model Routing policy | claude-sonnet-4-20250514 |
```

- [ ] **Step 2: Update integration reference on line 93**

Replace:

```markdown
- **LLM Selector (16)**: fornece o nivel de modelo usado, impactando o calculo de custo
```

With:

```markdown
- **Model Routing (policy)**: fornece o tier de modelo usado por skill/subagent, impactando o calculo de custo. Ver `policies/model-routing.md`
```

- [ ] **Step 3: Commit**

```bash
git add skills/30-cost-tracker/SKILL.md
git commit -m "refactor: update cost-tracker refs from llm-selector to model-routing policy"
```

---

### Task 7: Update `policies/hooks.md`

**Files:**
- Modify: `policies/hooks.md` (add section after line 82)

- [ ] **Step 1: Add Model Routing section at the end**

Append after line 82:

```markdown

## Model Routing

Sugerir troca de modelo em dois contextos:

- **Plan mode**: sugerir opus ao entrar (`EnterPlanMode`), sonnet ao sair (`ExitPlanMode`)
- **Agent spawn**: avisar quando subagent nao tem `model` explicito e sugerir tier baseado no prompt (keywords → Deep/Balanced/Fast)

Regras:
- Anti-spam de 60s entre sugestoes (configuravel em `hooks/config.json`)
- Se agente ja definiu `model`, passar silenciosamente
- Sugestao, nao bloqueio — o agente decide

Config em `hooks/config.json` secao `model_routing`.
Ver `policies/model-routing.md` para regras completas de selecao.

Em Claude Code: `model-routing-hook.mjs` faz isso automaticamente.
```

- [ ] **Step 2: Commit**

```bash
git add policies/hooks.md
git commit -m "feat: add Model Routing section to hooks policy"
```

---

### Task 8: Update `GLOBAL.md`

**Files:**
- Modify: `GLOBAL.md:16`

- [ ] **Step 1: Add model-routing reference after code-exploration line**

After line 16 (`Preferir ferramentas de code intelligence...`), add:

```markdown
- Definir `model` explicito ao spawnar subagents — ver `policies/model-routing.md`
```

- [ ] **Step 2: Commit**

```bash
git add GLOBAL.md
git commit -m "feat: add model-routing reference to GLOBAL.md defaults"
```

---

### Task 9: Update `skills/09-orchestrator/SKILL.md`

**Files:**
- Modify: `skills/09-orchestrator/SKILL.md:189`

- [ ] **Step 1: Update LLM Selector reference**

Replace:

```markdown
- consultar `LLM Selector` quando houver trade-off real entre custo, latencia e profundidade
```

With:

```markdown
- consultar `policies/model-routing.md` quando houver trade-off real entre custo, latencia e profundidade
```

- [ ] **Step 2: Commit**

```bash
git add skills/09-orchestrator/SKILL.md
git commit -m "refactor: update orchestrator ref from llm-selector to model-routing policy"
```

---

### Task 10: Update `skills/29-design-intelligence/SKILL.md`

**Files:**
- Modify: `skills/29-design-intelligence/SKILL.md:86-88,109,194`

- [ ] **Step 1: Update all LLM Selector references**

Replace line 86-88:

```markdown
**Selecao de modelo:** delegar para LLM Selector (skill 16)

O LLM Selector escolhe o modelo multimodal adequado para analisar os screenshots. Isso garante que funcione independente do ambiente (Claude, Gemini, GPT, etc).
```

With:

```markdown
**Selecao de modelo:** seguir `policies/model-routing.md`

O Model Routing define o tier adequado para analisar screenshots (tipicamente Deep para analise multimodal). Funciona independente do ambiente.
```

Replace line 109:

```markdown
1. LLM Selector (skill 16) escolhe modelo multimodal
```

With:

```markdown
1. Model Routing (`policies/model-routing.md`) define tier para analise multimodal
```

Replace line 194:

```markdown
- `LLM Selector (16)`: escolhe modelo multimodal para analise de screenshots
```

With:

```markdown
- `Model Routing (policy)`: define tier de modelo para analise de screenshots. Ver `policies/model-routing.md`
```

- [ ] **Step 2: Commit**

```bash
git add skills/29-design-intelligence/SKILL.md
git commit -m "refactor: update design-intelligence refs from llm-selector to model-routing"
```

---

### Task 11: Delete `skills/16-llm-selector/` and `docs/skill-guides/llm-selector.md`

**Files:**
- Delete: `skills/16-llm-selector/SKILL.md`
- Delete: `docs/skill-guides/llm-selector.md`

- [ ] **Step 1: Delete skill 16 directory and old skill guide**

```bash
rm -rf skills/16-llm-selector
rm docs/skill-guides/llm-selector.md
```

- [ ] **Step 2: Commit**

```bash
git add -A skills/16-llm-selector docs/skill-guides/llm-selector.md
git commit -m "refactor: remove llm-selector skill 16 and guide — absorbed by model-routing policy"
```

---

### Task 12: Create `docs/skill-guides/model-routing.md`

**Files:**
- Create: `docs/skill-guides/model-routing.md`

- [ ] **Step 1: Create the skill guide**

```markdown
# Model Routing Guide

> Referencia rapida. Policy completa: `policies/model-routing.md`

## Tiers

| Tier | Model | Usar pra |
|---|---|---|
| Fast | haiku | rename, boilerplate, microcopy, templates |
| Balanced | sonnet | implementacao, debug, testes, design |
| Deep | opus | arquitetura, security, orquestracao |

## Subagents — Sempre definir model

```text
Agent(prompt="plan auth system", model="opus")
Agent(prompt="implement login", model="sonnet")
Agent(prompt="rename vars", model="haiku")
```

## Keywords de Deteccao

| Keywords no prompt | Tier sugerido |
|---|---|
| plan, architect, design, review security, strategy | Deep (opus) |
| implement, fix, test, debug, refactor, integrate | Balanced (sonnet) |
| rename, format, boilerplate, template, checklist | Fast (haiku) |

## Plan Mode

- EnterPlanMode → considere /model opus
- ExitPlanMode → considere /model sonnet
- Hook sugere automaticamente (Claude Code only)

## Upgrade/Downgrade

Subir: multiplos modulos, impacto estrutural, seguranca, debug cross-layer
Descer: tarefa repetitiva, ajuste mecanico, template existente

## Anti-patterns

| Errado | Certo |
|---|---|
| Opus pra renomear variaveis | Haiku — mecanico |
| Sonnet pra planejar migracao de DB | Opus — decisao arquitetural |
| Subagent sem model param | Sempre explicito |
| Ficar em opus apos sair de plan mode | Voltar pra sonnet |
```

- [ ] **Step 2: Commit**

```bash
git add docs/skill-guides/model-routing.md
git commit -m "docs: add model-routing skill guide"
```

---

### Task 13: Update `README.md`

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add model-routing-hook to hook table (after line 69)**

Add new row after the `post-tool-verifier` row:

```markdown
| `model-routing-hook` | PreToolUse | Sugere troca de model em plan mode e valida model em subagent spawns |
```

- [ ] **Step 2: Update flowchart — change LLM Selector 16 reference (line 100)**

Replace:

```markdown
    B --> I[LLM Selector 16 por etapa]
```

With:

```markdown
    B --> I[Model Routing por etapa]
```

- [ ] **Step 3: Update organogram — change S16 node (line 135)**

Replace:

```markdown
    G1 --> S16[16 LLM Selector]
```

With:

```markdown
    G1 --> MR[Model Routing policy]
```

- [ ] **Step 4: Update skills table — change skill 16 row (line 206)**

Replace:

```markdown
| 16 | LLM Selector | recomenda nivel de modelo por etapa |
```

With:

```markdown
| — | Model Routing | selecao de modelo unificada — agora em `policies/model-routing.md` |
```

- [ ] **Step 5: Add Model Routing section after Code Intelligence section (after line 87)**

Insert:

```markdown

## Model Routing — Selecao Automatica de Modelo

O kit inclui policy e hook para selecao inteligente de modelo por fase de trabalho, reduzindo custo sem sacrificar qualidade.

| Tier | Model | Quando |
|---|---|---|
| Fast | haiku | boilerplate, rename, microcopy, templates |
| Balanced | sonnet | implementacao, testes, debug, design |
| Deep | opus | arquitetura, security, orquestracao |

**Enforcement automatico (Claude Code):**
- `EnterPlanMode` → hook sugere `/model opus`
- `ExitPlanMode` → hook sugere `/model sonnet`
- Subagent sem `model` explicito → hook alerta e sugere tier

**Em outros ambientes:** seguir `policies/model-routing.md` manualmente.
```

- [ ] **Step 6: Update Governanca section — add model-routing reference (after line 113)**

Add after the `policies/cost-optimization.md` line:

```markdown
- `policies/model-routing.md` define tiers de modelo, enforcement e integracao com cost-tracker
```

- [ ] **Step 7: Update Timestamp Log (after line 551)**

Add new entry:

```markdown

### 2026-04-08

- unificado model routing em policy unica (`policies/model-routing.md`), absorvendo skill 16 (llm-selector)
- adicionado hook `model-routing-hook.mjs` para enforcement em plan mode e subagent spawns
- atualizadas referencias em cost-tracker, cost-optimization, orchestrator, design-intelligence e hooks policy
```

- [ ] **Step 8: Commit**

```bash
git add README.md
git commit -m "docs: update README with model routing section, hook table, and references"
```

---

### Task 14: Update `docs/skill-guides/design-intelligence.md` references

**Files:**
- Modify: `docs/skill-guides/design-intelligence.md:54,111`

- [ ] **Step 1: Update LLM Selector references**

Replace the heading at line 54:

```markdown
### LLM Selector (skill 16)
```

With:

```markdown
### Model Routing
```

Replace line 111:

```markdown
- LLM Selector: Balanced (5 screenshots)
```

With:

```markdown
- Model Routing: Balanced (5 screenshots)
```

- [ ] **Step 2: Commit**

```bash
git add docs/skill-guides/design-intelligence.md
git commit -m "refactor: update design-intelligence guide refs to model-routing"
```

---

### Task 15: Update MCP server README reference

**Files:**
- Modify: `mcp-server/README.md:83`

- [ ] **Step 1: Update devkit_recommend_model reference**

Replace:

```markdown
| `devkit_recommend_model` | LLM Selector (Fast/Balanced/Deep) |
```

With:

```markdown
| `devkit_recommend_model` | Model Routing (Fast/Balanced/Deep) — ver `policies/model-routing.md` |
```

- [ ] **Step 2: Commit**

```bash
git add mcp-server/README.md
git commit -m "docs: update MCP README ref from llm-selector to model-routing"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All 11 items from spec covered. Additional tasks 9, 10, 14, 15 added for references found in grep that the spec didn't explicitly list (orchestrator, design-intelligence, design-intelligence guide, MCP README).
- [x] **Placeholder scan:** No TBD, TODO, or "similar to" references. All code is complete.
- [x] **Type consistency:** `readHookConfig`, `resolveBotPath`, `getSessionState`, `saveSessionState` used consistently. Config keys (`plan_model`, `exec_model`, `fast_model`) match between hook code and config.json.
- [x] **Cross-reference integrity:** All files that reference "LLM Selector" or "skill 16" are updated. Verified via grep output during planning.
