---
scenario: 26-prompt-engineer
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 520
tokens_out_approx: 1180
time_seconds: 35
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.7
notes: "3-layer build protocol applied, size-adaptive bullet count, JSON schema enforced, cost table included, fallback rules explicit, handoff specified"
---

# Treatment — Reescrever prompt "gerar resumo do dia"

## Diagnóstico

O prompt atual `"resuma isso em 3 bullets"` quebra em 3 dimensões:

1. **Sem instrução, contexto, input e formato separados** — tudo colapsado numa frase
2. **Número fixo (3) independente do tamanho do input** — 50 palavras não sustenta 3 bullets; 5000 palavras merece estratégia de chunking
3. **Sem schema de saída** — o modelo decide formato livre, o código nunca parseia de forma confiável

Seguindo o padrão layering obrigatório (Camada A → B → C):

---

## Prompt Spec — `daily-summary`

### Camada A — Core behavior (mínimo funcional, testar primeiro)

```
Você recebe o registro de texto livre de um usuário sobre o seu dia.
Retorne os pontos mais importantes como uma lista de bullets.

Texto:
{{user_text}}
```

> Testar com 3 entradas reais (texto curto ~50 palavras, médio ~500, longo ~5000). Só avançar se a saída fizer sentido em todos os casos.

---

### Camada B — Estrutura + constraints

```
Você recebe o registro de texto livre de um usuário sobre o seu dia.
Extraia os pontos mais relevantes e retorne SOMENTE JSON válido, sem texto adicional.

Regras:
- Se o texto tiver até 150 palavras: retorne 1 bullet.
- Se o texto tiver entre 151 e 800 palavras: retorne 2 bullets.
- Se o texto tiver mais de 800 palavras: retorne 3 bullets.
- Cada bullet: máximo 25 palavras, tom neutro, sem julgamento.
- Não inventar informação ausente no texto.
- Se o texto estiver vazio ou ininteligível, retorne bullets: [].

Schema de saída:
{
  "bullets": ["string", "string", "string"]
}

Texto:
{{user_text}}
```

> Testar. Validar que JSON é sempre bem formado e que a contagem de bullets respeita as faixas.

---

### Camada C — Lógica avançada + examples + fallback

```
Você recebe o registro de texto livre de um usuário sobre o seu dia.
Extraia os pontos mais relevantes e retorne SOMENTE JSON válido, sem texto adicional.

Regras:
- Se o texto tiver até 150 palavras: retorne 1 bullet.
- Se o texto tiver entre 151 e 800 palavras: retorne 2 bullets.
- Se o texto tiver mais de 800 palavras: retorne 3 bullets.
- Cada bullet: máximo 25 palavras, tom neutro, sem julgamento.
- Não inventar informação ausente no texto.
- Se o texto estiver vazio, ininteligível ou irrelevante, retorne {"bullets": []}.
- Priorize ações concretas e decisões sobre relatos emocionais.

Schema de saída:
{
  "bullets": ["string", "string", "string"]
}

---
Exemplos:

Input: "Hoje acordei cedo, fui ao mercado, comprei frutas e legumes. Almocei em casa. À tarde fiz uma reunião sobre o projeto X e ficou definido que vamos atrasar o deadline para sexta."
Output: {"bullets": ["Compras feitas no mercado (frutas e legumes).", "Reunião do projeto X definiu atraso de deadline para sexta."]}

Input: "Não fiz nada hoje. Fiquei em casa assistindo série."
Output: {"bullets": ["Dia de descanso em casa."]}

---

Texto:
{{user_text}}
```

---

## Prompt Spec (arquivo `prompt-specs/daily-summary.md`)

```markdown
## Campos obrigatórios
- Objetivo: resumir o registro diário do usuário em bullets concisos
- Modalidade: texto
- Contexto mínimo: nenhum (o texto do usuário é o contexto completo)
- Prompt base: ver Camada C acima
- Formato de saída: JSON { "bullets": string[] }
- Riscos/custo: textos longos (5000 palavras ≈ 6500 tokens). Usar modelo barato (haiku/flash). Truncar input em 4000 tokens se custo for crítico.

## Constraints
- Não inventar dados ausentes no input
- Se texto vazio ou ininteligível: retornar bullets vazio, não erro
- Número de bullets é função do tamanho do texto, não parâmetro configurável pelo usuário

## Fallback
- JSON malformado: parsear com regex simples antes de jogar erro
- bullets vazio: exibir "Nenhum ponto registrado hoje." na UI

## Notas de iteração
- v1: prompt único fixo em 3 bullets → inconsistente em textos curtos
- v2: camadas A→B→C com contagem adaptativa por faixa de palavras
```

---

## Custo e modelo recomendado

| Cenário | Tokens input estimados | Modelo sugerido | Custo estimado |
|---|---|---|---|
| 50 palavras | ~65 tokens | `haiku-3` ou `flash-2.0` | < $0.001 |
| 500 palavras | ~650 tokens | `haiku-3` ou `flash-2.0` | < $0.001 |
| 5000 palavras | ~6500 tokens | `haiku-3` com truncagem a 4000t | ~$0.001 |

Truncar input a 4000 tokens no servidor antes de chamar o modelo — resumo dos primeiros 3000 palavras é suficiente para um "resumo do dia".

---

## Handoff

- Integração (hook, service, retry): encaminhar para **AI Integration Architect (skill 25)**
- Testes de regressão no prompt: encaminhar para **QA (skill 05)** com os exemplos da Camada C como fixtures
