---
description: Importa learned-skills de um JSON exportado (adaptado de affaan-m/ECC)
argument-hint: "<in.json> [--scope=project|global] [--overwrite]"
---

# /instinct-import — Trazer Instincts pra Cá

**Objetivo:** Importar bundle JSON gerado por `/instinct-export` pra `.bot/learned-skills/` do repo atual (ou global).

**Quando usar:**
- após `/instinct-export` em outra máquina/projeto
- restore de backup
- aplicar instincts curadas por outra pessoa do time
- bootstrap de repo novo com instincts pré-validados

**Quando NÃO usar:**
- importar 1 arquivo `.md` — copia direto
- ainda não tem o bundle JSON (rode `/instinct-export` primeiro)

**Inputs:**
- `<in.json>` (obrigatório) — bundle no formato exportado pela skill
- `--scope=project` (default) escreve em `.bot/learned-skills/` do repo
- `--scope=global` escreve em `~/.claude/.bot/learned-skills/`
- `--overwrite` sobrescreve instincts existentes com mesmo slug (default: skip)

**Output:** contagem de imported/skipped + path do diretório destino.

**Comando real:**
```bash
node scripts/instinct.mjs import ./instincts-bundle.json --scope=project
# overwrite:
node scripts/instinct.mjs import ./instincts-bundle.json --overwrite
```

**Segurança:** o import respeita `policies/persistence.md → Segurança` — bundles contendo API keys, PII ou secrets devem ser rejeitados manualmente. Esta skill **não** valida conteúdo automaticamente (responsabilidade do exportador).

**Adaptado de:** [ECC](https://github.com/affaan-m/ECC) `/instinct-import` (MIT).

Cross-refs: `/instinct-export`, `/instinct-promote`, `policies/memory-tiers.md`.
