---
scenario: 07-deploy-docker
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 410
tokens_out_approx: 2480
time_seconds: 35
quality_score: 4.3
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 4
  discipline: 4
pass_fail: marginal_fail
delta_vs_baseline: +1.3
notes: "skill adds nginx reverse proxy, SSL/TLS, rate limiting, non-root user, retry-loop rollback, risks table, full CI/CD pipeline, env var template, pre-deploy checklist — baseline lacked all of these; delta +1.3 is below 1.5 threshold; correctness docked 1 for hardcoded container name in rollback inspect + missing certbot initial issuance step; actionability docked 1 for same certbot gap"
---

# Deploy Node.js + Next.js + Postgres + Redis — Estrutura Docker

Stack detectada: **Next.js (frontend + API routes) + Postgres 16 + Redis 7**, sem backend separado.
Ajuste: Dockerfile único para o app Next.js; Postgres e Redis como serviços auxiliares.

---

## 1. Estrutura de arquivos

```
myapp/
├── Dockerfile                    # multi-stage, produção
├── docker-compose.yml            # dev local
├── docker-compose.prod.yml       # produção (pull de registry)
├── .dockerignore
├── nginx/
│   └── conf.d/
│       └── app.conf
├── scripts/
│   ├── deploy.sh
│   └── rollback.sh
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 2. Multi-stage Dockerfile (Next.js otimizado)

```dockerfile
# ── Stage 1: deps (apenas prod deps) ──────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ── Stage 2: builder (inclui devDeps para build) ───────────────────
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Injeta vars públicas em build-time (não secrets)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build

# ── Stage 3: runner (imagem mínima, sem devDeps, sem source) ───────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Usuário não-root (segurança)
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid  1001 nextjs

COPY --from=deps    --chown=nextjs:nodejs /app/node_modules   ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next          ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public         ./public
COPY --from=builder                       /app/package.json   ./

USER nextjs
EXPOSE 3000

# Health check nativo (usado pelo docker e pelo compose)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["npm", "start"]
```

### .dockerignore

```
node_modules
.next
.git
.env*
coverage
*.log
```

---

## 3. Endpoint de health check (Next.js App Router)

```ts
// app/api/health/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";          // seu cliente Prisma/pg
import { redis } from "@/lib/redis";    // seu cliente ioredis/redis

export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;       // pg check
    await redis.ping();                  // redis check
    return NextResponse.json({ status: "ok", ts: Date.now() });
  } catch (err) {
    return NextResponse.json({ status: "error", detail: String(err) }, { status: 503 });
  }
}
```

---

## 4. docker-compose.yml (dev local)

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      target: builder        # usa stage com devDeps → hot reload
    command: npm run dev
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://appuser:dev_secret@db:5432/appdb
      REDIS_URL:    redis://:dev_secret@redis:6379
    volumes:
      - .:/app
      - /app/node_modules    # previne override pelo bind mount
      - /app/.next
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB:       appdb
      POSTGRES_USER:     appuser
      POSTGRES_PASSWORD: dev_secret
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass dev_secret
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "dev_secret", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

volumes:
  pg_data:
  redis_data:
```

---

## 5. docker-compose.prod.yml (produção — pull de registry)

```yaml
version: "3.9"

services:
  app:
    image: ghcr.io/org/myapp:${IMAGE_TAG:-latest}
    restart: unless-stopped
    env_file: .env          # secrets via arquivo no servidor
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "0.75"
    networks:
      - app-network

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: .env
    volumes:
      - pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot_data:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro
    depends_on:
      - app
    networks:
      - app-network

volumes:
  pg_data:
  redis_data:
  certbot_data:
  certbot_www:

networks:
  app-network:
    driver: bridge
```

---

## 6. Nginx (reverse proxy + TLS + rate limiting)

```nginx
# nginx/conf.d/app.conf
limit_req_zone $binary_remote_addr zone=general:10m rate=60r/m;

server {
    listen 80;
    server_name seudominio.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl http2;
    server_name seudominio.com;

    ssl_certificate     /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location / {
        limit_req zone=general burst=20 nodelay;
        proxy_pass http://app:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade           $http_upgrade;
        proxy_set_header Connection        "upgrade";
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 7. Rollback automático em falha

### Script de deploy com rollback embutido

```bash
#!/usr/bin/env bash
# scripts/deploy.sh
set -euo pipefail

NEW_TAG="$1"
HEALTH_URL="http://localhost:3000/api/health"
PREV_TAG=$(docker inspect myapp_app_1 --format '{{.Config.Image}}' 2>/dev/null | cut -d: -f2 || echo "")

echo "Deploying $NEW_TAG (previous: ${PREV_TAG:-none})"

# 1. Pull nova imagem
IMAGE_TAG="$NEW_TAG" docker compose -f docker-compose.prod.yml pull app

# 2. Sobe novo container
IMAGE_TAG="$NEW_TAG" docker compose -f docker-compose.prod.yml up -d --no-deps app

# 3. Health check com retry (60s janela)
ATTEMPTS=0
until curl -sf "$HEALTH_URL" > /dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ "$ATTEMPTS" -ge 12 ]; then
    echo "Health check falhou após 60s — revertendo para $PREV_TAG"
    if [ -n "$PREV_TAG" ]; then
      IMAGE_TAG="$PREV_TAG" docker compose -f docker-compose.prod.yml up -d --no-deps app
    fi
    docker compose -f docker-compose.prod.yml logs --tail=50 app
    exit 1
  fi
  sleep 5
done

echo "Deploy $NEW_TAG OK"
docker system prune -f
```

### Rollback manual

```bash
# scripts/rollback.sh
#!/usr/bin/env bash
set -euo pipefail
TAG="${1:?Uso: rollback.sh <tag>}"
IMAGE_TAG="$TAG" docker compose -f docker-compose.prod.yml up -d --no-deps app
sleep 10
curl -sf http://localhost:3000/api/health && echo "Rollback $TAG OK" || echo "Rollback falhou — checar logs"
```

### Blue-Green (zero-downtime)

Para zero-downtime real:
1. Sobe `app-green` (novo) em porta interna diferente
2. Health check no green
3. Atualiza upstream do nginx para `app-green`
4. Mata `app-blue` (antigo)
5. Rollback: reverter upstream para `app-blue` (ainda vivo por 5 min)

### Opção Docker Swarm (se já usar Swarm)

```bash
docker service update \
  --image ghcr.io/org/myapp:$NEW_TAG \
  --update-failure-action rollback \
  --rollback-delay 10s \
  myapp_app
```

---

## 8. CI/CD — GitHub Actions (resumido)

```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  build-push:
    runs-on: ubuntu-latest
    permissions:
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}
          build-args: NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    needs: build-push
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: deploy
          key: ${{ secrets.DEPLOY_KEY }}
          script: bash /app/scripts/deploy.sh ${{ github.sha }}
```

---

## 9. .env.example (checklist de secrets)

```bash
# App
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://seudominio.com/api

# Postgres
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=<openssl rand -base64 32>
DATABASE_URL=postgresql://appuser:<senha>@db:5432/appdb

# Redis
REDIS_PASSWORD=<openssl rand -base64 32>
REDIS_URL=redis://:<senha>@redis:6379

# Auth (se aplicável)
JWT_SECRET=<openssl rand -base64 64>
```

---

## 10. Checklist pré-deploy de produção

```
☐ npm audit sem HIGH/CRITICAL
☐ Docker build local sem warnings
☐ Health check responde 200 em staging
☐ .env configurado no servidor (não commitado)
☐ Backup do banco executado
☐ Migrations testadas em staging
☐ SSL certificado válido (certbot)
☐ rollback.sh testado com tag anterior
☐ Monitoring/alertas configurados
☐ docker system prune agendado (cron semanal)
```

---

## Riscos e pré-condições

| Risco | Mitigação |
|---|---|
| Migrations destrutivas em prod | Testar em staging + backup antes do deploy |
| Secrets expostos em imagem | Nunca usar `ENV SECRET=...` no Dockerfile; injetar via `env_file` em runtime |
| Health check incompleto | Endpoint `/api/health` deve testar Postgres **e** Redis — não só retornar 200 |
| Volume de dados perdido em `prune` | Volumes nomeados (`pg_data`, `redis_data`) são preservados por `docker system prune` |
| Rollback sem tag anterior | Manter ao menos 3 tags no registry antes de deletar antigas |

**Aprovação requerida antes de executar `deploy.sh` em produção** — especialmente se houver migrations.
