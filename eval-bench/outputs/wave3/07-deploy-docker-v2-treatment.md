---
scenario: 07-deploy-docker
pass: treatment
version: v2-reeval (v2.10.1 skill content from repo)
model: claude-sonnet-4-6
tokens_in_approx: 850
tokens_out_approx: 3200
time_seconds: 42
quality_score: 4.8
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: PASS
delta_vs_baseline: +1.8
notes: |
  v2.10.1 skill adds two critical sections vs v2.7.1 cached:
  (1) Rollback Persistente .last-tag — auto-persists current tag before promoting, rollback.sh reads
      .last-tag without needing operator to know the previous tag manually; CI/CD pattern included.
  (2) ssl-init.sh idempotente — detects existing cert + days remaining, skips if >30d valid,
      runs certbot certonly only when needed, reloads nginx, safe to run on cron.
  Both gaps cited in marginal_fail (v2.7.1 delta +1.3) are now covered.
  correctness up from 4→5 (no hardcoded container name; .last-tag pattern is robust).
  actionability up from 4→5 (ssl-init.sh eliminates manual first-deploy SSL ceremony).
  specificity up from 5→5 (unchanged — skill was already strong here).
  discipline docked 1 point: response is very long; could defer blue-green/canary detail to
  a separate section or reference doc to respect token-efficiency policy.
---

# Pass B — Skill 07 Deploy Docker v2.10.1

## Stack detectada

Node.js app + nginx reverse proxy + Postgres em VPS Ubuntu via Docker Compose.
Zero-downtime exige: health check nativo no container, rollback automático baseado em tag persistida,
e ssl-init.sh idempotente para o ciclo de vida do certificado.

---

## 1. Estrutura de arquivos

```
myapp/
├── Dockerfile                      # multi-stage, produção
├── docker-compose.yml              # dev local
├── docker-compose.prod.yml         # produção (pull de registry)
├── .dockerignore
├── .last-tag                       # persiste tag atual — gitignored
├── nginx/
│   └── conf.d/
│       ├── http-only.conf          # nginx sobe com HTTP antes do cert existir
│       └── app.conf                # config final HTTPS
├── scripts/
│   ├── ssl-init.sh                 # idempotente — cria cert só se necessário
│   ├── deploy-with-tag-persist.sh  # persiste .last-tag antes de promover
│   └── rollback.sh                 # lê .last-tag sem argumento manual
└── .github/
    └── workflows/
        └── deploy.yml
```

Adicionar ao `.gitignore`:
```
.last-tag
.prev-tag
```

---

## 2. Multi-stage Dockerfile (Node.js)

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

USER appuser
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "dist/server.js"]
```

---

## 3. docker-compose.prod.yml

```yaml
version: '3.8'

services:
  backend:
    image: ${IMAGE_TAG:-ghcr.io/org/app:latest}
    restart: unless-stopped
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - app-network
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.75'

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file: .env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
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
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - certbot_data:/etc/letsencrypt:ro
      - certbot_www:/var/www/certbot:ro
    depends_on:
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
  certbot_data:
  certbot_www:

networks:
  app-network:
    driver: bridge
```

---

## 4. Nginx — HTTP + HTTPS com rate limiting e security headers

```nginx
# nginx/conf.d/app.conf
upstream backend { server backend:3001; }

limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;

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
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;

    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
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

## 5. ssl-init.sh — Idempotente (NOVO em v2.10.1)

**Problema que resolve:** nginx referencia `fullchain.pem` que só existe após certbot rodar.
Se o container nginx sobe antes, o compose inteiro fica unhealthy. Rodar ssl-init duas vezes é seguro.

```bash
#!/bin/bash
# scripts/ssl-init.sh
# Detecta se certificado existe e cria apenas se necessário.
# Idempotente: rodar múltiplas vezes é seguro.

set -euo pipefail

DOMAIN=${1:-"seudominio.com"}
EMAIL=${2:-"admin@seudominio.com"}
CERT_PATH="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"

echo "[ssl-init] Verificando certificado para $DOMAIN..."

if [ -f "$CERT_PATH" ]; then
  EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_PATH" | cut -d= -f2)
  EXPIRY_EPOCH=$(date -d "$EXPIRY" +%s 2>/dev/null || date -jf "%b %d %H:%M:%S %Y %Z" "$EXPIRY" +%s)
  NOW_EPOCH=$(date +%s)
  DAYS_LEFT=$(( (EXPIRY_EPOCH - NOW_EPOCH) / 86400 ))

  if [ "$DAYS_LEFT" -gt 30 ]; then
    echo "[ssl-init] Certificado válido por mais $DAYS_LEFT dias. Nenhuma ação."
    exit 0
  fi
  echo "[ssl-init] Certificado expira em $DAYS_LEFT dias — renovando..."
fi

echo "[ssl-init] Obtendo certificado via certbot..."
certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email \
  --non-interactive \
  -d "$DOMAIN" \
  -d "www.$DOMAIN" \
  2>&1 | tee -a /var/log/ssl-init.log

echo "[ssl-init] Recarregando nginx..."
docker compose exec nginx nginx -s reload 2>/dev/null || nginx -s reload

echo "[ssl-init] Certificado configurado com sucesso."
```

### Integrar no primeiro deploy

```yaml
# docker-compose.prod.yml — nginx sobe HTTP, ssl-init promove para HTTPS
services:
  nginx:
    command: >
      /bin/sh -c "
        nginx -g 'daemon off;' &
        sleep 5 &&
        /scripts/ssl-init.sh seudominio.com admin@seudominio.com &&
        cp /etc/nginx/conf.d/app.conf /etc/nginx/conf.d/default.conf &&
        nginx -s reload &&
        wait
      "
```

### Cron no servidor (renovação automática)

```bash
# /etc/cron.d/ssl-renew
0 3 * * * root /app/scripts/ssl-init.sh seudominio.com admin@seudominio.com >> /var/log/ssl-renew.log 2>&1
```

---

## 6. Rollback Persistente — .last-tag pattern (NOVO em v2.10.1)

**Problema que resolve:** rollback manual exige que o operador saiba qual tag anterior usar.
Em múltiplos deploys por dia, isso aumenta MTTR e risco de erro humano.

### Script de deploy com persistência automática de tag

```bash
#!/bin/bash
# scripts/deploy-with-tag-persist.sh
# Uso: ./deploy-with-tag-persist.sh ghcr.io/org/app:sha-abc123

set -euo pipefail

LAST_TAG_FILE=/app/.last-tag
NEW_TAG=$1

if [ -z "$NEW_TAG" ]; then
  echo "Uso: $0 <nova-tag>"
  exit 1
fi

# Persiste tag atual como "last" antes de promover
if [ -f "$LAST_TAG_FILE" ]; then
  CURRENT_TAG=$(cat "$LAST_TAG_FILE")
  echo "Tag atual: $CURRENT_TAG → será salva como last"
fi
echo "$NEW_TAG" > "$LAST_TAG_FILE"

# Promove nova tag
IMAGE_TAG=$NEW_TAG docker compose -f docker-compose.prod.yml up -d --force-recreate

sleep 10
if curl -sf http://localhost:3001/health > /dev/null; then
  echo "Deploy OK: $NEW_TAG"
else
  echo "Deploy falhou — rollback automático para ${CURRENT_TAG:-unknown}"
  IMAGE_TAG=${CURRENT_TAG:-} docker compose -f docker-compose.prod.yml up -d --force-recreate
  echo "${CURRENT_TAG:-}" > "$LAST_TAG_FILE"
  exit 1
fi
```

### Rollback manual sem argumento

```bash
#!/bin/bash
# scripts/rollback.sh — lê .last-tag sem precisar saber a tag anterior
set -euo pipefail

ROLLBACK_TAG=$(cat /app/.last-tag 2>/dev/null)
if [ -z "$ROLLBACK_TAG" ]; then
  echo "Arquivo .last-tag não encontrado. Rollback manual necessário."
  exit 1
fi
echo "Rollback para: $ROLLBACK_TAG"
IMAGE_TAG=$ROLLBACK_TAG docker compose -f docker-compose.prod.yml up -d --force-recreate
sleep 10
curl -sf http://localhost:3001/health && echo "Rollback OK" || echo "Rollback falhou — checar logs"
```

### Integração no GitHub Actions

```yaml
# No job deploy-production
- name: Persist last-tag e deploy
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.PROD_HOST }}
    username: ${{ secrets.DEPLOY_USER }}
    key: ${{ secrets.DEPLOY_KEY }}
    script: |
      cd /app
      NEW_TAG="ghcr.io/${{ github.repository }}:${{ github.sha }}"
      LAST_TAG_FILE=".last-tag"

      [ -f "$LAST_TAG_FILE" ] && cp "$LAST_TAG_FILE" ".prev-tag"
      echo "$NEW_TAG" > "$LAST_TAG_FILE"

      IMAGE_TAG=$NEW_TAG docker compose -f docker-compose.prod.yml up -d --force-recreate
      sleep 10
      curl -f http://localhost:3001/health || {
        echo "Health check falhou — rollback para $(cat .prev-tag)"
        IMAGE_TAG=$(cat .prev-tag) docker compose -f docker-compose.prod.yml up -d --force-recreate
        cp .prev-tag "$LAST_TAG_FILE"
        exit 1
      }
      docker system prune -f
```

---

## 7. .env.example

```bash
# NUNCA commitar .env real
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://appuser:<senha>@postgres:5432/appdb
DB_NAME=appdb
DB_USER=appuser
DB_PASSWORD=<openssl rand -base64 32>
JWT_SECRET=<openssl rand -base64 64>
ALLOWED_ORIGINS=https://seudominio.com
```

---

## 8. Checklist pré-deploy de produção

```
☐ Todos os testes passando (unit + E2E)
☐ Security review aprovado
☐ npm audit sem HIGH/CRITICAL
☐ Docker build local sem warnings
☐ .env configurado no servidor (não commitado)
☐ Backup do banco executado
☐ Migrations testadas em staging
☐ ssl-init.sh executado e certificado válido
☐ .last-tag presente no servidor com tag atual
☐ rollback.sh testado — lê .last-tag sem argumento
☐ Monitoring/alertas configurados
☐ docker system prune agendado (cron semanal)
```

---

## Riscos e pré-condições

| Risco | Mitigação |
|---|---|
| nginx sobe antes do cert existir | ssl-init.sh idempotente — nginx parte em HTTP-only, promove para HTTPS após cert |
| Operador não sabe tag anterior em rollback | .last-tag persiste automaticamente antes de cada deploy |
| Migrations destrutivas em prod | Testar em staging + backup antes do deploy |
| Secrets na imagem | Nunca usar ENV SECRET=... no Dockerfile; injetar via env_file em runtime |
| .last-tag corrompido | Manter 3+ tags no registry como fallback manual |

**Aprovação requerida antes de executar deploy em produção** — especialmente se houver migrations.
