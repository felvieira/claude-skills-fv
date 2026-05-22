---
scenario: 30-cost-tracker
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 80
tokens_out_approx: 720
time_seconds: 18
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: n/a
notes: "resposta genérica de gestão de custo de API, sem framework estruturado nem instrumentação por skill/agent/dev"
---

# Como descobrir quem está gastando o quê na conta da Anthropic

Pra equipe de 4 devs com $1.2k/mês, dá pra atacar isso em camadas:

## 1. Console da Anthropic primeiro

Entre em https://console.anthropic.com → Settings → Usage. Lá você consegue ver:

- Consumo por dia
- Tokens de input/output separados
- Quebra por modelo (Opus, Sonnet, Haiku)

Isso já dá uma noção macro: se 80% é Opus, o gasto provavelmente vem de tarefas grandes ou agentes autônomos.

## 2. Separar por workspace/projeto

Se ainda não fez, crie **Workspaces** distintos no console:
- 1 workspace por dev, OU
- 1 workspace por projeto/produto

Cada workspace tem API key separada e billing isolado. Daí você compara consumo entre eles direto no console.

## 3. Instrumentar no código

Pra granularidade real (qual feature, qual prompt, qual skill consome mais), você precisa logar uso por chamada:

```python
response = client.messages.create(...)
log_usage({
  "dev": os.environ["DEV_NAME"],
  "feature": "code-review",
  "input_tokens": response.usage.input_tokens,
  "output_tokens": response.usage.output_tokens,
  "model": "claude-sonnet-4-5",
  "timestamp": datetime.now(),
})
```

Joga isso num CSV, SQLite, ou Datadog/PostHog. Depois faz pivot por dev, por feature, por modelo.

## 4. Setar alertas de budget

No console da Anthropic você pode configurar limites de gasto por workspace. Bote um teto de ~$400/workspace pra ser avisado antes de estourar.

## 5. Identificar os heavy hitters

Os culpados típicos de gasto alto são:
- Agentes autônomos rodando em loop (Ralph loop, swarm, etc.) sem cap de iteração
- Prompts longos sem prompt caching
- Uso de Opus pra tarefas que Haiku/Sonnet resolveriam
- Re-leitura de arquivos grandes (vibe code que não usa graphify ou similar)

## 6. Próximas ações

1. Verifique se está usando **prompt caching** — pode cortar 50-70% do input cost em sessões longas
2. Force uso de Sonnet/Haiku como default; Opus só quando explicitamente necessário
3. Faça um review mensal: cada dev apresenta seu consumo + justifica

Quer que eu monte um dashboard ou script de tracking?
