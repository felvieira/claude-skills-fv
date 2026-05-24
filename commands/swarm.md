---
description: Modo de autonomia total — do prompt ao PR mergeable. Worktree isolado + Ralph loop (fresh context per story) + 4-agent paralelo review + self-fix CRITICAL/HIGH + auto PR. Sem intervenção humana (a não ser que algo crítico exija).
---

# /swarm — Total Autonomy: Prompt → PR

**Em uma frase:** você dá uma feature → kit cria worktree, PRD, implementa story-by-story com contexto fresco, revisa em paralelo (4 agentes), fixa CRITICAL/HIGH automático, abre PR com synthesis no comment.

**Inspiração:** Ralph loop + fix-github-issue + comprehensive-review do [coleam00/archon](https://github.com/coleam00/archon), combinados num único pipeline com isolation total.

## Quando usar

- "Implementar feature X" — você quer voltar pra PR pronto
- "Fix issue #42" — pega issue, implementa, abre PR
- "Refatorar módulo Y de forma segura" — com behavior preservation
- Overnight runs / CI / "manda e esquece"

## Quando NÃO usar

- Task pequena (typo, format) → `/auto` é suficiente
- Exploração de design / discovery vaga → `/run-program pipeline-discovery`
- Greenfield app do zero → `/run-program adversarial-dev`
- Quer controle granular passo-a-passo → `/loop` ou `/run-program spec-driven-development`
- Working tree atual tem mudanças não-commitadas → **bloqueado** (crie commit ou stash antes)

## Pré-requisitos

- `git` + `gh` (GitHub CLI autenticado) — `/swarm` cria PR
- Working tree limpo (sem `git status` pendente no branch atual)
- Node 18+ (executor é Node)
- Constituição opcional (`memory/constitution.md`) — respeitada se existir

## Modos de execução

### Manual (default)
```
/swarm "implementar autenticação social com Google + GitHub"
```
- Roda 7 phases
- **Pausa em gates críticos** (review humano pode override findings antes do PR)
- Termina em PR aberto

### Autonomous (Nível 3 do intent-classifier)
Configure `~/.claude/dev-team-kit-config.json`:
```jsonc
{
  "intent_classifier": { "autonomous": true }
}
```

Então o hook **sugere `/swarm` automaticamente** quando detecta intent de feature, e `/swarm` roda com `--auto-yes` implícito (zero gates).

### Com issue do GitHub
```
/swarm fix #142
/swarm implementar issue #87
```

### Com PRD existente
```
/swarm --prd docs/prd/auth-social.md
```

## Flags

- `--max-stories <N>` — max stories por run (default: 10)
- `--max-iter-per-story <N>` — max iterações por story (default: 5)
- `--auto-yes` — pula gates humanos (use só em CI ou Nível 3 Autonomous)
- `--auto-merge` — ⚠ merge automático se CI passou (default: false; recomendado: nunca)
- `--skip-review` — pula Phase 3 (quality gates). Útil pra prototype rápido.
- `--skip-self-fix` — pula Phase 5 (só reporta, não fixa)
- `--dry-run` — mostra plano (worktree, stories esperadas, agents) sem executar
- `--resume <run-id>` — retoma run anterior que parou (procura em `.swarm/<id>/`)

## Processo (7 phases)

Ver [`policies/swarm-protocol.md`](../policies/swarm-protocol.md) para detalhes.

| Phase | Tipo | O que faz |
|---|---|---|
| 0. Setup | bash | Cria worktree isolado, detecta tools (npm/cargo/etc) |
| 1. PRD/Stories | AI (fresh) | Gera PRD + parseia stories. Ou lê issue/PRD existente. |
| 2. Ralph Loop | AI loop (fresh per story) | Implementa story → valida → próxima. Circuit-breaker 3x. |
| 2.5. Visual Assets (opcional) | AI (skill 17) | Se PRD/stories mencionam landing/sistema/UI nova → despacha skill 17 pra gerar hero/icones/OG cards. Regra default: grok-imagine (t2i) / gemini-25-flash (edit). |
| 3. Quality Gates | parallel (4 agents, fresh cada) | code-reviewer + security + tests + anti-ai-writing |
| 4. Synthesize | AI (fresh) | Agrega reviews em decision matrix (CRITICAL/HIGH/MEDIUM/LOW) |
| 5. Self-Fix | AI (per finding) | Auto-aplica fixes CRITICAL/HIGH. Re-roda validation. |
| 6. PR | bash | Rebase main + push + gh pr create + comment synthesis |
| 7. Report | bash | Resumo + paths dos artifacts + worktree status |

### Phase 2.5 — Visual Assets (quando aplicável)

Aciona **skill 17 (`image-generator`)** quando o PRD/stories contém uma das condições:
- Landing page nova
- Sistema/app novo (sem assets pré-existentes)
- Story que menciona "hero image", "ilustração", "favicon", "OG card", "icone"
- Repo recém-criado (sem `public/images/` populado)

Não aciona quando:
- Feature backend-only (API, DB, jobs)
- Repo já tem linguagem visual estabelecida (skill 17 só deriva, não inventa)
- Story menciona apenas componentes UI (sem imagem dentro)

Default automático (skill 17 aplica): **grok-imagine pra text-to-image** (~$0.020/img), **gemini-25-flash pra edit** (~$0.039/img). Ver [`skills/17-image-generator/SKILL.md → Regra Default`](../skills/17-image-generator/SKILL.md).

## Output esperado

```
✅ Swarm run completed
   Run ID: 2026-05-19T15-30-22-auth-social
   Worktree: .swarm/2026-05-19T15-30-22-auth-social/workspace
   Branch:   swarm/auth-social

   Phases executed:
   ✓ 0. Setup           (2s)
   ✓ 1. PRD/Stories     (45s)   5 stories detected
   ✓ 2. Ralph Loop      (8m12s) 5/5 stories DONE, 0 aborted
   ✓ 3. Quality Gates   (2m45s) 4 agents parallel
   ✓ 4. Synthesize      (30s)   3 CRITICAL, 5 HIGH, 4 MEDIUM, 8 LOW
   ✓ 5. Self-Fix        (1m20s) 8 fixes applied (3 CRITICAL + 5 HIGH)
   ✓ 6. PR              (5s)    PR #142 created
   ✓ 7. Report          (1s)

   PR: https://github.com/felvieira/projeto/pull/142
   Synthesis comment: https://github.com/felvieira/projeto/pull/142#issuecomment-...

   Worktree: KEPT — run `git worktree remove .swarm/2026-05-19T15-30-22-auth-social/workspace` to clean up
   Logs:     .swarm/2026-05-19T15-30-22-auth-social/log.jsonl
```

## Anti-padrões (também em swarm-protocol.md)

- Rodar com working tree dirty → bloqueado
- `--auto-merge` sem CI verde → recipe pra disaster
- `--skip-review` + `--auto-merge` → never
- Loop sem `max_iter_per_story` → infinito
- Spawn de stories em paralelo (não-Ralph) → race condition no git

## Cleanup

Worktree NUNCA é deletado automático no fim. Você decide:

```bash
# Após PR mergeado:
git worktree remove .swarm/<run-id>/workspace
rm -rf .swarm/<run-id>

# Ou cleanup de tudo > 30 dias:
find .swarm -maxdepth 1 -type d -mtime +30 -exec git worktree remove --force {} \;
find .swarm -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;
```

## Configuração via user-wide

Em `~/.claude/dev-team-kit-config.json`:
```jsonc
{
  "swarm": {
    "max_stories_per_run": 10,
    "max_iter_per_story": 5,
    "circuit_breaker_threshold": 3,
    "auto_merge": false,
    "auto_cleanup_worktree": false,
    "review_agents": ["code-reviewer", "security-auditor", "test-engineer", "anti-ai-writing"],
    "self_fix_severity": ["critical", "high"]
  }
}
```

## Policies relevantes

- [`policies/swarm-protocol.md`](../policies/swarm-protocol.md) — protocolo canônico
- [`policies/verification-before-completion.md`](../policies/verification-before-completion.md) — cada phase produz output verificável
- [`policies/quality-gates.md`](../policies/quality-gates.md) — review respeita constituição
- [`policies/anti-ai-writing.md`](../policies/anti-ai-writing.md) — anti-ai agent aplica os 29 padrões
- [`policies/auto-orchestration.md`](../policies/auto-orchestration.md) — quando hook auto-sugere /swarm

## Handoff

- **PR criado** → você revisa + merge manualmente (ou `auto_merge: true` se confiar no CI)
- **Aborted** (3+ stories falharam) → relatório lista quais; você decide retomar (`--resume`) ou abortar
- **Cleanup** → manual via `git worktree remove`

## Diff vs `/auto`, `/loop`, `/run-program`

Ver tabela completa em `policies/swarm-protocol.md` → "Diff vs alternativas".

**TL;DR:**
- `/auto` = task pequena, prompt-based, sem worktree
- `/loop` = task média, subprocess, worktree opcional, sem PR
- `/run-program <X>` = pipeline declarativo com gates (controle)
- `/swarm` = **autonomy total** com PR no fim (manda e esquece)

**Uso:**
```
/swarm "implementar auth social"
/swarm fix #142
/swarm --prd docs/prd/foo.md --auto-yes
/swarm --resume 2026-05-19T15-30-22-auth-social
```
