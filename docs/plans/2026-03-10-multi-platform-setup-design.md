# Multi-Platform Setup + MCP Auto-Config — Design Spec

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar configs para todas as plataformas (Claude Code, Windsurf, Copilot, Antigravity) e instalar MCPs essenciais automaticamente via script de setup.

**Principio:** "Gera tudo, funciona em qualquer lugar". O usuario abre o projeto em qualquer ferramenta e o sistema e reconhecido.

---

## Plataformas Suportadas

| Plataforma | Arquivo de instrucoes | MCP config | Le AGENTS.md? |
|-----------|----------------------|-----------|--------------|
| Claude Code | `CLAUDE.md` (raiz) | `.claude/settings.json` | Sim |
| GitHub Copilot | `.github/copilot-instructions.md` | N/A | Sim |
| Windsurf | `.windsurf/rules/*.md` | `.windsurf/mcp.json` | Sim |
| Antigravity | `.agent/skills/*/SKILL.md` | `.gemini/settings.json` | Via GEMINI.md |

## MCPs

### Essenciais (habilitados)
| MCP | Comando | Requisito |
|-----|---------|-----------|
| context7 | `npx @upstash/context7-mcp@latest` | Node.js |
| playwright | `npx @playwright/mcp@latest` | Node.js |

### Opcionais (desabilitados, usuario ativa)
| MCP | Comando | Requisito | Setup extra |
|-----|---------|-----------|-------------|
| fal | `npx mcp-remote https://docs.fal.ai/mcp` | Node.js | FAL_KEY no .env |
| fetch | `python -m mcp_server_fetch` | Python | pip install mcp-server-fetch |
| notebooklm | `uvx --from notebooklm-mcp-cli notebooklm-mcp` | Python + uv | uv tool install + nlm login |

## Estrutura

```
setup/
├── install.sh              → Script principal
├── configs/
│   ├── claude-settings.json
│   ├── windsurf-rule.md
│   ├── copilot-instructions.md
│   ├── gemini.md
│   └── antigravity-readme.md
├── mcp-servers.json        → Definicao de todos os MCPs
└── README.md               → Doc do setup + como configurar cada MCP
```

## Decisoes
- Secrets nunca hardcoded — usa variaveis de ambiente
- Script bash compativel com Git Bash (Windows), macOS e Linux
- Skills do kit funcionam nativamente no Antigravity (mesmo formato SKILL.md)
- GEMINI.md na raiz serve como entry point pro Antigravity/Gemini
- Secao de MCPs adicionada ao README.md principal do kit
