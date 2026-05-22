---
scenario: 17-image-generator
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 120
tokens_out_approx: 310
time_seconds: 18
quality_score: 2.0
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 3
  actionability: 3
  discipline: 2
pass_fail: baseline
delta_vs_baseline: n/a
notes: "Generic prompt with no mention of project tooling (generate.py, FAL.AI, models.json). Workflow references external tools (Midjourney, DALL·E 3) not tied to the kit. No cost routing, no batch flag, no model selection rationale. Prompt is adequate but not tailored beyond surface-level keywords."
---

# Baseline — 17-image-generator

## Scenario input

"Preciso de hero image pra landing de SaaS de billing (publico: freelancer brasileiro), estilo cinematográfico, marca usa azul/preto, tipografia limpa. Como gero? (NÃO gere imagem real, só me dá o prompt + workflow exato)"

## Output

**Prompt sugerido (inglês, para modelos de imagem):**

```
Cinematic hero image for a SaaS billing dashboard. Dark background, deep black and electric blue color palette. A Brazilian freelancer professional sitting at a modern desk, focused on a glowing laptop screen showing clean invoice and payment interface. Dramatic lighting with blue rim light, lens flare, shallow depth of field. Ultra-sharp, photorealistic, 8K, wide aspect ratio (16:9). Clean minimal typography feel. Corporate but human. No text overlays.
```

**Workflow:**

1. Escolha um modelo: Midjourney v6, DALL·E 3, ou Stable Diffusion XL
2. Cole o prompt acima
3. Parâmetros recomendados: aspect ratio 16:9, quality high
4. Gere 4 variações, escolha a melhor
5. Faça upscale se necessário (Topaz, Real-ESRGAN)
6. Remova fundo ou ajuste em Photoshop/Canva se precisar de overlay de texto

## Scoring rationale

| Criterion | Score | Notes |
|---|---|---|
| Specificity | 2 | No mention of kit tooling (generate.py / FAL.AI). External tools cited. |
| Completeness | 3 | Prompt + workflow present; missing cost/model routing, batch flags, model comparison. |
| Correctness | 3 | Advice is sound for generic use but not accurate for the project's actual stack. |
| Actionability | 3 | Actionable for someone using Midjourney; not executable with the project's own CLI. |
| Discipline | 2 | Scope creep into Photoshop/Topaz. No mention of project conventions. |

**Raw total:** 13 / 25  
**Normalized (1-5):** (13 - 5) / 4 = **2.0**
