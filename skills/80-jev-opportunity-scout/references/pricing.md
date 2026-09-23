# Preço e Formas de Acesso

## Preço (confirmado, não estimado)

| Item | Valor |
|---|---|
| Preço por input | `$0.042` por milhão de tokens (`$42` por bilhão) |
| Output | Gratuito |
| Rate limit | 250.000 tokens/segundo, 1.200 requests/minuto |
| Contexto | 64k tokens por request (state + todas as perguntas); 32k pra state + a pergunta mais longa isolada |

**Chamada real testada nesta sessão** (via OpenRouter, não a API direta): `input_tokens: 282`, `output_tokens: 20`, `cost: $0.000011844` — uma única pergunta `Noul` sobre um ticket de suporte curto.

## Duas formas de acessar

### 1. API direta da TypeSafe (`api.typesafe.ai`)
**Está em waitlist** — cadastro não é instantâneo, sem prazo garantido de aprovação.

### 2. Via OpenRouter (sem waitlist, usa chave já existente)
Confirmado funcionando nesta sessão. Mesmo formato de request/response da API nativa, só muda a URL e a chave:

```bash
curl https://openrouter.ai/api/v1/systemone \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "jev-latest",
    "state": "...",
    "questions": { "...": { "type": "noul", "instructions": "..." } }
  }'
```

Modelo `jev-latest` resolve para a versão mais recente (testado: `jev-1.13-20260917`). Resposta inclui `usage.cost` calculado pela própria OpenRouter — não precisa calcular manualmente se estiver usando essa rota.

**Cloudflare AI Gateway e Vercel AI Gateway** também servem Jev sem waitlist, mesma lógica de "usa chave do gateway, não da TypeSafe" — não testado nesta sessão, mas documentado como alternativa se OpenRouter não for a stack do projeto.

## Como calcular custo de um candidato

1. Estimar tokens de input do `state` típico (regra grosseira: ~4 caracteres por token em português/inglês).
2. Somar tokens de cada `instructions`/`criteria` da pergunta.
3. Multiplicar o total por `$0.042 / 1_000_000`.
4. Se o candidato tiver volume conhecido (ex.: "10 mil tickets/mês"), multiplicar pelo volume pra custo mensal — sempre reportar esse número junto do candidato, não só "é barato".
