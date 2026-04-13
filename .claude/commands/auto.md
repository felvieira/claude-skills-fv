---
description: Agente autônomo — executa task completa sem intervenção humana até estar pronto, funcional e testado
---

# /auto — Agente Autônomo

**Objetivo:** Executar uma task completa de ponta a ponta sem perguntar ao usuário, usando todo o kit como base. Só para quando estiver **pronto, funcional e testado**.

**Protocolo completo:** Ver `docs/skill-guides/autonomous-loop.md`

## Regras Invioláveis

1. **Nunca perguntar ao usuário** — decidir com base no kit, codebase e policies
2. **Nunca entregar código sem testes passando** — se não testa, não está pronto
3. **Nunca pular security review** — todo código passa por OWASP checklist
4. **Nunca expandir scope** — implementar exatamente o que foi pedido, nada mais
5. **Parar se estiver stuck** — após 3 tentativas no mesmo erro, declarar bloqueio com diagnóstico
6. **Manter progresso visível** — escrever `.auto/progress.md` após cada fase

## Loop Autônomo

```
PLAN → BUILD → TEST → FIX → VALIDATE → REVIEW → COMMIT
  ↑                              |
  └──────── se falhar ───────────┘
```

### Fase 0 — Setup
1. Criar diretório `.auto/` para tracking de progresso
2. Pesquisar o codebase (`policies/search-first.md`) para entender stack e patterns
3. Ler `docs/repo-audit/current.md` se existir
4. Detectar ferramentas disponíveis: test framework, lint, typecheck, build
5. Registrar ferramentas detectadas em `.auto/env.md`
6. Snapshot inicial: `git diff --stat` para baseline

### Fase 1 — Plan (máx 2 iterações)
1. Classificar a task (feature/bugfix/refactor) e montar pipeline mínimo
2. Emitir plano em `.auto/plan.md` com checkboxes:
   ```markdown
   ## Plano Autônomo
   **Task:** [descrição]
   **Tipo:** [feature/bugfix/refactor]
   
   ### Tasks
   - [ ] [arquivo/mudança 1]
   - [ ] [arquivo/mudança 2]
   - [ ] [testes]
   - [ ] [validação]
   - [ ] [review]
   ```
3. Se a task for ambígua, usar `policies/source-driven.md` para resolver — **não perguntar**
4. Calcular iteration budget: 2 tasks simples = 8 iterações máx, 5+ tasks = 15 iterações máx

### Fase 2 — Build (budget dinâmico)
1. Para cada task do plano, implementar e marcar `[x]` no `.auto/plan.md`
2. Seguir patterns do projeto (`policies/stack-flexibility.md`)
3. Após cada arquivo, rodar testes existentes como sanity check
4. Se encontrar código duplicado, refatorar inline (Senior Dev Override)
5. Após cada task completa, escrever em `.auto/progress.md`:
   ```
   ## Iteração N — [timestamp]
   **Fase:** Build
   **Task:** [descrição]
   **Arquivos mudados:** [lista]
   **Testes existentes:** ✅ passando / ❌ [erro]
   **Status:** [progresso/bloqueado/completo]
   ```

### Fase 3 — Test (máx 3 iterações)
1. Escrever testes para: happy path, erro principal, edge case
2. Rodar testes e confirmar que passam
3. Se testes falharem: analisar erro, corrigir **código** (não os testes)
4. **Validation feedback:** Se o erro persistir, copiar a mensagem de erro exata e usá-la como contexto para a próxima tentativa de fix
5. Marcar `[x]` no plano quando testes passarem

### Fase 4 — Validate (máx 2 iterações)
1. **Tiered validation** (do mais rápido ao mais lento):
   - Lint primeiro (rápido, ~5s)
   - Type-check segundo (médio, ~15s)
   - Build de produção último (lento, ~30-60s)
2. Se lint falhar: corrigir e re-rodar só lint
3. Se build falhar: injetar mensagem de erro completa como contexto, corrigir, re-rodar
4. Se nenhuma ferramenta disponível: pular fase com nota

### Fase 5 — Review (1 iteração)
1. Self-review do diff completo usando `personas/code-reviewer.md` — 5 eixos
2. Security check usando `personas/security-auditor.md` — inputs, auth, secrets
3. Se finding 🔴 Critical — corrigir, re-rodar testes, e review só do finding corrigido
4. Gerar relatório resumido

### Fase 6 — Commit
1. **Completion check:** reler `.auto/plan.md` — se houver tasks `[ ]` pendentes, **voltar a Fase 2**
2. Stage apenas arquivos relevantes (não `git add .`)
3. Commit com mensagem semântica (`feat:` / `fix:` / `refactor:`)
4. Não fazer push (decisão do usuário)
5. Emitir relatório final

## Circuit Breaker

O agente DEVE parar se:
- **Mesmo erro 3x:** Normalizar erro (ignorar line numbers e timestamps) antes de comparar
- **Stall detectado:** 3 iterações consecutivas sem mudança em nenhum arquivo = stuck
- **Budget estourado:** Mais iterações que o budget calculado na Fase 1
- **Regressão:** Testes que passavam começam a falhar após uma mudança
- **Decisão de negócio:** Erro requer informação que não está no codebase nem nas policies

Ao parar, emitir:
```
## 🛑 Bloqueio Autônomo
**Erro:** [descrição]
**Tentativas:** [N]
**Diagnóstico:** [análise da causa raiz]
**Sugestão:** [o que o usuário pode fazer para desbloquear]
**Progresso até aqui:** [o que foi feito — ver .auto/progress.md]
**Plan status:** [N/M tasks completas — ver .auto/plan.md]
```

## Policies Aplicáveis
- `policies/search-first.md` — pesquisar antes de implementar
- `policies/anti-rationalization.md` — não racionalizar atalhos
- `policies/context-engineering.md` — hierarquia de contexto
- `policies/confusion-management.md` — resolver confusão sem perguntar (STOP-NAME-OPTIONS-WAIT internamente, sem expor ao user)
- `policies/source-driven.md` — decisões baseadas em fontes
- `policies/quality-gates.md` — critérios de qualidade

## Uso

```
/auto [descrição completa da task]
```

Exemplos:
- `/auto criar endpoint REST para CRUD de usuários com validação Zod e testes`
- `/auto corrigir bug de autenticação onde refresh token não rotaciona`
- `/auto refatorar módulo de pagamentos para eliminar duplicação`
