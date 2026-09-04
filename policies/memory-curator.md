# Memory Curator (auto-lapidação autônoma de memória)

> Este é o motor de curadoria do **backend nativo** do kit. Quando o backend
> [`ai-memory`](https://github.com/akitaonrails/ai-memory) está ativo (Docker
> disponível), este curador se desliga sozinho — os dois nunca rodam em
> paralelo. Ver [`policies/memory-backends.md`](memory-backends.md) para os
> dois backends lado a lado e o mecanismo mutuamente exclusivo.

> **Inspiração:** [`curator.py` de nousresearch/hermes-agent](https://github.com/nousresearch/hermes-agent) (MIT, "the agent that grows with you"). O Hermes roda um curador **disparado por inatividade** que forka um agente auxiliar para revisar/consolidar/arquivar a memória. Esta policy adapta a ideia ao runtime do kit (markdown dentro do Claude Code), mantendo a autonomia mas evitando gastar LLM em dobro.

## Objetivo

A memória do kit **se lapida sozinha** — o usuário nunca decide quando. Manutenção de memória é tarefa de fundo: acumular duplicatas, fatos stale e learned-skills de score baixo degrada o contexto injetado no SessionStart. O curador resolve isso autonomamente.

## A sacada: divisão mecânico × semântico (sem forkar LLM)

O Hermes forka um agente auxiliar (gasta um LLM separado) para curar. No nosso runtime isso seria **gastar a assinatura duas vezes** — o LLM já está presente (a própria sessão). Então dividimos o trabalho:

| Camada | Quem faz | Quando | Custo LLM |
|--------|----------|--------|-----------|
| **Mecânica** (decay de score, archive <0.3+idade, dedup exato por hash, fix backlinks) | `memory-curator.mjs` em **JS puro** | async no SessionStart | **zero** |
| **Semântica** (merge de logs parecidos-mas-não-idênticos, consolidação por significado) | o **agente da sessão atual** | quando lê `.curator-pending.md` | **zero extra** (já pago) |

O script **detecta** candidatos semânticos e grava em `.curator-pending.md`; o `session-start.mjs` injeta isso como contexto pro agente já presente resolver. Forkar `claude -p` seria anti-padrão — queimaria tokens novos pra fazer o que o agente faz de graça.

## O gatilho (inactivity-triggered, não cron, autônomo)

Igual ao Hermes, **não** usamos daemon cron. O curador dispara **async (detached/unref)** no evento **SessionStart** — nunca bloqueia o início da sessão. Ele só age quando o vault está "sujo": **ambas** as condições verdadeiras:

1. **Vault cresceu** ≥ `min_files_dirty` arquivos desde a última curadoria (default 30)
2. **Faz** ≥ `min_days_dirty` dias desde a última (default 7)

AND, não OR — precisão > cobertura. Vault que cresceu mas foi curado ontem não roda; vault parado há 30 dias mas sem crescimento também não.

Hook disparador: `hooks/scripts/session-start.mjs` (spawn). Motor: `hooks/scripts/memory-curator.mjs`. Config em `hooks/config.json → memory_curator`.

## O que é autônomo vs o que pede julgamento

**Autônomo (roda sozinho, sem perguntar):**
- ✅ Decay de score em learned-skills (`-decay_per_week` por semana ociosa)
- ✅ Archive de learned-skills com score < `score_archive_threshold` E idade > `score_archive_age_days`
- ✅ Dedup de logs com conteúdo **idêntico** (hash normalizado) — mantém o mais antigo
- ✅ Snapshot do vault antes de qualquer mutação

**Delegado ao agente (precisa de julgamento, vai pro `.curator-pending.md`):**
- 🤔 Logs do **mesmo dia+projeto** mas conteúdo diferente — podem ser fragmentos ou assuntos distintos. O agente lê, decide, consolida ou descarta o candidato.

## Limites de segurança (invariantes do Hermes mantidas)

- ❌ **Nunca deleta** — só move pra `.archive/` (recuperável)
- ❌ **Nunca muta sem snapshot** — git commit se o vault é repo, senão archive é o fallback recuperável
- ❌ **Nunca forka LLM** — a parte semântica é delegada ao agente presente, não a um subprocess pago
- ✅ **Idempotente** — rodar 2× seguidas não causa dano (gate "sujo" + archive já-feito)
- ✅ **Isolamento de teste** — com `--vault X` explícito, NÃO toca o `.bot/learned-skills` do CWD (evita contaminar o repo ao testar)

## O ciclo de vida dos arquivos de estado

**`.curator-state.json`** (raiz do vault) — controla o gatilho:
```json
{ "last_curated_at": "2026-05-28T19:00:00.000Z", "files_at_last": 1204, "last_mechanical_actions": 5 }
```
- **Escrito** pelo `memory-curator.mjs` ao final de cada run E pelo `/consolidate-memory` (via `curator-state.mjs --write`)
- **Lido** pelo gate para calcular `grewBy` e `daysSince`

**`.curator-pending.md`** (raiz do vault) — trabalho semântico:
- **Escrito** pelo curador quando detecta candidatos a merge
- **Lido + injetado** pelo `session-start.mjs` pro agente da sessão seguinte
- **Deletado** pelo agente após resolver (ou decidir ignorar)

## Lifecycle de learned-skills (espelhando o Hermes)

O Hermes auto-transiciona `active → stale (30d) → archived (90d)`. No kit o curador aplica via score+decay diretamente (sem precisar do `/consolidate-memory`): decay semanal corrói o score; quando cruza `score_archive_threshold` + idade, arquiva. O `/consolidate-memory` continua existindo para curadoria **manual/profunda** (merge interativo, promote para semantic tier, normalização de tags).

## Anti-padrões

- ❌ Disparar por OR em vez de AND (cresceu OU antigo) → ruído
- ❌ Mutar sem snapshot → vault sem undo
- ❌ Forkar `claude -p` pra curar → gasta a assinatura 2×
- ❌ Bloquear o SessionStart com curadoria síncrona → latência percebida
- ❌ Tocar o `.bot/` do CWD quando rodando com `--vault` explícito → contaminação cruzada
- ❌ Sugerir merge de logs que o dedup exato já arquivou

## Integração

- `hooks/scripts/memory-curator.mjs` — o motor autônomo (JS puro)
- `hooks/scripts/session-start.mjs` — dispara async + injeta `.curator-pending.md`
- `scripts/curator-state.mjs` — lê/escreve `.curator-state.json` (usado pelo `/consolidate-memory`)
- `commands/consolidate-memory.md` — curadoria manual profunda (complementa, não substitui)
- `policies/memory-consolidation.md` — regras do que/como consolidar
- `policies/memory-tiers.md` — estrutura 4-tier mantida
- `policies/self-correcting-sensors.md` — filosofia de sensores conservadores
