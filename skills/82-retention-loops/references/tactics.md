# As 5 Táticas de Retenção

Exemplos de apps são `ANALOGIA`: mostram o padrão, não provam nada sobre o produto do usuário.

## 1. Personalização que muda o canvas

O app muda o que o usuário **vê**, não só o nome no cabeçalho.

Padrões (ANALOGIA): Duolingo (as respostas do onboarding definem o curso), Headspace (programa por
objetivo), Spotify (hábito de escuta vira a home).

Regras:
- cada resposta do onboarding reaparece em até 24h no produto (home, fila, plano)
- "Olá, Felipe" não conta
- se o conteúdo é igual para todos, a tática está ausente

Movimento típico:
1. escolher **um** eixo que muda o canvas (objetivo, nível, ferramenta favorita)
2. perguntar só isso no onboarding
3. renderizar home/fila/plano a partir desse eixo
4. reperguntar em D7 se o eixo ficou obsoleto

Evento: `personalized_home_viewed` com a propriedade do eixo usado.

## 2. Aha rápido

A primeira prova de "isso funciona pra mim".

Padrões (ANALOGIA): app de calorias que mostra o resultado ao logar o primeiro alimento, sem tour;
app de notas de reunião que entrega a primeira nota no primeiro uso.

Regras:
- aha não é tour, login nem perfil completo
- preferir aha antes do cadastro quando o artefato pode ser gerado sem conta
- TTV p50 dos ativados abaixo de 5 minutos

Movimento típico:
- cortar tudo entre a abertura e o primeiro artefato
- B2B: dados de exemplo ou demo acionável em 1 toque
- consumer: 1 entrada → 1 saída visível

Evento: `aha` com o artefato (plano gerado, nota criada, score calculado).

## 3. Loop de hábito na cadência real

O produto cria um ritual com cadência clara.

Padrões (ANALOGIA): Oura (score de sono de manhã), Strava (kudos e segmento depois do esforço),
Duolingo (streak protegendo um progresso já sentido).

Regras:
- loop = gatilho → ação de menos de 30s → recompensa visível
- streak sem valor por trás vira ansiedade
- score diário só funciona se o número muda por causa do usuário
- a cadência é a do problema: não forçar diário quando o job é semanal

Movimento típico:
- ritual de abertura: 1 número + 1 ação
- recompensa imediata, não só no D30

Eventos: `habit_loop_completed`, `streak_at_risk`.

## 4. Comunidade depois do resultado pessoal

Pessoas, não feed vazio.

Padrões (ANALOGIA): Brilliant (XP e ranking contra gente do mesmo nível), Ahead (conselho entre quem
tem a mesma dificuldade).

Regras:
- comunidade no dia 0 é cemitério; primeiro o resultado pessoal
- começar 1-para-1 ou grupo pequeno, não mural global
- densidade e moderação pesam mais que feature social

Movimento típico:
- em D7, convidar 1 pessoa ou entrar numa sala do mesmo objetivo
- prova social viva ("3 amigos treinaram hoje") no lugar de "1 milhão de usuários"

Evento: `community_action` (post, kudos, resposta, comparação).

## 5. Switching cost ético

O usuário perderia algo que **ele** construiu.

Padrões (ANALOGIA): Google Drive (arquivos e compartilhamentos), Slack (histórico, integrações,
identidade no time).

Regras:
- ético: o valor acumulado pertence ao usuário e pode ser exportado
- hostil: sequestrar o dado para impedir a saída. Gera churn com raiva e avaliação de 1 estrela
- acúmulo visível: biblioteca, histórico, templates, grafo de pessoas

Movimento típico:
- semana 1: o usuário cria o primeiro ativo durável
- semana 2: o ativo ganha histórico
- semana 3: uma integração ou pessoa entra no grafo
- export sempre disponível; o custo de sair vem do trabalho de recriar, não de um cadeado

Evento: `asset_created` (o ativo que dói perder).

## Scorecard

| Janela | Pergunta que ela responde |
|---|---|
| D1 | o aha aconteceu? |
| D7 | o loop de hábito existe? |
| D30 | personalização + ativo durável seguram? |
| D90 | switching cost + comunidade seguram? |

Evento de retenção recomendado: repetiu a ação central. "Abriu o app" não serve.

Alvo de referência: D7 25%+ (faixa de `skills/73-saas-conversion-playbook/references/playbook.md`).
Outras janelas sem faixa documentada: registrar a linha de base atual e medir tendência, sem inventar
meta.

## Ordem de implementação

1. aha (sem ele, o resto é teatro)
2. personalização do canvas
3. loop de hábito na cadência certa
4. ativo durável (switching cost ético)
5. comunidade, só depois de haver densidade

## Formato da tabela de entrega

| Tática | Estado atual (evidência) | Movimento | Tela | Gatilho | Copy | Evento |
|---|---|---|---|---|---|---|
