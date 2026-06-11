---
name: 41-blog-publisher
description: |
  Skill compositora que pega texto/assunto e gera post de blog HTML completo no repo
  configurado em ~/.dev-team-kit/blog-config.json, com imagens (via skill 17 fal.ai ou
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

> **Compositora AUTORAL.** Recebe input (link/texto/assunto), pesquisa contexto adicional, produz post 100% original em PT-BR por default, publica no GitHub Pages, retorna URL.

## Princípio fundador — AUTORAL, NÃO ADAPTAÇÃO

Esta skill nunca copia, traduz nem se apresenta como adaptação de uma fonte. O post soa como se o dono do blog tivesse escrito do zero. Fluxo:

1. Lê a fonte completa (insumo de pesquisa, não texto a creditar)
2. Identifica os pontos centrais
3. Pesquisa 3+ fontes externas relacionadas
4. Escreve com voz própria, adicionando o que a fonte não cobriu
5. PT-BR por default; outro idioma só se pedido explicitamente

Para regras detalhadas de abstração de fonte, consulte `docs/skill-guides/blog-publisher.md`.

> Anti-padrão: creditar a fonte, copiar verbatim, ou deixar qualquer pista de adaptação.

## Governança Global

Segue `GLOBAL.md`, `policies/anti-ai-writing.md`, `policies/handoffs.md` e `policies/tool-safety.md`. Composta sobre skills 13, 17, 26 e 42.

## Quando Usar

- Usuário pede "publica post sobre X" ou "escreve blog post de Y"
- Usuário fornece URL e diz "cria post baseado nisso"
- Usuário cola texto e diz "vira post"

## Quando Não Usar

- Para escrever só o texto sem publicar — usar skill 13 diretamente
- Para postar no Medium/Dev.to/LinkedIn — esta skill publica apenas no repo blog próprio
- Para editar post existente — usar Edit tool no arquivo HTML

## Entradas Esperadas

- Texto livre, URL ou assunto (curto ou longo)
- (opcional) idioma alvo (pt-BR / en), tom (técnico / storytelling), URLs para screenshot

## Saídas Esperadas

- `{blog_repo_path}/posts/YYYY-MM-DD-{slug}.html` com HTML válido
- 1+ imagens em `{blog_repo_path}/assets/images/`
- Commit + push no repo blog
- `index.html` e `README.md` atualizados via `update-index.mjs`
- URL pública retornada ao usuário

## Protocolo (ordem fixa)

### 1. Capturar input e classificar

Identificar: tipo de input (texto vs assunto curto), idioma, tom, se há URL navegável para screenshot, e slug (kebab-case, max 50 chars, sem acentos).

Se config `~/.dev-team-kit/blog-config.json` não existe, pausar e instruir o usuário a rodar `scripts/init-blog-repo.mjs`. Ver detalhes em `docs/skill-guides/blog-publisher.md`.

### 2. Escrever o post (corpo HTML)

Para assunto curto: invocar skill 13 para voz/tom, escrever seguindo estrutura hook → contexto → ponto principal → exemplo → CTA, aplicar `policies/anti-ai-writing.md`.

Para texto pronto: converter para HTML semântico, aplicar policy anti-ai-writing como sweep (não reescrever).

Em ambos os casos: zero atribuição de fonte, zero "Fonte original", zero "segundo {autor da fonte}".

Salvar em `{blog_repo_path}/.tmp-body-{slug}.html`.

### 3. Imagens

- URL/dashboard navegável: Skill 42 (screenshots Playwright)
- Texto/abstrato: Skill 17 com `flux-2-flash` (default text-to-image)
- Cover obrigatória (1500×750), salva em `assets/images/{slug}-cover.{png|jpg}`
- Posts >1000 palavras: mínimo 2-3 imagens inline distribuídas nas seções

Para matriz completa de modelos e custos, ver `docs/skill-guides/blog-publisher.md`.

### 3.5. Bloco LinkedIn (OBRIGATÓRIO)

Gerar dois textos antes de invocar o scaffold:

- `--share-hook`: 1-2 frases com tom de mistério/curiosidade, sem entregar a resposta
- `--linkedin`: texto pronto para colar, com hook + aprendizados + CTA + 3-5 hashtags

Ambos em PT-BR (ou língua do post). Aplicar anti-ai-writing. Ver exemplos em `docs/skill-guides/blog-publisher.md`.

### 4. Scaffold

```bash
cd {blog_repo_path} && node scripts/new-post.mjs \
  --slug={slug} \
  --title="{title}" \
  --lang={lang} \
  --excerpt="{excerpt}" \
  --cover=assets/images/{slug}-cover.png \
  --share-hook="{hook}" \
  --linkedin="{texto linkedin}" \
  --body=.tmp-body-{slug}.html
```

### 5. Cleanup, commit e push

```bash
cd {blog_repo_path} && rm .tmp-body-{slug}.html
git add -A && git commit -m "post: {title}" && git push origin main
```

Aguardar ~30s antes de retornar URL.

### 6. Retornar URL

```
Post publicado: {pages_url}/posts/YYYY-MM-DD-{slug}.html
Index: {pages_url}/
```

## Anti-padrões

| Anti-padrão | Por que evitar |
|---|---|
| Reescrever texto pronto sem permissão | User passou texto = quer publicar aquele texto |
| Gerar 10+ imagens | Distrai leitor e gera custo desnecessário |
| Postar sem cover image | OG sharing fica feio sem cover |
| Hardcode de paths absolutos no HTML | Quebra Pages. Sempre paths relativos |
| Commit sem rodar update-index.mjs | README e index.html ficam desatualizados |
| Creditar a fonte / footer "Fonte original" | Quebra o princípio AUTORAL |
| Publicar sem bloco LinkedIn | Perde o gancho de distribuição |

## Integração com Pipeline

- **Skill 13** — voz e CTAs para assunto curto
- **Skill 17** — fal.ai para cover e inline images
- **Skill 26** — prompt da imagem
- **Skill 42** — screenshots Playwright para URLs reais
- **Policy anti-ai-writing.md** — 29 padrões antes de finalizar

## Evidência de Conclusão

- [ ] `posts/YYYY-MM-DD-{slug}.html` existe e é HTML válido
- [ ] Cover image em `assets/images/{slug}-cover.*` existe
- [ ] `grep -iE "fonte original|adaptaç" {post}` retorna vazio
- [ ] Bloco LinkedIn presente (`.share-block` com hook e texto copiável)
- [ ] `index.html` e `README.md` listam o post novo
- [ ] `git status` limpo após commit+push
- [ ] URL pública retorna HTTP 200

## Handoff

Após retornar URL, sugerir: compartilhar no LinkedIn (passar a URL), importar para Medium via `medium.com/p/import`, cross-postar para Dev.to/Hashnode.
