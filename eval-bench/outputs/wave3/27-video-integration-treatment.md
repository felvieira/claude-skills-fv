---
scenario: 27-video-integration-specialist
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 980
time_seconds: 38
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 4
  discipline: 5
pass_fail: pass
delta_vs_baseline: +1.5
notes: "skill loaded; followed patterns/ai-integration/* + ai-integration-plan template; separated cinematic prompt anatomy; explicit handoff block; tighter scope discipline"
---

# Treatment — Video Integration Specialist

## AI Integration Plan (template `templates/ai-integration-plan.md`)

- **Caso de uso:** usuário descreve cena em texto → geração de clip 5-10s para uso em post social
- **Modalidade:** text-to-video
- **Provider/gateway:** Runway Gen-3 Alpha (primário) · fal.ai/kling-1.5 (fallback custo) · Pika 1.5 (fallback velocidade)
- **Adapters:** `VideoProviderAdapter` — interface única normaliza Runway, Pika, fal.ai
- **Hooks:** `useVideoJob(jobId)` — polling ou SSE de status; `useVideoCredit()` — cota do usuário
- **Schema/output:** `{ job_id, status, estimated_wait_s, result_url?, cost_credits, provider }`
- **Observabilidade/custo:** custo por job, taxa de falha por provider, latência p50/p99, quota diária por usuário
- **Riscos:** latência alta (30-90s), URLs de provider expiram, prompt sem moderação, custo imprevisível sem cap

---

## Provider Comparison

| Provider | Qualidade | Custo estimado | API pública | Latência típica |
|---|---|---|---|---|
| Runway Gen-3 Alpha | Excelente | ~$0.05/s ($0.25-0.50/clip) | Sim | 45-90s |
| Pika 1.5 | Boa | ~$0.03/s ($0.15-0.30/clip) | Beta | 20-45s |
| Kling 1.5 (via fal.ai) | Boa | ~$0.03/s | Via fal.ai proxy | 30-60s |
| Luma Dream Machine | Boa (motion suave) | ~$0.04/s | Sim | 40-70s |
| Sora (OpenAI) | Máxima | N/D | Sem API pública | — |

**Decisão:** Runway como primário (qualidade justifica custo para social posts). fal.ai/Kling como fallback quando Runway estiver lento ou caro demais. Nunca expor qual provider foi usado internamente — normalizar via adapter.

---

## Fluxo de Integração

Seguindo `patterns/ai-integration/video-generation.md`:

```
[Frontend] → POST /api/video-jobs
              ↓
          [Backend] valida cota + modera prompt
              ↓
          [Queue: video-gen] BullMQ/Celery + Redis
              ↓
          [Worker] VideoProviderAdapter.submit(prompt, duration, provider)
              ↓
          [Provider API] Runway / fal.ai (polling ou webhook)
              ↓
          [Worker] faz upload resultado → R2/S3 próprio (nunca servir URL do provider diretamente)
              ↓
          [Backend] atualiza job → notifica via SSE/WebSocket
              ↓
          [Frontend] exibe preview + botão "Usar no post"
```

### Adapter (contrato mínimo)

```typescript
interface VideoProviderAdapter {
  submit(params: VideoJobParams): Promise<{ externalJobId: string }>;
  poll(externalJobId: string): Promise<VideoJobStatus>;
  // ou: registerWebhook(callbackUrl: string): void;
}

interface VideoJobParams {
  prompt: string;      // prompt cinematográfico processado
  duration: 5 | 10;
  aspectRatio: '16:9' | '9:16' | '1:1';
  provider: 'runway' | 'pika' | 'kling';
}
```

Implementações concretas: `RunwayAdapter`, `PikaAdapter`, `FalAiAdapter`. Chaves de provider **apenas no backend** (regra de `patterns/ai-integration/security.md`).

---

## Prompt Cinematográfico

Seguindo `patterns/ai-integration/prompt-patterns.md` (seção Vídeo): separar sujeito, ação, câmera, ambiente, estilo e áudio. Vídeo exige consistência temporal — não tratar como extensão de prompt de imagem.

**Template de prompt para o usuário:**

```
Sujeito: <o que aparece>
Ação: <o que acontece>
Câmera: <enquadramento e movimento — ex: "close-up lento pan para direita">
Ambiente: <cenário, iluminação, hora do dia>
Estilo: <cinemático, minimalista, vibrante — ajustado ao tom do post>
Áudio: <sem áudio | som ambiente | música suave instrumental>
```

**Enriquecimento automático no backend:** antes de enviar ao provider, o backend expande a descrição do usuário com um LLM leve (ex: Haiku) usando o template acima → o prompt final nunca é o texto bruto do usuário.

---

## Controle de Custo e Fila

### Cota por usuário

```typescript
// Redis: key = `video:quota:{userId}:{date}`
// INCR + EXPIRE 86400
// Limite: ex. 3 clips/dia free, 20 clips/dia pago

async function checkAndDeductQuota(userId: string, plan: 'free' | 'pro'): Promise<boolean> {
  const limit = plan === 'pro' ? 20 : 3;
  const current = await redis.incr(`video:quota:${userId}:${today()}`);
  if (current === 1) await redis.expire(`video:quota:${userId}:${today()}`, 86400);
  if (current > limit) { await redis.decr(`video:quota:${userId}:${today()}`); return false; }
  return true;
}
```

### Filas separadas por SLA

```
video-gen-fast    → Pika/fal.ai  | concurrency 5 | timeout 60s  | custo baixo
video-gen-quality → Runway       | concurrency 3 | timeout 120s | custo alto
```

- Retry: máx 2 tentativas, backoff exponencial 10s/30s
- Dead-letter queue: job falho → log + notificação ao usuário + crédito devolvido
- Alarme: se gasto diário global > threshold → webhook Slack/PagerDuty

### Validação de custo antes de gerar (cost-efficiency pattern)

```typescript
// Antes de enfileirar: mostrar estimativa ao usuário e pedir confirmação
const estimate = { credits: 2, approxCost: '$0.30', duration: 5 };
// Frontend: "Isso vai consumir 2 créditos. Confirmar?"
```

---

## Handoffs

| Área | O que precisa |
|---|---|
| **AI Integration Architect** | Adapter layer e roteamento de provider já definidos aqui |
| **Prompt Engineer** | Template cinematográfico acima + enriquecimento via Haiku |
| **Frontend** | Hook `useVideoJob(jobId)` com estados: `queued → processing → done → failed`; UX de "estimativa de espera" durante polling |
| **Observability SRE** | Métricas: `video_job_latency_p99`, `video_job_cost_credits`, `video_job_failure_rate_by_provider`; alarme de spend diário |
| **Security** | Moderação de prompt antes de enviar ao provider; chaves apenas no backend; nunca logar payload com PII |

---

## Evidência de Conclusão

- [x] Provider primário e fallback definidos com critérios de roteamento
- [x] Fluxo async completo (enqueue → worker → storage próprio → notify)
- [x] Adapter interface normalizada (não acopla ao provider diretamente)
- [x] Controle de cota por usuário + alarme de gasto global
- [x] Filas separadas por SLA/custo
- [x] Prompt cinematográfico template + enriquecimento automático
- [x] Handoffs para todas as skills dependentes
