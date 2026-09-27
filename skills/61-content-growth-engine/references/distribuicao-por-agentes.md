# Distribuição Orgânica na Era dos Agentes — Cardápio de Apostas

Carregar quando o pedido for crescimento sem anúncio para app ou SaaS indie, "quero que o ChatGPT
recomende meu app", QR code como canal, build in public, ou um plano de apostas de distribuição com
prazo para matar o que não dá sinal.

Diferença para o resto desta skill: as Fases 1–6 tratam **conteúdo como motor de aquisição B2B**
(pauta, cluster, refresh, receita). Este arquivo trata **distribuição como carteira de apostas
baratas**, com viés para o canal novo: o agente que responde "qual app de X". A marcação técnica
(schema, llms.txt, passagem citável de 134–167 palavras) continua na skill 14.

Pré-requisito: sem aha, citação em IA vira curiosidade. Se o produto ainda não tem evento de
ativação claro, resolver na skill 73 antes.

## Premissa

O usuário pergunta ao agente "qual app de X". Se o produto não é citável (nome claro, site que
responde a pergunta, link que não quebra, valor mínimo sem login), ele não existe nesse canal.

Três superfícies de descoberta orgânica:
1. humanos em comunidades
2. Google e lojas de app
3. agentes e respostas geradas

## Passo 0 — Consulta-alvo

Antes de qualquer aposta, escrever as três frases que o usuário faria:
- "Qual o melhor app de [job] para [persona] em [contexto]?"
- "App grátis de [job] sem cadastro"
- "Como fazer [job] no celular agora"

Site, listing da loja e páginas existem para ser a resposta dessas frases.

## As 10 apostas

| # | Aposta | Custo | Hipótese | Regra que não pode faltar |
|---|---|---|---|---|
| 1 | agentes recomendando o app | grátis | conteúdo e listing citáveis fazem ChatGPT/Claude/Grok/Perplexity indicarem o produto | página `/for-ai`, job no título do listing, link universal que detecta o device, valor mínimo sem login |
| 2 | swarm de páginas SEO/AEO | grátis | dezenas de páginas específicas capturam cauda longa humana e citação de LLM | 1 URL = 1 pergunta; resposta nas primeiras 80 palavras; tabela ou dado primário; nunca 50 páginas com o mesmo H1 |
| 3 | artefato compartilhável + QR | grátis | o usuário cria algo (plano, card, relatório) e manda pra outra pessoa | o artefato é útil fora do app; QR único por campanha; destino = web com valor mínimo, nunca loja seca |
| 4 | cartaz físico com QR | pago pequeno | o job acontece num lugar (evento, escritório, academia) | 1 QR por ponto; promessa em 4 palavras + "grátis"; destino abre em menos de 3s |
| 5 | memes e recortes nativos | grátis | conteúdo da comunidade com menção na bio/comentário, não no primeiro frame | responder pergunta real; 1 em 10 posts aponta pro artefato |
| 6 | lojas Android alternativas | grátis | público fora da Play instala se o APK/listing existir | só se o app for assinável e atualizável nesses canais |
| 7 | superfície de recall diário | grátis/barato | widget, menu bar, complicação: o nome volta todo dia sem push | mostrar 1 número útil, não propaganda |
| 8 | comunidades com regra de ouro | grátis | Reddit/Discord/grupos convertem se você é útil 10x e cita 1x | sem link no post de estreia; grupo próprio só depois de densidade (ver skill 82) |
| 9 | search ads da loja | pago | compra a palavra que o agente também lê | usar quando o nome é novo; campanha de marca + 1 job |
| 10 | tela digital local | pago | elevador, academia, condomínio com CPM previsível | só com QR rastreável e destino rápido |

Escolher de 5 a 10, maioria grátis. Para cada uma: hipótese, artefato, evento de tracking, custo,
prazo de leitura.

## Prompts para o time produzir as peças

Página `/for-ai`:
```
Escreva uma página /for-ai em markdown para o app [NOME].
Job em 1 frase. Para quem é. O que faz em 30 segundos. O que NÃO faz.
Cadastro? Preço? Plataformas? Link universal.
FAQ com as 10 perguntas que um agente faria antes de recomendar.
Tom factual, sem adjetivo de marketing. Cada afirmação verificável no produto.
```

Swarm de páginas:
```
Gere 30 títulos de página para [APP], cada um = 1 pergunta de busca/agente.
Depois escreva a página 1 completa:
- resposta direta no 1º parágrafo
- tabela ou lista com dado real
- seção "como fazer no app" com 4 passos
- FAQ de 5 itens
- CTA com o link universal
```

Teste de recomendação (rodar em cada modelo, sessão limpa, mesmo protocolo da Fase 1.5):
```
Você é um agente que recomenda apps. O usuário perguntou: "[CONSULTA]".
Liste 3 opções. Para cada uma, diga por que serve, se precisa de cadastro, e o link.
```

Comunidade:
```
Liste 15 perguntas reais que aparecem em [comunidade] sobre [JOB].
Para cada uma, escreva uma resposta útil de 80–120 palavras que funcionaria sem o app.
No último parágrafo, 1 linha honesta: "eu uso [APP] para isso porque [fato]".
```

Todo texto publicado passa por `/humanize` (mesma regra do resto da skill).

## Checklist de produto citável

- nome pronunciável e único
- job no primeiro parágrafo do site e do listing
- valor mínimo sem conta (o agente e o QR morrem no login)
- link universal que não quebra no desktop
- FAQ que um modelo consegue citar
- página que responde a consulta-alvo em menos de 200 palavras

## Painel mínimo

| Sinal | Fonte |
|---|---|
| installs por origem | App Store Connect, Play Console, UTM |
| scans de QR | encurtador próprio, 1 código por ponto |
| cliques no artefato web | analytics |
| citações em IA | protocolo da Fase 1.5, semanal |
| recall | uso diário do widget/menu bar |

Regra de corte: ler cada aposta em 14 dias. Matar as sem sinal, dobrar as que geram citação ou
scan. Não otimizar copy de anúncio enquanto as apostas 1 e 2 não existem.

## Build in public

- 1 atualização por semana: o que testou, o número, o que matou
- painel real, não métrica de vaidade
- nunca inflar número (1,5 mil não vira 15 mil)

## Não fazer

- spam em Reddit ou grupos com link cru
- comprar avaliação ou mentir número de installs
- páginas de porta (50 páginas iguais trocando só o nome da cidade)
- depender de um único deep link que o agente pode alucinar
- pedir login antes do valor mínimo
- QR ou marca d'água em artefato sem utilidade para quem recebe ou sem consentimento de quem compartilha

## Fonte

Adaptado da skill `ai-organic-growth` de um pacote consolidado pelo usuário (set/2026), que resume o
experimento público da Bola 2026 (Tech Mentor Maria, "15000 Installs on Day One", 10 apostas: 8
grátis, 2 pagas). Os números do caso não foram verificados e não servem de meta.
