---
name: orchestrator
description: |
  Skill do Tech Lead/Orquestrador do pipeline de desenvolvimento. Deve ser usada no inicio de toda task
  e entre etapas relevantes do pipeline. Coordena qual skill executar, em que ordem, adapta o fluxo ao contexto,
  garante que nenhuma etapa critica seja pulada e mantem visao geral do progresso. Trigger em: "nova task",
  "iniciar", "pipeline de desenvolvimento", "orquestrar", "coordenar", "planejar execucao", "proximo step do pipeline", "workflow".
---

# Tech Lead / Orquestrador de Pipeline (SKILL)

> ⚠ **Esta é a SKILL 09** (playbook de contexto). Não é o subagent `dev-team-kit-fv:orchestrator`.
> - Para carregar **este playbook** na sessão atual: `Skill({ skill: "dev-team-kit-fv:09-orchestrator" })`
> - Para despachar o **subagent** orchestrator (turno isolado): `Agent({ subagent_type: "dev-team-kit-fv:orchestrator", ... })`
> - Diferença: `policies/skills-vs-agents.md`

O Orquestrador classifica a task, define o pipeline minimo suficiente e coordena as transicoes entre skills.

## Governanca Global

Esta skill herda comportamento base de `GLOBAL.md` e destas policies:

- `policies/constitution.md` ← **autoridade hierarquica** sobre PRD/plan/ADRs quando `memory/constitution.md` existir
- `policies/constitution.md` ← **autoridade hierarquica** sobre PRD/plan/ADRs quando `memory/constitution.md` existir
- `policies/execution.md`
- `policies/handoffs.md`
- `policies/quality-gates.md`
- `policies/token-efficiency.md`
- `policies/stack-flexibility.md`
- `policies/tool-safety.md`
- `policies/evals.md`
- `policies/vertical-slices.md` ← **regra obrigatoria** para toda feature multi-camada

### Constituicao (se existir)

Antes de montar pipeline, checar `memory/constitution.md` do repo consumidor:
- conflito com algum principio → ajustar pipeline (ex: constituicao manda TDD → forcar skill 37 antes de skill 03/04)
- ausencia de constituicao em projeto que ja tem PRD/ADRs → sugerir `/constitution` antes de prosseguir
- pipeline deve incluir `/analyze` antes de `/build` quando ha 3+ artefatos (spec + plan + issues)

### Constituicao (se existir)

Antes de montar pipeline, checar `memory/constitution.md` do repo consumidor:
- conflito com algum principio → ajustar pipeline (ex: constituicao manda TDD → forcar skill 37 antes de skill 03/04)
- ausencia de constituicao em projeto que ja tem PRD/ADRs → sugerir `/constitution` antes de prosseguir
- pipeline deve incluir `/analyze` antes de `/build` quando ha 3+ artefatos (spec + plan + issues)

Se houver conflito entre instrucoes, a hierarquia global do kit prevalece.

Para cenarios extensos e playbook detalhado, consultar `docs/skill-guides/orchestrator-playbook.md` apenas quando o pipeline fugir do caminho padrao.

## Quando Usar

- classificar uma task nova
- definir ou adaptar pipeline
- resolver overlap entre skills
- decidir proxima etapa apos handoff, rejeicao ou dependencia descoberta

## Quando Nao Usar

- para substituir a execucao especializada de outra skill
- para repetir regras globais ja definidas em `GLOBAL.md` e `policies/`

## Entradas Esperadas

- pedido do usuario
- estado atual do contexto
- artefatos ja produzidos
- dependencias, riscos e blockers conhecidos

## Saidas Esperadas

- plano de execucao curto
- pipeline definido ou adaptado
- skills puladas com justificativa
- handoff claro para a proxima skill

## Responsabilidades

1. Analisar escopo e complexidade de cada task
2. Definir quais skills serao acionados e em qual ordem
3. Coordenar transicoes garantindo handoff completo
4. Adaptar o pipeline dinamicamente conforme contexto e feedback
5. Garantir que nenhuma etapa critica seja pulada sem justificativa explicita
6. Manter visao geral do progresso e status de cada etapa

## Dois Fluxos de Pipeline (escolher por contexto)

O Orquestrador opera em dois modos. Escolher antes de iniciar:

### Modo A — `/pipeline` Classico

Para feature pequena/media, equipe conhece o terreno, spec ja clara.

```
/spec -> /plan -> /build -> /test -> /review -> /ship
```

- spec markdown interna em `docs/specs/`
- pipeline minimo classificado pelo orchestrator
- vertical slicing aplica se feature for multi-camada (regra abaixo)

### Modo B — `/pipeline-discovery` (com Discovery + Issues + TDD)

Para feature grande/nova/ambigua, equipe nova com a area, vai paralelizar com 2+ workers, ou precisa publicar PRD/issues no tracker.

```
/grill-me -> /to-prd -> /to-issues -> [skill 38 opcional] -> /loop --worktree --parallel N -> /ship
                                                              \-> por slice: /build + skill 37 (TDD) + /review
```

- discovery formal via interrogatorio (`/grill-me`)
- PRD publicado no issue tracker (GitHub Issues, Linear, Jira) com label `needs-triage`
- N issues filhas (vertical slices) explicitamente criadas
- N workers em paralelo via `/loop --worktree --parallel N`
- TDD enforced por slice (skill 37)
- (opcional) skill 38 (Architecture Deepener) entre `/to-issues` e `/loop` se codebase precisa refactor antes

### Quando escolher cada um

| Sinal | Modo |
|---|---|
| feature pequena, briefing claro | A |
| bug fix, refactor localizado | A |
| feature grande, briefing vago | B |
| equipe nova com a area | B |
| precisa tracking em issue tracker | B |
| 2+ workers em paralelo | B |
| codigo critico que merece TDD | B |
| spike/POC throwaway | nem A nem B — `/auto` direto |

Modos coexistem. Usuario pode comecar em A, perceber que e maior do que parecia, e escalar para B no meio (passar do `/spec` direto para `/grill-me`).

### Canonical Program Definitions

For multi-step pipelines, consult `programs/` for declarative definitions (6 programs, executable via `/run-program`):

| Program | When to use |
|---|---|
| `programs/pipeline-discovery.{yml,md}` | Large/ambiguous features needing discovery + TDD by slice |
| `programs/spec-driven-development.{yml,md}` | Feature em projeto com constitution + cross-artifact analyze |
| `programs/detective-spec.{yml,md}` | Legacy codebase reverse-engineering |
| `programs/loop-polishing.{yml,md}` | Autonomous loop with quality polishing |
| `programs/adversarial-dev.{yml,md}` | Greenfield app via planner + adversarial loop |
| `programs/comprehensive-review.{yml,md}` | 5-agent parallel PR review + synthesize + auto-fix |

Use programs as the **canonical source** when composing pipelines — they define abort conditions, protocol refs, and input contracts that complement the orchestrator's routing logic.

### Auto-orchestration (v1.8.0)

A camada de auto-orquestração funciona em 3 níveis:

1. **Hook `intent-classifier`** (UserPromptSubmit) — analisa prompt do usuário e emite `additionalContext` sugerindo program
2. **Skill 39 (program-router)** — quando precisa decidir entre programs ou criar pipeline ad-hoc, confirma com usuário via `AskUserQuestion` (dry-run / direto / ad-hoc / cancelar)
3. **Skill 09 (orchestrator, esta)** — última camada: monta pipeline informal quando nenhum program serve, ou força pipeline obrigatório quando constitution dita

Ver `policies/auto-orchestration.md` para níveis de autonomia (manual / sugestão passiva / sugestão ativa / autônomo).

## Vertical Slicing (regra obrigatoria para feature multi-camada)

Antes de invocar Backend/Frontend/DB para uma feature multi-camada, o Orquestrador **deve** quebrar a entrega em **vertical slices**: cada slice e uma feature ponta-a-ponta (DB + back + front + teste e2e) testavel sozinha.

**PROIBIDO** despachar plano "front primeiro, back depois, DB depois" ou "Worker A faz todo o front, Worker B faz todo o back". Isso e layer-first paralelizado e quebra integracao.

Para feature multi-camada, primeiro produzir e apresentar a **tabela de slices**:

```markdown
## Plano (Vertical Slices)

### Slice 1 — <feature menor/independente>
**Worker:** A (worktree feature/<nome>)
**Inclui:** spec, DB migration, back endpoint, front componente, teste e2e
**Independente de:** todos os outros / apenas Slice X

### Slice 2 — <feature seguinte>
[...]
```

Apos aprovacao do plano, despachar o pipeline base **dentro de cada slice** (cada slice roda Backend + Frontend + QA juntos no mesmo worktree).

Slices independentes paralelizam via `/worktree` ou `/loop --worktree --parallel N`. Slices dependentes sequencializam pela dependencia.

Detalhes em `policies/vertical-slices.md` (anti-padroes, heuristicas de tamanho, evidencia de conformidade).

### Como paralelizar slices (sem cair em armadilha skill-vs-agent)

⚠ **PROIBIDO** passar nome de skill numerada como `subagent_type`:

```typescript
// ❌ InputValidationError em runtime — esses nomes são SKILLS, não subagents
Agent({ subagent_type: "dev-team-kit-fv:03-backend-api", ... })
Agent({ subagent_type: "dev-team-kit-fv:04-frontend-integration", ... })
Agent({ subagent_type: "dev-team-kit-fv:05-qa-testing", ... })
```

**CORRETO — 3 caminhos:**

**A) Worktree + general-purpose (paralelização granular, recomendado para N slices)**

> ⚠ **Sempre passar `model:` explícito.** Sem isso o subagent herda o modelo do parent (geralmente Opus em sessão de orquestração) — desperdiça budget em tarefa que Sonnet/Haiku resolveria. Ver `policies/model-routing-real.md` para o porquê o hook não consegue forçar isso por nós.

```typescript
const slices = [/* lista de vertical slices */];
// Um único message com N tool calls — dispatch em paralelo
for (const slice of slices) Agent({
  subagent_type: "general-purpose",
  isolation: "worktree",
  model: "sonnet",                    // implementação de slice = Balanced tier
  description: `Slice ${slice.id} — ${slice.title}`,
  prompt: `
    PASSO 1 OBRIGATÓRIO: invoque Skill({ skill: "dev-team-kit-fv:04-frontend-integration" }).
    PASSO 2: implemente conforme: ${slice.description}
    Critérios de aceitação: ${slice.acceptance.join("; ")}
    Arquivos esperados: ${slice.files.join(", ")}
    Output: commit(s) atômicos + resumo final ≤200 palavras.
  `
});
```

**Tabela canônica: que `model:` passar por tipo de slice**

| Tipo de slice | `model:` | Por quê |
|---|---|---|
| Backend/Frontend impl, QA tests, docs | `"sonnet"` | Balanced — implementação padrão, sem necessidade de raciocínio profundo |
| Security review, arquitetura, debug cross-layer | `"opus"` | Deep — exige raciocínio multi-passo, custo justificado |
| Rename, lint fix, boilerplate, microcopy, format | `"haiku"` | Fast — tarefa mecânica, padrão conhecido, economia 10x |
| Detective spec (4 detectives em paralelo) | `"sonnet"` | Balanced — análise estrutural sem decisão crítica |

**Anti-padrão**: spawnar 5 slices sem `model:` em sessão Opus → custo 10x maior que necessário. Hook avisa mas não bloqueia.

Ver `templates/parallel-slice-prompt.md`, `skills/40-parallel-dispatcher/SKILL.md` e `policies/model-routing-real.md`.

**B) `/loop --worktree --parallel N` (process-based, Ralph loop)**

```bash
node scripts/auto-loop.mjs --worktree --parallel 5 "feature X em 5 slices"
```

**C) `/swarm` (autonomia total, do prompt ao PR mergeable)**

```
/swarm "implementar feature X"
```

Anti-padrão registrado em `policies/skills-vs-agents.md#anti-padrão-1` (case real do v2.2.0).

## Pipeline Base

Fluxo padrao **dentro de UM slice vertical** (uma feature ponta-a-ponta):

`Repo Auditor -> CLAUDE.md Generator -> PO -> Design Intelligence -> UI/UX -> Backend -> Frontend -> Motion -> Copy -> SEO -> QA -> Security -> Reviewer -> Deploy -> [Session Summary + Cost Tracker]`

Para spec inicial de varias features, **primeiro** rodar PO + Design Intelligence para producir lista de slices, **depois** rodar o restante por slice.

- `Documenter` atua de forma transversal quando houver mudanca de regra, contrato, arquitetura ou operacao
- `Asset Librarian` atua quando a task depender de consistencia visual, inventario de assets ou apoio ao Image Generator
- `Mobile Tauri` entra como branch opcional apos Frontend e antes de QA
- `Image Generator` atua de forma transversal quando qualquer etapa precisar de asset visual (hero, icone, favicon, mascote, background)
- `Observability SRE` entra quando a task tocar deploy, operacao, monitoramento, incidentes ou confiabilidade
- `Data Analytics` entra quando a feature precisar de evento, tracking, KPI ou funil
- `Accessibility Specialist` entra quando a criticidade de acessibilidade exigir validacao dedicada
- `Release Manager` entra quando houver liberacao formal, changelog, rollout e comunicacao de release
- `AI Integration Architect` entra quando a feature integrar texto, imagem ou video no app do usuario
- `Prompt Engineer` entra quando o prompt for parte critica da qualidade ou do custo da feature
- `Design Intelligence` entra antes do UI/UX quando a task envolver construcao ou melhoria de interface, pesquisando concorrentes, tendencias visuais e gerando moodboard. Em melhoria de UI existente, pula o PO e vai direto: `Design Intelligence -> UI/UX -> Frontend`
- `Playwright MCP` pode ser configurado ou reutilizado em tarefas que exigirem navegacao real, screenshots e verificacao visual do app em execucao
- `Cost Tracker` (30) gera relatorio de custo ao final de sessoes longas ou quando solicitado
- `Session Summary` (31) consolida resumo ao encerrar sessao para continuidade
- `Smart Suggestions` (32) sugere proxima acao entre steps ou quando usuario pede orientacao

## Skill Inicial: Repo Auditor

Quando o repositorio ainda nao tiver auditoria valida em `docs/repo-audit/current.md`, preferir iniciar por `Repo Auditor` para mapear stack real, convencoes, assets e riscos antes de seguir o pipeline principal.

## Skill Pos-Audit: CLAUDE.md Generator

Apos o Repo Auditor completar a auditoria, verificar se o projeto consumidor tem um CLAUDE.md util.
Se nao existir ou estiver generico/desatualizado, acionar `CLAUDE.md Generator` (28) para gerar um CLAUDE.md especifico e acionavel antes de seguir o pipeline principal.

## Skill Transversal: Image Generator

Invoke skill 17 (image-generator) ao identificar necessidade de assets visuais em qualquer etapa:

- UI/UX precisa de imagens de referencia para compor o layout
- Frontend precisa de hero images, backgrounds, ilustracoes para implementar
- Qualquer skill precisa de icone, favicon ou asset grafico
- `/swarm` em landing/sistema novo (ver phase 2.5 em `commands/swarm.md`)

**Regra default (skill 17 aplica automaticamente, fonte: `models/image-models.json`):**
- text-to-image sem referencia → **grok-imagine** ($0.020/img)
- edit/refine com `referenceImages` → **gemini-25-flash** ($0.039/img)
- Override só com justificativa (ex: tipografia complexa → gemini-3-pro $0.15)

**Como acionar:**
```
Contexto: [tipo de imagem], [onde sera usada], [paleta/estilo do projeto], [pagina/componente de destino]
Assets existentes: [paths de imagens, icones, backgrounds, mascotes ou referencias visuais ja existentes]
Design system: [cores, mood, contraste, linguagem visual]
Output: [onde salvar, ou deixar auto-detectar]
```

**Execucao:** `node scripts/generate-image.mjs --prompt "..."` (zero-dep, lê `models/image-models.json`). Detalhes em `skills/17-image-generator/SKILL.md`.

## Adaptacao de Pipeline

O Orquestrador deve reduzir ou expandir o pipeline conforme risco e impacto:

- `bugfix`: skill afetada -> QA -> Security -> Reviewer
- `hotfix critico`: skill afetada -> Security -> Reviewer -> Deploy
- `melhoria de UI`: Design Intelligence -> UI/UX -> Frontend -> Motion -> QA -> Security -> Reviewer
- `landing page`: Copy -> Design Intelligence -> UI/UX -> Frontend -> Motion -> SEO -> QA -> Security -> Reviewer
- `refactor`: skill afetada -> QA -> Security -> Reviewer
- `legacy`: Context Manager primeiro para mapear estado antes da skill afetada
- `infra/operacao`: skill afetada -> Observability SRE -> QA/Security conforme risco -> Reviewer -> Deploy
- `feature orientada a metrica`: skill afetada -> Data Analytics -> QA -> Reviewer
- `fluxo critico de acessibilidade`: UI/UX/Frontend afetado -> Accessibility Specialist -> QA -> Reviewer
- `migracao grande`: Repo Auditor -> Migration Refactor Specialist -> skill afetada -> QA -> Security -> Reviewer -> Deploy
- `release formal`: pipeline normal -> Release Manager -> Deploy
- `feature de IA no app`: Repo Auditor -> AI Integration Architect -> Prompt Engineer quando necessario -> Frontend/Backend -> QA -> Security -> Reviewer

## Workflow de Rejeicao

Quando houver rejeicao:

- identificar a skill responsavel pela correcao
- devolver findings objetivos e priorizados
- repetir QA quando houver mudanca funcional relevante
- repetir Security quando houver impacto em auth, dados, validacao ou superficie de ataque

## Protocolo com Context Manager

- criar uma task por etapa relevante do pipeline
- registrar dependencias, artefatos esperados e status
- atualizar `in_progress`, `completed` ou `rejected` com handoff curto
- manter blockers e reexecucoes visiveis sem inflar historico

## Pre-execution Gate

Antes de classificar e montar pipeline, avaliar se o prompt tem contexto suficiente.

**Sinais concretos que bypassam o gate** (qualquer um destes = contexto suficiente):
- file path (`src/lib/auth.ts`, `#423`, `.ts`, `.py` com diretorio)
- numero de issue/PR (`#123`, `issue 42`)
- simbolo de codigo (camelCase, PascalCase, snake_case longo)
- steps numerados ou checklists (`1.`, `2.`, `- [ ]`)
- acceptance criteria (DADO/QUANDO/ENTAO, GIVEN/WHEN/THEN)
- referencia a erro (stack trace, TypeError, ENOENT)
- bloco de codigo (triple backtick)
- prefixo de escape (`force:` ou `!`)

**Fluxo quando nao ha sinais concretos:**

1. calcular ambiguity score (goal × 0.40 + constraints × 0.30 + criteria × 0.30)
2. `score < 0.4` → prosseguir normalmente
3. `score 0.4-0.7` → ENRICH: inferir escopo do repo-audit, confirmar com 3 opcoes
4. `score > 0.7` → GUIDED ENRICH: fazer 1 pergunta com multipla escolha, inferir o resto

**Principio:** Captura minima, enriquecimento maximo. Nunca devolver "escreva mais" — o sistema infere e confirma. Sempre oferecer 3 saidas: "Bora assim? / Quer ajustar ou detalhar algo? / Ou era outra coisa?"

Em Claude Code, o hook `pre-execution-gate.mjs` faz isso automaticamente. Em outras plataformas, seguir este protocolo manualmente antes de montar pipeline.

## Protocolo de Execucao

Ao iniciar uma task:

- classificar tipo e complexidade
- **pesquisar antes de implementar** (obrigatorio para implementacao, integracao, refactor — ver `policies/search-first.md`):
  - reutilizar `docs/repo-audit/current.md` se existir
  - buscar patterns similares no codigo (Glob/Grep)
  - consultar docs externas via Context7 MCP para libs envolvidas
  - hotfixes triviais e tasks mecanicas sao excecao
- **verificar fontes para decisoes de framework/lib** (obrigatorio quando task envolve integracao de lib externa — ver `policies/source-driven.md`):
  - checar versao da lib no projeto antes de buscar docs
  - usar Context7 MCP (`resolve-library-id` → `query-docs`) para libs conhecidas
  - citar fonte inline ao recomendar API ou config especifica
- mapear artefatos e dependencias existentes
- definir pipeline minimo suficiente
- registrar skills puladas com justificativa
- delegar com handoff curto

Entre etapas:

- verificar criterios de saida
- atualizar estado resumido no Context Manager
- decidir proxima etapa ou retorno de correcao

## Regras de Decisao

- escolher sempre o pipeline minimo suficiente para reduzir custo e risco
- consultar `policies/model-routing.md` quando houver trade-off real entre custo, latencia e profundidade
- nao pular `QA`, `Security` ou `Reviewer` sem excecao formal prevista no fluxo
- documentar toda adaptacao relevante do pipeline
- reutilizar `docs/repo-audit/current.md` antes de reexplorar o repositorio inteiro

## Plano de Execucao

Usar `templates/plan.md` como formato padrao.

Incluir sempre:

- tipo da task
- pipeline definido e skills puladas
- dependencias, riscos e blockers
- criterio de conclusao e proxima etapa

## Regra de Codigo Limpo

Comentarios no codigo so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios. O padrao continua sendo codigo claro atraves de nomes descritivos, funcoes coesas, tipagem forte e testes.

## Evidencia de Conclusao

- tipo de task classificado
- pipeline e responsabilidades definidos
- skills puladas documentadas com justificativa
- proxima etapa clara para execucao

## Handoff

Seguir `policies/handoffs.md` e, quando util, `templates/plan.md` e `templates/handoff.md`.

## Anti-Rationalization

Se você reconhece um desses pensamentos, PARE e siga o processo. Ver `policies/anti-rationalization.md`.

| Racionalização | Realidade |
|---|---|
| "Scope é simples demais pra pipeline completo" | Pipeline existe pra garantir qualidade. Simplifique o pipeline, não o elimine |
| "Posso pular a etapa de pesquisa" | Search-first policy é obrigatória. Sem pesquisa = implementação cega |
| "Não precisa de QA pra isso" | QA descobre o que o implementador não imaginou. Sempre |
| "Vou delegar tudo de uma vez" | Delegação sem verificação intermediária multiplica erros silenciosamente |
| "O repo-audit está desatualizado, ignoro" | Desatualizado > inexistente. Use como base e verifique |
