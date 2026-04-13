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

## Integração

- `policies/search-first.md` — pesquisa é Trusted, memória é Verify
- `policies/source-driven.md` — decisões de framework exigem fontes Trusted
- `policies/iterative-retrieval.md` — cada round de retrieval eleva trust do resultado
