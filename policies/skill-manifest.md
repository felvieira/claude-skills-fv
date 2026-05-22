# Skill Manifest v2

## Objetivo

Permitir que skills carreguem **metadados estruturados** (version, author, compatibility, requires) além do `name` + `description` que o kit já lia. Habilita:

1. Skills publicáveis por **terceiros** sem fork do repo
2. Validação de **compatibilidade** entre skill e versão do kit
3. **Dependências declaradas** entre skills (`requires`)
4. Auditoria de quem é autor de uma skill no `.bot/` instalado

Convenção absorvida de [bytedance/deer-flow](https://github.com/bytedance/deer-flow) 2.0 (MIT), que aceita `.skill` archives com frontmatter padronizado quando instalados via Gateway.

## Backward compatibility

Skills atuais (sem os campos novos) **continuam válidas**. Todos os campos v2 são `?` (opcionais) em `SkillMeta`. `file-reader.ts::listSkills()` parsea o frontmatter via `gray-matter`; campos ausentes ficam `undefined`.

## Frontmatter completo (v2)

```yaml
---
name: po-feature-spec
description: |
  Skill do Product Owner para especificação de features. Use quando precisar
  definir requisitos de negócio, escrever user stories...
  Trigger em: "nova feature", "especificação", "user story", ...
# ─── v1 fields (kept) ──────────────────────────────────────────────────────
argument-hint: "[feature_name]"
allowed-tools: [Read, Write, Edit]
# ─── v2 fields (new, all optional) ─────────────────────────────────────────
version: 1.2.0           # semver
author: felvieira
compatibility: ">=2.10.0" # kit version constraint
requires:                 # other skill ids this one depends on
  - 18-repo-auditor
  - 09-orchestrator
---
```

## Campos v2 — contrato

### `version`
- **Tipo:** semver string (`"1.0.0"`, `"1.2.0-beta.1"`)
- **Default:** `undefined` (skill não versionada)
- **Uso interno:** logs, debugging, decisão de upgrade
- **Validação:** soft (warning se mal-formado, não bloqueia)

### `author`
- **Tipo:** string livre
- **Convenção:** `"felvieira"` (single), `"ByteDance Inc."` (org), `"contributor@github"` (handle)
- **Default:** `undefined`
- **Uso:** atribuição no `/savings` quando relevante, e em PRs de skill de terceiros

### `compatibility`
- **Tipo:** semver range (`">=2.10.0"`, `"^2.10"`, `">=2.10 <3.0"`)
- **Default:** `undefined` (assume compatibilidade universal)
- **Uso:** skill 35 (Skill Author) avisa se a skill declara incompatibilidade com o kit instalado
- **Validação:** quando presente, comparado contra `plugin.json::version`

### `requires`
- **Tipo:** array de skill ids (`["18-repo-auditor", "09-orchestrator"]`)
- **Default:** `undefined`
- **Uso:** orchestrator (09) pode pré-aquecer skills declaradas antes de invocar a primária; loader detecta ciclos
- **Validação:** ids inexistentes geram warning na listagem

## Quando preencher

| Cenário | version | author | compatibility | requires |
|---|---|---|---|---|
| Skill nova do core (39 oficiais) | opcional | opcional | opcional | opcional |
| Skill de terceiro publicada | **obrigatório** | **obrigatório** | **obrigatório** | quando aplicável |
| Skill que troca contrato (breaking) | **obrigatório** (bump) | recomendado | **obrigatório** | — |
| Skill que herda comportamento de outra | recomendado | opcional | opcional | **obrigatório** |

## Como ler em código

```ts
import { listSkills } from "./services/file-reader.js";

const skills = await listSkills();
for (const s of skills) {
  if (s.version)       console.log(`${s.id}@${s.version}`);
  if (s.author)        console.log(`  by ${s.author}`);
  if (s.compatibility) console.log(`  kit ${s.compatibility}`);
  if (s.requires)      console.log(`  needs ${s.requires.join(", ")}`);
}
```

## Como validar um manifest

Skill 35 (Skill Author) ganha **modo `validate`**:

```bash
# Pseudo-comando, a ser exposto via MCP tool em iteração futura
node scripts/validate-skill.mjs skills/01-po-feature-spec/
```

Checks atuais:
- `version` é semver válido
- `compatibility` é semver range válido
- Todos os ids em `requires` existem no kit instalado
- Sem ciclos no grafo de `requires`

## Anti-padrões

| Anti-padrão | Por que evita |
|---|---|
| Preencher `requires` com **policies** ou **commands** | `requires` é só pra outras skills (SKILL.md). Policies já são lidas via governance |
| `version: "latest"` ou `"stable"` | Não é semver. Use `1.0.0` |
| `compatibility: "*"` | Equivale a omitir. Omita |
| `author: "Claude"` ou `"AI"` | Atribuição é pra humano ou org responsável, não modelo |
| Bump de `version` sem changelog na skill | Quem instala depois não sabe o que mudou |

## Roadmap

- v2.10.0: parsing + tipo (este doc)
- v2.11.x: skill 35 ganha `validate` mode
- v2.12.x: MCP tool `devkit_validate_skill` exposta
- v3.x: `.skill` archive format pra publicação externa (alinhado com DeerFlow)

## Referências cruzadas

- `mcp-server/src/types.ts` — interface `SkillMeta`
- `mcp-server/src/services/file-reader.ts` — parser
- `policies/progressive-skill-loading.md` — quando carregar
- `skills/35-skill-author/SKILL.md` — autor de skills novas
- DeerFlow upstream: README.md → "Skills are loaded progressively..." + `.skill` archive frontmatter
