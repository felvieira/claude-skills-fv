---
scenario: 32-smart-suggestions
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 310
time_seconds: 8
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: N/A
notes: "generic prioritization advice; no kit framework; no triage logic; cites no tooling"
---

# Próxima ação que mais agrega valor

Dado o estado atual do repo, a **prioridade mais alta é rodar o security audit** antes de qualquer outra coisa.

## Raciocínio

Uma feature de auth mergeada sem security audit é o cenário de maior risco imediato:

- Auth é superfície de ataque crítica (autenticação, autorização, tokens, sessões)
- Sem o audit, você não sabe se há vulnerabilidades já em produção (ou prestes a chegar se houver deploy)
- A queda de coverage (78% → 71%) pode indicar que caminhos críticos de auth não estão cobertos

## Ação concreta

1. **Rodar o security audit agora** — prioridade 1
   - Foco: validação de inputs, manejo de tokens, permissões, logs de auth
   - Ferramentas: semgrep, CodeQL, ou review manual se não houver automação

2. **Depois do audit limpo:** aumentar coverage de volta acima de 75%
   - As 3 issues abertas podem incluir casos de borda que faltam testes

3. **Issues abertas:** avaliar se alguma bloqueia ou agrava a superfície de auth

## O que NÃO fazer agora

- Não faça deploy enquanto o audit não rodar
- Não mergear novas features sobre código de auth sem revisão

O deploy já está bloqueado para hoje — use esse tempo para fechar o gap de segurança.
