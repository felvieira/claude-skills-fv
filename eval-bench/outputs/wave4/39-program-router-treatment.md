---
scenario: "Usuário disse 'preciso refatorar src/auth/ pra extrair em módulos menores sem quebrar comportamento'. Qual program devo executar e por quê?"
pass: treatment
skill: dev-team-kit-fv:39-program-router
tokens_in_approx: 1400
tokens_out_approx: 520
time_seconds: 35
quality_score: 20
---

# Treatment — com skill 39 (program-router)

## Sinais coletados

- Prompt: "refatorar src/auth/ pra extrair em módulos menores sem quebrar comportamento"
- Palavras-gatilho: "refatorar", "extrair módulos", "sem quebrar comportamento"
- Codebase existente (src/auth/ existe), não greenfield
- Sinal de módulo monolítico a ser desmembrado + preocupação com preservação de comportamento
- Sem hook intent-classifier com suggestion prévia

## Classificação (catálogo v1.8.0)

| Sinal | Match? |
|---|---|
| Constitution força pipeline? | Sem info — não forçar |
| Greenfield "from scratch"? | NÃO — codebase existente |
| Feature nova em projeto existente? | Parcial — mas não é feature nova |
| Ideia vaga < 100 chars? | NÃO — intenção clara |
| PR review? | NÃO |
| Reverse engineering / legacy? | PARCIAL — extração de contratos de módulo existente |
| Autônoma fire-and-forget? | NÃO |

## Decisão: decline → handoff skill 09

Esta task não mapeia limpamente para um único program. O fluxo ideal é composto:

1. **`detective-spec`** — extrai contratos e invariantes de `src/auth/` sem tocar no código
2. **`spec-driven-development`** — usa a spec extraída para guiar a refatoração modular com gates de aceitação

Como dois programs em sequência exigem gate humano entre eles (anti-padrão violado se encadeados sem pausa), a skill 09 (orchestrator) monta este pipeline informal com checkpoint explícito entre as duas fases.

**Alternativa direta:** `/run-program detective-spec --input target=src/auth/` para fase de entendimento. Refatoração executada manualmente após review do spec extraído.

## Opções apresentadas ao usuário

- Rodar `detective-spec` dry-run agora
- Handoff para skill 09 montar pipeline composto
- Cancelar e agir diretamente

## Pontuação (1-5)

| Critério | Score |
|---|---|
| specificity | 5 |
| completeness | 4 |
| correctness | 4 |
| actionability | 4 |
| discipline | 4 |
| **TOTAL** | **21/25** |

## Delta vs Baseline

| Critério | Baseline | Treatment | Delta |
|---|---|---|---|
| specificity | 1 | 5 | +4 |
| completeness | 2 | 4 | +2 |
| correctness | 3 | 4 | +1 |
| actionability | 2 | 4 | +2 |
| discipline | 1 | 4 | +3 |
| **TOTAL** | **9/25** | **21/25** | **+12/25 (+2.4 avg)** |

## Veredicto

PASS (delta avg = +2.4, threshold = +1.5)
