# claude-skills-fv — documentação do código

Leitura estática de oito arquivos de código: núcleo MCP, proteção de ferramentas e snippets de referência. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

- [Regras de negócio e comportamento](./business-rules.md)
- [Segurança](./security.md)
- [Automações](./automations.md)
- [RPA](./rpa.md)
- [Melhorias do repositório](./improvements.md)

## Cobertura

8 arquivos lidos e revisados semanticamente de 218 fontes de código inventariadas. 14 achados documentados. Pastas ocultas são excluídas antes da leitura.

## Lacunas

- Cobertura parcial: apenas os oito arquivos listados foram revisados semanticamente. O inventário do restante não equivale a leitura humana/por agente.
- Nenhum fluxo de autenticação, deploy ou RPA foi executado em produção.
- Produto, UX/acessibilidade, infraestrutura/deploy, banco de dados e observabilidade fora dos trechos citados continuam pendentes; não foram preenchidos com recomendações genéricas.
- Propostas de melhoria são inferências rastreáveis, não alterações autorizadas nos módulos auditados.
