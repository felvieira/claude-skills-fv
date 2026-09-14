# Visão geral do repositório

Leitura estática de quatorze arquivos: dez arquivos de código do núcleo MCP, proteção de ferramentas, entrypoint e schema de template, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

Este repositório é o Dev Team Kit: um kit de skills, comandos e um servidor MCP para apoiar agentes de coding em tarefas de desenvolvimento.

## O que é e para que serve

Ele organiza especialistas e ferramentas reutilizáveis para descoberta, implementação, testes, segurança, documentação, inteligência de sessão e integração com serviços auxiliares. O pacote principal executável identificado no código é o servidor MCP em mcp-server/.

**Público ou consumidor identificado:** Agentes compatíveis com MCP e equipes que usam o kit para conduzir tarefas de software com governança e etapas especializadas.

## Tecnologias

| Tecnologia | Versão | Papel | Evidência |
|---|---|---|---|
| Node.js | >=18 | Runtime do pacote MCP e execução do entrypoint compilado. | [evidence: mcp-server/package.json:46-46] |
| TypeScript | ^5.7.0 | Linguagem e compilador do servidor MCP. | [evidence: mcp-server/package.json:39-39], [evidence: mcp-server/package.json:11-11] |
| Model Context Protocol SDK | ^1.12.1 | Cria o servidor MCP e expõe ferramentas ao agente. | [evidence: mcp-server/package.json:32-32], [evidence: mcp-server/src/index.ts:3-3] |
| Zod | ^3.24.0 | Biblioteca declarativa de schemas/validação usada pelo servidor. | [evidence: mcp-server/package.json:35-35], [evidence: mcp-server/src/index.ts:5-5] |
| ES Modules + Node16 | ES2022 | Configuração de módulo, resolução e alvo de compilação TypeScript. | [evidence: mcp-server/package.json:9-9], [evidence: mcp-server/tsconfig.json:3-3], [evidence: mcp-server/tsconfig.json:4-4] |
| Next.js + React + Tailwind | Next 15.3.2 / React 19 / Tailwind 4.1.7 | Stack do template web stack-default; é template de aplicação, não o runtime principal do MCP. | [evidence: templates/stack-default/apps/web/package.json:22-22], [evidence: templates/stack-default/apps/web/package.json:23-23], [evidence: templates/stack-default/apps/web/package.json:38-38] |
| Playwright | 1.44 | Dependência do benchmark A/B em bench/ab; não foi tratado como executor do servidor MCP. | [evidence: bench/ab/package.json:13-13] |

## Pontos de entrada

| Entrada | Papel | Evidência |
|---|---|---|
| dev-team-kit-mcp | Binário publicado que aponta para dist/index.js. | [evidence: mcp-server/package.json:7-7] |
| mcp-server/src/index.ts | Inicializa o McpServer, registra as ferramentas e conecta transporte stdio. | [evidence: mcp-server/src/index.ts:61-61], [evidence: mcp-server/src/index.ts:1505-1506] |
| skills/ e .claude/commands/ | Superfícies do kit consumidas como skills e comandos do agente; a ligação completa não foi revisada nesta amostra. | [evidence: mcp-server/package.json:4-4] |

## Comandos úteis

| Comando | Finalidade | Evidência |
|---|---|---|
| npm run build | Compila TypeScript para dist. | [evidence: mcp-server/package.json:11-11] |
| npm start | Inicia o entrypoint compilado do servidor MCP. | [evidence: mcp-server/package.json:13-13] |
| npm test | Executa os testes compilados de deduplicação, manifesto e roteador de plugins. | [evidence: mcp-server/package.json:14-14] |

## Estrutura relevante

| Caminho | Papel | Evidência |
|---|---|---|
| mcp-server/src/index.ts | Bootstrap do servidor MCP e registro das ferramentas. | [evidence: mcp-server/src/index.ts:61-61], [evidence: mcp-server/src/index.ts:1505-1505] |
| mcp-server/src/services/ | Serviços auxiliares, incluindo leitura de arquivos, busca, scraping, geração de imagem e instruções de browser. | [evidence: mcp-server/src/index.ts:8-8], [evidence: mcp-server/src/index.ts:9-9], [evidence: mcp-server/src/index.ts:11-11], [evidence: mcp-server/src/index.ts:12-12] |
| mcp-server/src/lib/ | Bibliotecas internas de classificação, pipelines, contexto, compressão, eventos e roteamento. | [evidence: mcp-server/src/index.ts:15-15], [evidence: mcp-server/src/index.ts:16-16] |
| templates/stack-default/apps/web/ | Template separado para iniciar aplicações web com Next.js, React e Tailwind. | [evidence: templates/stack-default/apps/web/package.json:2-2] |

## Limites

- O propósito geral foi sintetizado a partir do manifesto e dos pontos de entrada revisados; a matriz completa de 73 skills não foi relida nesta execução.
- Não foi executado npm install, npm run build ou npm test do mcp-server nesta rodada; os comandos acima são declarados pelo package.json.
- Versões do template e do benchmark são componentes auxiliares e não devem ser confundidas com a stack do servidor MCP.
