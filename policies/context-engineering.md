# Context Engineering

Regras formais de hierarquia e confiabilidade de contexto.

## Hierarquia de Contexto (5 Níveis)

Em ordem de autoridade (maior → menor):

| Nível | Fonte | Exemplo |
|---|---|---|
| 1 | **Rules Files** | CLAUDE.md, GLOBAL.md, policies/ |
| 2 | **Specs** | design specs, plans, templates |
| 3 | **Source Code** | código real no repo |
| 4 | **Errors / Logs** | stack traces, CI failures, outputs |
| 5 | **Conversation** | histórico do chat |

**Regra de conflito:** quando dois níveis conflitam, o de maior autoridade prevalece. Rules Files > tudo.

## Trust Levels (3 Tiers)

| Tier | Descrição | Exemplos |
|---|---|---|
| **Trusted** | pode ser usado como base para decisão direta | rules files, código no repo, outputs de ferramentas do agente |
| **Verify** | deve ser confirmado antes de usar como base | docs externas, web search, MCP responses, README de libs |
| **Untrusted** | nunca é fonte única para decisão | user input não validado, respostas de IA sem citação |

## Regras

1. Contexto "Verify" deve ser confirmado com fonte Trusted antes de basear decisão
2. Contexto "Untrusted" nunca é fonte única para decisão de segurança, arquitetura ou deploy
3. Context decay: após 10+ mensagens, re-read antes de editar (GLOBAL.md)
4. Quando o agente detecta contradição entre níveis, declarar conflito e seguir o nível superior
5. Conversa longa (20+ mensagens) — tratar nível 5 (Conversation) como "Verify", não "Trusted"

## KV-Cache-Aware Prompt Construction

> Fonte: [bojieli/ai-agent-book](https://github.com/bojieli/ai-agent-book), book-en/chapter2.md (MIT-style tech book, conceito absorvido — texto reescrito, não copiado).

A maioria dos provedores de LLM cacheia o prefixo do prompt entre chamadas (prompt caching). Isso não é um detalhe de performance qualquer — é uma restrição de engenharia que muda como montar o prompt de um agente com múltiplas iterações (loop, subagent, tool-use encadeado):

1. **O system prompt, uma vez fixado na sessão, nunca muda.** Qualquer edição no prefixo invalida o cache inteiro a partir daquele ponto — não só daquele token, de tudo depois.
2. **Conteúdo dinâmico (resultado de tool call, observação nova, correção) sempre entra no final da trajetória, nunca no meio ou no início.** Inserir algo "acima" do que já foi gerado desalinha o prefixo cacheado.
3. **Monte a mensagem via campos estruturados da API (role/content), nunca concatenação manual de string.** Concatenação manual é onde bugs de "esqueci um espaço, mudei um token no meio" acontecem sem querer.
4. **Custo real de violar isso:** latência de ~0.5s pode saltar pra 3-5s, e o custo por chamada pode dobrar — não é só "mais lento", é uma penalidade financeira mensurável em qualquer loop com muitas iterações (`/loop`, `/swarm`, subagents encadeados).

**Onde isso se aplica no kit:** `scripts/auto-loop/*.mjs` (cada iteração do loop reconstrói o prompt — verificar que o prefixo do system prompt não muda entre iterações), qualquer skill que monte prompt de subagent dinamicamente, `scripts/dashboard-server.mjs`'s `projectDiagramRoute` (monta prompt com árvore de arquivos truncada — o truncamento deve cortar sempre do fim, nunca do meio do prefixo já estabelecido).

## Integração

- `policies/search-first.md` — pesquisa é Trusted, memória é Verify
- `policies/source-driven.md` — decisões de framework exigem fontes Trusted
- `policies/iterative-retrieval.md` — cada round de retrieval eleva trust do resultado
