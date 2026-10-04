---
description: Gera dashboard de saúde do portfolio de skills (description quality, eval accuracy, overlaps) (adaptado de affaan-m/ECC)
argument-hint: "[--out=docs/skill-health.md]"
---

# /skill-health — Dashboard do Portfolio de Skills

**Objetivo:** Gerar visão agregada do portfolio (42+ skills, 15+ subagents, 33+ commands) com flags de saúde:
- description curtas (<80 chars) — provavelmente não disparam bem
- skills sem "Trigger em:" explícito no description
- skills sem fixture em `evals/triggers/` (cobertura de detecção)
- skills com eval accuracy <70% (gatilho fraco ou overlap)
- triggers compartilhados entre skills (overlap → revisar)

**Quando usar:**
- antes de release menor (v2.X.0) — checar saúde geral
- ao notar skills "que não disparam quando deviam" — confirmar via accuracy
- como input pra skill 35 (skill-author) decidir o que refinar
- mensalmente como hygiene routine

**Quando NÃO usar:**
- portfolio menor que ~10 skills — overhead não compensa
- após editar 1 skill isoladamente (rode eval-triggers.mjs direto)

**Inputs:**
- `--out=docs/skill-health.md` (default)

**Output:** `docs/skill-health.md` regenerado com:
- sumário (counts)
- 5 flags (curtas, sem triggers, sem evals, low accuracy, overlaps)
- top 10 skills por description quality
- ações sugeridas (links pra `/humanize`, skill 35, eval-triggers)

**Uso real (complemento):** `/skill-health` só olha o texto das skills. Para saber quais foram chamadas de fato, rode `node scripts/skill-usage.mjs --root <pasta com seus projetos>` (lê `.auto/events.jsonl`, que o `session-event-logger` já grava). Skill nunca chamada é sinal para rever descrição/gatilho, não para apagar — e skills injetadas por hook não passam pela tool `Skill`.

**Comando real:**
```bash
node scripts/skill-health.mjs
# saída: docs/skill-health.md
```

**Encaixe:**
- skill 35 (skill-author) consome o report pra priorizar refactors
- `/humanize` reescreve descriptions fracas detectadas
- `scripts/eval-triggers.mjs` (v2.12.1) gera as fixtures que esta skill consome
- `policies/skill-manifest.md` define o formato canônico que a saúde mede

**Adaptado de:** [ECC](https://github.com/affaan-m/ECC) `/skill-health` (MIT). Nosso ganho: integração direta com `evals/triggers/*.jsonl` (já existente desde v2.12.1) e detecção de overlap nativa.

Cross-refs: skill 35 (skill-author), `/humanize`, `scripts/eval-triggers.mjs`, `policies/skill-manifest.md`.
