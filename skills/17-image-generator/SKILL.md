---
name: image-generator
description: |
  Skill para geracao e adaptacao de assets visuais. Use quando o projeto precisar de hero image,
  background, ilustracao, icone, favicon, mascote ou derivacao de imagem existente sem destoar do app.
  Trigger em: "gerar imagem", "criar imagem", "hero image", "background image", "favicon", "icone",
  "mascote", "illustration", "remover fundo", "transparent icon", "tauri icons".
argument-hint: "[tipo: t2i|i2i|rembg|ico] [prompt ou caminho-da-imagem]"
allowed-tools: Read, Write, Bash(python *), Bash(uv run *)
---

# Image Generator

O Image Generator cria ou adapta assets visuais mantendo consistencia com o contexto real do produto.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/tool-safety.md` e `policies/evals.md`.

## Quando Usar

- criar hero image, background, ilustracao, icone, favicon ou mascote
- derivar asset existente sem quebrar identidade visual do app
- preparar assets para web, SEO social cards ou Tauri/mobile

## Quando Nao Usar

- para inventar estilo novo sem analisar o produto existente
- para substituir UI/UX, SEO ou Frontend na definicao de uso do asset
- para gerar imagem final sem antes verificar contexto visual quando o repo ja tiver assets

## Entradas Esperadas

- tipo de asset necessario
- onde o asset sera usado
- contexto visual do projeto
- paths de assets existentes, se houver
- restricoes de formato, tamanho, transparencia e output

## Saidas Esperadas

- prompt final reproduzivel
- asset coerente com o projeto
- output path e variacoes geradas
- handoff claro para Orchestrator, UI/UX, Frontend ou SEO

## Responsabilidades

1. Decidir entre gerar do zero (`t2i`) ou derivar asset existente (`i2i`)
2. Analisar identidade visual antes de propor prompt ou modelo
3. Garantir consistencia com cores, composicao, linguagem visual e assets do projeto
4. Escolher formato e pos-processamento adequados ao uso final
5. Registrar prompt, modelo, output e motivo das escolhas

## Regra Mais Importante

Se o repositorio ja tiver imagens, ilustracoes, icones, logos, backgrounds, mascotes ou design tokens, a skill DEVE analisar esse contexto primeiro.

Nunca gerar asset como se o projeto fosse uma folha em branco quando ja existir linguagem visual estabelecida.

## Analise de Contexto Visual

Antes de gerar qualquer imagem, verificar nesta ordem:

1. `UI/UX` e design tokens do projeto
2. assets existentes em `public/`, `assets/`, `src-tauri/icons/` ou caminhos equivalentes
3. componentes e paginas onde a imagem vai entrar
4. metadata/SEO quando a imagem for social card, thumbnail ou hero publica
5. restricoes de plataforma, como favicon, app icon ou transparencia

## Checklist Antes de Gerar

- qual e a funcao do asset no produto
- o projeto ja tem paleta, contraste, mood e linguagem visual definidos
- existem imagens ou icones parecidos para derivacao ou referencia
- a imagem precisa parecer parte do mesmo app, e nao um elemento isolado de outro estilo
- o output final precisa de transparencia, resize, ico ou pacote para Tauri

## Modos de Trabalho

- `t2i`: usar apenas quando nao houver asset base adequado
- `i2i`: preferir quando o projeto ja tiver mascote, icone, ilustracao ou base visual reutilizavel

## Tipos de Asset

| Tipo | Quando usar | Skill responsavel |
|------|-------------|-------------------|
| `hero` | imagem principal acima da dobra | **17 (esta skill)** |
| `mascote` | personagem da marca em nova situacao | **17 (esta skill)** |
| `illustration` | ilustracao explicativa de conceito | **17 (esta skill)** |
| `background` | textura ou fundo de secao | **17 (esta skill)** |
| `layout` | imagem compondo secao ou tela inteira | **17 (esta skill)** |
| `icon` | icone de funcionalidade ou servico | **17 (esta skill)** |
| `favicon` | favicon multi-tamanho + apple-touch-icon + PWA icons | **36 (Web Asset Generator)** — dedicada |
| `social-card` (OG / Twitter) | Open Graph, Twitter card, share image | **36 (Web Asset Generator)** — dedicada |
| `pwa-icon` | maskable icon, manifest, browserconfig | **36 (Web Asset Generator)** — dedicada |

**Divisao clara:** skill 17 e para assets criativos (geracao do zero ou derivacao). Skill 36 e para assets web operacionais derivados de logo existente (favicon, OG, PWA — pipeline mecanico, nao criativo). Se logo ainda nao existe, skill 17 cria primeiro; depois skill 36 deriva os formatos.

## Regras de Prompt

- refletir a paleta, contraste e mood reais do produto
- mencionar explicitamente estilo visual existente quando ele ja estiver definido
- para `i2i`, descrever apenas a mudanca desejada e preservar o resto
- evitar adjetivos vagos como "bonito" ou "moderno" sem contexto do projeto
- nao introduzir cores, personagens ou composicoes que destoem dos assets ja usados no app

## Selecao de Modelo

Esta skill e **vendor-agnostic por design** (`policies/stack-flexibility.md`). A tabela abaixo cobre fal.ai como **implementacao recomendada** — substitua por Replicate, Stability, OpenAI direto ou self-hosted se a stack do projeto ja usa outro provider.

### Modelos fal.ai (atualizado 2026-05)

> **Precos podem mudar sem aviso.** Fonte canonica: [fal.ai/pricing](https://fal.ai/pricing) (verificar antes de batch grande). Esta tabela e snapshot — `docs/skill-guides/image-generator-models.md` tem detalhes mais granulares e link por modelo.

| Modelo | Preco | Quando usar | Endpoints |
|---|---|---|---|
| **gpt-image-1-mini** | $0.005-$0.052 (varia por qualidade/tamanho) | **Volume alto, custo baixo.** Variacoes rapidas, testes, scaffolding. | `fal-ai/gpt-image-1-mini`, `.../edit` |
| **Gemini 2.5 Flash** | $0.039/img (fixo) | **Producao em escala com custo previsivel.** Hero, ilustracao, background padrao. | `fal-ai/gemini-25-flash-image`, `.../edit` |
| **Gemini 3 Pro** (Nano Banana Pro) ⚠ preview | $0.15/img (4K = $0.30) | **Prompt dificil, tipografia, composicao complexa.** Quando o pedido cita texto na imagem ou layout especifico. **Endpoint preview — pode mudar / preco pode subir sem aviso.** | `fal-ai/gemini-3-pro-image-preview`, `.../edit` |
| **gpt-image-1.5** | $0.009-$0.20 (varia) | **Acabamento final.** Alta fidelidade, aderencia forte ao prompt, preserva composicao/iluminacao. Use no fim do pipeline. | `fal-ai/gpt-image-1.5`, `.../edit` |
| **Grok Imagine** | $0.02 (gen) / $0.022 (edit) | **Criativos esteticos baratos e simples de precificar.** Estilo "aesthetic-first". | `xai/grok-imagine-image`, `.../edit` |

### Decisao rapida (arvore)

```
precisa de muita imagem barata?           → gpt-image-1-mini
custo fixo previsivel + producao escala?  → Gemini 2.5 Flash
prompt dificil / tipografia / composicao? → Gemini 3 Pro
fidelidade visual maxima + aderencia?     → gpt-image-1.5
estetico bonito e barato?                 → Grok Imagine
```

### Pipeline recomendado (multi-modelo)

Para feature visual importante:
1. **Iteracao** — gpt-image-1-mini ou Grok Imagine (5-10 variacoes baratas para escolher direcao)
2. **Validacao** — Gemini 2.5 Flash (1-2 versoes mais polidas para feedback humano)
3. **Final** — gpt-image-1.5 ou Gemini 3 Pro (asset que vai pra producao)

Custo total tipico: **$0.10-$0.50 por hero finalizado**, dependendo de quantas iteracoes.

### Schemas, endpoints completos e exemplos cURL/Python/JS

Ver `docs/skill-guides/image-generator-models.md` (carregado sob demanda) — schema completo de cada modelo, exemplos por SDK (Python `fal-client`, JS `@fal-ai/client`, cURL), parametros (`aspect_ratio`, `quality`, `num_images`, `image_size`, `output_format`, `safety_tolerance`, `input_fidelity`).

### Quando usar provider que nao seja fal.ai

A skill nao impoe vendor. Alternativas:
- **Replicate:** modelos similares (FLUX, SDXL) com API parecida
- **OpenAI direto:** GPT Image sem markup do fal.ai
- **Stability:** SD3, mais controle de parametros
- **Self-hosted:** ComfyUI / Automatic1111 para controle total

Se mudar provider depois do projeto ter assets, registrar em ADR (`docs/adr/`) — mudanca de modelo provoca drift de estilo nos novos assets vs antigos.

## Execucao

Se o projeto usar script local, seguir o fluxo dele. Se nao usar, adaptar ao mecanismo disponivel no ambiente sem acoplar a skill a um vendor unico.

## Output Path

Preferencia de destino:

1. `src-tauri/icons/` para assets nativos de Tauri
2. `public/images/generated/` para web app com `public/`
3. `assets/images/` se a base do projeto usar `assets/`
4. pasta local equivalente do repositorio quando a estrutura for diferente

## Integracao com Outras Skills

- `UI/UX (skill 02)`: confirma encaixe visual e composicao
- `Asset Librarian (skill 19)`: fornece inventario de assets, logos, fontes e tokens visuais existentes
- `Frontend (skill 04)`: confirma uso real do asset e dimensoes
- `SEO (skill 14)`: confirma necessidades de alt text e imagem publica
- `Mobile Tauri (skill 15)`: confirma formatos e tamanhos para icones nativos
- `Web Asset Generator (skill 36)`: pega logo gerado por esta skill e deriva favicon multi-tamanho, PWA icons (maskable), Open Graph e Twitter card automaticamente. **Handoff direto:** quando esta skill cria logo, despachar skill 36 para gerar todos os assets web a partir dele.
- `Orchestrator (skill 09)`: decide momento certo da geracao no pipeline
- `Cost Tracker (skill 30)`: registra custo por modelo + asset para evitar surpresa na fatura fal.ai

## Evidencia de Conclusao

- contexto visual existente analisado antes da geracao
- prompt final coerente com o app
- asset salvo no local correto com formato adequado
- modelo, variacoes e output registrados para reproducao

## Handoff

Entregar sempre:

- paths dos arquivos gerados
- prompt usado
- contexto visual considerado
- formato, dimensao e pos-processamento

Seguir `policies/handoffs.md` e, quando util, `templates/handoff.md`.

## Codigo Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.
