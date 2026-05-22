---
scenario: 27-video-integration-specialist
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 520
time_seconds: 18
quality_score: 2.75
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: n/a
delta_vs_baseline: n/a
notes: "baseline — no skill loaded; generic provider table, shallow queue/cost coverage, no adapter pattern, no handoffs"
---

# Baseline — Video Integration (no skill)

## Scenario input
"Feature nova: usuário descreve cena e geramos clip 5-10s (text-to-video) pra usar em post. Que providers (Runway/Pika/etc), como integro no backend, como controlo custo e fila de jobs?"

## Response

### Providers

| Provider | Quality | Price/s | API status |
|---|---|---|---|
| Runway Gen-3 Alpha | Best | ~$0.05/s | Public API |
| Pika 1.5 | Good | ~$0.03/s | Beta API |
| Kling 1.5 | Good | ~$0.03/s | Via fal.ai proxy |
| Luma Dream Machine | Good (motion) | ~$0.04/s | Public API |
| Sora (OpenAI) | Highest | N/A | No public API |

**Recommendation:** Runway Gen-3 as primary, fal.ai (Kling/LTXV) as cost fallback.

---

### Backend integration

**Endpoint shape:**
```http
POST /api/video-jobs
Content-Type: application/json

{
  "prompt": "Aerial shot of ocean waves at sunset, slow motion",
  "duration": 5,
  "aspect_ratio": "16:9",
  "user_id": "usr_123"
}
```

**Flow:**
1. Validate prompt + user quota
2. Deduct credits / check daily cap
3. Enqueue job to Redis queue
4. Return `{ job_id, status: "queued", estimated_wait: 45 }` immediately
5. Worker picks job, calls provider async API
6. Poll provider or receive webhook when done
7. Upload result to own S3/R2 bucket (don't serve provider URL directly — they expire)
8. Notify user via WebSocket or SSE
9. Update DB record with final URL + cost

---

### Cost control

- **Credit system:** users get N free clips/month, pay per additional
- **Pre-confirm cost estimate** shown in UI before generation starts
- **Daily hard cap per user** via Redis `INCR`/`EXPIRE` counter
- **Global spend alarm** if daily total > threshold (webhook to Slack/PagerDuty)
- **Provider tiering:** short prompts → cheaper provider (Pika), quality mode → Runway
- **Cache identical prompts** (hash prompt + params, return cached video within 24h)

---

### Job queue

**Stack:** BullMQ + Redis (Node) or Celery + Redis (Python)

```javascript
// BullMQ example
const videoQueue = new Queue('video-generation', { connection: redis });

// Enqueue
await videoQueue.add('generate', { prompt, userId, provider: 'runway' }, {
  attempts: 2,
  backoff: { type: 'exponential', delay: 10000 },
  removeOnComplete: 100,
  removeOnFail: 200,
});
```

**Queue design:**
- `video-gen-fast` → Pika/fal.ai (lower cost, faster)
- `video-gen-quality` → Runway (better output, slower, more expensive)
- Dead-letter queue for failed jobs → log + notify user
- Concurrency: 3-5 workers per queue to avoid provider rate limits
- Job timeout: 120s (providers usually respond within 60s)

---

### Risks / considerations

- Provider API rate limits — implement exponential backoff
- Provider URLs expire — always proxy through your own CDN/storage
- Prompt moderation — run content filter before sending to provider
- Generation can take 30-90s — always async, never block HTTP request
