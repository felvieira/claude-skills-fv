# Image Generator Guide

Guia pratico da skill `17-image-generator` para geracao e adaptacao de assets visuais via `fal.ai`.

## Setup

Dependencias Python:

```bash
pip install pillow rembg
```

- `pillow` — resize, conversao ICO e pacote tauri-icons
- `rembg` — remocao de fundo (transparencia)

Chave de API — adicionar em `.env.local` na raiz do projeto:

```
FAL_KEY=seu-token-aqui
```

O script aceita tambem `FAL_API_KEY` como variavel de ambiente ou exportada no shell. A ordem de busca e: variavel de ambiente > `.env.local` > `.env`.

## Tipos de Imagem

| Tipo | Flag `--type` | Exemplo de prompt |
|------|---------------|-------------------|
| Hero | `hero` | `"landing hero for a SaaS analytics dashboard, dark theme, data visualizations floating over gradient background"` |
| Icone | `icon` | `"flat icon of a gear with a lightning bolt, transparent background, 512px, brand blue #2563EB"` |
| Favicon | `favicon` | `"minimal letter A inside rounded square, solid purple background, crisp edges, favicon style"` |
| Mascote | `mascot` | `"friendly fox mascot holding a laptop, cartoon style, matching existing brand orange palette"` |
| Background | `background` | `"subtle geometric pattern, low contrast, dark gray tones, seamless tileable texture"` |
| Ilustracao | `illustration` | `"isometric illustration of cloud deployment pipeline, pastel colors, no text"` |
| Layout | `layout` | `"full section mockup showing pricing cards with gradient header, SaaS style"` |

Dica: sempre referenciar cores, estilo e mood reais do projeto no prompt. Evitar termos vagos como "bonito" ou "profissional" sem contexto.

## Selecao de Modelo

O script suporta cinco modelos via flag `--model`:

| Modelo | Flag | Melhor para |
|--------|------|-------------|
| Gemini 2.5 Flash | `gemini-25-flash-image` | Variacoes rapidas, testes, iteracao. **Default.** |
| Gemini 3 Pro | `gemini-3-pro` | Tipografia legivel, prompts complexos, resolucao 1K |
| GPT Image 1.5 | `gpt-image-1.5` | Acabamento final, fidelidade visual alta |
| GPT Image 1 Mini | `gpt-image-1-mini` | Rascunhos baratos e rapidos |
| Grok Imagine | `grok-imagine` | Alternativa para estilos artisticos |

Regra geral:

1. Comecar com `gemini-25-flash-image` para validar o prompt
2. Se precisar de texto legivel na imagem, trocar para `gemini-3-pro`
3. Para o asset final de producao, usar `gpt-image-1.5` com `--quality high`

## Modos

### text-to-image (t2i)

Geracao do zero a partir de prompt. Usar quando nao existir asset base.

```bash
python scripts/generate-image.py "hero image for fintech app, dark gradient" \
  --type hero --model gemini-25-flash-image --aspect 16:9
```

### image-to-image (i2i)

Derivacao a partir de asset existente. Preferir quando o projeto ja tiver mascote, icone ou base visual.

```bash
python scripts/generate-image.py "same mascot but wearing a santa hat" \
  --mode i2i --image public/images/mascot.png \
  --type mascot --model gemini-25-flash-image --aspect 1:1
```

A flag `--image` aceita path local ou URL publica.

## Pos-processamento

O script aplica pos-processamento via `--post-process`:

### rembg — remocao de fundo

Gera PNG com transparencia. Util para icones e mascotes.

```bash
python scripts/generate-image.py "flat icon of a rocket" \
  --type icon --post-process rembg --format png
```

### ico — favicon multi-tamanho

Gera `.ico` com 16, 32, 48 e 64px alem de `apple-touch-icon.png` (180px).

```bash
python scripts/generate-image.py "letter M in rounded square" \
  --type favicon --post-process ico --aspect 1:1
```

### tauri-icons — pacote desktop

Gera PNGs em 32, 128, 256 e 512px mais `icon.ico` para Tauri.

```bash
python scripts/generate-image.py "app icon for task manager" \
  --type icon --post-process tauri-icons --aspect 1:1
```

### resize — dimensao exata

```bash
python scripts/generate-image.py "social card for blog post" \
  --type hero --post-process resize:1200x630 --aspect 16:9
```

## Integracao com Outras Skills

- **Asset Librarian (skill 19)** — fornece inventario de logos, fontes, paleta e tokens visuais. Consultar antes de gerar para saber quais assets derivar (`i2i`), extrair paleta e evitar duplicatas.
- **Repo Auditor (skill 18)** — identifica assets faltantes referenciados no codigo, favicons ausentes e inconsistencias entre assets declarados e existentes.

Fluxo tipico: Repo Auditor detecta favicon ausente > Asset Librarian fornece logo e paleta > Image Generator gera favicon derivado (`i2i` + `--post-process ico`) > Frontend confirma integracao.

## Erros Comuns

### FAL_KEY ausente

```
RuntimeError: FAL_KEY not found. Add FAL_KEY=... to .env.local
```

Solucao: criar `.env.local` na raiz com `FAL_KEY=seu-token`. Obter token em [fal.ai/dashboard](https://fal.ai/dashboard).

### Modelo indisponivel

```
ValueError: Unknown model: nome-errado. Available: gpt-image-1-mini, grok-imagine, ...
```

Solucao: usar um dos nomes exatos listados na secao de modelos. Verificar com `--model gemini-25-flash-image`.

### Formato errado no pos-processamento

- `ico` e `tauri-icons` exigem `pillow` instalado
- `rembg` exige `pip install rembg` (download de modelo na primeira execucao)
- resize deve seguir formato `resize:LARGURAxALTURA` (ex: `resize:512x512`)

### Nenhuma imagem retornada

```
RuntimeError: No images returned: ...
```

Causas possiveis: prompt violou filtro de seguranca do modelo, timeout de rede, ou cota da API esgotada. Tentar novamente com prompt ajustado ou modelo diferente.

## Exemplos de Comando

```bash
# Hero image escura para SaaS, formato webp
python scripts/generate-image.py \
  "dark gradient hero with floating 3D shapes, tech startup vibe" \
  --type hero --aspect 16:9 --format webp --model gemini-25-flash-image

# Icone com fundo removido
python scripts/generate-image.py \
  "minimal calendar icon, flat design, single color" \
  --type icon --aspect 1:1 --post-process rembg

# Favicon a partir de logo existente
python scripts/generate-image.py \
  "simplify this logo for favicon use, keep colors" \
  --mode i2i --image public/images/logo.png \
  --type favicon --aspect 1:1 --post-process ico

# Mascote com acabamento final
python scripts/generate-image.py \
  "friendly robot mascot waving, brand blue #2563EB" \
  --type mascot --aspect 1:1 --model gpt-image-1.5 --quality high

# Pacote completo de icones para Tauri
python scripts/generate-image.py \
  "modern app icon, gradient purple to blue, rounded corners" \
  --type icon --aspect 1:1 --post-process tauri-icons --model gpt-image-1.5

# Background tileable
python scripts/generate-image.py \
  "seamless dot grid pattern, light gray on white, subtle" \
  --type background --aspect 1:1 --format png

# Output em path customizado (sem --output, detecta: src-tauri/icons > public/images/generated > assets/images)
python scripts/generate-image.py \
  "onboarding illustration, step 1, user creating account" \
  --type illustration --output assets/images/onboarding-step1.png
```
