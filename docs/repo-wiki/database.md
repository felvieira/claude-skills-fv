# Banco de dados

Leitura estática de quatorze arquivos: dez arquivos de código do núcleo MCP, proteção de ferramentas, entrypoint e schema de template, mais quatro manifestos/configurações auxiliares. Regras operacionais do kit são separadas de exemplos de aplicação; não há afirmação de produto ou RPA implantado.

O template stack-default contém um schema Drizzle/Postgres separado do runtime principal do servidor MCP. O snapshot documenta as tabelas Better Auth visíveis no schema, sem afirmar migrações ou banco implantado.

| Entidade | Tipo | Campos importantes | Relações | Evidência |
|---|---|---|---|---|
| user | Drizzle pgTable | id, name, email, emailVerified, image, createdAt, updatedAt | É referenciada por session e account via userId. | [evidence: templates/stack-default/apps/web/src/db/schema.ts:26-26] |
| session | Drizzle pgTable | id, expiresAt, token, createdAt, updatedAt, ipAddress, userAgent, userId | userId referencia user.id com onDelete cascade. | [evidence: templates/stack-default/apps/web/src/db/schema.ts:36-36] |
| account | Drizzle pgTable | id, accountId, providerId, userId, accessToken, refreshToken, idToken, scope, password, timestamps | userId referencia user.id com onDelete cascade. | [evidence: templates/stack-default/apps/web/src/db/schema.ts:47-47] |
| verification | Drizzle pgTable | id, identifier, value, expiresAt, timestamps | Nenhuma relação explícita foi observada neste schema. | [evidence: templates/stack-default/apps/web/src/db/schema.ts:63-63] |

## Lacunas

- O template não foi tratado como banco do servidor MCP principal.
- Migrações, índices adicionais, queries de domínio e banco de produção não foram executados ou revisados.
