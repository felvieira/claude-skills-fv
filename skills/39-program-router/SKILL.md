---
name: program-router
description: |
  Skill que decide qual program (programs/*.yml) rodar baseado em classificação da task. Funciona em paralelo
  com o hook intent-classifier (que sugere) e a skill 09 (orchestrator, que monta pipelines ad-hoc). Use
  quando o usuário pede algo que pode mapear pra um program existente — antes de improvisar pipeline.
  Trigger em: "qual program", "rodar program", "auto orchestrate", "program apropriado", "qual workflow",
  "what program", "feature grande", "build app", "review PR", "discovery", "legacy", "from scratch",
  "greenfield", "constitution", "spec driven", "adversarial".
allowed-tools: Read, Glob, AskUserQuestion, Bash(node scripts/run-program.mjs *)
---

# Program Router

Decide qual program declarativo rodar baseado em classificação da task. Trabalha em par com:
- **Hook `intent-classifier`** (auto-sugere antes do agente começar)
- **Skill 09 (orchestrator)** (monta pipelines ad-hoc quando não há program adequado)

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/auto-orchestration.md`, `policies/handoffs.md`, `policies/execution.md` e `policies/programs-schema.md`.

### Hierarquia de decisão

1. **Usuário invocou `/run-program <nome>` explícito** → rodar exatamente isso. Skill não interfere.
2. **Hook `intent-classifier` sugeriu program e usuário concordou** → essa skill confirma e dispatcha.
3. **Hook não sugeriu mas task parece grande/estruturada** → essa skill classifica e propõe.
4. **Task é simples/ad-hoc** → essa skill recusa, devolve para skill 09 (orchestrator) montar pipeline informal.

## Quando Usar

- usuário pergunta "qual program devo rodar pra X"
- usuário pede feature/review/discovery sem invocar slash explícito
- hook intent-classifier sugeriu e usuário pediu confirmação
- entre tasks, ao planejar próximo passo

## Quando Nao Usar

- usuário já invocou `/run-program` explícito
- task trivial (typo, rename, format) — devolve para skill 09 ou ação direta
- pergunta informacional ("o que é X program") — devolve para WIKI

## Entradas Esperadas

- descrição da task (pode estar implícita no contexto)
- (opcional) confidence do hook intent-classifier (se já disparou)
- (opcional) `memory/constitution.md` — pode forçar pipeline específico

## Saidas Esperadas

- decisão `routed`: program + inputs sugeridos
- OU decisão `decline`: razão + handoff para skill 09 ou ação direta

## Catálogo de programs (atualizado pra v1.8.0)

| Program | Use case | Confidence sinais |
|---|---|---|
| `pipeline-discovery` | Ideia vaga → discovery formal → issues | "ideia vaga", "preciso de PRD", "grill-me" |
| `spec-driven-development` | Feature em projeto maduro com constitution | "nova feature", "constitution", "spec-driven" |
| `loop-polishing` | Task autônoma com polish pré-commit | "auto-loop", "autônomo", "fire and forget" |
| `detective-spec` | Reverse-engineering de legado | "legacy", "sem docs", "extrair contratos" |
| `adversarial-dev` | App from-scratch com GAN-style adversarial loop | "from scratch", "greenfield", "construir app" |
| `comprehensive-review` | PR review profundo (5 agents) | "review crítico", "5-agent", "comprehensive review" |

## Processo

### Passo 1 — Coletar sinais

- Ler último prompt do usuário
- Verificar se há `additionalContext` do hook `intent-classifier` (geralmente sim, então a decisão é confirmar)
- Detectar palavras-gatilho na conversa atual + repo audit + git log recente

### Passo 2 — Classificar

Match heurístico em ordem de prioridade:

1. **Constitution força pipeline?** — Ler `memory/constitution.md`. Se declara "todo feature passa por spec-driven-development", forçar.
2. **Task tipo "build greenfield"** — sinais: "from scratch", repo vazio, sem ADRs → `adversarial-dev`
3. **Task tipo "feature em projeto existente"** — sinais: ADRs presentes, codebase > 100 files, palavras "feature" + "criar" → `spec-driven-development`
4. **Task tipo "ideia vaga"** — sinais: "não sei", "talvez", < 100 chars no prompt → `pipeline-discovery`
5. **Task tipo "review PR"** — sinais: número de PR mencionado, "review", "auto-fix" → `comprehensive-review`
6. **Task tipo "reverse engineering"** — sinais: codebase sem CLAUDE.md, sem testes, "legacy" → `detective-spec`
7. **Task tipo "autônoma"** — sinais: "rodar até funcionar", "deixa ele trabalhar", "auto" → `loop-polishing`

Se nenhum match: `decline` → handoff skill 09.

### Passo 3 — Confirmar com usuário (via AskUserQuestion)

```
Vou rotear esta task para o program `<nome>` porque <razão concreta>.

Opções:
- ✅ Rodar dry-run primeiro (recomendado) — mostra plano antes de executar
- ▶️  Rodar direto (gates humanos pausam mid-flow)
- 🛠️  Pipeline ad-hoc (devolve para skill 09 montar fluxo custom)
- ❌ Cancelar
```

### Passo 4 — Dispatch

**Se "dry-run":**
```bash
node scripts/run-program.mjs <program-id> --dry-run --input key=value
```
Apresentar plano resolvido. Esperar nova confirmação.

**Se "direto":**
Invocar `/run-program <program-id>` com inputs colhidos.

**Se "ad-hoc":**
Handoff para skill 09 (orchestrator). Skill 09 monta pipeline informal.

**Se "cancelar":**
Devolver controle para conversa normal.

## Anti-padrões

- **Forçar program quando task é exploratória** — exploração merece skill 09 informal
- **Sugerir program sem contexto suficiente** — preferir "decline + pergunta" do que "match errado"
- **Múltiplos programs em sequência sem gate** — gates entre programs são essenciais
- **Roteamento sem ler constitution** — pode propor program que viola princípio do projeto

## Handoff

- **Para `/run-program <name>`** — caminho default quando match high confidence
- **Para skill 09** — quando match low/decline; orchestrator monta fluxo informal
- **Para conversa** — quando user cancela ou task realmente é trivial

## Integração com Pipeline

- **Skill 09 (Orchestrator)** — para tasks sem program adequado, devolve aqui
- **Skill 18 (Repo Auditor)** — input sobre maturidade do codebase ajuda decidir greenfield vs spec-driven
- **Hook intent-classifier** — sugestão pre-skill; aqui confirma ou refuta
- **Constitution** — pode forçar pipeline; skill 39 respeita

## Verificação

Listar programs disponíveis sem rotear:
```bash
node scripts/run-program.mjs --list
```

Inspecionar program específico antes de propor:
```bash
node scripts/run-program.mjs --describe <program-id>
```
