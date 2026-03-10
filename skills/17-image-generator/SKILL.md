---
name: image-generator
description: >
  Especialista em geração e processamento de imagens via fal.ai.
  Invocado pelo Orchestrator quando qualquer etapa do pipeline precisa
  de assets visuais: layout images, hero sections, ícones, favicons,
  mascotes, backgrounds.
triggers:
  - gerar imagem
  - criar imagem
  - image generator
  - fal.ai
  - favicon
  - ícone
  - hero image
  - landing page image
  - mascote
  - background image
  - remover fundo
  - transparent icon
  - tauri icons
---

# Image Generator

Especialista em geração e processamento de imagens para projetos web e mobile.
Invocado pelo Orchestrator sempre que um asset visual é necessário.

## Setup

```bash
pip install fal-client pillow rembg
```

Adicionar no `.env.local`:
```
FAL_KEY=sua-chave-aqui
```

## Análise de Necessidade

Antes de gerar, determine:

**Modo:**
- `t2i` (text-to-image): imagem nova do zero
- `i2i` (image-to-image): derivar/editar imagem existente (mascote em nova pose, ícone em novo contexto)

**Tipo:**
| Tipo | Quando usar |
|------|-------------|
| `layout` | Imagem compondo seção ou tela inteira |
| `hero` | Imagem principal acima da dobra |
| `icon` | Ícone de funcionalidade ou serviço |
| `favicon` | Favicon multi-tamanho + apple-touch-icon |
| `mascote` | Personagem da marca em nova situação |
| `background` | Textura ou fundo de seção |
| `illustration` | Ilustração explicativa de conceito |

## Engenharia de Prompt

Construa o prompt ANTES de chamar o script. Cada tipo tem estrutura diferente:

**Hero / Layout:**
```
[sujeito principal], [estilo visual], [paleta de cores], [composição], [iluminação], [mood]
Exemplo: "Modern SaaS dashboard interface, dark theme, electric blue accents,
          clean minimal layout, soft ambient lighting, professional corporate mood"
```

**Ícone:**
```
[objeto isolado], flat design, transparent background, vector style, minimalist,
simple geometric shapes, [cor primária]
Exemplo: "Shield icon with checkmark, flat design, transparent background,
          vector style, minimalist, deep blue"
```

**Mascote:**
```
[personagem], [pose/ação específica], clean white background,
cartoon illustration style, friendly expression, [detalhes de design]
Exemplo: "Friendly robot mascot, waving hello, clean white background,
          cartoon illustration style, friendly expression, blue and white colors"
```

**Background:**
```
[cena ou textura], [mood], [paleta], no central focus element,
subtle texture, suitable as website background
Exemplo: "Abstract geometric pattern, modern tech mood, deep navy and purple palette,
          no central focus, subtle texture, suitable as website background"
```

**Favicon:**
```
[símbolo único simples], high contrast, readable at 32x32 pixels,
bold design, [cor primária] on [cor de fundo]
Exemplo: "Letter F monogram, high contrast, readable at 32x32 pixels,
          bold design, white on deep blue"
```

### Regras Gerais de Prompt

- Seja específico sobre estilo visual (flat, 3D, fotorrealista, cartoon)
- Sempre mencione a paleta de cores do projeto quando disponível
- Para ícones/favicons: sempre inclua "transparent background" ou "flat design"
- Para i2i: descreva APENAS o que muda, não o que permanece igual
- Evite prompts genéricos como "beautiful image" — use adjetivos técnicos

## Seleção de Modelo

| Caso de uso | Modelo | Custo |
|-------------|--------|-------|
| Variações rápidas, testes, volume | `gpt-image-1-mini` | ~$0.005-0.036 |
| Layouts, heroes, backgrounds (padrão) | `gemini-25-flash-image` | $0.039 |
| Tipografia no layout, prompt complexo | `gemini-3-pro` | $0.15 |
| Acabamento máximo, assets finais | `gpt-image-1.5` | $0.034-0.20 |
| Criativos estéticos, redes sociais | `grok-imagine` | $0.02 |

**i2i sempre usa o mesmo modelo da imagem original** (ou `gemini-25-flash-image` se não souber).

## Execução via Script Python

O script fica em `scripts/generate-image.py` no projeto.

**Text-to-image (do zero):**
```bash
python scripts/generate-image.py \
  --mode t2i \
  --type hero \
  --model gemini-25-flash-image \
  --aspect 16:9 \
  --output public/images/hero.png \
  "Modern SaaS dashboard, dark theme, electric blue accents, clean minimal, professional"
```

**Image-to-image (derivar existente):**
```bash
python scripts/generate-image.py \
  --mode i2i \
  --type mascote \
  --model gemini-25-flash-image \
  --image public/images/mascot-base.png \
  --post-process rembg \
  --output public/images/mascot-waving.png \
  "same robot mascot, waving hello, white background"
```

**Favicon completo:**
```bash
python scripts/generate-image.py \
  --type favicon \
  --model gpt-image-1-mini \
  --aspect 1:1 \
  --post-process ico \
  --output public/favicon.ico \
  "Letter F monogram, high contrast, readable at 32x32px, white on deep blue"
```

**Ícone com fundo transparente:**
```bash
python scripts/generate-image.py \
  --type icon \
  --model gpt-image-1-mini \
  --aspect 1:1 \
  --post-process rembg \
  --output public/images/icon-shield.png \
  "Shield with checkmark, flat design, deep blue, white background"
```

**Ícones para app Tauri:**
```bash
python scripts/generate-image.py \
  --type icon \
  --model gpt-image-1-mini \
  --aspect 1:1 \
  --post-process tauri-icons \
  --output src-tauri/icons/icon.png \
  "App icon, geometric logo mark, deep blue gradient, clean minimal"
```

## Detecção Automática de Output Path

Se `--output` não for informado, o script detecta automaticamente:

| Estrutura do projeto | Output |
|----------------------|--------|
| `src-tauri/icons/` existe | `src-tauri/icons/` |
| `public/` existe | `public/images/generated/` |
| `assets/` existe | `assets/images/` |
| Nenhuma das acima | `./generated-images/` |

## Pós-processamento (`--post-process`)

| Flag | O que faz | Quando usar |
|------|-----------|-------------|
| `none` | Salva direto | Layouts, heroes, backgrounds |
| `rembg` | Remove fundo → PNG transparente | Ícones, mascotes, elementos isolados |
| `resize:WxH` | Redimensiona (ex: `resize:800x600`) | Assets com tamanho específico |
| `ico` | ICO 16/32/48/64px + apple-touch-icon 180px | Favicons web |
| `tauri-icons` | PNGs 32/128/256/512 + icon.ico | Apps Tauri/desktop |

## Integração com Pipeline

**Recebe do Orchestrator:**
- Tipo de imagem necessária
- Contexto visual do projeto (paleta, estilo, assets existentes)
- Caminho de assets existentes (para i2i)
- Onde salvar (ou deixar auto-detectar)

**Entrega ao Orchestrator:**
- Paths dos arquivos gerados
- Lista de variações geradas (se múltiplas)
- Prompt usado (para reprodução futura)
- Modelo e parâmetros utilizados

**Exemplo de handoff:**

```
Image Generator → Orchestrator

Gerado:
- public/images/hero.png (1536x1024, gemini-25-flash-image)
- public/images/mascot-hero.png (1024x1024, fundo removido via rembg)
- public/favicon.ico (ICO multi-size: 16/32/48/64px)
- public/apple-touch-icon.png (180px)

Prompt hero: "Modern SaaS dashboard, dark theme, electric blue accents, clean minimal"
Prompt mascote: "same robot mascot waving hello, white background" (derivado de mascot-base.png)
```

## Código Limpo

Zero comentários. Código auto-explicativo. Nomes descritivos.
