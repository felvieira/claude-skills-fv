---
description: Exporta learned-skills (.bot/learned-skills/) pra JSON portável (adaptado de affaan-m/ECC)
argument-hint: "[out.json] [--scope=project|global] [--min-score=0.5]"
---

# /instinct-export — Portar Instincts pra Fora

**Objetivo:** Exportar instincts (semantic memory, ver `policies/memory-tiers.md`) pra arquivo JSON portável entre máquinas, projetos ou backups.

**Quando usar:**
- antes de wipe / reinstalação
- pra compartilhar instincts de um projeto com outro
- backup periódico
- preparar bundle pra `/instinct-import` em outra máquina

**Quando NÃO usar:**
- exportar 1 instinct específico — copia direto o `.md`
- não há instincts acumulados ainda (score >0)

**Inputs:**
- `out.json` (default: `instincts-bundle.json` na raiz do repo)
- `--scope=project` (default) lê `.bot/learned-skills/` do repo atual
- `--scope=global` lê `~/.claude/.bot/learned-skills/`
- `--min-score=N` filtra (default 0 — exporta tudo)

**Output:** arquivo JSON com schema `{version, exported_at, scope, count, skills:[{slug, meta, body, mtime}]}`

**Comando real:**
```bash
node scripts/instinct.mjs export instincts-bundle.json --scope=project --min-score=0.5
```

**Adaptado de:** [ECC](https://github.com/affaan-m/ECC) `/instinct-export` (MIT). Nosso schema é nativo do formato `.bot/learned-skills/*.md` (ver `policies/memory-tiers.md` — score 0-1, decay semanal).

Cross-refs: `/instinct-import`, `/instinct-promote`, skill 30 (cost-tracker), skill 35 (skill-author).
