---
scenario: 07-deploy-docker
pass: baseline
version: v2-reeval
model: claude-sonnet-4-6
tokens_in_approx: 320
tokens_out_approx: 1650
time_seconds: 28
quality_score: 3.0
quality_breakdown:
  specificity: 3
  completeness: 4
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "cold generic response — covers multi-stage Dockerfile and basic healthcheck but: no nginx reverse proxy config, no SSL/Let's Encrypt setup, no .last-tag rollback pattern, no idempotent ssl-init.sh, no env var template, no rate limiting, no security headers, rollback script uses hardcoded container name inspection which is fragile"
---

# Pass A — Generic Cold Response (no skill)

## Estrutura de arquivos sugerida

```
myapp/
├── Dockerfile
├── docker-compose.yml          # dev
├── docker-compose.prod.yml     # prod
├── .dockerignore
└── scripts/
    └── rollback.sh
```

## Multi-stage Dockerfile (otimizado)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

## docker-compose.yml (dev)

```yaml
version: "3.9"
services:
  app:
    build:
      context: .
      target: builder
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: mydb
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  pg_data:
  redis_data:
```

## Health check endpoint

```ts
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({ status: "ok" });
}
```

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
```

## Rollback automático (básico)

```bash
#!/bin/bash
# scripts/deploy.sh
set -e
IMAGE_NEW="myapp:$(git rev-parse --short HEAD)"
IMAGE_PREV=$(docker inspect myapp_app --format '{{.Config.Image}}' 2>/dev/null || echo "")
docker build -t "$IMAGE_NEW" .
docker-compose -f docker-compose.prod.yml up -d --no-deps app
sleep 30
if ! curl -sf http://localhost:3000/api/health; then
  echo "Deploy falhou — revertendo para $IMAGE_PREV"
  docker-compose -f docker-compose.prod.yml up -d --no-deps app
  exit 1
fi
echo "Deploy bem-sucedido: $IMAGE_NEW"
```

## Checklist de produção

- [ ] .dockerignore inclui node_modules, .git, .env, coverage
- [ ] Secrets via variáveis de ambiente
- [ ] restart: unless-stopped nos serviços críticos
- [ ] Volumes nomeados para persistência de dados
- [ ] Health checks em todos os serviços
- [ ] Script de deploy com rollback automático testado

---

## Critérios não cobertos (gaps vs skill v2.10.1)

| Gap | Impacto |
|---|---|
| Sem nginx + TLS config | Operador tem de descobrir SSL por conta própria |
| Sem ssl-init.sh idempotente | Primeiro deploy falha se certbot ainda não rodou |
| Sem .last-tag persist | Rollback manual exige saber a tag anterior |
| Sem security headers | HSTS, X-Frame-Options, CSR ausentes |
| Sem rate limiting nginx | API exposta sem throttle |
| Sem env var template | Operador descobre vars na tentativa-e-erro |
| Sem checklist pré-deploy | Gate de qualidade ausente |
| Redis sem auth | Redis exposto sem senha em dev |
| Healthcheck verifica só HTTP, não DB+Redis | False positive em health check |
