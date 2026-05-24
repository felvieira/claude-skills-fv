# Pattern: Submodule-backed skills

Como manter skills do kit em sync com docs upstream sem trabalho manual recorrente. Pattern absorvido de [antfu/skills](https://github.com/antfu/skills) (MIT).

## TL;DR

- Cada skill que depende de docs externas pode declarar um git submodule shallow apontando pro repo upstream (ex: `anthropics/anthropic-cookbook`).
- Sync via `git submodule update --remote --depth=1` — uma linha, atualiza tudo.
- **Opt-in por padrao**: install normal do kit ignora submodules. Quem quer sync inicializa explicito.
- Atribuicao fica no `.gitmodules` (URL upstream visivel) e na propria SKILL.md.

## Problema

Skills que falam sobre tecnologia externa (Anthropic Claude API, React, Next.js, Semgrep) ficam stale assim que o upstream muda. Exemplos:

- Skill 25 (ai-integration-architect) menciona "Anthropic Claude API" mas nao tem como saber se a SDK mudou de `anthropic.completions.create` pra `anthropic.messages.create`.
- Skill 04 (frontend-integration) descreve React patterns que podem virar obsoletos com novas versoes (ex: Server Components).
- Skill 34 (static-analysis) menciona regras Semgrep que evoluem semanalmente no upstream.

Atualizar manualmente e custoso e propenso a esquecimento. Resultado: skill mente sutilmente.

## Pattern observado em antfu/skills

O repo [antfu/skills](https://github.com/antfu/skills) (5k stars) resolve isso com submodules. Estrutura:

```
skills/
  vue/
    SKILL.md
    sources/
      vuejs-docs/     ← submodule git shallow pointing vuejs/docs
  vite/
    SKILL.md
    sources/
      vitejs-vite/    ← submodule git shallow pointing vitejs/vite
```

Skill referencia exemplos via path relativo (`./sources/vuejs-docs/src/guide/...`). README do antfu/skills explica como inicializar.

## Implementacao no kit

Estrutura proposta (piloto na skill 25):

```
skills/
  25-ai-integration-architect/
    SKILL.md
    sources/
      anthropic-cookbook/   ← submodule git shallow (opt-in)
      .gitkeep              ← garante pasta exista sem submodule init
```

O `.gitkeep` evita que `sources/` desapareca em users que clonam sem `--recurse-submodules`. O submodule fica declarado em `.gitmodules` na raiz do repo:

```ini
[submodule "skills/25-ai-integration-architect/sources/anthropic-cookbook"]
    path = skills/25-ai-integration-architect/sources/anthropic-cookbook
    url = https://github.com/anthropics/anthropic-cookbook.git
    shallow = true
```

## Como ativar (user final)

Por padrao o submodule nao e inicializado. Pra ativar:

```bash
# Inicializa um submodule especifico
git submodule init skills/25-ai-integration-architect/sources/anthropic-cookbook

# Faz o clone shallow do upstream (economiza ~100MB)
git submodule update --remote --depth=1
```

Ou, pra inicializar todos os submodules de uma vez:

```bash
git submodule update --init --recursive --depth=1
```

## Como referenciar dentro da SKILL.md

Use path relativo a partir da skill:

```markdown
Exemplo canonico de tool use:
[anthropic_api/tool_use.ipynb](./sources/anthropic-cookbook/anthropic_api/tool_use.ipynb)
```

Quando o submodule nao foi inicializado, o link aponta pra pasta vazia. Por isso a referencia deve sempre incluir fallback claro:

> Se nao ver o conteudo, rode `git submodule init && git submodule update --remote` neste path, ou consulte o arquivo direto em https://github.com/anthropics/anthropic-cookbook/blob/main/anthropic_api/tool_use.ipynb.

## Como atualizar (manter em sync)

```bash
# Atualiza um submodule especifico pro HEAD do upstream
git submodule update --remote skills/25-ai-integration-architect/sources/anthropic-cookbook

# Commita o novo SHA pinado
git add .gitmodules skills/25-ai-integration-architect/sources/anthropic-cookbook
git commit -m "chore: bump anthropic-cookbook submodule"
```

O git registra o SHA exato do upstream em cada commit do kit. Reverter e trivial.

## Vantagens

- **Sync automatico opt-in**: quem quer docs frescas roda uma linha.
- **Atribuicao clara**: URL upstream visivel no `.gitmodules` + SKILL.md.
- **Version pinning**: cada commit do kit trava um SHA do upstream. Reproducivel.
- **Sem duplicacao**: nao copiamos conteudo do upstream, apenas referenciamos.
- **Auditoria barata**: `git log` no submodule mostra exatamente o que mudou desde o ultimo bump.

## Custos

- **Install padrao precisa ignorar submodule**: default = nao init. User decide.
- **Quem ativa paga clone**: anthropic-cookbook tem ~100MB. Shallow (`--depth=1`) ajuda, mas ainda e clone real.
- **Tooling de install do kit precisa documentar**: se algum script de bootstrap roda `git submodule update --init`, ele vai puxar tudo. Manter init opt-in nos installers.
- **Manutencao de bumps**: alguem precisa rodar `git submodule update --remote` periodicamente. Pode virar GitHub Action mensal.

## Por que NAO ativar por padrao

Tradeoff entre frescor das docs e tempo/espaco de install. Maioria dos users do kit nao precisa dos exemplos do cookbook em disco — basta o link upstream. Quem precisa (subagent que vai gerar codigo Anthropic novo, ou auditor que quer comparar com pattern oficial) ativa quando precisa. Default = opt-in.

## Replicar pra outras skills

Candidatos imediatos (skills do kit que ganhariam com submodule upstream):

| Skill | Upstream sugerido | Justificativa |
|---|---|---|
| 03 (backend-api) | [expressjs/express](https://github.com/expressjs/express) ou [fastify/fastify](https://github.com/fastify/fastify) | Patterns de middleware, error handling, validacao |
| 04 (frontend-integration) | [reactjs/react.dev](https://github.com/reactjs/react.dev) ou [vuejs/docs](https://github.com/vuejs/docs) | Server Components, hooks novos, suspense patterns |
| 14 (seo-specialist) | [vercel/next.js](https://github.com/vercel/next.js) (subpath /docs) | Metadata API, sitemap generation, robots.txt |
| 22 (accessibility-specialist) | [w3c/wcag](https://github.com/w3c/wcag) | Texto oficial WCAG 2.x, exemplos canonicos |
| 34 (static-analysis) | [semgrep/semgrep-rules](https://github.com/semgrep/semgrep-rules) ou [github/codeql](https://github.com/github/codeql) | Regras oficiais sempre frescas |

Cada um seguiria a mesma estrutura: `skills/<n>-<nome>/sources/<repo>/` + entry em `.gitmodules` + secao curta na SKILL.md explicando como ativar.

## Fontes

- [antfu/skills](https://github.com/antfu/skills) — MIT, origem do pattern observado
- [Git docs: submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules) — referencia canonica de `git submodule`
- [GitHub docs: working with submodules](https://github.blog/2016-02-01-working-with-submodules/) — guia pratico
