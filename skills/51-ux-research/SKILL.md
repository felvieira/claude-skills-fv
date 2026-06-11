---
name: ux-research
description: |
  Skill de UX Research / Discovery qualitativo — entrevista com usuário, criação de persona baseada em
  pesquisa, mapa de jornada (journey map), teste de usabilidade qualitativo, arquitetura de informação,
  card sorting e validação de problema antes de especificar. Antecede o PO (01) e o UI/UX (02): entende
  PARA QUEM e POR QUE antes de definir O QUÊ e COMO. Base no livro de Fabricio Teixeira (Casa do Código).
  Trigger em: "pesquisa com usuário", "user research", "UX research", "discovery", "entrevista com usuário",
  "entrevista em profundidade", "persona", "criar persona", "mapa de jornada", "journey map", "mapa de empatia",
  "teste de usabilidade", "usability testing", "validar problema", "arquitetura de informação", "card sorting",
  "taxonomia", "proposição de valor", "produto que ninguém usa", "começar pelo usuário", "focus group".
argument-hint: "[entregavel: entrevista|persona|jornada|teste-usabilidade|AI|validacao] [produto] [publico-alvo]"
allowed-tools: Read, Grep, Glob, Write, Edit
---

# UX Research — Discovery Qualitativo, Persona, Jornada e Teste de Usabilidade

Entende quem é o usuário e qual problema dele vale resolver, *antes* de qualquer spec ou tela. Sem esta etapa, o time desenha pela própria intuição — e o primeiro pilar do UX Design é "você não é o usuário" (Fabricio Teixeira, *UX Design — Introdução e boas práticas*, Casa do Código). Esta skill produz os artefatos de pesquisa que alimentam o PO (01) e o UI/UX (02).

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/source-driven.md`, `policies/verification-before-completion.md` e `policies/anti-ai-writing.md`.

**Gate anti-AI:** personas, insights e relatórios são prosa que humanos do time vão ler. Rodar os padrões de `policies/anti-ai-writing.md` antes de entregar e oferecer `/humanize` como passe final. Persona com cara de gerador automático não engaja empatia — que é o ponto inteiro.

**Gate de integridade da pesquisa:** nenhum insight, número ou citação de usuário pode ser inventado. Persona e jornada só valem se forem destilados de pesquisa real (entrevista, observação, métrica). Persona sem pesquisa por trás é ficção decorativa — explicitar quando é hipótese (proto-persona) versus baseada em dado.

## Referencias (carregar sob demanda)

- `references/metodos-pesquisa.md` — qualitativo vs quantitativo, recrutamento, roteiro de entrevista em profundidade, teste de usabilidade passo-a-passo, análise e síntese de insights, as 10 desculpas para não testar
- `references/personas-jornada.md` — template de persona, mapa de empatia, mapa de jornada (journey map), arquitetura de informação, card sorting, taxonomia, proposição de valor

Carregar apenas a referência que o entregável pedido exige.

## Quando Usar

- entender quem é o público-alvo antes de especificar uma feature ("para quem estamos construindo?")
- validar se um problema vale a pena ser resolvido antes de investir em build ("produto que ninguém usa")
- conduzir/roteirizar entrevista em profundidade ou focus group com usuários
- criar persona baseada em pesquisa real (não chutada)
- mapear a jornada do usuário (journey map) ou mapa de empatia
- planejar e rodar teste de usabilidade qualitativo (em protótipo, wireframe ou produto no ar)
- definir arquitetura de informação, taxonomia ou rótulos via card sorting
- escrever a proposição de valor de um produto novo antes da spec

## Quando Nao Usar

- **definir UI, wireframe, tokens, componentes, fluxo de tela** → skill 02 (ui-ux-design). Research entrega o insight; 02 desenha a interface
- **acessibilidade técnica (WCAG, ARIA, screen reader, contraste)** → skill 22 (accessibility-specialist)
- **benchmark visual de concorrentes, moodboard, tendências de design** → skill 29 (design-intelligence). Aqui se faz análise competitiva *funcional/de problema*, não estética
- **definir eventos, funil, métrica de produto, tracking plan (quantitativo de instrumentação)** → skill 21 (data-analytics). Esta skill *usa* métricas como pista, mas não as instrumenta
- **escrever user story, critério de aceitação, escopo, priorização formal** → skill 01 (po-feature-spec). Research entrega persona+jornada+insight; 01 transforma em spec

## Entradas Esperadas

- problema ou hipótese de produto a investigar
- contexto de negócio (objetivo, restrições, quem é o cliente)
- acesso a usuários reais (ou aproximação do perfil) para entrevista/teste
- material existente: métricas (Analytics, logs de busca), e-mails de suporte, atendimento, pesquisa anterior — fontes de pista para o research
- `docs/repo-audit/current.md` se o research é sobre produto existente

## Saidas Esperadas

- **insights** sintetizados (3-7 bullets acionáveis por sessão — não relatório de 40 páginas)
- **persona(s)** baseada em pesquisa, com comportamento, necessidades, dores e motivações
- **mapa de jornada** e/ou **mapa de empatia** do fluxo investigado
- **roteiro de entrevista** ou **plano de teste de usabilidade** quando o pedido é conduzir pesquisa
- **proposição de valor** quando o produto é novo
- **arquitetura de informação / taxonomia** quando o pedido é organização de conteúdo
- handoff sinalizado para skill 01 (PO) e skill 02 (UI/UX)

## Posicao no Pipeline

```
Problema  →  [UX Research 51]  →  PO Spec (01)  →  UI/UX (02)  →  Build (03/04)
             entende QUEM/PORQUÊ   define O QUÊ      define COMO
```

UX Research **antecede** o PO. Quando o problema já está claro e validado, pode-se pular direto para 01 — research não é etapa obrigatória de toda task, é etapa de toda task com *incerteza sobre o usuário ou o problema*.

## Protocolo

### 1. Definir o problema de pesquisa (antes de qualquer método)

Whitney Hess, citada no livro: UX é definir **o problema que precisa ser resolvido (o porquê)**, **para quem (o quem)** e **o caminho para resolvê-lo (o como)**. Começar pelo porquê e pelo quem.

Antes de escolher método, responder:
- Que hipótese ou decisão esta pesquisa precisa informar?
- O que já sabemos (métricas, suporte, pesquisa anterior)? Research não começa do zero — métricas de site, palavras mais buscadas no campo de busca, e-mails de suporte e atendimento online já são pistas dos principais problemas
- Qual a decisão que muda dependendo do resultado? Se nenhuma, a pesquisa é teatro

### 2. Escolher o método pelo tipo de pergunta

| Pergunta | Método | Natureza |
|---|---|---|
| Por quê? O que sente/pensa/precisa? | Entrevista em profundidade, focus group | Qualitativo |
| Consegue completar a tarefa? Onde trava? | Teste de usabilidade | Qualitativo |
| Quantos? Qual % converte/abandona? | Métricas, survey, teste A/B | Quantitativo |
| Como organiza/nomeia o conteúdo? | Card sorting, taxonomia | Qualitativo |

Regra do livro: **qualitativo busca insight, não estatística.** Quantitativo dá o "o quê" e "quanto"; qualitativo dá o "por quê". Eles se complementam — métricas apontam onde dói, entrevista explica a dor. Detalhes de cada método em `references/metodos-pesquisa.md`.

### 3. Conduzir (entrevista ou teste)

- **recrutamento:** teste com 3-5 usuários do perfil. "Testar com 1 usuário já é infinitamente melhor que testar com 0." O perfil demográfico pode ser aproximado — o que importa é testar com pessoas que **usariam** o serviço
- **ambiente:** casual, não laboratório elaborado (intimida e enviesa). Pode ser remoto
- **postura:** o pesquisador não é profeta que sabe como as pessoas pensam — é investigador. Não direcionar, não enviesar, não "vender" a solução. Deixar o usuário verbalizar problemas e desconfortos
- **contexto real importa:** algumas ideias só surgem observando o usuário no contexto real de uso (ex.: o atalho de lanterna no app de leitura de medidor de gás surgiu de ver gente levando lanterna ao porão escuro)

Roteiro e passo-a-passo em `references/metodos-pesquisa.md`.

### 4. Sintetizar insights (leve, rápido)

Do livro: pesquisa não precisa de relatório formal tabulado. No caminho de volta da pesquisa, sair com **3 bullet points** que resumem o aprendizado do dia. O benefício real do teste não é o relatório — é a **exposição do time a usuários reais**. Sintetizar para decisão, não para arquivo.

### 5. Produzir o artefato (persona, jornada, AI, proposição de valor)

Conforme o pedido. Templates em `references/personas-jornada.md`. Todo artefato cita as fontes de pesquisa que o embasam.

### 6. Gates + handoff

Rodar gate anti-AI e gate de integridade. Entregar para 01/02 com as fontes anexadas.

## Heuristicas

- **Você não é o usuário.** Intuição é input válido, não o único. A pesquisa existe porque o time não consegue prever o que o usuário pensa/sente/deseja
- **Comece pelo usuário, não pela tecnologia.** "Comece com a experiência do usuário e depois defina a tecnologia usada" (Steve Jobs, citado no livro). O caso QR Code: febre entre empresas, ignorado pelos usuários — tecnologia que resolve problema que ninguém tinha
- **Pesquisa contínua > pesquisa-evento.** Não precisa ser etapa separada com CNPJ e prancheta. Pode ser uma manhã por semana conversando com usuários reais, custo diluído no projeto
- **Teste cedo, falhe rápido.** Teste em protótipo, wireframe, no verso do guardanapo. Quanto mais cedo, mais barato corrigir
- **O que você não desenha também é design.** Saber dizer não a features é parte do research — identificar briefing inflado e afunilar pela proposição de valor

## Anti-Padroes

- **Persona inventada (ficção decorativa):** criar persona "Maria, 32, gosta de praticidade" sem nenhuma entrevista por trás. Persona sem pesquisa é hipótese — marcar como proto-persona e validar
- **Pesquisa que não muda decisão nenhuma:** rodar entrevista para confirmar o que o time já decidiu. Se o resultado não pode mudar o rumo, não é pesquisa, é justificativa
- **Direcionar o usuário no teste:** "você não achou esse botão lindo e fácil?" — pergunta enviesada invalida o dado. Pedir tarefa, observar, não sugerir
- **Confundir o que o usuário diz com o que faz:** em qualitativo é comum o usuário dizer uma coisa e fazer outra. Observar comportamento > coletar opinião declarada
- **Superplanejar a pesquisa até nunca fazer:** ensaiar demais o roteiro e nunca sair da mesa. 15 minutos combinando as regras do jogo e o resto é improvisação controlada
- **Pular research e ir direto pro wireframe:** desenhar interface (skill 02) sem saber para quem — inverte o pipeline
- **Entrar no território da skill errada:** definir ARIA/contraste (é 22), moodboard estético (é 29), tracking plan (é 21), user story formal (é 01)

## Evidencia de Conclusao

- método escolhido coerente com a pergunta de pesquisa
- insights sintetizados em bullets acionáveis (não relatório inchado)
- artefato pedido (persona/jornada/AI/proposição) produzido e ancorado em fontes reais
- gates anti-AI e de integridade passados
- handoff para 01/02 sinalizado

## Handoff

- **PO Feature Spec (skill 01):** recebe persona + jornada + insights + proposição de valor para escrever user stories e critérios de aceitação. Esta skill responde "para quem e por quê"; 01 responde "o quê"
- **UI/UX Design (skill 02):** recebe persona, mapa de jornada, arquitetura de informação e insights de usabilidade para desenhar fluxos e telas. 02 também recebe o resultado de testes de usabilidade para iterar a interface
- **Data Analytics (skill 21):** quando a pesquisa qualitativa aponta a necessidade de medir quantitativamente (validar com volume), 21 instrumenta os eventos
- **Design Intelligence (skill 29):** quando o research de problema indica necessidade de benchmark visual/estético dos concorrentes
- **/humanize:** passe final em persona, insights e relatório antes de circular no time

## Integracao com Pipeline

- **Orchestrator (09):** roteia para cá no início de tasks com incerteza sobre usuário/problema (discovery), *antes* de invocar o PO (01). Para problema já validado, roteia direto para 01
- **Context Manager (08):** persistir personas e jornada para reuso entre features do mesmo produto — não re-pesquisar o mesmo público a cada feature
- **Documenter (10):** registrar personas e mapa de jornada como artefatos de produto reutilizáveis
- **Repo Auditor (18):** quando o research é sobre produto existente, consumir `docs/repo-audit/current.md` antes de explorar

## Fonte

Conteúdo destilado de Fabricio Teixeira, *UX Design — Introdução e boas práticas no Design da Experiência do Usuário* (Casa do Código). Frameworks citados: disciplinas de UX (Dan Saffer), Kano Model (Noriaki Kano), estratégia dos cupcakes (Adaptive Path), pesquisa com usuários (Jared Spool / UIE).
