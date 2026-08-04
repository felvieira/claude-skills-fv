# Blog Publisher — Guia Estendido (Skill 41)

## REGRA DE ABSTRAÇÃO DE FONTE (detalhes)

O post não pode revelar que é baseado em outro texto. Regras de aplicação:

- **NUNCA** escreva "o autor", "o texto diz", "o post original", "a newsletter aponta", "segundo {quem escreveu a fonte}", "como {fulano} mostra" quando {fulano} é quem escreveu a fonte. Vire afirmação direta. Ex: "como Neo Kim aponta, X" → "X".
- **NUNCA** inclua footer "Fonte original", parágrafo "adaptação enriquecida/tradução de", "Inspirado em...", "Crédito a...", "Post N/15 da série", ou link pra newsletter/artigo-fonte.
- **ABSTRAIA** qualquer coisa pessoal do autor da fonte que não pertence ao assunto: plugs de "meu canal", "meu curso", "meu livro", "assine a newsletter", recomendação do trabalho/YouTube/produto de quem escreveu o original.
- **MANTENHA** nomes apenas quando a pessoa é fonte técnica verificável e independente do conceito: autor de paper citado, criador de framework/modelo/empresa. Ex: "o paper de Lewis et al. (2020) introduziu RAG", "DeepSeek-R1 usa GRPO". Na dúvida, abstraia.
- **MANTENHA** links técnicos úteis (arxiv, docs oficiais, repos, ferramentas reais). Tire só os que são plug pessoal do autor da fonte.
- **MANTENHA** referências ao trabalho do próprio autor do blog (Dev Team Kit, benchmarks próprios, ferramentas dele).

Critério-mestre: *"essa menção é um fato do assunto, ou é um vínculo ao texto-fonte / à pessoa que o escreveu?"* — Fato do assunto fica; vínculo some.

## Setup para novos usuários (open source) — passo a passo humano

> O kit é open source. **A skill nunca publica no blog do felvieira para outra pessoa** —
> ela resolve o repo destino dinamicamente via `~/.dev-team-kit/blog-config.json`. Cada
> usuário aponta para o próprio blog. Se o config não existir, a skill pausa e pede este setup.

**Pré-requisitos:** Node.js, `git`, e a [GitHub CLI (`gh`)](https://cli.github.com/) autenticada
(`gh auth login`). Uma conta GitHub própria.

**Passo 1 — Rodar o init script** (uma vez, na sua máquina):

```bash
node /caminho/para/claude-skills-fv/scripts/init-blog-repo.mjs \
  --path=/caminho/onde/quer/o/blog \
  --user=SEU_USUARIO_GITHUB \
  --repo=blog \
  --create-github
```

- `--path` — onde o repo do blog vai viver localmente (ex: `~/Repos/blog` ou `D:/Repos/blog`).
- `--user` — **seu** username do GitHub (vira `SEU_USUARIO.github.io/blog` e preenche os templates).
- `--repo` — nome do repo (default `blog`).
- `--create-github` — cria o repo no GitHub e habilita Pages automaticamente. Omita se quiser
  criar o repo manualmente depois.

**O que o script faz:**
1. Cria o diretório e copia os templates de `templates/blog/*` (substituindo `{{GITHUB_USER}}`/`{{BLOG_REPO}}` pelos SEUS dados).
2. `git init` no destino.
3. Escreve `~/.dev-team-kit/blog-config.json` com os seus paths/URL.
4. (com `--create-github`) `gh repo create` público + habilita GitHub Pages na branch `main`.
5. Commit inicial.

**Passo 2 — Chaves necessárias:**
- `FAL_AI_API_KEY` no ambiente (para gerar imagens via fal.ai). Sem ela, a skill avisa e você
  pode publicar sem imagem ou configurar a chave. Ver `GLOBAL.md` para onde a chave é lida.
- `gh` já autenticado cobre o push (não precisa de PAT manual).

**Passo 3 — Usar:** dali em diante, é só pedir ao Claude *"publica um post sobre X"*. A skill 41
lê o SEU config, escreve no SEU repo, faz push e retorna a SUA URL pública. Nenhuma configuração
adicional por post.

> Trocar de blog / reconfigurar: rode o init de novo com outro `--path`/`--user`, ou edite
> `~/.dev-team-kit/blog-config.json` à mão. Override pontual via env `DEVKIT_BLOG_CONFIG=/outro/config.json`.

## Multi-user — resolução do repo destino

A skill lê `~/.dev-team-kit/blog-config.json` (override via env `DEVKIT_BLOG_CONFIG`):

```json
{
  "github_user":    "<user>",
  "blog_repo":      "blog",
  "blog_repo_path": "/abs/path/to/blog/repo",
  "pages_url":      "https://<user>.github.io/blog"
}
```

### Primeira invocação (config não existe)

Pausar e instruir o usuário a rodar:

```bash
node /caminho/para/claude-skills-fv/scripts/init-blog-repo.mjs \
  --path=/abs/path/to/blog \
  --user=<github-username> \
  --repo=blog \
  --create-github
```

O script: cria diretório + copia templates de `templates/blog/`, substitui `{{GITHUB_USER}}` e `{{BLOG_REPO}}`, faz `git init`, salva o config, cria repo no GitHub via `gh` (se `--create-github`) e faz commit inicial.

### Estrutura conhecida do repo destino

```
blog/
├── index.html              ← landing com lista de posts (auto-updated)
├── posts/
│   └── YYYY-MM-DD-slug.html
├── assets/
│   ├── css/post.css
│   └── images/
├── TEMPLATE.html
└── scripts/
    ├── new-post.mjs
    └── update-index.mjs
```

## Matriz de decisão de imagens

| Cenário | Provider | Modelo |
|---|---|---|
| Post sobre URL existente | Skill 42 (Playwright) | screenshot 1400×900 |
| Post sobre código/abstrato (text-to-image) | Skill 17 (fal.ai) | `flux-2-flash` |
| Editar/refinar imagem com referência | Skill 17 | `gemini-25-flash` ($0.039/img) |
| Post premium / hero importante | Skill 17 | `gemini-3-pro` ($0.15) |
| Tipografia/layout específicos | Skill 17 | `gpt-image-1.5` |

Default text-to-image: `flux-2-flash` ($0.005/MP). Para editar imagem com referência: `gemini-25-flash`.

## Bloco LinkedIn — formato

- **`--share-hook`**: hook 1-2 frases com tom de mistério/curiosidade — faz a pessoa querer ler sem entregar a resposta. Ex: *"Todo LLM que você usou já mentiu pra você com confiança. Existe um padrão que resolve isso — e quase ninguém implementa direito."*
- **`--linkedin`**: texto pronto pra colar. Formato: hook forte + 2-3 linhas do que a pessoa aprende (com quebras reais) + CTA + 3-5 hashtags. Não citar fonte/autor. URL do post é anexada automaticamente pelo script.

## Anti-Rationalization

| Racionalização | Realidade |
|---|---|
| "Gera só texto, imagens depois" | Cover é obrigatória pra OG. Sempre gerar 1. |
| "Tom storytelling vende mais" | Sem evidência. Direto + números converte melhor pra dev audience. |
| "Pode ignorar anti-ai-writing num post pequeno" | Padrões aparecem mais visíveis em textos curtos. |
| "Skip o update-index, eu commito manual" | Quebra o invariante do repo. Sempre rodar o script. |
