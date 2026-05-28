# Memory Curator (auto-lapidação disparada por inatividade)

> **Inspiração:** [`curator.py` de nousresearch/hermes-agent](https://github.com/nousresearch/hermes-agent) (MIT, "the agent that grows with you"). O Hermes roda um curador de memória **disparado por inatividade** que forka um agente auxiliar para revisar/consolidar/arquivar skills criadas pelo próprio agente. Esta policy adapta o **gatilho** (não a autonomia total) para o kit.

## Objetivo

Garantir que a memória do kit **se lapide sozinha ao longo do tempo** em vez de acumular duplicatas, fatos stale e learned-skills de score baixo. Complementa `policies/memory-consolidation.md` (que define **o que** consolidar) adicionando **quando** disparar.

## A diferença entre as duas policies

| Policy | Pergunta que responde |
|--------|----------------------|
| `memory-consolidation.md` | **O que** limpar (duplicatas, stale, score baixo) e **como** (snapshot→dry-run→apply) |
| `memory-curator.md` (esta) | **Quando** disparar a consolidação automaticamente |

## O gatilho (inactivity-triggered, não cron)

Igual ao Hermes, **não** usamos daemon cron. O nudge dispara no evento **Stop** (fim de sessão) quando **ambas** as condições são verdadeiras:

1. **Vault cresceu o suficiente** desde a última consolidação (`min_files_since_last`, default 30 arquivos)
2. **Faz tempo demais** desde a última consolidação (`min_days_since_last`, default 7 dias)

Ambas (AND, não OR) — precisão > cobertura. Um vault que cresceu muito mas foi consolidado ontem não precisa de nudge; um vault parado há 30 dias mas que não cresceu também não.

Hook responsável: `hooks/scripts/memory-curator-nudge.mjs`. Config em `hooks/config.json → memory_curator`.

## O que o nudge NÃO faz (limites de segurança)

Diferente do Hermes (que forka um agente autônomo), o nosso curator é **não-autônomo por design**:

- ❌ **Não forka agente** que mexe na memória sozinho — risco de autonomia sobre memória sem revisão humana
- ❌ **Não deleta nada** — só **sugere** rodar `/consolidate-memory`, que por sua vez nunca deleta (só arquiva)
- ❌ **Não bloqueia** o Stop — é `systemMessage` não-vinculante
- ✅ **Throttle** de 1 nudge / `nudge_throttle_hours` (default 24h) — não spama

Se no futuro quisermos o curator autônomo total (nível 3), seria uma policy/feature separada com gates explícitos.

## O ciclo de vida do `.curator-state.json`

Guardado na raiz do vault (`D:/claude-memory/.curator-state.json`):

```json
{
  "last_consolidated_at": "2026-05-28T13:00:00.000Z",
  "files_at_last": 1204
}
```

- **Lido** pelo nudge para calcular `grewBy` e `daysSince`
- **Escrito** pelo `/consolidate-memory` no passo final (Report) — registra o timestamp e a contagem de arquivos pós-consolidação

Sem esse write, o nudge dispararia para sempre (sempre veria `last_consolidated_at: null`). Por isso o `/consolidate-memory` **deve** atualizar o state ao concluir.

## Lifecycle de learned-skills (espelhando o Hermes)

O Hermes auto-transiciona skills `active → stale (30d) → archived (90d)`. No kit isso já existe via score+decay (`learned_skills_scoring` em config.json: `decay_per_week: 0.1`, `archive_threshold: 0.3`). O curator apenas **lembra de aplicar** rodando o `/consolidate-memory`, que executa:

- Score < 0.3 e idade > 30d → archive
- Score ≥ 0.8 e 5+ usos → promote para semantic tier
- Triggers conflitantes → resolve

## Anti-padrões

- ❌ Nudge em vault pequeno/recém-limpo (treina o user a ignorar avisos)
- ❌ Disparar por OR em vez de AND (cresceu OU antigo) → ruído
- ❌ Consolidar automaticamente sem o snapshot+dry-run do `/consolidate-memory`
- ❌ Esquecer de escrever `.curator-state.json` → nudge eterno

## Integração

- `hooks/scripts/memory-curator-nudge.mjs` — o gatilho
- `commands/consolidate-memory.md` — a ação sugerida (escreve o state ao concluir)
- `policies/memory-consolidation.md` — o que/como consolidar
- `policies/memory-tiers.md` — a estrutura 4-tier que está sendo mantida
- `policies/self-correcting-sensors.md` — filosofia de sensores conservadores
