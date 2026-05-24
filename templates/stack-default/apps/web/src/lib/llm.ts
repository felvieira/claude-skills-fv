/**
 * lib/llm.ts — Re-export do adapter OpenRouter para uso no app.
 *
 * Import sempre daqui, não de openrouter/config.ts diretamente.
 * Isso permite mockar em testes sem mudar imports.
 */
export { llm, callLLM, streamLLM, type LLMTier, type LLMCallOptions, type LLMResult } from "../../openrouter/config";
