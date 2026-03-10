# AI Integration Patterns

Camada separada de padroes para integrar IA em aplicacoes.

Isto NAO substitui as skills operacionais do kit.

- skills como `Image Generator` ajudam durante o trabalho do agente
- patterns de `ai-integration` ajudam o agente a implementar features de IA no app do usuario

## Objetivo

Dar ao agente uma base reutilizavel para integrar texto, imagem e video sem reinventar plumbing em toda feature.

## Blocos

- `providers.md` = gateways e providers recomendados
- `runtime-requirements.md` = requisitos por provider
- `install-policy.md` = quando e como instalar dependencias
- `hooks.md` = hooks e adapters padrao para app
- `text-generation.md` = padrao para features de texto
- `image-generation.md` = padrao para features de imagem
- `video-generation.md` = padrao para features de video
- `prompt-patterns.md` = boas praticas de prompt para texto, imagem e video
- `cost-efficiency.md` = estrategias de custo, caching e contexto minimo
- `security.md` = secrets, backend-only e safety de integracao
- `examples/` = exemplos reais de adapters e hooks
- `docs/ai-integration-playbook.md` = visao unica e fluxo recomendado

## Regra de uso

Quando o usuario pedir para integrar IA no app, o agente deve consultar esta pasta antes de improvisar uma arquitetura nova.
