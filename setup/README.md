# Setup - Dev Team Kit

![Installer](https://img.shields.io/badge/installer-.bot-ready-0f766e)
![MCP](https://img.shields.io/badge/MCP-context7%20%7C%20playwright-1d4ed8)
![Platforms](https://img.shields.io/badge/platforms-5-f59e0b)

## O que faz

O script de setup instala o Dev Team Kit em qualquer repositorio consumidor e configura automaticamente as plataformas suportadas. Ele copia skills, regras, docs e configuracoes de MCP, deixando o repo pronto para uso com Claude Code, GitHub Copilot, Windsurf, Gemini CLI e Antigravity.

## Pre-requisitos

| Dependencia | Obrigatorio? | Motivo |
|-------------|-------------|--------|
| **Node.js** (>= 18) | Sim | MCPs essenciais (context7, playwright) rodam via `npx` |
| **Python** (>= 3.10) | Nao | Necessario apenas para MCPs opcionais (fetch) |
| **uv** | Nao | Necessario apenas para o MCP notebooklm (`uvx`) |

## Como usar

Dentro do proprio repo:

```bash
bash .bot/setup/install.sh
```

Ou apontando para outro repo:

```bash
bash setup/install.sh /path/to/repo
```

O script detecta automaticamente as plataformas instaladas e gera os arquivos de configuracao correspondentes.

## Plataformas configuradas

| Plataforma | Arquivo de regras | Arquivo de MCPs |
|------------|-------------------|-----------------|
| **Claude Code** | `CLAUDE.md` + `AGENTS.md` | `.claude/settings.json` |
| **Copilot** | `.github/copilot-instructions.md` | N/A (usa MCPs do editor) |
| **Windsurf** | `.windsurf/rules/dev-team-kit.md` | `.windsurf/mcp.json` |
| **Gemini CLI** | `GEMINI.md` | `.gemini/settings.json` |
| **Antigravity** | `.agent/skills/*/SKILL.md` + `GEMINI.md` | `.gemini/settings.json` |

## MCPs Essenciais

Instalados automaticamente pelo setup. Nao precisam de configuracao extra.

### context7

Fornece documentacao atualizada de qualquer biblioteca diretamente no contexto do agente. Elimina respostas baseadas em versoes desatualizadas.

```json
{
  "command": "npx",
  "args": ["-y", "@upstash/context7-mcp@latest"]
}
```

### playwright

Automacao de browser para testes E2E. Alinha com a skill 05 (QA Engineer).

```json
{
  "command": "npx",
  "args": ["-y", "@playwright/mcp@latest"]
}
```

## MCPs Opcionais

Os MCPs opcionais vem com `"disabled": true` na configuracao gerada. Para ativar, siga os passos de cada um.

### fal (Image Generator)

Geracao de imagens via fal.ai. Alinha com a skill 17 (Image Generator).

1. Configurar `FAL_KEY` no `.env` do projeto
2. No arquivo de config da plataforma, setar `"disabled": false` no servidor `fal`

### fetch (Web Content)

Busca e processa conteudo web (HTML → Markdown).

1. Instalar o servidor: `pip install mcp-server-fetch`
2. Setar `"disabled": false` no servidor `fetch`

### notebooklm (Google NotebookLM)

Pesquisa com fontes citadas, geracao de podcasts e infograficos via Google NotebookLM.

1. Instalar a CLI: `uv tool install notebooklm-mcp-cli`
2. Autenticar com Google: `nlm login`
3. Setar `"disabled": false` no servidor `notebooklm`

## Configs por plataforma

### Claude Code

Arquivo: `.claude/settings.json`

Os MCPs ficam em `mcpServers`. O setup gera o arquivo completo com essenciais habilitados e opcionais desabilitados.

### Windsurf

Arquivos:
- Regras: `.windsurf/rules/dev-team-kit.md`
- MCPs: `.windsurf/mcp.json`

Copie os `mcpServers` do arquivo gerado para `.windsurf/mcp.json` se precisar ajustar manualmente.

### Copilot

Arquivo: `.github/copilot-instructions.md`

O Copilot nao tem suporte nativo a MCPs via config de repo. Os MCPs devem ser configurados no editor (VS Code settings).

### Gemini CLI / Antigravity

Arquivos:
- Skills: `.agent/skills/*/SKILL.md` (um diretorio por skill)
- MCPs: `.gemini/settings.json`

No modo atual do kit, o instalador copia cada skill como diretorio em `.agent/skills/<skill>/SKILL.md` para manter compatibilidade com Windows e com a estrutura original do repositorio.

O formato de MCPs do Gemini segue a mesma estrutura `mcpServers` do Claude Code.

## Estrutura gerada

Apos rodar o setup, o repo consumidor tera:

```
repo/
├── .claude/
│   └── settings.json          # MCPs para Claude Code
├── .github/
│   └── copilot-instructions.md
├── .windsurf/
│   ├── rules/
│   │   └── dev-team-kit.md
│   └── mcp.json
├── .agent/
│   └── skills/
│       └── <skill>/SKILL.md
├── .gemini/
│   └── settings.json
├── AGENTS.md
├── CLAUDE.md
└── GEMINI.md
```

## Troubleshooting

### Node.js nao encontrado

```
ERROR: node nao encontrado. Instale Node.js >= 18.
```

Instale via [nodejs.org](https://nodejs.org) ou via gerenciador de versao (`nvm`, `fnm`, `volta`). Os MCPs essenciais dependem de `npx`.

### Python nao encontrado

```
WARN: python nao encontrado. MCPs opcionais (fetch) nao estarao disponiveis.
```

Isso e apenas um aviso. O setup continua normalmente. Instale Python apenas se precisar dos MCPs opcionais que dependem dele.

### `nlm login` falha

```
ERROR: falha na autenticacao do NotebookLM
```

- Verifique se `uv` esta instalado: `uv --version`
- Reinstale a CLI: `uv tool install notebooklm-mcp-cli --force`
- Tente autenticar novamente: `nlm login`
- Se estiver atras de proxy corporativo, configure `HTTPS_PROXY` antes de rodar `nlm login`

### MCP nao responde apos ativar

- Confirme que `"disabled": false` esta no servidor correto dentro do JSON
- Reinicie o agente/editor apos alterar configs de MCP
- Teste o MCP manualmente: `npx -y @upstash/context7-mcp@latest` (deve iniciar sem erros)
