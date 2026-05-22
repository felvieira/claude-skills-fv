---
scenario: 25-ai-integration-architect
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 320
tokens_out_approx: 1100
time_seconds: 28
quality_score: 3.5
quality_breakdown:
  specificity: 3
  completeness: 4
  correctness: 4
  actionability: 4
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "covers adapters + fallback + cost ok; no observability architecture beyond logging advice; no provider contract / DI wiring; no structured output schema validation; streaming caveat noted but not solved; no real separation of concern between router/adapter/feature layers"
---

# Baseline — 25 AI Integration Architect

**Architecture for AI text summarization + task extraction with multi-provider support:**

## 1. Provider Adapter Layer (Strategy Pattern)

```typescript
// src/ai/providers/types.ts
interface AIProvider {
  complete(req: CompletionRequest): Promise<CompletionResponse>
  stream(req: CompletionRequest): AsyncIterable<StreamChunk>
}

interface CompletionRequest {
  systemPrompt: string
  userMessage: string
  maxTokens?: number
  model?: string
}
```

```typescript
// src/ai/providers/openai.provider.ts
import OpenAI from 'openai'

export class OpenAIProvider implements AIProvider {
  private client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const res = await this.client.chat.completions.create({
      model: req.model ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: req.systemPrompt },
        { role: 'user', content: req.userMessage }
      ],
      max_tokens: req.maxTokens ?? 1024,
    })
    return { text: res.choices[0].message.content!, usage: res.usage }
  }

  async *stream(req: CompletionRequest): AsyncIterable<StreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: req.model ?? 'gpt-4o-mini',
      messages: [{ role: 'system', content: req.systemPrompt }, { role: 'user', content: req.userMessage }],
      stream: true,
    })
    for await (const chunk of stream) {
      yield { delta: chunk.choices[0]?.delta?.content ?? '' }
    }
  }
}
```

```typescript
// src/ai/providers/anthropic.provider.ts
import Anthropic from '@anthropic-ai/sdk'

export class AnthropicProvider implements AIProvider {
  private client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    const res = await this.client.messages.create({
      model: req.model ?? 'claude-3-5-haiku-latest',
      max_tokens: req.maxTokens ?? 1024,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userMessage }],
    })
    return { text: (res.content[0] as any).text, usage: { prompt_tokens: res.usage.input_tokens, completion_tokens: res.usage.output_tokens } }
  }

  async *stream(req: CompletionRequest): AsyncIterable<StreamChunk> {
    const stream = await this.client.messages.create({
      model: req.model ?? 'claude-3-5-haiku-latest',
      max_tokens: req.maxTokens ?? 1024,
      system: req.systemPrompt,
      messages: [{ role: 'user', content: req.userMessage }],
      stream: true,
    })
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { delta: event.delta.text }
      }
    }
  }
}
```

## 2. Fallback Router

```typescript
// src/ai/ai-router.ts
export class AIRouter {
  constructor(private providers: AIProvider[]) {}

  async complete(req: CompletionRequest): Promise<CompletionResponse> {
    let lastError: Error | null = null
    for (const provider of this.providers) {
      try {
        return await provider.complete(req)
      } catch (err) {
        lastError = err as Error
        console.warn(`Provider failed, trying next: ${err}`)
      }
    }
    throw lastError
  }
}
```

## 3. Feature Service

```typescript
// src/ai/text-analysis.service.ts
const SYSTEM_PROMPT = `You are a productivity assistant. Given a text, return ONLY valid JSON with:
{
  "summary": "concise summary in 3-5 sentences",
  "tasks": [{ "title": "task title", "priority": "high|medium|low", "due": "ISO date or null" }]
}`

export class TextAnalysisService {
  constructor(private router: AIRouter) {}

  async analyze(text: string): Promise<AnalysisResult> {
    const response = await this.router.complete({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: text,
    })
    return JSON.parse(response.text)
  }
}
```

## 4. Observability

- Log every call: `{ provider, model, tokens_in, tokens_out, latency_ms, success }`
- Use OpenTelemetry spans around provider calls
- Emit a `ai.request` metric with tags: `provider`, `feature`, `status`
- Set budget alerts: track `tokens_out` per user per day, reject when over limit

## 5. Cost Control

- Per-user token quota in Redis (TTL = 24h): `INCR ai:quota:{userId}:{date}`
- Reject with HTTP 429 when over limit
- Prefer smaller models by default (`gpt-4o-mini`, `claude-3-5-haiku`); escalate to larger only on retry

## 6. Streaming to Frontend

- Expose `/api/analyze/stream` as SSE endpoint
- Parse and yield partial JSON carefully (summary streams fine; tasks block until complete)
- Or: stream summary, then send tasks as a second JSON event when complete

## Risks

- JSON parsing failures from LLM (add `JSON.parse` try/catch + retry with stricter prompt)
- Cold provider switch breaking mid-stream (can't retry mid-stream; only fallback on initial connection failure)
- Token cost explosion on large inputs (add `maxInputChars: 20_000` guard before sending)
