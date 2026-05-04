---
description: Pipeline COMPLETO discovery → PRD → issues → TDD → ship (novo fluxo, paraleliza por vertical slice)
---

# /pipeline-discovery — Fluxo Discovery + Vertical Slicing + TDD

**Objetivo:** Pipeline end-to-end **completo** com fase de discovery formal (grill-me), PRD publicado em issue tracker, quebra em vertical slices independentes, execução paralela com TDD por slice, e release final.

Variante "premium" do `/pipeline`. Use para feature grande/nova/ambígua. Para feature pequena/clara, `/pipeline` clássico ainda é mais direto.

## Quando usar

- feature grande nova (>1 sprint de trabalho)
- briefing vago, equipe nova com a área, ou stakeholder indeciso
- vai paralelizar com 2+ workers (`/loop --worktree --parallel N`)
- precisa publicar issues no GitHub/Linear/Jira para tracking
- código de produção crítico que merece TDD enforced

## Quando NÃO usar (use `/pipeline` clássico)

- bug fix
- spec já existe e está aprovada
- feature pequena (<3 dias) que não precisa de issue tracker
- spike/POC throwaway

## Skill ativada

Orchestrator (skill 09) coordena 6 fases sequenciais.

## Fluxo

```
1. /grill-me              → entendimento mútuo via interrogatório
2. /to-prd                → PRD publicado no issue tracker (label needs-triage)
3. /to-issues             → PRD quebrado em N vertical slices (1 issue por slice)
   ↓
4. (Opcional) skill 38    → Architecture Deepener avalia se precisa refactor antes
   ↓
5. /loop --worktree       → N workers em paralelo, cada um pega 1 slice
   --parallel N
   ↓
   Por slice:
   - /build               → DB + back + front juntos (vertical, nunca layered)
   - skill 37 (TDD)       → red-green-refactor por comportamento
   - skill 05 (QA)        → edge cases não cobertos pelo TDD
   - /review              → Reviewer + Security
   - merge se Critical/High zerado
   ↓
6. /ship                  → release final quando todos os slices mergeados
```

## Diferenças vs `/pipeline` clássico

| Aspecto | `/pipeline` (clássico) | `/pipeline-discovery` (novo) |
|---|---|---|
| Discovery formal | não (assume spec ok) | **`/grill-me` obrigatório** |
| Output da spec | `docs/specs/X.md` (interno) | PRD publicado em **issue tracker** |
| Quebra em slices | implícita (PO escreve user stories) | **explícita** (`/to-issues` cria 1 issue por slice) |
| Paralelização | manual (worker pega coisas soltas) | **estrutural** (N workers, cada um 1 slice) |
| TDD | opcional | **obrigatório por slice** |
| Skill 38 (Architecture) | não chamado | **opcional** entre fase 3 e 5 |
| Caso de uso | feature pequena/média, equipe sabe o terreno | feature grande/nova/ambígua, equipe nova |

## Inputs

- descrição inicial da feature (pode ser vaga — `/grill-me` resolve)
- (opcional) referência a contexto existente (issue, doc, link)
- número de workers paralelos desejado (default: 1, max recomendado: 4)

## Output esperado

- 1 issue PRD pai no issue tracker
- N issues filhas (vertical slices), cada uma demo-able
- N PRs mergeados (1 por slice), na ordem de dependência
- 1 release final com changelog

## Policies relevantes

- `policies/vertical-slices.md` — **núcleo** do fluxo
- `policies/source-driven.md` — toda decisão ancorada em codebase + ADR
- `policies/quality-gates.md` — Critical/High aberto = no merge
- `policies/model-routing.md` — Haiku/Sonnet/Opus por fase

## Quando interromper / abortar

- Fase 1 (`/grill-me`): convergir em <50 perguntas. Se não converge, briefing não está pronto — voltar para stakeholder.
- Fase 3 (`/to-issues`): se quebra produzir <2 ou >15 slices, repensar tamanho.
- Fase 5 (workers): se 1 slice quebrar build/tests 3x, aborta esse worker, escala para humano.

## Exemplo

```
/pipeline-discovery quero adicionar autenticação social (Google + GitHub)
```

Resultado:
1. `/grill-me` pergunta: redirect URL? token storage? scope? account linking? ~12 perguntas
2. `/to-prd` cria issue #142 com problem/solution/user stories/implementation/testing
3. `/to-issues` quebra em 4 slices: setup OAuth provider Google (#143), setup OAuth GitHub (#144), account linking flow (#145), session management (#146). #146 bloqueia #143/#144.
4. `/loop --worktree --parallel 2` despacha workers em #143 e #144 simultaneamente
5. Cada worker faz TDD por comportamento, abre PR independente
6. PRs mergeados → #145 e #146 saem do bloqueio → workers pegam → mergeados
7. `/ship v2.5.0` com changelog cobrindo "Social auth: Google + GitHub"

## Uso

```
/pipeline-discovery [descrição da feature]
```

## Inspiração

- mattpocock/skills (grill-me, to-prd, to-issues, tdd) — adaptado e integrado ao kit
- aihero.dev — "5 Agent Skills I Use Every Day"
