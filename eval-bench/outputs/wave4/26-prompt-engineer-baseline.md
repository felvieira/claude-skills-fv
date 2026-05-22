---
scenario: 26-prompt-engineer
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 620
time_seconds: 18
quality_score: 2.8
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 2
pass_fail: n/a
delta_vs_baseline: 0
notes: "Generic advice, no structure, missing size-adaptive logic, missing cost analysis, no reusable template"
---

# Baseline — Reescrever prompt "gerar resumo do dia"

## Problema com o prompt atual

`"resuma isso em 3 bullets"` é vago demais:
- Não define o tom (formal, casual?)
- Não diz o que fazer quando o texto tem 50 palavras (3 bullets seria absurdo)
- Não diz o que fazer quando o texto tem 5000 palavras (3 bullets pode ser pouco)
- Sem critério de relevância: o modelo decide o que importa

## Prompt melhorado

```
Você é um assistente que resume diários e registros diários de usuários.

Dado o texto abaixo, gere um resumo estruturado com:
- Até 3 bullets com os pontos mais importantes
- Cada bullet com no máximo 20 palavras
- Tom neutro e objetivo

Se o texto for muito curto (menos de 100 palavras), reduza para 1-2 bullets.

Texto:
{{texto_do_usuario}}
```

## Para tornar reutilizável

1. **Parametrize o número de bullets** — passe como variável, não fixo no prompt
2. **Adicione schema de saída** — se o app precisa parsear, use JSON:

```
Retorne SOMENTE JSON válido:
{
  "bullets": ["...", "..."]
}
```

3. **Trate tamanhos diferentes** — instrua o modelo sobre o que fazer com textos curtos vs. longos

## Custo

- Para textos grandes (5000 palavras ≈ 6500 tokens de entrada), use um modelo mais barato (haiku/flash) ou trunce o input se apenas o resumo importa
- Considere chunking se o texto exceder o contexto do modelo escolhido

## Próximos passos

1. Teste o prompt com 5 entradas reais (curtas, médias, longas)
2. Valide se o JSON é sempre bem formado
3. Adicione um fallback para quando o modelo retornar texto livre em vez de JSON
