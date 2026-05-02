---
name: detective-spec
description: |
  Engenharia reversa de specs para sistemas legados. Use quando precisar extrair specs executaveis,
  regras de negocio, contratos de modulo, fluxos e ADRs retroativos a partir de codigo existente sem
  spec previa. Trigger em: "legado", "engenharia reversa", "extrair spec", "documentar codigo existente",
  "vibe coding sem doc", "detective", "reverse spec", "o que esse codigo faz", "spec a partir do codigo".
argument-hint: "[caminho-do-repo] [--module=path] [--phase=1|2|3|4|5] [--resume]"
allowed-tools: Read, Grep, Glob, Bash(git *), Bash(ls *), Bash(wc *), Bash(find *), Bash(graphify *), Bash(python3 *)
---

# Detective Spec — Reverse Engineering de Specs

O Detetive entra em sistemas legados sem spec, investiga o codigo como cena de crime, e produz **contratos operacionais** que qualquer agente de coding pode usar para evoluir o sistema com fidelidade ao que ja existe.

Inspirado por [Reversa](https://github.com/sandeco/reversa), adaptado para o nosso pipeline (Graphify + repo-audit + memoria persistente).

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/persistence.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/tool-safety.md`, `policies/source-driven.md` e `policies/detective-write-guardrails.md`.

Para exemplos longos e templates completos, consultar `docs/skill-guides/detective-spec.md` apenas quando necessario.

## Filosofia

**Codigo legado e cena de crime.** Existe historia, decisoes implicitas, regras invisiveis. O Detetive nao inventa nem reescreve — ele **observa, infere e documenta**. Toda conclusao precisa apontar para evidencia (`file:line` ou `commit-sha`).

**Specs nao sao documentacao.** Sao contratos executaveis que outro agente pode consumir para implementar features sem quebrar o que ja existe.

## Quando Usar

- repositorio legado sem spec, sem documentacao ou com docs desatualizadas
- codigo "vibe coded" que ninguem entende mais
- antes de evoluir feature critica em modulo sem owner claro
- migracao ou reescrita de sistema antigo
- onboarding de time novo em codebase grande
- antes de delegar manutencao de modulo para agente de coding

## Quando Nao Usar

- projeto novo (use `/spec` direto)
- codebase ja tem spec valida e atualizada
- task localizada de bug fix em arquivo conhecido (use `/build` ou debugger)
- so quer auditoria estrutural sem extrair regras (use `/audit-repo`)

## Entradas Esperadas

- repositorio legado acessivel
- (opcional) `graphify-out/graph.json` ja gerado
- (opcional) `docs/repo-audit/current.md` ja existente
- escopo: repo inteiro, modulo especifico, ou feature especifica

## Saidas Esperadas

- `.detective/state.json` — checkpoint do progresso (resume-friendly)
- `.detective/plan.md` — plano de exploracao personalizado
- `_detective_sdd/` — output dir com specs:
  - `00-overview.md` — mapa do sistema
  - `01-modules/<name>.md` — contratos de modulo
  - `02-business-rules/<domain>.md` — regras de negocio extraidas
  - `03-flows/<flow>.md` — fluxos end-to-end
  - `04-adrs/ADR-NNN.md` — decisoes arquiteturais retroativas
  - `99-traceability.md` — mapa spec → evidencia (file:line / commit)

## Hard Guardrails (CRITICO)

1. **Writes restritos** a `.detective/` e `_detective_sdd/`. Qualquer outra escrita = violacao.
2. **Nunca modificar** arquivos do projeto legado. Nem refatorar, nem "consertar typo", nem mover.
3. **Nunca deletar** nada. Nem em `.detective/` (use checkpoint/resume).
4. **Toda afirmacao** em spec precisa de evidencia: `[evidence: src/foo.ts:42]` ou `[evidence: commit a1b2c3d]`.
5. Se inferencia for fraca, marcar com `[confidence: low]` e listar em `99-traceability.md` como "needs human validation".

Consultar `policies/detective-write-guardrails.md`.

## Pipeline de 5 Fases

O Detetive opera em 5 fases sequenciais. Cada fase faz checkpoint em `.detective/state.json` para permitir resume.

```
Fase 1: Reconhecimento  → mapa estrutural + identificar suspeitos
Fase 2: Modulos          → extrair contratos por modulo (interrogatorio)
Fase 3: Regras           → extrair regras de negocio escondidas
Fase 4: Fluxos           → reconstituir cena (fluxos end-to-end)
Fase 5: ADRs + Sintese   → decisoes retroativas + spec consolidada
```

### Fase 1 — Reconhecimento

**Detetive responsavel:** orchestrator (esta skill)

**Acoes:**
1. Verificar se `graphify-out/graph.json` existe — se sim, usar como mapa primario (god nodes, comunidades, hubs)
2. Verificar `docs/repo-audit/current.md` — se valido, usar; senao, despachar `repo-auditor` primeiro
3. Identificar:
   - linguagem(ns) primaria(s)
   - frameworks e libs de dominio
   - estrutura de modulos (por feature, por camada, monolito)
   - pontos de entrada (main, routes, handlers, CLIs)
   - god nodes (modulos com muito acoplamento — suspeitos prioritarios)
4. Gerar `.detective/plan.md` com lista priorizada de modulos para investigar

**Output:** `_detective_sdd/00-overview.md` + `.detective/plan.md`

**Checkpoint:** `state.json.phase = 1, status = done`

### Fase 2 — Modulos (Interrogatorio)

**Detetive responsavel:** `detective-contracts` (persona)

Para cada modulo do `.detective/plan.md`:

**Interrogar:**
- O que esse modulo expoe? (API publica, exports, endpoints)
- Quais sao suas dependencias? (imports, injecoes, side effects)
- Quais invariantes mantem? (asserts, validacoes, guards)
- Quem o consome? (call sites — usar Grep)
- Qual seu estado interno? (vars de modulo, singletons, caches)

**Output por modulo:** `_detective_sdd/01-modules/<name>.md`

Estrutura:
```markdown
# Modulo: <name>

**Path:** src/...
**Confidence:** high | medium | low

## Responsabilidade
[1-2 linhas — o que esse modulo faz no sistema]

## API Publica
- `fn(args): tipo` — [proposito] [evidence: file:line]

## Dependencias
- [modulo X]: usa para [proposito]

## Invariantes
- [regra que o codigo assume verdadeira] [evidence: file:line]

## Consumidores
- src/foo.ts:42 — [como usa]

## Estado Interno
- [vars de modulo, caches, singletons]

## Suspeitas (precisa validacao humana)
- [coisas que parecem dead code, comportamento ambiguo, TODOs antigos]
```

**Checkpoint:** `state.json.modules[<name>] = done` apos cada modulo

### Fase 3 — Regras de Negocio

**Detetive responsavel:** `detective-business-rules` (persona)

**Onde regras se escondem:**
- validacoes (`if (x < 0) throw`)
- calculos de dominio (descontos, taxas, scoring)
- transicoes de estado (status de pedido, workflow)
- constantes magicas (`const TAX_RATE = 0.08`)
- comentarios `// HACK:`, `// FIXME:`, `// because <bug>`
- mensagens de erro (revelam contratos quebrados)
- testes (regras viram assertions)

**Acoes:**
1. Grep por padroes de validacao na linguagem (`throw new`, `raise`, `assert`, `Validate*`)
2. Grep por constantes magicas (`const [A-Z_]+ = `)
3. Ler testes existentes — cada `it(...)` e uma regra
4. Para cada regra encontrada, registrar em `_detective_sdd/02-business-rules/<domain>.md`

Estrutura por dominio:
```markdown
# Regras de Negocio — <dominio>

## RN-001: [nome curto]
**Confidence:** high | medium | low
**Evidence:** src/foo.ts:42

**Quando:** [condicao que ativa a regra]
**Entao:** [comportamento esperado]
**Por que (inferido):** [hipotese da motivacao — marcar como inferida]

**Testavel como:**
DADO [estado] QUANDO [acao] ENTAO [resultado]
```

**Checkpoint:** `state.json.rules[<domain>] = done`

### Fase 4 — Fluxos

**Detetive responsavel:** `detective-flows` (persona)

**Reconstituir cenas:** seguir uma requisicao/comando do ponto de entrada ate o efeito final.

**Acoes:**
1. Para cada ponto de entrada identificado na Fase 1 (route, handler, CLI command, job):
   - tracar call chain ate side effects (DB write, API externa, fila, log)
   - identificar branchings principais (happy path + N edge cases)
   - mapear estado mutado em cada step

**Output por fluxo:** `_detective_sdd/03-flows/<flow>.md`

Estrutura:
```markdown
# Fluxo: <nome>

**Trigger:** [route POST /x | comando CLI | job cron | event]
**Confidence:** high | medium | low

## Happy Path
1. [step] — src/handler.ts:10
2. [step] — src/service.ts:42
   → side effect: [DB INSERT em tabela X]
3. [step] — [efeito final]

## Edge Cases
- [condicao] → [comportamento] [evidence: file:line]

## Estado Mutado
- tabela `users.last_login` (step 3)
- cache `session:<id>` (step 1)

## Falhas Possiveis
- [excecao] em step N → [tratamento ou propagacao]
```

**Checkpoint:** `state.json.flows[<name>] = done`

### Fase 5 — ADRs Retroativos + Sintese

**Detetive responsavel:** `detective-adrs` (persona)

**Acoes:**
1. Identificar **decisoes arquiteturais implicitas** que nao tem ADR:
   - escolha de framework / lib (por que essa e nao outra?)
   - padrao de auth (JWT, session, OAuth — por que?)
   - estrategia de cache, fila, transacao
   - convencoes de erro, log, observabilidade
   - boundaries de modulo (monolito, modular, microservice)
2. Para cada decisao, escrever ADR retroativo em `_detective_sdd/04-adrs/ADR-NNN.md`
3. Gerar `_detective_sdd/99-traceability.md` — tabela completa spec ↔ evidencia
4. Atualizar `_detective_sdd/00-overview.md` com sumario executivo

Estrutura ADR:
```markdown
# ADR-001: [decisao]

**Status:** Inferido (retroativo)
**Confidence:** high | medium | low
**Evidence:** [arquivos/commits que sustentam a inferencia]

## Contexto (inferido)
[problema que essa decisao parece resolver]

## Decisao
[o que foi escolhido]

## Consequencias observadas no codigo
- [acoplamento, restricao, beneficio observado]

## Alternativas (especulativas)
[se aplicavel, o que outra escolha implicaria]
```

**Checkpoint:** `state.json.phase = 5, status = done`

## Estrutura de `.detective/state.json`

```json
{
  "version": 1,
  "started_at": "2026-05-02T12:00:00Z",
  "last_checkpoint": "2026-05-02T12:34:00Z",
  "scope": "full | module:<path> | feature:<name>",
  "phase": 1 | 2 | 3 | 4 | 5,
  "phase_status": "in_progress | done",
  "modules": { "<name>": "pending|in_progress|done" },
  "rules": { "<domain>": "pending|in_progress|done" },
  "flows": { "<name>": "pending|in_progress|done" },
  "evidence_count": 0,
  "low_confidence_items": []
}
```

## Resume

Se sessao for interrompida, ao re-invocar `/detective-spec`:
1. Ler `.detective/state.json`
2. Pular fases ja `done`
3. Continuar do ultimo checkpoint da fase em andamento
4. Nao re-escrever specs ja geradas (apenas atualizar incrementalmente se houver mudanca relevante)

## Integracao com Graphify

Se `graphify-out/graph.json` existir:
- usar **god nodes** como modulos prioritarios na Fase 2
- usar **comunidades** como agrupamento natural para `01-modules/`
- usar **hubs** como candidatos a pontos de entrada na Fase 4
- usar **bridges** entre comunidades para identificar contratos inter-modulo

Se nao existir, sugerir gerar primeiro: `pip install graphifyy && graphify update .`

## Integracao com Repo Audit

Se `docs/repo-audit/current.md` existir e estiver atualizado:
- usar como base da Fase 1 (nao re-auditar)
- splits (`routes.md`, `schema.md`) alimentam Fase 4 (fluxos) e Fase 2 (modulos)

## Confidence Scoring

Cada spec deve declarar `confidence`:
- **high**: evidencia direta no codigo + testes confirmando
- **medium**: evidencia direta no codigo, sem teste
- **low**: inferencia a partir de padroes ou nomes — precisa validacao humana

Items `low` viram fila de validacao em `99-traceability.md` secao "Needs Human Review".

## Heuristicas Anti-Alucinacao

1. **Nunca invente nome de funcao, modulo ou regra.** Se nao achar, escreva `[unknown — investigate]`.
2. **Nao confunda "como o codigo esta" com "como deveria estar".** Detetive documenta o real, nao o ideal.
3. **Comentarios mentem.** Se comentario contradiz o codigo, registrar ambos e marcar `confidence: low`.
4. **Testes desatualizados mentem.** Verificar se passam antes de usar como evidencia.
5. **Nao extrapole de 1 caso.** Regra precisa de pelo menos 2 ocorrencias ou teste explicito.

## Evidencia de Conclusao

- `.detective/state.json` com `phase: 5, status: done`
- `_detective_sdd/00-overview.md` + todos os subdirs populados
- `_detective_sdd/99-traceability.md` com mapa completo
- nenhum write fora dos diretorios permitidos (verificavel via `git status`)
- lista de items `low confidence` consolidada para validacao humana

## Handoff

Apos conclusao, entregar para o usuario:
1. Caminho do `_detective_sdd/`
2. Sumario executivo (do `00-overview.md`)
3. Top 5 regras de negocio criticas extraidas
4. Lista de itens `low confidence` que precisam validacao
5. Sugestao de proxima skill: `/spec` para nova feature usando esses contratos como base

## Codigo Limpo

Output deve ser legivel por humanos E consumivel por agentes. Markdown estruturado, links relativos para evidencias, sem prosa decorativa. Cada secao serve um proposito operacional.

## Integracao com Pipeline

- **Repo Auditor (skill 18):** roda antes se nao houver auditoria valida
- **PO Feature Spec (skill 01):** consome contratos do `_detective_sdd/` para nova feature em legado
- **Migration & Refactor (skill 23):** usa specs como baseline antes de refatorar
- **Documenter (skill 10):** pode promover specs do `_detective_sdd/` para `docs/` oficial apos validacao humana
- **Orchestrator (skill 09):** decide quando invocar Detective vs PO direto
