---
scenario: detective-business-rules
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 620
time_seconds: 11
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: null
notes: "Cold answer — generic greps, no output template, no confidence scoring, no write-guard, no checkpoint"
---

# Extraindo Regras de Negócio de Sistema Legacy — Baseline

## Processo sugerido

Para extrair regras de negócio espalhadas em código legado com magic numbers, validações distribuídas e transições de estado via if encadeados, eu seguiria estes passos:

### 1. Mapeamento inicial

Faça um levantamento dos 12 arquivos mencionados. Liste todos os arquivos relevantes e entenda superficialmente o que cada um faz:

```bash
grep -rn "DISCOUNT\|discount\|percentage\|rate\|status" src/ --include="*.ts"
```

### 2. Captura de constantes mágicas

Procure por números e strings literais que não têm nome:

```bash
grep -rn "[0-9]\+\.[0-9]\+" src/ | grep -v test
grep -rn "const [A-Z_]\+ = " src/
```

Registre cada constante com seu contexto: onde aparece, qual valor, qual parece ser o significado.

### 3. Extração das validações

Procure por blocos de validação:

```bash
grep -rn "throw\|if.*<\|if.*>\|if.*==\|return false" src/ --include="*.ts"
```

Para cada validação encontrada, documente:
- **Condição**: qual regra dispara
- **Comportamento**: o que acontece
- **Localização**: arquivo:linha

### 4. Mapeamento de transições de status

Para os `if` encadeados de status, trace o fluxo manualmente:

```
status A → (condição X) → status B
status A → (condição Y) → status C
```

Documente cada transição como uma regra explícita.

### 5. Consolidação

Crie um documento `business-rules.md` com as regras extraídas no formato:

```
RN-001: Desconto máximo é 30%
- Evidência: src/pricing.ts:45
- Regra: if (discount > 0.30) discount = 0.30

RN-002: Status "cancelado" não permite desconto
- Evidência: src/orders.ts:112
- Regra: if (order.status === 'cancelled') return 0
```

## Output esperado

- Lista numerada de regras de negócio (RN-001, RN-002...)
- Para cada regra: condição, comportamento, arquivo:linha
- Diagrama de transição de status (texto ou Mermaid)
- Lista de constantes mágicas com significado inferido
- Flag de itens de baixa confiança que precisam validação humana

## Riscos

- Regras podem se contradizer entre arquivos — documente os conflitos
- Magic numbers podem ter significado contextual perdido — marque como "inferido"
- Nem todo `if` é regra de negócio — filtre o que é infra/técnico
