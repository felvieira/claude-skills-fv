# Eval - Content Growth Engine: priorizacao por intencao, nao por volume

## Objetivo

Validar que o plano de conteudo e ordenado por **intencao comercial e capacidade real**, nao por volume de busca e desejo. Este e o eval do erro que mata programa de conteudo: escolher a pauta mais facil de escrever e a de maior volume, e descobrir no mes 6 que nada virou pipeline.

## Entrada

- SaaS B2B de ticket alto, ICP = diretor de operacoes em industria de medio porte
- lista de termos com volume: `o que e automacao industrial` (12.000/mes), `software de manutencao preditiva vs corretiva` (140/mes), `alternativas ao <concorrente lider>` (90/mes), `tendencias industria 4.0` (8.000/mes)
- time real: 1 pessoa de conteudo em meio periodo, especialista de produto com 2h/semana
- pedido do usuario: "12 artigos por mes, 3 posts de LinkedIn do CEO por semana, 1 post por dia da empresa e newsletter quinzenal"
- site atual: 1 pagina institucional generica, nenhuma pagina por servico, sem pagina de precos
- 40 artigos publicados nos ultimos 2 anos, varios com dado de 2023

## Esperado

- os dois termos de **menor volume** (`vs` e `alternativas a`) sao priorizados acima dos dois de maior volume, com a razao declarada: intencao comercial
- a pauta comeca por **pagina de servico e de segmento**, nao por artigo de topo — o site nao tem onde converter
- o volume prometido e **confrontado com a capacidade real** e reduzido explicitamente, com o trade-off nomeado (menos artigos, mais profundidade)
- LinkedIn do CEO so entra se houver processo de captura da voz real; caso contrario, e cortado ou reduzido com a razao dita
- Instagram nao entra sem evidencia de que e canal de compra do ICP
- **cota de refresh reservada** para os 40 artigos existentes antes de somar volume novo
- baseline de citacao em IA definido com conjunto **fixo** de prompts, sessao limpa e registro de data/modelo
- metricas finais excluem sessao total; incluem receita gerada/influenciada e citacao em IA
- handoff explicito: marcacao/schema vai para a skill 14, copy para a 13/50, publicacao para a 41, instrumentacao de receita para a 59

## Evidencias Minimas

- tabela de priorizacao mostrando intencao por termo **e** a fonte do termo (call, ticket, Search Console) — nao so o volume
- calendario com dono por item e total mensal que cabe na capacidade declarada
- fila de refresh com criterio de ordenacao explicito
- lista dos prompts do baseline de IA, versionada, com data
- declaracao do que **nao** e atribuivel (trafego de IA sem referrer) em vez de numero fabricado

## Reprova Se

- ordena a pauta por volume de busca, ou usa volume como criterio principal de escolha
- comeca pelo conteudo informacional generico porque "traz mais trafego"
- aceita as 12 pecas/mes + 3 posts/semana + 1 post/dia sem confrontar com a capacidade informada
- produz calendario de conteudo novo sem reservar cota para atualizar os 40 artigos existentes
- trata `dateModified` como item de checklist sem exigir mudanca real de conteudo
- propoe ebook como material rico
- inclui Instagram por default em B2B de ticket alto
- lista "sessoes" ou "pageviews" como metrica de sucesso de 6 meses
- promete resultado de SEO/autoridade em 30 dias
- mede citacao em IA uma vez, sem conjunto fixo de prompts, ou muda os prompts entre as medicoes (invalida a serie)
- reimplementa schema/meta/llms.txt em vez de delegar a skill 14
- escreve comparativo em que o proprio produto vence em todos os criterios
- entrega o plano sem passar a prosa por `/humanize`
