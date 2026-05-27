---
description: Promove instinct de project-scope pra global-scope (~/.claude/.bot) (adaptado de affaan-m/ECC)
argument-hint: "<slug> [--from=project --to=global]"
---

# /instinct-promote — Promover Instinct Entre Escopos

**Objetivo:** Promover um instinct do escopo do projeto (`.bot/learned-skills/`) pro escopo global (`~/.claude/.bot/learned-skills/`), tornando-o disponível em **todos os projetos** automaticamente.

**Quando usar:**
- instinct atingiu score ≥ 0.8 e é **genérico** (não amarrado ao projeto atual)
- padrão útil descoberto num projeto e aplicável em outros (ex: "preferência por kebab-case em test files")
- antes de eventualmente promover pra `skills/NN-name/SKILL.md` formal via skill 35

**Quando NÃO usar:**
- instinct específico do domínio do projeto (não generaliza)
- score < 0.5 (ainda não validado o suficiente — ver `policies/memory-tiers.md`)
- já existe instinct global com mesmo slug (use `/instinct-import --overwrite` se intenção for substituir)

**Inputs:**
- `<slug>` (obrigatório) — nome do `.md` em `.bot/learned-skills/` sem extensão
- `--from=project` (default) — origem
- `--to=global` (default) — destino

**Output:** copia o `.md` pro destino, anota `promoted_from:` + `promoted_at:` no frontmatter. **Não deleta** o original (decisão manual do user).

**Comando real:**
```bash
node scripts/instinct.mjs promote use-fix-test-name-pattern --from=project --to=global
```

**Fluxo recomendado (memory-tiers.md):**
```
.bot/learned-skills/<slug>.md  (score 0.5)
   ↓ (uso confirmado várias vezes, score sobe)
.bot/learned-skills/<slug>.md  (score ≥ 0.8)
   ↓ /instinct-promote (este comando)
~/.claude/.bot/learned-skills/<slug>.md  (global, disponível em todo projeto)
   ↓ se atingir generalidade total, skill 35 formaliza
skills/NN-<nome>/SKILL.md  (procedural, parte do kit)
```

**Adaptado de:** [ECC](https://github.com/affaan-m/ECC) `/instinct-promote` (MIT). Nosso fluxo de promoção é detalhado em `policies/memory-tiers.md`.

Cross-refs: `/instinct-export`, `/instinct-import`, skill 35 (skill-author), `policies/memory-tiers.md`.
