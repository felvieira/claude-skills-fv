# Setup `.bot/`

Modo recomendado para instalar o kit em um repositorio consumidor.

## Estrutura

```text
repo/
├── AGENTS.md
└── .bot/
    ├── GLOBAL.md
    ├── README.md
    ├── policies/
    ├── templates/
    ├── skills/
    ├── docs/
    │   ├── repo-audit/
    │   └── skill-guides/
    ├── commands/
    └── evals/
```

## Regra pratica

- manter `AGENTS.md` na raiz do repo
- colocar o kit dentro de `.bot/`
- apontar o `AGENTS.md` da raiz para `.bot/`
- deixar `Repo Auditor` criar `.bot/docs/repo-audit/current.md` no primeiro uso

## Fluxo recomendado

1. copiar o kit para `.bot/`
2. criar `AGENTS.md` na raiz usando `templates/AGENTS-root.md`
3. abrir o repo no agente
4. se a auditoria nao existir, rodar `Repo Auditor`
5. depois conversar normalmente com a IA

## Economia de Token

- reutilizar `.bot/docs/repo-audit/current.md`
- reutilizar `.bot/docs/repo-audit/assets.md`
- abrir guides sob demanda
- reauditar apenas quando houver mudanca relevante
