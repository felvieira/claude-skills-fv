# Skills vs Agents — Disambiguation Guide

> **Audience:** modelos de agente operando no dev-team-kit-fv. Humanos também.
> **Status:** guia de referência ampla. A regra normativa vive em `policies/skills-vs-agents.md`.

Este guia complementa a policy com **15 cenários reais** lado a lado: prompt do usuário, raciocínio correto, invocação correta. Existe porque a confusão entre `Skill` e `Agent` é o erro mais comum cometido por modelos no kit.

---

## Por que isto existe

Em maio/2026 (v2.2.0), foi observado um erro reprodutível: ao paralelizar 5 vertical slices de frontend, o modelo disparou 5 `Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })` em paralelo. Todos os 5 quebraram com `InputValidationError` porque `04-frontend-integration` é **skill**, não subagent.

A causa raiz é estrutural: o kit usa o mesmo prefixo `dev-team-kit-fv:` para dois universos diferentes (skills numeradas vs subagents kebab-case). Sem disambiguation explícita, modelos confundem.

A v2.2.0 fechou o gap em 3 frentes: doc (policy + este guide), instrução (disclaimers em todas as skills/agents espelhados), e runtime (hook `agent-dispatch-validator` bloqueia chamadas erradas com mensagem acionável).

---

## Modelo Mental em Uma Linha

> **Skill = playbook que entra no contexto atual. Agent = executor que roda num turno isolado.**

Mais formalmente:

| Aspecto | Skill | Agent (subagent) |
|---|---|---|
| Tool de invocação | `Skill` | `Agent` |
| Parâmetro principal | `skill` (nome) | `subagent_type` (nome) |
| Onde executa | Sessão atual | Sub-turno isolado |
| Vê a conversa? | Sim (carrega no contexto) | Não (contexto fresco) |
| Tools disponíveis | Todas da sessão | Definidas no frontmatter do agent |
| Duração | Permanece carregado | Termina e devolve relatório |
| Convenção de nome (kit) | Numerada: `NN-name` (`01-`...`39-`) | Kebab-case: `name` (`code-reviewer`, `debugger`) |
| Localização (kit) | `skills/NN-name/SKILL.md` | `agents/name.md` |

---

## Matriz de Espelhos

Alguns conceitos têm **skill E agent**. Use o adequado pro objetivo:

| Conceito | Skill (playbook) | Agent (executor isolado) |
|---|---|---|
| Orchestration | `09-orchestrator` | `orchestrator` |
| Code review | `11-reviewer` | `code-reviewer` |
| QA / Testing | `05-qa-testing` | `test-engineer` |
| Security | `06-security-review` | `security-auditor` |
| Detective spec | `33-detective-spec` (overview) | `detective-contracts`, `detective-business-rules`, `detective-flows`, `detective-adrs` (fases isoladas) |
| Static analysis | `34-static-analysis` (overview) | `semgrep-scanner`, `semgrep-triager`, `codeql-runner`, `sarif-parsing`, `variant-analysis` (fases) |
| Anti-AI writing | `policies/anti-ai-writing.md` | `anti-ai-writing` |

**Regra de mão única:** se o usuário quer entender/aprender o playbook → skill. Se quer **execução isolada** (review de PR, audit de feature, fase de pipeline) → agent.

---

## 15 Cenários

### Cenário 1 — Paralelizar 5 slices de frontend

**Prompt:** "Tenho 5 slices prontos para paralelizar. Dispara em paralelo."

**Raciocínio:** Cada slice é trabalho de frontend → precisa do playbook da skill `04-frontend-integration`. Mas skills não são despacháveis. Caminho B (worktree + general-purpose).

**Invocação correta:**

```typescript
// Single message, 5 tool calls
for (const slice of slices) Agent({
  subagent_type: "general-purpose",
  isolation: "worktree",
  description: `Slice ${slice.id} — ${slice.title}`,
  prompt: `
PASSO 1 OBRIGATÓRIO: invoque Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })

PASSO 2: implemente ${slice.title}.
Contexto: ${slice.context}
Critérios: ${slice.acceptance.join("; ")}
Output: commits atômicos + resumo ≤200 palavras. Não abrir PR.
  `
});
```

**Errado:** `Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })`

---

### Cenário 2 — Review isolada de um PR

**Prompt:** "Quero review independente do PR #42 sem ocupar contexto."

**Raciocínio:** Review isolada = turno separado → agent. Existe subagent `code-reviewer`.

**Invocação correta:**

```typescript
Agent({
  subagent_type: "dev-team-kit-fv:code-reviewer",
  description: "Review PR #42",
  prompt: "Review the diff at gh pr diff 42. Focus: correctness, security, design."
})
```

---

### Cenário 3 — Carregar playbook QA antes de implementar

**Prompt:** "Antes de começar, carrega o playbook de QA pra eu trabalhar TDD-first."

**Raciocínio:** Carregar playbook na sessão atual = skill.

**Invocação correta:**

```typescript
Skill({ skill: "dev-team-kit-fv:05-qa-testing" })
```

---

### Cenário 4 — "Use o frontend agent"

**Prompt:** "Use o frontend agent."

**Raciocínio:** Ambíguo. Frontend tem **skill** (`04-frontend-integration`), não agent. Duas opções: clarificar OU defaultar pra skill.

**Default razoável:**

```typescript
Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })
// + mensagem opcional ao usuário: "Carreguei a skill 04-frontend-integration. Frontend
//   não tem agent dedicado — playbook fica no contexto atual. Quer despachar em turno
//   isolado via general-purpose+worktree?"
```

---

### Cenário 5 — Comprehensive PR review (4 agentes paralelos)

**Prompt:** "Faça review completo: código, segurança, testes, prosa."

**Raciocínio:** 4 reviews isoladas em paralelo = 4 subagents nativos.

**Invocação correta** (single message, 4 tool calls):

```typescript
Agent({ subagent_type: "dev-team-kit-fv:code-reviewer",    description: "Code",    prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:security-auditor", description: "Sec",     prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:test-engineer",    description: "Tests",   prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:anti-ai-writing",  description: "Prose",   prompt: "..." })
```

---

### Cenário 6 — Detective Spec em codebase legado

**Prompt:** "Engenharia reversa do módulo billing — quero contratos, regras de negócio, fluxos e ADRs."

**Raciocínio:** 4 detectives em paralelo = 4 subagents.

**Invocação correta** (single message, 4 tool calls):

```typescript
Agent({ subagent_type: "dev-team-kit-fv:detective-contracts",       description: "Contracts",  prompt: "src/billing/" })
Agent({ subagent_type: "dev-team-kit-fv:detective-business-rules",  description: "Rules",      prompt: "src/billing/" })
Agent({ subagent_type: "dev-team-kit-fv:detective-flows",           description: "Flows",      prompt: "src/billing/" })
Agent({ subagent_type: "dev-team-kit-fv:detective-adrs",            description: "ADRs",       prompt: "src/billing/" })
```

Se quiser **entender o playbook** antes:

```typescript
Skill({ skill: "dev-team-kit-fv:33-detective-spec" })
```

---

### Cenário 7 — Static analysis pipeline

**Prompt:** "Roda Semgrep + CodeQL no repo todo, triagem dos achados e busca por variantes."

**Raciocínio:** Pipeline de 5 fases isoladas → 5 subagents (alguns sequenciais por dependência).

**Invocação correta** (algumas em paralelo, outras encadeadas):

```typescript
// Fase 1-2 paralelas
Agent({ subagent_type: "dev-team-kit-fv:semgrep-scanner", description: "Scan", prompt: "..." })
Agent({ subagent_type: "dev-team-kit-fv:codeql-runner",   description: "Scan", prompt: "..." })
// Aguardar e então
Agent({ subagent_type: "dev-team-kit-fv:sarif-parsing",   description: "Parse",   prompt: "results in .sarif" })
Agent({ subagent_type: "dev-team-kit-fv:semgrep-triager", description: "Triage",  prompt: "parsed findings" })
Agent({ subagent_type: "dev-team-kit-fv:variant-analysis",description: "Variants",prompt: "confirmed bugs" })
```

---

### Cenário 8 — Feature completa "do prompt ao PR"

**Prompt:** "Implementa social auth, abre PR quando estiver pronto."

**Raciocínio:** Autonomia total = `/swarm`.

**Invocação correta:**

```
/swarm "implementar social auth"
```

Internamente faz PRD → stories → Ralph loop fresh-context → 4-agent review paralelo → self-fix → PR.

---

### Cenário 9 — Bugfix isolado

**Prompt:** "Fix do bug do email vazio em src/auth/validate.ts:42."

**Raciocínio:** 1 task, 1 fix, contexto suficiente = direto, sem paralelizar. Pode usar `debugger` agent.

**Invocação correta:**

```typescript
Agent({
  subagent_type: "dev-team-kit-fv:debugger",
  description: "Bug email vazio",
  prompt: "src/auth/validate.ts:42 — email vazio gera 500 em vez de 400. Investigue e proponha fix mínimo."
})
```

---

### Cenário 10 — Refactor com behavior preservation

**Prompt:** "Refatora src/payments mantendo comportamento."

**Raciocínio:** Tem program canônico (`refactor-safely`).

**Invocação correta:**

```
/run-program refactor-safely target=src/payments
```

(Não confundir: `refactor-safely` é program YAML em `programs/`, não skill nem agent.)

---

### Cenário 11 — Discovery + PRD + Issues

**Prompt:** "Tenho uma ideia vaga de dashboard — preciso refinar e gerar issues."

**Raciocínio:** Pipeline de discovery → `pipeline-discovery` ou skill 09 modo B.

**Invocação correta:**

```
/pipeline-discovery
```

Internamente: `/grill-me` → `/to-prd` → `/to-issues` → `/loop+TDD` → `/ship`.

---

### Cenário 12 — Quero entender como o orquestrador funciona

**Prompt:** "Como funciona o orquestrador? Me explica o pipeline."

**Raciocínio:** Educacional / leitura → carregar **skill** (playbook).

**Invocação correta:**

```typescript
Skill({ skill: "dev-team-kit-fv:09-orchestrator" })
// + opcional: Read docs/skill-guides/orchestrator-playbook.md
```

---

### Cenário 13 — Despachar orquestrador num turno isolado

**Prompt:** "Manda o orquestrador classificar essa task sem encher minha sessão."

**Raciocínio:** Execução isolada → **agent**.

**Invocação correta:**

```typescript
Agent({
  subagent_type: "dev-team-kit-fv:orchestrator",
  description: "Classify task X",
  prompt: "Task: <descrição>. Classifique tipo, defina pipeline mínimo, devolva plano."
})
```

---

### Cenário 14 — Anti-AI writing review de docs novas

**Prompt:** "Revisar a prosa dos docs novos pra ver se tem cara de IA."

**Raciocínio:** Review isolada de prose → agent `anti-ai-writing`.

**Invocação correta:**

```typescript
Agent({
  subagent_type: "dev-team-kit-fv:anti-ai-writing",
  description: "Review prose",
  prompt: "Revise docs/new-feature/*.md procurando os 29 padrões em policies/anti-ai-writing.md."
})
```

Se quiser **reescrever** em vez de só flagar: comando `/humanize`.

---

### Cenário 15 — Carregar skill de paralelização antes de dispatch grande

**Prompt:** "Vou paralelizar 8 slices — quero ter certeza que vou fazer certo."

**Raciocínio:** Carregar playbook de paralelização (skill 40) primeiro, depois aplicar.

**Invocação correta:**

```typescript
Skill({ skill: "dev-team-kit-fv:40-parallel-dispatcher" })
// Depois aplicar Caminho A/B/C conforme decision tree da skill
```

---

## Decision Tree Visual

```
┌─ Pedido envolve "dev-team-kit-fv:X"?
│
├─ X tem prefixo numérico (NN-name)? ─────────────────────┐
│                                                          │
│   ┌─ Carregar playbook na sessão? ─→ Skill({ skill })   │
│   │                                                      │
│   ├─ Despachar em turno isolado? ──→ Caminho B          │
│   │   Agent({                                           │
│   │     subagent_type: "general-purpose",               │
│   │     isolation: "worktree",                          │
│   │     prompt: "PASSO 1: Skill(...); PASSO 2: ..."     │
│   │   })                                                 │
│   │                                                      │
│   └─ N execuções paralelas? ───────→ Caminho B × N      │
│                                                          │
└─ X é kebab-case (sem número)? ─────────────────────────┐
                                                          │
    ┌─ 1 execução isolada? ──────────→ Agent({           │
    │                                    subagent_type: X │
    │                                  })                 │
    │                                                      │
    ├─ N execuções paralelas? ──────→ N × Agent({...})    │
    │   (single message, N tool calls)                    │
    │                                                      │
    └─ Feature "do prompt ao PR"? ──→ /swarm "<feature>"  │
```

---

## Quando o hook bloqueia: como reagir

Se você vir esta mensagem em runtime:

```
❌ "dev-team-kit-fv:04-frontend-integration" não é um subagent_type válido.

Detectado: este nome é uma SKILL (skills/04-frontend-integration/), não um subagent.

Correções possíveis:
  1. Carregar o playbook no contexto atual: Skill({ skill: "..." })
  2. Paralelizar com worktree (cada subagent carrega a skill internamente): ...
```

**Não tente desativar o hook.** Aplique uma das correções sugeridas. O hook está te salvando de `InputValidationError` em produção.

---

## Telemetria

Cada bloqueio é logado em `.bot/agent-dispatch-errors.jsonl`. Audit periódico recomendado:

```bash
# Quantos bloqueios por dia
cat .bot/agent-dispatch-errors.jsonl | jq -r '.ts | split("T")[0]' | sort | uniq -c

# Top subagent_types que confundiram o modelo
cat .bot/agent-dispatch-errors.jsonl | jq -r '.subagent_type' | sort | uniq -c | sort -rn

# Skills que vivem virando "subagent_type errado"
cat .bot/agent-dispatch-errors.jsonl | jq -r 'select(.detected_as=="skill") | .subagent_type' | sort | uniq -c
```

Se a mesma skill aparece muito → considerar criar agent espelho ou reforçar disclaimer.

---

## FAQ rápido

**Q: Posso usar `general-purpose` mencionando a skill no prompt sem `Skill` tool dentro?**
A: Não funciona. O subagent recebe só o texto — não carrega skill automaticamente. O prompt precisa instruir explicitamente `PASSO 1: Skill({...})`.

**Q: O hook bloqueia chamadas de fora do kit (ex: `general-purpose`)?**
A: Não. O hook só age em `subagent_type` que começa com `dev-team-kit-fv:`. Tudo fora do prefixo passa.

**Q: O que acontece se eu apagar uma skill em `skills/` ou um agent em `agents/`?**
A: O hook re-detecta na hora — ele lista os diretórios a cada execução. Sem cache stale.

**Q: Posso forçar o hook a permitir uma skill como subagent_type?**
A: Não tem flag pra isso, e nem deve ter. Se quer paralelizar, use Caminho B. Se quer carregar contexto, use `Skill` tool.

**Q: Como adicionar novo subagent?**
A: Criar `agents/<nome>.md` com frontmatter (name, description, tools, model). Próxima execução do hook já reconhece. Adicionar entrada na tabela do `AGENTS.md`.

**Q: Como adicionar nova skill numerada?**
A: Criar `skills/<NN>-<nome>/SKILL.md` com frontmatter. Próxima execução do hook já reconhece. Adicionar referência em `docs/SKILLS-OVERVIEW.md`.

---

## Referências

- `policies/skills-vs-agents.md` — policy normativa (autoridade)
- `GLOBAL.md` seção "Skills vs Agents (regra crítica)"
- `AGENTS.md` seção "Subagents Despacháveis" — tabela canônica
- `skills/40-parallel-dispatcher/SKILL.md` — playbook de paralelização
- `templates/parallel-slice-prompt.md` — template self-contained
- `hooks/scripts/agent-dispatch-validator.mjs` — hook fail-fast
- `evals/policies/skills-vs-agents/golden.json` — eval cases
- `evals/policies/skills-vs-agents/test-hook.mjs` — smoke test executável
