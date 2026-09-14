# Módulos centrais

Leitura estática de quatorze arquivos: dez arquivos de código do núcleo MCP, proteção de ferramentas, entrypoint e schema de template, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

Deep dives dos módulos centrais revisados, selecionados por papel no entrypoint, fan-in aparente e impacto de segurança/execução.

- [MCP server entrypoint](./mcp-entrypoint.md) — Inicializa configuração, registra ferramentas MCP e conecta o transporte stdio.
- [Pipeline engine](./pipeline-engine.md) — Transforma o tipo de tarefa em configuração ordenada de etapas.
- [File reader](./file-reader.md) — Lê arquivos permitidos e monta snippets para as ferramentas do kit.
- [Permission ladder guard](./permission-guard.md) — Classifica comandos Bash em lanes de permissão e retorna decisão ao hook.

## Lacunas

- O deep dive ainda não cobre todos os módulos com alto fan-in do pacote MCP.
- Owners não foram preenchidos porque não há evidência de ownership no recorte revisado.
