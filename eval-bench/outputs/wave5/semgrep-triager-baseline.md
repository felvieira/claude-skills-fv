---
scenario: semgrep-triager
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 210
tokens_out_approx: 780
time_seconds: 14
quality_score: 1.75
quality_breakdown:
  specificity: 2
  completeness: 2
  correctness: 3
  actionability: 2
  discipline: 3
pass_fail: n/a
delta_vs_baseline: 0
notes: "Cold answer — generic advice, no SARIF protocol, no decision table, no suppression gate, no fix diffs"
---

# Triagem de Findings Semgrep — Resposta Fria (Baseline)

Com 87 findings, o processo de triagem manual pode ser cansativo. Aqui vai um guia geral:

## Como classificar TP vs FP

Para cada finding, você precisa:

1. **Ler o código-fonte na linha indicada** — abrir o arquivo, olhar o contexto.
2. **Verificar se o input é controlado pelo usuário** — se sim, mais chance de TP.
3. **Verificar se existe sanitização/validação** — se sim, provavelmente FP.

### Categorias

- **True Positive (TP):** vulnerabilidade real. Input externo chega em sink perigoso sem validação.
- **False Positive (FP):** Semgrep errou. Input hardcoded, teste, ou já validado antes.
- **Needs Investigation (NI):** não é claro. Precisa de mais contexto ou de outro desenvolvedor.

## Priorização

Priorize por severidade: `ERROR` > `WARNING` > `INFO`.

Dentro de cada nível, priorize pelo tipo de regra:
- SQL injection, RCE, path traversal, deserialization → alta prioridade
- Secrets hardcoded → alta prioridade
- XSS → média prioridade
- Informacional (logging, style) → baixa prioridade

## Fix sugerido por TP

Para cada TP confirmado:
- SQL injection: use ORM/prepared statements
- XSS: escape output, usar `textContent` em vez de `innerHTML`
- Hardcoded secrets: mover para variáveis de ambiente
- Path traversal: validar/sanitizar path antes de usar

## Supressão de FPs

Se tiver certeza que é FP, adicione:
```
# nosemgrep: <rule-id>
```
com comentário explicando por quê.

## Dica de escala

Para 87 findings, agrupe por `ruleId` — regras com muitos hits costumam ser FP em massa. Resolva as regras, não um finding por vez.

---

*Observação: este processo pode levar algumas horas dependendo da complexidade do código.*
