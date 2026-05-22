---
scenario: 19-asset-librarian
pass: baseline
model: claude-opus-4-7
tokens_in_approx: 80
tokens_out_approx: 650
time_seconds: 20
quality_score: 2.5
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 3
pass_fail: baseline
notes: "resposta generica sem inventario estruturado, sem politica anti-drift"
---

# Como organizar 80 imagens, 12 logos e 5 fontes

## 1. Crie uma estrutura de pastas clara

```
assets/
  images/
    hero/
    thumbs/
    backgrounds/
    icons/
  logos/
    primary/
    secondary/
    deprecated/
  fonts/
    primary/
    secondary/
```

## 2. Nomeie tudo de forma consistente

Use padrao `kebab-case` descritivo:
- `hero-landing-desktop.jpg`
- `logo-brand-primary-dark.svg`
- `font-inter-variable.woff2`

Evite nomes tipo `IMG_2034.jpg`, `logo-final-v2-FINAL.png`.

## 3. Inventarie em uma planilha ou JSON

Crie um `assets-manifest.json` listando tudo:

```json
{
  "logos": [
    {
      "id": "logo-primary",
      "path": "assets/logos/primary/logo-dark.svg",
      "use_case": "header, app principal",
      "deprecated": false
    }
  ]
}
```

## 4. Marque os 12 logos: qual e o oficial?

Reuna o time, decida:
- 1 logo primario (oficial)
- 2-3 variacoes legitimas (mono, invertido, horizontal)
- Resto: arquivar em `deprecated/` ou deletar

## 5. Reduza as 5 fontes para 2

Tipograficamente, 2 fontes ja sao suficientes:
- 1 sans-serif (UI, body)
- 1 display (headings) ou monospace (code)

## 6. Documente em um README

Crie `assets/README.md` explicando:
- Quando usar cada logo
- Quando usar cada fonte
- Como adicionar novos assets

## 7. Adicione no onboarding

Devs novos devem ler o README antes de tocar em assets.

## 8. Use Git LFS para arquivos grandes

Se ha imagens > 1MB, considere Git LFS.
