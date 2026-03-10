# Claude Code — Dev Team Kit

Este repositorio e um kit de skills para agentes de coding. Leia os arquivos nesta ordem:

1. `GLOBAL.md` — regras universais
2. `policies/` — regras compartilhadas
3. `AGENTS.md` — objetivo e uso do kit
4. `README.md` — documentacao completa com pipeline, skills e stack

## Uso em repos consumidores

Quando instalado em `.bot/` de outro repo, o agente deve ler o `AGENTS.md` da raiz do repo consumidor, que aponta para `.bot/`.

## Economia de contexto

- reutilizar `docs/repo-audit/current.md` antes de explorar o repo
- abrir `docs/skill-guides/` apenas sob demanda
- consultar `patterns/ai-integration/` para features de IA
