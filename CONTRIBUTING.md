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
├── commands/         ← slash commands (/spec, /plan, /build, /loop, ...) — autodiscovery
├── agents/           ← subagents despacháveis via Task tool — autodiscovery
├── policies/         ← regras compartilhadas entre skills
├── programs/         ← pipelines declarativos YAML (.yml) + descritivos (.md)
├── personas/         ← personas de output estruturado
├── hooks/            ← hooks PreToolUse / PostToolUse / SessionStart / Stop / UserPromptSubmit
│   ├── scripts/      ← cada hook é um .mjs Node
│   ├── hooks.json    ← registro canônico dos hooks por evento
│   └── config.json   ← defaults + perfis (minimal/standard/strict)
├── evals/            ← fixtures versionados (triggers/, commands/, programs/)
├── docs/skill-guides/← guias operacionais (skill-discovery, autonomous-loop, ...)
├── scripts/          ← utilitários (auto-loop.mjs, check-consistency.mjs, eval-triggers.mjs, ...)
├── mcp-server/       ← servidor MCP TypeScript (expõe 37 tools)
├── setup/            ← instalador (install.sh) e configs de plataforma
└── templates/        ← templates de handoff, plano, review, rejeição
```

> **Autodiscovery (desde v1.5.2):** o plugin descobre skills, commands e agents pelos
> diretórios `skills/`, `commands/` e `agents/` automaticamente. **Não** existe array
> de registro em `.claude-plugin/plugin.json` — basta criar o arquivo no diretório certo.

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

3. **Crie o fixture de eval** em `evals/triggers/NN-nome-da-skill.json` com `should_trigger` (≥10 prompts que devem ativar) e `shouldnt_trigger` (≥5 que não devem). Rode `node scripts/eval-triggers.mjs` — accuracy do should deve ser ≥80% e do shouldnt ≤20%.

4. **Atualize os contadores** em todos os pontos canônicos: `README.md` + `README.pt-BR.md` (badge + tabela), `docs/WIKI.md` + `docs/WIKI.pt-BR.md` (header), `docs/SKILLS-OVERVIEW.md` (header), `.claude-plugin/plugin.json` (description + version), `mcp-server/package.json`, `CHANGELOG.md`.

5. **Rode os checks** (a skill é autodiscovered — não há registro manual em plugin.json):
   ```bash
   node scripts/check-consistency.mjs
   node scripts/eval-triggers.mjs
   node scripts/skill-health.mjs   # 0 overlaps, 0 dead policies, description rica
   ```

---

## Editando skills existentes

- Edite apenas `skills/NN-nome/SKILL.md`
- Se alterar a seção `## Handoff`, atualize skills dependentes
- Se adicionar `## Persona`, crie o arquivo em `personas/` e referencie o caminho completo
- Rode `node scripts/check-consistency.mjs` antes de commitar

---

## Adicionando slash commands

1. **Crie `commands/nome.md`** com frontmatter (autodiscovered — sem registro manual):
   ```markdown
   ---
   description: Descrição curta do comando
   ---
   ```

2. **Adicione à tabela de slash commands** em **TODOS** os pontos canônicos:
   - `README.md` + `README.pt-BR.md` (tabela na seção de commands)
   - `AGENTS.md` (tabela "Slash Commands")
   - `docs/WIKI.md` + `docs/WIKI.pt-BR.md` (entrada completa formato aihero: what / when / problem / example / takeaway)
   - `docs/SKILLS-OVERVIEW.md` (entrada curta no índice de commands)

3. **Se o command introduz pipeline novo:**
   - criar declarativo em `programs/<nome>.yml` + descritivo `programs/<nome>.md` e registrar em `programs/README.md`
   - atualizar `policies/handoffs.md` com a cadeia canônica
   - se o command tem autoridade sobre outras decisões (tipo `/constitution`): atualizar skills relevantes (`skills/NN-*/SKILL.md`) para consultá-lo

4. **Cobertura de evals:**
   - criar `evals/commands/<nome>/golden.json` com 3-4 casos cobrindo happy path, edge cases, anti-padrões
   - se o command é apoiado por subagent: também `evals/protocol-shells/<subagent>/`

5. **Consistency check** (o command é autodiscovered de `commands/` — sem registro manual):
   - se for um command estrutural, adicionar asserção em `scripts/check-consistency.mjs` validando que `commands/<nome>.md` existe
   - rodar `node scripts/check-consistency.mjs` antes de commitar — deve passar

6. **Bumps semver:**
   - `MAJOR` se removeu/renomeou command existente
   - `MINOR` se é command novo
   - `PATCH` se é só atualização de doc
   - bump em `README.md` (badge), `README.pt-BR.md` (badge), `.claude-plugin/plugin.json`, `mcp-server/package.json`, `docs/SKILLS-OVERVIEW.md` (header)
   - adicionar entrada no `CHANGELOG.md` com seções Added/Changed/Sources

7. **Tag git + GitHub Release** ao mergear em main:
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

Subagents ficam em `agents/` (autodiscovered desde v1.5.2) e seguem o formato de frontmatter do Claude Code.

1. **Crie `agents/nome.md`** com o frontmatter obrigatório:
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
   O plugin descobre o subagent automaticamente — **não** há registro manual em `plugin.json`.

2. **Documente em `AGENTS.md`** — adicione uma linha na tabela de subagents.

3. **Rode o check de consistência** e adicione entrada no `CHANGELOG.md`.

**Boas práticas:**
- Mantenha o prompt sob 2.000 chars — referencie `personas/` ou `skills/` por link em vez de duplicar
- Defina `tools:` com mínimo privilégio — test-engineer precisa de Edit/Write, code-reviewer não
- Use `model: opus` apenas para orchestrator — o custo é alto

---

## Editando hooks

Os hooks ficam em `hooks/scripts/`. Cada arquivo `.mjs` é um hook Node.js. Ao **adicionar** um hook:

1. **Criar `hooks/scripts/nome-do-hook.mjs`** — leia stdin (JSON do payload), nunca bloqueie em erro (`try/catch` + `process.exit(0)`), emita `hookSpecificOutput.additionalContext` (UserPromptSubmit/PostToolUse) ou `systemMessage` (SessionStart) quando precisar falar com o agente.
2. **Registrar em `hooks/hooks.json`** sob o evento certo (`UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `Stop`, `SessionStart`).
3. **Declarar defaults em `hooks/config.json`** numa seção própria (ex: `"meu_hook": { "enabled": true }`) para o user customizar sem editar código.
4. **Adicionar ao perfil `minimal`** em `config.json` (`hook_profiles.profiles.minimal.disabled`) se o hook for "ruidoso" (sugestões/avisos) — o perfil minimal desliga tudo que não é essencial.
5. **Respeitar `isHookDisabled("nome-do-hook")`** no início (usa `utils.mjs`) para honrar perfis e `DEVKIT_DISABLED_HOOKS`.

- Teste localmente: `echo '{"prompt":"..."}' | node hooks/scripts/nome-do-hook.mjs`
- Valide sintaxe: `node --check hooks/scripts/nome-do-hook.mjs`
- Hooks são copiados para `.bot/hooks/` pelo instalador (e `setup/install.sh` precisa conhecer hooks novos)

---

## Checklist antes de abrir PR

```
[ ] node scripts/check-consistency.mjs passa sem erros
[ ] node scripts/eval-triggers.mjs passa (se adicionou/editou skill — should ≥80%, shouldnt ≤20%)
[ ] node scripts/skill-health.mjs limpo (0 overlaps, 0 dead policies, descriptions ricas)
[ ] node --check no script editado (.mjs) — sintaxe válida
[ ] .claude-plugin/plugin.json parseia como JSON válido (version bumpada se necessário)
[ ] Contadores sincronizados (README.md, README.pt-BR.md, WIKI.md, WIKI.pt-BR.md, SKILLS-OVERVIEW.md)
[ ] README.md em inglês, README.pt-BR.md em português (sem vazamento de idioma)
[ ] CHANGELOG.md atualizado com a nova versão
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
