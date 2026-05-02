# AGENTS.md

## Objetivo
Este repositorio define um kit de skills e governanca para agentes de coding em Claude, OpenCode e superficies compativeis.

## Uso em Repos Consumidores
- em repos de aplicacao, o modo recomendado e manter `AGENTS.md` na raiz e instalar o kit dentro de `.bot/`
- usar `templates/AGENTS-root.md` como base para o `AGENTS.md` do repo consumidor
- se o repo consumidor nao tiver auditoria valida, iniciar por `Repo Auditor`

## Ordem de Leitura
1. `GLOBAL.md`
2. `policies/`
3. `README.md`
4. `skills/*/SKILL.md`
5. `docs/skill-guides/` somente quando a tarefa exigir exemplos extensos

## Defaults Operacionais
- responder curto por padrao
- agir primeiro quando houver default seguro
- nao repetir contexto desnecessario
- usar tools com minimo privilegio
- pedir aprovacao para acoes destrutivas ou externas de alto risco
- registrar handoff curto e objetivo

## Mudancas no Repositorio
- prefira mudancas pequenas e revisaveis
- preserve a hierarquia global do kit
- nao reintroduza acoplamento a vendor ou comando especifico sem necessidade
- mova exemplos longos para `docs/skill-guides/` quando uma skill comecar a inflar

## Validacao Minima
- siga `policies/evals.md` para mudancas de skills, prompts e tools
- siga `policies/tool-safety.md` para MCP, rede, escrita e acoes externas

## Slash Commands

Atalhos por fase de desenvolvimento — use em vez de lembrar nomes de skills:

| Command | O que faz |
|---------|-----------|
| `/spec` | Especificar feature com critérios de aceitação |
| `/plan` | Classificar task e montar pipeline |
| `/build` | Implementar com stack do projeto |
| `/test` | Escrever e rodar testes |
| `/review` | Review final + security audit |
| `/simplify` | Simplificar e refatorar código |
| `/ship` | Release e deploy |
| `/pipeline` | Pipeline completo end-to-end |
| `/best` | Auditoria de boas práticas, clean code e DRY |
| `/auto` | Agente autônomo — executa task completa sem intervenção |
| `/loop` | Loop autônomo v2 — multi-agente (claude/codex), worktree paralelo, polishing pass (`node scripts/auto-loop.mjs "task"`) |
| `/worktree` | Cria git worktree isolado, copia `.env*`, valida ambiente em background |
| `/detective-spec` | Engenharia reversa de specs em legado — extrai contratos sem tocar no código (skill 33) |

Navegação de skills: `docs/skill-guides/skill-discovery.md`

## Modos de execução autônomos

- `/auto` — prompt-based, executa no contexto atual da conversa
- `/loop` — process-based (auto-loop v2), roda o agente como subprocess com:
  - **multi-agente** via `--agent claude|codex`
  - **worktree integrado** via `--worktree` (paralelo via `--parallel N`, até 8)
  - **polishing pass** configurável via `--polish none|light|standard|full`
  - exit codes determinísticos para uso em CI (ver `.claude/commands/loop.md`)

## Artefatos Principais
- `GLOBAL.md` = regras universais
- `policies/` = regras compartilhadas (inclui `context-engineering.md` para hierarquia de contexto)
- `templates/` = formatos curtos padronizados
- `skills/` = especialidades
- `personas/` = personas estruturadas para review (code-reviewer, security-auditor, test-engineer)
- `docs/repo-audit/` = auditoria reutilizavel do repositorio
- `docs/skill-guides/` = anexos sob demanda (inclui `skill-discovery.md` e `context-engineering.md`)
- `evals/` = casos de avaliacao do sistema
- `docs/setup-bot-folder.md` = modo recomendado de instalacao em `.bot/`
- `patterns/ai-integration/` = padroes reutilizaveis para integrar IA em apps
- `.claude/commands/` = slash commands por fase de desenvolvimento
- `.claude/agents/` = subagents despachaveis via Task tool

## Subagents (`.claude/agents/`)

Subagents são agentes especializados que podem ser despachados via `Task` tool no Claude Code.
Copiados para o repo consumidor pelo `install.sh`.

| Subagent | Especialidade | Tools |
|----------|---------------|-------|
| `code-reviewer` | Review senior: correctness, design, readability, performance, security | Read, Grep, Glob, Bash |
| `security-auditor` | Audit de segurança: OWASP, auth, injeção, CORS, deps | Read, Grep, Glob, Bash |
| `test-engineer` | QA Prove-It: happy path, error, edge case, regression, performance | Read, Grep, Glob, Bash, Edit, Write |
| `orchestrator` | Tech Lead: classifica task, define pipeline mínimo, coordena skills | todas |
| `debugger` | Root cause sistemático: hipótese → evidência → fix mínimo | Read, Grep, Glob, Bash, Edit |
| `detective-contracts` | Detetive de contratos de módulo (legado) — read-only | Read, Grep, Glob, Bash |
| `detective-business-rules` | Detetive de regras de negócio escondidas (legado) — read-only | Read, Grep, Glob, Bash |
| `detective-flows` | Detetive de fluxos end-to-end (legado) — read-only | Read, Grep, Glob, Bash |
| `detective-adrs` | Detetive de decisões arquiteturais retroativas (legado) — read-only | Read, Grep, Glob, Bash |

**Como invocar** (via `Task` tool ou prompt Claude Code):

```
Despache o subagent code-reviewer para revisar as mudanças em src/auth/
```
