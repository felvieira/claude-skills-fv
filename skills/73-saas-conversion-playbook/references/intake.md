# Intake mínimo

Perguntar só o que falta. Máximo 5 perguntas por turno. Se o usuário colar um pitch curto, inferir o resto e marcar HIPOTESE.

## Crítico (sem isso o playbook erra)

1. O usuário “entende o produto” quando vê um plano/diagnóstico personalizado, ou quando cria/gera um artefato?
2. Qual o modelo atual — Free permanente, trial com/sem cartão, hard paywall, usage, ainda não cobra?
3. Web, iOS/Android, ou os dois?
4. Ticket aproximado (mensal em R$ ou USD) e se a compra é solo ou com comitê.
5. Qual ação, se o usuário fizesse na primeira sessão, faria ele voltar amanhã? (candidato a aha)

## Útil (perguntar se sobrar espaço)

- Já existe onboarding? Quantas telas? Dá para pular?
- Quais features estão atrás de paywall hoje?
- Há limite de uso (gerações, projetos, seats, export)?
- Trial quantos dias? Anual existe?
- Canal principal de aquisição (pago, orgânico, PLG viral, sales-assistido)?
- Stack de billing (Stripe, RevenueCat, Pagar.me, iap)?
- Já medem signup, ativação, paywall_view, trial_convert?

## Inferência permitida

| Sinal | Inferir |
|---|---|
| “app de hábitos / dieta / idioma / IA que gera plano” | A |
| “dashboard, workspace, time, projeto, relatório, CRM” | B |
| Preço menor que US$ 20/mês consumer | A, trial curto ou hard após reveal |
| Preço maior que US$ 40/mês B2B | B, reverse trial 14d, chat opcional |
| Só web | sem pre-permission nativa; e-mail no lugar do push |
| Só app store | timeline + restore + pre-permission |
| IA com custo por token | cota no Free + muro no 100% + pack extra |

Não perguntar visual identity, tom de marca ou stack de frontend. Isso não muda o funil.
