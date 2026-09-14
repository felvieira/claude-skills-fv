# claude-skills-fv — documentação do código

Leitura estática de treze arquivos: nove arquivos de código do núcleo MCP, proteção de ferramentas e entrypoint, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

- [Visão geral do repositório](./overview.md)
- [Arquitetura e organograma](./architecture.md)
- [Regras de negócio e comportamento](./business-rules.md)
- [Segurança](./security.md)
- [Automações](./automations.md)
- [RPA](./rpa.md)
- [Melhorias do repositório](./improvements.md)

## Cobertura

13 arquivos lidos e revisados semanticamente de 224 fontes de código inventariadas. 14 achados documentados; visão geral: 7 tecnologias e 3 entradas; arquitetura: 15 nós e 7 relações. Pastas ocultas são excluídas antes da leitura.

## Lacunas

- Cobertura parcial: apenas os treze arquivos listados foram revisados semanticamente. O inventário do restante não equivale a leitura humana/por agente.
- Nenhum fluxo de autenticação, deploy ou RPA foi executado em produção.
- Produto, UX/acessibilidade, infraestrutura/deploy, banco de dados e observabilidade fora dos trechos citados continuam pendentes; não foram preenchidos com recomendações genéricas.
- Propostas de melhoria são inferências rastreáveis, não alterações autorizadas nos módulos auditados.
