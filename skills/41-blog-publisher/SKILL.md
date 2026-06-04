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

> **Compositora AUTORAL.** Recebe input (link/texto/assunto) → lê fonte → pesquisa contexto adicional → produz post 100% ORIGINAL e AUTORAL em **PT-BR por default** → publica no GitHub Pages → retorna URL.

## Princípio fundador — AUTORAL, NÃO ADAPTAÇÃO

Esta skill **nunca** copia, traduz, nem se apresenta como adaptação de uma fonte. O post final deve soar como se o autor do blog (o dono do repo) tivesse escrito do zero, com conhecimento próprio. Ela:

1. **Lê a fonte completa** (URL via WebFetch, texto colado, ou assunto livre) — a fonte é insumo de pesquisa, não um texto a ser creditado
2. **Identifica os pontos centrais** que a fonte cobre
3. **Pesquisa contexto adicional** (3+ fontes externas relacionadas — docs oficiais, repos, papers)
4. **Escreve um post AUTORAL** com voz própria, em primeira pessoa quando fizer sentido:
   - Afirma os pontos com palavras próprias, como conhecimento do autor
   - Adiciona o que a fonte NÃO cobriu
   - Adiciona links externos técnicos com contexto extra
   - Conecta com o domínio do autor (kit, ferramentas, opiniões reais)
5. **Default sempre PT-BR** — mesmo se a fonte for em outra língua. Só outra língua se pedido explícito.

### REGRA DE ABSTRAÇÃO DE FONTE (crítico — nenhum vínculo ao texto-fonte)

O post **NÃO PODE** revelar que é baseado em outro texto. Aplique:

- ❌ **NUNCA** escreva "o autor", "o texto diz", "o post original", "a newsletter aponta", "segundo {nome de quem escreveu a fonte}", "como {fulano} mostra" quando {fulano} é apenas **quem escreveu a fonte**. Vire afirmação direta e autoral. Ex: "como Neo Kim aponta, X" → "X".
- ❌ **NUNCA** inclua footer "Fonte original", parágrafo "adaptação enriquecida/tradução de", "Inspirado em...", "Crédito a...", "Post N/15 da série", ou link pra newsletter/artigo-fonte.
- ❌ **ABSTRAIA** qualquer coisa pessoal do autor da fonte que não pertence ao assunto: plugs de "meu canal", "meu curso", "meu livro", "assine a newsletter", recomendação do trabalho/YouTube/produto da pessoa que escreveu o original. Isso SOME.
- ✅ **MANTENHA** nomes APENAS quando a pessoa é fonte técnica **verificável e independente** do conceito: autor de um paper citado, criador de um framework/modelo/empresa (ex: "o paper de Lewis et al. (2020) introduziu RAG", "DeepSeek-R1 usa GRPO", "a Anthropic definiu esses patterns"). Na **DÚVIDA, abstraia** (remove o nome, afirma direto).
- ✅ **MANTENHA** links técnicos úteis (arxiv, docs oficiais, repos, ferramentas reais) — só tire os que são plug pessoal do autor da fonte.
- ✅ **MANTENHA** referências ao trabalho do PRÓPRIO autor do blog (Dev Team Kit, benchmarks próprios, ferramentas dele) — isso é voz autoral legítima.

Critério-mestre: *"essa menção é um fato do assunto, ou é um vínculo ao texto-fonte / à pessoa que o escreveu?"* — Fato do assunto fica; vínculo à fonte some.

> **Anti-padrão:** creditar a fonte, copiar/traduzir verbatim, ou deixar pistas de que é adaptação. O post é AUTORAL.

## Governança Global

Esta skill segue `GLOBAL.md`, `policies/anti-ai-writing.md`, `policies/handoffs.md` e
`policies/tool-safety.md`. Composta sobre skills 13 (marketing-copy), 17 (image-generator),
26 (prompt-engineer) e 42 (blog-screenshot).

## Quando Usar

- Usuário pede "publica post sobre X", "escreve blog post de Y", "gera post no meu blog"
- Usuário fornece um link/URL e diz "cria post baseado nisso"
- Usuário cola um texto e diz "vira post"
- Usuário menciona "publicar no meu blog" / "publicar post"

## Protocolo de input (3 modos)

| Input | Ação |
|---|---|
| URL | WebFetch o conteúdo → extrair pontos centrais → pesquisar contexto adicional → escrever post novo |
| Texto colado | Identificar pontos centrais → pesquisar contexto adicional → escrever post novo (não copiar) |
| Assunto livre | Pesquisar 3+ fontes do assunto → escrever post com voz própria |

Em qualquer caso, **sempre PT-BR por default**.

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

**Em AMBOS os casos, aplicar a REGRA DE ABSTRAÇÃO DE FONTE** (ver Princípio fundador): zero footer "Fonte original", zero parágrafo de atribuição, zero "segundo {autor da fonte}". O post sai autoral.

Salvar como arquivo temporário: `{blog_repo_path}/.tmp-body-{slug}.html`

### 3. Decidir geração de imagens (decision tree)

```
Post fala sobre URL/site/dashboard navegável? 
├── SIM → Skill 42 (blog-screenshot) gera prints reais
└── NÃO → Skill 17 (image-generator) gera via fal.ai
            ├── default model: flux-2-flash ($0.005/MP ≈ $0.002-0.012/img) — text-to-image
            ├── 1 cover image obrigatória (1500×750)
            └── inline images opcionais conforme o post
```

**Cover image (OBRIGATÓRIA + VISÍVEL):**
- Sempre gerada (ou screenshot do primeiro elemento se for sobre algo navegável)
- Salva em `{blog_repo_path}/assets/images/{slug}-cover.{png|jpg}`
- **Aparece em 2 lugares:** (a) `<meta og:image>` pro share social — automático via `{{COVER_IMAGE_URL}}`; (b) **`<img>` visível no body do post** — automático via `{{COVER_IMG_TAG}}` (inserido logo abaixo do `<h1>` e meta, antes do `<article>`)
- Passa `--cover=assets/images/{slug}-cover.jpg` pro `new-post.mjs`. Sem esse arg, o body fica sem cover visível (anti-padrão).

**Inline images (OBRIGATÓRIAS pra posts >1000 palavras):**
- Mínimo 2-3 imagens inline distribuídas nas seções principais
- **Não opcional** — texto longo sem quebra visual perde o leitor
- Salvar como `{slug}-N-{seção}.jpg` (ex: `top-1-claude-code-1-claudemd.jpg`)
- Referenciadas no body HTML como:
  ```html
  <p><img src="../assets/images/{slug}-N-{tema}.jpg" alt="descrição acessível"></p>
  ```
- Inserir **antes** do `<h3>` da seção correspondente (não depois)
- Prompts pras imagens devem ser **distintas** umas das outras — não gerar 3 covers parecidas

**Posts curtos (<1000 palavras):** só cover é OK, inline pode pular.

### 3.5. Escrever o bloco de compartilhamento LinkedIn (OBRIGATÓRIO)

Todo post termina com um bloco que facilita o repost no LinkedIn. São dois textos:

- **`--share-hook`**: hook curto (1-2 frases) com **TOM DE MISTÉRIO/curiosidade** sobre o que o post revela — faz a pessoa QUERER ler, sem entregar a resposta. Aparece VISÍVEL na página. Ex: *"Todo LLM que você usou já mentiu pra você com confiança. Existe um padrão que resolve isso — e quase ninguém implementa direito."*
- **`--linkedin`**: o texto PRONTO pra colar no LinkedIn (o botão copia). Formato: hook de abertura forte + 2-3 linhas (com quebras de linha reais) do que a pessoa vai aprender + 1 linha de CTA + 3-5 hashtags relevantes. **NÃO cite fonte/autor.** A URL do post é anexada automaticamente pelo script — não precisa incluir.

Ambos em PT-BR (ou a língua do post). Tom: profissional mas com a curiosidade misteriosa. Aplicar anti-ai-writing (sem hype vazio).

O template do blog já tem o markup (`.share-block` + botão copiar + `share.js`). A skill só fornece os dois textos via args.

### 4. Invocar scaffold

```bash
cd {blog_repo_path} && node scripts/new-post.mjs \
  --slug={slug} \
  --title="{title}" \
  --lang={lang} \
  --excerpt="{excerpt}" \
  --cover=assets/images/{slug}-cover.png \
  --share-hook="{hook misterioso de 1-2 frases}" \
  --linkedin="{texto pronto pro LinkedIn com hashtags}" \
  --body=.tmp-body-{slug}.html
```

> Se `--share-hook`/`--linkedin` forem omitidos, o script cai pro excerpt como fallback — mas o ideal é SEMPRE fornecer os dois, com o hook misterioso próprio.

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
| Post sobre código/abstrato (text-to-image) | Skill 17 (fal.ai) | `flux-2-flash` (default) |
| Editar/refinar imagem existente (com referência) | Skill 17 | `gemini-25-flash` ($0.039/img) |
| Post premium / hero importante | Skill 17 | `gemini-3-pro` ($0.15) |
| Tipografia/layout específicos | Skill 17 | `gpt-image-1.5` |

Default: **`flux-2-flash` $0.005/MP (≈ $0.002-0.012/img)** — modelo mais barato pra
text-to-image, ~4-10x mais barato que as alternativas, realismo decente, ótimo pra
escala. Para **editar** imagem (refine/inpaint com referência), usar `gemini-25-flash`.
Segue a regra canônica de geração de imagem do `GLOBAL.md`.

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
| Creditar a fonte / footer "Fonte original" / "segundo {autor}" | Quebra o princípio AUTORAL. O post é do dono do blog. Ver REGRA DE ABSTRAÇÃO DE FONTE. |
| Publicar sem o bloco LinkedIn (`--share-hook`/`--linkedin`) | Perde o gancho de distribuição. Todo post deve facilitar o repost. |

## Composição com outras skills

- **Skill 13 (Marketing Copy)** — pra textos de assunto curto, define voz/CTA
- **Skill 17 (Image Generator)** — fal.ai pra cover + inline images
- **Skill 26 (Prompt Engineer)** — escrever prompt da imagem (não pedir genérico)
- **Skill 42 (Blog Screenshot)** — Playwright pra prints de URLs reais
- **Policy anti-ai-writing.md** — sweep dos 29 padrões antes de finalizar

## Evidência de Conclusão

- [ ] Arquivo `posts/YYYY-MM-DD-{slug}.html` existe e é HTML válido
- [ ] Cover image em `assets/images/{slug}-cover.*` existe
- [ ] **Zero atribuição de fonte** no post (sem "Fonte original", sem "segundo {autor}", sem link pra newsletter) — `grep -iE "fonte original|adaptaç" {post}` retorna vazio
- [ ] **Bloco LinkedIn presente** (`.share-block` com hook misterioso + texto copiável)
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
