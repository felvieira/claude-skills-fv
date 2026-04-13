# Autonomous Loop — Guia Operacional do /auto e /loop

Protocolo completo para execução autônoma de tasks sem intervenção humana.
Dois modos disponíveis:

| Modo | Como usar | Quando usar |
|------|-----------|-------------|
| `/auto` | Prompt no contexto atual da conversa | Claude executa no seu contexto, vê seus arquivos |
| `/loop` | `node scripts/auto-loop.mjs "task"` | Processo externo real, budget fixo, commit automático |

`auto-loop.mjs` implementa o mesmo padrão do [ralph-starter](https://github.com/multivmlabs/ralph-starter):
roda `claude --print` em subprocess Node.js, itera até done com circuit breaker completo.

```bash
# Uso básico
node scripts/auto-loop.mjs "adicionar endpoint /api/health com teste"

# Em repos consumidores (.bot/ instalado via setup/install.sh)
node .bot/scripts/auto-loop.mjs "task" --validate --verbose
```

## Princípios

1. **Autonomia total** — o agente decide tudo com base no kit, codebase e policies
2. **Qualidade obrigatória** — código sem testes passando não é código pronto
3. **Escopo fechado** — implementar exatamente o que foi pedido
4. **Fail fast** — parar cedo se estiver preso, com diagnóstico claro
5. **Progresso verificável** — cada fase produz artefato concreto em `.auto/`

## Arquitetura do Loop

```
┌──────────────────────────────────────────────────────┐
│                      /auto                            │
│                                                       │
│  ┌───────┐   ┌──────┐   ┌───────┐   ┌──────┐       │
│  │ SETUP │──▶│ PLAN │──▶│ BUILD │──▶│ TEST │       │
│  └───────┘   └──────┘   └───────┘   └──┬───┘       │
│                                          │            │
│                               ┌──────────▼─────────┐ │
│                               │  Testes passam?    │ │
│                               └──────────┬─────────┘ │
│                                não │          │ sim   │
│                                    ▼          ▼       │
│                              ┌────────┐ ┌──────────┐ │
│                              │  FIX   │ │ VALIDATE │ │
│                              └────┬───┘ └────┬─────┘ │
│                                   │          │        │
│                                   ▼          ▼        │
│                              volta a    ┌────────┐    │
│                              BUILD      │ REVIEW │    │
│                                         └────┬───┘    │
│                                              │        │
│                              ┌───────────────▼──────┐ │
│                              │ Plan tem [ ] aberto? │ │
│                              └───────────┬──────────┘ │
│                               sim │           │ não   │
│                                   ▼           ▼       │
│                              volta a    ┌────────┐    │
│                              BUILD      │ COMMIT │    │
│                                         └────────┘    │
└──────────────────────────────────────────────────────┘
```

## Fase 0 — Setup

**Objetivo:** Preparar o ambiente e detectar ferramentas disponíveis.

**Ações:**
1. Criar diretório `.auto/` para tracking
2. Pesquisar codebase (`policies/search-first.md`) — stack, patterns, convenções
3. Ler `docs/repo-audit/current.md` se existir
4. **Detectar ferramentas** disponíveis no projeto:
   - Test framework: vitest, jest, pytest, go test, cargo test
   - Lint: eslint, biome, ruff, clippy
   - Type-check: tsc, mypy, pyright
   - Build: npm run build, cargo build, go build, make
5. Registrar ferramentas detectadas em `.auto/env.md`
6. Snapshot inicial: `git diff --stat` para baseline

**Output:** `.auto/env.md` com ferramentas detectadas.

## Fase 1 — Plan

**Objetivo:** Entender o que construir e como, sem perguntar.

**Ações:**
1. Classificar task: feature | bugfix | refactor | hotfix
2. Identificar arquivos-alvo (criar vs modificar)
3. Emitir plano em **`.auto/plan.md`** com checkboxes:

```markdown
## Plano Autônomo
**Task:** [descrição]
**Tipo:** [feature/bugfix/refactor]
**Iteration budget:** [N]

### Tasks
- [ ] [task 1 — arquivo/mudança]
- [ ] [task 2 — arquivo/mudança]
- [ ] [testes — cenários a cobrir]
- [ ] [validação — lint/typecheck/build]
- [ ] [review — self-review com personas]

### Critérios de Done
- [ ] Testes passando
- [ ] Lint passando
- [ ] Build passando (se aplicável)
- [ ] Zero findings 🔴 no review
- [ ] Commit criado
```

4. **Calcular iteration budget dinâmico:**
   - 1-2 tasks simples → 8 iterações máx
   - 3-4 tasks → 12 iterações máx
   - 5+ tasks → 15 iterações máx
   - Se durante build o plano crescer (novas tasks descobertas), aumentar budget em +3

**Resolução de ambiguidade (sem perguntar):**
- Ambiguidade técnica → resolver via codebase patterns (`policies/source-driven.md`)
- Ambiguidade de negócio → caminho mais conservador + documentar suposição
- Conflito de patterns → seguir o pattern mais recente no repo
- Dúvida sobre lib/framework → checar package.json/docs oficiais, nunca adivinhar

**Circuit breaker:** Se após 2 iterações o plano não está claro, parar e reportar.

## Fase 2 — Build

**Objetivo:** Implementar código funcional seguindo patterns do projeto.

**Ações:**
1. Para cada task do `.auto/plan.md`:
   a. Implementar a mudança
   b. Rodar testes existentes como sanity check
   c. Marcar `[x]` no `.auto/plan.md`
   d. Registrar progresso em `.auto/progress.md`

2. **Inter-iteration memory** — após cada task, append em `.auto/progress.md`:
```markdown
## Iteração N — [fase] — [timestamp]
**Task:** [descrição]
**Arquivos mudados:** [lista com paths]
**Sanity check:** ✅ testes existentes passando / ❌ [erro específico]
**Decisões:** [escolhas feitas e por quê]
**Status:** progresso / bloqueado / completo
```

3. **Context narrowing progressivo:**
   - Iteração 1-2: contexto completo (plan + codebase patterns + policies)
   - Iteração 3-5: focar em arquivos do plano + erros da iteração anterior
   - Iteração 6+: apenas task atual + erro atual + `.auto/progress.md`

**Padrões obrigatórios:**
- Seguir naming conventions do projeto
- Respeitar `policies/stack-flexibility.md` — usar o que o projeto já usa
- Aplicar `GLOBAL.md` Senior Dev Override — corrigir smells óbvios
- Não deixar TODOs no código

**Stall detection:** Se 3 iterações consecutivas não mudaram nenhum arquivo (verificar via `git diff`), declarar stall e parar.

**Circuit breaker:** Se o mesmo arquivo for editado 5+ vezes sem progresso nos testes, parar.

## Fase 3 — Test

**Objetivo:** Provar que o código funciona com testes automatizados.

**Ações:**
1. Escrever testes cobrindo:
   - **Happy path** — fluxo principal funciona
   - **Erro principal** — falha mais provável tratada
   - **Edge case** — limites e valores extremos
2. Rodar testes
3. Se testes falharem:
   a. Copiar mensagem de erro **completa** 
   b. **Validation feedback loop:** usar a mensagem como contexto direto para o fix
   c. Corrigir **código** (não testes) — voltar a Fase 2 se necessário
   d. Re-rodar testes
4. Marcar `[x]` no plano quando todos passarem

**Framework detection** (do `.auto/env.md`):
- `package.json` tem vitest/jest → usar esse framework
- `pytest.ini` ou `pyproject.toml` → usar pytest
- `go.mod` → usar `go test`
- Sem framework → criar teste simples executável

**Error deduplication:** Antes de contar "mesmo erro", normalizar:
- Remover line numbers (`file.ts:42` → `file.ts`)
- Remover timestamps e PIDs
- Remover hex addresses (`0x7fff...` → `<addr>`)
- Comparar o erro normalizado — se igual ao anterior, incrementar contador

**Output esperado:**
```
✅ N testes passando
📊 Cenários: happy path ✅, erro ✅, edge case ✅
⚠️ Gaps: [cenários não cobertos e por quê]
```

**Circuit breaker:** Se testes falharem 3 vezes com o mesmo erro normalizado, parar.

## Fase 4 — Validate

**Objetivo:** Garantir que o código compila, passa lint e build.

**Tiered validation** (do mais rápido ao mais lento):

| Nível | Ferramenta | Timeout | Quando rodar |
|---|---|---|---|
| 1 | Lint | ~5s | Toda iteração |
| 2 | Type-check | ~15s | Após lint passar |
| 3 | Build | ~60s | Apenas na iteração final |

**Ações:**
1. Rodar lint → se falhar, corrigir e re-rodar só lint
2. Rodar type-check → se falhar, corrigir e re-rodar lint + type-check
3. Rodar build (só se todos os tasks do plano estão `[x]`) → se falhar:
   a. Copiar output de erro completo
   b. **Injetar como contexto** na próxima tentativa de fix
   c. Corrigir e re-rodar
   d. Se build falhar 2x, **estender budget** em +2 iterações (uma vez só)

**Se nenhuma ferramenta disponível:** Pular fase com nota no relatório final.

**Circuit breaker:** Se build falhar 2 vezes com mesmo erro normalizado, parar.

## Fase 5 — Review

**Objetivo:** Self-review antes de entregar.

**Ações:**
1. Gerar diff completo: `git diff` dos arquivos modificados
2. Revisar usando `personas/code-reviewer.md` — 5 eixos:
   - Correctness — lógica correta?
   - Design — responsabilidades claras, DRY, SOLID?
   - Readability — nomes claros, funções focadas?
   - Performance — N+1, re-renders, bundle size?
   - Security — inputs validados, auth correta?

3. Security check usando `personas/security-auditor.md`:
   - Inputs validados?
   - Secrets protegidos?
   - Auth flow correto?
   - Headers configurados?

4. Se finding 🔴 Critical encontrado:
   - Corrigir imediatamente
   - Re-rodar testes (garantir que fix não quebrou nada)
   - Re-review apenas o finding corrigido

5. Emitir relatório:
```markdown
## Review Autônomo
**Status:** ✅ Aprovado / ❌ Findings corrigidos
**Eixos:** Correctness ✅ | Design ✅ | Readability ✅ | Performance ✅ | Security ✅
**Findings corrigidos:** [N] (se houver)
**Risco residual:** [nenhum / baixo — descrição]
```

## Fase 6 — Commit

**Ações:**
1. **Completion override:** Reler `.auto/plan.md`
   - Se houver tasks `[ ]` pendentes → **voltar a Fase 2**, não é done
   - Se houver critérios de done `[ ]` pendentes → resolver antes de continuar
   - Só prosseguir se **tudo** está `[x]`
2. Stage apenas arquivos relevantes (não `git add .`, não incluir `.auto/`)
3. Commit com mensagem semântica:
   - `feat:` para features
   - `fix:` para bugfixes
   - `refactor:` para refatorações
4. **Não fazer push** — decisão do usuário
5. Emitir relatório final

## Relatório Final

Ao completar, emitir:

```markdown
## ✅ Task Completa — /auto

**Task:** [descrição]
**Iterações:** [N usadas] / [M budget]
**Arquivos criados:** [lista]
**Arquivos modificados:** [lista]
**Testes:** [N passando] / [N cenários cobertos]
**Validação:** lint ✅ | typecheck ✅ | build ✅
**Commit:** [hash] — [mensagem]

### O que foi feito
[3-5 bullets descrevendo as mudanças]

### Decisões tomadas
[Suposições feitas, patterns seguidos, alternativas descartadas]

### Risco residual
[Nenhum / lista de riscos aceitos com justificativa]

### Progresso detalhado
Ver `.auto/progress.md` para log iteração-por-iteração.
```

## Circuit Breaker Global

| Condição | Detecção | Ação |
|---|---|---|
| Mesmo erro 3x | Normalizar erro (sem line numbers/timestamps), comparar hash | Parar com diagnóstico |
| Stall | 3 iterações sem `git diff` mostrar mudanças | Parar com progresso parcial |
| Budget estourado | Iterações > budget calculado na Fase 1 | Parar com `.auto/plan.md` mostrando o que falta |
| Regressão | Testes que passavam retornam falha após uma mudança | Reverter última mudança (`git checkout -- [arquivo]`), parar |
| Decisão de negócio | Ambiguidade que não se resolve via codebase/policies | Parar com opções listadas |
| Context decay | Auto-compact detectado ou 10+ iterações | Re-read `.auto/plan.md` e `.auto/progress.md` antes de continuar |

**Formato de parada:**
```markdown
## 🛑 Bloqueio Autônomo
**Erro:** [descrição]
**Tipo:** [mesmo-erro / stall / budget / regressão / negócio / context-decay]
**Tentativas:** [N]
**Diagnóstico:** [análise da causa raiz]
**Sugestão:** [o que o usuário pode fazer para desbloquear]
**Plan status:** [N/M tasks completas — ver .auto/plan.md]
**Progresso:** ver .auto/progress.md
```

## Patterns Adaptados

Patterns incorporados de loops autônomos de produção:

| Pattern | O que faz | Onde no /auto |
|---|---|---|
| **Progress tracking** | Checkboxes em plan file para saber o que falta | `.auto/plan.md` com `[x]`/`[ ]` |
| **Inter-iteration memory** | Log entre iterações para não perder contexto | `.auto/progress.md` append-only |
| **Context narrowing** | Reduzir contexto progressivamente nas iterações tardias | Fase 2 — 3 níveis de contexto |
| **Tiered validation** | Lint rápido toda hora, build só no final | Fase 4 — 3 tiers com timeout |
| **Error deduplication** | Normalizar erros antes de comparar para circuit breaker | Fase 3 — strip line numbers/timestamps |
| **Completion override** | Agente diz "pronto" mas plan tem tasks pendentes = não pronto | Fase 6 — reler plan antes de commit |
| **Dynamic budget** | Plan cresceu = mais iterações permitidas | Fase 1 — budget por quantidade de tasks |
| **Validation feedback** | Erro de build/test vira contexto da próxima tentativa | Fases 3 e 4 — injetar erro completo |
| **Stall detection** | N iterações sem mudança de arquivo = stuck | Circuit breaker — `git diff` vazio |
| **Build-fix extension** | Build falha no final = dar mais 2 iterações | Fase 4 — extend budget +2 |

## Integração com o Kit

| Fase | Skills/Policies usadas |
|---|---|
| Setup | search-first, repo-auditor (18) |
| Plan | source-driven, orchestrator (09), confusion-management |
| Build | backend (03), frontend (04), stack-flexibility, anti-rationalization |
| Test | QA (05), test-engineer persona, quality-gates |
| Validate | Ferramentas do projeto |
| Review | reviewer (11), security (06), code-reviewer persona, security-auditor persona |
| Commit | Convenções do projeto |

## Diferenças do /pipeline

| Aspecto | `/pipeline` | `/auto` |
|---|---|---|
| Interação | Pode perguntar entre fases | Zero perguntas |
| Scope | Feature completa com todas as skills | Só as skills necessárias |
| Testes | Delegados ao QA Engineer | Obrigatórios, inline |
| Review | Subagent separado | Self-review inline |
| Commit | Manual | Automático |
| Circuit breaker | Não tem | Obrigatório — 6 condições |
| Progress tracking | Não tem | `.auto/plan.md` + `.auto/progress.md` |
| Validation | Não tem tiered | Lint → typecheck → build |
| Stall detection | Não tem | 3 iterações sem mudança = stop |
| Error memory | Não tem | Feedback loop com erro completo |
