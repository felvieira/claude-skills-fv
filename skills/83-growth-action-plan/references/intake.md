# Intake — Template PRODUTO

Pedir que o usuário preencha, ou extrair do que ele já mandou:

```
Nome:
Uma frase do job:
Para quem:
Plataforma (web / iOS / Android):
Modelo atual (free / trial / pago / não sei):
Preço se souber:
O que o usuário deveria conseguir nos primeiros 5 minutos:
Link ou prints se houver:
Restrições (IAP, B2B, offline, etc.):
Métrica que mais dói agora (signup, trial→pago, D7, CAC…):
```

## Se faltar contexto

No máximo 5 perguntas. Se o usuário não responder, assumir e marcar `HIPOTESE` — nunca bloquear o
relatório.

Ordem de prioridade das perguntas:
1. Qual é o job principal?
2. Quem é a persona?
3. O usuário entende o produto quando vê um plano personalizado (A) ou quando cria um artefato (B)?
4. Preço e planos atuais?
5. O que o usuário faz nos primeiros 5 minutos hoje?

Se ainda sobrar espaço: D1/D7 atuais; restrição de loja (iOS IAP vs Stripe).

## Inferência permitida

Tabela completa em `skills/73-saas-conversion-playbook/references/intake.md` (sinal → playbook,
ticket → modelo, só web → sem pre-permission nativa, IA com custo por token → cota no Free).

Não perguntar identidade visual, tom de marca ou stack de frontend. Não muda o plano.
