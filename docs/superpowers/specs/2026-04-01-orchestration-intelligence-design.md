# Orchestration Intelligence — Design Spec

**Data:** 2026-04-01
**Status:** Aprovado
**Abordagem:** B (Modular com camadas dedicadas) + Hibrido (hooks nativos + policy fallback)

## Resumo

7 features inspiradas no [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode), adaptadas a arquitetura multi-plataforma do Dev Team Kit. Implementacao hibrida: hooks nativos para Claude Code + policies/MCP como fallback agnostico para outras plataformas.

## Decisoes de Design

| Decisao | Opcao escolhida | Motivo |
|---------|-----------------|--------|
| Runtime do hook system | Hibrido (C) | Hooks nativos no Claude Code + fallback via policy/MCP para Copilot, Windsurf, Gemini |
| Onde salvar learned skills | Projeto only (A) | `.bot/learned-skills/` — cada repo acumula proprio conhecimento |
| Comportamento do pre-execution gate | Escalar por gravidade (C) | score > 0.7 bloqueia, 0.4-0.7 enriquece, < 0.4 passa |
| Filosofia do gate | Capture & Enrich | Sistema infere e confirma, nunca devolve pro usuario escrever mais |
| Arquitetura geral | Modular (B) | Cada feature em seu espaco, skills existentes crescem moderadamente |

---

## Feature 1: Hook System (Lifecycle Events)

### Objetivo
Interceptar lifecycle events do Claude Code para injetar contexto, bloquear acoes e monitorar estado. Fallback via policies para outras plataformas.

### Arquitetura

**Camada nativa (Claude Code):**

```
hooks/
├── hooks.json              ← registro de eventos + scripts
├── config.json             ← thresholds configuraveis
└── scripts/
    ├── session-start.mjs
    ├── pre-tool-enforcer.mjs
    ├── post-tool-verifier.mjs
    ├── context-guard-stop.mjs     ← F2
    ├── keyword-detector.mjs       ← F6 + F7
    ├── persistent-mode.mjs
    └── pre-execution-gate.mjs     ← F5
```

**hooks.json:**

```json
{
  "hooks": [
    {
      "event": "UserPromptSubmit",
      "scripts": [
        "hooks/scripts/pre-execution-gate.mjs",
        "hooks/scripts/keyword-detector.mjs"
      ]
    },
    {
      "event": "PreToolUse",
      "scripts": ["hooks/scripts/pre-tool-enforcer.mjs"]
    },
    {
      "event": "Stop",
      "scripts": [
        "hooks/scripts/context-guard-stop.mjs",
        "hooks/scripts/persistent-mode.mjs"
      ]
    },
    {
      "event": "SessionStart",
      "scripts": ["hooks/scripts/session-start.mjs"]
    },
    {
      "event": "PostToolUse",
      "scripts": ["hooks/scripts/post-tool-verifier.mjs"]
    }
  ]
}
```

**Protocolo de retorno dos scripts:**
- `{ continue: true }` — prossegue normalmente
- `{ continue: true, hookSpecificOutput: { additionalContext: "..." } }` — prossegue com contexto injetado
- `{ continue: false, hookSpecificOutput: { additionalContext: "..." } }` — bloqueia com mensagem

**Camada agnostica (fallback):**
- `policies/hooks.md` — descreve as mesmas regras como instrucoes que o agente segue
- MCP tools (`devkit_context_guard`, `devkit_ambiguity_score`, etc.) — logica programatica acessivel de qualquer cliente

**Scripts auxiliares (sem feature dedicada):**
- `session-start.mjs` — restaura estado da sessao anterior, verifica versao do kit
- `pre-tool-enforcer.mjs` — lembretes contextuais antes de tools (ex: "re-leia o arquivo antes de editar" apos 10+ mensagens)
- `persistent-mode.mjs` — quando pipeline esta ativo, previne stop prematuro reinjetando "continue trabalhando"

**Instalacao:** `install.sh` ganha step novo que copia `hooks/` e registra no `.claude/settings.json` do projeto consumidor. Plataformas sem suporte a hooks recebem a policy automaticamente.

---

## Feature 2: Context Guard

### Objetivo
Monitorar uso de contexto e prevenir que o agente pare quando deveria compactar. Complementa o Context Decay Awareness do GLOBAL.md.

### Hook nativo (`context-guard-stop.mjs`)
- Evento: `Stop`
- Le tail do transcript, calcula `input_tokens / context_window`
- Se > threshold: bloqueia stop, injeta mensagem para compactar
- Max 2 bloqueios por sessao (retry guard)
- Nunca bloqueia stop por context-limit (evita deadlock de compactacao)

### Thresholds (`config.json`)

```json
{
  "context_guard": {
    "warn_threshold": 0.60,
    "block_threshold": 0.75,
    "max_blocks_per_session": 2
  }
}
```

### MCP tool: `devkit_context_guard`

```
Input:  { input_tokens: number, context_window: number }
Output: {
  usage_percent: number,
  should_compact: boolean,
  should_block_stop: boolean,
  message: string
}
```

### Policy fallback (`policies/hooks.md` — secao Context Guard)

```
- Antes de encerrar, verificar se contexto > 75%
- Se > 75%: executar /compact antes de parar
- Se > 90%: compactar imediatamente
- Nao parar no meio de pipeline ativo sem compactar
```

### Integracao
GLOBAL.md — Context Decay Awareness ganha referencia ao Context Guard.

---

## Feature 3: Commit Trailers Estruturados

### Objetivo
Preservar decisoes arquiteturais no git history via trailers padronizados nos commits. Upgrade no Reviewer (11).

### Trailers definidos

| Trailer | Quando usar | Exemplo |
|---------|-------------|---------|
| `Constraint:` | Restricao externa que limitou a solucao | `Constraint: API legada nao suporta batch` |
| `Rejected:` | Alternativa considerada e descartada | `Rejected: Redis cache \| latencia no free tier` |
| `Directive:` | Decisao de design intencional | `Directive: Single source of truth no Zustand` |
| `Confidence:` | Nivel de certeza da solucao | `Confidence: high \| coberto por e2e` |
| `Scope-risk:` | Risco de impacto em outras areas | `Scope-risk: low \| mudanca isolada no adapter` |
| `Not-tested:` | O que ficou sem teste e por que | `Not-tested: fallback offline \| precisa mock de rede` |

### Formato no commit

```
feat: add streaming endpoint for AI chat

Implement SSE-based streaming for real-time token delivery.

Constraint: Vercel serverless tem timeout de 30s — chunked response obrigatorio
Rejected: WebSocket | complexidade de infra desproporcional para MVP
Directive: stream via ReadableStream nativo, sem lib extra
Confidence: high | coberto por integration test
Scope-risk: medium | middleware de auth ajustado para streaming
```

### Regras de aplicacao
- **Opcional** em commits triviais (typo, rename, formatting)
- **Recomendado** em commits com decisao de design
- **Obrigatorio** quando Reviewer identifica trade-off ou risco

### Artefatos
- `templates/commit-trailers.md` — template novo
- `skills/11-reviewer/SKILL.md` — nova secao "Commit Trailers"
- `policies/quality-gates.md` — nova regra para trailers

### MCP tool: `devkit_suggest_trailers`

```
Input:  { diff_summary: string, decisions: string[], rejected_alternatives: string[] }
Output: { trailers: Array<{ type: string, value: string }>, commit_message: string }
```

---

## Feature 4: Deep Interview com Ambiguity Scoring

### Objetivo
Upgrade no PO (01). Scoring matematico para detectar briefings vagos + entrevista estruturada com tracking de estabilidade ontologica.

### Formula de ambiguidade

```
ambiguity = 1 - (goal * 0.40 + constraints * 0.30 + criteria * 0.30)
```

Cada dimensao e score 0-1:

| Dimensao | Score 0 (vago) | Score 1 (concreto) |
|----------|----------------|---------------------|
| `goal` | "quero melhorar o app" | "adicionar filtro de preco na listagem" |
| `constraints` | nenhuma restricao | "max 500ms, sem breaking change na API v2" |
| `criteria` | "que funcione bem" | "filtro retorna em <500ms, persiste na URL" |

### Variante Brownfield (projeto existente)

```
ambiguity = 1 - (goal * 0.30 + constraints * 0.25 + criteria * 0.25 + context_clarity * 0.20)
```

`context_clarity` mede se o dev sabe onde no codigo a mudanca acontece.

### Thresholds (alinhados com Feature 5)
- `score < 0.4` → prossegue, briefing claro
- `score 0.4-0.7` → enrich mode (sistema infere e confirma)
- `score > 0.7` → guided enrich (1 pergunta focada com opcoes)

### Deep Interview — fluxo
1. PO faz ate 5 rodadas de perguntas focadas (uma por vez)
2. A cada rodada extrai ontologia: entidades, campos, relacionamentos
3. Calcula stability ratio entre rodadas
4. Se stability > 0.8 por 2 rodadas consecutivas → ontologia estavel, pode parar
5. Se apos 5 rodadas stability < 0.8 → avisa que escopo precisa mais trabalho

### Artefatos
- `skills/01-po-feature-spec/SKILL.md` — nova secao "Ambiguity Scoring" + "Deep Interview Protocol"
- `templates/deep-interview.md` — template com estrutura de rodada e ontologia

### MCP tool: `devkit_ambiguity_score`

```
Input:  {
  description: string,
  is_brownfield: boolean,
  mentioned_files: string[],
  constraints: string[],
  criteria: string[]
}
Output: {
  score: number,
  dimensions: { goal, constraints, criteria, context_clarity? },
  action: "proceed" | "warn" | "block",
  suggested_questions: string[]
}
```

---

## Feature 5: Pre-execution Gate (Capture & Enrich)

### Objetivo
Interceptar prompts antes do Orchestrator montar pipeline. Detectar sinais concretos para decidir se executa, enriquece ou faz pergunta guiada.

### Filosofia
O usuario diz o minimo. O sistema captura, enriquece e confirma. Nunca devolve "escreva mais".

### Sinais concretos que bypassam o gate

| Sinal | Pattern | Exemplo |
|-------|---------|---------|
| File path | `/`, `\`, `.ts`, `.py` com dir | "edite src/lib/auth.ts" |
| Issue/PR number | `#\d+`, `issue \d+` | "fix #423" |
| Simbolo de codigo | camelCase, PascalCase, snake_case | "refatore handleSubmit" |
| Numbered steps | `1.`, `2.`, `- [ ]` | "1. criar endpoint 2. teste" |
| Acceptance criteria | DADO/QUANDO/ENTAO, GIVEN/WHEN/THEN | "DADO user logado..." |
| Error reference | stack trace, error code | "TypeError: Cannot read..." |
| Code block | triple backtick | bloco de codigo |
| Escape prefix | `force:` ou `!` | "force: faz deploy agora" |

### Fluxo

```
Prompt recebido
    |
    +-- tem sinal concreto? -- SIM -> bypass, Orchestrator executa
    |
    +-- NAO -> calcula ambiguity score
                |
                +-- score < 0.4 -> passa direto
                |
                +-- score 0.4-0.7 -> ENRICH MODE
                |   Sistema usa repo-audit, session-summary, codigo, git log
                |   para INFERIR o que falta. Apresenta:
                |   "Entendi que voce quer [X]. Baseado no projeto:
                |    - Escopo: [inferido]
                |    - Arquivos: [do repo-audit]
                |    - Constraints: [da stack]
                |    -> Bora assim?
                |    -> Quer ajustar ou detalhar algo?
                |    -> Ou era outra coisa?"
                |
                +-- score > 0.7 -> GUIDED ENRICH
                    UMA pergunta focada com opcoes multipla escolha.
                    Com a resposta, sistema completa o resto inferindo.
                    So aciona Deep Interview completa se apos 2 tentativas
                    ainda score > 0.7.
```

### Principios
- Captura minima, enriquecimento maximo
- Confirma, nao interroga — apresenta inferencia + "sim/nao"
- Uma pergunta por vez, com opcoes
- Usa tudo que ja sabe: repo-audit, session, codigo, git log, stack
- Max 2 perguntas antes de prosseguir (fail-forward)
- `force:` ou `!` bypassa sempre
- Sempre oferece 3 saidas: confirma / refina / corrige

### Hook nativo (`pre-execution-gate.mjs`)
- Evento: `UserPromptSubmit` — roda ANTES do keyword-detector
- Retorna block, warn+context, ou pass

### Artefatos
- `hooks/scripts/pre-execution-gate.mjs`
- `skills/09-orchestrator/SKILL.md` — nova secao "Pre-execution Gate"
- `policies/hooks.md` — regras de fallback

### Cadeia de hooks no UserPromptSubmit
```
User prompt -> pre-execution-gate (F5) -> keyword-detector (F6) -> Orchestrator
```

---

## Feature 6: Keyword Sanitization nos Triggers

### Objetivo
Limpar input antes de matching com triggers. Prevenir false positives.

### Pipeline de sanitizacao (3 etapas)

**1. STRIP — remove ruido:**
- code blocks (triple backtick)
- inline code (backtick)
- URLs (http/https)
- file paths (/src/..., C:\...)
- stack traces (at Module._compile, Error:...)
- XML/HTML tags
- JSON blocks

**2. INTENT CHECK — detecta pergunta informacional:**
- janela de 80 chars ao redor do keyword match
- patterns: "o que e", "como funciona", "explica", "what is", "how does"
- se informacional: NAO trigga a skill

**3. MATCH — pattern matching limpo:**
- texto sem ruido, intent confirmada como acao
- retorna skill matched + confidence

### Exemplos

| Input | Sem sanitizacao | Com sanitizacao |
|-------|-----------------|-----------------|
| "o que e o deploy skill?" | trigga Deploy (07) | responde sobre a skill |
| "erro no `security.middleware.ts`" | trigga Security (06) | nao trigga (inline code) |
| "fix bug em https://app.com/review/123" | trigga Reviewer (11) | nao trigga (URL) |
| "faz o deploy do backend" | trigga Deploy (07) | trigga Deploy (07) — correto |

### Artefatos
- `hooks/scripts/keyword-detector.mjs` — implementacao com sanitizacao
- `policies/hooks.md` — regras de fallback
- Sem MCP tool — logica de input, nao de execucao

---

## Feature 7: Learned Skills (Auto-extract)

### Objetivo
Extrair automaticamente conhecimento especifico do projeto durante sessoes. Salvar em `.bot/learned-skills/`.

### Quality Gate — 3 criterios obrigatorios

| Criterio | Passa | Nao passa |
|----------|-------|-----------|
| Nao e Googleavel | workaround de bug do projeto | "como fazer map em JS" |
| Especifico do codebase | "AuthProvider precisa de X antes de Y" | pattern generico de React |
| Exigiu debugging real | 3+ tentativas, investigacao | copy-paste de docs |

Se os 3 passam → extrai. Se qualquer um falha → nao extrai.

### Formato

```markdown
---
name: auth-provider-session-race
description: Race condition no AuthProvider quando token expira durante SSR
triggers: ["auth", "session", "race condition", "token refresh"]
learned_at: 2026-04-01
source_session: resumo do contexto
type: expertise
---

## Insight
[o que descobriu — modelo mental, nao codigo]

## Solucao
[como resolver — passos ou referencia a arquivos]

## Arquivos afetados
- src/lib/auth.ts:45-60
```

### Dois tipos

| Tipo | O que captura | Exemplo |
|------|---------------|---------|
| `expertise` | insight tecnico, workaround, gotcha | race condition no auth |
| `workflow` | processo que funcionou neste projeto | "rodar migrate antes de seed" |

### Extracao — hook `PostToolUse`
`post-tool-verifier.mjs` detecta padroes de resolucao:
- multiplas tentativas no mesmo arquivo
- comentarios "o problema era...", "a causa era..."
- fix que envolveu 3+ arquivos

Se detecta → avalia quality gate → se passa → gera learned skill.

### Injecao — hook `UserPromptSubmit`
`keyword-detector.mjs` faz match nos triggers das learned skills tambem:
- Prioridade: learned skills > skills oficiais (quando conflito de trigger)
- Max 3 learned skills por sessao
- Injeta como contexto adicional

### MCP tool: `devkit_learned_skills`

```
Input:  { action: "list" | "get" | "save", name?: string, content?: string }
Output: { skills: Array<{ name, description, triggers, type, content }> }
```

### Install.sh
Cria `.bot/learned-skills/` como diretorio vazio. Nao copia do kit.

---

## Mapa de Artefatos

### Novos arquivos

```
hooks/
├── hooks.json                         F1
├── config.json                        F2
└── scripts/
    ├── session-start.mjs              F1
    ├── pre-execution-gate.mjs         F5
    ├── keyword-detector.mjs           F6 + F7
    ├── pre-tool-enforcer.mjs          F1
    ├── post-tool-verifier.mjs         F1 + F7
    ├── context-guard-stop.mjs         F2
    └── persistent-mode.mjs            F1

templates/
├── commit-trailers.md                 F3
└── deep-interview.md                  F4

policies/
└── hooks.md                           F1-F7 (fallback agnostico)
```

### Arquivos modificados

| Arquivo | Feature | Mudanca |
|---------|---------|---------|
| `skills/01-po-feature-spec/SKILL.md` | F4 | Secao Ambiguity Scoring + Deep Interview Protocol |
| `skills/09-orchestrator/SKILL.md` | F5 | Secao Pre-execution Gate no protocolo de execucao |
| `skills/11-reviewer/SKILL.md` | F3 | Secao Commit Trailers no protocolo de aprovacao |
| `policies/quality-gates.md` | F3 | Regra de trailers obrigatorios quando ha trade-off |
| `GLOBAL.md` | F2 | Referencia ao Context Guard no Context Decay Awareness |
| `setup/install.sh` | F1, F7 | Step novo para hooks + criar learned-skills/ |
| `mcp-server/src/index.ts` | F2-F4, F7 | 4 tools novas |
| `README.md` | F1-F7 | Secao Hooks + atualizacao de MCP tools |

### MCP tools novas (4)

| Tool | Feature | Tipo |
|------|---------|------|
| `devkit_context_guard` | F2 | Persistence |
| `devkit_ambiguity_score` | F4 | Knowledge |
| `devkit_suggest_trailers` | F3 | Knowledge |
| `devkit_learned_skills` | F7 | Persistence |

---

## Dependencias entre Features

```
F1 (Hook System) ← base para todas as outras
    |
    ├── F2 (Context Guard) ← independente
    ├── F3 (Commit Trailers) ← independente
    ├── F4 (Deep Interview) ← independente
    |       |
    |       └── F5 (Pre-execution Gate) ← depende de F4 (ambiguity score)
    |               |
    |               └── F6 (Keyword Sanitization) ← roda apos F5 no pipeline
    |                       |
    |                       └── F7 (Learned Skills) ← injecao via F6, extracao via F1
    |
    └── F7 (Learned Skills) ← extracao via post-tool-verifier (F1)
```

### Ordem de implementacao recomendada
1. F1 (Hook System) — infraestrutura base
2. F6 (Keyword Sanitization) — melhora triggers existentes
3. F2 (Context Guard) — hook simples, alto impacto
4. F3 (Commit Trailers) — independente, template + skill update
5. F4 (Deep Interview) — PO upgrade + MCP tool
6. F5 (Pre-execution Gate) — depende de F4
7. F7 (Learned Skills) — depende de F1 + F6
