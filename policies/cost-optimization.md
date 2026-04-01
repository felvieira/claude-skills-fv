# Cost Optimization Policy

## Objetivo
Maximizar eficiencia de tokens, cache e API calls para reduzir custo real sem sacrificar qualidade de entrega.

## Prompt Caching

- Manter sessoes continuas e longas — nao fechar/reabrir sem necessidade
- Evitar /clear a menos que o contexto esteja poluido demais
- CLAUDE.md bem escrito carrega uma vez e fica em cache — investir nele
- Nao trocar de branch/projeto no meio da sessao sem necessidade
- Pausas > 5 min invalidam cache — agrupar trabalho em blocos continuos

## Reducao de Tokens por Requisicao

- Dar contexto especifico: "edite linhas 30-40 de X" em vez de "melhore o arquivo X"
- Usar Glob/Grep antes de Read — encontrar o arquivo certo antes de ler
- Ler apenas o trecho necessario (offset + limit) em arquivos grandes
- Nao pedir "explique o que voce fez" — o diff ja mostra
- Reutilizar `docs/repo-audit/current.md` antes de reexplorar o repo inteiro
- Pedir resultados concisos quando possivel: "responda em 3 bullets"

## Rate Limit e Retry

- Nao disparar muitos subagents simultaneos — cada um consome cota separada
- Evitar loops de retry em erros de rate limit — esperar e tentar uma vez
- Usar modelo mais barato pra tasks simples (haiku pra boilerplate, sonnet pra implementacao, opus pra arquitetura)
- Batch operacoes: um commit com 5 arquivos em vez de 5 commits separados
- Usar /compact antes do contexto estourar — nao esperar o auto-compact

## API Calls Externas (fal.ai, Brave, Firecrawl)

- Brave Search: agrupar queries relacionadas em uma unica busca quando possivel
- fal.ai: gerar variacoes em batch, nao uma por uma
- Firecrawl: usar Playwright (gratuito) como fallback pra scraping simples
- Nao repetir chamada de API que ja retornou resultado valido — cachear no artefato

## Selecao de Modelo (LLM Selector)

- Fast (haiku): rename, boilerplate, microcopy, formatacao
- Balanced (sonnet): implementacao, debug, design, testes
- Deep (opus): arquitetura, security, orquestracao, decisoes complexas
- Nao usar Deep pra tasks que Balanced resolve — custo 5x maior

## Metricas de Alerta

Sinais de que o custo esta alto demais:
- contexto > 100k tokens sem /compact
- mais de 3 subagents simultaneos
- mesmo arquivo sendo lido 3+ vezes na mesma sessao
- retry loop em rate limit
- geracao de imagem sem briefing claro (gera lixo e regera)

## Anti-patterns

- "analise todo o projeto" sem escopo definido
- ler arquivo inteiro pra editar 2 linhas
- disparar subagent pra task que resolve com um Grep
- pedir explicacao longa do que foi feito (ver diff)
- reexplorar repo quando audit existe e esta atual
- gerar moodboard sem estrategia definida (desperdiça calls do fal.ai)
