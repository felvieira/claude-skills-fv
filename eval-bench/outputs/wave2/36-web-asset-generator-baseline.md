---
scenario: 36-web-asset-generator
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 620
time_seconds: 18
quality_score: 2.9
quality_breakdown:
  specificity: 3
  completeness: 3
  correctness: 3
  actionability: 3
  discipline: 3
pass_fail: baseline
delta_vs_baseline: n/a
notes: "Generic answer. Covers most items but skimps on maskable spec, OG card design, Twitter card distinction, and .ico multi-size. No toolchain recommendation. Code runnable but incomplete."
---

# Pass A — Baseline (no skill)

## Scenario Input

"Tenho um logo SVG, preciso gerar pacote completo: favicons (16,32,48,180,192,512), maskable PWA, OG card (1200x630), Twitter card, manifest.json, meta tags HTML. Da pra fazer tudo de uma vez?"

## Response

Sim, é possível gerar tudo de uma vez a partir de um único SVG. Abaixo uma abordagem prática:

### Ferramentas recomendadas

- `sharp` (Node.js) — conversão raster a partir de SVG
- `svgo` — otimização do SVG fonte
- Script único que gera todos os tamanhos em um passo só

### Script (Node.js com sharp)

```js
const sharp = require('sharp');
const fs = require('fs');

const SVG = './logo.svg';
const OUT = './public';

const faviconSizes = [16, 32, 48, 180, 192, 512];

async function run() {
  // Favicons PNG
  for (const size of faviconSizes) {
    await sharp(SVG)
      .resize(size, size)
      .toFile(`${OUT}/favicon-${size}x${size}.png`);
  }

  // Maskable: safe zone ~80% do total, padding ~10% em cada lado
  await sharp(SVG)
    .resize(410, 410) // logo ocupa 80% de 512
    .extend({ top: 51, bottom: 51, left: 51, right: 51, background: '#ffffff' })
    .toFile(`${OUT}/maskable-512x512.png`);

  // OG card 1200x630 (fundo branco, logo centralizado)
  await sharp(SVG)
    .resize(630, 630, { fit: 'contain', background: '#ffffff' })
    .extend({ left: 285, right: 285, background: '#ffffff' })
    .toFile(`${OUT}/og-card.png`);

  // Twitter card: mesmo formato 1200x630
  fs.copyFileSync(`${OUT}/og-card.png`, `${OUT}/twitter-card.png`);
}
run().catch(console.error);
```

### manifest.json

```json
{
  "name": "My App",
  "short_name": "App",
  "icons": [
    { "src": "/favicon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/favicon-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/maskable-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000"
}
```

### Meta tags HTML

```html
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/favicon-180x180.png">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#000000">

<!-- Open Graph -->
<meta property="og:image" content="https://yoursite.com/og-card.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://yoursite.com/twitter-card.png">
```

### Alternativa mais rápida

Use o pacote `favicons` (npm) — ele gera quase tudo automaticamente com uma chamada só, incluindo manifest e HTML. Mas não gera OG card customizado.

### O que ainda falta automatizar

- `.ico` multi-size (16+32+48 combinados) — use `png-to-ico` ou `sharp` com `ico-endec`
- Testes de contraste do logo sobre fundos claros/escuros antes de fixar `background_color`
- Validação do manifest com Lighthouse ou PWA Builder
