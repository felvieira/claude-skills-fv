# AI Integration Playbook

Guia unico para implementar IA em aplicacoes usando este kit.

## Quando usar

Use este playbook quando a tarefa for integrar texto, imagem ou video no app do usuario.

## Ordem recomendada

1. ler `docs/repo-audit/current.md`
2. ler `docs/repo-audit/assets.md` quando houver contexto visual
3. consultar `patterns/ai-integration/README.md`
4. escolher provider em `patterns/ai-integration/providers.md`
5. validar runtime em `patterns/ai-integration/runtime-requirements.md`
6. validar instalacao em `patterns/ai-integration/install-policy.md`
7. consultar `patterns/ai-integration/prompt-patterns.md`
8. consultar exemplos em `patterns/ai-integration/examples/`

## Decisao de provider

### Texto
- default: `Vercel AI Gateway` ou `OpenRouter`
- usar schema e output estruturado quando possivel

### Imagem
- default: `fal.ai`
- sempre ler contexto visual antes de gerar asset no app

### Video
- default: `fal.ai`
- usar apenas quando a necessidade justificar custo e latencia

## Decisao de runtime

- preferir Node/TypeScript quando o projeto ja for JS-first
- usar Python apenas se o repo ja usar Python ou se houver justificativa tecnica clara
- nunca instalar runtime novo sem necessidade real

## Decisao de arquitetura

- adapter server-side para cada capacidade
- hook no cliente apenas para ergonomia
- segredo sempre no backend
- observabilidade e custo desde a primeira versao da feature

## Boas praticas de prompt

### Texto
- instrucao clara
- contexto minimo suficiente
- formato de saida definido
- few-shot so quando necessario

### Imagem
- sujeito, contexto, estilo, composicao, iluminacao e mood
- aproveitar assets existentes do produto
- nao inventar identidade visual nova sem motivo

### Video
- sujeito, acao, camera, ambiente, estilo e audio
- manter consistencia temporal e visual

## Checklists rapidos

### Integracao de texto
- provider definido
- adapter server-side criado
- output estruturado quando possivel
- custo e fallback considerados

### Integracao de imagem
- contexto visual lido
- provider definido
- prompt reproduzivel registrado
- output path e formato definidos

### Integracao de video
- objetivo de negocio claro
- custo/latencia aceitos
- prompt cinematografico revisado
- formato de entrega definido

## Skills para chamar

- `AI Integration Architect`
- `Prompt Engineer`
- `Data Analytics` quando houver tracking
- `Observability SRE` quando a feature exigir operacao forte
- `Asset Librarian` e `Image Generator` apenas quando houver necessidade visual operacional no fluxo
