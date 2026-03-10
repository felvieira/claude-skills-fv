# Setup `.bot/`

Modo recomendado para instalar o kit em um repositorio consumidor.

## Estrutura

```text
repo/
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── .github/
│   └── copilot-instructions.md
├── .windsurf/
│   └── rules/
│       └── dev-team-kit.md
├── .agent/
│   └── skills/          ← symlink ou copia de .bot/skills/
├── .claude/
│   └── settings.json    ← MCP servers
└── .bot/
    ├── GLOBAL.md
    ├── README.md
    ├── policies/
    ├── templates/
    ├── skills/
    ├── patterns/
    │   └── ai-integration/
    ├── scripts/
    ├── setup/
    ├── docs/
    │   ├── repo-audit/
    │   └── skill-guides/
    ├── commands/
    └── evals/
```

## Regra pratica

- manter `AGENTS.md`, `CLAUDE.md` e `GEMINI.md` na raiz do repo
- colocar o kit dentro de `.bot/`
- apontar os arquivos da raiz para `.bot/`
- deixar `Repo Auditor` criar `.bot/docs/repo-audit/current.md` no primeiro uso

## Fluxo recomendado

1. copiar o kit para `.bot/`
2. rodar `bash .bot/setup/install.sh` — gera configs pra todas as plataformas
3. abrir o repo no agente de preferencia
4. se a auditoria nao existir, rodar `Repo Auditor`
5. depois conversar normalmente com a IA

## Economia de Token

- reutilizar `.bot/docs/repo-audit/current.md`
- reutilizar `.bot/docs/repo-audit/assets.md`
- abrir guides sob demanda
- reauditar apenas quando houver mudanca relevante

## Patterns e Scripts

- `patterns/ai-integration/` contem padroes reutilizaveis para integrar IA no app
- `scripts/` contem ferramentas auxiliares como `generate-image.py`
- copiar ambos para `.bot/` junto com o resto do kit
