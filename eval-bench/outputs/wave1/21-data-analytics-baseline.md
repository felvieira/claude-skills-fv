---
scenario: 21-data-analytics
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 90
tokens_out_approx: 850
time_seconds: 28
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 2
pass_fail: baseline
notes: "generic funnel events, no naming convention, no schema, no governance"
---

# Onboarding — Eventos e nomeação

Para medir ativação, drop-off por step e conversão da nova feature de onboarding, sugiro disparar os seguintes eventos:

## Eventos principais

1. **onboarding_started** — quando o usuário começa o fluxo
2. **onboarding_step_viewed** — toda vez que vê um step (com propriedade `step_name` ou `step_number`)
3. **onboarding_step_completed** — quando completa um step
4. **onboarding_step_abandoned** — quando sai sem completar
5. **onboarding_completed** — quando termina todo o fluxo
6. **onboarding_skipped** — se permitir pular

## Eventos de ativação

Defina o "momento aha" e dispare:
- **user_activated** — quando o usuário atingiu o critério de ativação (ex: criou primeiro projeto, mandou primeira mensagem, etc.)

## Conversão

- **trial_started** ou **subscription_created** — pra medir conversão pra paid se aplicável.

## Convenção de nomeação

Use snake_case, formato `objeto_acao` (ex: `onboarding_started`, não `start_onboarding`). Seja consistente. Sempre adicione contexto via properties em vez de criar eventos novos pra cada variação.

## Propriedades recomendadas

Em todo evento:
- `user_id`
- `timestamp`
- `step_name` (pros eventos de step)
- `step_number`
- `time_on_step` (em segundos)
- `variant` (se tiver A/B test)

## Funil de drop-off

Configure no seu tool de analytics (Amplitude, Mixpanel, PostHog) um funil com a sequência:
1. onboarding_started
2. onboarding_step_completed (step 1)
3. onboarding_step_completed (step 2)
4. ... (cada step)
5. onboarding_completed

Cada degrau mostra drop-off.

## Conversão

Ativação = % de quem completou onboarding e atingiu evento `user_activated` em X dias.
Conversão = % que virou paid.

## Dica

Não disparar duplicado. Use idempotency_key ou debounce no client. E valide os eventos em staging antes do release.
