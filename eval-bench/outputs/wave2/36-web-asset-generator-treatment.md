---
scenario: 36-web-asset-generator
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2800
tokens_out_approx: 980
time_seconds: 38
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.6
notes: "Cobriu todos os assets exigidos com tamanhos corretos. Distinguiu OG (630) vs Twitter (675). Nomeou anti-padrões concretos (apple icon transparente, URL relativa, maskable). Entregou estrutura de diretório final, checklist de validação e handoffs. Skill injetou safe-area 80%, browserconfig.xml e cache-busting que o baseline ignorou."
---

# Pass B — Treatment (com skill 36-web-asset-generator)

## Scenario Input

"Tenho um logo SVG, preciso gerar pacote completo: favicons (16,32,48,180,192,512), maskable PWA, OG card (1200x630), Twitter card, manifest.json, meta tags HTML. Da pra fazer tudo de uma vez?"

## Response

Sim, dá pra fazer tudo de uma vez. O caminho mais direto:

### Opção A — `@realfavicongenerator/cli` (1 comando, cobre 90%)

```bash
npx @realfavicongenerator/cli generate \
  --master-picture logo.svg \
  --output public/ \
  --background "#ffffff" \
  --theme-color "#0f766e" \
  --app-name "MeuApp"
```

Gera automaticamente: favicon.ico (16+32+48 multi-size), PNG 16/32/96/192/512, apple-touch-icon 180x180, manifest e HTML snippet. **Não gera OG card nem Twitter card** — esses precisam de passo separado.

---

### Passo 2 — OG card (1200×630) + Twitter card (1200×675)

```bash
# OG card — Facebook, LinkedIn, WhatsApp
magick logo.svg -resize 600x600 -background "#0f766e" \
  -gravity center -extent 1200x630 public/og-image.png

# Twitter large card (proporção ligeiramente diferente: 675, não 630)
magick logo.svg -resize 600x600 -background "#0f766e" \
  -gravity center -extent 1200x675 public/twitter-card.png
```

**Atenção ao safe area:** mantenha o assunto principal dentro de 1080×540 (margem 60px). Alguns clientes cortam as bordas.

---

### Passo 3 — Maskable PWA (safe area 80%)

O `realfavicongenerator` gera o maskable, mas se quiser controle manual:

```bash
# Logo ocupa 80% de 512px = 410px; padding ~51px em cada lado
magick logo.svg -resize 410x410 -background "#0f766e" \
  -gravity center -extent 512x512 public/icon-maskable-512.png
```

Valide em https://maskable.app/editor antes de subir.

---

### manifest.webmanifest completo

```json
{
  "name": "MeuApp",
  "short_name": "MeuApp",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f766e",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

### Meta tags HTML (colar no `<head>`)

```html
<!-- Favicons -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- PWA -->
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#0f766e">

<!-- Open Graph (URL absoluta obrigatória) -->
<meta property="og:title" content="MeuApp">
<meta property="og:description" content="Descrição curta do produto">
<meta property="og:image" content="https://meusite.com/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://meusite.com/">
<meta property="og:type" content="website">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="MeuApp">
<meta name="twitter:description" content="Descrição curta do produto">
<meta name="twitter:image" content="https://meusite.com/twitter-card.png">
```

**Crítico:** `og:image` exige URL absoluta. URL relativa não funciona em WhatsApp/LinkedIn/Slack.

---

### Estrutura final esperada em `public/`

```
public/
├── favicon.ico              (16+32+48 multi-size)
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-96x96.png
├── apple-touch-icon.png     (180x180, fundo sólido — sem transparência)
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── icon-maskable-512.png    (80% safe area)
├── og-image.png             (1200x630)
├── twitter-card.png         (1200x675)
├── manifest.webmanifest
└── meta-tags.html
```

---

### Anti-padrões a evitar

- **Apple icon transparente** — iOS coloca fundo branco automático, gerando halo. Sempre fundo sólido.
- **URL relativa no OG image** — preview quebra em todos os apps de mensagem.
- **Manifest sem `purpose: maskable`** — Android adaptive icon fica com borda branca feia.
- **Logo complexo em 16px** — texto fino vira borrão. Se o logo tiver texto, crie variante só com símbolo.

---

### Validação pós-geração

```bash
# Favicon acessível
curl -I https://meusite.com/favicon.ico

# PWA
npx lighthouse https://meusite.com --view

# OG preview
# https://www.opengraph.xyz/
# https://developers.facebook.com/tools/debug/

# Twitter
# https://cards-dev.twitter.com/validator
```

Cache do Facebook/Twitter pode levar dias — use os debuggers para forçar refresh.

---

### Handoffs

- **Skill 04 (Frontend):** integra `meta-tags.html` no `<head>` do layout
- **Skill 14 (SEO):** valida completude das tags para indexação
- **Skill 07 (Deploy):** confirma assets no bundle + URLs absolutas configuradas
