# Vertical Slices Policy

## Objetivo

Paralelizar desenvolvimento **por feature vertical** (front + back + DB + teste de UMA feature ate completar) em vez de **por camada horizontal** (todo o front, depois todo o back, depois todo o DB). Vertical slicing permite testar de ponta a ponta a cada feature concluida e habilita paralelizacao real entre features independentes.

Antes de despachar qualquer slice desta tabela para implementação, `policies/readiness-gate.md` decide se ele está pronto (PASS/CONCERNS/FAIL) — dependência não resolvida entre slices, visível aqui, é um dos critérios que reprova o gate.

## Principio Fundamental

> **Uma feature por vez, ate testavel ponta-a-ponta. Multiplas features em paralelo se independentes.**

Layered (errado):
```
Sprint 1: front de login + cadastro + recuperar senha
Sprint 2: back de login + cadastro + recuperar senha
Sprint 3: DB de login + cadastro + recuperar senha
Sprint 4: teste — quase todo bug aparece aqui, conserto custa 5x mais
```

Vertical (certo):
```
Worker A: login (front + back + DB + teste end-to-end) → mergeavel
Worker B: cadastro (front + back + DB + teste end-to-end) → mergeavel
Worker C: recuperar senha (front + back + DB + teste end-to-end) → mergeavel
3 workers em paralelo, cada um produz feature mergeavel sozinha.
```

## Quando Aplicar

**Toda feature multi-camada** (front + back + DB, ou client + server + worker, etc).

Trigger explicito:
- spec menciona >1 camada
- task descrita como "implementar X" onde X tem UI + persistencia
- pipeline planejado por orchestrator (skill 09) tem >2 skills
- usuario pede paralelizacao (`/loop --parallel N`, `/auto`, multiplos worktrees)

## Quando Nao Aplicar

- **Feature single-layer:** so frontend (componente isolado), so backend (script CLI), so docs
- **Tarefa de manutencao cross-cutting:** rename de variavel em todo repo, upgrade de dep
- **Bug fix localizado:** debugger subagent ja opera certo (1 root cause, 1 fix)
- **Refactor estrutural:** skill 23 (Migration & Refactor) opera por modulo, nao por feature

## Protocolo de Slicing

### 1. Identificar features candidatas

Da spec ou backlog, extrair lista de features **independentes**. Independencia = nenhuma feature precisa de outra para ser testavel ponta-a-ponta.

Exemplo bom (independentes):
- login (precisa user table, mas funciona sozinho)
- cadastro (precisa user table, funciona sozinho)
- esqueci senha (precisa user table + email service, funciona sozinho)

Exemplo ruim (dependentes):
- login → precisa cadastro existir antes (ou usuario seed)
- mesma feature dividida: "front do checkout", "back do checkout" — sao 1 feature, nao 2

### 2. Definir o vertical slice de cada feature

Cada feature tem:
- **Spec:** user story + criterios de aceitacao
- **DB:** schema/migration necessario
- **Back:** endpoint + service + validacao
- **Front:** componente + estado + integracao com endpoint
- **Teste:** unit + integration + 1 e2e cobrindo happy path

Slice e completo quando:
- testes verdes
- merge seguro sozinho (nao quebra outras features)
- demo possivel (usuario clica e funciona)

### 3. Determinar paralelizacao segura

**Independentes:** podem rodar em paralelo (worktrees separados).
**Dependentes:** sequencializar pela dependencia (A bloqueia B).

Identificar shared state:
- mesma tabela DB → cuidado com migrations conflitantes
- mesmo endpoint compartilhado (ex: ambas alteram `/api/users`) → sequencializar
- mesmo componente shared (ex: ambas mexem em `<Header>`) → sequencializar

Quando em duvida: sequencial. Conflito de merge custa mais que perder paralelismo.

### 4. Despachar workers

Para cada feature independente:

```bash
# 1 worktree por feature
/worktree feature/login
/worktree feature/cadastro
/worktree feature/esqueci-senha

# Ou em batch via auto-loop v2
node scripts/auto-loop.mjs "implement feature spec from docs/specs/login.md" \
  --worktree --parallel 3 --task-list features.txt
```

Cada worker executa o pipeline completo (spec → build → test) **dentro do escopo da feature**.

### 5. Merge e validacao

Mergear features na ordem:
1. Feature mais simples primeiro (smoke test do pipeline)
2. Features sem dependencia entre si — ordem alfabetica/criacao
3. Features dependentes — apos a base mergear

Cada merge:
- CI passa (todos os testes)
- review aprovou
- nao quebra features ja mergeadas

## Anti-Padroes

### "Layer-first paralelizado"
Worker A faz todo o front; Worker B faz todo o back. Os dois entregam, mas nada e testavel ate que se integre — e a integracao revela 80% dos bugs porque cada worker assumiu interface diferente.

**Mitigacao:** divisao por feature, nao por camada.

### "Slice horizontal disfarcado de vertical"
Worker A faz "feature de login parte 1: UI"; Worker B faz "feature de login parte 2: backend". Continua sendo layered, so com nome enganoso.

**Mitigacao:** se nao da pra rodar a feature ponta-a-ponta dentro do worker, nao e slice vertical.

### "Slice tao grande que nao paraleliza"
1 feature = 1 epic = 30 dias. Nada paraleliza, time fica esperando worker A acabar.

**Mitigacao:** se feature passa de 5 dias de trabalho, quebrar em sub-features verticais (ex: "login com email/senha" e "login com Google" sao 2 slices verticais distintos).

### "Slice tao pequeno que vira chore"
"Adicionar campo `email_verified` na tabela users" nao e feature, e chore. Agrupar com a feature que precisa do campo (ex: "verificacao de email").

**Mitigacao:** slice tem que ser **demo-able**. Se nao da pra demo, e parte de outro slice.

### "Worker A muda contrato compartilhado"
Worker A altera assinatura de `getUser()` para suportar feature dele. Worker B chama `getUser()` no mesmo dia, quebra.

**Mitigacao:**
- contratos compartilhados (types, interfaces, schemas) ficam em modulo dedicado
- mudanca em contrato compartilhado = mudanca cross-feature, **nao slice**
- usar `policies/source-driven.md` + `docs/repo-audit/current.md` para mapear shared state antes

### "Esquecer testes para 'agilizar'"
Slice "completo" sem teste end-to-end nao e completo. Sem teste, integracao quebra silenciosamente quando a proxima feature merge.

**Mitigacao:** teste e parte do slice, nao etapa separada. Se nao tem teste, slice nao terminou.

## Heuristicas de Tamanho

Slice ideal:
- **1-3 dias** de trabalho do agente
- **<10 arquivos** modificados
- **1 user story** ou 1-2 critérios de aceitação relacionados
- **demo em <2 minutos** (usuario abre tela, faz a acao, ve resultado)

Slice grande demais → quebrar.
Slice pequeno demais → agrupar.

## Integracao com Skills

### Orchestrator (skill 09)
**Responsavel principal.** Ao receber spec, identifica features candidatas e produz lista de slices verticais antes de chamar Backend/Frontend. Deve:
- recusar plano "front primeiro, back depois" para feature multi-camada
- propor lista de slices na resposta inicial
- atribuir cada slice a um worker (worktree ou sessao)

### PO (skill 01)
Quando escrever spec, ja organizar user stories como slices verticais demo-able. Critério de aceitação testa a feature ponta-a-ponta, nao "API retorna X".

### Backend (skill 03) + Frontend (skill 04)
Trabalham **juntos dentro do mesmo slice**. Skill 09 nao deve invocar 03 sem invocar 04 (ou vice-versa) para feature multi-camada.

### QA (skill 05)
Teste e parte do slice, nao fase posterior. QA escreve teste e2e ao mesmo tempo que back+front implementam.

### Auto-loop v2 (`/loop --worktree --parallel N`)
Suporta nativamente paralelizacao por slice. Cada worker pega 1 slice da lista, executa pipeline completo no worktree dele.

### Detective Spec (skill 33)
Quando trabalhar com legado, slices verticais sao reconstruidos dos fluxos extraidos na Fase 4. Cada `_detective_sdd/03-flows/<flow>.md` e candidato a 1 slice.

## Evidencia de Conformidade

Plano de execucao deve mostrar:

```markdown
## Plano (Vertical Slices)

### Slice 1 — Login
**Worker:** A (worktree feature/login)
**Inclui:**
- Spec: docs/specs/login.md
- DB: migration 0042_users.sql
- Back: POST /api/login + service
- Front: <LoginPage> + form + state
- Test: e2e cobrindo happy path + senha errada
**Independente de:** todos os outros slices

### Slice 2 — Cadastro
**Worker:** B (worktree feature/cadastro)
[...]

### Slice 3 — Esqueci senha
**Worker:** C (worktree feature/esqueci-senha)
**Bloqueado por:** Slice 1 (precisa user table existir)
**Estrategia:** aguardar Slice 1 mergear antes de comecar
```

Plano que omite a tabela de slices ou que mostra "Sprint 1: front de tudo" = nao conforme com esta policy.

## Rationale

Por que esta policy:

1. **Throughput real.** N workers em paralelo so vale se cada um produz coisa mergeavel. Layered nao mergeia ate todas as camadas terminarem.
2. **Bug detection cedo.** Integracao end-to-end por feature pega 80% dos bugs no momento da feature, nao no fim do sprint.
3. **Demo-ability continua.** Stakeholder ve progresso por feature, nao "estamos no sprint do back".
4. **Rollback seguro.** Slice mergeado quebra? Reverte o slice. Layered: reverter pedaco do front sem o back e bagunca.
5. **Cognitive load.** Worker mantem contexto de UMA feature na cabeca, nao de 3 camadas de 5 features.
