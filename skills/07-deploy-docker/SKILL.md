---
name: deploy-docker
description: |
  Skill do DevOps/Deployer para dockerização, CI/CD, e deploy de aplicações. Use quando precisar criar
  Dockerfile, docker-compose, configurar pipeline CI/CD, deploy em cloud, configurar nginx, SSL,
  ou qualquer operação de infraestrutura. Trigger em: "deploy", "Docker", "Dockerfile", "docker-compose",
  "CI/CD", "pipeline", "GitHub Actions", "nginx", "SSL", "produção", "staging", "Kubernetes", "AWS",
  "infraestrutura", "ambiente", "build", "release".
---

# Deployer - Dockerização e Deploy

O Deployer é o último passo. Recebe código aprovado pelo security review e coloca em produção.

## Responsabilidades

1. Dockerizar a aplicação (front + back + banco)
2. Configurar CI/CD pipeline
3. Gerenciar ambientes (dev, staging, prod)
4. Configurar reverse proxy (nginx/Traefik)
5. SSL/TLS com certbot
6. Monitoramento e logs
7. Rollback strategy

## Dockerfile - Frontend (Next.js)

```dockerfile
# Dockerfile.frontend — Multi-stage build otimizado

# Stage 1: Dependências
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args pra env vars em build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Segurança: não rodar como root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["node", "server.js"]
```

## Dockerfile - Backend (Node.js/Express)

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

## Docker Compose - Ambiente Completo

```yaml
# docker-compose.yml
version: '3.8'

services:
  # ── Frontend ──
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

  # ── Backend ──
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

  # ── PostgreSQL ──
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
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

  # ── Redis ──
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # ── Nginx Reverse Proxy ──
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

  # ── Certbot SSL ──
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

## Nginx Configuration

```nginx
# nginx/conf.d/app.conf

upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:3001;
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

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
    
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;
    
    # SSL hardening
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:10m;
    
    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
    gzip_min_length 1000;
    
    # Frontend
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
    
    # Backend API
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Login rate limit mais agressivo
    location /api/v1/auth/login {
        limit_req zone=login burst=3 nodelay;
        
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # Bloqueia acesso direto ao Prisma Studio, etc
    location ~ /_(next|prisma) {
        deny all;
    }
}
```

## CI/CD - GitHub Actions

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
  # ── Lint & Type Check ──
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check

  # ── Unit Tests ──
  test-unit:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  # ── E2E Tests ──
  test-e2e:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  # ── Security Audit ──
  security:
    needs: quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm audit --audit-level=high
      - uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

  # ── Build & Push Docker ──
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

  # ── Deploy ──
  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - name: Deploy to staging
        uses: appleboy/ssh-action@v1
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
      - name: Deploy to production
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /app
            # Backup banco antes de deploy
            docker compose exec postgres pg_dump -U $DB_USER $DB_NAME > backup_$(date +%Y%m%d_%H%M).sql
            docker compose pull
            docker compose up -d --force-recreate
            docker compose exec backend npx prisma migrate deploy
            # Health check
            sleep 10
            curl -f http://localhost:3000/api/health || (docker compose logs --tail=50 && exit 1)
            docker system prune -f
```

## Environment Variables

```bash
# .env.example — NUNCA commitar .env real
# === Backend ===
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://user:pass@postgres:5432/dbname
REDIS_URL=redis://:pass@redis:6379

# Auth
JWT_ACCESS_SECRET=<gerar-com-openssl-rand-base64-64>
JWT_REFRESH_SECRET=<gerar-com-openssl-rand-base64-64>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# CORS
ALLOWED_ORIGINS=https://seudominio.com

# === Frontend ===
NEXT_PUBLIC_API_URL=https://seudominio.com/api/v1
NEXT_PUBLIC_APP_URL=https://seudominio.com

# === Infra ===
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=<gerar-senha-forte>
REDIS_PASSWORD=<gerar-senha-forte>
```

## Rollback Strategy

```bash
#!/bin/bash
# scripts/rollback.sh

PREVIOUS_TAG=$1

if [ -z "$PREVIOUS_TAG" ]; then
  echo "Uso: ./rollback.sh <tag-anterior>"
  echo "Tags disponíveis:"
  docker images --format "{{.Tag}}" ghcr.io/org/app | head -10
  exit 1
fi

echo "🔙 Rollback para $PREVIOUS_TAG..."

# Atualiza docker-compose pra usar tag anterior
export IMAGE_TAG=$PREVIOUS_TAG
docker compose up -d --force-recreate

# Verifica saúde
sleep 10
if curl -sf http://localhost:3000/api/health > /dev/null; then
  echo "✅ Rollback sucesso!"
else
  echo "❌ Rollback falhou — verificar logs"
  docker compose logs --tail=50
  exit 1
fi
```

### Blue-Green Deployment
- Manter dois ambientes identicos (blue e green)
- Deploy no ambiente inativo
- Health check no ambiente novo
- Switch de trafego (nginx upstream swap)
- Rollback instantaneo: reverter switch

### Canary Release
- Rotear 5-10% do trafego pro deploy novo
- Monitorar metricas (error rate, latency, CPU)
- Se ok apos 15min: aumentar pra 50% → 100%
- Se anomalia: rollback imediato pra 0%

### Feature Flags
```typescript
export function isFeatureEnabled(feature: string): boolean {
  const flags = JSON.parse(process.env.FEATURE_FLAGS || '{}');
  return flags[feature] === true;
}
```
- Usar pra deploy gradual de features arriscadas
- Desligar feature sem redeploy

## Checklist Pre-Deploy

```
☐ Todos os testes passando (unit + E2E)
☐ Security review aprovado
☐ npm audit sem HIGH/CRITICAL
☐ Docker build sem warnings
☐ .env configurado no servidor
☐ Migrations testadas em staging
☐ Backup do banco feito
☐ DNS apontando corretamente
☐ SSL certificado válido
☐ Rollback script testado
☐ Monitoring/alertas configurados
☐ README atualizado
```

## Código Limpo

Todo código gerado DEVE ser livre de comentários.
Nomes descritivos substituem comentários. Código auto-explicativo.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
