# Dev Team Kit — Wiki Completa

> **Versão:** 37 skills · 14 subagents · 23 slash commands · 22 policies
> **Última atualização:** 2026-05-04
> **Repo:** https://github.com/felvieira/claude-skills-fv
> **Instalação:** `claude plugin install https://github.com/felvieira/claude-skills-fv`

Wiki única do kit. Cada item segue o formato do post [5 Agent Skills I Use Every Day](https://www.aihero.dev/5-agent-skills-i-use-every-day) — **nome, o que faz, quando usar, problema que resolve, exemplo concreto, takeaway** —, mas aqui temos **tudo** (skills + subagents + commands + policies + plugin).

---

## Sumário

1. [Como o kit funciona em 60 segundos](#1-como-o-kit-funciona-em-60-segundos)
2. [Os 2 fluxos: clássico vs discovery](#2-os-2-fluxos-clássico-vs-discovery)
3. [Princípio fundamental: Vertical Slicing](#3-princípio-fundamental-vertical-slicing)
4. [Slash commands (23) — atalhos por fase](#4-slash-commands-23)
5. [Skills (37) — especialistas por categoria](#5-skills-37)
6. [Subagents (14) — despacháveis via Task tool](#6-subagents-14)
7. [Policies (22) — regras compartilhadas](#7-policies-22)
8. [Plugin: como o kit é distribuído](#8-plugin-como-o-kit-é-distribuído)
9. [MCP server: 36 tools por trás dos panos](#9-mcp-server-36-tools-por-trás-dos-panos)
10. [Quando usar o quê: árvore de decisão](#10-quando-usar-o-quê-árvore-de-decisão)
11. [Inspirações e atribuições](#11-inspirações-e-atribuições)

---

## 1. Como o kit funciona em 60 segundos

Você instala o kit num projeto. A partir daí, qualquer agente compatível (Claude Code, Cursor, Windsurf, Copilot, Gemini CLI) ganha **um time inteiro**: PO, designer, backend, frontend, QA, security, deploy, docs, observability, accessibility, etc.

Fluxo típico de uma feature nova:

```
você descreve a feature
  ↓
/spec ou /grill-me              ← PO entende e formaliza
  ↓
/plan                           ← orchestrator quebra em vertical slices
  ↓
/build (por slice, paralelo)    ← back+front+DB juntos
  ↓
/test                           ← QA prova que funciona
  ↓
/review                         ← Reviewer + Security validam
  ↓
/ship                           ← Release Manager + Deploy
```

Tudo guiado por **policies** (regras compartilhadas) e **model routing automático** (haiku para boilerplate, sonnet para implementação, opus para arquitetura — você não paga Opus pra gerar import statement).

---

## 2. Os 2 fluxos: clássico vs discovery

O kit tem **dois pipelines** para feature nova. Coexistem. Escolha por contexto.

### Modo A — `/pipeline` (clássico)

```
/spec → /plan → /build → /test → /review → /ship
```

**Use quando:** feature pequena/média (<1 sprint), spec já clara, equipe conhece o terreno, não precisa publicar PRD/issues no GitHub/Linear/Jira, TDD opcional.

### Modo B — `/pipeline-discovery` (com discovery + TDD)

```
/grill-me → /to-prd → /to-issues → /loop --worktree --parallel N → /ship
                       ↓                ↓
                       N issues        por slice: /build + skill 37 (TDD) + /review
                       no tracker
```

**Use quando:** feature grande/nova/ambígua, briefing vago, equipe nova, vai paralelizar com 2+ workers, precisa publicar PRD + issues no tracker, código crítico que merece TDD enforced.

### Comparativo

| Aspecto | Modo A clássico | Modo B discovery |
|---|---|---|
| Discovery formal | não | **`/grill-me` obrigatório** |
| Output da spec | `docs/specs/X.md` (interno) | PRD em **issue tracker** |
| Quebra em slices | implícita (PO escreve) | **explícita** (`/to-issues` cria 1 issue por slice) |
| Paralelização | manual | **estrutural** (N workers, 1 slice cada) |
| TDD | opcional | **obrigatório por slice** |
| Skill 38 (Architecture Deepener) | não chamado | opcional entre `/to-issues` e `/loop` |

Os 2 fluxos respeitam **`policies/vertical-slices.md`**. Diferença é nível de formalismo e publicação em tracker.

**Takeaway:** **escolha o fluxo errado uma vez** — não a feature errada — e você sente onde dói.

---

## 3. Princípio fundamental: Vertical Slicing

> **Toda feature multi-camada é entregue como uma fatia vertical (DB + back + front + teste e2e), nunca como camadas horizontais paralelas.**

### Errado (layered, paraleliza mas integra mal)

```
Worker A: faz todo o front (login + cadastro + recuperar senha)
Worker B: faz todo o back (login + cadastro + recuperar senha)
Worker C: faz todo o DB (login + cadastro + recuperar senha)
→ ninguém pode testar até os 3 acabarem
→ integração revela 80% dos bugs no fim
```

### Certo (vertical, paraleliza E integra ponta-a-ponta)

```
Worker A: feature de login (DB + back + front + teste e2e) → mergeável sozinho
Worker B: feature de cadastro (DB + back + front + teste e2e) → mergeável sozinho
Worker C: feature de recuperar senha (DB + back + front + teste e2e) → mergeável sozinho
→ cada worker entrega feature testável e demo-able
```

**Quem força isso:** orchestrator (skill 09) recusa plano layer-first. PO (skill 01) escreve user stories já como slices. `/plan` produz tabela de slices antes do build. `policies/vertical-slices.md` tem anti-padrões e heurísticas de tamanho.

**Quando NÃO aplicar:** task single-layer (só front OU só back), bug fix localizado, refactor cross-cutting, chore.

**Takeaway:** **paralelismo é diferente de coordenação.** Layered slicing paraleliza tarefas mas adia integração — é falsa eficiência.

---

## 4. Slash commands (23)

São atalhos por fase. Não precisa decorar nome de skill — chama o atalho, ele roteia.

### Comandos de fase (modo A — clássico)

#### `/spec` — Especificar feature

**O que faz:** PO escreve user stories, critérios de aceitação testáveis, prioridade, riscos.
**Quando usar:** ideia nova ou requisito vago precisa virar spec acionável.
**Problema que resolve:** evita "build sem entender o pedido", reduz retrabalho.
**Exemplo:** `/spec adicionar dark mode com persistência por usuário`
**Takeaway:** **toda feature começa aqui.** Pular spec custa 3-5x mais em rework.

#### `/plan` — Montar pipeline

**O que faz:** orchestrator classifica complexidade da task e define o pipeline mínimo (quais skills chamar, em que ordem). Quebra em vertical slices se for multi-camada.
**Quando usar:** task grande, não sabe por onde começar; quer um roadmap antes de codar.
**Problema que resolve:** evita rodar pipeline cheio quando bug fix simples basta.
**Exemplo:** `/plan migrar autenticação para OAuth2`
**Takeaway:** **pipeline é mínimo necessário.** Skills caras (security, deploy) só entram quando a task pede.

#### `/build` — Implementar

**O que faz:** Backend (skill 03) + Frontend (skill 04) com a stack real do projeto (lê `docs/repo-audit/current.md` antes).
**Quando usar:** spec pronta, implementar é o próximo passo.
**Problema que resolve:** consistência com convenções existentes em vez de "agente inventando estilo novo".
**Exemplo:** `/build implementar endpoint POST /api/orders conforme spec`
**Takeaway:** **stack vem da auditoria, não do treinamento.** Auditar repo primeiro evita mismatch.

#### `/test` — Escrever e rodar testes

**O que faz:** QA (skill 05) seguindo "prove-it" — happy path + error + edge case + regression.
**Quando usar:** após implementar, ou para preencher gap de cobertura, ou para validar fix.
**Problema que resolve:** "funciona local" sem teste = bug em produção esperando.
**Exemplo:** `/test cobrir orderService incluindo desconto VIP e estoque insuficiente`
**Takeaway:** **se diz que funciona, prova com teste.** Falar não conta.

#### `/review` — Review final + security

**O que faz:** Reviewer (skill 11) + Security (skill 06) validam o delta antes do merge.
**Quando usar:** PR pronto, antes de pedir review humano ou mergear.
**Problema que resolve:** pega bug óbvio, vulnerabilidade comum, débito antes de virar dívida.
**Exemplo:** `/review` (no contexto de PR aberto)
**Takeaway:** **Critical/High aberto = no merge.** Reviewer é gate, não sugestão.

#### `/best` — Auditoria de boas práticas

**O que faz:** Reviewer + Security + QA juntos auditam clean code, DRY, SOLID, OWASP.
**Quando usar:** antes de release, código herdado, ou sentindo "isso aqui tá feio".
**Problema que resolve:** débito técnico que ninguém quer abrir issue para tratar.
**Exemplo:** `/best src/services/billing/`
**Takeaway:** **rode antes de pedir refactor.** O relatório justifica o trabalho.

#### `/simplify` — Refatorar

**O que faz:** Migration & Refactor (skill 23) propõe simplificação preservando comportamento.
**Quando usar:** código funciona mas tá complicado; antes de adicionar feature em módulo god.
**Problema que resolve:** refactor "vamos limpar" sem critério vira novo bug.
**Exemplo:** `/simplify src/auth/middleware.ts (god function 200 linhas)`
**Takeaway:** **refactor com plano e teste de regressão.** Sem rede, vira regressão.

#### `/ship` — Release e deploy

**O que faz:** Release Manager (skill 24) + Deploy (skill 07) — changelog, versionamento, rollout, rollback plan.
**Quando usar:** feature pronta + testada + revisada, hora de subir.
**Problema que resolve:** deploy "no susto", rollback improvisado, changelog vazio.
**Exemplo:** `/ship v2.4.0 com migration de schema`
**Takeaway:** **deploy é evento documentado.** Rollback ensaiado vale mais que confiança cega.

#### `/pipeline` — End-to-end clássico

**O que faz:** orchestrator roda spec → plan → build → test → review → ship em sequência.
**Quando usar:** feature pequena/média, equipe conhece o terreno, sem necessidade de issue tracker.
**Problema que resolve:** pular fases por preguiça gera retrabalho 3x maior depois.
**Exemplo:** `/pipeline criar página de configurações de usuário`
**Takeaway:** **pipeline completo é desperdício para bug fix, vital para feature.**

### Comandos do fluxo discovery (modo B)

#### `/grill-me` — Interrogatório de plano

**O que faz:** PO em modo Deep Interview sempre-ativo. Faz **uma pergunta por vez**, recomenda resposta, caminha pela árvore de decisão até convergir.
**Quando usar:** ideia ainda vaga, antes de `/spec` ou `/to-prd`.
**Problema que resolve:** spec produzida com "unknown unknowns" silenciosos.
**Exemplo:** `/grill-me quero refazer o checkout para reduzir abandono`
**Takeaway:** **uma pergunta por turno + resposta sugerida.** Lista de 20 perguntas mata fluxo. Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me).

#### `/to-prd` — Conversa → PRD em issue tracker

**O que faz:** pega contexto da conversa atual e publica PRD no GitHub/Linear/Jira (label `needs-triage`). Não entrevista — sintetiza. Detecta tracker automaticamente (`gh auth status`, `LINEAR_API_KEY` env, `acli`); se nada disponível, salva em `docs/prd/`.
**Quando usar:** após `/grill-me` convergir, antes de `/to-issues`.
**Problema que resolve:** PRDs vivem em conversas perdidas; precisam de tracker para virar trabalho.
**Exemplo:** `/to-prd` (no contexto pós-grill-me)
**Takeaway:** **PRD vai pro tracker com label needs-triage.** Spec interna usa `/spec` em `docs/specs/`. Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-prd).

#### `/to-issues` — PRD → vertical slices no tracker

**O que faz:** quebra PRD em N issues independentes (vertical slices/tracer bullets). Cada issue é HITL ou AFK. Publica todas com label `needs-triage`, em ordem de dependência.
**Quando usar:** após `/to-prd`, antes de `/loop --worktree --parallel N`.
**Problema que resolve:** workers paralelos sem issues atribuíveis = caos; layered slicing disfarçado de vertical.
**Exemplo:** `/to-issues #142` (referência ao PRD)
**Takeaway:** **cada issue corta TODAS as camadas.** Layered slicing é proibido (`policies/vertical-slices.md`). Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/to-issues).

#### `/pipeline-discovery` — Discovery + slicing + TDD

**O que faz:** orquestrador top-level. Roda fluxo completo `grill-me → to-prd → to-issues → loop+TDD → ship`. Publica PRD + N issues, paraleliza por slice, TDD por slice. **4 gates de aprovação humana obrigatórios** (PRD, issues, dispatch workers, deploy).
**Quando usar:** feature grande/nova/ambígua, equipe nova, vai paralelizar 2+ workers, código crítico.
**Problema que resolve:** spec rasa virando integration mess; trabalho não tracked; integração só no fim.
**Exemplo:** `/pipeline-discovery quero adicionar autenticação social (Google + GitHub)`
**Takeaway:** **discovery formal + issues no tracker + TDD por slice = qualidade alta com paralelização real.**

### Comandos autônomos / utilitários

#### `/auto` — Agente autônomo (1 sessão)

**O que faz:** executa task completa sem intervenção. 10 padrões de produção: progress tracking via checkboxes, inter-iteration memory, context narrowing progressivo, tiered validation (lint→typecheck→build), error deduplication, completion override, dynamic budget, validation feedback loop, stall detection, build-fix extension.
**Quando usar:** task complexa que você quer entregar overnight; quer ir tomar café e voltar com PR pronto.
**Problema que resolve:** agente ficar travado no mesmo erro 3x sem detectar.
**Exemplo:** `/auto refatorar todo módulo billing para usar nova lib de pagamentos`
**Takeaway:** **fire and forget — mas com circuit breaker.** Stall detection economiza centenas de iterações.

#### `/loop` — Auto-loop v2 (multi-agente, paralelo)

**O que faz:** loop autônomo v2. Multi-agente (claude + codex), worktree integrado, paralelização real (`--worktree --parallel N`), polishing pass configurável (`none|light|standard|full`).
**Quando usar:** várias features independentes overnight; quer 4 PRs prontos amanhã de manhã.
**Problema que resolve:** orquestrar workers paralelos manualmente é caro e propenso a conflito.
**Exemplo:** `node scripts/auto-loop.mjs "task" --worktree --parallel 4 --polish standard`
**Takeaway:** **paralelismo real exige worktrees.** Sem isso, 2 workers no mesmo repo = chaos.

#### `/worktree` — Worktree isolado

**O que faz:** cria git worktree isolado, copia `.env*`, valida ambiente em background.
**Quando usar:** trabalhar em paralelo sem afetar branch atual; antes de executar plano grande.
**Problema que resolve:** stash + checkout = perde estado mental e arquivos não-commitados.
**Exemplo:** `/worktree feat/payments`
**Takeaway:** **branch ≠ worktree.** Worktree dá diretório físico isolado.

#### `/detective-spec` — Engenharia reversa de spec em legado

**O que faz:** entra em codebase legado, extrai contratos executáveis (módulos, regras de negócio, fluxos, ADRs retroativos) sem modificar 1 linha. Pipeline de 5 fases com checkpoint/resume em `.detective/state.json`. Output em `_detective_sdd/`. Inspirado em [Reversa](https://github.com/sandeco/reversa).
**Quando usar:** legado sem doc, vibe coded, antes de evoluir feature em módulo desconhecido, migração, onboarding.
**Problema que resolve:** time herda monolito de 5 anos sem doc — agente não sabe o que pode quebrar.
**Exemplo:** `/detective-spec --module=src/billing`
**Takeaway:** **zero writes no projeto legado.** Verificável via `git status`. Spec gerada vira contrato operacional consumível por outro agente.

### Comandos de instalação / utilitários do kit

#### `/devkit-install-fv` — Instalar kit em `.bot/` no repo consumidor

**O que faz:** instala o kit completo (skills + policies + templates + MCP + hooks + multi-platform configs) em `.bot/` do repo onde foi rodado.
**Quando usar:** primeira vez que vai usar o kit em um projeto.
**Problema que resolve:** instalação manual envolveria copiar 100+ arquivos.
**Exemplo:** `/devkit-install-fv`

#### `/audit-repo` — Auditoria do repositório

**O que faz:** Repo Auditor (skill 18) faz fotografia operacional do projeto (stack, convenções, riscos, entry points, tech debt) e persiste em `docs/repo-audit/current.md`.
**Quando usar:** primeiro contato com um repo; antes de feature grande.
**Problema que resolve:** agente lê `package.json` 50 vezes em vez de cachear o conhecimento.
**Exemplo:** `/audit-repo`
**Takeaway:** **auditoria persistida = economia de tokens.** Splits opcionais por tipo (`routes.md`, `schema.md`, `components.md`, etc).

#### `/inventory-assets` — Inventário de assets

**O que faz:** Asset Librarian (skill 19) cataloga logos, ícones, fontes, tokens visuais.
**Quando usar:** antes de gerar imagem nova (skill 17) — evita reinventar identidade visual.

#### `/plan-feature` — Planejamento de feature

**O que faz:** atalho legado para iniciar planejamento de feature. Hoje, prefira `/plan` ou `/pipeline-discovery`.

#### `/review-release` — Review pré-release

**O que faz:** auditoria conjunta antes de release final. Hoje, `/review` + `/best` cobrem.

---

## 5. Skills (37)

Cada skill é uma especialidade. Tem frontmatter com `description` (triggers de ativação), `allowed-tools` (escopo de ferramentas), e SKILL.md com protocolo. Skill 16 está intencionalmente vago (absorvida pela `policies/model-routing.md`).

### Categoria: Management & Coordination

#### Skill 08 — Context Manager

**O que faz:** rastreia foco, tasks abertas, hot files e handoffs entre sessões longas.
**Quando ativar:** sessão longa com várias features paralelas; risco de perder contexto.
**Problema que resolve:** agente esquece o que estava fazendo após compactação automática.

#### Skill 09 — Orchestrator

**O que faz:** Tech Lead. Classifica complexidade da task, define pipeline mínimo, delega para skills, adapta em caso de rejeição. Conhece os 2 fluxos (clássico vs discovery) e escolhe.
**Quando ativar:** task complexa, várias skills candidatas, precisa de roteamento.
**Problema que resolve:** rodar pipeline cheio para bug fix simples queima tokens à toa.
**Takeaway:** **orchestrator é o cérebro do kit.** Sem ele, você roteia manualmente.

#### Skill 10 — Documenter

**O que faz:** registra decisões, contratos de API, operações e impactos em docs vivos. Atua transversal — toda mudança relevante de regra/contrato passa por aqui.
**Quando ativar:** feature ou refactor que muda comportamento documentado.

#### Skill 11 — Reviewer

**O que faz:** valida o delta final antes do release — qualidade, escopo, risco. 5 eixos: correctness, design, readability, performance, security.
**Quando ativar:** sempre antes de merge ou release.
**Problema que resolve:** "achei que tava bom" sem critério vira bug em produção.
**Takeaway:** **Reviewer é gate, não opinião.** Critical aberto = no merge.

#### Skill 17 — Image Generator

**O que faz:** gera ou adapta assets visuais (hero, mascote, illustration, background, layout, icon) via fal.ai (5 modelos: gpt-image-1-mini, Gemini 2.5 Flash, Gemini 3 Pro, gpt-image-1.5, Grok Imagine). Vendor-agnostic — alternativas (Replicate, OpenAI direto, Stability) suportadas.
**Quando ativar:** projeto precisa de imagem nova ou derivada.
**Problema que resolve:** "imagem aqui" placeholder em landing page.
**Takeaway:** **decisão por modelo é por custo + qualidade.** Pipeline multi-modelo (iterar barato → validar médio → final premium) custa $0.10-$0.50 por hero. Detalhes em `docs/skill-guides/image-generator-models.md`.

#### Skill 18 — Repo Auditor

**O que faz:** snapshot operacional do repo (stack, convenções, assets, testes, deploy, observability, riscos). Persiste em `docs/repo-audit/current.md` + splits por tipo (`routes.md`, `schema.md`, `components.md`, `services.md`, `infra.md`).
**Quando ativar:** primeiro contato com repo; mudança grande de stack; antes de feature grande.
**Problema que resolve:** agente reler 200 arquivos toda vez = $$$.
**Takeaway:** **auditoria é cache.** Atualizar só quando muda.

#### Skill 19 — Asset Librarian

**O que faz:** cataloga logos, ícones, fontes, tokens visuais e assets reutilizáveis em `docs/repo-audit/assets.md`.
**Quando ativar:** projeto com identidade visual estabelecida; antes de skill 17 ou 36.
**Problema que resolve:** Image Generator inventa estilo novo ignorando o que já existe.

#### Skill 20 — Observability SRE

**O que faz:** define logs estruturados, métricas, tracing, alertas e plano de rollback.
**Quando ativar:** antes de subir feature crítica em produção.
**Problema que resolve:** "não sabemos por que caiu" porque ninguém colocou log.

#### Skill 21 — Data Analytics

**O que faz:** define eventos de tracking, naming, funnels, KPIs do produto.
**Quando ativar:** feature nova com impacto de produto que precisa medir.

#### Skill 22 — Accessibility Specialist

**O que faz:** revisa WCAG 2.2, navegação por teclado, semântica HTML, motion reduction.
**Quando ativar:** antes de release de feature com UI; auditoria periódica.

#### Skill 23 — Migration & Refactor Specialist

**O que faz:** roda migrations incrementais, feature flags e rollback seguro. **Recebe plano de deepening da skill 38** e executa o refactor com TDD (skill 37).
**Quando ativar:** refactor grande, migração de stack, mudança que precisa de feature flag.
**Problema que resolve:** "vamos limpar" sem plano = regressão garantida.

#### Skill 24 — Release Manager

**O que faz:** organiza changelog, release notes, versionamento, gradual rollout.
**Quando ativar:** ciclo de release.

#### Skill 25 — AI Integration Architect

**O que faz:** desenha adapters de IA, gateways, streaming, fallbacks, custo de inferência.
**Quando ativar:** integração nova com LLM em produto.
**Problema que resolve:** acoplar produto a 1 vendor = lock-in caro depois.

#### Skill 26 — Prompt Engineer

**O que faz:** escreve e itera prompts, templates reutilizáveis, estratégias few-shot.
**Quando ativar:** prompt do produto precisa de iteração + eval sistemático.

#### Skill 27 — Video Integration Specialist

**O que faz:** integra video generativo com foco em UX, latência e formato.

#### Skill 28 — CLAUDE.md Generator

**O que faz:** gera `CLAUDE.md` inteligente para projetos consumidores do kit.
**Quando ativar:** primeira vez instalando o kit em um projeto.

#### Skill 30 — Cost Tracker

**O que faz:** rastreia custo de tokens e API calls por sessão, skill e tier de modelo.
**Quando ativar:** sempre — passivo, registra em background.
**Takeaway:** **se você não mede, você não otimiza.** Cost Tracker virou prática default.

#### Skill 31 — Session Summary

**O que faz:** consolida resumo de sessão para handoff limpo entre sessões longas.
**Quando ativar:** fim de sessão grande; antes de fechar IDE.

#### Skill 32 — Smart Suggestions

**O que faz:** sugere a próxima ação mais impactante baseado no estado real do projeto.
**Quando ativar:** "e agora, o que?" depois de mergear feature.

#### Skill 33 — Detective Spec

**O que faz:** engenharia reversa de spec em legado — extrai módulos, regras de negócio, fluxos, ADRs retroativos. **Zero writes** no projeto (verificável via `git status --porcelain`). Pipeline de 5 fases com checkpoint/resume.
**Quando ativar:** legado sem doc; vibe coded; onboarding em codebase grande.
**Problema que resolve:** agente não consegue evoluir o que não entende.
**Takeaway:** **spec gerada vira contrato operacional**, não doc para humano ler.

#### Skill 34 — Static Analysis

**O que faz:** scan automatizado via Semgrep + CodeQL com SARIF output, triagem de severidade (Critical/High/Medium/Low/Info), supressão de FP justificada, custom rules em `tools/semgrep/`. Despacha 5 subagents auxiliares para escala.
**Quando ativar:** pré-release, PR grande, auditoria periódica, variant analysis após bug.
**Problema que resolve:** review manual de segurança não pega tudo.

#### Skill 35 — Skill Author

**O que faz:** **meta-skill.** Cria, edita, avalia e otimiza as próprias skills do kit. Define template obrigatório de SKILL.md, eval scorecard (10 critérios × 0-3, threshold 22/30 para merge), pipelines para create/edit/eval/optimize.
**Quando ativar:** adicionar skill nova; refatorar skill existente; avaliar qualidade do kit.
**Problema que resolve:** kit cresce por copy-paste, cada skill diverge das convenções.
**Takeaway:** **skill que governa as outras skills.** Sustentabilidade do próprio kit.

#### Skill 36 — Web Asset Generator

**O que faz:** deriva assets web operacionais a partir de logo: favicons multi-tamanho, PWA icons (incl. maskable com 80% safe area), Open Graph (1200x630), Twitter card (1200x675), manifest, browserconfig, snippet HTML completo. 3 opções de tooling (realfavicongenerator CLI, ImageMagick, Sharp).
**Quando ativar:** antes do primeiro deploy; rebrand; adicionar suporte PWA; preparar landing.
**Problema que resolve:** deploy sem favicon, OG image em branco no WhatsApp, PWA sem maskable.
**Takeaway:** **handoff direto da skill 17** — skill 17 cria criativo, skill 36 deriva pacote operacional.

### Categoria: Product and Design

#### Skill 01 — PO (Feature Spec)

**O que faz:** escreve user stories, critérios de aceitação testáveis, prioridade, riscos. Tem **Deep Interview** (ambiguity > 0.7) e **Enrich Mode** (ambiguity 0.4-0.7) com inferência do repo-audit.
**Quando ativar:** toda feature começa aqui.
**Problema que resolve:** "build sem entender o pedido" → 3x rework.
**Takeaway:** **PO é o guardião do valor de negócio.** User stories já como vertical slices.

#### Skill 02 — UI/UX Designer

**O que faz:** define layout, sistema de tokens, responsividade, heurísticas de uso.
**Quando ativar:** feature com interface; rebranding; design system novo.
**Problema que resolve:** UI inventada por agente sem critério vira inconsistente.

#### Skill 29 — Design Intelligence

**O que faz:** pesquisa concorrentes, captura screenshots, analisa tendências visuais, entrega dossier estratégico para UI/UX.
**Quando ativar:** feature inovadora ou rebranding — antes de UI/UX começar.
**Problema que resolve:** design "do nada" sem benchmark de mercado.

### Categoria: Development

#### Skill 03 — Backend Engineer

**O que faz:** APIs REST/GraphQL, contratos, auth, validação, banco, integrações.
**Quando ativar:** implementação backend.
**Problema que resolve:** API inventada sem ler convenções do projeto.

#### Skill 04 — Frontend Engineer

**O que faz:** React/Next.js, estado, chamadas API, performance, experiência.
**Quando ativar:** implementação frontend.

#### Skill 12 — Motion Designer

**O que faz:** animações, transições, micro-interações, comportamento visual coeso.
**Quando ativar:** feature precisa de motion (modal, toast, skeleton, scroll, hover).

#### Skill 15 — Mobile / Tauri

**O que faz:** extensão para apps desktop e mobile com Tauri + React Native.
**Quando ativar:** projeto vai além de web.

### Categoria: Content and Discovery

#### Skill 13 — Marketing Copy

**O que faz:** copy de produto, CTAs, landing pages, brand voice, mensagens de conversão.
**Quando ativar:** landing page, anúncio, email marketing.

#### Skill 14 — SEO Specialist

**O que faz:** metadata, schema.org, Core Web Vitals, sitemap, discoverability.
**Quando ativar:** site público; antes de Google indexar.

### Categoria: Quality and Delivery

#### Skill 05 — QA Engineer

**O que faz:** testes unitários, integração, E2E, cobertura, edge cases críticos. Filosofia "prove-it" — se diz que funciona, prova com teste. **Complementa skill 37 (TDD)** com edge cases não cobertos.
**Quando ativar:** pós-implementação; preencher gap; validar fix.
**Takeaway:** **falar não conta. Teste prova.**

#### Skill 06 — Security Reviewer

**O que faz:** OWASP Top 10, headers, CORS, CSRF, XSS, injection, exposição de dados. Pensa como atacante. Critical findings vêm com PoC.
**Quando ativar:** antes de deploy de feature crítica; toda PR que toca auth/input handling.
**Problema que resolve:** descobrir vulnerabilidade na conta do cliente é tarde demais.

#### Skill 07 — Deploy Engineer

**O que faz:** containerização, CI/CD, blue-green rollout, rollback, infra as code.
**Quando ativar:** deploy novo; mudança de infra.

#### Skill 37 — TDD Engineer

**O que faz:** **red-green-refactor enforced.** 1 teste → 1 implementação → repete. Combate "horizontal slicing" no nível de teste (escrever todos os testes antes de toda implementação produz testes ruins). Tabela anti-rationalization com 9 falácias comuns. Pareia com skill 38 para identificar deep modules antes do RED.
**Quando ativar:** feature complexa; bug fix em código crítico; refactor; design de módulo novo.
**Problema que resolve:** testes em massa testam shape em vez de behavior; quebram em refactor sem motivo.
**Takeaway:** **testes verificam comportamento via interface pública, não detalhes de implementação.** Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/tdd).

#### Skill 38 — Architecture Deepener

**O que faz:** encontra **deepening opportunities** (deletion test, deep modules, seams). Glossário arquitetural rigoroso (Module/Interface/Implementation/Depth/Seam/Adapter/Leverage/Locality). **Não modifica código** — propõe candidatos. Skill 23 (Migration & Refactor) executa.
**Quando ativar:** semanalmente; antes de delegar manutenção a agente em módulo complexo; pós-Detective em legado; review de PR que adiciona módulo.
**Problema que resolve:** módulos shallow (interface tão complexa quanto implementação) que viram god files e bloqueiam evolução.
**Takeaway:** **deletion test é o coração.** Se deletar concentra complexidade, módulo estava ganhando seu lugar. Adaptado de [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills/engineering/improve-codebase-architecture).

---

## 6. Subagents (14)

Subagents são especialistas dispatcháveis via `Task` tool. Diferente de skills (que são markdown carregado pelo orchestrator), subagents rodam em sessão isolada com contexto próprio. Ideal para tarefas com escopo bem definido que se beneficiam de fresh context.

### Core (5)

#### `code-reviewer`
Senior code reviewer focado em clean code, DRY, SOLID, correctness, performance e security. **Quando usar:** PR review, feature concluída, qualquer código antes de merge. **Tools:** Read, Grep, Glob, Bash.

#### `security-auditor`
Auditor de segurança especializado em web. Pensa como atacante, reporta como defensor. **Quando usar:** auth flows, input handling, deps, CORS, headers, pré-deploy. **Tools:** Read, Grep, Glob, Bash.

#### `test-engineer`
QA "Prove-It". Happy path, error, edge case, regression, performance. **Quando usar:** escrever testes, preencher cobertura, validar regressões. **Tools:** Read, Grep, Glob, Bash, Edit, Write.

#### `orchestrator`
Tech Lead. Classifica task, define pipeline mínimo, coordena skills. **Quando usar:** task complexa, várias skills candidatas. **Tools:** todas.

#### `debugger`
Root cause sistemático: hipótese → evidência → fix mínimo. **Evidence Ledger** explícito + **anti-rationalization table** com 10 falácias comuns. Heurísticas por classe de bug (race, leak, perf, auth, off-by-one, encoding). **Quando usar:** bug, comportamento inesperado, falha que não consegue explicar. **Tools:** Read, Grep, Glob, Bash, Edit.

### Detective Spec (4) — fases do `/detective-spec`

#### `detective-contracts`
Fase 2: extrai contratos de módulo (API pública, dependências, invariantes, consumidores) de código legado. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-business-rules`
Fase 3: extrai regras de negócio escondidas em validações, constantes mágicas, transições de estado, mensagens de erro, testes. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-flows`
Fase 4: reconstrói fluxos end-to-end (entry → side effects) com edge cases, estado mutado, falhas. Read-only. **Tools:** Read, Grep, Glob, Bash.

#### `detective-adrs`
Fase 5: infere ADRs retroativos + sintetiza overview + traceability. Read-only. **Tools:** Read, Grep, Glob, Bash.

### Static Analysis (5) — pipeline da skill 34

#### `semgrep-scanner`
Repo multi-linguagem: scans Semgrep em paralelo por categoria de linguagem, agrega SARIF. **Tools:** Read, Grep, Glob, Bash.

#### `semgrep-triager`
Batch >20 findings: classifica TP/FP/needs-investigation lendo contexto fonte, propõe fixes. **Approval gate obrigatório** antes de aplicar `nosemgrep:` no código. **Tools:** Read, Grep, Glob, Write.

#### `codeql-runner`
Bug precisa taint tracking interprocedural: orquestra build de database CodeQL + queries. Cache por commit hash em `.detective-scan/codeql-db/<lang>/`. **Tools:** Read, Grep, Glob, Bash.

#### `sarif-parsing`
Múltiplas fontes SARIF: parse, dedup, agrega em relatório único. Diff vs baseline. Extrai tool name de `runs[].tool.driver.name`, não de `input_filename`. **Tools:** Read, Glob, Bash, Write.

#### `variant-analysis`
Bug confirmado → caça variantes do mesmo padrão, gera custom rule reusável para CI. **Approval gate obrigatório** antes de `git add tools/semgrep/<rule>.yml`. **Tools:** Read, Grep, Glob, Bash, Write.

---

## 7. Policies (22)

Policies são regras compartilhadas que governam comportamento das skills. Toda skill cita as policies que segue. **Top 5 mais importantes:**

#### `tool-safety.md`
Tools com mínimo privilégio. Classes de risco (baixo/médio/alto). Aprovação obrigatória para alto risco. **Por que importa:** agente rodando comando destrutivo sem confirmar = problema.

#### `vertical-slices.md`
Toda feature multi-camada entregue como vertical slice (DB+back+front+e2e), nunca layered. **Por que importa:** layered slicing paraleliza tarefas mas adia integração.

#### `quality-gates.md`
Critical/High aberto = no merge. Reviewer + QA + Security são gates, não sugestões. **Por que importa:** gate enforçado é o que diferencia código pro de código indie.

#### `model-routing.md`
Haiku para boilerplate, Sonnet para implementação, Opus para arquitetura. Absorveu skill 16 (llm-selector). **Por que importa:** Opus para gerar `import x from 'y'` queima dinheiro.

#### `writing-clarity.md`
10 regras de Strunk adaptadas para output de agente. Voz ativa, sem palavras-tampão, frases curtas. Aplica a commits, error messages, handoffs, slash command output, docs. **Por que importa:** prosa LLM-style fluffy queima tokens e tempo de leitura.

### Demais policies

| Policy | O que faz |
|---|---|
| `anti-rationalization.md` | Combate vieses cognitivos do agente ("isso parece ok") |
| `code-exploration.md` | Como explorar codebase de forma eficiente em tokens |
| `confusion-management.md` | STOP-NAME-OPTIONS-WAIT quando requisito é ambíguo |
| `context-engineering.md` | Hierarquia de 5 níveis + 3 trust levels para gerenciar contexto |
| `cost-optimization.md` | Práticas para reduzir custo de API |
| `detective-write-guardrails.md` | Hard guardrail: writes só em `.detective/` e `_detective_sdd/` |
| `documentation-i18n.md` | Convenções para docs multi-idioma |
| `evals.md` | Framework de avaliação para skills, prompts, tools |
| `execution.md` | Princípios de execução: agir primeiro com default seguro |
| `handoffs.md` | Formato consistente de handoff entre skills |
| `hooks.md` | Lifecycle hooks em settings.json |
| `iterative-retrieval.md` | Retrieval progressivo em 3 rodadas para subagents |
| `persistence.md` | Quando e como persistir contexto |
| `search-first.md` | Pesquisa obrigatória antes de implementar |
| `source-driven.md` | Toda afirmação ancorada em fonte (file:line, ADR, commit) |
| `stack-flexibility.md` | Skills não acoplam a vendor único |
| `token-efficiency.md` | Compressão de output para economizar tokens |

---

## 8. Plugin: como o kit é distribuído

### Manifesto: `.claude-plugin/plugin.json`

Schema oficial do Claude Code. Lista:
- **37 skills** em `skills/NN-nome/SKILL.md`
- **14 agents** em `.claude/agents/<name>.md`
- **23 commands** em `.claude/commands/<name>.md` (cc-format) + `commands/<name>.md` (kit-format)
- **hooks** em `hooks/hooks.json` (lifecycle: SessionStart, PreToolUse, PostToolUse, Stop)

### Modos de instalação (3 opções)

#### Modo 1 — Plugin global (Claude Code)

```bash
claude plugin install https://github.com/felvieira/claude-skills-fv
```

Instala globalmente: 37 skills, hooks, 23 commands. Funciona em qualquer projeto sem config adicional. **Não inclui:** policies, MCP server, templates, docs (esses ficam no `.bot/`).

#### Modo 2 — Kit completo por repo (`/devkit-install-fv`)

Com plugin instalado, dentro do repo alvo:

```
/devkit-install-fv
```

Instala `.bot/` completo: MCP server (36 tools), policies, templates, docs, hooks, learned-skills, configs multi-plataforma (Cursor, Windsurf, Copilot, Gemini CLI, OpenCode, Antigravity).

#### Modo 3 — Bash direto

```bash
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh /caminho/projeto
```

Suporta perfis não-interativos: `--profile lean`, `--no-input`, `--yes`.

### Comparativo dos modos

| O que entra | Plugin global | `/devkit-install-fv` | Bash direto |
|---|:---:|:---:|:---:|
| 37 skills | ✓ | ✓ | ✓ |
| Hooks (lifecycle) | ✓ | ✓ | ✓ |
| Slash commands | ✓ | ✓ | ✓ |
| Policies | ✗ | ✓ | ✓ |
| MCP server (36 tools) | ✗ | ✓ | ✓ |
| Templates de handoff | ✗ | ✓ | ✓ |
| Docs + repo-audit | ✗ | ✓ | ✓ |
| Configs multi-plataforma | ✗ | ✓ | ✓ |
| Learned skills por projeto | ✗ | ✓ | ✓ |

### Plataformas compatíveis

| Plataforma | Skills | Hooks | MCP | Slash Commands |
|---|:---:|:---:|:---:|:---:|
| **Claude Code** | ✓ nativo | ✓ | ✓ | ✓ |
| **Cursor** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **Windsurf** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **GitHub Copilot** | ✓ via `.bot/` | ✗ | ✗ | ✗ |
| **Gemini CLI** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **OpenCode** | ✓ via `.bot/` | ✗ | ✓ | ✗ |
| **Antigravity** | ✓ via `.bot/` | ✗ | ✓ | ✗ |

---

## 9. MCP server: 36 tools por trás dos panos

O kit inclui um **MCP server próprio** (`mcp-server/src/index.ts`) com **36 tools** expostas para qualquer cliente MCP (Cursor, Windsurf, Gemini CLI, etc).

Tools são ortogonais às skills — implementam capacidades de baixo nível que as skills consomem:

- **Skill loading:** `devkit_load_skill`, `devkit_list_skills`
- **Pipeline:** `devkit_classify_task`, `devkit_get_pipeline`
- **Context management:** `devkit_context_pack`, `devkit_working_set`, `devkit_diff_brief`
- **Cost tracking:** `devkit_track_cost`, `devkit_get_cost_summary`
- **Templates:** `devkit_get_template`
- **Learned skills:** `devkit_save_learned_skill`, `devkit_get_learned_skills`
- **Project intel:** auditoria, asset inventory, tech stack detection
- **Suggestions:** `devkit_get_suggestions` (próxima ação mais impactante)
- **Output compression:** `devkit_compress_output` (reduz noise de logs/stack traces)

### Quando o MCP server é útil

- Você quer usar o kit em **outro IDE** que não Claude Code (Cursor, Windsurf, Gemini CLI)
- Você quer **integrar o kit a um pipeline próprio** (CI, custom CLI)
- Você quer **rastreabilidade de custo** estruturada por sessão/skill/modelo

### Quando NÃO precisa

- Você só usa Claude Code com plugin global (skills carregam direto, sem MCP)
- Bug fix simples — overhead não compensa

---

## 10. Quando usar o quê: árvore de decisão

```
o que você quer fazer?
│
├── Adicionar feature nova
│   ├── ideia vaga, briefing curto                 → /grill-me primeiro
│   ├── feature pequena/média, spec já clara       → /spec → /pipeline (clássico)
│   ├── feature grande/nova/ambígua, paralelizar   → /pipeline-discovery
│   ├── PRD pronto em conversa, falta tracker      → /to-prd
│   ├── PRD publicado, falta quebrar em issues     → /to-issues
│   ├── spec pronta, single-layer (só front/back)  → /build → /test
│   └── várias features overnight                  → /loop --worktree --parallel N
│
├── Corrigir bug
│   ├── reproduzível, fix óbvio    → /build (com teste de regressão)
│   ├── não consegue explicar      → debugger subagent
│   └── achou padrão recorrente    → variant-analysis subagent
│
├── Refatorar
│   ├── código complicado          → /simplify
│   ├── identificar shallow modules → skill 38 (Architecture Deepener)
│   └── arquitetura antiga         → /detective-spec primeiro, depois skill 23
│
├── Validar antes de release
│   ├── review final               → /review
│   ├── auditoria boas práticas    → /best
│   ├── security scan automatizado → skill 34 (Static Analysis)
│   └── auditoria do repo          → /audit-repo
│
├── Trabalhar com legado
│   ├── extrair spec               → /detective-spec
│   ├── identificar refactors      → skill 38 (Architecture Deepener)
│   └── migration grande           → skill 23 (Migration & Refactor)
│
├── Gerar assets visuais
│   ├── hero, mascote, illustration → skill 17 (fal.ai)
│   ├── favicon/PWA/OG da landing   → skill 36 (Web Asset Generator)
│   └── inventariar o que já tem    → /inventory-assets
│
├── Setup inicial em um projeto
│   ├── primeiro contato            → /audit-repo
│   ├── instalar kit no .bot/       → /devkit-install-fv
│   └── gerar CLAUDE.md             → skill 28
│
├── Manutenção do próprio kit
│   ├── adicionar skill nova        → skill 35 (Skill Author)
│   ├── auditar qualidade das skills → skill 35 com scorecard
│   └── revisar policies antigas    → skill 35 + revisão manual
│
└── Deploy / release
    ├── release patch/minor         → /ship
    ├── changelog ausente           → skill 24 (Release Manager)
    └── plano de rollback           → skill 20 (Observability) + 7 (Deploy)
```

---

## 11. Inspirações e atribuições

O kit não nasceu do zero. Foi composto a partir de:

### Adaptações diretas

- **[mattpocock/skills](https://github.com/mattpocock/skills)** ([AI Hero post](https://www.aihero.dev/5-agent-skills-i-use-every-day)) — `/grill-me`, `/to-prd`, `/to-issues`, skill 37 (TDD Engineer), skill 38 (Architecture Deepener). Adaptados ao kit (frontmatter, integração com policies, gates de aprovação).
- **[Reversa](https://github.com/sandeco/reversa)** — skill 33 (Detective Spec). Adaptado para integrar com Graphify + repo-audit + memória persistente.
- **Strunk & White — Elements of Style** — `policies/writing-clarity.md`. 10 regras adaptadas para output de agente.

### Inspirações conceituais

- **[Anthropic skills ecosystem](https://docs.claude.com/en/docs/claude-code/skills)** — formato de SKILL.md, frontmatter, descrição com triggers.
- **[Cursor / Windsurf rules pattern](https://docs.cursor.com/context/rules)** — convenções de regras compartilhadas.
- **[OpenAI gpt-5.4 prompting guide](https://platform.openai.com/docs/guides/prompt-engineering)** — patterns para Codex/GPT integration.

### Filosofia

- **Vertical slicing** — clássico XP/Lean (Kent Beck, "Tracer Bullets" do Hunt & Thomas).
- **Deep modules** — John Ousterhout, *A Philosophy of Software Design*.
- **Anti-rationalization tables** — viés cognitivo aplicado a debugging (Daniel Kahneman style).

---

## Próximos passos

- Quer testar? Instale: `claude plugin install https://github.com/felvieira/claude-skills-fv`
- Quer estender? Use skill 35 (Skill Author) para adicionar skill nova respeitando o template.
- Quer entender mais? Leia `AGENTS.md` (regras universais) e `policies/` (regras compartilhadas).
- Encontrou bug? Abra issue: https://github.com/felvieira/claude-skills-fv/issues

**Última auditoria de consistência:** `evals/skill-audit-2026-05-03.md` (22 PASS, 6 NEEDS-REVIEW, 4 NEEDS-REWRITE).
