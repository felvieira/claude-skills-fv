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

3. **Adicione à tabela de slash commands** no `README.md`, `AGENTS.md` e `docs/skill-guides/skill-discovery.md`

4. **Rode o check de consistência** e adicione entrada no `CHANGELOG.md`

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
