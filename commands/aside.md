---
description: Responde pergunta side sem contaminar task atual nem atualizar memória/tasks (adaptado de affaan-m/ECC)
argument-hint: "<pergunta tangencial>"
---

# /aside — Pergunta Side Sem Contaminar Task

**Objetivo:** Responder pergunta **tangencial** à task atual sem:
- puxar contexto da task pra resposta
- atualizar tasks ativos
- atualizar `.bot/learned-skills/` ou memória persistente
- contaminar próxima ação com o desvio

A task atual fica **intacta** — `/aside` é uma janela isolada.

**Quando usar:**
- "rápido, antes de eu esquecer: como X funciona?" durante uma feature
- "tangentemente: Y é boa prática?" sem querer registrar como decisão do projeto
- pergunta de aprendizado pessoal que **não** deve virar instinct/skill
- evitar o anti-padrão de cada pergunta lateral virar contexto permanente

**Quando NÃO usar:**
- pergunta sobre a task atual — responda direto, contexto é relevante
- decisão arquitetural — esta merece registro (skill 10 documenter)
- bug encontrado — esta deve virar issue (`/to-issues` ou `mcp__ccd_session__spawn_task`)
- algo que vai mudar a task atual — não é aside, é mudança de escopo

**Inputs:**
- `<pergunta tangencial>` (obrigatório)

**Output:**
- resposta isolada à pergunta
- **nenhum** efeito colateral:
  - ❌ não adiciona task
  - ❌ não atualiza `.bot/learned-skills/`
  - ❌ não atualiza memória persistente
  - ❌ não menciona task atual na resposta
  - ❌ não sugere próximo passo da task atual

**Protocolo:**

1. Responder a pergunta direto, no estilo padrão do kit (≤300 tokens default).
2. Citar fontes se relevante (Context7, docs oficiais).
3. **Não** fazer referência à task em andamento.
4. **Não** terminar com "voltando à task atual…" — assume-se que user retoma sozinho.

**Anti-padrões:**

- ❌ "Ótima pergunta! Voltando ao que estávamos fazendo…" — apenas responda e pare
- ❌ Atualizar memória/tasks por "completude" — `/aside` é explícita declaração de isolamento
- ❌ Misturar contexto: "isso me lembra que na sua task atual…" — quebra o isolamento
- ❌ Usar `/aside` pra perguntas grandes — se exige investigação, abre uma sessão própria

**Adaptado de:** [ECC](https://github.com/affaan-m/ECC) `/aside` (MIT). Nosso ganho: integração explícita com `policies/persistence.md` (regras "Não Persistir") e respeitar `context-engineering.md` (hierarquia de contexto preservada).

Cross-refs: `policies/persistence.md`, `policies/context-engineering.md`, skill 08 (context-manager).
