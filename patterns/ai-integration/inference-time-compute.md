# Inference-Time Compute Patterns

**Objetivo:** documentar padrões de orquestração multi-agente / multi-sample que melhoram qualidade de resposta **sem treinar / fine-tunar modelo**. Pague mais compute na hora da inferência, ganhe acurácia em raciocínio crítico.

Inspirado em [algorithmicsuperintelligence/optillm](https://github.com/algorithmicsuperintelligence/optillm). Não rodamos um proxy como o optillm — adotamos os **padrões** dentro do nosso modelo de skills/agentes.

## Quando usar

Inference-time compute é **caro**. Aplique seletivamente em decisões críticas:

| Cenário | Pattern recomendado |
|---|---|
| Decisão arquitetural / ADR | Self-Consistency (k=3–5) |
| Code review de área sensível (auth, payments) | Mixture of Agents |
| Diagnóstico de bug difícil | MoA com perspectivas diferentes (debugger + security + perf) |
| Spec ambígua / brainstorming | Multiple perspectives (n=3) com synthesis |
| Geração rotineira (boilerplate, refactor mecânico) | **Nenhum** — só queima tokens |

## Padrões

### 1. Mixture of Agents (MoA)

**Ideia:** N agentes geram resposta independentemente, um agente "aggregator" sintetiza.

**No nosso kit:**
- Despachar N subagents via `Task` em paralelo (`code-reviewer`, `security-auditor`, `debugger`) com **mesma input**, output diferente por especialidade
- Quem sintetiza: o agente principal (Claude) lê os N outputs e combina

**Quando vale:**
- Review de PR crítico — 1 reviewer humano + 3 subagents com perspectivas (clean code, security, perf)
- Diagnóstico onde causa raiz é incerta — debugger, perf-analyzer e contracts-detective em paralelo

**Custo:** N× tokens do baseline. Justifica em decisões de alto custo de erro.

**Anti-uso:** chat conversacional, exploração rápida.

### 2. Self-Consistency / Majority Voting

**Ideia:** rodar mesmo prompt k vezes (com temperatura > 0), votação na resposta mais frequente.

**No nosso kit:**
- Skills do tipo "decisão binária / multi-classe" (TP vs FP no `semgrep-triager`, severity assignment, complexity estimation) ganham com k=3
- Implementado como loop no próprio Claude OU via `dispatching-parallel-agents` se a decisão é cara

**Quando vale:**
- Triagem de findings de segurança (classificação TP/FP)
- Estimativa de complexidade de task (simple/typical/complex) onde divergência é cara

**Custo:** k× tokens. Geralmente k=3 é sweet spot.

**Anti-uso:** geração de prosa (não dá pra "votar" parágrafos).

### 3. Best-of-N (BoN)

**Ideia:** gerar N candidatos, escolher o melhor por critério explícito.

**No nosso kit:**
- `/loop` em modo `--polish=full` faz uma versão disso (sucessivas passadas)
- Pode ser explícito: gerar 3 versões de PRD, pedir validação contra `policies/prd-validation.md`, ficar com maior score

**Diferença de MoA:** BoN é serial+ranking; MoA é paralelo+synthesis.

### 4. PlanSearch

**Ideia:** antes de gerar código, gerar múltiplos *planos* em linguagem natural; pesquisar/escolher o melhor; só então implementar.

**No nosso kit:**
- Já incorporado no fluxo `/grill-me → /to-prd → /plan → /build`
- Versão "search-style": pedir ao agente para listar 3 abordagens, contrastar, escolher

### 5. System Prompt Learning (SPL)

**Ideia ([Karpathy 2024](https://x.com/karpathy/status/1921368644069765486)):** o modelo acumula *estratégias* de resolução em um system prompt que evolui, não em pesos.

**No nosso kit:**
- Coberto parcialmente por [`policies/memory-tiers.md`](../../policies/memory-tiers.md) (camada Semantic/Procedural)
- Coberto por [`policies/persistence.md`](../../policies/persistence.md) (memory tiers + token budget)
- Concretização: `learned-skills/` no projeto consumidor — playbooks que o agente acumula entre sessões

### 6. Round-Trip Optimization (RTO)

**Ideia:** geração → crítica → regeneração → comparação com original. Ciclo de auto-correção curto.

**No nosso kit:**
- `superpowers:receiving-code-review` faz um passe disso
- `/loop --polish` faz versão automatizada
- `/review` é o round-trip manual

## Combinação de padrões

Os padrões compõem. Exemplo de pipeline pesado para decisão arquitetural crítica:

```
PlanSearch (3 abordagens) 
  → MoA (cada abordagem analisada por 3 especialistas: code, security, perf) 
  → BoN (rankear synthesis por critério da constituição) 
  → RTO (passo final de refinamento)
```

Custo: ~12× baseline. Reserve para decisões de ADR sênior.

## Anti-padrões

- **Aplicar tudo, sempre** — vai queimar API budget sem ganho proporcional
- **Sem critério de ranking explícito** — em BoN/Self-Consistency, ranking arbitrário não converge
- **MoA com agentes que pensam igual** — diversidade de perspectiva é o ponto; 3 cópias do mesmo `code-reviewer` é desperdício
- **Self-Consistency em geração criativa** — não existe "voto majoritário" para prosa; use BoN com critério

## Métricas para validar ROI

- **Acurácia delta** — em tasks com ground truth (triagem de findings: TP/FP correto?)
- **Custo / acurácia ponto** — $ adicional por +1% de acurácia
- **Taxa de retrabalho** — se baseline gera 30% de PRs com bug que retornam em review, e MoA cai pra 10%, o custo extra de inferência compensa o custo humano de re-trabalho

Logar via skill 30 (`cost-tracker`) e skill 20 (`observability-sre`).

## Integração com skills existentes

| Skill | Pattern aplicável |
|---|---|
| 09 — orchestrator | PlanSearch (escolher pipeline) |
| 11 — reviewer | MoA (clean + security + perf) |
| 06 — security review | Self-Consistency em classificação |
| 25 — ai-integration-architect | recomenda quais patterns usar onde |
| 26 — prompt-engineer | desenha os prompts dos agentes do MoA |
| 33 — detective-spec | MoA já implícito (4 detetives paralelos) |
| 34 — static-analysis | Self-Consistency no `semgrep-triager` |

## Não-incorporado do optillm (e por quê)

- **MCTS / R\* / Z3 solver / CoT decoding / Entropy decoding** — requerem acesso a logits ou loop fechado sobre o modelo. Inviável dentro do Claude Code; ficaria como proxy infra.
- **Privacy plugin (PII anonymize)** — preferimos solução em `policies/persistence.md` (não persistir) e gates no `security-auditor`.
- **`readurls` / `web_search`** — já temos `WebFetch` / `WebSearch` nativos.
- **`router` (modernbert classifier)** — nosso `policies/model-routing.md` cobre isso por heurística + skill 09 (orchestrator).

## Referências

- [optillm](https://github.com/algorithmicsuperintelligence/optillm) — proxy com 20+ techniques
- [CePO (Cerebras)](https://github.com/algorithmicsuperintelligence/optillm/tree/main/optillm/cepo) — exemplo de combinação
- [Karpathy on SPL](https://x.com/karpathy/status/1921368644069765486)
- [Self-Consistency (Wang et al, 2022)](https://arxiv.org/abs/2203.11171)
- [Mixture of Agents (Wang et al, 2024)](https://arxiv.org/abs/2406.04692)
