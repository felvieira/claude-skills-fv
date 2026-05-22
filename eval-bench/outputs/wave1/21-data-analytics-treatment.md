---
scenario: 21-data-analytics
pass: treatment
model: claude-opus-4-7
tokens_in_approx: 1450
tokens_out_approx: 1750
time_seconds: 55
quality_score: 4.2
quality_breakdown:
  specificity: 4
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.7
notes: "usou template analytics-plan, definiu owner/KPI, listou riscos e PII, deu handoff estruturado"
---

# Analytics Plan — Onboarding

> Template: `templates/analytics-plan.md`. Antes de instrumentar, preciso confirmar: stack de analytics atual (Amplitude/Mixpanel/PostHog/GA4?), quantos steps tem o fluxo, e qual o criterio de "ativacao" para o produto. Abaixo um plano default que serve de baseline.

## Objetivo da metrica

Medir tres coisas distintas, nao misturar:

1. **Ativacao** — % de usuarios que atingem o "aha moment" em N dias apos signup (proxy de valor entregue)
2. **Drop-off por step** — onde o fluxo perde mais gente (proxy de friccao)
3. **Conversao** — % que avanca para o evento de negocio (trial, paid, primeira acao de valor)

Cada uma vira um KPI separado com owner separado.

## Evento(s) principal(is)

Convencao: `verbo_objeto` em snake_case, passado, sem prefixo de produto (o produto ja eh implicito no workspace). Evitar `track_*`, `log_*`, `event_*` como prefixo.

| Evento | Quando dispara | Owner |
|---|---|---|
| `onboarding_started` | usuario entra no step 1 | PM |
| `onboarding_step_viewed` | render de cada step | PM |
| `onboarding_step_completed` | submit valido do step | PM |
| `onboarding_step_skipped` | clicou em skip (se permitido) | PM |
| `onboarding_abandoned` | fechou tab/navegou pra fora sem completar (dispara via beacon ou via inferencia no backend apos timeout) | Eng |
| `onboarding_completed` | terminou ultimo step com sucesso | PM |
| `activation_reached` | atingiu o criterio de "aha" (def. produto) | PM |
| `conversion_completed` | primeira acao de valor de negocio (trial/paid/checkout) | Growth |

**Nao criar evento novo por step.** Use `step_name` como propriedade. Um evento `onboarding_step_completed` com `step_name: "profile"` eh melhor que `profile_step_completed` — funil fica limpo, schema estavel.

## Propriedades

**Em todo evento (super properties, setadas uma vez):**
- `user_id` (uuid interno, nunca email)
- `anonymous_id` (pre-login, pra alinhar funil com gente que abandonou antes de criar conta)
- `session_id`
- `app_version`, `platform` (web/ios/android)
- `experiment_variant` (se houver A/B)

**Especificas de `onboarding_step_*`:**
- `step_name` (string enumerada: `welcome` | `profile` | `team` | `connect` | `done`)
- `step_index` (1..N — pra ordering em funil)
- `step_total` (denominador — facilita "% steps done")
- `time_on_step_ms` (medido client-side, do enter ao exit)
- `is_optional` (boolean — alguns steps sao skippable)

**Especificas de `onboarding_abandoned`:**
- `last_step_name`
- `last_step_index`
- `reason` (`tab_closed` | `timeout` | `navigated_away`) — quando inferivel

**PII — fora:** nao mandar email, telefone, nome real, IP cru. Se precisar para CRM, mandar via reverse-ETL ja anonimizado/hasheado, nao via evento de tracking.

## Funil

Funil principal (drop-off):
```
onboarding_started
  -> onboarding_step_completed [step_index=1]
  -> onboarding_step_completed [step_index=2]
  -> ... (N steps)
  -> onboarding_completed
  -> activation_reached (dentro de 7d)
  -> conversion_completed (dentro de 30d)
```

Cada salto = uma taxa. Janela: 7d para ativacao, 30d para conversao (ajustar conforme ciclo do produto).

Cohort de leitura: por **data de `onboarding_started`** (nao por data atual), senao o numerador e denominador andam separados.

## KPI/owner

| KPI | Definicao | Owner | Cadencia |
|---|---|---|---|
| Activation rate | `activation_reached / onboarding_started` (janela 7d) | PM | semanal |
| Onboarding completion | `onboarding_completed / onboarding_started` | PM | diaria nos primeiros 14d pos-launch |
| Drop-off por step | `1 - (step_completed[i+1] / step_completed[i])` | PM | semanal |
| Conversion rate | `conversion_completed / onboarding_completed` (janela 30d) | Growth | semanal |

Definir **antes do launch** o valor minimo aceitavel pra cada KPI (ex: activation_rate >= 40%). Sem baseline, nao da pra decidir se a feature funcionou.

## Riscos/Gaps

- **Disparo duplicado** — debouncar client-side ou usar `idempotency_key` (combine `session_id + event_name + step_name`). Sem isso, todas as taxas inflam.
- **Abandono nao capturado** — `beforeunload` nao eh confiavel; complementar com inferencia backend (ultimo evento ha >30min => abandoned).
- **Anonymous-to-known stitching** — se o tracking comeca pre-login, garantir que `identify(user_id)` une `anonymous_id` corretamente. Se nao, funil quebra no signup.
- **PII vazando em propriedades de step** — revisar payload de `profile_step` (form pode mandar email/nome). Sanitizar no client antes do `track()`.
- **Sem baseline pre-launch** — se nao tem onboarding antigo medido, comparar com o que? Definir target absoluto antes (ex: ">=50% completion na semana 1") em vez de delta.
- **Schema drift** — registrar o catalogo em `docs/analytics/events.md` ou no tracking plan da ferramenta. Validar via lint em CI se possivel (PostHog/Amplitude tem schema enforcement).
- **A/B em paralelo** — se houver experimento no onboarding, garantir `experiment_variant` em todo evento ou as taxas misturam variantes.

## Validacao pre-launch

- [ ] Catalogo de eventos revisado por PM + Eng (alinha verbo/objeto, sem PII)
- [ ] QA: cada evento dispara 1x no staging (Inspect Network ou debugger da ferramenta)
- [ ] Funil construido na ferramenta com dados de staging, valida que os 8 eventos aparecem
- [ ] Dashboard publicado com os 4 KPIs e baseline target
- [ ] Owner de cada KPI confirmado e ciente da cadencia de leitura

## Handoff

- **Concluido:** plano de eventos, propriedades, funil, KPIs e riscos definidos
- **Artefatos:** este documento + catalogo em `docs/analytics/events.md` (a criar)
- **Decisoes:** schema `onboarding_step_*` parametrizado por `step_name`, nao um evento por step
- **Pendencias:** confirmar stack de analytics, definir `activation_reached` com PM, baseline target dos KPIs
- **Proximo passo:** Frontend instrumenta eventos client-side, Backend cobre `onboarding_abandoned` por inferencia, Documenter atualiza `docs/analytics/events.md`
