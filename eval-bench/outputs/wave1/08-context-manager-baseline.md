---
scenario: 08-context-manager
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 90
tokens_out_approx: 950
time_seconds: 25
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: marginal
delta_vs_baseline: null
notes: "baseline run, no skill loaded; generic advice, no concrete file paths or status taxonomy"
---

# Como organizar 3 features antes de viajar 1 semana

Boa pergunta — antes de viajar, vale gastar 1-2 horas pra deixar o time autônomo. Aqui vai um plano:

## 1. Documente o estado de cada feature

Para cada uma das 3, escreva um mini-handover (pode ser num doc compartilhado, issue do GitHub, ou card no board):

**Auth (em QA)**
- O que foi feito
- Quem tá testando (nome do QA)
- Cenários de teste pendentes
- Critério pra considerar aprovado
- Quem aprova merge se tudo passar
- Se bug crítico aparecer: quem fixa? rollback ou hotfix?

**Billing (parou aguardando ADR)**
- Qual é a decisão aberta (qual ADR, qual número)
- Quem precisa decidir
- Quais opções estão na mesa
- Deadline pra decisão (defina antes de viajar)
- Se a decisão sair: quem retoma a implementação?
- Se NÃO sair na semana: ok deixar parado, ou tem outro caminho?

**Dashboard (começou ontem)**
- Escopo combinado
- Quem tá no código
- Primeira milestone (próximos 3-5 dias)
- Dúvidas técnicas em aberto
- Quem desbloqueia se travar

## 2. Defina um ponto focal

Escolha 1 pessoa no time que vai ser o "tech lead interino" durante sua ausência. Ela:
- Recebe perguntas
- Decide o que não precisa esperar você
- Escala pro gestor o que não pode esperar

Combine com ela antes. Não escolha alguém que também vai viajar.

## 3. Crie um canal de "decisões enquanto fora"

Um doc simples (Notion, Confluence, ou só uma issue) onde o time registra:
- "Decidimos X porque Y" (pra você não voltar perdido)
- Pendências que apareceram
- Bloqueios que ficaram

Você lê na volta em 30 min em vez de ter 50 mensagens no Slack.

## 4. Regras de escalonamento

Deixe explícito:
- O que pode esperar você (decisões de produto, mudanças de escopo)
- O que NÃO pode esperar (produção quebrada, bloqueio crítico, cliente afetado)
- Como te contatar em emergência (e o que conta como emergência)

## 5. Status nos boards

Antes de sair, garanta que todos os cards/issues estão com:
- Status atualizado
- Assignee correto
- Última atualização escrita (comentário com data e estado)

Não deixe nada "em progresso" sem dono claro.

## 6. Checklist final (1h antes de sair)

- [ ] Os 3 handovers escritos e linkados
- [ ] Tech lead interino confirmou
- [ ] Canal de decisões criado
- [ ] Regras de escalonamento publicadas
- [ ] Boards atualizados
- [ ] Status no Slack/Teams: "viajando entre X e Y, ponto focal: Fulano"
- [ ] Calendário marcado como OOO

## 7. Na volta

Reserve a primeira manhã pra:
- Ler o doc de decisões
- Pegar status dos 3 handovers
- Conversar 15 min com o tech lead interino

Não tente "voltar e produzir" no primeiro dia. Volte e se recontextualize.

---

Quer que eu te ajude a redigir os 3 handovers se você me passar mais detalhes de cada feature?
