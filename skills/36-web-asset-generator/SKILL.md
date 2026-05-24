---
name: web-asset-generator
description: |
  Skill para gerar assets web a partir de logo ou texto: favicon (multi-size), PWA icons,
  Open Graph images (Facebook/Twitter/WhatsApp/LinkedIn), apple-touch-icon, e respectivos
  meta tags HTML. Use ao preparar deploy de site, landing page ou PWA novo.
  Trigger em: "favicon", "favicons", "PWA icon", "manifest", "Open Graph", "OG image",
  "social meta", "twitter card", "apple-touch-icon", "imagem de compartilhamento", "share image".
argument-hint: "[--input=path/to/logo.png] [--brand-name=X] [--brand-color=#hex] [--output-dir=public/]"
allowed-tools: Read, Write, Bash(npx *), Bash(magick *), Bash(convert *), Bash(node *)
---

# Web Asset Generator — Favicons, PWA Icons, OG Images

Gap operacional comum: time termina deploy e percebe que faltam favicons, PWA icons, e a OG image quando alguem compartilha o link no WhatsApp aparece em branco. Esta skill resolve em 1 comando.

Complementa skill 17 (Image Generator — fal.ai) que gera imagens originais; esta skill **deriva** assets de uma imagem ja existente (logo) ou de texto (slogan).

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`, `policies/writing-clarity.md`.

## Quando Usar

- antes do primeiro deploy de site
- depois de mudanca de identidade visual (rebrand)
- ao adicionar suporte a PWA
- ao detectar (via Lighthouse) ausencia de manifest, favicon, OG tags
- preparando landing page para anuncio/lancamento
- migrando para HTTPS/dominio novo (URLs nas meta tags mudam)

## Quando Nao Usar

- gerar imagem original (use skill 17 — Image Generator com fal.ai)
- editar imagem existente (use ferramenta especializada)
- design system inteiro (use skill 02 — UI/UX Designer)
- video/GIF (use skill 27 — Video Integration)

## Entradas Esperadas

- **logo source** (preferivel): PNG/SVG quadrado, fundo transparente, >= 512x512
- **OU brand text** (fallback): nome curto + cor hex de fundo
- **brand name** (sempre): aparece em manifest e meta tags
- **brand color** (sempre): theme-color, OG bg
- **base URL** (para meta tags): `https://meusite.com`
- **output dir** (default `public/`): onde gerar os arquivos

## Saidas Esperadas

### Diretorio de assets

```
public/
├── favicon.ico              (16, 32, 48 multi-size .ico)
├── favicon-16x16.png
├── favicon-32x32.png
├── favicon-96x96.png
├── apple-touch-icon.png     (180x180)
├── android-chrome-192x192.png
├── android-chrome-512x512.png
├── icon-maskable-512.png    (PWA maskable, com safe area)
├── og-image.png             (1200x630 — Facebook/LinkedIn)
├── twitter-card.png         (1200x675 — Twitter large card)
├── manifest.webmanifest
└── browserconfig.xml        (Windows tile)
```

### Snippet HTML pronto

`public/meta-tags.html` — copiar e colar no `<head>`:

```html
<!-- Favicons -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- PWA -->
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#<brand-color>">

<!-- Open Graph -->
<meta property="og:title" content="<title>">
<meta property="og:description" content="<description>">
<meta property="og:image" content="https://<base-url>/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:url" content="https://<base-url>/">
<meta property="og:type" content="website">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="<title>">
<meta name="twitter:description" content="<description>">
<meta name="twitter:image" content="https://<base-url>/twitter-card.png">
```

## Responsabilidades / Protocolo

1. **Validar input**: logo source quadrado >= 512x512 (PNG/SVG transparente preferivel) **OU** texto + cor de fundo
2. **Coletar metadados**: brand name, brand color (hex), base URL absoluta, output dir
3. **Gerar favicons**: ICO multi-size + PNG 16/32/96
4. **Gerar PWA icons**: 192/512 + maskable 512 (com 80% safe area)
5. **Gerar Apple touch icon**: 180x180 (fundo solido, sem transparencia)
6. **Gerar OG image**: 1200x630 PNG (assunto centralizado, alto contraste)
7. **Gerar Twitter card**: 1200x675 PNG
8. **Gerar manifest.webmanifest** + browserconfig.xml
9. **Gerar snippet HTML** com todas as meta tags (URLs absolutas)
10. **Validar output**: Lighthouse PWA + Facebook debugger + Twitter validator
11. **Handoff** para skill 04 (Frontend) integrar no template HTML

Detalhes nas sub-secoes a seguir.

## Especificacoes Por Plataforma

| Asset | Tamanho | Formato | Para |
|---|---|---|---|
| favicon.ico | 16+32+48 multi | ICO | browser tab |
| favicon-16/32/96 | exatos | PNG | browser tab fallback |
| apple-touch-icon | 180x180 | PNG | iOS home screen |
| android-chrome-192 | 192x192 | PNG | Android |
| android-chrome-512 | 512x512 | PNG | Android splash |
| icon-maskable-512 | 512x512 | PNG (com 80% safe area centralizada) | PWA adaptive icon |
| og-image | 1200x630 | PNG ou JPG | Facebook, LinkedIn, WhatsApp |
| twitter-card | 1200x675 | PNG | Twitter Large Card |
| ms-tile | 144x144 | PNG | Windows pinned site |

**Regra critica de OG image:**
- texto deve caber em **safe area de 1080x540** (margem 60px) — alguns clientes croppam
- contraste minimo 4.5:1 para texto
- evitar texto > 60 chars (corta no preview)

## Ferramentas

### Opcao A: realfavicongenerator (recomendada)

```bash
npx @realfavicongenerator/cli generate \
  --master-picture path/to/logo.png \
  --output public/ \
  --background "#0f766e" \
  --theme-color "#0f766e" \
  --app-name "MeuApp"
```

Cobre favicon completo + PWA + Apple + Windows. Output inclui HTML snippet.

### Opcao B: ImageMagick (mais controle, manual)

```bash
# favicon.ico multi-size
magick logo.png -define icon:auto-resize=16,32,48 favicon.ico

# PNG sizes
for size in 16 32 96 192 512; do
  magick logo.png -resize ${size}x${size} favicon-${size}x${size}.png
done

# Apple
magick logo.png -resize 180x180 apple-touch-icon.png

# OG (1200x630, com padding centralizado)
magick logo.png -resize 600x600 -background "#0f766e" \
  -gravity center -extent 1200x630 og-image.png
```

### Opcao C: Sharp (Node, programatico)

```javascript
import sharp from 'sharp';

const sizes = [16, 32, 96, 192, 512];
for (const size of sizes) {
  await sharp('logo.png')
    .resize(size, size)
    .toFile(`public/favicon-${size}x${size}.png`);
}

// OG image
await sharp('logo.png')
  .resize(600, 600)
  .extend({
    top: 15, bottom: 15, left: 300, right: 300,
    background: { r: 15, g: 118, b: 110, alpha: 1 }
  })
  .toFile('public/og-image.png');
```

### Opcao D: Text-to-image (sem logo)

Se nao houver logo, gerar OG/favicon a partir de texto + cor:

```bash
magick -size 1200x630 xc:"#0f766e" \
  -font Arial-Bold -pointsize 96 -fill white -gravity center \
  -annotate 0 "MeuApp" og-image.png
```

Para favicon com inicial: gerar 512x512 com letra centralizada, depois resize.

## Manifest PWA

Template minimo:

```json
{
  "name": "MeuApp",
  "short_name": "MeuApp",
  "description": "Descricao curta",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#0f766e",
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icon-maskable-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

## Heuristicas

### Logo source ideal
- SVG > PNG transparente > PNG com fundo
- quadrado (recortar antes se nao for)
- detalhe minimo legivel a 16x16 (logos com texto fino quebram)
- contrastar com fundo branco E preto (PWA usa ambos)

### OG image que funciona em todo lugar
- 1200x630 (proporcao 1.91:1)
- assunto principal no centro 1080x540
- texto grande (96-120pt para titulo)
- contraste alto
- sem informacao critica nas bordas

### Maskable icon (PWA)
- safe area circular de **80%** (raio 410px em 512px)
- fundo solido (sem transparencia)
- ferramenta visual: https://maskable.app/editor

### Cache busting
- ao trocar assets, mudar query string nas meta tags: `?v=2`
- ou renomear: `og-image-v2.png`
- caches de Facebook/Twitter levam dias para invalidar — usar debugger oficial:
  - Facebook: https://developers.facebook.com/tools/debug/
  - Twitter: https://cards-dev.twitter.com/validator

## Validacao Pos-Geracao

Checklist:

```bash
# 1. Lighthouse (Best Practices + PWA)
npx lighthouse https://meusite.com --view

# 2. Favicon checker
curl -I https://meusite.com/favicon.ico  # deve retornar 200

# 3. OG preview
# Facebook debugger (URL acima)
# OpenGraph.xyz (rapido visual): https://www.opengraph.xyz/

# 4. PWA installability
# Chrome DevTools > Application > Manifest
```

<!-- anti-rationalization: N/A — skill e mecanica (gera assets a partir de input bem-definido), sem judgment calls que justifiquem tabela de vies -->

## Anti-Padroes

### "OG image gerica de stock"
Stock photo sem branding = link parece spam. Sempre incluir logo + nome.

### "Favicon de 16px borrado"
Resize de logo complexo para 16x16 vira borrao. Criar versao simplificada do logo (so simbolo, sem texto).

### "Apple icon transparente"
iOS aplica fundo branco automatico atras de transparencia, gerando halo. Sempre fundo solido em apple-touch-icon.

### "Manifest sem icons maskable"
PWA sem maskable: adaptive icon do Android fica com borda branca. Sempre incluir `purpose: maskable`.

### "Esquecer de atualizar URL absoluta"
OG image precisa URL absoluta (`https://...`), nao relativa (`/og-image.png`). Sem URL absoluta, preview nao funciona em apps externos.

### "Mesma OG image para todas as paginas"
Pagina de produto X com OG generico do site = baixa CTR. Por pagina importante, gerar OG dedicada.

## Evidencia de Conclusao

- todos os assets do quadro "Especificacoes Por Plataforma" gerados
- `manifest.webmanifest` valido (passar em https://manifest-validator.appspot.com/)
- `meta-tags.html` snippet pronto para colar
- Lighthouse PWA score >= 90
- preview validado no Facebook debugger e Twitter validator

## Handoff

Apos geracao, entregar:
1. caminho dos assets (`public/`)
2. snippet HTML para colar no `<head>`
3. URL absoluta esperada (para validar OG quando deploy)
4. checklist de validacao pos-deploy

## Integracao com Pipeline

- **Image Generator (skill 17):** **handoff direto** — apos skill 17 gerar logo/mascote/asset criativo principal, esta skill (36) deriva todos os formatos web operacionais (favicon multi-tamanho, apple-touch-icon, PWA icons incluindo maskable, Open Graph 1200x630, Twitter card 1200x675, manifest, browserconfig). Skill 17 cria o original criativo; skill 36 deriva o pacote operacional. Se logo nao existe, skill 17 cria primeiro; se ja existe, skill 36 roda sozinha. **Quando gerar logo**, skill 17 usa default `grok-imagine` ($0.020). Para OG card com texto, override pra `gemini-3-pro` ($0.15 — vale pelo polish tipográfico).
- **Frontend (skill 04):** integra `meta-tags.html` no template HTML/Next layout
- **SEO (skill 14):** valida que tags estao corretas e completas para indexacao
- **Asset Librarian (skill 19):** cataloga assets gerados em `docs/repo-audit/assets.md`
- **Deploy (skill 07):** valida que assets estao no bundle final + URLs absolutas configuradas
- **Accessibility (skill 22):** valida contraste de OG image
