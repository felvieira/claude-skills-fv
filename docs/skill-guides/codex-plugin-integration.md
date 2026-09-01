# Codex Plugin — Integração no Dev Team Kit

**Status:** integração via plugin oficial OpenAI (`openai/codex-plugin-cc`, Apache-2.0), com dispatcher cross-runtime de hooks.
Claude e Codex usam `hooks/scripts/runtime-dispatcher.mjs`; o registro específico do Codex fica em `.codex/hooks.json`.

## Por que via plugin oficial

O OpenAI mantém o plugin `codex-plugin-cc` (19k+ stars, Apache-2.0) com runtime próprio (`scripts/codex-companion.mjs`), schemas, hooks de aprovação de write, e sessões de background com cancel/result/status. Reimplementar dentro do nosso kit seria duplicação cara que diverge da fonte oficial.

Quando o user roda `/plugin install codex@openai-codex`, os 7 commands abaixo ficam disponíveis nativamente.

### Hooks no Codex

O arquivo `.codex/hooks.json` registra `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse` e `Stop` através do dispatcher compartilhado. Ele normaliza o payload antes de executar os sensores canônicos do kit e agrega as respostas em um único JSON válido.

O dispatcher aceita `tool_name`/`tool`, `tool_input`/`input` e `tool_response`/`tool_result`. Falhas individuais são registradas em `.auto/hook-errors.jsonl`; o evento continua com `continue: true`, evitando que um sensor opcional quebre a ferramenta. O Claude continua recebendo os mesmos sensores, agora agregados pelo mesmo dispatcher.

## Commands disponíveis (do `openai/codex-plugin-cc`)

| Command | O que faz | Quando usar |
|---|---|---|
| `/codex:setup` | Verifica se Codex está instalado + logado; instala se faltar | Primeira vez, ou erro "codex not found" |
| `/codex:rescue` | Delega uma task complexa em background pro Codex resolver | Claude Code travou, ou task é grande demais pra contexto atual |
| `/codex:review` | Code review read-only do estado git atual | Antes de PR, segunda opinião em mudança não trivial |
| `/codex:adversarial-review` | Review steerable que **questiona o approach**, não só implementação | Decisão arquitetural, design choice, antes de merge de feature grande |
| `/codex:status` | Estado de jobs em background | Conferir progresso de `rescue` ou `review --background` |
| `/codex:result` | Pega output final de job concluído | Quando `status` mostra job terminado |
| `/codex:cancel` | Cancela job em andamento | Job travou ou direção mudou |

## Como o kit usa

Em `D:/Repos/claude-skills-fv/agents/` temos subagents associados ao plugin:
- `codex-rescue` — wrapper que sabe quando despachar pro Codex via `/codex:rescue`
- `codex-setup` — wrapper que valida ambiente Codex

O `pre-execution-gate` e o orchestrator (skill 09) podem sugerir `/codex:rescue` quando detectarem:
- Task estimada > 60min de execução em Claude Code
- Falhas repetidas em loop de implementação (3+ tentativas)
- User pedindo "segunda opinião"

## Padrão de uso recomendado

**Review antes de PR (caso comum):**
```
1. terminar a feature
2. /codex:review --background
3. continuar trabalhando em outra coisa
4. /codex:status quando lembrar
5. /codex:result quando estiver pronto
6. agir no feedback antes de abrir PR
```

**Review adversarial em decisão crítica:**
```
1. propor o design
2. /codex:adversarial-review --background "focus: assumptions sobre escala e custo de banco"
3. ler críticas
4. ajustar ou justificar
```

**Rescue quando travado:**
```
1. Claude Code ficou em loop ou disse "não consigo resolver"
2. /codex:rescue (delega pra Codex resolver em background)
3. /codex:status periodicamente
4. /codex:result quando pronto
```

## Não confundir com nossos `dev-team-kit-fv:` slash commands

Nossos commands (em `commands/`) começam com `/` simples (ex: `/review`, `/build`, `/swarm`). Eles rodam dentro do Claude Code com nossas 42 skills.

Os commands `/codex:*` rodam **um modelo diferente** (Codex API, da OpenAI) em processo separado. São complementares:
- `/review` usa Claude + nossa skill 11 (reviewer) — review profundo com contexto do kit inteiro
- `/codex:review` usa Codex em background — second opinion independente

Usar os dois antes de PR grande dá duas perspectivas sem custo de contexto.

## Pré-requisitos

- ChatGPT subscription (mesmo Free) ou OpenAI API key
- Node.js 18.18+
- `/plugin install codex@openai-codex` rodado uma vez

## Fontes

- Repo plugin: [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) (Apache-2.0)
- Codex CLI: [openai/codex](https://github.com/openai/codex)
- Documentação Codex: [developers.openai.com/codex](https://developers.openai.com/codex)
