# 24 Ferramentas pro Claude Code: O Que Realmente Vale Instalar (Review Honesto)

**TL;DR:** Apareceu no LinkedIn uma lista com 24 ferramentas "essenciais" pro Claude Code. Abri os 24 repos, comparei com o que já existe no Dev Team Kit, marquei o que vale, o que ignorar e o que tomar cuidado. **9 valem alguma coisa, 15 são ruído ou user-side.** Os números de stars do post original tinham erros (alguns inflados, alguns subestimados — vou trazer os reais). Esse texto é o que eu mandaria pra um colega me perguntando "instalo ou não?".

---

## Por que esse review

Listas curadas em LinkedIn não dizem o que importa: **qual o overlap com o que você já tem, qual a license, quem mantém, e quando vale o custo de instalação**. Esse texto cobre os 24 itens da [lista original](https://www.linkedin.com/), agrupados por categoria, com veredito objetivo.

Antes de ler: eu mantenho o [Dev Team Kit](https://github.com/felvieira/claude-skills-fv) (42 skills + 15 subagents + 32 commands + 19 hooks). Tenho bias — mas o bias é a favor de **menos ferramenta, melhor curada**. Quando algo da lista melhora o kit, eu absorvo. Quando duplica, eu ignoro.

---

## Como li cada repo

1. Resolvi os shortlinks `lnkd.in/*` pra owner real no GitHub
2. Conferi via `gh repo view`: stars, license, push date, primary language
3. Li README + estrutura de pasta de todos os 24
4. Comparei com o que o kit já cobre
5. Veredito honesto

Nada disso é hipotético — está tudo commitado em `docs/blog/honest-review-24-tools.workings.md` (não publicado, é meu rascunho).

---

## Os 9 que valem (em ordem de utilidade)

### 1. `anthropics/skills/frontend-design` — ABSORVA o pattern

**Repo:** `anthropics/skills`, subdir `skills/frontend-design`
**Stars:** 139k (repo-mãe), license própria
**O que faz:** uma SKILL.md de 60 linhas que ensina o agente a escolher uma direção estética **antes** de codar UI.

Lista 11 âncoras estéticas (brutalist, editorial, retro-futuristic, organic, luxury, playful, etc.) e força a escolher uma. Bane fontes genéricas (Inter, Roboto, Arial, Space Grotesk) e gradientes clichê (roxo no branco).

**Por que vale:** é o motivo de 90% das UIs geradas por IA parecerem iguais. Sem direção estética, o modelo cai no default. Com direção, ele se compromete.

**O que fiz:** já absorvi no `dev-team-kit-fv` skill 02 (ui-ux-design). Adicionei as 11 âncoras, removi `Inter` como default dos design tokens, e atribuí a fonte.

### 2. `blader/humanizer` — JÁ ABSORVIDO

**Stars:** 21k · MIT · `D:` push abril/2026
**O que faz:** remove tells de IA de qualquer texto. Baseado direto no verbete Wikipedia "Signs of AI writing".

Diferencial: tem uma seção **Voice Calibration** (pede ao user uma amostra do próprio writing antes de reescrever) e uma seção **Personality and Soul** que combate o oposto do AI slop — texto limpo mas sem alma.

**Por que vale:** AI slop não é só palavra-chave ("delve", "tapestry") — é estrutura sem opinião, frases todas do mesmo tamanho, sem primeira pessoa. O `humanizer` resolve os dois.

**O que fiz:** nosso `commands/humanize.md` já citava o blader. Agora absorvi a seção "Personality and Soul" inteira — exemplos lado a lado de "limpo mas sem pulso" vs "tem pulso".

### 3. `AgriciDaniel/claude-seo` — ABSORVA o GEO/AEO

**Stars:** 7k · MIT · push maio/2026
**O que faz:** 25 sub-skills + 18 sub-agents cobrindo SEO técnico + **GEO/AEO** (otimização pra ser citado por LLM/ChatGPT/Perplexity).

**Por que vale:** GEO é o gap mais grave em SEO hoje. Conteúdo otimizado pra Google de 2018 não é otimizado pra LLM de 2026. Diferenças concretas: claims atômicos (1 fato por sentença), H2/H3 como perguntas diretas, TL;DR no topo (LLM cita), tabelas comparativas (LLM extrai), `llms.txt` na raiz.

**O que fiz:** nossa skill 14-seo-specialist agora tem ~135 linhas novas sobre GEO/AEO. Estrutura citável, structured data (Article com author/datePublished/dateModified), E-E-A-T para LLMs, `llms.txt`, checklist próprio.

### 4. `garrytan/gstack` — VALE OLHAR (alta sobreposição)

**Stars:** 101k · MIT · push maio/2026
**O que faz:** o "exact Claude Code setup" do Garry Tan (CEO da Y Combinator). 23 tools como slash commands. Personas claras: CEO, Designer, Eng Manager, Release Manager, Doc Engineer, QA.

**Sobreposição com Dev Team Kit:** ~70%. Nosso kit tem 42 skills cobrindo o mesmo terreno (PO, UI/UX, Backend, Frontend, QA, Reviewer, Security, Release Manager, etc.).

**Onde gstack ganha:**
- `/canary` — canary deployments com rollout gradual (1% → 10% → 50% → 100%). **Gap nosso.**
- `/freeze`/`/guard`/`/unfreeze` — controle de mudança em branch crítico.
- `--team` auto-update pra repos compartilhados.
- `/learn` — captura padrões aprendidos por sessão.

**O que fiz:** criei nossa skill 43-canary-deployment cobrindo as 3 estratégias (traffic-based, feature flag, blue-green) com tabela de métricas, rollback automático, atribuição ao gstack.

**Recomendação:** se você não tem nada, instala gstack. Se você já usa Dev Team Kit, copia só o `/canary` e talvez `/freeze`.

### 5. `obra/superpowers` — VALE OLHAR (alta sobreposição)

**Stars:** 204k · MIT · push maio/2026 · autor Jesse Vincent
**O que faz:** "complete development methodology". 14 skills compostas via marketplace oficial Claude Code. Filosofia: cold start → spec interrogada → plan TDD → subagent-driven implementation.

**Sobreposição com Dev Team Kit:** ~60%. Skills que coincidem: dispatching-parallel-agents (= nossa skill 40), test-driven-development (= skill 37), using-git-worktrees (= skill worktree), receiving-code-review (= policy), writing-skills (= skill 35), systematic-debugging (= agent debugger).

**Onde superpowers ganha:**
- `verification-before-completion` skill — articula como "Iron Law" + "Gate Function" + "Rationalization Prevention" (tabela de desculpas vs realidade).
- `requesting-code-review` — pattern de como pedir review (complementa o `receiving-code-review`).
- Marketplace oficial = install mais simples.

**O que fiz:** enriqueci nossa `policies/verification-before-completion.md` com "Iron Law" e "Rationalization Prevention" do superpowers.

### 6. `heygen-com/hyperframes` — VALE TESTAR

**Stars:** 21k · Apache-2.0 · push maio/2026
**O que faz:** "Write HTML. Render video. Built for agents." Framework de geração de vídeo via HTML+GSAP+Tailwind onde o agente é o autor.

**Por que vale:** é genuinamente novo. Nossa skill 27 (video-integration) cobre integração com APIs de geração (RunwayML, Pika, FAL.AI), mas **não cobre rendering** de composição autoral. Se você precisa de motion graphics ou video explainer customizado, hyperframes preenche.

**Recomendação:** se sua skill 27 (ou equivalente) gera vídeo, instala `hyperframes` como skill paralela. Sem overlap.

### 7. `openai/codex-plugin-cc` — JÁ NO KIT (via plugin oficial)

**Stars:** 19k · Apache-2.0 · push abril/2026
**O que faz:** plugin oficial da OpenAI pra usar Codex de dentro do Claude Code. 7 commands: `/codex:review`, `/codex:adversarial-review`, `/codex:rescue`, `/codex:status`, `/codex:result`, `/codex:cancel`, `/codex:setup`.

**Diferencial:** `/codex:adversarial-review` — segunda opinião que **questiona o approach**, não só implementação.

**O que fiz:** documentei integração em `docs/skill-guides/codex-plugin-integration.md`. Nossos `codex:rescue` e `codex:setup` (visíveis no env) já vêm desse plugin. Recomendação: instale e use os 7 commands — não há motivo pra reinventar.

### 8. `antfu/skills` — VALE COPIAR convenções

**Stars:** 5k · MIT · push maio/2026 · autor Anthony Fu (core Vue/Vite)
**O que faz:** 17 skills curadas via **git submodules** que referenciam docs oficiais upstream (Vue, Nuxt, Pinia, Vite, Vitest, UnoCSS, etc.). Quando o upstream atualiza, a skill atualiza junto.

**Por que vale:** dois patterns interessantes — (1) submodules pra sync com docs externos, (2) skills compactas (~70 linhas SKILL.md + `references/` separados pros detalhes longos).

**Recomendação:** se você programa Vue/Vite/Nuxt, instala. Se você mantém um kit próprio, copia os 2 patterns (submodules + compact format) — vou avaliar adotar no Dev Team Kit v3.

### 9. `vercel-labs/agent-browser` — IGNORE por enquanto

**Stars:** 34k · Apache-2.0 · Rust · push maio/2026
**O que faz:** CLI nativo Rust pra automação de browser. Snapshots de acessibility-tree com refs compactos (`@eN`). Alega menos tokens vs Playwright.

**Por que ignorar:** as alegações de "fewer tokens, faster" não têm benchmark publicado vs Playwright MCP. Repo tem pasta `benchmarks/` com scripts mas **sem resultados**. É Chromium-only (Firefox e Safari ficam de fora). E não é MCP server — é CLI + Claude Skill, exige Bash wrapping.

**Recomendação:** Playwright MCP já cobre seu caso. Espera Vercel publicar benchmark real com números antes de migrar.

---

## Os 4 que valem conferir (parcial)

### `anthropics/financial-services` (27k stars, Apache-2.0)

Vertical específico (IB, PE, equity, wealth). Fora do escopo se você não trabalha com finanças. **MAS** tem um pattern arquitetural ótimo: `plugins/agent-plugins/` (named agents self-contained) + `plugins/vertical-plugins/` (skills bundleadas por vertical) + `partner-built/`. Self-contained = installa só o que precisa.

**Recomendação:** **não instala** se não é seu vertical. **Copia o pattern** se você mantém kit modular. Documentei como adotar em `docs/patterns/vertical-plugins.md`.

### `anthropics/claude-for-legal` (7.5k stars, Apache-2.0)

Mesmo pattern do `financial-services` mas vertical legal. Mesma recomendação: instale só se você é advogado in-house; copie o pattern se mantém kit.

### `JuliusBrussee/caveman` (64k stars, MIT)

"Why use many token when few token do trick" — agente fala como caverna pra cortar 65% dos tokens de output. Funciona, mas tem custo: parte da informação técnica vira ambígua.

**Recomendação:** se você só faz pair-programming técnico e não compartilha output, vale testar. Se você gera docs, PRs ou code review pra ler depois, evita — output cavernoso fica difícil de revisitar. Já recusamos absorver no Dev Team Kit em v2.9.0 — temos `policies/dense-output-mode.md` que comprime sem virar caverna.

### `alirezarezvani/claude-skills` (16k stars, MIT, 329 skills)

O "everything bundle". 329 skills, 49 agents, 79 commands, 7 personas, 12 hosts.

**Recomendação: cuidado.** 329 skills é anti-padrão. Discovery vira impossível, manutenção vira insustentável, e o autor reivindica "POWERFUL/SOLID/GENERIC/WEAK" tiers — sinal claro de que muita coisa é GENERIC ou WEAK.

**Mas** o `SKILL-AUTHORING-STANDARD.md` deles tem boas ideias: limite de 10KB por SKILL.md (força extrair pros `references/`), validators Python (`skill_validator.py`, `quality_scorer.py`) com `--json` + score 0-100, trigger eval loop com should/shouldn't pairs.

**O que vou fazer:** adotar limite de 10KB + scorer programático na nossa skill 35-skill-author. **Não vou** copiar a quantidade — qualidade > catálogo.

---

## Os 15 que dá pra ignorar

### MCPs user-side (8 itens) — não são "skills do kit", são integrações user

- `granola` (meeting notes) · `slack` · `notion` · `kondo` (LinkedIn DM) · `zapier` · `higgsfield` (video) · `perplexity` · agent-browser citado acima

Esses são MCPs que o **user** instala uma vez no Claude Code. Não tem o que "absorver" num kit. Você instala se usa o produto correspondente, ignora se não usa. Lista boa pra descoberta — mas não tem mérito de curadoria.

### Verticais fora do escopo dev (2 itens)

- `anthropics/financial-services` (a menos que você trabalhe em IB/PE)
- `anthropics/claude-for-legal` (a menos que você seja advogado)

### Articles introdutórios (2 itens)

- `charliehills.substack.com/p/claude-code-for-normal-people`
- `charliehills.substack.com/p/build-your-1st-ai-agent-in-claude`

Onboarding pra quem nunca usou. Pula se você já está aqui.

### Bundles ruidosos (2 itens)

- `coreyhaines31/marketingskills` (30k stars) — 40 marketing tools. Sobrepõe nossa skill 13 (marketing-copy) + skill 14 (SEO). Sem clara vantagem.
- `charlie947/social-media-skills` (1k stars) — "my content OS". Produto pessoal, não kit reutilizável.

### Sobreposição direta (1 item)

- `charlie947/ai-second-brain` (40 stars) — Karpathy-style wiki. Sobrepõe nosso `D:/claude-memory/` vault + `consolidate-memory` skill. Sem migração path claro.

### Curiosidade (1 item)

- `PleasePrompto/notebooklm-skill` (6.6k stars) — browser automation no NotebookLM. Curiosidade interessante, mas se você precisa fazer LLM querar seus docs, prefere RAG próprio.

---

## O que isso mudou no Dev Team Kit

Acabei de absorver (commits chegando na próxima release):

1. **Skill 02 (UI/UX)** — 11 aesthetic anchors + bane fonts genéricas (do anthropics/frontend-design)
2. **Skill 14 (SEO)** — seção GEO/AEO completa (do AgriciDaniel/claude-seo)
3. **Skill 43 (NOVA — canary-deployment)** — rollout gradual + rollback automático (do garrytan/gstack)
4. **Command `/humanize`** — seção Personality and Soul (do blader/humanizer)
5. **Policy `verification-before-completion`** — Iron Law + Rationalization Prevention (do obra/superpowers)
6. **Doc `vertical-plugins.md`** — pattern arquitetural (do anthropics/financial-services)
7. **Doc `codex-plugin-integration.md`** — guia dos 7 commands do plugin oficial

Tudo atribuído via NOTICE/README/seção "Fontes Externas" na skill. Nenhuma cópia de código — só patterns + ideias.

---

## Como decidir o que instalar (regra de bolso)

1. **Você está começando?** Instala `obra/superpowers` ou `garrytan/gstack`. Não os dois — escolhe um. Os dois são opinionated frameworks completos.
2. **Você já tem kit próprio?** Lê os patterns dos 9 que marquei verde acima e absorve seletivamente. Não instale tudo.
3. **MCPs user-side?** Instala os que você usa (Slack se você vive no Slack, Notion se você vive lá). Esses não competem.
4. **Quer "256+ skills" num bundle?** Cuidado. Quantidade ≠ qualidade. Catálogos gigantes têm discovery quebrado.

---

## Atribuições

Todos os repos analisados, com license:

| Repo | License | Stars |
|---|---|---|
| `garrytan/gstack` | MIT | 101k |
| `obra/superpowers` | MIT | 204k |
| `openai/codex-plugin-cc` | Apache-2.0 | 19k |
| `anthropics/financial-services` | Apache-2.0 | 27k |
| `anthropics/claude-for-legal` | Apache-2.0 | 7.5k |
| `alirezarezvani/claude-skills` | MIT | 16k |
| `coreyhaines31/marketingskills` | MIT | 30k |
| `charlie947/social-media-skills` | MIT | 1k |
| `anthropics/skills` (frontend-design) | custom | 139k |
| `heygen-com/hyperframes` | Apache-2.0 | 21k |
| `charlie947/ai-second-brain` | MIT | 40 |
| `PleasePrompto/notebooklm-skill` | MIT | 6.6k |
| `blader/humanizer` | MIT | 21k |
| `AgriciDaniel/claude-seo` | MIT | 7k |
| `antfu/skills` | MIT | 5k |
| `JuliusBrussee/caveman` | MIT | 64k |
| `perplexityai/modelcontextprotocol` | MIT | 2.2k |
| `vercel-labs/agent-browser` | Apache-2.0 | 34k |

Dev Team Kit é Apache-2.0 — compatível com todos acima. As 7 absorções listadas têm atribuição explícita no código + NOTICE + README.

---

## Onde fica esse review

Repositório: [github.com/felvieira/claude-skills-fv](https://github.com/felvieira/claude-skills-fv)

Skill que escreveu esse post: `41-blog-publisher` (do próprio kit).
Skill que removeu AI slop deste texto: `/humanize` (do próprio kit).

Se você instalou o Dev Team Kit, pode rodar `/humanize <post>` no seu próximo review — vai parecer escrito por um humano, não por um GPT educado.

— [@felvieira](https://github.com/felvieira)
