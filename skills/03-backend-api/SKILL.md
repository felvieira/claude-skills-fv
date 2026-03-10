---
name: backend-api
description: |
  Skill do Backend Developer para definição de APIs, banco de dados, e lógica de servidor. Use quando 
  precisar definir schemas de banco, endpoints REST/GraphQL, validação server-side, autenticação, 
  migrations, ou qualquer lógica de backend. Trigger em: "API", "endpoint", "banco de dados", "schema",
  "migration", "backend", "servidor", "autenticação", "JWT", "middleware", "ORM", "Prisma", "PostgreSQL",
  "Node.js", "Express", "NestJS", "validação server-side".
---

# Backend Developer - API e Banco de Dados

O Backend define a fundação de dados e lógica de negócio que sustenta toda a aplicação.

## Responsabilidades

1. Definir schema do banco de dados
2. Criar APIs RESTful (ou GraphQL quando justificado)
3. Implementar autenticação e autorização
4. Validação server-side de todos os inputs
5. Tratamento de erros padronizado
6. Performance: queries otimizadas, caching, indexação

## Stack Padrão

```
Runtime:     Node.js (LTS)
Framework:   Express / NestJS (dependendo da complexidade)
ORM:         Prisma
Banco:       PostgreSQL
Validação:   Zod
Auth:        JWT (access + refresh) com HttpOnly cookies
Cache:       Redis (quando necessário)
Documentação: OpenAPI/Swagger auto-gerado
```

## Schema do Banco - Convenções

**prisma/schema.prisma**

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  role      Role     @default(USER)
  isActive  Boolean  @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?

  posts     Post[]
  sessions  Session[]
  
  @@map("users")
  @@index([email])
  @@index([deletedAt])
}

enum Role {
  USER
  ADMIN
  MODERATOR
}

model Session {
  id           String   @id @default(uuid())
  userId       String
  refreshToken String   @unique
  userAgent    String?
  ip           String?
  expiresAt    DateTime
  
  createdAt    DateTime @default(now())
  
  user         User     @relation(fields: [userId], references: [id])
  
  @@map("sessions")
  @@index([userId])
  @@index([expiresAt])
}
```

Convenções:
- Nomes de tabela: `snake_case` plural (via `@@map`)
- Nomes de campo: `camelCase` no Prisma
- IDs: UUID v4 (nunca auto-increment exposto)
- Timestamps: sempre `createdAt` + `updatedAt`
- Soft delete: `deletedAt` nullable
- Índices: em todo campo usado em WHERE/JOIN/ORDER BY

## API - Padrão de Resposta

Toda resposta da API segue este formato:

Sucesso:

```typescript
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Erro:

```typescript
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email inválido",
    "details": [
      {
        "field": "email",
        "message": "Formato de email inválido"
      }
    ]
  }
}
```

## API - Padrão de Endpoints

```
GET    /api/v1/resources          → Lista (com paginação, filtro, sort)
GET    /api/v1/resources/:id      → Detalhe
POST   /api/v1/resources          → Criar
PATCH  /api/v1/resources/:id      → Atualizar parcial
DELETE /api/v1/resources/:id      → Soft delete

POST   /api/v1/auth/register      → Registro
POST   /api/v1/auth/login         → Login (retorna access token, seta refresh cookie)
POST   /api/v1/auth/refresh       → Refresh token
POST   /api/v1/auth/logout        → Logout (invalida session)
GET    /api/v1/auth/me            → Usuário logado
```

Query params para listagem:
```
?page=1&perPage=20           → Paginação
?sort=createdAt&order=desc   → Ordenação
?search=termo                → Busca fulltext
?filter[status]=active       → Filtros
?include=author,comments     → Relations
```

## Autenticação - Fluxo Completo

```
Login:
1. POST /auth/login { email, password }
2. Valida credenciais
3. Gera access token (JWT, 15min, no response body)
4. Gera refresh token (UUID, 7d, HttpOnly cookie)
5. Salva session no banco
6. Retorna { accessToken, user }

Refresh:
1. POST /auth/refresh (cookie com refresh token)
2. Valida refresh token no banco
3. Verifica se session não expirou
4. Gera novo access token
5. Opcionalmente rotaciona refresh token
6. Retorna { accessToken }

Logout:
1. POST /auth/logout (com access token)
2. Remove session do banco
3. Limpa cookie do refresh token
```

## Validação com Zod - Patterns

**src/validators/user.validator.ts**

```typescript
import { z } from 'zod';

const emailSchema = z.string().email('Email inválido').toLowerCase().trim();
const passwordSchema = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Precisa de letra maiúscula')
  .regex(/[0-9]/, 'Precisa de número')
  .regex(/[^A-Za-z0-9]/, 'Precisa de caractere especial');

export const createUserSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2).max(100).trim(),
});

export const updateUserSchema = createUserSchema.partial().omit({ password: true });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Senha obrigatória'),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
```

## Middleware Pattern

**src/middleware/validate.ts**

```typescript
import { ZodSchema } from 'zod';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Dados inválidos',
          details: result.error.issues.map(i => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
      });
    }
    req.validated = result.data;
    next();
  };
};
```

**src/middleware/auth.ts**

```typescript
export const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED' } });
  }
};

export const authorize = (...roles: Role[]) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    }
    next();
  };
};
```

**src/middleware/errorHandler.ts**

```typescript
export const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.code === 'P2002') {
    return res.status(409).json({
      success: false,
      error: { code: 'DUPLICATE', message: 'Registro já existe' },
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Erro interno' : err.message,
    },
  });
};
```

## Service Pattern - DRY

**src/services/base.service.ts**

```typescript
export const createBaseService = <T>(model: any) => ({
  async findMany(params: PaginationInput & { where?: any }) {
    const { page, perPage, sort, order, search, ...filters } = params;
    const skip = (page - 1) * perPage;
    
    const where = { deletedAt: null, ...filters.where };
    
    const [data, total] = await Promise.all([
      model.findMany({
        where,
        skip,
        take: perPage,
        orderBy: sort ? { [sort]: order } : { createdAt: 'desc' },
      }),
      model.count({ where }),
    ]);
    
    return {
      data,
      meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    };
  },
  
  async findById(id: string) {
    return model.findFirst({ where: { id, deletedAt: null } });
  },
  
  async create(data: Partial<T>) {
    return model.create({ data });
  },
  
  async update(id: string, data: Partial<T>) {
    return model.update({ where: { id }, data });
  },
  
  async softDelete(id: string) {
    return model.update({ where: { id }, data: { deletedAt: new Date() } });
  },
});
```

### Estrategia de Migrations

- Toda migration DEVE ter UP e DOWN (reversivel)
- Zero-downtime migration checklist:
  1. Adicionar coluna nova (nullable ou com default)
  2. Deploy codigo que escreve na coluna nova E antiga
  3. Backfill dados antigos
  4. Deploy codigo que le apenas da coluna nova
  5. Remover coluna antiga em migration separada
- Testar migration em staging ANTES de prod
- Rollback: se migration falha, executar DOWN imediatamente
- NUNCA renomear coluna diretamente — criar nova, migrar dados, remover antiga

## Handoff para Frontend

Entregar:
1. Documentação OpenAPI/Swagger gerada
2. Tipos TypeScript exportados (shared types)
3. Contrato de resposta padronizado
4. Endpoints de autenticação documentados
5. Headers necessários (Authorization, CSRF token, etc.)
6. Rate limits definidos por endpoint
7. Websocket events se houver real-time
8. Variáveis de ambiente necessárias no front

## Código Limpo

Todo código gerado DEVE ser livre de comentários.
Nomes descritivos substituem comentários. Código auto-explicativo.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
