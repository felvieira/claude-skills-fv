# Providers and Gateways

## Texto

### Vercel AI Gateway
- endpoint unificado para varios providers
- budgets, monitoramento, fallback e observabilidade centralizados
- bom default para apps em Next.js ou stack TypeScript

### OpenRouter
- endpoint unico para muitos modelos
- bom para fallback rapido entre providers e comparacao de custo/modelo
- usar preferencialmente via SDK proprio ou endpoint compativel OpenAI

## Imagem

### fal.ai
- bom para text-to-image, image-to-image, utilitarios de imagem e video
- catalogo amplo de modelos de imagem e video
- bom default para features multimodais e pipeline de media

## Recomendacao pratica

- texto: priorizar `Vercel AI Gateway` ou `OpenRouter`
- imagem: priorizar `fal.ai`
- video: priorizar `fal.ai` quando a feature exigir geracao ou edicao de video

## Regras de arquitetura

- nunca acoplar a feature direto a um provider no frontend
- sempre criar um adapter interno por capacidade: texto, imagem, video
- provider e modelo devem ser configuraveis por ambiente
- consultar `runtime-requirements.md` antes de instalar SDK novo
