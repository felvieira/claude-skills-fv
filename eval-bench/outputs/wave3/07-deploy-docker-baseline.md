---
scenario: 07-deploy-docker
pass: baseline
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
notes: "covers the big items but stays generic — no env var management, no rollback script, healthcheck intervals vague"
---

# Deploy Node.js + Next.js + Postgres + Redis via Docker

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

---

## Multi-stage Dockerfile (otimizado)

```dockerfile
# ---- Deps stage ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ---- Builder stage ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Runner stage ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copia somente o necessário
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

Pontos de atenção:
- `npm ci --only=production` no stage `deps` evita instalar devDependencies na imagem final.
- O stage `builder` compila o Next.js e descarta ferramentas de build da imagem final.
- Imagem final usa `node:20-alpine` (~50 MB) em vez de `node:20` (~700 MB).

---

## docker-compose.yml (desenvolvimento)

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      target: builder        # usa o stage de dev com devDeps
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/mydb
      - REDIS_URL=redis://redis:6379
    volumes:
      - .:/app               # hot reload
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

---

## Health checks na aplicação

Adicione um endpoint `/api/health` na sua app Next.js:

```ts
// pages/api/health.ts
export default function handler(req, res) {
  res.status(200).json({ status: "ok" });
}
```

E no Dockerfile de produção adicione o healthcheck:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1
```

---

## Rollback automático em falha

### Estratégia com Docker Compose

```bash
#!/bin/bash
# scripts/deploy.sh
set -e

IMAGE_NEW="myapp:$(git rev-parse --short HEAD)"
IMAGE_PREV=$(docker inspect myapp_app --format '{{.Config.Image}}' 2>/dev/null || echo "")

docker build -t "$IMAGE_NEW" .

# Testa health antes de promover
docker run --rm -p 3001:3000 "$IMAGE_NEW" &
PID=$!
sleep 10
if ! curl -sf http://localhost:3001/api/health; then
  kill $PID
  echo "Build failed health check — keeping previous image"
  exit 1
fi
kill $PID

# Promove
docker-compose -f docker-compose.prod.yml up -d --no-deps app

# Aguarda health check
sleep 30
if ! curl -sf http://localhost:3000/api/health; then
  echo "Deploy falhou — revertendo para $IMAGE_PREV"
  docker tag "$IMAGE_PREV" myapp:current
  docker-compose -f docker-compose.prod.yml up -d --no-deps app
  exit 1
fi

echo "Deploy bem-sucedido: $IMAGE_NEW"
```

### Dica: use `--rollback` do Docker Swarm

Se você usa Docker Swarm, o rollback é nativo:

```bash
docker service update --image myapp:new myapp_app --update-failure-action rollback
```

---

## Checklist de produção

- [ ] `.dockerignore` inclui `node_modules`, `.git`, `.env`, `coverage`
- [ ] Secrets via variáveis de ambiente (não bakeadas na imagem)
- [ ] `restart: unless-stopped` nos serviços críticos
- [ ] Volumes nomeados para persistência de dados
- [ ] Health checks em todos os serviços
- [ ] Script de deploy com rollback automático testado
