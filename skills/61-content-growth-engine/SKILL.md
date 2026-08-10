---
name: content-growth-engine
description: |
  Skill de estrategia de conteudo como motor de aquisicao para SaaS e B2B. Use quando precisar montar
  um plano de conteudo do zero, priorizar pauta por intencao comercial, definir cadencia de producao,
  decidir entre criar conteudo novo ou atualizar antigo, planejar linkagem interna, extrair pauta das
  objecoes de venda, ou medir share de citacao em IA e receita influenciada por conteudo.
  Trigger em: "plano de conteudo", "estrategia de conteudo", "content marketing", "growth de conteudo",
  "pauta", "calendario editorial", "cluster de conteudo", "clusters de conteudo", "topic cluster",
  "intencao de busca", "intencao comercial", "fundo de funil", "bottom of funnel", "pagina de servico",
  "pagina de segmento", "pagina de precos", "comparativo X vs Y", "listicle", "estudo de caso",
  "newsletter", "LinkedIn", "link interno", "linkagem interna", "atualizar conteudo antigo",
  "content refresh", "conteudo antigo caindo", "share of voice", "citacao em IA", "respostas de IA",
  "menciona a marca no ChatGPT", "chatgpt cita", "chatgpt recomenda", "aparece nas respostas",
  "material rico", "lead magnet", "pesquisa original", "glossario", "trafego nao converte",
  "nao converte em reuniao", "conteudo nao gera pipeline", "objecoes de venda", "objecao de venda",
  "perguntas que aparecem em toda reuniao".
argument-hint: "[--fase=descobrir|criar|otimizar|medir] [--icp=<segmento>]"
allowed-tools: Read, Grep, Glob, Write, Edit, WebSearch, WebFetch
---

# Content Growth Engine — Conteudo como Motor de Aquisicao

Trafego nao e o produto. Pipeline e. Esta skill trata conteudo como sistema de aquisicao com meta de receita, nao como calendario de publicacao.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/source-driven.md`, `policies/anti-ai-writing.md`, `policies/verification-before-completion.md` e `policies/evals.md`.

Toda prosa publicada por esta skill passa por `/humanize` antes de ir ao ar. Conteudo de aquisicao com assinatura de texto gerado por IA destroi a autoridade que o proprio conteudo tenta construir — e, num plano cujo objetivo e ser citado por LLMs, e autossabotagem.

**Fronteira com as skills vizinhas** — esta skill decide **o que produzir, em que ordem e por que**. Ela nao reimplementa:

- `skills/14-seo-specialist/SKILL.md` — SEO tecnico e GEO/AEO: meta tags, schema (Article/FAQPage/HowTo), autor com bio, `dateModified` visivel, llms.txt, conteudo citavel, keyword research por volume/dificuldade. **Todo item de "schema e marcacao" do plano vive la.** Esta skill entrega a pauta priorizada; a 14 executa a marcacao
- `skills/13-marketing-copy/SKILL.md` — copy de landing, headline, CTA, brand voice
- `skills/50-direct-response-copy/SKILL.md` — copy de anuncio, pagina de vendas, email, social
- `skills/41-blog-publisher/SKILL.md` — publicacao do post (HTML, imagens, commit, URL)
- `skills/55-marketing-reporting-analytics/SKILL.md` — relatorio de campanha, GA4/GTM, calculadora de CAC
- `skills/59-closed-loop-revenue/SKILL.md` — a cadeia clique → evento → venda → margem. **A metrica de receita influenciada por conteudo se instrumenta la**
- `skills/21-data-analytics/SKILL.md` — naming de evento e tracking plan
- `skills/51-ux-research/SKILL.md` — entrevista com cliente, quando a pauta exige pesquisa primaria

## Quando Usar

- montar plano de conteudo do zero para um SaaS/B2B
- priorizar pauta quando ha mais ideias que capacidade de producao
- decidir entre publicar novo ou atualizar existente
- desenhar arquitetura de clusters e linkagem interna
- extrair pauta das objecoes que aparecem em reuniao comercial
- definir cadencia realista de producao e distribuicao
- medir se conteudo esta gerando pipeline, nao so sessao

## Quando Nao Usar

- escrever o texto de um post especifico (skill 13 ou 50, conforme o formato)
- implementar schema, meta tag ou llms.txt (skill 14)
- publicar o post no blog (skill 41)
- montar relatorio de Ads ou configurar GA4 (skill 55)
- instrumentar a conversao ate a receita (skill 59)

## Entradas Esperadas

- ICP: quem compra, cargo, empresa, dor que resolve
- produto: o que faz, precos, concorrentes diretos e alternativas
- estado atual: site, paginas existentes, conteudo publicado, trafego
- capacidade real de producao (pessoas x horas por semana) — nao a desejada
- acesso a chamadas de venda, CRM ou notas comerciais (para a Fase 3)

## Saidas Esperadas

- `content/strategy/icp-e-intencao.md` — mapa de intencao por estagio
- `content/strategy/clusters.md` — clusters priorizados com pillar e linkagem
- `content/strategy/calendario.md` — pauta com cadencia e responsavel
- `content/strategy/refresh-queue.md` — fila de atualizacao priorizada
- `content/strategy/metricas.md` — o que rastrear e a meta por horizonte
- handoff explicito para as skills 13/14/41/59

---

## Fase 1 — Descobrir

### 1.1 Intencao de busca real, nao presumida

O erro fundador: escrever sobre o que a empresa acha interessante. A pauta sai do vocabulario de quem compra.

Fontes na ordem de confiabilidade — as primeiras sao dados de comportamento real, as ultimas sao proxy:

| Fonte | O que extrair | Por que confiavel |
| --- | --- | --- |
| Gravacoes de call de vendas | as palavras exatas do prospect ao descrever a dor | e a linguagem de quem tem orcamento |
| Tickets de suporte e chat | duvidas que travam adocao e renovacao | pauta de fundo de funil e retencao |
| Query do site (busca interna) | o que o visitante nao achou | lacuna de conteudo declarada pelo usuario |
| Search Console (query, nao pagina) | termos que ja trazem impressao sem clique | oportunidade com demanda comprovada |
| Comunidades do nicho (Reddit, Slack, LinkedIn) | como o problema e formulado sem filtro de marketing | linguagem crua |
| Ferramenta de keyword | volume e dificuldade | **so para dimensionar, nunca para escolher** |

Regra: **volume nao entra na priorizacao**. Um termo com 50 buscas/mes feito por diretor de compras vale mais que 5.000 buscas de estudante. Volume dimensiona esforco; intencao decide ordem.

### 1.2 Classificar por intencao

| Intencao | O que a pessoa quer | Formato que serve | Prioridade |
| --- | --- | --- | --- |
| **Transacional** | comprar/contratar agora | pagina de servico, precos, demo | 1ª — receita imediata |
| **Comercial** | comparar antes de decidir | "X vs Y", alternativas, listicle ranqueado, estudo de caso | 2ª — decisao acontece aqui |
| **Informacional problema-consciente** | entender a dor que ja sente | guia de solucao, framework, checklist | 3ª — alimenta o meio |
| **Informacional generico** | aprender o tema | conceito, glossario, tendencia | 4ª — trafego sem intencao |

A maioria dos planos falha por inverter isso: comeca pelo informacional generico (mais volume, mais facil escrever) e nunca chega no comercial. **Comece pelo fim do funil e suba.** O fundo converte com 100 visitas o que o topo nao converte com 10.000.

### 1.3 Clusters, nao lista de posts

Cluster = uma **pillar page** (cobre o tema em profundidade, alvo do termo principal) + N artigos de apoio (cada um cobre uma sub-pergunta especifica), todos linkando para a pillar e a pillar linkando de volta.

Por que agrupar: sinaliza profundidade de dominio ao buscador e ao LLM. Cinco artigos soltos sobre temas nao relacionados nao constroem autoridade em nada; cinco artigos num cluster constroem em um assunto.

Priorize o cluster que toca a intencao comercial do ICP primario. Um cluster completo vale mais que tres pela metade.

### 1.4 Auditar o site atual antes de escrever qualquer coisa

Foco em pagina de servico e de conversao, nao no blog. Para cada pagina que deveria converter:

- ha pagina dedicada por servico? E por segmento de cliente atendido?
- a pagina responde "isso e para quem" e "quanto custa" ou empurra para "fale com vendas"?
- ha prova (numero, caso, citacao de cliente) ou so adjetivo?
- ha CTA unico e claro, ou tres CTAs competindo?
- ha link de entrada de outro conteudo, ou a pagina e orfa?

**Pagina orfa nao ranqueia e nao recebe trafego interno.** Marcar toda pagina sem link de entrada.

### 1.5 Share de recomendacao em IA (baseline)

Antes de produzir, medir onde a marca aparece hoje nas respostas geradas.

Protocolo — reproduzivel, nao impressao:

1. Montar 20-30 prompts que o ICP realmente faria ("qual melhor ferramenta de X para empresa de Y", "alternativas ao <concorrente>", "como resolver <dor>")
2. Rodar em ChatGPT, Claude, Perplexity e Google AI Overviews — sessao limpa, sem historico, senao a personalizacao contamina
3. Registrar por prompt: a marca foi citada? em que posicao? quais concorrentes apareceram? qual fonte o modelo citou?
4. Guardar data e modelo/versao — a resposta muda com o tempo, e sem data o dado nao serve de baseline

Saida: planilha marca x prompt x modelo, com **taxa de citacao** (% de prompts em que a marca aparece). Repetir mensalmente, sempre com os mesmos prompts. Mudar o conjunto de prompts invalida a serie historica.

O que fazer com o resultado: se um concorrente e citado e a marca nao, ver **qual pagina o modelo cita** dele. Normalmente e um comparativo, uma pagina de precos publica ou um dado proprietario — os tres formatos que a Fase 2 prioriza.

### 1.6 Plano de links internos

Link interno distribui autoridade e cria o caminho de leitura. Regras:

- todo artigo de apoio linka para a pillar do seu cluster, com anchor descritivo (nunca "clique aqui")
- a pillar linka para todos os artigos de apoio
- todo conteudo de meio de funil linka para pelo menos uma pagina de conversao
- nenhuma pagina de servico fica orfa
- link entre clusters so quando ha relacao real de leitura — linkagem artificial dilui

### 1.7 Material rico: ferramenta ou template, nao ebook

Ebook tem custo de producao alto e valor percebido baixo — virou sinonimo de formulario para receber PDF. O que gera link, citacao e cadastro qualificado:

- **calculadora** que resolve uma conta que o ICP faz na mao (ROI, dimensionamento, custo total)
- **template** que o ICP usaria de qualquer jeito (planilha, contrato, checklist operacional)
- **diagnostico** que devolve resultado personalizado, nao um PDF generico
- **dado proprietario** que so a empresa tem (ver Fase 5)

Criterio: se o material continua util depois de aberto uma vez, e ativo. Se e lido e descartado, e custo.

---

## Fase 2 — Criar

### 2.1 Cadencia realista

O plano padrao pede 8-12 artigos/mes + 3 posts/semana de C-level + 1 post/dia de empresa + newsletter quinzenal. **Isso e uma equipe, nao uma pessoa.** Dimensionar antes de prometer:

| Volume/mes | Realidade de time | Risco |
| --- | --- | --- |
| 8-12 artigos de decisao | 1 escritor dedicado + revisao de especialista | qualidade cai se o especialista nao tiver tempo de revisar |
| 3 posts/semana de C-level | ghostwriter + 30min/semana do C-level | sem a voz real do C-level, o post nao performa e queima a conta |
| 1 post/dia de empresa | 1 social media ou reaproveitamento sistematico | virar repost automatico do blog nao funciona |
| Newsletter quinzenal | curadoria, nao producao nova | vira mais um canal abandonado se nao tiver dono |

**Metade do volume com o dobro de profundidade vence.** Se a escolha e entre 12 artigos rasos e 6 densos com dado proprio, escolher 6. Artigo raso nao e citado por LLM nem convence comprador.

Instagram: so se for canal de compra do ICP. Para B2B de ticket alto, quase nunca e — e o custo de manter e o mesmo do canal que funciona.

### 2.2 Formatos que decidem compra

Priorizar formatos de decisao sobre formatos de descoberta:

| Formato | Estrutura minima | Erro que anula |
| --- | --- | --- |
| **Comparativo "X vs Y"** | tabela lado a lado + secao "quando escolher cada um" | dizer que o proprio produto vence sempre — destroi credibilidade e o leitor percebe na hora. Admitir o cenario em que o concorrente e melhor e o que torna o resto confiavel |
| **Alternativas a <concorrente>** | lista honesta incluindo opcoes onde a marca nao e a melhor | listar so alternativas fracas |
| **Listicle ranqueado** | criterio de ranqueamento explicito antes da lista | ranking sem criterio declarado = opiniao disfarcada |
| **Estudo de caso** | contexto → problema → o que foi feito → numero antes/depois → tempo | caso sem numero e depoimento longo |
| **Pagina de servico** | para quem e, o que entrega, como funciona, prova, preco ou faixa | descrever o servico sem dizer para quem nao serve |
| **Pagina de segmento** | a dor especifica daquele segmento, no vocabulario dele | copiar a pagina de servico trocando o nome do setor |

Todo conteudo comparativo leva **tabela** — LLMs extraem tabela com fidelidade muito maior que prosa (detalhe tecnico em `skills/14-seo-specialist/SKILL.md`, secao GEO/AEO).

### 2.3 Pagina de precos publica

Publicar preco e decisao comercial, nao so de marketing — levar a quem decide. O argumento a favor:

- e uma das paginas que LLM mais cita ao comparar ferramentas; sem ela, o modelo cita o concorrente que publica
- filtra lead fora de faixa antes de consumir hora de vendas
- "fale com vendas" e fricao que o comprador B2B moderno evita — ele quer se qualificar sozinho

Se o preco e realmente variavel: publicar **faixa**, os fatores que movem o valor e um exemplo de configuracao real. Isso captura a intencao sem fechar negociacao.

Se a decisao for nao publicar, registrar o motivo — e revisitar quando um concorrente publicar.

---

## Fase 3 — Otimizar

### 3.1 As perguntas de toda reuniao comercial

O melhor conteudo de fundo de funil ja existe: esta sendo respondido verbalmente toda semana.

Protocolo:

1. Perguntar a vendas: "quais 7-10 perguntas voce responde em **toda** call?"
2. Cruzar com gravacoes/notas — vendas lembra do que e memoravel, a gravacao mostra o que e frequente
3. Separar **pergunta** (busca informacao) de **objecao** (busca seguranca para decidir) — objecao vira conteudo mais valioso
4. Uma pergunta = um conteudo dedicado, com o titulo na formulacao do cliente
5. Devolver os links para vendas usar na call

Ganho duplo: SEO/GEO de fundo de funil e ciclo de venda mais curto. Se vendas nao usa o material, o material errou o alvo — esse e o teste.

### 3.2 Atualizar antes de criar

Conteudo decai: dado envelhece, produto muda, concorrente publica melhor. Atualizar um artigo que ja tem historico costuma render mais rapido que publicar um novo do zero.

Fila de refresh, priorizada por:

1. paginas que perderam posicao/impressao nos ultimos 3-6 meses (Search Console: comparar periodos)
2. conteudo com dado, preco ou screenshot desatualizado — erro factual custa mais que ausencia
3. conteudo de fundo de funil que nao converte
4. artigos que ja rankeiam em 5-15 (empurrar para o top 3 e mais barato que criar do zero)

Refresh de verdade = reescrever secao, atualizar dado com fonte nova, adicionar o que faltou, corrigir link quebrado. **Trocar a data sem mudar o conteudo e fraude editorial** — e quando descoberto queima confianca com leitor e buscador.

Regra de alocacao: reservar 30-40% da capacidade mensal para refresh. Sem cota reservada, o novo sempre ganha e a biblioteca apodrece.

### 3.3 Biblioteca de citacoes de clientes

Centralizar prova social em vez de cacar depoimento a cada pagina. Cada citacao guarda: texto exato, nome, cargo, empresa, data, contexto (call/NPS/review), **permissao de uso registrada**, e o tema que ela prova.

Indexar por objecao — "preco", "implementacao", "suporte", "migracao" — para que a pagina que enfrenta a objecao X puxe a citacao que a responde. Citacao generica ("otimo produto") nao prova nada; citacao com numero e contexto prova.

### 3.4 Marcacao e autoridade

Schema, autor real com bio, `dateModified` visivel e FAQ marcado sao **requisito de publicacao**, nao otimizacao posterior. Implementacao completa em `skills/14-seo-specialist/SKILL.md` — esta skill so garante que nenhum conteudo sai sem isso.

Autor tem que ser pessoa real, com bio e link — nao "Equipe de Conteudo". E sinal de E-E-A-T e o que permite ao modelo atribuir autoridade.

---

## Fase 4 — Paralelo

### SEO tecnico rastreavel por LLM
Crawler de LLM nao executa JS de forma confiavel: conteudo que so aparece apos hidratacao pode nao ser lido. Preferir SSR/SSG para conteudo de aquisicao. Verificar o HTML servido, nao o renderizado no navegador (`curl` na URL e conferir se o texto esta la). Detalhes em `skills/14-seo-specialist/SKILL.md`.

### Paginas de conversao
Fundo de funil e onde a receita acontece e onde menos se investe. Aplicar `skills/13-marketing-copy/SKILL.md` para copy e `skills/02-ui-ux-design/SKILL.md` para estrutura (incluindo estado vazio e hierarquia de CTA).

### Monitoramento de citacao em IA
Metrica recorrente mensal com o mesmo conjunto de prompts da Fase 1.5. Trimestral e tarde demais para corrigir rota.

---

## Fase 5 — Alto impacto

Ordenado por retorno sobre esforco:

1. **Pesquisa original com dado proprietario** — o unico ativo que concorrente nao copia. Se o produto gera dado agregavel (e anonimizavel), ele vira relatorio anual citavel. E a fonte mais provavel de link editorial e citacao por LLM. Verificar base legal e anonimizacao antes de publicar qualquer agregado
2. **Ferramenta interativa gratuita** — calculadora ou diagnostico que resolve uma conta real; gera link e cadastro qualificado continuamente
3. **Complemento acionavel por artigo de processo** — todo artigo que ensina um processo entrega o checklist/template correspondente. Custo marginal baixo, valor percebido alto
4. **Glossario** — serve a **consistencia semantica** (a empresa nomeia as coisas de um jeito so, e o LLM aprende essa associacao), nao a trafego. Nao esperar sessao dele; esperar coerencia

---

## Fase 6 — Medir

Metricas ao fim de 6 meses. Sessao total nao esta na lista — e a metrica que sobe sozinha e nao paga salario.

| Metrica | Como medir | Meta de referencia |
| --- | --- | --- |
| **Trafego qualificado no ICP** | sessoes segmentadas por firmografia/comportamento, nao total | crescer com taxa de conversao estavel ou melhor |
| **Citacao em IA** | taxa de citacao no conjunto fixo de prompts (Fase 1.5) | tendencia de alta mes a mes |
| **Conversao por origem, incluindo IA** | UTM + referrer de ChatGPT/Perplexity + campo "como nos conheceu" no formulario | atribuir o que da para atribuir; declarar o que nao da |
| **Demos e reunioes agendadas** | CRM, com origem de conteudo preservada | volume e qualidade (taxa de comparecimento) |
| **Receita gerada e influenciada** | gerada = conteudo foi primeiro toque; influenciada = apareceu no caminho | instrumentacao em `skills/59-closed-loop-revenue/SKILL.md` |

**Trafego de IA e parcialmente cego** — muitos assistentes nao passam referrer, e parte da influencia acontece sem clique nenhum (o usuario le a resposta e depois busca a marca direto). Por isso o campo aberto "como nos conheceu" no formulario nao e redundancia: e a unica captura de um canal que a analytics nao ve. Declarar essa limitacao no relatorio em vez de fabricar precisao.

Horizonte honesto: conteudo de fundo de funil pode converter em semanas; autoridade de cluster e citacao em IA levam de 3 a 6 meses. Prometer resultado de SEO em 30 dias e o que faz o programa ser cancelado no mes 4, logo antes de funcionar.

---

## Anti-Padroes

- **Priorizar por volume de busca** — traz sessao sem intencao de compra. Volume dimensiona, intencao prioriza
- **Comecar pelo topo do funil** — mais facil de escrever, mais lento para converter. O fundo primeiro
- **Comparativo em que a propria marca sempre vence** — o leitor percebe e para de confiar no resto do site
- **Publicar novo com a biblioteca apodrecendo** — sem cota de refresh, o acervo vira passivo
- **Trocar `dateModified` sem mudar conteudo** — fraude editorial, detectavel, custa confianca
- **Autor "Equipe de Conteudo"** — anula E-E-A-T; LLM nao atribui autoridade a entidade generica
- **Ebook como material rico** — custo alto, valor percebido baixo
- **Volume prometido acima da capacidade real** — 12 rasos perdem para 6 densos, e o time queima
- **Instagram por default em B2B** — canal que nao e de compra consome a mesma energia do que funciona
- **Medir sessao total como sucesso** — sobe sozinho, nao paga salario
- **Checar citacao em IA uma vez por trimestre** — tarde demais para corrigir
- **Conteudo com assinatura de IA** — num plano cujo objetivo e autoridade, e autossabotagem (`/humanize`)

## Evidencia de Conclusao

- mapa de intencao com fonte declarada por termo (call, ticket, Search Console — nao "achamos")
- clusters priorizados, cada um com pillar definida e artigos de apoio listados
- baseline de citacao em IA registrado com data, modelos e o conjunto fixo de prompts
- calendario dimensionado contra capacidade **real**, com dono por item
- fila de refresh com cota mensal reservada
- toda pagina de conversao com pelo menos um link interno de entrada (nenhuma orfa)
- plano de metricas com as 5 da Fase 6, incluindo o que **nao** e atribuivel

## Handoff

- **SEO Specialist (14):** recebe a pauta priorizada; executa schema, meta, llms.txt, marcacao de FAQ e checagem de renderizacao
- **Marketing Copy (13):** recebe a pauta de pagina de conversao e servico
- **Direct Response Copy (50):** recebe a pauta de newsletter, social e anuncio
- **Blog Publisher (41):** publica o artigo aprovado
- **Closed-Loop Revenue (59):** instrumenta origem → conversao → receita
- **Data Analytics (21):** nomeia os eventos do funil de conteudo
- **UX Research (51):** conduz a entrevista quando a pauta exige pesquisa primaria
- **Image Generator (17):** produz OG card e ilustracao do artigo

## Integracao com Pipeline

- **Orchestrator (09):** aciona esta skill quando a tarefa e de aquisicao por conteudo, antes de qualquer skill de copy
- **Context Manager (08):** mantem o calendario e a fila de refresh entre sessoes — o plano e de 6 meses, nao cabe numa sessao
- **Documenter (10):** versiona os artefatos de estrategia em `content/strategy/`
- **Reviewer (11):** valida que nenhum conteudo saiu sem autor real, schema e link interno de entrada
