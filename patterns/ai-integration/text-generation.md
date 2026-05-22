# Text Generation Pattern

Pattern canônico para integrar geração de texto com LLMs em aplicações. Usa adapter pattern + provider abstraction para manter o app desacoplado do provider.

Consultar antes: `providers.md`, `hooks.md`, `security.md`, `cost-efficiency.md`.

---

## Uso ideal

- assistentes e copilots de produto
- resumo, classificação, extração estruturada
- geração orientada por schema (JSON output)
- reescrita, tradução, moderação de conteúdo
- chatbots e conversational UI

## Quando NÃO usar este pattern

- geração de imagem → `image-generation.md`
- geração de vídeo → `video-generation.md`
- agentes multi-step com ferramentas → prefira Vercel AI SDK `generateObject` + tool calls com estado explícito

---

## Arquitetura: Camadas

```
App (React/Next.js)
  └── Hook: useTextGeneration / useTextStream
        └── API Route / Server Action (Next.js) ou Controller (Express/NestJS)
              └── Adapter: generateText() / streamText()
                    └── Provider Gateway (Vercel AI Gateway / OpenRouter)
                          └── Model (Claude / GPT / Gemini / Mistral)
```

**Regra:** secrets ficam apenas no adapter server-side. O frontend nunca toca na API key.

---

## Adapter Server-Side

### Interface do adapter

```typescript
// lib/ai/types.ts

export interface TextGenerationOptions {
  prompt: string;
  systemPrompt?: string;
  model?: string;           // override de modelo por request
  maxTokens?: number;
  temperature?: number;
  schema?: z.ZodSchema;    // quando quiser output estruturado
  stream?: boolean;
  metadata?: Record<string, string>; // para observabilidade
}

export interface TextGenerationResult {
  text: string;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
  latencyMs: number;
  costEstimateUsd?: number;
}
```

### Adapter concreto (Vercel AI SDK + gateway)

```typescript
// lib/ai/adapters/text-adapter.ts

import { generateText, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import { TextGenerationOptions, TextGenerationResult } from "../types";
import { estimateCost } from "../cost";
import { logAICall } from "../observability";

const gateway = createOpenAI({
  baseURL: process.env.AI_GATEWAY_URL,        // Vercel AI Gateway ou OpenRouter
  apiKey: process.env.AI_GATEWAY_API_KEY!,
});

const DEFAULT_MODEL = process.env.AI_DEFAULT_TEXT_MODEL ?? "claude-3-5-haiku-20241022";
const DEFAULT_MAX_TOKENS = 1024;

export async function generateTextAdapter(
  opts: TextGenerationOptions
): Promise<TextGenerationResult> {
  const model = opts.model ?? DEFAULT_MODEL;
  const start = Date.now();

  const { text, usage } = await generateText({
    model: gateway(model),
    system: opts.systemPrompt,
    prompt: opts.prompt,
    maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: opts.temperature ?? 0.3,
  });

  const latencyMs = Date.now() - start;
  const costEstimateUsd = estimateCost(model, usage.promptTokens, usage.completionTokens);

  await logAICall({
    type: "text",
    model,
    inputTokens: usage.promptTokens,
    outputTokens: usage.completionTokens,
    latencyMs,
    costEstimateUsd,
    metadata: opts.metadata,
  });

  return {
    text,
    usage: { inputTokens: usage.promptTokens, outputTokens: usage.completionTokens },
    model,
    latencyMs,
    costEstimateUsd,
  };
}

export async function streamTextAdapter(opts: TextGenerationOptions) {
  const model = opts.model ?? DEFAULT_MODEL;

  const result = streamText({
    model: gateway(model),
    system: opts.systemPrompt,
    prompt: opts.prompt,
    maxTokens: opts.maxTokens ?? DEFAULT_MAX_TOKENS,
    temperature: opts.temperature ?? 0.3,
    onFinish: async ({ usage }) => {
      await logAICall({
        type: "text-stream",
        model,
        inputTokens: usage.promptTokens,
        outputTokens: usage.completionTokens,
        metadata: opts.metadata,
      });
    },
  });

  return result;
}
```

### Output estruturado (generateObject)

```typescript
// lib/ai/adapters/structured-adapter.ts

import { generateObject } from "ai";
import { z } from "zod";
import { gateway } from "./text-adapter";

export async function generateStructured<T>(opts: {
  prompt: string;
  systemPrompt?: string;
  schema: z.ZodSchema<T>;
  model?: string;
}): Promise<T> {
  const { object } = await generateObject({
    model: gateway(opts.model ?? DEFAULT_MODEL),
    system: opts.systemPrompt,
    prompt: opts.prompt,
    schema: opts.schema,
  });
  return object;
}
```

---

## Hooks para o Frontend

```typescript
// hooks/useTextGeneration.ts

import { useState, useCallback } from "react";

interface UseTextGenerationOptions {
  endpoint?: string;
  onSuccess?: (result: string) => void;
  onError?: (err: Error) => void;
}

export function useTextGeneration(opts: UseTextGenerationOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const generate = useCallback(async (prompt: string, body?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(opts.endpoint ?? "/api/ai/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...body }),
      });
      if (!res.ok) throw new Error(`AI request failed: ${res.status}`);
      const data = await res.json();
      setResult(data.text);
      opts.onSuccess?.(data.text);
      return data.text as string;
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setError(err);
      opts.onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [opts]);

  return { generate, loading, error, result };
}
```

```typescript
// hooks/useTextStream.ts — SSE / ReadableStream

import { useCallback, useState, useRef } from "react";

export function useTextStream(endpoint = "/api/ai/stream") {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const stream = useCallback(async (prompt: string) => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStreaming(true);
    setText("");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: abortRef.current.signal,
    });

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      setText((prev) => prev + decoder.decode(value));
    }
    setStreaming(false);
  }, [endpoint]);

  const stop = () => { abortRef.current?.abort(); setStreaming(false); };

  return { stream, stop, streaming, text };
}
```

---

## API Route (Next.js App Router)

```typescript
// app/api/ai/text/route.ts

import { NextRequest, NextResponse } from "next/server";
import { generateTextAdapter } from "@/lib/ai/adapters/text-adapter";
import { z } from "zod";

const RequestSchema = z.object({
  prompt: z.string().min(1).max(8000),
  systemPrompt: z.string().optional(),
  model: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const result = await generateTextAdapter(parsed.data);
    return NextResponse.json(result);
  } catch (e) {
    console.error("[ai/text]", e);
    return NextResponse.json({ error: "Generation failed" }, { status: 500 });
  }
}
```

---

## Fallback Strategy

```typescript
// lib/ai/adapters/text-with-fallback.ts

import { generateTextAdapter } from "./text-adapter";
import { TextGenerationOptions } from "../types";

const FALLBACK_CHAIN = [
  process.env.AI_PRIMARY_MODEL ?? "claude-3-5-haiku-20241022",
  "openai/gpt-4o-mini",
  "mistralai/mistral-small",
];

export async function generateTextWithFallback(opts: TextGenerationOptions) {
  let lastError: Error | null = null;
  for (const model of FALLBACK_CHAIN) {
    try {
      return await generateTextAdapter({ ...opts, model });
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`[ai-fallback] model ${model} failed, trying next`, lastError.message);
    }
  }
  throw lastError;
}
```

---

## Observabilidade e Cost Tracking

```typescript
// lib/ai/observability.ts

export interface AICallLog {
  type: "text" | "text-stream" | "image" | "video";
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs?: number;
  costEstimateUsd?: number;
  metadata?: Record<string, string>;
}

export async function logAICall(log: AICallLog) {
  // Plugar aqui: Posthog, Datadog, Langfuse, ou console simples
  if (process.env.NODE_ENV === "development") {
    console.log("[ai-log]", JSON.stringify(log));
  }
  // Em produção: enfileirar evento de analytics sem bloquear response
  // await analytics.track("ai_call", log);
}
```

```typescript
// lib/ai/cost.ts — estimativa simples baseada em tokens

const COST_PER_1K_TOKENS: Record<string, { input: number; output: number }> = {
  "claude-3-5-haiku-20241022": { input: 0.0008, output: 0.0004 },
  "claude-3-5-sonnet-20241022": { input: 0.003, output: 0.015 },
  "openai/gpt-4o-mini": { input: 0.00015, output: 0.0006 },
  "mistralai/mistral-small": { input: 0.0002, output: 0.0006 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = COST_PER_1K_TOKENS[model];
  if (!rates) return 0;
  return (inputTokens / 1000) * rates.input + (outputTokens / 1000) * rates.output;
}
```

---

## Tabela de Decisão: Modo de Geração

| Caso de uso                        | Modo              | Hook sugerido            |
|------------------------------------|-------------------|--------------------------|
| Resumo / classificação / extração  | `generateText`    | `useTextGeneration`      |
| Chat com resposta longa            | `streamText`      | `useTextStream`          |
| JSON tipado, schema fixo           | `generateObject`  | `useTextGeneration`      |
| Alta confiabilidade, custo crítico | fallback chain    | `generateTextWithFallback`|
| Contexto muito longo (>8k tokens)  | resumir antes     | ver `cost-efficiency.md` |

---

## Tabela de Decisão: Modelo por Custo × Qualidade

| Perfil                        | Modelo sugerido                    | Custo relativo |
|-------------------------------|-------------------------------------|----------------|
| Alta frequência, baixo risco  | `claude-3-5-haiku` / `gpt-4o-mini` | Baixo          |
| Produção padrão               | `claude-3-5-sonnet`                 | Médio          |
| Raciocínio complexo           | `claude-opus-4` / `gpt-4o`         | Alto           |
| Fallback de emergência        | `mistral-small` / `llama-3-8b`     | Muito baixo    |

---

## Fluxo recomendado

1. montar prompt com template claro (ver `prompt-patterns.md`)
2. injetar contexto mínimo necessário — evitar stuffing
3. escolher modo: `generateText` para resultado síncrono, `streamText` apenas quando melhorar UX real
4. usar `generateObject` + schema Zod quando output for operacional (nunca parsear string manualmente)
5. registrar latência, erro e custo estimado via `logAICall`
6. configurar fallback se o provider for crítico para o fluxo

---

## Defaults

- temperatura: `0.3` para tarefas factuais, `0.7` para criação
- max tokens: `1024` como teto default — aumentar apenas com justificativa de UX
- streaming: apenas quando latência percebida for o maior problema de UX
- schema: obrigatório quando o app vai parsear o output programaticamente
- histório de conversa: resumir antes de enviar se >6 turnos (ver `cost-efficiency.md`)
- secrets: **nunca** no frontend, apenas no adapter server-side (ver `security.md`)

---

## Cross-links

- `providers.md` — qual gateway usar e por quê
- `hooks.md` — catálogo de hooks e adapters do kit
- `prompt-patterns.md` — boas práticas de prompt
- `cost-efficiency.md` — caching, contexto mínimo, RAG
- `security.md` — gestão de secrets e safety de prompt
- `inference-time-compute.md` — padrões multi-sample (BoN, MoA) para qualidade extra
- `templates/ai-integration-plan.md` — template de planejamento de integração
