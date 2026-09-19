# Referência de Presets Visuais

Estilos visuais curados para Frontend Slides. Cada preset é inspirado em referência de design real — sem estética genérica de "AI slop". **Só formas abstratas — sem ilustração.**

**Viewport CSS:** ver `engine/viewport-base.css` para os estilos base obrigatórios. Incluir por inteiro em toda apresentação.

---

## Temas Escuros

### 1. Bold Signal

**Vibe:** confiante, ousado, moderno, alto impacto

**Layout:** card colorido sobre gradiente escuro. Número no canto superior esquerdo, navegação no canto superior direito, título no canto inferior esquerdo.

**Tipografia:**
- Display: `Archivo Black` (900)
- Corpo: `Space Grotesk` (400/500)

**Cores:**
```css
:root {
    --bg-primary: #1a1a1a;
    --bg-gradient: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
    --card-bg: #FF5722;
    --text-primary: #ffffff;
    --text-on-card: #1a1a1a;
}
```

**Elementos de assinatura:**
- Card colorido em destaque (laranja, coral, ou acento vibrante)
- Números de seção grandes (01, 02, etc.)
- Breadcrumbs de navegação com estados de opacidade ativo/inativo
- Layout em grid para alinhamento preciso

---

### 2. Electric Studio

**Vibe:** ousado, limpo, profissional, alto contraste

**Layout:** painel dividido — branco em cima, azul embaixo. Marcas de marca nos cantos.

**Tipografia:**
- Display: `Manrope` (800)
- Corpo: `Manrope` (400/500)

**Cores:**
```css
:root {
    --bg-dark: #0a0a0a;
    --bg-white: #ffffff;
    --accent-blue: #4361ee;
    --text-dark: #0a0a0a;
    --text-light: #ffffff;
}
```

**Elementos de assinatura:**
- Divisão vertical em dois painéis
- Barra de acento na borda do painel
- Tipografia de citação como elemento hero
- Espaçamento minimalista e confiante

---

### 3. Creative Voltage

**Vibe:** ousado, criativo, energético, retrô-moderno

**Layout:** painéis divididos — azul elétrico à esquerda, escuro à direita. Acentos de script.

**Tipografia:**
- Display: `Syne` (700/800)
- Mono: `Space Mono` (400/700)

**Cores:**
```css
:root {
    --bg-primary: #0066ff;
    --bg-dark: #1a1a2e;
    --accent-neon: #d4ff00;
    --text-light: #ffffff;
}
```

**Elementos de assinatura:**
- Contraste azul elétrico + amarelo neon
- Padrões de textura halftone
- Badges/callouts neon
- Tipografia script para toque criativo

---

### 4. Dark Botanical

**Vibe:** elegante, sofisticado, artístico, premium

**Layout:** conteúdo centralizado sobre fundo escuro. Formas suaves abstratas no canto.

**Tipografia:**
- Display: `Cormorant` (400/600) — serifada elegante
- Corpo: `IBM Plex Sans` (300/400)

**Cores:**
```css
:root {
    --bg-primary: #0f0f0f;
    --text-primary: #e8e4df;
    --text-secondary: #9a9590;
    --accent-warm: #d4a574;
    --accent-pink: #e8b4b8;
    --accent-gold: #c9b896;
}
```

**Elementos de assinatura:**
- Círculos com gradiente suave abstrato (borrados, sobrepostos)
- Acentos de cor quente (rosa, dourado, terracota)
- Linhas verticais finas de acento
- Tipografia de assinatura em itálico
- **Sem ilustração — só formas CSS abstratas**

---

## Temas Claros

### 5. Notebook Tabs

**Vibe:** editorial, organizado, elegante, tátil

**Layout:** card de papel creme sobre fundo escuro. Abas coloridas na borda direita.

**Tipografia:**
- Display: `Bodoni Moda` (400/700) — editorial clássica
- Corpo: `DM Sans` (400/500)

**Cores:**
```css
:root {
    --bg-outer: #2d2d2d;
    --bg-page: #f8f6f1;
    --text-primary: #1a1a1a;
    --tab-1: #98d4bb; /* menta */
    --tab-2: #c7b8ea; /* lavanda */
    --tab-3: #f4b8c5; /* rosa */
    --tab-4: #a8d8ea; /* céu */
    --tab-5: #ffe6a7; /* creme */
}
```

**Elementos de assinatura:**
- Container de papel com sombra sutil
- Abas de seção coloridas na borda direita (texto vertical)
- Decoração de furos de fichário à esquerda
- Texto da aba precisa escalar com o viewport: `font-size: clamp(0.5rem, 1vh, 0.7rem)`

---

### 6. Pastel Geometry

**Vibe:** amigável, organizado, moderno, acessível

**Layout:** card branco sobre fundo pastel. Pílulas verticais na borda direita.

**Tipografia:**
- Display: `Plus Jakarta Sans` (700/800)
- Corpo: `Plus Jakarta Sans` (400/500)

**Cores:**
```css
:root {
    --bg-primary: #c8d9e6;
    --card-bg: #faf9f7;
    --pill-pink: #f0b4d4;
    --pill-mint: #a8d4c4;
    --pill-sage: #5a7c6a;
    --pill-lavender: #9b8dc4;
    --pill-violet: #7c6aad;
}
```

**Elementos de assinatura:**
- Card arredondado com sombra suave
- **Pílulas verticais na borda direita** com alturas variadas (como abas)
- Largura de pílula consistente, alturas: curta → média → alta → média → curta
- Ícone de ação/download no canto

---

### 7. Split Pastel

**Vibe:** brincalhão, moderno, amigável, criativo

**Layout:** divisão vertical de duas cores (pêssego à esquerda, lavanda à direita).

**Tipografia:**
- Display: `Outfit` (700/800)
- Corpo: `Outfit` (400/500)

**Cores:**
```css
:root {
    --bg-peach: #f5e6dc;
    --bg-lavender: #e4dff0;
    --text-dark: #1a1a1a;
    --badge-mint: #c8f0d8;
    --badge-yellow: #f0f0c8;
    --badge-pink: #f0d4e0;
}
```

**Elementos de assinatura:**
- Fundo dividido por cor
- Badges/pílulas brincalhonas com ícone
- Overlay de padrão de grid no painel direito
- Botões de CTA arredondados

---

### 8. Vintage Editorial

**Vibe:** espirituoso, confiante, editorial, com personalidade

**Layout:** conteúdo centralizado sobre creme. Formas geométricas abstratas como acento.

**Tipografia:**
- Display: `Fraunces` (700/900) — serifada distintiva
- Corpo: `Work Sans` (400/500)

**Cores:**
```css
:root {
    --bg-cream: #f5f3ee;
    --text-primary: #1a1a1a;
    --text-secondary: #555;
    --accent-warm: #e8d4c0;
}
```

**Elementos de assinatura:**
- Formas geométricas abstratas (contorno de círculo + linha + ponto)
- Caixas de CTA com borda forte
- Estilo de copy espirituoso e conversacional
- **Sem ilustração — só formas CSS geométricas**

---

## Temas Especiais

### 9. Neon Cyber

**Vibe:** futurista, tech, confiante

**Tipografia:** `Clash Display` + `Satoshi` (Fontshare)

**Cores:** azul-marinho profundo (#0a0f1c), acento ciano (#00ffcc), magenta (#ff00aa)

**Assinatura:** fundos de partícula, glow neon, padrões de grid

---

### 10. Terminal Green

**Vibe:** foco em dev, estética hacker

**Tipografia:** `JetBrains Mono` (só monoespaçada)

**Cores:** GitHub dark (#0d1117), verde terminal (#39d353)

**Assinatura:** scan lines, cursor piscando, estilização de sintaxe de código

---

### 11. Swiss Modern

**Vibe:** limpo, preciso, inspirado em Bauhaus

**Tipografia:** `Archivo` (800) + `Nunito` (400)

**Cores:** branco puro, preto puro, acento vermelho (#ff3300)

**Assinatura:** grid visível, layouts assimétricos, formas geométricas

---

### 12. Paper & Ink

**Vibe:** editorial, literário, reflexivo

**Tipografia:** `Cormorant Garamond` + `Source Serif 4`

**Cores:** creme quente (#faf9f7), carvão (#1a1a1a), acento carmim (#c41e3a)

**Assinatura:** letras capitulares, pull quotes, filetes horizontais elegantes

---

## Referência Rápida de Pares Tipográficos

| Preset | Fonte Display | Fonte Corpo | Fonte |
|--------|--------------|-----------|--------|
| Bold Signal | Archivo Black | Space Grotesk | Google |
| Electric Studio | Manrope | Manrope | Google |
| Creative Voltage | Syne | Space Mono | Google |
| Dark Botanical | Cormorant | IBM Plex Sans | Google |
| Notebook Tabs | Bodoni Moda | DM Sans | Google |
| Pastel Geometry | Plus Jakarta Sans | Plus Jakarta Sans | Google |
| Split Pastel | Outfit | Outfit | Google |
| Vintage Editorial | Fraunces | Work Sans | Google |
| Neon Cyber | Clash Display | Satoshi | Fontshare |
| Terminal Green | JetBrains Mono | JetBrains Mono | JetBrains |

---

## NÃO USAR (Padrões Genéricos de IA)

**Fontes:** Inter, Roboto, Arial, fontes de sistema como display

**Cores:** `#6366f1` (índigo genérico), gradientes roxos sobre branco

**Layouts:** tudo centralizado, hero sections genéricas, grids de card idênticos

**Decorações:** ilustração realista, glassmorphism gratuito, sombra sem propósito

---

## Pegadinha de CSS

### Negar Funções CSS

**ERRADO — ignorado silenciosamente pelo navegador (sem erro no console):**
```css
right: -clamp(28px, 3.5vw, 44px);   /* navegador ignora isso */
margin-left: -min(10vw, 100px);      /* navegador ignora isso */
```

**CORRETO — envolver em `calc()`:**
```css
right: calc(-1 * clamp(28px, 3.5vw, 44px));  /* funciona */
margin-left: calc(-1 * min(10vw, 100px));     /* funciona */
```

CSS não permite um `-` antes do nome de uma função. O navegador descarta a declaração inteira silenciosamente — sem erro, o elemento simplesmente aparece na posição errada. **Sempre usar `calc(-1 * ...)` para negar valores de função CSS.**
