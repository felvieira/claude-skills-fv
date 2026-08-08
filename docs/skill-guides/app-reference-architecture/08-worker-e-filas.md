# Worker Assíncrono e Filas (padrão avançado)

Este documento é opcional — só se aplica a apps que fazem processamento pesado/lento (IA,
geração de imagem, análise de arquivo) que não pode rodar dentro do ciclo request/response
normal do Next.js. Extraído do VisaLab, o único dos 3 apps que tem essa necessidade (pipeline de
IA de visagismo/colorimetria).

## Quando você precisa disto

Se toda operação do seu app responde em menos de alguns segundos, **não precisa de worker
separado** — rotas de API normais bastam. Worker separado vale a pena quando:

- Uma operação leva de dezenas de segundos a minutos (geração de imagem por IA, processamento de
  vídeo, análise de documento grande)
- Você quer resiliência a falha (retry automático, não perder o trabalho se o processo cair no
  meio)
- Você quer escalar o processamento independentemente do tráfego web (mais workers em horário de
  pico, sem escalar os containers da API)

## Stack: BullMQ + Redis

```ts
// lib/queue.ts
import { Queue, Worker, QueueEvents } from 'bullmq'
import { getQueueRedis } from './redis'

let analysisQueue: Queue | null = null

export function getAnalysisQueue(): Queue {
  if (!analysisQueue) {
    analysisQueue = new Queue('analysis', {
      connection: getQueueRedis(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 },   // limpa jobs concluídos após 1h (evita Redis inchar)
        removeOnFail: { age: 86400 },      // mantém falhas por 24h pra debug
      },
    })
  }
  return analysisQueue
}

// Chamado pela rota de API — só enfileira, não processa
export async function queueAnalysis(analysisId: string, userId: string, options: object) {
  await getAnalysisQueue().add('process', { analysisId, userId, ...options })
}
```

```ts
// worker/index.ts — processo Node SEPARADO, container próprio
import { Worker } from 'bullmq'

const worker = new Worker('analysis', processAnalysis, {
  connection: getWorkerRedis(),
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
})
```

**Comunicação entre API e worker é indireta**: a rota de API só dá `queue.add()` (enfileira) e
retorna imediatamente. O worker roda em processo/container separado, processa quando pode, e
comunica progresso/resultado **de volta via o banco de dados** (atualiza `status` de uma linha),
nunca via chamada de rede direta API↔worker. O cliente faz polling do status (ou recebe push
quando terminar).

## Padrões de robustez operacional (o que separa um worker de brinquedo de um de produção)

### 1. Heartbeat file para healthcheck

```ts
// escrito no boot e a cada job processado
fs.writeFileSync('/tmp/worker-heartbeat', Date.now().toString())
```

```dockerfile
# Dockerfile.worker
HEALTHCHECK --interval=30s --timeout=5s \
  CMD sh -c 'test $(($(date +%s) - $(cat /tmp/worker-heartbeat))) -lt 120' || exit 1
```

Docker/Coolify reinicia o container automaticamente se o worker travar sem crashar (ex: preso
num loop infinito ou numa chamada de rede sem timeout) — sem heartbeat, um worker "zumbi" nunca
seria detectado.

### 2. Timeout hard-ceiling por job

BullMQ sozinho não cobre um job que trava numa chamada `fetch` sem timeout — o `attempts: 3` só
ajuda se o job efetivamente falhar/lançar erro, não se ele ficar pendurado pra sempre.

```ts
const JOB_TIMEOUT_MS = parseInt(process.env.WORKER_JOB_TIMEOUT_MS || '2100000', 10) // 35min

async function processWithTimeout(job) {
  const result = await Promise.race([
    processAnalysis(job),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('job timeout')), JOB_TIMEOUT_MS)
    ),
  ])
  return result
}
```

Ao estourar, marque explicitamente o registro como `FAILED` no banco — não deixe pendurado em
`PROCESSING` esperando um retry que nunca vai vir.

### 3. Reaper de jobs órfãos no boot

Se o processo do worker morre no meio de um job (deploy, OOM, crash), o registro no banco fica
preso em `PROCESSING`/`QUEUED` para sempre — o BullMQ sabe que o job sumiu, mas seu registro de
domínio não sabe.

```ts
// Rodado uma vez no boot do worker, antes de começar a puxar da fila
async function reapStuckJobs() {
  const stuckThreshold = new Date(Date.now() - STUCK_REAP_MS) // ex: 15min
  await db.analysisRun.updateMany({
    where: { status: { in: ['PROCESSING', 'QUEUED'] }, updatedAt: { lt: stuckThreshold } },
    data: { status: 'FAILED' },
  })
}
```

### 4. Cache/resume por step (pipeline idempotente)

Se o processamento tem múltiplos estágios caros (ex: 3 chamadas de IA em sequência) e falha no
estágio 2, não repita o estágio 1 (que já custou dinheiro/tempo) num retry:

```ts
async function executeWithLogging(stepName: string, analysisId: string, fn: () => Promise<T>) {
  const cached = await db.analysisLog.findFirst({ where: { analysisId, step: stepName, status: 'success' } })
  if (cached) return cached.result

  const result = await fn()
  await db.analysisLog.create({ data: { analysisId, step: stepName, status: 'success', result } })
  return result
}
```

### 5. GC de artefatos órfãos (idade-limitada)

Falhas parciais deixam artefatos (imagens geradas, arquivos temporários) que já custaram para
serem gerados — não delete imediatamente, mantenha por uma janela de retry manual, delete depois:

```ts
// roda periodicamente, ex: cron diário
async function gcOrphanedArtifacts(maxAgeDays = 7) {
  const cutoff = new Date(Date.now() - maxAgeDays * 86400_000)
  const orphaned = await findFailedRunsOlderThan(cutoff)
  for (const run of orphaned) await deleteGeneratedFiles(run.id)
}
```

### 6. Múltiplas filas/crons no mesmo processo worker

Um único processo worker pode rodar várias filas/schedulers simultaneamente — não precisa de um
container por fila:

```ts
// worker/index.ts
async function main() {
  await reapStuckJobs()
  setupAnalysisWorker()          // fila principal, on-demand
  scheduleCreditExpiryCron()     // cron interno via BullMQ repeatable jobs
  scheduleSubscriptionExpiryCron()
  scheduleReengagementCron()
}
```

## Escalonamento horizontal

```bash
docker compose up -d --scale worker=3
```

Com `WORKER_CONCURRENCY` controlando quantos jobs cada réplica processa em paralelo, e BullMQ
cuidando de distribuir os jobs da fila entre as réplicas automaticamente (sem coordenação manual
necessária — é o comportamento nativo de uma fila compartilhada via Redis).

## Dockerfile.worker — mais memória que o web

```dockerfile
FROM node:20-slim AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
# Copia SÓ o necessário pro worker — não o `.next/` nem o `app/` do Next.js
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/prisma ./prisma

RUN npm install -g tsx
CMD ["tsx", "worker/index.ts"]
```

No `docker-compose.yml`, dê ao worker um limite de memória maior que o serviço web — trabalho
de IA/imagem (buffering de resposta, processamento com `sharp`) é mais memory-heavy que servir
páginas:

```yaml
worker:
  build: { dockerfile: Dockerfile.worker }
  deploy:
    resources:
      limits: { cpus: '2', memory: 2G }   # vs. 1 vCPU/1GB do serviço web
```

## Checklist — só aplique se o app realmente precisar de worker

- [ ] Confirmar que a operação realmente não cabe num ciclo request/response normal antes de
      adicionar essa complexidade
- [ ] Heartbeat file + healthcheck Docker apontando pra ele
- [ ] Timeout hard-ceiling por job via `Promise.race`, não só `attempts` do BullMQ
- [ ] Reaper de jobs órfãos rodando no boot do worker
- [ ] Pipeline idempotente com cache por step se houver múltiplos estágios caros
- [ ] GC de artefatos órfãos com janela de retenção antes de deletar
- [ ] `WORKER_CONCURRENCY` configurável via env, não hardcoded
- [ ] Container worker com limite de memória maior que o container web
- [ ] Comunicação API↔worker sempre via banco de dados (nunca RPC direto)
