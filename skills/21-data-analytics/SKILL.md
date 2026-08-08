---
name: data-analytics
description: |
  Skill para definicao de eventos, naming de tracking, funis, metricas de produto e instrumentacao analitica.
  Use quando precisar medir valor entregue, ativacao, conversao, retencao e comportamento do usuario.
  Trigger em: "tracking", "analytics", "eventos de produto", "funil de conversao", "instrumentar evento", "metrica de produto", "ativacao", "retencao", "naming de evento", "tracking plan", "data analytics", "PostHog", "Amplitude", "Mixpanel".
---

# Data Analytics

Uma feature sem medicao e uma aposta sem placar. Esta skill fecha o gap entre "entregamos" e "funcionou": define o tracking plan, o naming, os funis e as metricas — antes de instrumentar, para nao gerar dados que ninguem consegue ler depois.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/verification-before-completion.md` (evento "instrumentado" exige prova: aparece no debugger/live events da ferramenta) e `policies/stack-flexibility.md`.

### Privacidade e PII

Tracking toca dados de usuario — trate como tal:
- **nunca** logar PII em propriedade de evento (email, nome, CPF, telefone) sem necessidade e base legal
- usar id pseudonimo estavel (user_id hash), nao o email como distinct_id
- respeitar consentimento (LGPD/GDPR): sem consentimento de analytics → nao dispara
- documentar quais eventos carregam quais dados (vira parte do RoPA quando ha DPO)

## Quando Usar

- definir o tracking plan de uma feature nova (eventos + propriedades + funil) antes de codar
- mapear um funil de conversao/ativacao e ligar a uma metrica de sucesso real
- auditar instrumentacao existente (eventos duplicados, naming inconsistente, dados mortos)
- escolher a metrica norte de uma feature (e a contra-metrica que protege contra gaming)

## Quando Nao Usar

- implementar analytics sem criterio de negocio ("trackear tudo" gera ruido caro e ilegivel)
- substituir observabilidade operacional (logs/metricas de sistema → skill 20) — analytics e comportamento de usuario, nao saude de servico
- substituir SEO/atribuicao de marketing (canal, campanha) sem o contexto de produto
- fechar o loop de identidade e dinheiro — GCLID/UTM/transaction_id, reconciliacao com o backend, margem de contribuicao, conversao offline (isso e 59-closed-loop-revenue). Esta skill define **o que** trackear no produto; a 59 garante que o numero bate com a receita real

## Entradas Esperadas

- objetivo de negocio da feature (o que "sucesso" significa em uma frase)
- fluxo do usuario com os pontos de decisao (onde ele avanca, hesita, abandona)
- ferramenta de analytics do projeto (PostHog, Amplitude, Mixpanel, GA4, Segment)

## Saidas Esperadas

- tracking plan tabelado (evento, quando dispara, propriedades, owner)
- naming consistente seguindo a convencao abaixo
- funil definido ligado a metrica norte + contra-metrica
- handoff para Frontend/Backend (instrumentar) e Documenter (registrar o plan)

## Convencao de naming (escolha UMA e seja consistente)

Inconsistencia de naming e o que mais apodrece um projeto de analytics. Padrao recomendado: **`object_action`**, snake_case, verbo no passado.

| Bom | Ruim | Por que |
|---|---|---|
| `signup_completed` | `Completed Signup` / `signupComplete` / `user_signed_up` | object primeiro agrupa eventos relacionados no dashboard; passado = fato ocorrido |
| `checkout_started` | `start_checkout` | consistencia: object_action sempre |
| `subscription_cancelled` | `cancel` | `cancel` o que? sem objeto e ambiguo |

Regras:
- **object_action**, passado, snake_case: `video_played`, `invite_sent`, `payment_failed`
- propriedades tambem snake_case: `plan_tier`, `referral_source`, `error_code`
- **valores** em `lower_snake` ou enum fixo, nao texto livre (`plan_tier: "pro"`, nao `"Pro Plan!!"`)
- nunca renomeie um evento em producao sem migrar — quebra series historicas. Crie `_v2` se precisar.

## Tracking plan — formato

Sempre tabela, sempre com owner e criterio de leitura:

| Evento | Dispara quando | Propriedades | Tipo | Owner |
|---|---|---|---|---|
| `signup_started` | usuario abre o form de cadastro | `referral_source`, `plan_tier` | funnel | PO |
| `signup_completed` | conta criada com sucesso (server-confirmed) | `plan_tier`, `method` (email/google) | funnel, north-star input | PO |
| `activation_reached` | usuario faz a acao "aha" (ex: 1o projeto criado) | `time_to_activate_min` | north-star | PO |

**Dispare no servidor** eventos de dinheiro/conversao (signup, purchase) — client-side perde 5-15% por adblock/erro de rede. Eventos de UI/interacao (clique, hover) podem ser client-side.

## Os 3 tipos de metrica que toda feature precisa

1. **North-star / metrica de sucesso** — a UMA coisa que prova valor (ex: `activation_reached` rate). Sem ela, a feature nao tem placar.
2. **Funil** — a sequencia de steps ate o sucesso, para ver onde vaza:
   ```
   signup_started (100%) → signup_completed (62%) → activation_reached (28%)
                            ↑ -38% aqui            ↑ -34% aqui (maior vazamento)
   ```
   O maior drop e onde investir.
3. **Contra-metrica (guardrail)** — protege contra otimizar a norte gamificando. Ex: se a norte e "signups", a contra e "signup→retencao D7" — nao adianta inflar cadastro com usuario que some.

## Frameworks uteis

- **AARRR (pirate metrics):** Acquisition → Activation → Retention → Revenue → Referral. Bom para mapear o ciclo inteiro.
- **HEART (Google):** Happiness, Engagement, Adoption, Retention, Task success. Bom para features de UX.
- **Ativacao = o "aha moment"**: a acao apos a qual o usuario tende a ficar. Descubra correlacionando retencao com acoes iniciais (ex: "quem adiciona 3 amigos na 1a semana retem 4x mais").

## Anti-padroes frequentes

- **trackear tudo "por garantia"** → 200 eventos, ninguem sabe quais importam, custo alto
- **naming livre** → `Sign Up`, `signup`, `user_signup` coexistindo = impossivel agregar
- **propriedade com alta cardinalidade** (ex: timestamp exato, id unico como propriedade) → estoura limite da ferramenta
- **evento sem owner nem criterio de leitura** → vira dado morto
- **so client-side** em evento de receita → subreporta sistematicamente
- **PII em propriedade** → risco legal + alguns processadores rejeitam

## Evidencia de Conclusao

- tracking plan tabelado com owner por evento
- naming validado contra a convencao (object_action, passado, snake_case)
- funil ligado a norte + contra-metrica definida
- checagem de PII feita (nenhum evento vaza dado sensivel sem base)

## Handoff

- **Frontend (04) / Backend (03)** instrumentam (server-side para conversao)
- **Documenter (10)** registra o tracking plan em doc vivo
- **PO (01)** valida que a norte mede o objetivo de negocio
- Seguir `policies/handoffs.md` e, quando util, `templates/analytics-plan.md`
