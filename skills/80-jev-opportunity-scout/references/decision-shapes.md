# Formatos de Decisão — Qual Primitivo Usar

Tabela derivada de `docs.typesafe.ai/concepts/use-case-map` — usar pra classificar cada candidato encontrado na varredura.

| Formato de decisão | Use quando | Primitivo Jev | Exemplos |
|---|---|---|---|
| **Classificação** | Uma categoria conhecida entre um conjunto fechado deveria "ganhar" | `Choice` | Intenção, tópico, departamento, tipo de risco, tipo de entidade |
| **Detecção** | Precisa da probabilidade de uma característica estar presente | `Noul` | Spam, fraude, urgência, jailbreak, dado sensível exposto |
| **Pontuação** | A resposta cai numa régua ordenada | `Score` | Severidade, relevância, qualidade, frustração, adequação |
| **Roteamento** | Uma categoria seleciona o próximo caminho de código | `Choice` | Roteamento de tool, escalonamento, fila de suporte |
| **Verificação** | Um artefato precisa ser checado contra um modo de falha específico | `Noul` (por checagem) | Citação sustentada, violação de política, erro de tool call |

## Os três primitivos, em detalhe

### Choice
Seleciona **uma** opção de um conjunto definido. Resposta inclui a opção escolhida, probabilidade de cada opção, e confiança (quão concentrada a distribuição está).

```python
"department": Choice(
    instructions="Which team should handle this?",
    criteria={
        "returns": "Exchanges, wrong or damaged items",
        "shipping": "Delivery status, delays, lost packages",
        "billing": "Charges, invoices, payment problems",
    },
)
```

Resposta: `{"choice": "returns", "confidence": 1.0, "probabilities": {"shipping": 0.0, "returns": 1.0, "billing": 0.0}}`

### Noul
Responde uma pergunta sim/não com probabilidade — não confundir com booleano puro. `0.5` significa "tão provável ser sim quanto não", não "média intensidade". Usar um `Noul` por rótulo quando mais de um pode se aplicar ao mesmo tempo (ex.: "é urgente" e "é reembolso" são perguntas independentes, não mutuamente exclusivas).

```python
"refund": Noul(
    instructions="Is the customer asking for money back?",
)
```

Resposta real testada nesta sessão (via OpenRouter): `{"type": "noul", "noul": 0.75}` — 75% de probabilidade de que a condição é verdadeira.

### Score
Posição numa escala ordenada, com pesos descritos em cada nível.

```python
"frustration": Score(
    instructions="How frustrated is this customer?",
    criteria={
        "0": "Calm, neutral tone",
        "1": "Mildly annoyed",
        "2": "Very frustrated, demanding escalation",
    },
)
```

## Regra de composição

Fazer todas as perguntas independentes relevantes na **mesma chamada** — elas rodam em paralelo, o custo de token extra é pequeno comparado a chamadas separadas, e o código descarta as respostas que não precisar. Só vale uma segunda chamada quando a resposta da primeira for necessária pra buscar evidência nova ou montar um `state` diferente.

Fonte: [docs.typesafe.ai/primitives](https://docs.typesafe.ai/primitives), [docs.typesafe.ai/concepts/use-case-map](https://docs.typesafe.ai/concepts/use-case-map).
