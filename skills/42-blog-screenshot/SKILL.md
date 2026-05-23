---
name: 42-blog-screenshot
description: |
  Captura screenshots via Playwright MCP de URLs/elementos pra usar em posts de blog ou
  documentação. Lida com viewport, cookie banners, full-page vs section,
  scroll a âncora, formatos PNG/JPG. Compõe com skill 41 (blog-publisher).
  Trigger em: "tira print", "screenshot do site", "captura tela", "screenshot da página",
  "print da landing", "print do dashboard", "screenshot pro blog".
argument-hint: "[URL ou descrição da captura]"
allowed-tools:
  - Bash
  - Read
  - Write
  - mcp__plugin_playwright_playwright__browser_navigate
  - mcp__plugin_playwright_playwright__browser_take_screenshot
  - mcp__plugin_playwright_playwright__browser_resize
  - mcp__plugin_playwright_playwright__browser_evaluate
  - mcp__plugin_playwright_playwright__browser_snapshot
version: 1.0.0
author: felvieira
compatibility: ">=2.10.2"
---

# Blog Screenshot — Skill 42

> **Especialista em captura via Playwright.** Pega URL/elemento → entrega PNG/JPG limpo.

## Governança Global

Esta skill segue `GLOBAL.md`, `policies/tool-safety.md`. Usa Playwright MCP que já está
no harness padrão do kit.

## Quando Usar

- Skill 41 (blog-publisher) precisa de imagem real de algo navegável (não geração)
- Documentação técnica que precisa mostrar a UI de um site/dashboard
- Comparação visual antes/depois de mudança em landing page
- Captura de relatório HTML rendered (ex: `analyze-doc/index.html`)

## Quando NÃO Usar

- Imagem conceitual/abstrata → usar skill 17 (image-generator fal.ai)
- Logo/icone/favicon → usar skill 36 (web-asset-generator)
- Mockup de UI que ainda não existe → skill 17
- Screenshot de PDF/documento estático — usar outra ferramenta (Playwright é browser only)

## Decision tree: full-page vs viewport vs element

```
A captura é da página inteira?
├── SIM → fullPage: true
│   └── Resultado: arquivo longo, ideal pra hero/cover landing
└── NÃO → fullPage: false (viewport visible)
    ├── Específico de uma seção?
    │   └── Scroll até âncora (URL com #fragment) antes do shot
    └── Específico de um elemento?
        └── Passar `element` selector pro screenshot
```

## Viewports padrão (escolher por destino)

| Destino | Width × Height | Quando usar |
|---|---|---|
| Cover de post de blog | 1500 × 750 | Proporção Medium/Twitter OG |
| Hero de landing page | 1400 × 900 | Desktop padrão |
| Inline section | 1200 × 800 | Section dentro de post |
| Mobile preview | 390 × 844 | Responsive showcase (iPhone 14) |
| Tablet preview | 1024 × 768 | iPad portrait |

## Protocolo

### 1. Resolver target

- URL completa? OK, navegar direto
- Path relativo (ex: `analyze-doc/index.en.html`)? converter pra `https://felvieira.github.io/...` se já tiver Pages, ou `file://` se for local (file:// pode estar bloqueado no Playwright MCP — usar Pages quando possível)
- Pedido inclui `#anchor`? incluir na URL pra scroll automático

### 2. Configurar viewport

```ts
mcp__plugin_playwright_playwright__browser_resize({ width: 1400, height: 900 })
```

Ou viewport específico do destino (ver tabela acima).

### 3. Navegar

```ts
mcp__plugin_playwright_playwright__browser_navigate({ url: "https://..." })
```

### 4. Lidar com cookie banner / overlay (se aparecer)

Se site é público com cookie banner, dispensar via `browser_evaluate` antes do shot:

```js
// Remove common cookie banner selectors
document.querySelectorAll('[id*="cookie"],[class*="cookie-banner"],[class*="consent"]')
  .forEach(el => el.remove());
```

### 5. Aguardar render (se necessário)

Pra páginas com lazy-load ou animação inicial, esperar 1-2s antes do shot:

```ts
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => new Promise(r => setTimeout(r, 1500))"
})
```

### 6. Tirar screenshot

```ts
mcp__plugin_playwright_playwright__browser_take_screenshot({
  filename: "D:/Repos/blog/assets/images/{slug}-{N}.png",
  type: "png",
  fullPage: false  // ou true conforme decisão
})
```

### 7. Verificar tamanho do arquivo

```bash
ls -la D:/Repos/blog/assets/images/{slug}-{N}.png
```

Esperado: 50KB-300KB pra PNG dark mode comum. Se >1MB, considerar converter pra JPEG ou
crop específico de elemento.

## Naming convention

Para integração com skill 41:

```
assets/images/{slug}-cover.png         ← cover do post
assets/images/{slug}-1.png             ← primeiro inline
assets/images/{slug}-2.png             ← segundo inline
assets/images/{slug}-mobile.png        ← (opcional) mobile preview
```

Slug deve bater com o slug do post (`YYYY-MM-DD-{slug}.html` em `posts/`).

## Entradas Esperadas

- URL ou descrição do que capturar
- (opcional) viewport custom
- (opcional) full-page vs viewport vs element
- (opcional) destino do arquivo

## Saídas Esperadas

- Arquivo PNG/JPG salvo
- Path retornado pra skill 41 usar no `<img>` do post
- Largura/altura informados

## Anti-padrões

| Anti-padrão | Realidade |
|---|---|
| Tirar fullPage de página muito longa | Vira 8MB. Quebra OG. Sempre fazer crops específicos. |
| Esquecer de fechar cookie banner | Cobertura do screenshot, vergonha pública. Sempre limpar antes. |
| Hardcode viewport mobile pra cover | Cover precisa 16:9 ou 2:1. Mobile só pra mostrar responsividade. |
| Capturar sem aguardar fonts | Fonts não carregadas geram FOUT no print. Aguardar 1s mínimo. |
| Screenshot direto sem resize | Default do Playwright é 1280×720. Pra cover de blog, ajustar pra 1500×750. |

## Composição com outras skills

- **Skill 41 (blog-publisher)** — invoca esta skill quando o post é sobre algo navegável
- **Skill 17 (image-generator)** — alternativa pra imagens conceituais (não navegáveis)

## Evidência de Conclusão

- [ ] Arquivo PNG/JPG existe no path esperado
- [ ] Tamanho razoável (50KB-500KB típico)
- [ ] Dimensões batem com viewport solicitado
- [ ] Sem cookie banners ou overlays no screenshot
- [ ] Path retornado pra caller

## Cross-references

- `skills/41-blog-publisher/SKILL.md` — invoca esta skill
- `skills/17-image-generator/SKILL.md` — alternativa de geração (não captura)
- Playwright MCP — built-in no Claude Code via plugin
- `D:/Repos/blog/assets/images/` — destino padrão das capturas pra blog
