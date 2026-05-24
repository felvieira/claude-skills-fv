/**
 * openrouter/config.ts — OpenRouter adapter unificado
 *
 * Princípio: o app nunca chama Anthropic/OpenAI direto.
 * Chama esta lib, que roteia para o melhor modelo por tier
 * e permite trocar provider sem mudar nenhum código de feature.
 *
 * Tiers:
 *   fast     → tarefas rápidas, low-cost (llama 8b, haiku)
 *   balanced → implementação, docs, QA (claude-sonnet, gpt-4o-mini)
 *   deep     → arquitetura, security, reasoning (claude-opus, o3)
 *
 * Compatível com Vercel AI SDK (@ai-sdk/openai com baseURL override).
 * Se não usar AI SDK: use a função raw `callLLM()` diretamente.
 *
 * Setup:
 *   1. Adicione OPENROUTER_API_KEY no .env
 *   2. Opcionalmente ajuste LLM_MODEL_* pra outros models
 *   3. import { llm, callLLM } from "@/lib/llm"
 */

import { createOpenAI } from "@ai-sdk/openai";
import { generateText, streamText, type CoreMessage } from "ai";

// ─────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────

export type LLMTier = "fast" | "balanced" | "deep";

export interface LLMCallOptions {
  messages: CoreMessage[];
  tier?: LLMTier;
  /** Override de model específico (ignora tier) */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Se true, retorna ReadableStream (use com streamText) */
  stream?: boolean;
  /** Metadata enviada pra OpenRouter (aparece nos logs deles) */
  meta?: {
    /** Nome da feature/route que está chamando */
    route?: string;
    /** User ID pra rate-limit por user */
    userId?: string;
  };
}

export interface LLMResult {
  text: string;
  /** Model que efetivamente respondeu (OpenRouter pode fallback) */
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    /** Custo estimado em USD (se OpenRouter retornar) */
    estimatedCostUsd?: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Config (lê do env, com fallbacks sensatos)
// ─────────────────────────────────────────────────────────────

const TIER_MODELS: Record<LLMTier, string> = {
  fast:     process.env.LLM_MODEL_FAST     ?? "meta-llama/llama-3.1-8b-instruct:free",
  balanced: process.env.LLM_MODEL_BALANCED ?? "anthropic/claude-sonnet-4-5",
  deep:     process.env.LLM_MODEL_DEEP     ?? "anthropic/claude-opus-4-5",
};

// Fallback chain: se o model principal falhar, tenta o próximo
const FALLBACK_CHAIN: Record<LLMTier, string[]> = {
  fast:     [TIER_MODELS.fast, "openai/gpt-4o-mini"],
  balanced: [TIER_MODELS.balanced, "openai/gpt-4o-mini", TIER_MODELS.fast],
  deep:     [TIER_MODELS.deep, TIER_MODELS.balanced],
};

// ─────────────────────────────────────────────────────────────
// Instância do client (Vercel AI SDK com OpenRouter baseURL)
// ─────────────────────────────────────────────────────────────

export function createLLMClient() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY não definida. Adicione ao .env ou variável de ambiente."
    );
  }

  return createOpenAI({
    baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
    apiKey,
    headers: {
      // OpenRouter: identifica sua app nos dashboards deles
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_TITLE ?? "app",
    },
  });
}

// Singleton lazy — não inicializa no import (evita erro em build sem .env)
let _client: ReturnType<typeof createLLMClient> | null = null;
function getClient() {
  if (!_client) _client = createLLMClient();
  return _client;
}

// ─────────────────────────────────────────────────────────────
// API pública
// ─────────────────────────────────────────────────────────────

/**
 * Instância do provider AI SDK — use para passar a `streamText`, `generateText` etc.
 * Exemplo:
 *   const result = await generateText({ model: llm("balanced"), messages });
 */
export function llm(tier: LLMTier = "balanced", modelOverride?: string) {
  const model = modelOverride ?? TIER_MODELS[tier];
  return getClient()(model);
}

/**
 * Chamada one-shot com retry automático no fallback chain.
 * Não faz streaming — use streamLLM() se precisar.
 */
export async function callLLM(opts: LLMCallOptions): Promise<LLMResult> {
  const tier = opts.tier ?? "balanced";
  const chain = opts.model ? [opts.model] : FALLBACK_CHAIN[tier];

  let lastError: Error | null = null;
  for (const model of chain) {
    try {
      const result = await generateText({
        model: getClient()(model),
        messages: opts.messages,
        temperature: opts.temperature ?? 0.7,
        maxTokens: opts.maxTokens,
        headers: opts.meta?.route
          ? { "X-Route": opts.meta.route, "X-User-Id": opts.meta.userId ?? "anon" }
          : undefined,
      });

      return {
        text: result.text,
        model: result.response?.modelId ?? model,
        usage: {
          promptTokens:     result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens:      result.usage.totalTokens,
          // OpenRouter retorna custo em usage.completionTokens annotations — aproximação
          estimatedCostUsd: undefined,
        },
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Só retry em erros de rate-limit / model unavailable
      if (!isRetriableError(lastError)) throw lastError;
      console.warn(`[llm] model ${model} failed (${lastError.message}), trying next...`);
    }
  }

  throw lastError ?? new Error("[llm] all models in fallback chain failed");
}

/**
 * Streaming — retorna ReadableStream compatível com Response da Web API.
 * Exemplo (Next.js route handler):
 *   const stream = await streamLLM({ messages, tier: "balanced" });
 *   return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
 */
export async function streamLLM(opts: Omit<LLMCallOptions, "stream">) {
  const tier = opts.tier ?? "balanced";
  const model = opts.model ?? TIER_MODELS[tier];

  const result = streamText({
    model: getClient()(model),
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    maxTokens: opts.maxTokens,
  });

  return result.toDataStreamResponse();
}

// ─────────────────────────────────────────────────────────────
// Helpers internos
// ─────────────────────────────────────────────────────────────

function isRetriableError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    msg.includes("rate limit") ||
    msg.includes("503") ||
    msg.includes("overloaded") ||
    msg.includes("model not available") ||
    msg.includes("context length exceeded")
  );
}
