# Image Generator (Skill 17) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o skill 17 (Image Generator) com script Python standalone e SKILL.md que ensina o Orchestrator a gerar imagens via fal.ai para landing pages, layouts, ícones e favicons.

**Architecture:** Script Python único (`scripts/generate-image.py`) com CLI de subcomandos cobre geração (fal.ai), pós-processamento (rembg/Pillow) e detecção automática de output path. O SKILL.md ensina Claude a engenheirar prompts otimizados por tipo de imagem e a selecionar o modelo correto.

**Tech Stack:** Python 3.9+, fal-client, Pillow, rembg, pytest, fal.ai API

---

## File Structure

| Arquivo | Ação | Responsabilidade |
|---------|------|-----------------|
| `scripts/generate-image.py` | Criar | CLI Python: chamada fal.ai + pós-processamento + detecção de projeto |
| `scripts/tests/test_generate_image.py` | Criar | Testes de lógica interna (sem chamadas fal.ai reais) |
| `skills/17-image-generator/SKILL.md` | Criar | Instruções para Claude: prompt engineering, modelo, modo, handoff |
| `skills/09-orchestrator/SKILL.md` | Modificar | Adicionar Image Generator como skill transversal |
| `README.md` | Modificar | Skill count 16→17, entrada na tabela e no file tree |

---

## Chunk 1: Python Script + Testes

### Task 1: Setup de testes e estrutura base do script

**Files:**
- Create: `scripts/tests/__init__.py`
- Create: `scripts/tests/test_generate_image.py`
- Create: `scripts/generate-image.py` (estrutura base)

- [ ] **Step 1: Criar diretório de testes**

```bash
mkdir -p D:/Repos/claude-skills-fv/scripts/tests
touch D:/Repos/claude-skills-fv/scripts/tests/__init__.py
```

- [ ] **Step 2: Escrever testes de detecção de output path**

Criar `scripts/tests/test_generate_image.py`:

```python
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import importlib.util
spec = importlib.util.spec_from_file_location(
    "generate_image",
    Path(__file__).parent.parent / "generate-image.py"
)
generate_image = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generate_image)

detect_output_dir = generate_image.detect_output_dir
build_payload = generate_image.build_payload
MODELS = generate_image.MODELS
ASPECT_TO_IMAGE_SIZE = generate_image.ASPECT_TO_IMAGE_SIZE


class TestDetectOutputDir:
    def test_tauri_project(self, tmp_path):
        (tmp_path / "src-tauri" / "icons").mkdir(parents=True)
        assert detect_output_dir(tmp_path) == tmp_path / "src-tauri" / "icons"

    def test_nextjs_project(self, tmp_path):
        (tmp_path / "public").mkdir()
        assert detect_output_dir(tmp_path) == tmp_path / "public" / "images" / "generated"

    def test_assets_project(self, tmp_path):
        (tmp_path / "assets").mkdir()
        assert detect_output_dir(tmp_path) == tmp_path / "assets" / "images"

    def test_unknown_project(self, tmp_path):
        assert detect_output_dir(tmp_path) == tmp_path / "generated-images"

    def test_tauri_takes_priority_over_public(self, tmp_path):
        (tmp_path / "src-tauri" / "icons").mkdir(parents=True)
        (tmp_path / "public").mkdir()
        assert detect_output_dir(tmp_path) == tmp_path / "src-tauri" / "icons"


class TestBuildPayload:
    def test_t2i_gemini_flash_aspect_ratio(self):
        cfg = MODELS["gemini-25-flash-image"]
        payload = build_payload("test prompt", "gemini-25-flash-image", cfg, None, "16:9", None, "png")
        assert payload["prompt"] == "test prompt"
        assert payload["aspect_ratio"] == "16:9"
        assert payload["num_images"] == 1
        assert payload["output_format"] == "png"
        assert "image_urls" not in payload
        assert "image_url" not in payload

    def test_t2i_gpt_mini_uses_image_size(self):
        cfg = MODELS["gpt-image-1-mini"]
        payload = build_payload("test", "gpt-image-1-mini", cfg, None, "16:9", None, "png")
        assert payload["image_size"] == "1536x1024"
        assert "aspect_ratio" not in payload

    def test_i2i_gemini_flash_image_urls(self):
        cfg = MODELS["gemini-25-flash-image"]
        payload = build_payload("edit this", "gemini-25-flash-image", cfg, "https://example.com/img.png", "1:1", None, "png")
        assert payload["image_urls"] == ["https://example.com/img.png"]

    def test_i2i_grok_single_image_url(self):
        cfg = MODELS["grok-imagine"]
        payload = build_payload("edit", "grok-imagine", cfg, "https://example.com/img.png", "1:1", None, "png")
        assert payload["image_url"] == "https://example.com/img.png"
        assert "image_urls" not in payload

    def test_quality_override(self):
        cfg = MODELS["gpt-image-1-mini"]
        payload = build_payload("test", "gpt-image-1-mini", cfg, None, "1:1", "high", "png")
        assert payload["quality"] == "high"

    def test_default_params_applied(self):
        cfg = MODELS["gemini-3-pro"]
        payload = build_payload("test", "gemini-3-pro", cfg, None, "1:1", None, "png")
        assert payload["safety_tolerance"] == "4"
        assert payload["resolution"] == "1K"


class TestAspectToImageSize:
    def test_square(self):
        assert ASPECT_TO_IMAGE_SIZE["1:1"] == "1024x1024"

    def test_landscape(self):
        assert ASPECT_TO_IMAGE_SIZE["16:9"] == "1536x1024"

    def test_portrait(self):
        assert ASPECT_TO_IMAGE_SIZE["9:16"] == "1024x1536"


class TestModels:
    def test_all_models_have_t2i(self):
        for key, cfg in MODELS.items():
            assert "t2i" in cfg, f"{key} missing t2i endpoint"

    def test_all_models_have_i2i(self):
        for key, cfg in MODELS.items():
            assert "i2i" in cfg, f"{key} missing i2i endpoint"

    def test_all_models_have_image_field(self):
        for key, cfg in MODELS.items():
            assert "image_field" in cfg, f"{key} missing image_field"
```

- [ ] **Step 3: Rodar testes para verificar que falham (script não existe ainda)**

```bash
cd D:/Repos/claude-skills-fv && python -m pytest scripts/tests/test_generate_image.py -v 2>&1 | head -20
```
Esperado: ImportError ou ModuleNotFoundError

- [ ] **Step 4: Criar `scripts/generate-image.py` com toda a implementação**

```python
#!/usr/bin/env python3
import argparse
import json
import os
import sys
import urllib.request
from pathlib import Path
from datetime import datetime

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

try:
    from rembg import remove as rembg_remove
    HAS_REMBG = True
except ImportError:
    HAS_REMBG = False

MODELS = {
    "gpt-image-1-mini": {
        "t2i": "fal-ai/gpt-image-1-mini",
        "i2i": "fal-ai/gpt-image-1-mini/edit",
        "image_field": "image_urls",
        "use_image_size": True,
        "default_params": {"quality": "low", "background": "auto"},
    },
    "grok-imagine": {
        "t2i": "xai/grok-imagine-image",
        "i2i": "xai/grok-imagine-image/edit",
        "image_field": "image_url",
        "use_aspect_ratio": True,
    },
    "gemini-25-flash-image": {
        "t2i": "fal-ai/gemini-25-flash-image",
        "i2i": "fal-ai/gemini-25-flash-image/edit",
        "image_field": "image_urls",
        "use_aspect_ratio": True,
        "default_params": {"safety_tolerance": "4"},
    },
    "gemini-3-pro": {
        "t2i": "fal-ai/gemini-3-pro-image-preview",
        "i2i": "fal-ai/gemini-3-pro-image-preview/edit",
        "image_field": "image_urls",
        "use_aspect_ratio": True,
        "default_params": {"safety_tolerance": "4", "resolution": "1K"},
    },
    "gpt-image-1.5": {
        "t2i": "fal-ai/gpt-image-1.5",
        "i2i": "fal-ai/gpt-image-1.5/edit",
        "image_field": "image_urls",
        "use_image_size": True,
        "default_params": {"quality": "medium", "background": "auto"},
    },
}

ASPECT_TO_IMAGE_SIZE = {
    "1:1": "1024x1024",
    "4:3": "1536x1024",
    "3:2": "1536x1024",
    "16:9": "1536x1024",
    "21:9": "1536x1024",
    "3:4": "1024x1536",
    "2:3": "1024x1536",
    "9:16": "1024x1536",
}

TAURI_SIZES = [32, 128, 256, 512]


def detect_output_dir(base_path: Path) -> Path:
    if (base_path / "src-tauri" / "icons").exists():
        return base_path / "src-tauri" / "icons"
    if (base_path / "public").exists():
        return base_path / "public" / "images" / "generated"
    if (base_path / "assets").exists():
        return base_path / "assets" / "images"
    return base_path / "generated-images"


def load_fal_key() -> str:
    key = os.environ.get("FAL_KEY") or os.environ.get("FAL_API_KEY")
    if not key:
        for env_file in [".env.local", ".env"]:
            p = Path(env_file)
            if p.exists():
                for line in p.read_text().splitlines():
                    if "=" in line and line.split("=", 1)[0].strip() in ("FAL_KEY", "FAL_API_KEY"):
                        key = line.split("=", 1)[1].strip().strip('"').strip("'")
                        break
            if key:
                break
    if not key:
        raise RuntimeError("FAL_KEY not found. Add FAL_KEY=... to .env.local")
    return key


def call_fal_api(endpoint: str, payload: dict, api_key: str) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"https://fal.run/{endpoint}",
        data=data,
        headers={"Authorization": f"Key {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())


def download_image(url: str, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest)


def build_payload(
    prompt: str,
    model_key: str,
    model_cfg: dict,
    image_url: str | None,
    aspect: str,
    quality: str | None,
    output_format: str,
) -> dict:
    payload: dict = {"prompt": prompt, "num_images": 1, "output_format": output_format}

    if model_cfg.get("use_image_size"):
        payload["image_size"] = ASPECT_TO_IMAGE_SIZE.get(aspect, "1024x1024")
    elif model_cfg.get("use_aspect_ratio"):
        payload["aspect_ratio"] = aspect

    if model_cfg.get("default_params"):
        payload.update(model_cfg["default_params"])

    if quality and "quality" in payload:
        payload["quality"] = quality

    if image_url:
        field = model_cfg["image_field"]
        payload[field] = [image_url] if field == "image_urls" else image_url

    return payload


def apply_post_process(image_path: Path, post_process: str, output_path: Path) -> Path:
    if post_process == "none":
        if image_path != output_path:
            image_path.rename(output_path)
        return output_path

    if post_process == "rembg":
        if not HAS_REMBG:
            raise RuntimeError("rembg not installed. Run: pip install rembg")
        result = rembg_remove(image_path.read_bytes())
        out = output_path.with_suffix(".png")
        out.write_bytes(result)
        return out

    if post_process.startswith("resize:"):
        if not HAS_PIL:
            raise RuntimeError("Pillow not installed. Run: pip install pillow")
        w, h = map(int, post_process.split(":")[1].split("x"))
        img = Image.open(image_path).resize((w, h), Image.LANCZOS)
        img.save(output_path)
        return output_path

    if post_process == "ico":
        if not HAS_PIL:
            raise RuntimeError("Pillow not installed. Run: pip install pillow")
        img = Image.open(image_path).convert("RGBA")
        ico_path = output_path.with_suffix(".ico")
        img.save(ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
        img.resize((180, 180), Image.LANCZOS).save(output_path.parent / "apple-touch-icon.png")
        print(f"   + apple-touch-icon.png")
        return ico_path

    if post_process == "tauri-icons":
        if not HAS_PIL:
            raise RuntimeError("Pillow not installed. Run: pip install pillow")
        img = Image.open(image_path).convert("RGBA")
        for size in TAURI_SIZES:
            out = output_path.parent / f"{size}x{size}.png"
            img.resize((size, size), Image.LANCZOS).save(out)
            print(f"   + {out.name}")
        ico_path = output_path.parent / "icon.ico"
        img.resize((256, 256), Image.LANCZOS).save(
            ico_path, format="ICO", sizes=[(32, 32), (64, 64), (128, 128), (256, 256)]
        )
        print(f"   + icon.ico")
        return output_path.parent

    return image_path


def generate(args):
    api_key = load_fal_key()

    model_cfg = MODELS.get(args.model)
    if not model_cfg:
        raise ValueError(f"Unknown model: {args.model}. Available: {', '.join(MODELS.keys())}")

    use_edit = bool(args.image)
    endpoint = model_cfg["i2i"] if use_edit else model_cfg["t2i"]

    payload = build_payload(
        args.prompt, args.model, model_cfg, args.image, args.aspect, args.quality, args.format
    )

    print(f"\nGenerating image...")
    print(f"  Model   : {args.model} ({'edit' if use_edit else 'text-to-image'})")
    print(f"  Endpoint: {endpoint}")
    print(f"  Prompt  : {args.prompt[:80]}{'...' if len(args.prompt) > 80 else ''}")

    result = call_fal_api(endpoint, payload, api_key)
    images = result.get("images", [])
    if not images:
        raise RuntimeError(f"No images returned: {result}")

    image_url = images[0].get("url") or images[0]

    if args.output:
        output_path = Path(args.output)
    else:
        out_dir = detect_output_dir(Path.cwd())
        ts = datetime.now().strftime("%Y%m%d-%H%M%S")
        ext = "jpg" if args.format == "jpeg" else args.format
        output_path = out_dir / f"{args.type}-{ts}.{ext}"

    output_path.parent.mkdir(parents=True, exist_ok=True)

    raw_path = output_path.with_stem(output_path.stem + "-raw")
    print(f"  Downloading...")
    download_image(image_url, raw_path)

    final = apply_post_process(raw_path, args.post_process, output_path)

    if raw_path.exists() and raw_path != final:
        raw_path.unlink()

    print(f"  Saved: {final}")
    return final


def main():
    parser = argparse.ArgumentParser(description="Generate images via fal.ai")
    parser.add_argument("prompt", help="Image generation prompt")
    parser.add_argument(
        "--mode", choices=["t2i", "i2i"], default="t2i",
        help="t2i = text-to-image, i2i = image-to-image (edit)"
    )
    parser.add_argument(
        "--type",
        choices=["layout", "hero", "icon", "favicon", "mascot", "background", "illustration"],
        default="layout",
    )
    parser.add_argument("--model", default="gemini-25-flash-image", choices=list(MODELS.keys()))
    parser.add_argument("--aspect", default="16:9", help="Aspect ratio, e.g. 16:9, 1:1, 9:16")
    parser.add_argument("--image", help="Reference image path or URL (required for i2i)")
    parser.add_argument("--post-process", default="none", dest="post_process",
                        help="none | rembg | resize:WxH | ico | tauri-icons")
    parser.add_argument("--output", help="Output file path (auto-detected if omitted)")
    parser.add_argument("--quality", choices=["low", "medium", "high"])
    parser.add_argument("--format", default="png", choices=["png", "jpeg", "webp"])

    args = parser.parse_args()

    if args.mode == "i2i" and not args.image:
        parser.error("--image is required for i2i mode")

    generate(args)


if __name__ == "__main__":
    main()
```

- [ ] **Step 5: Rodar testes para verificar que passam**

```bash
cd D:/Repos/claude-skills-fv && python -m pytest scripts/tests/test_generate_image.py -v
```
Esperado: todos os testes passam

- [ ] **Step 6: Commit**

```bash
cd D:/Repos/claude-skills-fv && git add scripts/ && git commit -m "feat: add generate-image.py Python script with fal.ai + post-processing"
```

---

## Chunk 2: SKILL.md + Integrações

### Task 2: Criar `skills/17-image-generator/SKILL.md`

**Files:**
- Create: `skills/17-image-generator/SKILL.md`

- [ ] **Step 1: Criar o SKILL.md**

Criar `skills/17-image-generator/SKILL.md`:

````markdown
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
````

- [ ] **Step 2: Verificar que o SKILL.md tem frontmatter YAML válido**

```bash
cd D:/Repos/claude-skills-fv && python -c "
import re
content = open('skills/17-image-generator/SKILL.md').read()
match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
print('Frontmatter found:', bool(match))
print('Has name field:', 'name:' in (match.group(1) if match else ''))
"
```
Esperado: `Frontmatter found: True` e `Has name field: True`

- [ ] **Step 3: Commit**

```bash
cd D:/Repos/claude-skills-fv && git add skills/17-image-generator/ && git commit -m "feat: add skill 17 image-generator (fal.ai + Python)"
```

---

### Task 3: Atualizar Orchestrator com referência ao Image Generator

**Files:**
- Modify: `skills/09-orchestrator/SKILL.md`

- [ ] **Step 1: Localizar seção de skills transversais no Orchestrator**

```bash
cd D:/Repos/claude-skills-fv && grep -n "transversal\|Documentador\|Context Manager\|Image" skills/09-orchestrator/SKILL.md | head -20
```

- [ ] **Step 2: Adicionar Image Generator como skill transversal**

Na seção de regras/skills do Orchestrator, adicionar:

```markdown
## Skill Transversal: Image Generator

Invoke skill 17 (image-generator) ao identificar necessidade de assets visuais em qualquer etapa:

- UI/UX precisa de imagens de referência para compor o layout
- Frontend precisa de hero images, backgrounds, ilustrações para implementar
- Qualquer skill precisa de ícone, favicon ou asset gráfico

**Como acionar:**
```
Contexto: [tipo de imagem], [onde será usada], [paleta/estilo do projeto]
Assets existentes: [paths de imagens existentes se i2i]
Output: [onde salvar, ou deixar auto-detectar]
```
```

- [ ] **Step 3: Commit**

```bash
cd D:/Repos/claude-skills-fv && git add skills/09-orchestrator/SKILL.md && git commit -m "feat: add image-generator as transversal skill in orchestrator"
```

---

### Task 4: Atualizar README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Atualizar contagem de skills (16 → 17)**

Linha 3: `16 especialistas` → `17 especialistas`
Linha na seção "Skills": título e tabela

- [ ] **Step 2: Adicionar skill 17 na tabela de Gestao e Coordenacao**

Adicionar linha na tabela:
```
| 17 | **Image Generator** | Gera imagens via fal.ai (layout, hero, ícone, favicon, mascote), pós-processa com Python (rembg/Pillow), detecta estrutura do projeto |
```

- [ ] **Step 3: Adicionar skill 17 no file tree**

```
└── 17-image-generator/SKILL.md     → Geração de imagens fal.ai + pós-processamento Python
```

- [ ] **Step 4: Adicionar seção "Como Funciona o Image Generator"**

Após a seção do LLM Selector, adicionar:

```markdown
## Como Funciona o Image Generator

O Orchestrator aciona o skill 17 a qualquer momento que um asset visual for necessário:

1. **Analisa** o tipo de imagem (hero, ícone, favicon, mascote, background)
2. **Engenheira o prompt** seguindo as guidelines por tipo
3. **Seleciona o modelo** (Gemini Flash por padrão, Gemini 3 Pro para tipografia, GPT-Image-1.5 para acabamento)
4. **Detecta o modo**: text-to-image (novo) ou image-to-image (derivar existente)
5. **Executa**: `python scripts/generate-image.py --type ... --model ... "prompt"`
6. **Pós-processa**: rembg (transparência), ico (favicon), tauri-icons (desktop)
7. **Entrega paths** ao Orchestrator para continuar o pipeline

Setup: `pip install pillow rembg` + `FAL_KEY=...` no `.env.local`
```

- [ ] **Step 5: Commit**

```bash
cd D:/Repos/claude-skills-fv && git add README.md && git commit -m "docs: update README with skill 17 image-generator"
```

---

### Task 5: Push final para o repositório remoto

- [ ] **Step 1: Verificar status geral**

```bash
cd D:/Repos/claude-skills-fv && git log --oneline -5
```

- [ ] **Step 2: Push**

```bash
cd D:/Repos/claude-skills-fv && git push origin main
```
