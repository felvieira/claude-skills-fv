---
scenario: 38-architecture-deepener
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 3800
tokens_out_approx: 980
time_seconds: 35
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 4
  discipline: 5
pass_fail: pass
delta_vs_baseline: +1.7
notes: "deletion test como ferramenta central, glossario do kit aplicado (module/seam/depth/locality/leverage), fitness functions em YAML canonico runnable, aprofundar vs extrair com criterios distintos, escopo respeitado — nao gerou interfaces nem modificou codigo"
---

# Pass B — Treatment (skill: 38-architecture-deepener)

**Input:** Repo médio (45k linhas TS, 200 arquivos), módulos rasos demais (chamada A→B→C→D só pra passar valor). Como identifico onde aprofundar e onde extrair? Que fitness functions valeria automatizar?

---

## Contexto do problema

Cadeias A→B→C→D que só passam valor são o sintoma clássico de **módulos shallow em série** — cada camada tem interface quase tão complexa quanto sua implementação. Nenhuma gera leverage; a soma não gera locality.

A pergunta dupla é legítima: "aprofundar" e "extrair" são movimentos opostos. Antes de decidir, aplicar o **deletion test** em cada nó suspeito.

---

## Passo 1 — Identificar onde há friccão real

Não comece com métricas. Caminhe pelo codebase fazendo uma pergunta por módulo:

> **Se eu deletar este módulo, a complexidade desaparece ou reaparece espalhada nos callers?**

- **Desaparece** → era pass-through. Colapsar.
- **Reaparece em 1 caller** → mover para dentro desse caller.
- **Reaparece em N callers** → o módulo estava ganhando seu lugar. É seam legítimo — aprofundar, não deletar.

**Sinais de busca em um repo 45k/200 arquivos:**

| Sintoma observável | Suspeita |
|---|---|
| Arquivo com 1 export, corpo = 1 chamada | pass-through claro |
| Módulo cujo nome é o mesmo do caller + "Service/Handler/Manager" | camada nominativa vazia |
| Bugs sempre em "como X é chamado", nunca dentro de X | falta locality — X raso demais |
| Múltiplos callers repetem mesma sequência A→B→C | ordem está exposta ao caller, devia estar escondida |
| Refactor de 1 linha quebra 5 testes | testes acoplados à implementação, não à interface |

---

## Passo 2 — Aprofundar vs. Extrair

**Aprofundar** (deep module): esconder comportamento existente atrás de interface menor.

```
Antes: caller → validate() → transform() → persist() → emit()
Depois: caller → intake(rawData): Result
        # validate + transform + persist + emit ficam dentro
```

Critérios para aprofundar:
- Os nós intermediários não têm outros callers além dessa cadeia
- A ordem entre eles é invariante (sempre mesma sequência)
- Cada nó, individualmente, não tem sentido de ser testado em isolamento

**Extrair** (criar seam novo): quando a cadeia atravessa preocupações heterogêneas.

```
Antes: OrderHandler → PricingCalc → TaxCalc → FraudCheck → Mailer
# Pricing + Tax são domínio financeiro; FraudCheck é risco; Mailer é infra
Depois: OrderHandler → FinancialPolicy.price(order) → RiskPolicy.check(order) → Notifications.send()
```

Critérios para extrair:
- Nós intermediários têm callers independentes em outro contexto
- A responsabilidade tem nome próprio no glossário de domínio
- Trocar a implementação é hipótese real (ex: trocar provedor de email)

**Regra de thumb:** se você consegue nomear o seam com termo do domínio, extrair. Se não consegue, aprofundar.

---

## Passo 3 — Fitness functions para automatizar

Formato canônico do kit (`.harness/fitness-functions.yml`):

```yaml
fitness_functions:

  - id: passthrough-ratio
    description: "Arquivos exportando apenas um símbolo que é somente um wrapper de outro"
    type: structural
    runner: custom-script
    rule: |
      # ts-morph: para cada arquivo, checar se todos exports têm body = single-call
      # ver scripts/check-passthroughs.ts
    fail_threshold: 10   # mais de 10 arquivos assim = regressão
    severity: medium
    applies_to: "src/**/*.ts"

  - id: call-chain-depth
    description: "Profundidade máxima de cadeia antes de lógica aparecer"
    type: structural
    runner: dep-cruiser
    rule:
      forbidden:
        - from: {}
          to: {}
          via:
            maximumNumberOfDependenciesInPath: 4
    fail_threshold: 0
    severity: high
    applies_to: "src/**/*.ts"

  - id: no-domain-logic-in-passthrough
    description: "Módulos com nome de domínio não podem ter zero lógica (linha única de delegação)"
    type: structural
    runner: custom-script
    rule: |
      # grep: arquivos em src/domain/ com < 3 statements no corpo total
    fail_threshold: 0
    severity: high
    applies_to: "src/domain/**/*.ts"

  - id: interface-to-impl-ratio
    description: "Interface exposta ≤ 40% do tamanho da implementação (leverage mínimo)"
    type: structural
    runner: custom-script
    rule: |
      # ts-morph: contar parâmetros públicos vs linhas de implementação
      # alerta se ratio > 0.4 (interface quase tão grande quanto impl)
    fail_threshold: 15   # até 15 módulos com baixo leverage é tolerável em migração
    severity: medium

  - id: caller-knows-sequence
    description: "Caller não deve orquestrar mais de 2 chamadas em sequência para o mesmo módulo"
    type: structural
    runner: custom-script
    rule: |
      # AST: detectar blocos onde caller chama A.x(), A.y(), A.z() em sequência
    fail_threshold: 5
    severity: medium
    applies_to: "src/**/*.ts"
```

**O que NÃO automatizar (agora):**
- "Coesão semântica" — requer entendimento de domínio, não dá pra automatizar de forma confiável
- "Nomeação genérica" — falso positivo alto sem glossário embedado

---

## Processo sugerido para as primeiras 2 semanas

1. **Semana 1 — mapeamento:** rodar `madge --image` + `dep-cruiser` para gerar grafo. Identificar os 5-7 candidatos com maior chain depth. Aplicar deletion test manualmente nos top 5.
2. **Semana 2 — refactor incremental:** escolher 1 candidato, aprofundar via skill 23 (Migration & Refactor) com feature flag. Escrever testes contra a nova interface antes de migrar (skill 37 — TDD).
3. **Depois:** automatizar as fitness functions acima em CI. A partir daí elas previnem regressão.

---

## Regra de fechamento

Se após o deepening o caller ficou mais simples e os testes ficaram mais estáveis, o refactor estava certo. Se o caller ficou igual mas os testes aumentaram, você moveu complexidade — não a removeu.
