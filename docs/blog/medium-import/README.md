# Medium Import — How to use

O Medium tem um importer oficial que aceita HTML público via URL. Esses 2 arquivos HTML estão prontos pra isso.

## Passos pra publicar

⚠ **Importante:** `raw.githubusercontent.com` retorna `Content-Type: text/plain` — Medium rejeita.
Use as URLs do **GitHub Pages** abaixo (servem como `text/html` real).

1. **URLs corretas pra Medium import:**

   - 🌎 **EN:** `https://felvieira.github.io/claude-skills-fv/docs/blog/medium-import/post.en.html`
   - 🇧🇷 **PT-BR:** `https://felvieira.github.io/claude-skills-fv/docs/blog/medium-import/post.pt-BR.html`

2. **Vá em [medium.com/p/import](https://medium.com/p/import)** (Medium > três pontinhos > Import a story)

3. **Cole a URL** e clique em Import

4. **Medium converte** preservando: headings (h1/h2/h3), parágrafos, listas, tabelas, blocos de código, links, separadores (hr)

5. **Edite no Medium** se quiser: adicionar cover image, ajustar tags, escolher publicação

### Caso o Pages ainda não tenha buildado

Primeiro build leva 1–2 min. Verifica status em:
`https://github.com/felvieira/claude-skills-fv/actions` (workflow "pages build and deployment").

Quando aparecer ✅ verde, as URLs acima funcionam.

### Plan B — Copy-paste manual

Se ainda assim der problema:
1. Abre o arquivo HTML local no browser (Chrome/Edge)
2. `Ctrl+A` (seleciona tudo) → `Ctrl+C` (copia rich-text formatado)
3. Vai pro Medium > New Story > cola direto no editor
4. Medium aceita o rich-text e mantém formatação

## O que o Medium preserva bem

- `<h1>` vira título
- `<h2>` vira heading grande
- `<h3>` vira heading médio
- `<p>` vira parágrafo
- `<ul><li>` vira lista
- `<table>` vira tabela (Medium renderiza bem!)
- `<pre><code>` vira code block (com syntax highlight automático)
- `<hr>` vira divider
- `<strong>`/`<em>` viram negrito/itálico
- `<a href>` vira link

## O que o Medium ignora ou normaliza

- CSS inline (joga fora — Medium tem seu próprio styling)
- Classes (ignoradas)
- `<div>` (achatado)
- `<span>` (ignorado)

## Cover image sugerida

Tira screenshot da tabela "Wave 2" do `analyze-doc/index.en.html` (todas as 8 skills passaram com delta verde) e usa como cover. 1500×750 pra ficar nítido em mobile.

## Tags sugeridas pro Medium

`claude-code`, `ai-coding`, `llm`, `developer-tools`, `evaluation`, `benchmark`, `apache-2-0`, `open-source`

## Publicação cruzada (LinkedIn / Dev.to)

- **Dev.to:** aceita markdown — usa os arquivos `.md` originais em `docs/blog/`
- **LinkedIn Articles:** cola o HTML manualmente (não tem import) — o conteúdo dos `.html` cola limpo
- **Hashnode:** import via URL igual ao Medium

## Source of truth

Markdown originais em `docs/blog/2026-05-23-we-tested-our-ai-coding-kit.{en,pt-BR}.md`. HTMLs aqui são versões equivalentes pra import.
