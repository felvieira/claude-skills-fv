# Backend API Guide

Guia de referência para a skill `03-backend-api`. Consultar quando precisar de exemplos extensos de schema, auth, validação ou estratégia de migração.

## Stack Padrão

```
Runtime:      Node.js LTS
Framework:    Express / NestJS
ORM:          Prisma
Banco:        PostgreSQL
Validação:    Zod
Auth:         JWT access (memória) + refresh (HttpOnly cookie)
Cache:        Redis (quando necessário)
Docs:         OpenAPI/Swagger auto-gerado
```

## Convenções de Schema (Prisma)

```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  name      String
  password  String
  role      Role      @default(USER)
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?
  sessions  Session[]
  @@map("users")
  @@index([email])
  @@index([deletedAt])
}
```

- IDs: UUID v4 (nunca auto-increment exposto)
- Timestamps: sempre `createdAt` + `updatedAt`
- Soft delete: `deletedAt` nullable
- Tabelas: `snake_case` plural via `@@map`
- Índices: em todo campo usado em WHERE/JOIN/ORDER BY

## Padrão de Resposta da API

```typescript
// Sucesso
{ "success": true, "data": { ... }, "meta": { "page": 1, "perPage": 20, "total": 100 } }

// Erro
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Email inválido",
  "details": [{ "field": "email", "message": "Formato inválido" }] } }
```

## Padrão de Endpoints

```
GET    /api/v1/resources          → lista com paginação/filtro/sort
GET    /api/v1/resources/:id      → detalhe
POST   /api/v1/resources          → criar
PATCH  /api/v1/resources/:id      → atualizar parcial
DELETE /api/v1/resources/:id      → soft delete

POST   /api/v1/auth/register
POST   /api/v1/auth/login         → retorna access token, seta refresh cookie
POST   /api/v1/auth/refresh
POST   /api/v1/auth/logout
GET    /api/v1/auth/me
```

Query params padrão: `?page=1&perPage=20&sort=createdAt&order=desc&search=termo&filter[status]=active`

## Fluxo de Auth

```
Login:
1. POST /auth/login { email, password }
2. Valida credenciais
3. Gera access token (JWT 15min) → retorna no body
4. Gera refresh token (UUID 7d) → HttpOnly cookie
5. Salva session no banco

Refresh:
1. POST /auth/refresh (cookie automático)
2. Valida refresh token no banco
3. Gera novo access token
4. Rotaciona refresh token (opcional)

Logout:
1. Remove session do banco
2. Limpa cookie do refresh token
```

## Validação com Zod

```typescript
const createUserSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
  name: z.string().min(2).max(100).trim(),
});

const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});
```

## Estratégia de Migrations

Zero-downtime checklist:

1. Adicionar coluna nova (nullable ou com default)
2. Deploy código que escreve na coluna nova E antiga
3. Backfill dados antigos
4. Deploy código que lê apenas da coluna nova
5. Remover coluna antiga em migration separada

Regras:
- Toda migration deve ter UP e DOWN (reversível)
- Testar em staging antes de produção
- NUNCA renomear coluna diretamente — criar nova, migrar dados, remover antiga

## Erros HTTP Padrão

| Código | Code | Situação |
|--------|------|----------|
| 400 | `VALIDATION_ERROR` | dados inválidos no request |
| 401 | `UNAUTHORIZED` | sem token ou token inválido |
| 401 | `TOKEN_EXPIRED` | access token expirado |
| 403 | `FORBIDDEN` | sem permissão para o recurso |
| 404 | `NOT_FOUND` | recurso não existe |
| 409 | `DUPLICATE` | violação de unique constraint |
| 422 | `UNPROCESSABLE` | dados válidos mas regra de negócio falhou |
| 500 | `INTERNAL_ERROR` | erro não tratado |
