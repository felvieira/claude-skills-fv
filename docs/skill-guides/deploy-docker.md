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

### Backend Node.js: exemplo adaptável

Exemplo para um projeto npm com `package-lock.json`, build em `dist/` e dependências de runtime declaradas em `dependencies`. Escolha um LTS ainda suportado e fixe tag e digest verificados no registry; atualize ambos periodicamente. Alpine usa musl: valide módulos nativos e bibliotecas do projeto, ou use uma base Debian slim compatível. Adapte comandos e arquivos a workspaces, geração Prisma e demais artefatos do projeto.

```dockerfile
# syntax=docker/dockerfile:1
# Exemplo: substituir por imagem suportada e digest verificado no projeto.
ARG NODE_IMAGE=node:24-bookworm-slim
FROM ${NODE_IMAGE} AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
# Se o projeto usar Prisma, gere o cliente aqui com a CLI instalada no build.
RUN npm run build

FROM ${NODE_IMAGE} AS production-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev && mkdir -p node_modules

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=production-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./
USER node
EXPOSE 3001
# Apenas se a aplicação implementar GET /health; adaptar porta e tempos.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/server.js"]
```

`npm ci` exige lockfile coerente; scripts de instalação e dependências nativas precisam ser auditados. O estágio `production-deps` reinstala pacotes: aplicações com módulos gerados (como Prisma) devem copiar ou gerar os artefatos de runtime necessários, respeitando versão da CLI, biblioteca do sistema e arquitetura; testar a imagem final. Migrations não rodam no `CMD`: usar job de release separado, com artefato/CLI apropriado, uma vez, após backup e avaliação de compatibilidade.

Exemplo de `.dockerignore` na raiz do contexto (adaptar para não excluir arquivos necessários):

```gitignore
.git
node_modules
.env
.env.*
!.env.example
coverage
dist
.next
*.log
```

Copiar primeiro manifests/lockfile melhora o cache, mas arquivos de configuração de dependências e manifests de workspace também precisam entrar antes do `npm ci`. Não enviar segredos em `COPY`, `ARG` ou `ENV`: use `RUN --mount=type=secret` e garanta que o comando não os grave em artefatos, cache ou logs. Valores `NEXT_PUBLIC_*` são públicos e entram no bundle. Segredos em `.npmrc` não devem entrar no contexto.

### Frontend

Para Next.js, habilitar e verificar a saída standalone antes de copiá-la; incluir assets e arquivos de runtime exigidos pela versão instalada. Usar a mesma disciplina de LTS, digest, usuário sem privilégios, cache, segredo e verificação acima. `public/` pode não existir; não copiá-la incondicionalmente. Definir healthcheck apenas para endpoint existente. Não reaproveitar sem validação exemplos para outras stacks.

## Docker Compose Completo

Ajustar ao projeto e testar suporte do runtime. Este recorte não cria banco, proxy nem endpoint:

```yaml
services:
  backend:
    image: ${IMAGE_REF:?informe imagem aprovada por digest}
    restart: unless-stopped
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    mem_limit: 512m
    cpus: 0.5
    networks:
      - app-network
networks:
  app-network:
    internal: true
```

`IMAGE_REF` deve ser uma referência completa `nome@sha256:...`; a interpolação apenas verifica que não está vazia, não valida o digest. `internal: true` impede acesso externo direto inclusive para APIs remotas: anexar outra rede com saída controlada se a aplicação precisar. Adicionar proxy ou serviços de dados à rede apropriada; não publicar portas de banco/cache no host por padrão. Montar diretórios graváveis explícitos quando necessários. A configuração é ponto de partida: validar capacidades, limites, escrita, conectividade e saúde no ambiente real.

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

1. Em PR, executar lint/testes e `docker build --check` quando suportado; builds de contribuições não confiáveis não recebem credenciais nem publicam artefatos.
2. Fixar actions e bases por SHA/digest verificado, com política de atualização. Restringir `GITHUB_TOKEN` e credenciais por job. Não interpolar entradas não confiáveis em shell.
3. Construir uma vez, gerar SBOM e proveniência quando a plataforma suportar, e avaliar vulnerabilidades do **artefato final** e dependências, além do repositório. Bloquear conforme política de severidade e manter exceções justificadas, com prazo e responsável. Ausência de achados conhecidos não prova ausência de falhas.
4. Testar a mesma imagem por digest em ambiente isolado: usuário não root, arquivos e segredos, inicialização, probe, encerramento por SIGTERM, fluxos representativos e limites. Medir tamanho, build frio/quente, tempo de inicialização, memória e latência, comparando com baseline.
5. Publicar e promover o digest efetivamente testado após aprovação aplicável. Separar migração de schema do início de réplicas, com backup, compatibilidade entre versões, plano de rollback e processo de execução única. Rollback de imagem não reverte schema ou dados automaticamente.
6. Não rodar `docker system prune` em deploy: pode remover recursos compartilhados. Limpeza é tarefa separada, com inventário e autorização apropriada.

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

Manter identificados o digest saudável anterior e o candidato. Confirmar que a versão anterior é compatível com schema, dados e integrações antes de promover ou reverter. Atualizar o registro de versão saudável somente após validação da promoção; se não houver versão anterior conhecida, interromper e escalar. Testar o plano com os procedimentos e aprovações do ambiente. Reverter a imagem não reverte migrações ou dados.

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
