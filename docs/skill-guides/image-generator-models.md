# Image Generator — Catalogo de Modelos (fal.ai)

Anexo da skill 17 (`skills/17-image-generator/SKILL.md`). Carregar sob demanda quando precisar de schema completo, exemplos por SDK, ou parametros especificos de cada modelo.

## Sumario

- [Setup comum (variaveis e SDKs)](#setup-comum)
- [gpt-image-1-mini](#gpt-image-1-mini) — barato, volume alto
- [Gemini 2.5 Flash](#gemini-25-flash) — custo fixo, escala
- [Gemini 3 Pro (Nano Banana Pro)](#gemini-3-pro-nano-banana-pro) — prompt dificil, tipografia
- [gpt-image-1.5](#gpt-image-15) — fidelidade maxima, acabamento
- [gpt-image-1 (legacy)](#gpt-image-1-legacy) — versao antiga, ainda disponivel
- [Grok Imagine](#grok-imagine) — estetico barato
- [Tabela comparativa](#tabela-comparativa)
- [Padroes de prompt por modelo](#padroes-de-prompt-por-modelo)
- [Erros comuns e troubleshooting](#erros-comuns-e-troubleshooting)

---

## Setup comum

### Auth

```bash
export FAL_KEY="key_..."   # obter em https://fal.ai/dashboard/keys
```

### SDKs

**Python:**
```bash
pip install fal-client
```

**JavaScript / TypeScript:**
```bash
npm install --save @fal-ai/client
```

**cURL** funciona sem SDK — todos os exemplos abaixo tem variante cURL.

### Padrao geral de chamada

Todos os modelos seguem o mesmo padrao:
1. POST para o endpoint do modelo (`https://fal.run/<model-id>`)
2. Header `Authorization: Key $FAL_KEY` + `Content-Type: application/json`
3. Body JSON com `prompt` (obrigatorio) + parametros opcionais
4. Response inclui `images: [{ url }]` + `revised_prompt` ou `description`

---

## gpt-image-1-mini

**Categoria:** text-to-image + image-to-image (edit)
**Quando usar:** volume alto, custo baixo. Variacoes rapidas, testes A/B, scaffolding de assets.
**Endpoints:**
- `fal-ai/gpt-image-1-mini` (geracao)
- `fal-ai/gpt-image-1-mini/edit` (edicao)

### Pricing

Cobrado por token (input texto + output imagem):
- $0.002 / 1K input text tokens (~250 palavras)
- $0.0025 / 1K input image tokens (1024x1024 ≈ 135 tokens)
- Output image:
  - **low quality:** $0.005 (1024x1024) ou $0.006 (outros tamanhos)
  - **medium:** $0.011 ou $0.015
  - **high:** $0.036 ou $0.052
- Total arredondado para o centavo mais proximo.

### Schema de input (geracao)

| Campo | Tipo | Obrigatorio | Default | Notas |
|---|---|:---:|---|---|
| `prompt` | string | sim | — | Prompt em linguagem natural |
| `image_size` | enum | nao | `auto` | `auto`, `1024x1024`, `1536x1024`, `1024x1536` |
| `background` | enum | nao | `auto` | `auto`, `transparent`, `opaque` |
| `quality` | enum | nao | `auto` | `auto`, `low`, `medium`, `high` |
| `num_images` | int | nao | 1 | 1-4 |
| `output_format` | enum | nao | `png` | `jpeg`, `png`, `webp` |
| `sync_mode` | bool | nao | false | true = data URI inline (sem retencao no historico) |

### Schema de input (edit)

Mesmos campos da geracao + `image_urls: list<string>` (obrigatorio, ate N imagens de referencia para fazer composicao).

### Exemplos

**cURL (geracao):**
```bash
curl -X POST https://fal.run/fal-ai/gpt-image-1-mini \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A serene landscape with mountains reflecting in a crystal-clear lake at sunset, photorealistic style"}'
```

**Python:**
```python
import fal_client

result = fal_client.subscribe(
    "fal-ai/gpt-image-1-mini",
    arguments={
        "prompt": "A serene landscape with mountains...",
        "image_size": "1024x1024",
        "quality": "medium",
        "num_images": 4,
    },
    with_logs=True,
)
print(result["images"][0]["url"])
```

**JavaScript:**
```javascript
import { fal } from "@fal-ai/client";

const result = await fal.subscribe("fal-ai/gpt-image-1-mini", {
  input: {
    prompt: "A serene landscape with mountains...",
    image_size: "1024x1024",
    quality: "medium",
    num_images: 4,
  },
});
console.log(result.data.images[0].url);
```

---

## Gemini 2.5 Flash

(Tambem conhecido como **Nano Banana** original.)

**Categoria:** text-to-image + image-to-image (edit)
**Quando usar:** producao em escala com custo previsivel ($0.039 fixo por imagem). Hero, ilustracao, background padrao.
**Endpoints:**
- `fal-ai/gemini-25-flash-image` (geracao)
- `fal-ai/gemini-25-flash-image/edit` (edicao)

### Pricing

**$0.039 por imagem** — fixo. $1.00 = 25 imagens. Sem variacao por qualidade ou tamanho.

### Schema de input (geracao)

| Campo | Tipo | Obrigatorio | Default | Notas |
|---|---|:---:|---|---|
| `prompt` | string | sim | — | |
| `num_images` | int | nao | 1 | 1-4 |
| `seed` | int | nao | — | Determinismo entre runs |
| `aspect_ratio` | enum | nao | `1:1` | `21:9`, `16:9`, `3:2`, `4:3`, `5:4`, `1:1`, `4:5`, `3:4`, `2:3`, `9:16` |
| `output_format` | enum | nao | `png` | `jpeg`, `png`, `webp` |
| `safety_tolerance` | enum | nao | `4` | `1` (mais estrito) a `6` (menos estrito) |
| `sync_mode` | bool | nao | false | |

### Schema de input (edit)

Mesmos + `image_urls: list<string>` (1+ imagens de referencia).

### Exemplos

**cURL:**
```bash
curl -X POST https://fal.run/fal-ai/gemini-25-flash-image \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "An action shot of a black lab swimming in an inground suburban swimming pool", "aspect_ratio": "16:9"}'
```

**Python:**
```python
result = fal_client.subscribe(
    "fal-ai/gemini-25-flash-image",
    arguments={"prompt": "...", "aspect_ratio": "16:9", "num_images": 2},
)
```

---

## Gemini 3 Pro (Nano Banana Pro)

**Categoria:** text-to-image + image-to-image (edit)
**Quando usar:** prompt dificil, tipografia (texto na imagem), composicao complexa, web search ativado para informacao atualizada.
**Endpoints:**
- `fal-ai/gemini-3-pro-image-preview` (geracao)
- `fal-ai/gemini-3-pro-image-preview/edit` (edicao)

### Pricing

**$0.15 por imagem.** $1.00 = 7 imagens. **4K = $0.30** (dobra). Pode mudar — preview.

### Schema de input (geracao)

| Campo | Tipo | Obrigatorio | Default | Notas |
|---|---|:---:|---|---|
| `prompt` | string | sim | — | |
| `num_images` | int | nao | 1 | 1-4 |
| `seed` | int | nao | — | |
| `aspect_ratio` | enum | nao | `1:1` | `auto`, `21:9`, `16:9`, `3:2`, `4:3`, `5:4`, `1:1`, `4:5`, `3:4`, `2:3`, `9:16` |
| `output_format` | enum | nao | `png` | `jpeg`, `png`, `webp` |
| `safety_tolerance` | enum | nao | `4` | `1`-`6` |
| `resolution` | enum | nao | `1K` | `1K`, `2K`, `4K` (4K dobra preco) |
| `sync_mode` | bool | nao | false | |
| `limit_generations` | bool | nao | false | true = ignora instrucoes do prompt sobre numero de imagens |
| `enable_web_search` | bool | nao | false | true = modelo busca info atual na web (util para imagem com fato recente) |

### Schema de input (edit)

Mesmos + `image_urls: list<string>` (1+ imagens).

### Exemplos

**cURL:**
```bash
curl -X POST https://fal.run/fal-ai/gemini-3-pro-image-preview \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Vintage poster with bold typography saying NEW SEASON in retro 1950s style", "aspect_ratio": "3:4", "resolution": "2K"}'
```

**Edit com 2 imagens (composicao):**
```bash
curl -X POST https://fal.run/fal-ai/gemini-3-pro-image-preview/edit \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "make a photo of the man driving the car down the california coastline",
    "image_urls": [
      "https://.../person.png",
      "https://.../car.png"
    ]
  }'
```

---

## gpt-image-1.5

**Categoria:** text-to-image + image-to-image (edit)
**Quando usar:** acabamento final. Alta fidelidade, aderencia forte ao prompt, preserva composicao + iluminacao + detalhes finos.
**Endpoints:**
- `fal-ai/gpt-image-1.5` (geracao)
- `fal-ai/gpt-image-1.5/edit` (edicao)

### Pricing

Token-based, mais alto que mini:
- $0.005 / 1K input text tokens
- $0.008 / 1K input image tokens (low fidelity = 135 tokens; **high fidelity = 3050 tokens** por imagem 1024x1024)
- $0.010 / 1K output text tokens
- Output image por qualidade:
  - **low:** $0.009 (1024x1024) / $0.013 (outros)
  - **medium:** $0.034 / $0.051 / $0.050
  - **high:** $0.133 / $0.200 / $0.199

**Cuidado:** modo `input_fidelity: high` no edit aumenta drasticamente o custo (3050 tokens vs 135). Use so quando precisa preservar muito detalhe da imagem original.

### Schema de input (geracao)

| Campo | Tipo | Obrigatorio | Default | Notas |
|---|---|:---:|---|---|
| `prompt` | string | sim | — | |
| `image_size` | enum | nao | `1024x1024` | `1024x1024`, `1536x1024`, `1024x1536` (sem `auto` aqui) |
| `background` | enum | nao | `auto` | `auto`, `transparent`, `opaque` |
| `quality` | enum | nao | `high` | `low`, `medium`, `high` (default ja e high — diferente do mini) |
| `num_images` | int | nao | 1 | 1-4 |
| `output_format` | enum | nao | `png` | `jpeg`, `png`, `webp` |
| `sync_mode` | bool | nao | false | |

### Schema de input (edit)

Mesmos + `image_urls: list<string>` (obrigatorio) + opcional:
- `input_fidelity` (`low` / `high`, default `high`) — custo maior em high
- `mask_image_url` (string opcional) — para inpainting parcial

---

## gpt-image-1 (legacy)

Versao anterior do gpt-image, ainda disponivel. Use **gpt-image-1.5** preferencialmente — esta entrada e so para projetos que ja dependem do legacy.

**Endpoints:**
- `fal-ai/gpt-image-1/text-to-image`
- `fal-ai/gpt-image-1/edit-image`

**Pricing:** $0.011-$0.25 por imagem dependendo de quality + size. Mais caro que 1.5 em high quality.

Schema essencialmente igual ao 1.5.

---

## Grok Imagine

**Categoria:** text-to-image + image-to-image (edit)
**Quando usar:** criativos esteticos baratos. Estilo "aesthetic-first" da xAI.
**Endpoints:**
- `xai/grok-imagine-image` (geracao)
- `xai/grok-imagine-image/edit` (edicao)

### Pricing

**$0.02 por imagem (geracao)**, **$0.022 (edicao com input image)**. Simples de precificar.

### Schema de input (geracao)

| Campo | Tipo | Obrigatorio | Default | Notas |
|---|---|:---:|---|---|
| `prompt` | string | sim | — | |
| `num_images` | int | nao | 1 | 1-4 |
| `aspect_ratio` | enum | nao | `1:1` | `2:1`, `20:9`, `19.5:9`, `16:9`, `4:3`, `3:2`, `1:1`, `2:3`, `3:4`, `9:16`, `9:19.5`, `9:20`, `1:2` (mais opcoes que outros) |
| `output_format` | enum | nao | `jpeg` | `jpeg`, `png`, `webp` (default JPEG, diferente dos outros) |
| `sync_mode` | bool | nao | false | |

### Schema de input (edit)

Mesmos + `image_url: string` (singular, **nao** lista — diferente dos outros).

### Exemplos

**cURL:**
```bash
curl -X POST https://fal.run/xai/grok-imagine-image \
  -H "Authorization: Key $FAL_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Abstract human silhouette, golden particles ready to burst outward representing joy"}'
```

---

## Tabela comparativa

| Aspecto | gpt-image-1-mini | Gemini 2.5 Flash | Gemini 3 Pro | gpt-image-1.5 | Grok Imagine |
|---|---|---|---|---|---|
| **Preco/img** | $0.005-$0.052 | **$0.039 fixo** | $0.15 (4K=$0.30) | $0.009-$0.20 | $0.02 (gen) |
| **Velocidade** | rapido | rapido | medio (2K/4K) | medio-lento | rapido |
| **Tipografia (texto na imagem)** | ruim | medio | **excelente** | bom | medio |
| **Fidelidade ao prompt** | medio | bom | **excelente** | **excelente** | bom |
| **Composicao complexa** | medio | bom | **excelente** | bom | medio |
| **Estetica out-of-box** | medio | bom | bom | bom | **excelente** |
| **Edit / multi-image input** | sim (multi) | sim (multi) | sim (multi) | sim (multi + mask) | sim (single) |
| **Web search no prompt** | nao | nao | **sim** (`enable_web_search`) | nao | nao |
| **Aspect ratios** | 4 fixos | 10 | 11 | 3 fixos | **13** (mais opcoes) |
| **Resolucao max** | 1536px | configuravel | **4K** | 1536px | configuravel |
| **Default output** | PNG | PNG | PNG | PNG | **JPEG** |

## Padroes de prompt por modelo

### gpt-image-1-mini
- prompts curtos funcionam bem ("A serene landscape with mountains")
- evite muito detalhe — modelo perde aderencia

### Gemini 2.5 Flash
- prompts medios (1-3 frases descritivas)
- bom em cenas naturais, ruim em texto

### Gemini 3 Pro
- prompts longos e detalhados pagam bem
- **especifique tipografia explicitamente** ("the words 'NEW SEASON' in bold sans-serif")
- ative `enable_web_search: true` se precisa de info atual ("based on today's stock chart")

### gpt-image-1.5
- prompts estruturados ("subject: X, style: Y, lighting: Z, composition: W")
- aproveita aderencia forte — seja especifico sobre o que NAO mudar (em edits)

### Grok Imagine
- prompts esteticos / artisticos
- adjetivos e mood payam bem ("ethereal", "cinematic", "dreamlike")

## Erros comuns e troubleshooting

### `quality: auto` retorna preco alto
gpt-image-1-mini e gpt-image-1.5 com `quality: auto` podem subir para `high` automaticamente, gerando cobranca de $0.13-$0.20. Para previsibilidade, sempre setar `quality: low` ou `medium` em batch grande.

### `input_fidelity: high` no edit triplicou o custo
gpt-image-1.5 com `input_fidelity: high` cobra 3050 input image tokens (vs 135 em low) por imagem 1024x1024. Use so para preservar detalhes finos quando precisar.

### Aspect ratio "auto" retorna 1:1 sempre
Comum no gpt-image-1-mini. Setar aspect ratio explicitamente quando souber.

### Default output JPEG do Grok perde transparencia
Se precisar de transparencia, setar `output_format: png` no Grok Imagine.

### `safety_tolerance` muito estrito bloqueia conteudo neutro
Default `4` ja e razoavel. Se prompts validos sao bloqueados, subir para `5` (sem chegar a 6 — pode liberar conteudo problematico).

### `sync_mode: true` aparece como data URI gigante na resposta
Use `sync_mode: false` (default) e baixe a URL retornada. Data URIs grandes estouram limite de mensagem em LLM.

### `revised_prompt` vs `description` no output
- gpt-image-* e Grok retornam `revised_prompt` (prompt expandido pelo modelo)
- Gemini 2.5 e 3 Pro retornam `description` (descricao do que foi gerado)

Em ambos os casos, util para registrar no log de geracao.

---

## Quando atualizar este guia

- novo modelo lancado no fal.ai com preco/qualidade competitivo vs os 5 acima
- preco mudar significativamente (>20%)
- endpoint depreciado ou renomeado
- novo parametro relevante adicionado a um modelo existente

Manter enxuto. Se passar de 700 linhas, dividir em sub-guides por categoria (`-fal-text-to-image.md`, `-fal-edit.md`).
