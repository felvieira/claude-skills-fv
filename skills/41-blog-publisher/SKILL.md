---
name: 41-blog-publisher
description: |
  Skill compositora que pega texto/assunto e gera post de blog HTML completo no repo
  {blog_repo_path} ({github_user_repo_url}), com imagens (via skill 17 fal.ai ou
  skill 42 Playwright screenshot), commit+push automático, retorna URL pública via GitHub Pages.
  Trigger em: "post no blog", "publicar post", "escrever post", "blog post", "publish blog",
  "gera post", "criar post", "novo post no meu blog".
argument-hint: "[assunto ou texto do post]"
allowed-tools: [Read, Write, Edit, Bash, Skill, mcp__plugin_playwright_playwright__browser_navigate, mcp__plugin_playwright_playwright__browser_take_screenshot, mcp__plugin_playwright_playwright__browser_resize]
version: 1.0.0
author: felvieira
compatibility: ">=2.10.2"
requires:
  - 17-image-generator
  - 42-blog-screenshot
  - 13-marketing-copy
  - 26-prompt-engineer
---

# Blog Publisher — Skill 41

> **Compositora.** Recebe texto/assunto → produz post HTML completo → publica no GitHub Pages → retorna URL.

## Governança Global

Esta skill segue `GLOBAL.md`, `policies/anti-ai-writing.md`, `policies/handoffs.md` e
`policies/tool-safety.md`. Composta sobre skills 13 (marketing-copy), 17 (image-generator),
26 (prompt-engineer) e 42 (blog-screenshot).

## Quando Usar

- Usuário pede "publica post sobre X", "escreve blog post de Y", "gera post no meu blog"
- Usuário fornece um texto longo e diz "vira post de blog"
- Usuário menciona "publicar no meu blog" / "publicar post"

## Quando NÃO Usar

- Para escrever só o texto sem publicar — usar skill 13 (marketing-copy) direto
- Para postar no Medium/Dev.to/LinkedIn — esta skill publica APENAS no repo blog próprio do usuário
- Para editar post existente — usar Edit tool direto no arquivo HTML do post

## Multi-user — resolução do repo destino

A skill **não tem repo hardcoded**. Ela lê `~/.dev-team-kit/blog-config.json`
(override via env `DEVKIT_BLOG_CONFIG`). Schema:

```json
{
  "github_user":    "<user>",
  "blog_repo":      "blog",
  "blog_repo_path": "/abs/path/to/blog/repo",
  "pages_url":      "https://<user>.github.io/blog"
}
```

### Se o arquivo de config NÃO existe (primeira invocação)

A skill **deve pausar e instruir o usuário** a rodar o init script:

```bash
node /caminho/para/claude-skills-fv/scripts/init-blog-repo.mjs \
  --path=/abs/path/to/blog \
  --user=<github-username> \
  --repo=blog \
  --create-github
```

Esse script:
1. Cria diretório + copia templates de `templates/blog/` do kit
2. Substitui `{{GITHUB_USER}}` e `{{BLOG_REPO}}` nos arquivos
3. `git init` no destino
4. Salva `~/.dev-team-kit/blog-config.json`
5. (Se `--create-github`) cria repo no GitHub via `gh` e habilita Pages
6. Faz commit inicial

Após o script rodar, a skill 41 funciona automaticamente — sem mais perguntas.

### Se já existe

Lê o config, deriva todos os paths/URLs dinamicamente:
- `blog_repo_path` → onde escrever os arquivos
- `pages_url` → URL pública pra retornar ao user
- `github_user` + `blog_repo` → preencher placeholders no HTML

Estrutura conhecida do repo destino (criada pelo init script):

```
blog/
├── index.html              ← landing com lista de posts (auto-updated)
├── posts/
│   └── YYYY-MM-DD-slug.html
├── assets/
│   ├── css/post.css        ← estilo compartilhado (não modificar)
│   └── images/             ← imagens dos posts
├── TEMPLATE.html           ← template com placeholders {{TITLE}}, {{BODY_HTML}}, etc.
└── scripts/
    ├── new-post.mjs        ← scaffolda post a partir do TEMPLATE + corpo
    └── update-index.mjs    ← regenera index.html e README após cada novo post
```

## Protocolo (ordem fixa)

### 1. Capturar input + classificar

Identifica:
- **Tipo de input**: texto pronto (>500 palavras) vs assunto curto (precisa escrever)
- **Idioma**: PT-BR (padrão) ou EN — inferir do input ou perguntar se ambíguo
- **Tom**: técnico-direto (default) ou storytelling — perguntar se ambíguo
- **Sobre algo navegável?**: se sim, screenshots via skill 42 podem ser usados
- **Slug**: gerar a partir do título (kebab-case, max 50 chars, sem acentos)

### 2. Escrever o post (corpo HTML)

Se input é assunto curto:
1. Invocar `Skill({ skill: "dev-team-kit-fv:13-marketing-copy" })` pra pegar voz/tom
2. Escrever post seguindo estrutura padrão: hook → contexto → ponto principal → exemplo → CTA
3. Aplicar `policies/anti-ai-writing.md` (29 padrões) — sem hype, sem "delve into", sem
   "comprehensive", sem em-dashes em rajada

Se input é texto pronto:
1. Converter de markdown/texto plano pra HTML semântico (`<h2>`, `<h3>`, `<p>`, `<ul>`, `<pre>`, `<code>`, `<table>`, `<blockquote>`)
2. Aplicar mesma policy anti-ai-writing pra revisar (não reescrever — só sinalizar)

Salvar como arquivo temporário: `{blog_repo_path}/.tmp-body-{slug}.html`

### 3. Decidir geração de imagens (decision tree)

```
Post fala sobre URL/site/dashboard navegável? 
├── SIM → Skill 42 (blog-screenshot) gera prints reais
└── NÃO → Skill 17 (image-generator) gera via fal.ai
            ├── default model: gemini-25-flash ($0.039/img)
            ├── 1 cover image obrigatória (1500×750)
            └── inline images opcionais conforme o post
```

**Cover image:**
- Sempre gerada (ou screenshot do primeiro elemento se for sobre algo navegável)
- Salva em `{blog_repo_path}/assets/images/{slug}-cover.{png|jpg}`
- Referenciada no template como `{{COVER_IMAGE_URL}}`

**Inline images:**
- 1-3 por post (não exagerar)
- Referenciadas no body HTML como `<img src="../assets/images/{slug}-N.{ext}" alt="..." />`

### 4. Invocar scaffold

```bash
cd {blog_repo_path} && node scripts/new-post.mjs \
  --slug={slug} \
  --title="{title}" \
  --lang={lang} \
  --excerpt="{excerpt}" \
  --cover=assets/images/{slug}-cover.png \
  --body=.tmp-body-{slug}.html
```

O script:
- Lê `TEMPLATE.html` e substitui placeholders
- Calcula reading time automaticamente
- Salva em `posts/YYYY-MM-DD-{slug}.html`
- Roda `update-index.mjs` que regenera `index.html` + bloco no `README.md`

### 5. Cleanup + commit + push

```bash
cd {blog_repo_path} && rm .tmp-body-{slug}.html
git add -A
git commit -m "post: {title}"
git push origin main
```

Aguardar GitHub Pages build (~30s) antes de retornar URL.

### 6. Retornar URL pública

```
✅ Post publicado:
{pages_url}/posts/YYYY-MM-DD-{slug}.html

Index atualizado em: {pages_url}/
Source: {github_user_repo_url}/blob/main/posts/YYYY-MM-DD-{slug}.html
```

## Decisão de imagem (matriz)

| Cenário | Provider | Modelo |
|---|---|---|
| Post sobre URL existente | Skill 42 (Playwright) | screenshot 1400×900 |
| Post sobre código/abstrato | Skill 17 (fal.ai) | `gemini-25-flash` (default) |
| Post precisa muita imagem | Skill 17 | `gpt-image-1-mini` (mais barato) |
| Post premium / hero importante | Skill 17 | `gemini-3-pro` ($0.15) |
| Tipografia/layout específicos | Skill 17 | `gpt-image-1.5` |

Default: **`gemini-25-flash` $0.039/img** — boa qualidade, custo previsível.

## Entradas Esperadas

- texto livre OU assunto (curto/longo)
- (opcional) idioma alvo (pt-BR / en)
- (opcional) tom (técnico / storytelling)
- (opcional) URLs pra screenshot

## Saídas Esperadas

- Arquivo HTML em `{blog_repo_path}/posts/YYYY-MM-DD-{slug}.html`
- 1+ imagens em `{blog_repo_path}/assets/images/`
- Commit + push no repo blog
- `index.html` e `README.md` atualizados (via `update-index.mjs`)
- URL pública retornada ao usuário

## Anti-padrões

| Anti-padrão | Por que evitar |
|---|---|
| Reescrever texto pronto sem permissão | User passou texto = quer publicar AQUELE texto, não outra versão |
| Gerar 10+ imagens | Distrai leitor + custo desnecessário. 1 cover + 1-3 inline já dá |
| Forçar tom storytelling em post técnico curto | Vira hype. Manter tom direto. |
| Postar sem cover image | OG sharing fica feio sem cover. Sempre 1 mínimo. |
| Hardcode de paths absolutos no HTML do post | Quebra Pages. Sempre paths relativos (`../assets/...`) |
| Commit sem rodar update-index.mjs antes | README e index.html ficam desatualizados |
| Esquecer de aplicar anti-ai-writing.md | Vira marketing genérico, perde credibilidade |

## Composição com outras skills

- **Skill 13 (Marketing Copy)** — pra textos de assunto curto, define voz/CTA
- **Skill 17 (Image Generator)** — fal.ai pra cover + inline images
- **Skill 26 (Prompt Engineer)** — escrever prompt da imagem (não pedir genérico)
- **Skill 42 (Blog Screenshot)** — Playwright pra prints de URLs reais
- **Policy anti-ai-writing.md** — sweep dos 29 padrões antes de finalizar

## Evidência de Conclusão

- [ ] Arquivo `posts/YYYY-MM-DD-{slug}.html` existe e é HTML válido
- [ ] Cover image em `assets/images/{slug}-cover.*` existe
- [ ] `index.html` lista o post novo
- [ ] `README.md` lista o post novo
- [ ] `git status` está clean após commit+push
- [ ] URL pública retorna HTTP 200 (validar com `curl -sI`)

## Handoff

Após retornar URL ao usuário, sugerir próximos passos opcionais:
- Compartilhar no Twitter/LinkedIn (passar a URL)
- Importar pra Medium via `medium.com/p/import` (URL funciona porque Pages serve text/html)
- Cross-postar pra Dev.to/Hashnode

## Anti-Rationalization

| Racionalização | Realidade |
|---|---|
| "Gera só texto, imagens depois" | Cover é obrigatória pra OG. Sempre gerar 1. |
| "Tom storytelling vende mais" | Sem evidência. Direto+números converte melhor pra dev audience. |
| "Pode ignorar anti-ai-writing num post pequeno" | Padrões aparecem mais visíveis em textos curtos, não menos. |
| "Skip o update-index, eu commito manual" | Quebra o invariante do repo. Sempre rodar o script. |

## Cross-references

- `skills/17-image-generator/SKILL.md` — geração via fal.ai
- `skills/42-blog-screenshot/SKILL.md` — screenshots Playwright
- `skills/13-marketing-copy/SKILL.md` — voz e CTAs
- `policies/anti-ai-writing.md` — 29 padrões a evitar
- `{blog_repo_path}/TEMPLATE.html` — template base
- `{blog_repo_path}/scripts/new-post.mjs` — scaffold
- `{blog_repo_path}/scripts/update-index.mjs` — index regenerator
