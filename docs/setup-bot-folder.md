# Setup `.bot/`

Modo recomendado para instalar o kit em um repositorio consumidor.

## Estrutura

```text
repo/
|-- AGENTS.md
|-- CLAUDE.md
|-- GEMINI.md
|-- .github/
|   `-- copilot-instructions.md
|-- .windsurf/
|   `-- rules/
|       `-- dev-team-kit.md
|-- .agent/
|   `-- skills/          <- copia gerada pelo setup a partir do kit
|-- .claude/
|   `-- settings.json    <- MCP servers
`-- .bot/
    |-- GLOBAL.md
    |-- README.md
    |-- .env.tools        <- ferramentas de code intelligence detectadas
    |-- .tool-usage.json  <- telemetria local de leitura, busca e escrita
    |-- policies/
    |-- templates/
    |-- skills/
    |-- patterns/
    |   `-- ai-integration/
    |-- scripts/
    |-- setup/
    |-- docs/
    |   |-- repo-audit/
    |   |-- context/
    |   |   |-- current-focus.md
    |   |   |-- session-YYYY-MM-DD.md
    |   |   `-- working-set.json
    |   `-- skill-guides/
    |-- commands/
    `-- evals/
```

## Regra pratica

- manter `AGENTS.md`, `CLAUDE.md` e `GEMINI.md` na raiz do repo
- colocar o kit dentro de `.bot/`
- apontar os arquivos da raiz para `.bot/`
- deixar `Repo Auditor` criar `.bot/docs/repo-audit/current.md` no primeiro uso

## Fluxo recomendado

1. copiar o kit para `.bot/`
2. rodar `bash .bot/setup/install.sh` - gera configs pra todas as plataformas
3. abrir o repo no agente de preferencia
4. se a auditoria nao existir, rodar `Repo Auditor`
5. depois conversar normalmente com a IA

## Economia de Token

- reutilizar `.bot/docs/repo-audit/current.md`
- reutilizar `.bot/docs/repo-audit/assets.md`
- montar contexto minimo com `devkit_context_pack`
- persistir arquivos quentes em `.bot/docs/context/working-set.json`
- usar `devkit_diff_brief` para retomar branches e reviews
- consultar `.bot/.tool-usage.json` e `devkit_track_cost` quando houver releitura ou loops
- abrir guides sob demanda
- reauditar apenas quando houver mudanca relevante

## Patterns e Scripts

- `patterns/ai-integration/` contem padroes reutilizaveis para integrar IA no app
- `scripts/` contem ferramentas auxiliares como `generate-image.py`
- copiar ambos para `.bot/` junto com o resto do kit
