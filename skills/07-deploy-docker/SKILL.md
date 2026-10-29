---
name: deploy-docker
description: |
  Skill do DevOps/Deployer para dockerização, CI/CD, e deploy de aplicações. Use quando precisar criar
  Dockerfile, docker-compose, configurar pipeline CI/CD, deploy em cloud, configurar nginx, SSL,
  ou qualquer operação de infraestrutura. Trigger em: "deploy", "Docker", "Dockerfile", "docker-compose",
  "CI/CD", "pipeline CI/CD", "GitHub Actions", "nginx", "SSL", "produção", "staging", "Kubernetes", "AWS",
  "infraestrutura", "ambiente", "build", "release".
allowed-tools: Read, Edit, Write, Grep, Glob, Bash(docker *), Bash(docker-compose *), Bash(git *), Bash(npm run *), Bash(gh *)
---

# Deployer - Dockerização e Deploy

O Deployer é o último passo. Recebe código aprovado pelo security review e coloca em produção.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/tool-safety.md` e `policies/evals.md`.

Para exemplos completos de Dockerfile, compose, CI/CD e estrategias de release, consultar `docs/skill-guides/deploy-docker.md` apenas quando necessario.

## Quando Usar

- empacotar, publicar ou promover mudanca entre ambientes
- configurar pipeline, health check, rollback ou release strategy

## Quando Nao Usar

- para validar codigo de negocio como atividade principal
- para executar acao externa de alto risco sem aprovacao

## Entradas Esperadas

- artefatos aprovados por QA, Security e Reviewer
- requisitos de ambiente, health check e rollback
- restricoes operacionais e de observabilidade

## Saidas Esperadas

- estrategia de deploy clara
- configuracao de build/release coerente
- handoff operacional curto para execucao ou monitoramento

## Responsabilidades

1. Dockerizar a aplicação (front + back + banco)
2. Configurar CI/CD pipeline
3. Gerenciar ambientes (dev, staging, prod)
4. Configurar reverse proxy (nginx/Traefik)
5. SSL/TLS com certbot
6. Monitoramento e logs
7. Rollback strategy

## Estrategia Base de Deploy

- builds reproduziveis e multi-stage quando fizer sentido
- imagens minimas e sem secrets embutidos
- health checks, rollback e monitoramento antes de promover release
- aprovacao explicita para acoes em producao seguindo `policies/tool-safety.md`

Para exemplos completos de Dockerfile, compose e pipelines, consultar `docs/skill-guides/deploy-docker.md`.

## Infrastructure as Code (IaC)

Tratar infraestrutura como código: o estado de servidores, redes e recursos cloud vive em arquivos versionados, revisáveis e reproduzíveis — nunca em passos manuais ou conhecimento tribal. Os princípios abaixo são atemporais (destilados de "DevOps na prática", Casa do Código); o ferramental moderno (Terraform, OpenTofu, Ansible, Pulumi) substitui o ferramental datado da literatura original (Puppet, Vagrant, Chef).

### Princípios (atemporais)

1. **Provisionamento declarativo, não imperativo.** Não escreva "instale o pacote X". Declare o estado final desejado — "o pacote X deve estar instalado", "deve existir uma VM com este tamanho". A ferramenta calcula o diff entre o estado atual e o declarado e aplica só o necessário. O arquivo descreve o destino, não a sequência de passos.
2. **Idempotência.** Aplicar o mesmo código N vezes converge sempre pro mesmo estado. Pacote já instalado não reinstala, serviço já rodando não reinicia. Isso distingue IaC de shell script proprietário, que normalmente só funciona na primeira execução (este kit já aplica idempotência pontual em `ssl-init.sh` — IaC é a mesma ideia no nível de servidor/infra inteira).
3. **Ambientes reproduzíveis.** dev, staging e prod nascem do mesmo código, parametrizado por ambiente. "Funciona na minha máquina" deixa de existir porque a máquina é descrita em código. Server provisionado a partir de manifesto é descartável e recriável — gado, não bicho de estimação.
4. **Convergência por dependência, não por ordem de linha.** O grafo de dependências entre recursos (banco antes da app, config antes do restart) é declarado explicitamente. Mudança em config notifica e dispara o restart do serviço dependente.
5. **Combater drift.** Drift é a divergência entre o estado declarado e o real (alguém deu `ssh` e mudou à mão). IaC detecta e corrige drift reaplicando o estado declarado. Mudança em produção que não passa pelo código é dívida — o próximo `apply` a reverte ou o `plan` a denuncia.
6. **Reuso de módulos.** Padrões de infra (web server, banco, VPC) viram módulos parametrizados e versionados, não copy-paste. Equivalente moderno do Puppet Forge: Terraform Registry, Ansible Galaxy.

### Mapeamento ferramental (livro datado → moderno)

| Conceito do livro | Ferramenta datada | Equivalente moderno |
|---|---|---|
| Provisionar VM / recurso cloud | Vagrant + VirtualBox | Terraform / OpenTofu / Pulumi |
| Configuration management (estado do SO/serviços) | Puppet, Chef | Ansible (agentless), cloud-init |
| Manifesto / recurso declarativo | `.pp` (Puppet) | `.tf` (HCL), playbook YAML |
| Reuso comunitário | Puppet Forge | Terraform Registry, Ansible Galaxy |
| Idempotência | core do Puppet | core de Terraform (`plan`/`apply`) e Ansible |

Regra de bolso atual: **Terraform/OpenTofu provisiona** (cria VM, rede, bucket, cluster); **Ansible configura** (instala pacote, ajusta arquivo, sobe serviço). Em ambiente totalmente container/Kubernetes, boa parte do config management migra pro Dockerfile + manifesto K8s + GitOps (Argo CD / Flux) — o princípio declarativo é o mesmo, o `apply` muda de dono.

### Fronteira de responsabilidade

- **IaC (esta skill, 07):** *forma* da infra. Provisionar recursos, configurar SO e serviços base, garantir estado declarado e reproduzível. "Como o ambiente é construído e mantido idempotente."
- **Observabilidade / SRE (skill 20):** *saúde* da infra em execução. Logs, métricas, SLO, probes, alertas. IaC declara o probe; a 20 define o que ele significa e o alerta.
- **Release orchestration (skill 24):** *promoção* de versões de aplicação sobre a infra existente. O ciclo de vida do servidor (IaC) é mais lento que o da aplicação (release) — o mesmo servidor recebe dezenas de releases.

Em resumo: **IaC constrói o palco (07), a 24 troca o ator em cena, a 20 vigia o espetáculo.** Drift de infra é da 07; degradação em runtime é da 20; deploy da versão errada é da 24.

### Quando aplicar

- ambiente novo (greenfield) onde servidores/recursos cloud precisam nascer reproduzíveis
- divergência staging↔prod → codificar o ambiente
- onboarding de servidor manual existente → importar pro estado declarado (`terraform import`)
- suspeita de drift → `plan`/`--check` pra detectar antes de reaplicar

Para um único servidor descartável com docker-compose, IaC pesado é overkill — o compose já é declarativo no nível de containers. IaC entra quando a *infra abaixo* dos containers (VM, rede, DNS, certificado, cluster) também precisa ser versionada e recriável.

## Construção e execução de imagens

Consultar `docs/skill-guides/deploy-docker.md` para o Dockerfile, `.dockerignore`, exemplos e limitações. Selecionar runtime suportado, lockfile e imagem base confiável; fixar o digest revisado e agendar sua atualização. Usar multi-stage, instalar dependências de build no estágio de build e somente as de runtime na imagem final; validar dependências nativas, workspaces e artefatos gerados no projeto real.

Ordenar cópias para aproveitar cache e restringir o contexto com `.dockerignore`; nunca colocar credenciais em `ARG`, `ENV`, camadas, logs ou cache exportado. Para build privado usar segredo efêmero do BuildKit, com acesso mínimo.

Executar como usuário não root, com arquivos próprios e permissões mínimas; considerar filesystem somente leitura, diretórios graváveis explícitos, `no-new-privileges`, remoção de capabilities e limites de recursos, verificando compatibilidade. Não montar Docker socket nem usar `privileged` por padrão.

Healthcheck deve usar um endpoint existente e refletir a função requerida, com intervalos e tempo de inicialização adequados. Diferenciar liveness de readiness conforme o orquestrador e evitar dependências externas no liveness. O probe sozinho não prova que o serviço atende ao fluxo real.

Migrações são etapa controlada de release, executadas uma vez com credenciais e imagem apropriadas; conferir compatibilidade de esquema, backup e estratégia de recuperação antes da promoção. Não executá-las em cada inicialização de réplica.

## Docker Compose - Ambiente Completo

Aplicar o exemplo de runtime e o isolamento de rede do guia. Não publicar portas de banco, cache ou backend diretamente no host sem necessidade explícita; expor apenas o proxy necessário. Usar segredos do ambiente de execução, nunca senhas em comandos ou arquivos de imagem. Confirmar que o runtime aplica limites e restrições declarados.

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

Usar o fluxo de verificação e promoção do guia: fixar actions por SHA verificado, limitar permissões do token, validar e construir a imagem, verificar a imagem final, gerar SBOM/proveniência e promover o mesmo digest aprovado. Builds em pull requests não confiáveis não recebem segredos nem publicam imagens. Scan de filesystem não substitui scan da imagem final; estabelecer critérios para severidade, correções e exceções revisadas. Deploy, migrações e limpeza de recursos são operações separadas, controladas e autorizadas; não executar `docker system prune` automaticamente.

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

Registrar separadamente o digest comprovadamente saudável anterior e o candidato. Atualizar o registro de versão ativa apenas após verificação da promoção; se não houver versão anterior conhecida, interromper e escalar. Antes de reverter, avaliar compatibilidade de schema, dados e integrações: reverter imagem não desfaz migrações. Testar o procedimento em ambiente seguro e registrar os limites. Automação de rollback em produção requer política e autorização aplicáveis; não usar fallback `latest`.

## ssl-init.sh — Idempotent SSL Setup

### Problema
O bloco SSL no `nginx/conf.d/app.conf` referencia `fullchain.pem` e `privkey.pem` que só existem após `certbot certonly` ter rodado com sucesso. Se o nginx subir antes do certbot, ele falha e o compose inteiro fica unhealthy — especialmente em primeiro deploy ou após troca de servidor.

### Solução: script ssl-init.sh idempotente

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
  # Verifica validade — renova se expira em menos de 30 dias
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

### Como integrar no entrypoint do container

**Opção 1 — rodar antes de subir nginx (recomendado para primeiro deploy):**

```bash
# No script de deploy ou no docker-compose entrypoint do serviço nginx
entrypoint: >
  /bin/sh -c "
    /scripts/ssl-init.sh seudominio.com admin@seudominio.com &&
    nginx -g 'daemon off;'
  "
```

**Opção 2 — nginx sobe com config HTTP-only primeiro, ssl-init promove para HTTPS:**

```yaml
# docker-compose.yml — nginx com dois configs
services:
  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx/conf.d/http-only.conf:/etc/nginx/conf.d/default.conf:ro  # inicial
      - ./nginx/conf.d/app.conf:/etc/nginx/conf.d/app.conf:ro            # após ssl-init
      - certbot_data:/etc/letsencrypt
      - certbot_www:/var/www/certbot
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

**Cron para renovação automática no servidor:**

```bash
# /etc/cron.d/ssl-renew
0 3 * * * root /app/scripts/ssl-init.sh seudominio.com admin@seudominio.com >> /var/log/ssl-renew.log 2>&1
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

**Checkpoint pós-deploy:** verificar saúde e fluxos representativos no ambiente promovido; diante de falha, seguir o plano de incidente e rollback aprovado, levando em conta a compatibilidade de schema e dados.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento

## Evidencia de Conclusao

- estrategia de deploy, health check e rollback definidos
- risco operacional e pre-condicoes destacados
- aprovacoes necessarias explicitadas para producao

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/handoff.md`.
