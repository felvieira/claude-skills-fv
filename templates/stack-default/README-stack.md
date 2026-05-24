# Stack Default — Decisões já tomadas

> Template para novos projetos. O `/swarm` lê este arquivo antes de escrever qualquer código.
> **Não reabrir as decisões abaixo** — elas foram tomadas deliberadamente.
> Para mudar uma decisão em projeto específico: documente o override em `memory/constitution.md`.

---

## Princípio central

> Máximo open source onde faz sentido. IA via integração (OpenRouter), nunca vendor-locked.

O que "faz sentido" significa:
- **Faz sentido usar OSS:** infra, banco, auth, storage, reverse proxy, observability
- **Não faz sentido usar OSS de LLM:** modelos locais têm custo de infra e qualidade inferior. Usar API via OpenRouter (paga, mas centralizada e sem lock-in de provider)

---

## Stack (decisões permanentes)

| Camada | Escolha | Alternativa rejeitada | Por quê rejeitada |
|---|---|---|---|
| **Runtime** | Node 22 / Next.js 15 | Bun | Bun ainda instável em prod; Node ecosystem maior |
| **Banco** | Postgres 16 | MySQL, SQLite, MongoDB | Postgres: melhor feature set, JSONB, full-text, extensões |
| **ORM** | Drizzle | Prisma | Drizzle: zero-overhead runtime, SQL-first, melhor perf |
| **Auth** | Better Auth | Auth0, Clerk, NextAuth | Auth0/Clerk: vendor lock + custo. NextAuth: menos features |
| **Cache/Queue** | Redis 7 | Upstash, BullMQ (separado) | Upstash: serverless lock. Redis já inclui queue via BullMQ |
| **Storage** | MinIO (S3-compatible) | AWS S3, Cloudinary | S3: vendor lock. Cloudinary: caro + lock. MinIO: self-hosted, S3 API |
| **Reverse proxy** | Traefik v3 | Nginx, Caddy | Nginx: DX inferior (sem auto-discovery). Caddy: menos ecosystem |
| **TLS** | Let's Encrypt via Traefik | Cloudflare, manual cert | Automático, gratuito, renovação zero-touch |
| **Frontend** | Next.js 15 + Shadcn + Tailwind | Remix, SvelteKit | Ecosystem React maior; Shadcn: componentes sem vendor |
| **LLM** | OpenRouter (gateway) | Anthropic direto, OpenAI direto | Vendor lock. OpenRouter: 1 key, 300+ models, fallback automático |
| **Observability** | OpenTelemetry + Grafana + Loki | Datadog, NewRelic | OSS completo, self-hosted, sem custo por seat |
| **Email** | SMTP padrão (Resend/Postmark/SES) | SendGrid | SendGrid: lock-in. SMTP: padrão aberto, troca sem código |
| **Container** | Docker Compose | Kubernetes, Railway, Render | K8s: overkill até 10k req/s. Railway/Render: vendor lock |

---

## LLM via OpenRouter — como usar

```ts
import { callLLM, streamLLM } from "@/lib/llm";

// One-shot (server-side)
const result = await callLLM({
  tier: "balanced",                // fast | balanced | deep
  messages: [
    { role: "user", content: "Summarize this..." }
  ],
});
console.log(result.text, result.usage);

// Streaming (route handler → browser)
return streamLLM({ tier: "balanced", messages });
```

**Tiers de modelo** (configuráveis via `.env`):

| Tier | Default model | Quando usar |
|---|---|---|
| `fast` | `meta-llama/llama-3.1-8b-instruct:free` | Classificação, formatação, boilerplate |
| `balanced` | `anthropic/claude-sonnet-4-5` | Implementação, docs, chat feature |
| `deep` | `anthropic/claude-opus-4-5` | Raciocínio complexo, security, arquitetura |

Para trocar modelo sem mudar código: edite `LLM_MODEL_FAST/BALANCED/DEEP` no `.env`.

---

## Como usar este template com /swarm

```
/swarm "implementar feature X"
```

O orquestrador deve ler `templates/stack-default/README-stack.md` **antes de planejar** e:

1. **Não decidir stack** — já está decidida acima
2. **Não instalar outras libs** sem documentar override em `memory/constitution.md`
3. **Começar da fase 4** (feature code) — infra, DB, auth e LLM já estão configurados
4. Pular fases de "escolher banco", "configurar docker", "setup auth"

Isso transforma Write×130 em Write×20.

---

## Como inicializar um novo projeto

```bash
# 1. Copiar template
cp -r templates/stack-default/ ../meu-projeto/
cd ../meu-projeto/

# 2. Criar rede Traefik (uma vez por host)
docker network create traefik_web

# 3. Configurar .env
cp .env.example .env
# Editar: DB_PASSWORD, REDIS_PASSWORD, MINIO_SECRET_KEY, BETTER_AUTH_SECRET,
#         OPENROUTER_API_KEY, ACME_EMAIL, DOMAIN

# 4. Subir em dev
make dev

# 5. Rodar migrations
make db-push         # dev (sem migration file)
# ou
make db-migrate      # prod (com migration versionada)

# 6. Acessar
# App:            http://localhost:3000
# DB GUI:         http://localhost:8080
# Redis UI:       http://localhost:8081
# Mailpit:        http://localhost:8025
# MinIO Console:  http://localhost:9001
```

---

## O que NÃO está aqui (intencionalmente)

| Item | Por quê não incluído |
|---|---|
| Kubernetes / Helm | Overkill até escala real; adicionar quando necessário |
| CI/CD pipeline | Depende do host (GitHub Actions, GitLab CI, etc.) — não generic |
| Monitoramento prod (Grafana stack) | Adicionar como compose profile separado quando precisar |
| Testes (Jest/Vitest/Playwright) | Stack de testes varia por projeto; adicionar via skill 05 |
| Background jobs (BullMQ) | Adicionar se precisar de queue; Redis já está disponível |
| Multi-tenancy | Padrão de schema Drizzle a definir por projeto |

---

## Overrides por projeto

Se um projeto específico precisar desviar desta stack, documente em `memory/constitution.md`:

```markdown
## Stack overrides — meu-projeto

- **Banco**: MySQL em vez de Postgres (legado da empresa — DB já existe)
- **Auth**: Auth0 (contrato enterprise já pago — sem custo adicional)
```

O orquestrador respeita constitution.md sobre este README.

---

## Versão da stack

| Lib | Versão | Data de decisão |
|---|---|---|
| Next.js | 15.3.x | 2026-05-24 |
| Better Auth | 1.2.x | 2026-05-24 |
| Drizzle ORM | 0.43.x | 2026-05-24 |
| Postgres (image) | 16-alpine | 2026-05-24 |
| Redis (image) | 7-alpine | 2026-05-24 |
| MinIO | latest stable | 2026-05-24 |
| Traefik | v3.0 | 2026-05-24 |
| AI SDK | 4.3.x | 2026-05-24 |
| OpenRouter | via API key | 2026-05-24 |

Atualizar esta tabela a cada upgrade deliberado.
