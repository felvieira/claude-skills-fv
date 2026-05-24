# Memory Pyramid — L0 → L1 → L2 → L3 Layering

## Objetivo

Estruturar memória **cross-session** como uma pirâmide semântica: do log cru até a persona destilada. Nomeia explicitamente um padrão que o kit já tinha de forma fragmentada (logs em `D:\claude-memory\logs\`, decisões em `architecture/<project>/decisions.md`, learned-skills com score 0-1).

Padrão absorvido de [Tencent/TencentDB-Agent-Memory](https://github.com/Tencent/TencentDB-Agent-Memory) — v2.14.0 (2026-05-24). Eles publicaram +59% no benchmark PersonaMem (48% → 76%) usando esta layering.

## Princípio

> **Memória plana é busca cega.** Pirâmide é navegação: a maioria das queries resolve nos níveis superiores; só drill-down quando o detalhe importa.

Tradução prática: SessionStart injeta L3 (Persona — 1-2KB). L2 (Scenario) só carrega quando o agente identifica que precisa do contexto de uma situação específica. L1 (Atom) e L0 (Conversation) ficam em disco até serem grepados.

## Os 4 níveis

| Nível | Conteúdo | Granularidade | Local | Lifecycle |
|---|---|---|---|---|
| **L0 — Conversation** | Logs crus de sessão (transcript completo) | 1 sessão = 1 arquivo | `D:\claude-memory\logs\YYYY-MM-DD-<project>-<topic>.md` | Append-only; nunca rescrito |
| **L1 — Atom** | Fato atômico, decisão, preferência verificada | 1 frase ou 1 bullet | `memory/{user_*,feedback_*,project_*,reference_*}.md` (vault local) | Editado quando muda; deletado se obsoleto |
| **L2 — Scenario** | Padrão recorrente em ≥2 sessões | 1 seção em `decisions.md` | `D:\claude-memory\architecture\<project>\decisions.md` | Append + datar; nunca apagar histórico |
| **L3 — Persona** | Profile destilado do user/projeto | 1 arquivo curto (1-2KB) | `D:\claude-memory\architecture\<project>\persona.md` | Regenerado periodicamente a partir de L1+L2 |

## Mapeamento com a hierarquia existente

A pirâmide L0→L3 não substitui `policies/memory-tiers.md` (working/episodic/semantic/procedural). Ela **complementa**, dando nome aos artefatos que vivem dentro de cada tier:

| Memory Tier (existing) | Mapeamento pirâmide |
|---|---|
| Working | Canvas Mermaid (ver `policies/symbolic-memory.md`) — fora da pirâmide; só dura a sessão |
| Episodic | L0 (logs) + L1 (atoms novos da sessão) |
| Semantic | L2 (scenarios) + L3 (persona) — onde acumulação real acontece |
| Procedural | Fora da pirâmide — skills/programs/templates versionados |

## Regras de promoção

### L0 → L1 (consolidate-memory)

Acontece quando o user roda `/consolidate-memory` (skill 31) ou auto-trigger ao fim de sessão longa (gatilhos em `D:\claude-memory\CLAUDE.md`):

- Ler logs do dia
- Extrair fatos atômicos novos (preferences, conventions, anti-patterns, project facts)
- Adicionar em `memory/<type>_<slug>.md` com frontmatter
- Atualizar `MEMORY.md` (índice, 1 linha por atom)

Critério de inclusão como L1: **não derivável** do código ou `git log`. Se um `grep` resolve, não vira atom.

### L1 → L2 (scenario aggregation)

Quando ≥ 2 atoms apontam o mesmo padrão:

- Criar/atualizar seção em `architecture/<project>/decisions.md`
- Datar (`### YYYY-MM-DD — <título>`)
- Linkar pra `[[memory/<atom>.md]]` originais

Critério: **padrão recorrente, não fato isolado**. Um único bug fix não vira scenario; um padrão de "sempre usamos X em vez de Y" sim.

### L2 → L3 (persona generation)

Rodado por `scripts/l3-persona-generator.mjs`:

- Lê todos `memory/feedback_*.md` + `memory/user_*.md` + decisions.md
- Agrega em 4-6 seções (preferences, conventions, anti-patterns, style, project context)
- Escreve `architecture/<project>/persona.md`
- Rebuild idempotente: roda quantas vezes quiser, sempre produz output similar

Critério: **assinatura estável do user/projeto**. Se persona muda toda semana, está capturando ruído — subir threshold.

## Drill-down protocol

Quando agente precisa de evidência além do L3:

```
L3 (Persona) — "user prefere Apache-2.0 + NOTICE separado"
   ↓ drill-down se questionado
L2 (Scenario) — "decision em 2026-05-22: migração MIT → Apache + NOTICE"
   ↓ drill-down se questionado
L1 (Atom) — feedback_licensing.md: regra com why/how-to-apply
   ↓ drill-down se questionado
L0 (Conversation) — log 2026-05-22 mostra discussão original
```

Cada nível tem caminho determinístico pro inferior. Sem grep cego.

## Como medir

- `wc -l D:/claude-memory/architecture/<project>/persona.md` — tamanho do L3 (objetivo: 30-80 linhas)
- Recall em PersonaMem ou similar — não temos benchmark interno ainda
- Time-to-context: SessionStart só lê L3, sem grep nos logs; verificar via `devkit_session_events`

## Privacy

Mesmas regras de `policies/memory-tiers.md → Privacy`:

- **Nunca** atomizar API keys, tokens, PII, payloads completos
- L3 é especialmente sensível — vira "perfil" do user; tratar como dado pessoal
- Vault inteiro **não** deve ir pra commit público sem revisão

## Anti-padrões

| Anti-padrão | Por que evita |
|---|---|
| Skipping L2, ir L1 → L3 direto | Persona sem scenarios não capta padrões temporais |
| Reescrever L0 (logs) ao "limpar" | Perde evidência; quebra drill-down |
| L3 com >200 linhas | Vira mini-log; perde papel de "essência destilada" |
| Persona regenerada a cada sessão | Capta ruído de turno único; rodar ≥1x por semana só |
| L1 com fato derivável do código | Vira ruído; lembrar de coisa que `grep` resolve |

## O que **não** está aqui

- **Embeddings/RRF fusion** — upstream tem, nós não. Decisão: zero infra > recall marginal melhor
- **Auto-extraction via LLM** — upstream usa DeepSeek-V3.2 pra L1/L2. Nosso flow é semi-manual via `/consolidate-memory`
- **Schema rígido pra Persona** — mantemos markdown livre; agente lê todo, não precisa parser

## Referências cruzadas

- `policies/memory-tiers.md` — 4 tiers existentes (working/episodic/semantic/procedural)
- `policies/symbolic-memory.md` — compressão **dentro** de uma sessão (Mermaid canvas)
- `policies/memory-consolidation.md` — quando rodar `/consolidate-memory`
- `policies/persistence.md` — regras gerais de o que persistir
- `scripts/l3-persona-generator.mjs` — gerador L3 zero-dep
- `commands/consolidate-memory.md` — comando que dispara promoções L0→L1→L2
- Upstream: [Tencent/TencentDB-Agent-Memory](https://github.com/Tencent/TencentDB-Agent-Memory) — README seção "Memory Layering: Progressive Disclosure"
