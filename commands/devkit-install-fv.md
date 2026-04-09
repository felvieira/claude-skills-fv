---
description: Instala o dev-team-kit completo (.bot/) no repo atual — policies, MCP, hooks, templates e repo-audit
---

Instale o dev-team-kit completo neste repositório rodando o instalador oficial:

```bash
bash setup/install.sh
```

Se o kit ainda não estiver clonado localmente, clone primeiro:

```bash
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh
```

O instalador copia o kit para `.bot/` e configura:
- **MCP server** (`dev-team-kit`) com 31 tools apoiadas pelas skills
- **Hooks** registrados no `.claude/settings.json` (lifecycle intelligence)
- **Policies** — model routing, tool safety, cost optimization e mais
- **Templates** de handoff, plano, review e rejeição
- **Docs** — quickstart, skill-guides e repo-audit reutilizáveis
- **API keys** — FAL_KEY, BRAVE_SEARCH_KEY, FIRECRAWL_KEY em `.env.local`
- **Configs** para Claude Code, Copilot, Windsurf, Gemini CLI e Antigravity

Para instalação silenciosa (sem prompts interativos):

```bash
bash setup/install.sh --profile lean --no-input
```

Após instalar, reinicie o Claude Code para carregar o MCP server e os hooks.
