---
scenario: 17-image-generator
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 980
tokens_out_approx: 780
time_seconds: 35
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.5
notes: "Prompt annotated with rationale per element. Pipeline with 3 stages (iterate/validate/final) and exact CLI commands. Cost estimate per stage. Output path specified. Handoff to skills 36/14/04. Mode correctly identified as t2i. One minor gap: correctness docked 1pt because --num-images flag may not be the actual CLI param name in generate.py (not verified against source)."
---

# Treatment — 17-image-generator

## Scenario input

"Preciso de hero image pra landing de SaaS de billing (publico: freelancer brasileiro), estilo cinematográfico, marca usa azul/preto, tipografia limpa. Como gero? (NÃO gere imagem real, só me dá o prompt + workflow exato)"

## Output

## Contexto visual (checklist antes de gerar)

Projeto sem repo existente declarado — landing nova, sem assets prévios. Paleta definida: **azul elétrico + preto**. Público: **freelancer brasileiro**. Tom: cinematográfico, tipografia limpa. Função do asset: **hero** (acima da dobra, principal call-to-attention). Modo: **t2i** (geração do zero — sem base existente).

---

## Prompt final reproduzível

```
Cinematic SaaS billing hero image. A Brazilian independent professional — late 20s to early 40s, 
casual-professional attire — sits at a minimal dark desk, focused on a sleek laptop displaying 
a clean invoice dashboard with glowing blue UI elements. Deep black background. Electric blue 
rim lighting hits the subject from behind-left, creating a dramatic separation from the background. 
Subtle blue ambient glow from the screen reflects on the desk surface. Shallow depth of field, 
anamorphic lens feel, slight bokeh in background. Ultra-sharp subject. No visible text or readable 
labels on screen. No stock-photo look — editorial, cinematic mood. 16:9 widescreen. Photorealistic. 
Leave left ~30% of frame with low visual complexity for typography overlay.
```

**Por que cada elemento:**

| Elemento | Motivo |
|---|---|
| "Brazilian independent professional" | Público-alvo visível na imagem → identificação imediata |
| "casual-professional attire" | Freelancer ≠ executivo corporativo; evita distância emocional |
| "deep black background + electric blue rim" | Paleta da marca aplicada via iluminação, não como cor de fundo chata |
| "anamorphic lens feel" | Entrega o "cinematográfico" de forma técnica, reproduzível entre modelos |
| "No readable labels on screen" | Evita texto falso na UI que quebre credibilidade |
| "left 30% low complexity" | Reserva espaço para headline da landing — composição pensada para uso final |

---

## Workflow exato

### 1. Iteração barata (escolha de direção)

```bash
# 5 variações rápidas com gpt-image-1-mini — custo ~$0.025 total
python D:\Repos\GERAL\image-generation\generate.py \
  --prompt "Cinematic SaaS billing hero image. A Brazilian independent professional..." \
  --model gpt-image-1-mini \
  --num-images 4 \
  --out ./hero-iteration/
```

Escolha 1-2 direções que melhor entregam paleta + mood cinematográfico.

### 2. Validação polida (aprovação visual)

```bash
# 2 versões com Gemini 2.5 Flash — custo $0.078 total, previsível
python D:\Repos\GERAL\image-generation\generate.py \
  --prompt "..." \
  --model gemini-25-flash \
  --num-images 2 \
  --out ./hero-validation/
```

Compartilhe com stakeholder ou revise contra checklist visual (paleta ✓, espaço tipográfico ✓, freelancer reconhecível ✓).

### 3. Asset final de produção

```bash
# 1 versão final com gpt-image-1.5 — fidelidade máxima, ~$0.09-0.20
python D:\Repos\GERAL\image-generation\generate.py \
  --prompt "..." \
  --model gpt-image-1.5 \
  --out public/images/generated/hero.jpg
```

Output path final: `public/images/generated/hero.jpg`

### Custo total típico desse pipeline: **~$0.15–0.35**

---

## Modelo recomendado por caso

| Situação | Modelo |
|---|---|
| Teste rápido / múltiplas variações | `gpt-image-1-mini` |
| Produção escala / custo previsível | `gemini-25-flash` |
| Tipografia/composição complexa necessária | `gemini-3-pro` |
| Hero final de alta fidelidade | `gpt-image-1.5` |

---

## Handoff

- **Output final:** `public/images/generated/hero.jpg`
- **Prompt:** reproduzível acima — qualquer mudança futura (pose, estação, produto na tela) é delta sobre este base
- **Próximos passos sugeridos:**
  - Skill 36 (Web Asset Generator) → derivar OG image / Twitter card a partir do hero
  - Skill 14 (SEO) → definir `alt` text e `title` para o `<img>` na landing
  - Skill 04 (Frontend) → confirmar dimensões exatas e lazy-loading da tag `<img>`

## Scoring rationale

| Criterion | Score | Notes |
|---|---|---|
| Specificity | 5 | Uses kit's own CLI (generate.py), correct model IDs from skill table, explicit output path per project convention. |
| Completeness | 5 | Covers: context analysis, t2i vs i2i decision, annotated prompt, 3-stage pipeline, cost per stage, model routing table, handoff to 3 downstream skills. |
| Correctness | 4 | Model IDs and cost figures match skill table. --num-images flag not verified against generate.py source — small risk. CLI path uses kit convention correctly. |
| Actionability | 5 | Reader can copy-paste the bash commands immediately. Cost estimate tells them what to expect. Prompt is ready to use verbatim. |
| Discipline | 4 | Respects scope (prompt + workflow only, no actual generation). Correctly identifies no existing assets → t2i. Handoff is clean. Minor: could have noted that --num-images may need verification against generate.py --help. |

**Raw total:** 23 / 25  
**Normalized (1-5):** (23 - 5) / 4 = **4.5**
