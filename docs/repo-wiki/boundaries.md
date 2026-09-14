# Boundaries e contratos

Leitura estática de quatorze arquivos: dez arquivos de código do núcleo MCP, proteção de ferramentas, entrypoint e schema de template, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

Os boundaries observados se concentram no transporte MCP, no binário Node e na entrada de comandos do hook. Contratos HTTP externos exigem revisão adicional de cada service.

| Boundary | Tipo | Interface | Auth | Entrada | Saída | Erros | Confiança | Evidência |
|---|---|---|---|---|---|---|---|---|
| Servidor MCP ↔ cliente | transport | StdioServerTransport conectado por server.connect(transport) | Não documentada neste transporte; autorização de ferramentas é uma preocupação separada. | Mensagens MCP recebidas no stdio. | Respostas e resultados das ferramentas MCP no stdio. | Falha em main registra erro e termina com exit 1. | observed | [evidence: mcp-server/src/index.ts:1505-1506] |
| devkit_route_task | mcp-tool | Ferramenta MCP registrada com description e project_context opcionais. | Nenhum mecanismo de autenticação foi observado no registro desta ferramenta. | Descrição da tarefa e contexto opcional do projeto. | Tipo de tarefa, etapas do pipeline e composição de plugins. | O contrato completo de erros do classifier/plugin-router não foi revisado nesta amostra. | observed | [evidence: mcp-server/src/index.ts:70-71] |
| dev-team-kit-mcp | cli | Binário npm que aponta para dist/index.js. | Nenhuma autenticação no launcher; services podem exigir env vars. | Execução do binário e mensagens MCP no processo. | Servidor MCP compilado. | Erros de compilação ou inicialização impedem o processo. | observed | [evidence: mcp-server/package.json:7-7] |
| Arquivos de ambiente | configuration | loadEnvFile lê .env.local e .env no projeto e no KIT_ROOT. | Valores são credenciais potenciais e não devem ser publicados. | Arquivos de ambiente e process.env. | Variáveis disponíveis para services. | Falhas de leitura são capturadas e seguem para o próximo arquivo/base. | observed | [evidence: mcp-server/src/index.ts:35-35] |

## Lacunas

- Os endpoints Brave, Firecrawl e FAL aparecem no código, mas seus services não foram incluídos na revisão semântica deste snapshot.
- Não há exemplos de request/response MCP completos nem matriz de erros por ferramenta.
