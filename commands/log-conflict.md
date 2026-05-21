---
description: Registra uma resolução de trade-off entre policies/sensors em .bot/conflict-decisions.jsonl (telemetria v2.7.1+). Wrapper trivial sobre scripts/log-conflict-decision.mjs para reduzir fricção de chamada.
argument-hint: "--conflict A.md,B.md --resolution case-N|hierarchy|ad-hoc --outcome applied|reverted|pending [--user-consulted true] [--context \"...\"]"
allowed-tools: Bash(node:*)
---

# /log-conflict — Registrar decisão de trade-off

**Objetivo:** baixar a fricção de gravar uma resolução de conflito. Sempre que `policies/trade-off-resolution.md` resolveu um conflito (caso 1-5, hierarquia, ou ad-hoc com user), chame este comando.

Sem esse registro, `/savings --since 7d` não consegue mostrar a saúde do sistema de resolução, e conflitos recorrentes nunca viram Casos Resolvidos novos.

## Quando chamar

| Situação | Chamar? |
|---|---|
| Aplicou Caso 1-5 de `trade-off-resolution.md` | ✅ Sim — `--resolution case-N-canonical` |
| Resolveu via hierarquia (constitution > GLOBAL > policies > skills > templates) | ✅ Sim — `--resolution hierarchy` |
| Perguntou ao user via `AskUserQuestion` | ✅ Sim — `--resolution ad-hoc --user-consulted true` |
| Conflito sintético / teste / discussão hipotética | ❌ Não |

## Exemplos

### Caso 1 aplicado (dense-output vs token-efficiency)

```bash
/log-conflict \
  --conflict "token-efficiency.md,dense-output-mode.md" \
  --resolution "case-1-canonical" \
  --outcome "applied"
```

### Hierarquia aplicada (constitution venceu)

```bash
/log-conflict \
  --conflict "memory/constitution.md,policies/stack-flexibility.md" \
  --resolution "hierarchy" \
  --outcome "applied" \
  --context "constitution exige TS strict; stack-flexibility sugeriria adaptar"
```

### Ad-hoc com user

```bash
/log-conflict \
  --conflict "policies/source-driven.md,GLOBAL.md" \
  --resolution "ad-hoc" \
  --user-consulted true \
  --outcome "user_chose_senior_override" \
  --context "smell óbvio em src/auth.ts:42 — user optou por senior override"
```

### Outcome reverted (sinal de calibragem)

```bash
/log-conflict \
  --conflict "policies/A.md,policies/B.md" \
  --resolution "case-2-canonical" \
  --outcome "reverted" \
  --context "user reverteu no turno seguinte — caso 2 não cobre esta variante"
```

## O que registra

Append em `.bot/conflict-decisions.jsonl` (uma linha por decisão):

```jsonc
{
  "ts": "2026-05-21T18:42:11.123Z",
  "conflict": ["policy-A.md", "policy-B.md"],
  "resolution": "case-1-canonical",
  "outcome": "applied",
  "user_consulted": false,
  "context": "..."
}
```

Best-effort. Fail-open. Nunca bloqueia o modelo.

## Como `/savings` consome (v2.7.1+)

```
🤝 Trade-off Resolution (--since 7d)
   Total conflitos: 14
   Auto-resolvidos: 11 (78%)
   User-escalados:   3 (21%)
   ⚠ Reverted:       1 (recalibrar caso 2)
   Top recorrentes:
     - token-efficiency.md vs dense-output-mode.md (5x) ← candidato a Caso novo
```

## Referências

- `policies/trade-off-resolution.md` — hierarquia + 5 Casos Resolvidos
- `scripts/log-conflict-decision.mjs` — implementação
- `policies/savings-metrics.md` — como `/savings` agrega
- `hooks/scripts/conflict-resolution-reminder.mjs` — sensor que lembra de chamar este comando
