# Hooks and Adapters

## Objetivo

Dar ao agente uma base padrao para implementar features de IA no app sem redesenhar o fluxo tecnico toda vez.

## Hooks sugeridos

### Texto
- `useTextGeneration`
- `useTextStream`
- `useStructuredGeneration`

### Imagem
- `useImageGeneration`
- `useImageEdit`
- `useImageAssetContext`

### Video
- `useVideoGeneration`
- `useVideoFromImage`

### Infra
- `useAIFallback`
- `useAICost`
- `useAIObservability`
- `usePromptTemplate`
- `useRepoAuditContext`

## Adaptadores server-side

- `generateText()`
- `streamText()`
- `generateStructured()`
- `generateImage()`
- `editImage()`
- `generateVideo()`

## Regra importante

Hooks sao ergonomia de app.
Adapters sao a camada de integracao real com provider.

Secrets ficam apenas nos adapters server-side.

Antes de criar hook novo, validar `install-policy.md` e `runtime-requirements.md`.
