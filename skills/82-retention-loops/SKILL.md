---
name: retention-loops
description: |
  Diagnostica e desenha retenção de app ou SaaS: por que o usuário volta (ou não) em D1, D7, D30 e
  D90. Audita as 5 táticas que aparecem juntas em apps de alta retenção (personalização que muda o
  canvas, aha rápido, loop de hábito na cadência real do job, comunidade depois do resultado pessoal,
  switching cost ético) e prescreve um movimento por tática com tela, gatilho, copy e evento. Separa
  lock-in ético (ativo que o usuário construiu, export livre) de lock-in hostil.
  Trigger em: "retenção", "retenção baixa", "usuário não volta", "usuário some depois do primeiro
  dia", "D1", "D7", "D30", "churn de uso", "hábito", "loop de hábito", "streak", "deixar o app
  grudento", "por que o usuário volta", "switching cost", "lock-in ético", "comunidade no app",
  "personalização do app", "engajamento recorrente".
allowed-tools: Read, Grep, Glob, Write
metadata:
  argument-hint: "<produto ou URL> [--cadencia=diaria|semanal|episodica] [--d1=x --d7=y --d30=z]"
  version: "1.0.0"
---

# Retention Loops — Por Que o Usuário Volta

Retenção alta não é lembrar o usuário de voltar. É o produto ser o jeito mais barato de obter um
resultado que já importa pra ele, na cadência em que esse resultado importa. As cinco táticas abaixo
aparecem juntas nos apps que retêm; uma isolada quase nunca basta, e a ordem importa.

## Governança Global

Segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/source-driven.md` e
`policies/evals.md`. Hipótese sem dado do produto recebe o rótulo `HIPOTESE`. Exemplo de app externo
(Duolingo, Strava, Oura) entra como `ANALOGIA`, nunca como prova para o produto do usuário.

**Fronteira com skills vizinhas:**
- `73-saas-conversion-playbook` cuida de ativação e trial→pago. Esta skill começa onde aquela
  termina: o usuário ativou (ou pagou) e agora precisa voltar. O evento de ativação é o mesmo nas
  duas; não redefinir aqui
- `02-ui-ux-design` (`references/session-psychology.md`) cuida de como **uma sessão** é sentida.
  Esta skill cuida do **retorno ao longo de semanas**
- `57-mobile-ux-foundations` cuida de permissão de push e onboarding mobile. Push não é produto:
  esta skill decide o loop; a 57 decide como pedir a permissão
- `21-data-analytics` é dona da taxonomia de eventos; esta skill nomeia os eventos de retenção e
  entrega para lá
- `61-content-growth-engine` traz o usuário certo; distribuição sem loop de retenção enche balde
  furado

## Quando Usar

- D1/D7/D30 abaixo do esperado, ou "o usuário usa uma vez e some"
- desenhar o sistema de retorno de um produto novo antes do lançamento
- decidir se streak, score diário, comunidade ou notificação fazem sentido para este produto
- revisar se o switching cost atual é ético ou hostil

## Quando Não Usar

- ativação e conversão para pago (onboarding, paywall, trial) — skill 73
- churn de assinatura por cobrança (dunning, cancel-save) — skill 73, seção de lifecycle
- a sensação de uma única tela ou sessão — skill 02, `references/session-psychology.md`
- implementação técnica de push/notificação — skills 57 e 04

## Entradas Esperadas

- produto: o que faz, para quem, plataforma
- o resultado que o usuário busca de novo e com que frequência ele surge na vida real
- dados de retenção se existirem (D1/D7/D30, curva de coorte) e o evento usado para medir
- o que existe hoje de personalização, notificação, hábito, comunidade e histórico

Faltando dado, assumir e marcar `HIPOTESE`. No máximo 5 perguntas; não bloquear o diagnóstico.

## Saídas Esperadas

- loop nomeado + cadência real do job
- aha localizado e TTV esperado
- tabela das 5 táticas: estado atual → movimento → tela → gatilho → evento
- evento de retenção (nunca "abriu o app") e scorecard D1/D7/D30/D90
- plano de 4 semanas, uma tática por semana, aha primeiro
- lista do que não fazer neste produto e por quê

## Fluxo Obrigatório

1. **Nomear o loop.** Qual resultado o usuário busca de novo e em que cadência: diária (sono,
   finanças do dia, idioma), semanal (relatório, treino longo, planejamento) ou episódica (viagem,
   declaração de imposto). Forçar cadência diária num job semanal é o erro mais caro desta skill.
2. **Localizar o aha.** A primeira vez que esse resultado aparece. TTV p50 dos ativados abaixo de 5
   minutos (faixa de `skills/73-saas-conversion-playbook/references/playbook.md`).
3. **Auditar as 5 táticas** com `references/tactics.md`: presente, fraca ou ausente, com evidência.
4. **Prescrever um movimento por tática**, com tela, gatilho, copy e evento. Um movimento, não uma
   lista de ideias.
5. **Definir o evento de retenção**: repetiu a ação central, não apenas abriu. Montar o scorecard.
6. **Separar lock-in ético de hostil** em todo movimento da tática 5.
7. **Ordenar o plano** pela sequência de `references/tactics.md` (aha → personalização → hábito →
   ativo durável → comunidade). Comunidade antes de densidade é cemitério.
8. **Checkpoint antes de entregar:** todo movimento tem evento nomeado; nenhuma métrica fora das
   faixas citadas sem `HIPOTESE`; nenhum exemplo externo sem `ANALOGIA`.

## Anti-Padrões

- streak como único sistema de hábito, ou streak sem valor por trás (vira ansiedade e desinstalação)
- comunidade no onboarding antes de o usuário ter um resultado pessoal
- lock-in hostil (bloquear export, sequestrar dado) apresentado como retenção
- tratar push notification como produto
- personalização rasa ("Olá, Felipe") contada como personalização
- evento de retenção = "abriu o app"
- prometer lift percentual

## Evidência de Conclusão

- loop e cadência nomeados, com justificativa da cadência pelo job real
- as 5 táticas auditadas com evidência, cada uma com um movimento e um evento
- evento de retenção definido como repetição da ação central
- plano ordenado com aha na semana 1 e comunidade por último
- todo movimento da tática 5 permite export

## Handoff

### Recebe de
- **73-saas-conversion-playbook** — evento de ativação e modelo comercial
- **83-growth-action-plan** — quando o pedido é o plano de 4 semanas completo; esta skill preenche a
  seção de retenção

### Entrega para
- **21-data-analytics** — eventos `personalized_home_viewed`, `aha`, `habit_loop_completed`,
  `streak_at_risk`, `asset_created`, `community_action`
- **02-ui-ux-design** — telas do loop (ritual de abertura, tela de sucesso, empty state com ação)
- **57-mobile-ux-foundations** — quando o loop depende de pre-permission de push
- **04-frontend-integration** — implementação das telas aprovadas

## Integração com Pipeline

`73 (ativação/conversão) → 82 (retenção) → 21 (instrumentação) → 02/04 (telas)`. O orquestrador (09)
aciona esta skill quando o sintoma é retorno, não conversão.

## Recursos

- `references/tactics.md` — as 5 táticas com padrões, regras, evento e movimento típico; scorecard
  por janela; ordem de implementação

## Fontes

Adaptado da skill `high-retention-apps` de um pacote de UX/conversão consolidado pelo usuário
(set/2026), que resume a análise de Wyatt Feaster sobre 1000+ apps iOS de alta retenção ("I
Analyzed 1000 Apps With High Retention Rates"). Medido por grep antes de criar: nenhuma skill do kit
cobria retenção pós-ativação (a 73 cita D7 só como meta). Exemplos de apps são analogias da fonte;
nenhum número foi verificado de forma independente.
