# Goal-Driven Execution

> **Define success criteria. Loop until verified.**

Adopted from Andrej Karpathy's observations on LLM coding pitfalls, surfaced by [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills). The pattern was already partially implemented in the kit via skill 37 (TDD Engineer); this policy makes it explicit and binding.

## Why this exists

Weak success criteria ("make it work", "add validation") force the agent into clarification loops mid-execution. Strong criteria let the agent verify autonomously and stop when done.

## The rule

Every non-trivial task must be transformed into a **verifiable goal** before implementation begins.

| Vague task | Goal-driven rewrite |
|---|---|
| "Add validation" | "Write tests for invalid inputs, then make them pass" |
| "Fix the bug" | "Write a test that reproduces it, then make it pass" |
| "Refactor X" | "Ensure existing tests pass before and after" |
| "Make it faster" | "Measure baseline → add bench fixture → optimize → confirm bench shows improvement" |
| "Improve the API" | "Define 3 acceptance criteria as DADO/QUANDO/ENTÃO, then satisfy them" |

## Task contract (schema formal)

> Fonte: [Harness Engineering: Build a Reliable AI Agent in 6 Layers](https://x.com/iiiichigo_chan/status/2093765205276713218) (Birgitta Böckeler, resumo em thread) — conceito absorvido, texto reescrito.

A tabela acima já cobre a reescrita de "vago" pra "verificável", mas nada aqui impunha um formato único e versionável do resultado. Pra tarefa não-trivial que atravessa mais de uma etapa de pipeline (várias skills, um `/loop`, ou handoff pra outro agente), o goal reescrito vira um **objeto de contrato**, não só uma frase — assim quem retoma a tarefa (outra skill, um `/loop` numa iteração seguinte, um handoff) lê os mesmos campos em vez de reinferir o objetivo da prosa anterior:

```yaml
contract_version: 1
goal: <objetivo verificável, uma frase>
inputs: [<arquivo/spec/issue relevante>, ...]
constraints: [<o que não pode mudar — API pública, schema, dependências>, ...]
deliverable: { type: <pr | file | report | fix> }
done_when: [<critério observável 1>, <critério observável 2>, ...]
escalate_when: [<condição que exige parar e perguntar>, ...]
```

`done_when` são os critérios DADO/QUANDO/ENTÃO já produzidos pela skill 01 ou pela reescrita goal-driven — só formalizados como lista, não frase solta. `escalate_when` é novo: condições explícitas que disparam parar-e-perguntar em vez de decidir sozinho (ex: "schema change parece necessária", "mesmo teste falha 3x seguidas", "requisito conflita com regra de produto existente") — sem isso, um agente autônomo tende a inventar uma saída em vez de escalar.

```
☐ Tarefa que atravessa mais de uma etapa (pipeline, /loop, handoff) tem os campos acima
  explícitos em algum lugar consultável — não só "eu sei qual é o objetivo" na cabeça do agente
☐ escalate_when tem pelo menos 1 condição concreta, não fica implícito
☐ done_when é lista de critérios observáveis (testável), não uma frase vaga tipo "funciona bem"
```

Não crie um arquivo de contrato pra toda tarefa — tarefa trivial (ver `## When to skip` abaixo) não precisa. O contrato formal vale quando o goal precisa sobreviver a uma transição de contexto (nova sessão, handoff, iteração de loop) que a conversa atual não vai carregar sozinha.

## Multi-step plans

For tasks with 3+ steps, state the plan with a verifier per step:

```
1. [Action] → verify: [observable check]
2. [Action] → verify: [observable check]
3. [Action] → verify: [observable check]
```

The verifier is what lets the agent loop independently without asking "is this done yet?" at every step.

## How this composes with other policies

- **`policies/verification-before-completion.md`** — every "tests pass" claim needs verifiable output. Goal-driven gives you the goal; verification-before-completion enforces the proof.
- **`policies/anti-rationalization.md`** — prevents "this is good enough" without evidence. Goal-driven gives you the criteria the evidence must match.
- **`skills/37-tdd-engineer/SKILL.md`** — implements goal-driven for new code via red-green-refactor. This policy generalizes to refactor/bugfix/perf/migration.
- **`skills/01-po-feature-spec/SKILL.md`** — DADO/QUANDO/ENTÃO criteria from the PO are the goal. The implementer's job is to satisfy them.

## Anti-patterns

| Anti-pattern | Why it fails |
|---|---|
| "Make it work" as the criterion | Unverifiable. Forces clarification mid-execution. |
| Plan without verifiers per step | Agent can claim each step done without proof. |
| Verifying via "looks correct" | LLMs are confident wrong-answer generators. Need executable verifier. |
| Skipping the goal restatement | Implicit goals drift during long sessions. Always restate explicitly. |

## When to skip

Trivial mechanical tasks (rename a variable, format a file, fix a typo) don't need explicit goals. Use judgment — if you can describe the task in one verb + one noun and there's no ambiguity about success, skip the ceremony.

## Cross-references

- Original framing: [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) — "Karpathy-inspired Claude Code guidelines" by Jiayuan Yu, derived from [Andrej Karpathy's observations](https://x.com/karpathy/status/2015883857489522876)
- Companion principles already in the kit: Think Before Coding (`policies/anti-rationalization.md`), Simplicity First (Senior Dev Override in `GLOBAL.md`), Surgical Changes (`policies/vertical-slices.md`)
