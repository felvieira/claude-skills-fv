---
description: Interroga o usuário relentlessly sobre um plano até atingir entendimento mútuo (adaptado de mattpocock/skills)
---

# /grill-me — Interrogatório de Plano

**Objetivo:** Stress-testar uma ideia, design ou plano antes de codificar. Caminha por cada branch da árvore de decisão, resolvendo dependências entre escolhas uma por uma. Recomenda resposta para cada pergunta.

**Quando usar:**
- antes de spec formal, ainda na fase "tenho uma ideia"
- antes de `/spec` quando o briefing parece muito vago
- antes de `/plan` quando o orchestrator vai chutar pipeline
- pré-feature para flush "unknown unknowns"

**Quando NÃO usar:**
- já tem spec aprovada — pula direto para `/plan` ou `/build`
- bug fix localizado
- task mecânica (rename, format, lint fix)

**Skill ativada:** PO (skill 01) em modo Deep Interview, **sempre ativo** (sem ambiguity threshold).

**Inputs:** descrição inicial vaga ou plano em rascunho.

**Output esperado:**
- 10-50 perguntas (uma por vez), cada uma com **resposta recomendada** do agente
- decisões registradas conforme convergem
- pronto para `/to-prd` ao final

**Protocolo (adaptado de mattpocock/skills/productivity/grill-me):**

1. **Uma pergunta por turno.** Não despeja lista de 20 perguntas — quebra fluxo de pensamento.
2. **Para cada pergunta, sugira a resposta** que faz sentido baseado no codebase + conversas anteriores. Usuário aprova/corrige/escolhe alternativa.
3. **Explore o codebase quando a resposta puder ser deduzida dele** — não pergunte "qual framework?" se `package.json` mostra. Use `Read`, `Grep`, ou despache subagent `Explore`.
4. **Caminhe pela árvore de decisão.** Cada decisão pode ramificar — resolva o pai antes do filho.
5. **Pare quando convergir.** Critério: 2 turnos seguidos sem nova ramificação aberta = convergência.

**Heurísticas:**
- comece pelas decisões com **maior impacto downstream** (escolha de stack, modelo de auth, persistência)
- depois decisões de **escopo** (IN / OUT)
- depois decisões de **comportamento de borda** (erros, edge cases, fallbacks)
- por último: detalhes de implementação (nomes, paths exatos)

**Anti-padrão:** "tenho 32 perguntas" — usuário desiste. Uma pergunta, uma resposta, próxima.

**Policies relevantes:**
- `policies/source-driven.md` — recomendações ancoradas em fontes (codebase, docs, ADRs)
- `policies/confusion-management.md` — STOP-NAME-OPTIONS-WAIT se requisito ambíguo
- `policies/writing-clarity.md` — perguntas curtas e diretas

**Handoff:** `/to-prd` para virar PRD, ou `/spec` para spec interna do kit, ou `/plan` se já está pronto para execução.

**Inspiração:** [mattpocock/skills/productivity/grill-me](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me) + AI Hero post.

**Uso:** `/grill-me [descrição da ideia ou link para rascunho]`
