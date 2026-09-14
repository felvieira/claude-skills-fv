# claude-skills-fv — documentação do código

Leitura estática de quatorze arquivos: dez arquivos de código do núcleo MCP, proteção de ferramentas, entrypoint e schema de template, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

- [Visão geral do repositório](./overview.md)
- [Arquitetura e organograma](./architecture.md)
- [Workflows e fluxos](./workflows.md)
- [Boundaries e contratos](./boundaries.md)
- [Banco de dados](./database.md)
- [Verificação de execução](./verification.md)
- [Regras de negócio e comportamento](./business-rules.md)
- [Segurança](./security.md)
- [Automações](./automations.md)
- [RPA](./rpa.md)
- [Melhorias do repositório](./improvements.md)
- [Módulos centrais](./modules/index.md)
- [modules/mcp-entrypoint.md](./modules/mcp-entrypoint.md)
- [modules/pipeline-engine.md](./modules/pipeline-engine.md)
- [modules/file-reader.md](./modules/file-reader.md)
- [modules/permission-guard.md](./modules/permission-guard.md)

## Cobertura

14 arquivos lidos e revisados semanticamente de 224 fontes inventariadas. 14 achados documentados; 15 nós de arquitetura, 3 workflows, 4 boundaries e 4 módulos centrais. Pastas ocultas são excluídas antes da leitura.

## Snapshot

- HEAD: 696db09fbe94933af5e8cd925278ef76d3f8b8c2
- Working tree hash: 7bba3ed55be51ade23855415d80542bcca8df27ce1d26b5ccc13718138365d69
- Modo: Full

## Lacunas

- Cobertura parcial: apenas os treze arquivos listados foram revisados semanticamente. O inventário do restante não equivale a leitura humana/por agente.
- Nenhum fluxo de autenticação, deploy ou RPA foi executado em produção.
- Produto, UX/acessibilidade, infraestrutura/deploy, banco de dados e observabilidade fora dos trechos citados continuam pendentes; não foram preenchidos com recomendações genéricas.
- Propostas de melhoria são inferências rastreáveis, não alterações autorizadas nos módulos auditados.
