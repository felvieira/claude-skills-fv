# MCP server entrypoint

**Caminho:** mcp-server/src/index.ts

## Propósito

Inicializa configuração, registra ferramentas MCP e conecta o transporte stdio.

## Entradas e saídas

- **Entradas:** Payloads MCP, project context e variáveis de ambiente.
- **Saídas:** Resultados de ferramentas e processo MCP conectado.

## Dependências

McpServer, StdioServerTransport, Zod, services e libs internas.

## Testes

Build e testes compilados do pacote foram executados localmente; cobertura por ferramenta não foi medida.

## Riscos

Arquivo grande concentra registro e composição de muitas ferramentas; falhas de inicialização afetam todo o servidor.

## Evidências

[evidence: mcp-server/src/index.ts:61-61]
