# Design: Skill 17 — Image Generator (fal.ai + Python)

**Data:** 2026-03-10
**Status:** Aprovado

## Objetivo

Adicionar ao Dev Team Kit um especialista de geração de imagens que o Orchestrator aciona a qualquer momento do pipeline quando assets visuais são necessários — principalmente para landing pages e layouts.

## Decisões de Design

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Linguagem do script | Python | rembg (ML), Pillow (ICO/favicon), cairosvg — ecossistema de processamento de imagem superior |
| Arquitetura do script | Script único com subcomandos | Simples, versionável, Claude chama com parâmetros |
| Acionamento | Orchestrator detecta necessidade e invoca diretamente | Flexibilidade total — qualquer skill pode precisar de imagem |
| Output path | Detectado pela estrutura do projeto | Next.js → `public/`, Tauri → `src-tauri/icons/`, etc. |

## Integração no Pipeline

O skill 17 é **transversal** — não tem posição fixa. O Orchestrator o aciona quando:
- UI/UX precisa de imagens de referência para compor layout
- Frontend precisa de assets (hero, background, ícones)
- Qualquer skill precisa de favicon, ícone ou imagem

```
Orchestrator detecta necessidade de imagem
    → Invoca Image Generator com: tipo, contexto visual, assets existentes
    → Image Generator gera prompt otimizado (Claude, seguindo guidelines do skill)
    → Chama fal.ai via Python script (t2i ou i2i)
    → Pós-processa (rembg / resize / ico / tauri-icons)
    → Salva no path detectado do projeto
    → Retorna paths gerados → Orchestrator continua
```

## Estrutura do Skill 17

### SKILL.md — Seções

1. **Quando invocar** — triggers e contextos
2. **Análise de necessidade** — t2i vs i2i, tipo de imagem
3. **Engenharia de prompt** — estrutura por tipo de imagem
4. **Seleção de modelo** — mapeamento custo/qualidade
5. **Detecção de projeto** — onde salvar
6. **Execução** — como chamar o script Python
7. **Pós-processamento** — flags disponíveis
8. **Setup** — dependências e FAL_KEY
9. **Handoff** — o que entregar ao Orchestrator

### Python Script — `scripts/generate-image.py`

CLI com subcomandos:

```bash
python scripts/generate-image.py \
  --mode t2i|i2i \
  --type layout|hero|icon|favicon|mascot|background|illustration \
  --model gemini-25-flash-image \
  --aspect 16:9|1:1|9:16|4:3|3:4 \
  --post-process none|rembg|resize:WxH|ico|tauri-icons \
  --output caminho/saida.png \
  "prompt da imagem"
```

## Engenharia de Prompt por Tipo

| Tipo | Estrutura |
|------|-----------|
| Hero/Layout | `[sujeito], [estilo visual], [paleta], [composição], [iluminação]` |
| Ícone | `[objeto isolado], flat design, fundo transparente, estilo vetorial, minimalista` |
| Mascote | `[personagem], [pose/ação], fundo branco limpo, estilo cartoon/illustration` |
| Background | `[cena], [mood], [cores], sem foco central, textura suave` |
| Favicon | `[símbolo simples], alto contraste, legível em 32x32px` |

## Seleção de Modelo

| Contexto | Modelo fal.ai | Custo |
|----------|---------------|-------|
| Volume / variações rápidas | `fal-ai/gpt-image-1-mini` | ~$0.005-0.036/img |
| Layout geral (padrão) | `fal-ai/gemini-25-flash-image` | $0.039/img |
| Tipografia / prompt complexo | `fal-ai/gemini-3-pro-image-preview` | $0.15/img |
| Fidelidade máxima | `fal-ai/gpt-image-1.5` | $0.034-0.20/img |
| Criativos estéticos | `xai/grok-imagine-image` | $0.02/img |
| i2i (derivar existente) | mesmo modelo + `/edit` endpoint | + custo input |

## Detecção de Output Path

| Estrutura detectada | Output padrão |
|--------------------|---------------|
| `public/` existe | `public/images/generated/` |
| `src-tauri/icons/` existe | `src-tauri/icons/` + tamanhos Tauri |
| `assets/` existe | `assets/images/` |
| Nenhuma | `./generated-images/` |

## Pós-processamento

| Flag | O que faz |
|------|-----------|
| `rembg` | Remove fundo → PNG transparente |
| `resize:WxH` | Redimensiona mantendo aspect ratio |
| `ico` | ICO multi-size (16/32/48/64px) + PNG 180px Apple Touch |
| `tauri-icons` | 32/128/256/512 PNG + ICO Windows (todos tamanhos Tauri) |
| `none` | Salva direto sem processar |

## Setup

```bash
pip install fal-client pillow rembg cairosvg
FAL_KEY=... no .env.local
```

## Arquivos a Criar

- `skills/17-image-generator/SKILL.md`
- `scripts/generate-image.py`
- Atualizar `README.md` (skill count 16 → 17, skill na tabela e file tree)
- Atualizar `skills/09-orchestrator/SKILL.md` (adicionar Image Generator como skill transversal)
