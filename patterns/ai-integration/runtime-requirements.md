# Runtime Requirements

## Vercel AI Gateway

- tipo: gateway de texto e modelos diversos
- runtime preferido: TypeScript/Node
- segredo esperado: `AI_GATEWAY_API_KEY`
- cliente sugerido: `ai` SDK ou cliente compativel OpenAI
- instalacao tipica: `npm install ai`

## OpenRouter

- tipo: gateway de texto multi-model
- runtime preferido: TypeScript/Node
- segredo esperado: `OPENROUTER_API_KEY`
- cliente sugerido: `@openrouter/sdk` ou cliente compativel OpenAI
- instalacao tipica: `npm install @openrouter/sdk`

## fal.ai

- tipo: imagem e video
- runtime preferido: TypeScript/Node para apps JS; Python so quando o projeto ja usar pipeline Python
- segredo esperado: `FAL_KEY` ou `FAL_API_KEY`
- cliente sugerido: SDK HTTP ou adapter server-side proprio
- instalacao tipica JS: adapter com `fetch` ou SDK do provider
- instalacao tipica Python: apenas quando houver justificativa tecnica clara

## Regra geral

- segredo sempre no backend
- frontend consome endpoint interno do app
- toda integracao deve declarar runtime, pacote, env vars e comando de teste
