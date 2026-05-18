# Contribuindo com o Dev Team Kit

Obrigado pelo interesse em contribuir! Este guia cobre como adicionar skills, corrigir bugs, propor melhorias e manter a consistência do kit.

---

## Índice

- [Estrutura do projeto](#estrutura-do-projeto)
- [Adicionando uma nova skill](#adicionando-uma-nova-skill)
- [Editando skills existentes](#editando-skills-existentes)
- [Adicionando slash commands](#adicionando-slash-commands)
- [Editando hooks](#editando-hooks)
- [Checklist antes de abrir PR](#checklist-antes-de-abrir-pr)
- [Convenções de commit](#convenções-de-commit)

---

## Estrutura do projeto

```text
.
├── skills/           ← uma pasta por skill (01-po-feature-spec, 02-ui-ux-design, ...)
│   └── NN-nome/
│       └── SKILL.md  ← prompt da skill
├── .claude/commands/ ← slash commands (/spec, /plan, /build, /loop, ...)
├── policies/         ← regras compartilhadas entre skills
├── personas/         ← personas de output estruturado
├── hooks/            ← hooks PreToolUse / PostToolUse / SessionStart
├── docs/skill-guides/← guias operacionais (skill-discovery, autonomous-loop, ...)
├── scripts/          ← utilitários (auto-loop.mjs, check-consistency.mjs, ...)
├── mcp-server/       ← servidor MCP TypeScript (expõe as 32 tools)
├── setup/            ← instalador (install.sh) e configs de plataforma
└── templates/        ← templates de handoff, plano, review, rejeição
```

---

## Adicionando uma nova skill

1. **Crie a pasta** com o próximo número disponível:
   ```bash
   mkdir skills/NN-nome-da-skill
   ```

2. **Escreva `SKILL.md`** seguindo o template das skills existentes:
   - Seção `## Papel` — quem é o agente
   - Seção `## Inputs` — o que recebe
   - Seção `## Processo` — como executa (use `### Passo N`)
   - Seção `## Output` — o que entrega
   - Seção `## Handoff` — para qual skill passa adiante
   - Seção `## Persona` (opcional) — referência a `personas/*.md`

3. **Registre no `plugin.json`**:
   ```json
   "skills/NN-nome-da-skill/SKILL.md"
   ```

4. **Atualize o `README.md`** — adicione a skill na tabela de especialistas com número, nome, papel e handoffs.

5. **Rode o check de consistência**:
   ```bash
   node scripts/check-consistency.mjs
   ```

---

## Editando skills existentes

- Edite apenas `skills/NN-nome/SKILL.md`
- Se alterar a seção `## Handoff`, atualize skills dependentes
- Se adicionar `## Persona`, crie o arquivo em `personas/` e referencie o caminho completo
- Rode `node scripts/check-consistency.mjs` antes de commitar

---

## Adicionando slash commands

1. **Crie `.claude/commands/nome.md`** com frontmatter:
   ```markdown
   ---
   description: Descrição curta do comando
   ---
   ```

2. **Registre no `plugin.json`**:
   ```json
   ".claude/commands/nome.md"
   ```

3. **Adicione à tabela de slash commands** em **TODOS** os pontos canônicos:
   - `README.md` + `README.pt-BR.md` (tabela na seção de commands)
   - `AGENTS.md` (tabela "Slash Commands")
   - `docs/WIKI.md` + `docs/WIKI.pt-BR.md` (entrada completa formato aihero: what / when / problem / example / takeaway)
   - `docs/SKILLS-OVERVIEW.md` (entrada curta no índice de commands)

4. **Se o command introduz pipeline novo:**
   - criar declarativo em `programs/<nome>.md` e registrar em `programs/README.md`
   - atualizar `policies/handoffs.md` com a cadeia canônica
   - se o command tem autoridade sobre outras decisões (tipo `/constitution`): atualizar skills relevantes (`skills/NN-*/SKILL.md`) para consultá-lo

5. **Cobertura de evals:**
   - criar `evals/commands/<nome>/golden.json` com 3-4 casos cobrindo happy path, edge cases, anti-padrões
   - se o command é apoiado por subagent: também `evals/protocol-shells/<subagent>/`

6. **Consistency check:**
   - adicionar asserção em `scripts/check-consistency.mjs` validando que o command está registrado em `plugin.json`
   - rodar `node scripts/check-consistency.mjs` antes de commitar — deve passar

7. **Bumps semver:**
   - `MAJOR` se removeu/renomeou command existente
   - `MINOR` se é command novo
   - `PATCH` se é só atualização de doc
   - bump em `README.md` (badge), `README.pt-BR.md` (badge), `.claude-plugin/plugin.json`, `mcp-server/package.json`, `docs/SKILLS-OVERVIEW.md` (header)
   - adicionar entrada no `CHANGELOG.md` com seções Added/Changed/Sources

8. **Tag git + GitHub Release** ao mergear em main:
   - `git tag vX.Y.Z -m "..."`
   - `gh release create vX.Y.Z --title "..." --notes-from-tag`

---

## Adicionando uma nova policy

Policies em `policies/*.md` são regras compartilhadas entre múltiplas skills.

1. **Criar `policies/<nome>.md`** com seções:
   - `## Objetivo` (1-2 linhas)
   - `## Quando aplicar` (lista concreta de situações)
   - `## Regras` ou `## Princípios` (corpo)
   - `## Anti-padrões` (o que evitar)
   - `## Integração` (skills/policies relacionadas)

2. **Atualizar skills afetadas:** adicionar `policies/<nome>.md` na seção "Governanca Global" de cada skill que deve consultar.

3. **Cross-references:** se a policy se relaciona com outras existentes (ex: `quality-gates.md`, `writing-clarity.md`), adicionar link bidirecional.

4. **CHANGELOG:** entrada Added com source/inspiração se aplicável.

5. **Bump semver:**
   - `MINOR` se policy nova
   - `PATCH` se update de policy existente

Exemplos recentes (v1.5.0): `mcp-builder-patterns.md`, `verification-before-completion.md`, `receiving-code-review.md`, `memory-consolidation.md` — todos seguem essa estrutura.

---

## Adicionando um program (pipeline declarativo YAML)

Programs em `programs/*.yml` são pipelines executáveis pelo `/run-program`. Formato canônico em `policies/programs-schema.md`.

1. **Criar `programs/<nome>.yml`** seguindo o schema:
   - `schema_version: "1.0"`
   - `program: { id, name, version, description, authors }`
   - `requires:` (opcional — kit_version, commands, skills, policies)
   - `inputs:` (parâmetros pedidos via AskUserQuestion)
   - `steps:` (array de command/gate/parallel/conditional)

2. **Validar:**
   ```bash
   node scripts/validate-program.mjs programs/<nome>.yml
   ```
   Deve retornar `✓` antes de commitar.

3. **Criar `programs/<nome>.md`** (descritivo) explicando:
   - When to use / When NOT to use
   - Design decisions (por que esses gates, esse parallel, esse conditional)
   - Difference vs other programs
   - Notes / handoff

4. **Registrar em `programs/README.md`** na tabela Index com links pros 2 arquivos.

5. **Eval coverage opcional** em `evals/programs/<nome>/golden.json` (3+ cases cobrindo happy path, gate rejection, missing input).

6. **CHANGELOG + bump semver:**
   - `MINOR` se program novo
   - `PATCH` se ajuste em program existente

Exemplos (v1.6.0): `pipeline-discovery.yml`, `spec-driven-development.yml`, `loop-polishing.yml`, `detective-spec.yml`.

---

## Adicionando um subagent

Subagents ficam em `.claude/agents/` e seguem o formato de frontmatter do Claude Code.

1. **Crie `.claude/agents/nome.md`** com o frontmatter obrigatório:
   ```markdown
   ---
   name: nome-do-agent
   description: Descrição clara do que o agent faz e quando deve ser invocado
   tools: Read, Grep, Glob, Bash   ← somente tools necessárias
   model: sonnet                    ← sonnet | opus | haiku
   ---

   # Nome do Agent

   [Prompt do agent aqui — seja específico sobre processo e output]
   ```

2. **Registre no `plugin.json`**:
   ```json
   ".claude/agents/nome.md"
   ```

3. **Documente em `AGENTS.md`** — adicione uma linha na tabela de subagents.

4. **Rode o check de consistência** e adicione entrada no `CHANGELOG.md`.

**Boas práticas:**
- Mantenha o prompt sob 2.000 chars — referencie `personas/` ou `skills/` por link em vez de duplicar
- Defina `tools:` com mínimo privilégio — test-engineer precisa de Edit/Write, code-reviewer não
- Use `model: opus` apenas para orchestrator — o custo é alto

---

## Editando hooks

Os hooks ficam em `hooks/scripts/`. Cada arquivo `.mjs` é um hook Node.js.

- **Não altere `hooks/hooks.json`** sem atualizar o `install.sh` junto
- Teste localmente com `node hooks/scripts/nome-do-hook.mjs`
- Hooks são copiados para `.bot/hooks/` pelo instalador

---

## Checklist antes de abrir PR

```
[ ] node scripts/check-consistency.mjs passa sem erros
[ ] node --check scripts/auto-loop.mjs (se editou o script)
[ ] plugin.json parseia como JSON válido
[ ] Todas as referências em plugin.json existem no disco
[ ] README.md atualizado (tabela de skills/commands se necessário)
[ ] CHANGELOG.md atualizado na seção [Unreleased]
[ ] Commit segue as convenções abaixo
```

---

## Convenções de commit

Use [Conventional Commits](https://www.conventionalcommits.org/):

| Tipo | Quando usar |
|------|-------------|
| `feat:` | Nova skill, command, hook ou feature |
| `fix:` | Correção de bug em skill, script ou config |
| `docs:` | Mudança em README, guias, CHANGELOG |
| `refactor:` | Reorganização sem mudança de comportamento |
| `chore:` | Manutenção (deps, CI, scripts de build) |

**Exemplos:**
```
feat: add skill 33-design-tokens
fix: corrigir stall detection no auto-loop.mjs
docs: adicionar guia de context engineering
```

---

## Dúvidas?

Abra uma [issue](https://github.com/felvieira/claude-skills-fv/issues) descrevendo o que quer adicionar ou corrigir.
