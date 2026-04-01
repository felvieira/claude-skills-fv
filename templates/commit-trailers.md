# Commit Trailers — Template

Trailers preservam decisoes arquiteturais no git history. Adicionar apos a descricao do commit.

## Trailers Disponiveis

| Trailer | Quando usar |
|---------|-------------|
| `Constraint:` | Restricao externa que limitou a solucao |
| `Rejected:` | Alternativa considerada e descartada (formato: `alternativa \| motivo`) |
| `Directive:` | Decisao de design intencional e permanente |
| `Confidence:` | Nivel de certeza (low/medium/high + evidencia) |
| `Scope-risk:` | Risco de impacto em outras areas (low/medium/high + motivo) |
| `Not-tested:` | O que ficou sem teste e por que |

## Regras de Aplicacao

- **Opcional** em commits triviais (typo, rename, formatting, docs simples)
- **Recomendado** em commits com decisao de design ou trade-off
- **Obrigatorio** quando Reviewer identifica trade-off ou risco explicito

## Formato

```
tipo: descricao curta da mudanca

Descricao opcional da implementacao em prosa.

Constraint: restricao que influenciou a decisao
Rejected: alternativa descartada | motivo em uma linha
Directive: decisao de design intencional
Confidence: high | coberto por e2e
Scope-risk: low | mudanca isolada no adapter
Not-tested: cenario X | motivo pelo qual nao foi testado
```

## Exemplo Real

```
feat: add streaming endpoint for AI chat

Implement SSE-based streaming for real-time token delivery.

Constraint: Vercel serverless tem timeout de 30s — chunked response obrigatorio
Rejected: WebSocket | complexidade de infra desproporcional para MVP
Directive: stream via ReadableStream nativo, sem lib extra
Confidence: high | coberto por integration test
Scope-risk: medium | middleware de auth ajustado para streaming
```

## Exemplo Minimo (apenas o que se aplica)

```
fix: resolve race condition in auth token refresh

Constraint: NextAuth nao expoe metodo de refresh manual — necessario workaround via cookies
Confidence: medium | testado manualmente, sem e2e automatizado ainda
Not-tested: refresh em SSR simultaneo | requere mock de request paralelo
```
