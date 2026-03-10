# Deploy Docker Guide

> Guia auxiliar da skill `07-deploy-docker`. Consultar apenas quando a tarefa exigir exemplo operacional detalhado de Dockerfile, compose, CI/CD ou estrategia de release.

---

## Indice

- [Dockerfiles Multi-Stage](#dockerfiles-multi-stage)
- [Docker Compose Completo](#docker-compose-completo)
- [Nginx — Reverse Proxy e SSL](#nginx--reverse-proxy-e-ssl)
- [CI/CD — GitHub Actions](#cicd--github-actions)
- [Environment Variables](#environment-variables)
- [Estrategias de Release](#estrategias-de-release)
- [Rollback](#rollback)
- [Checklist Pre-Deploy](#checklist-pre-deploy)

---

## Dockerfiles Multi-Stage

### Backend (Node.js / Express)

```dockerfile
# Dockerfile.backend

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=appuser:nodejs /app/prisma ./prisma
COPY --from=builder /app/package.json ./

USER appuser

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### Frontend (Next.js)

```dockerfile
# Dockerfile.frontend

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

---

## Docker Compose Completo

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
      args:
        NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
        NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL}
    restart: unless-stopped
    ports:
      - "3000:3000"
    depends_on:
      backend:
        condition: service_healthy
    networks:
      - app-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.backend
    restart: unless-stopped
    ports:
      - "3001:3001"
    env_file:
      - ./backend/.env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - app-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network
    deploy:
      resources:
        limits:
          memory: 256M

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
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
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot_data:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

  certbot:
    image: certbot/certbot
    volumes:
      - certbot_data:/etc/letsencrypt
      - certbot_www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h & wait $${!}; done;'"

volumes:
  postgres_data:
  redis_data:
  certbot_data:
  certbot_www:

networks:
  app-network:
    driver: bridge
```

---

## Nginx — Reverse Proxy e SSL

```nginx
# nginx/conf.d/app.conf

upstream frontend { server frontend:3000; }
upstream backend  { server backend:3001;  }

limit_req_zone $binary_remote_addr zone=api:10m    rate=30r/m;
limit_req_zone $binary_remote_addr zone=login:10m  rate=5r/m;

server {
    listen 80;
    server_name seudominio.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl http2;
    server_name seudominio.com;

    ssl_certificate     /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache   shared:SSL:10m;

    add_header X-Frame-Options              "DENY"                       always;
    add_header X-Content-Type-Options       "nosniff"                    always;
    add_header Strict-Transport-Security    "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy              "strict-origin-when-cross-origin"   always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/v1/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## CI/CD — GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  test-unit:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with: { name: coverage-report, path: coverage/ }

  test-e2e:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with: { name: playwright-report, path: playwright-report/ }

  security:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: aquasecurity/trivy-action@master
        with: { scan-type: fs, severity: CRITICAL,HIGH }

  build:
    needs: [test-unit, test-e2e, security]
    if: github.event_name == 'push'
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.STAGING_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /app
            docker compose pull
            docker compose up -d --force-recreate
            docker compose exec backend npx prisma migrate deploy
            docker system prune -f

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /app
            docker compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d_%H%M).sql
            docker compose pull
            docker compose up -d --force-recreate
            docker compose exec backend npx prisma migrate deploy
            sleep 10
            curl -f http://localhost:3000/api/health || (docker compose logs --tail=50 && exit 1)
            docker system prune -f
```

---

## Environment Variables

```bash
# .env.example — NUNCA commitar .env real
# Backend
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname
REDIS_URL=redis://:pass@redis:6379

# Auth
JWT_ACCESS_SECRET=<openssl rand -base64 64>
JWT_REFRESH_SECRET=<openssl rand -base64 64>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
ALLOWED_ORIGINS=https://seudominio.com

# Frontend
NEXT_PUBLIC_API_URL=https://seudominio.com/api/v1
NEXT_PUBLIC_APP_URL=https://seudominio.com

# Infra
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=<senha-forte>
REDIS_PASSWORD=<senha-forte>
```

---

## Estrategias de Release

### Blue-Green

```
1. Dois ambientes identicos rodando (blue = ativo, green = standby)
2. Deploy a nova versao no ambiente standby (green)
3. Health check no green
4. Switch de trafego no nginx: upstream aponta pro green
5. Blue fica em standby para rollback instantaneo
6. Rollback: reverter o switch — sem redeploy
```

### Canary

```
1. Deploy da nova versao em subset de instancias (5-10%)
2. Monitorar error rate, latencia e CPU por 15-30 min
3. Se metricas ok: aumentar para 50% → 100%
4. Se anomalia: rollback para 0% sem afetar usuarios
```

### Feature Flags

```typescript
export function isFeatureEnabled(feature: string): boolean {
  const flags = JSON.parse(process.env.FEATURE_FLAGS || '{}');
  return flags[feature] === true;
}
```

Usar para deploy gradual de features arriscadas. Permite desligar sem redeploy.

---

## Rollback

```bash
#!/bin/bash
# scripts/rollback.sh

PREVIOUS_TAG=$1

if [ -z "$PREVIOUS_TAG" ]; then
  echo "Uso: ./rollback.sh <tag-anterior>"
  docker images --format "{{.Tag}}" ghcr.io/org/app | head -10
  exit 1
fi

echo "Iniciando rollback para $PREVIOUS_TAG..."

export IMAGE_TAG=$PREVIOUS_TAG
docker compose up -d --force-recreate

sleep 10
if curl -sf http://localhost:3000/api/health > /dev/null; then
  echo "Rollback concluido com sucesso."
else
  echo "Rollback falhou — verificar logs"
  docker compose logs --tail=50
  exit 1
fi
```

---

## Checklist Pre-Deploy

```
Qualidade
☐ Testes unitarios passando
☐ Testes E2E passando
☐ Security review aprovado
☐ npm audit sem HIGH/CRITICAL

Build
☐ Docker build sem warnings
☐ Imagem publicada no registry com tag do commit

Infra
☐ .env configurado no servidor (nao no repositorio)
☐ Migrations testadas em staging
☐ Backup do banco feito
☐ DNS apontando corretamente
☐ SSL certificado valido

Operacao
☐ Rollback script testado
☐ Health check configurado e funcionando
☐ Monitoramento e alertas configurados
☐ README e docs atualizados
```
