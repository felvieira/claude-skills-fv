# Métodos de Pesquisa — UX Research Qualitativo

Destilado de Fabricio Teixeira, *UX Design — Introdução e boas práticas* (Casa do Código), caps. 2, 8, 11, 12. Foco: o que fazer, não prosa.

## 1. Qualitativo vs Quantitativo — escolha pelo tipo de pergunta

| | Qualitativo | Quantitativo |
|---|---|---|
| Responde | Por quê? Como sente/pensa? | Quanto? Qual %? |
| Saída | Insight, hipótese, comportamento | Número, taxa, tendência |
| Amostra | 3-5 usuários | volume estatístico |
| Métodos | Entrevista em profundidade, focus group, teste de usabilidade, card sorting, shadowing, diário de uso | Survey, métricas (Analytics), teste A/B, eye tracking |
| Risco | Usuário diz X mas faz Y | Diz "o quê" mas não "por quê" |

**Regra:** qualitativo busca insight, não estatística. Não precisa análise estatística — você está atrás de insights. Os dois se complementam: a métrica aponta *onde* dói (taxa de abandono no passo 3), a entrevista explica *por quê* (campo confuso). Quantitativo é mais "honesto" sobre comportamento real (mede a ação, não a opinião); qualitativo dá profundidade.

## 2. Onde achar pistas antes de pesquisar

Research não começa do zero. Fontes que já contêm os principais problemas:
- **logs / estatísticas de navegação** — onde o usuário trava, abandona, qual o fluxo real
- **palavras mais buscadas** no campo de busca interno — o que o usuário procura (e talvez não acha)
- **e-mails de suporte e atendimento online** — problemas recorrentes verbalizados pelo próprio usuário
- **call-center / canais de serviço ao consumidor** — pós-lançamento, sinaliza fricção real

Usar essas fontes para escolher *quais tarefas* testar e *o que* perguntar.

## 3. Recrutamento

- **3-5 usuários** do perfil principal por rodada. Mais que isso, retornos decrescentes em qualitativo
- "Testar com 1 usuário já é infinitamente melhor que testar com 0 usuário"
- **perfil demográfico pode ser aproximado** — o crítico é testar com pessoas que **usariam** o serviço, não o perfil exato
- se há múltiplos perfis, recrutar representantes de cada grupo principal
- compensar o tempo do participante (brinde/incentivo)

## 4. Entrevista em profundidade — roteiro

Entrevista 1-a-1 para entender como o consumidor pensa, o que espera e como interage.

**Estrutura de roteiro:**
1. **Aquecimento** — apresentar-se, explicar por que a empresa está pesquisando, deixar à vontade. Sem laboratório intimidante
2. **Contexto e rotina** — como a pessoa resolve o problema *hoje*, sem o produto. Quais ferramentas/métodos usa. (Pode ser conversa aparentemente randômica — saber do dia a dia já aproxima)
3. **Necessidades, anseios, motivações** — o que faz a pessoa buscar a solução? Quais tarefas quer realizar? O que a frustra no método atual?
4. **Reação ao produto/conceito** (se houver) — sem direcionar
5. **Fechamento** — o que mais? algo que não perguntei?

**Regras de condução:**
- não enviesar: pergunta aberta, não "você não achou isso ótimo?"
- o pesquisador é investigador, não profeta nem vendedor
- observar o **contexto real de uso** — ideias surgem só ali (ex.: atalho de lanterna no app de medidor de gás)
- "jogo de cintura": sondar a feature sem deturpar/direcionar o resultado

## 5. Focus Group

Painel de discussão com vários usuários sobre um assunto. Útil quando o time **não conhece** o público-alvo — revela sentimentos, opiniões e a **linguagem** que as pessoas usam ao falar do produto (alimenta taxonomia e microcopy). Cuidado: dinâmica de grupo pode mascarar opinião individual.

## 6. Teste de Usabilidade — passo a passo

Verifica a facilidade com que o usuário compreende e manipula o produto. **Qualitativo por definição** — foca qualidade/profundidade, não nº de participantes.

**Quando usar:** validar aceitação de produto novo, avaliar usabilidade (completa a tarefa sem dificuldade, em tempo aceitável, com baixo esforço cognitivo?), comparar versões, identificar por que abandonam, coletar opiniões/ideias, medir performance (tempo, nº de passos, % de sucesso).

**Passo a passo:**
1. **Definir tarefas** a partir das pistas (logs, suporte, busca). Ex.: "descubra se o aparelho X tem a função Y"
2. **Recrutar** 3-5 do perfil
3. **Ambiente monitorado e casual** — ações gravadas/anotadas. Time observa de fora sem interferir
4. **Abertura** — facilitador explica o motivo, apresenta a interface, pergunta impressão subjetiva (beleza, atratividade)
5. **Execução das tarefas** — usuário realiza, **verbaliza** (think-aloud) problemas e desconfortos. Facilitador guia e incentiva, **não resolve nem direciona**
6. **Questionário de satisfação** ao final — registra conforto percebido
7. **Síntese** — não precisa relatório tabulado; sair com 3 bullets de aprendizado

**Pode testar em:** protótipo, wireframe, produto no ar, "verso do guardanapo". Quanto mais cedo, mais barato corrigir ("teste cedo, falhe rápido"). Remoto vale (Skype, usertesting.com).

**Ciclo:** teste → análise → soluções → repete. A cada ciclo o produto amadurece.

## 7. As 10 desculpas para não testar (e a resposta)

Do livro (via Cardinal Path) — usar para destravar resistência do time:
1. "Não tenho laboratório" → não precisa; lab elaborado intimida e enviesa, casual é melhor
2. "Não tenho software de gravação" → há grátis/trial; sem nada, teste assim mesmo
3. "Não sei fazer análise estatística" → não precisa, é qualitativo, busca insight
4. "Não conheço participantes suficientes" → 3-5 basta; 1 > 0
5. "Difícil achar o perfil exato" → teste com o mais próximo; quem **usaria** o serviço
6. "Produto não está pronto" → esse é o ponto; teste em protótipo/wireframe
7. "Não tenho tempo" → faça remoto, insights em poucas horas
8. "Não tenho budget" → faça você mesmo
9. "Nunca fiz, não sei como" → aprenda fazendo
10. "Está funcionando bem" → todo produto melhora com teste

## 8. Métodos quantitativos de apoio (limítrofe — instrumentação é skill 21)

- **Survey / pesquisa quantitativa** — mede satisfação rápido, aponta necessidade de pesquisa qualitativa profunda
- **Análise de métricas** — tempo de navegação, cliques, links mais clicados, ordem do fluxo, taxa de abandono, taxa de conversão. Google Analytics. Métrica gera insight que teste não captura (e vice-versa)
- **Teste A/B** — duas versões (A e B), metade vê cada uma, mede qual converte melhor. Vantagem: **precisão** / feedback real de mercado (mede o que a pessoa faz, não o que diz). Ótimo para funil de compra, landing, formulário de cadastro
- **Eye tracking** — movimento dos olhos, ordem de leitura, áreas de interesse

> Nesta skill, métricas são **pista** para o qualitativo. Definir/instrumentar eventos e tracking plan é skill 21 (data-analytics).

## 9. Pesquisa contínua (não-evento) — o "método" do livro

Pesquisa não precisa ser etapa separada com data de início/fim e burocracia:
- **custo diluído** no orçamento do projeto — não dar ao cliente a escolha "com ou sem pesquisa"; embutir
- exemplo do livro: uma manhã/semana, 2 UX designers em campo (loja da marca), bloqueio fixo no calendário
- **síntese imediata**: no táxi de volta, 3 bullets; compartilha com o time na mesma tarde
- **planejamento leve**: 15 min combinando regras do jogo, resto improvisação — sem superplanejar (caro) nem subplanejar (invalida por erro primário: público errado, parcialidade)
- benefício real: **exposição do time** a usuários reais > qualquer relatório
