---
scenario: 30-cost-tracker
pass: treatment
model: claude-opus-4-7
tokens_in_approx: 1450
tokens_out_approx: 1100
time_seconds: 32
quality_score: 4.2
quality_breakdown:
  specificity: 4
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 3
pass_fail: pass
delta_vs_baseline: +1.7
notes: "estrutura formal de relatório, métricas tabuladas, tabela por skill/API, integração com Model Routing e Memory Tiers, plano de tracking persistente em docs/cost-reports/"
---

# Diagnóstico de Custo Anthropic — $1.2k/mês com 4 devs

Você não vai descobrir só olhando o console — vai precisar instrumentar. Aqui está o plano estruturado seguindo o padrão do Cost Tracker.

## Fase 1 — Visibilidade macro (24h)

Anthropic Console → Settings → Usage:

| Quebra disponível | O que olhar |
|---|---|
| Por modelo | % de Opus vs Sonnet vs Haiku (Opus é ~5x mais caro) |
| Por API key | Se cada dev tem key própria, já tem quebra por pessoa |
| Por dia | Picos de consumo (provavelmente loops autônomos) |

**Ação imediata:** se ainda não tem, gere **1 API key por dev** (ou 1 por workspace/projeto). Sem isso, atribuição vira chute.

## Fase 2 — Instrumentação por sessão (1 semana)

Padronizar logging em todas as chamadas:

```python
log_session_cost({
  "dev": os.environ["DEV_NAME"],
  "skill_or_feature": "code-review",   # ou "frontend-integration", "spec", etc.
  "model": response.model,
  "input_tokens": response.usage.input_tokens,
  "output_tokens": response.usage.output_tokens,
  "cache_read_tokens": response.usage.cache_read_input_tokens,
  "external_apis": {"fal_ai": 0, "brave": 0, "firecrawl": 0},
  "duration_s": elapsed,
})
```

Persistir em `docs/cost-reports/session-YYYY-MM-DD-<dev>.md` (mesmo formato pra todos).

## Fase 3 — Relatório consolidado mensal

```markdown
# Relatório de Custo — 2026-05

## Por Dev
| Dev | Tokens in/out | API Calls | Custo Est. |
|---|---|---|---|
| Ana | 1.2M / 380k | 12 fal.ai | $312 |
| Bruno | 850k / 240k | 0 | $198 |
| Carla | 2.1M / 720k | 45 firecrawl | $487 |
| Diego | 480k / 110k | 3 brave | $103 |

## Por Modelo
| Modelo | % do gasto |
|---|---|
| claude-opus-4 | 64% |
| claude-sonnet-4-5 | 31% |
| claude-haiku-4 | 5% |

## Por Feature/Skill
| Skill | Custo Est. | Otimização sugerida |
|---|---|---|
| autonomous-loop | $410 | Cap de iterações + Sonnet default |
| code-review | $180 | Prompt caching |
| image-gen (fal.ai) | $140 | Cache de prompts repetidos |
```

## Fase 4 — Otimização (baseada nos dados)

Suspeitos prováveis no seu caso (4 devs, $1.2k):

1. **Opus como default** — troque pra Sonnet exceto onde Opus é justificável. Corta ~50%.
2. **Sem prompt caching** — em sessões longas, libera 50-70% do input cost.
3. **Loops autônomos sem cap** — agentes Ralph/swarm rodando sem `max_iterations`.
4. **Re-leitura de arquivos** — use graphify ou similar pra evitar re-ler o mesmo arquivo 20x.

## Handoff

- Pasta: `docs/cost-reports/`
- Cadência: relatório semanal por dev + consolidado mensal
- Próximo passo: gerar API keys separadas hoje; instrumentar logging nesta sprint
- Risco: sem instrumentação, você fica preso ao macro do console e nunca vai saber qual feature/skill é o vilão
