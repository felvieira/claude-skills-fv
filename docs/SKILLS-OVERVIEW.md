# Dev Team Kit — Skills, Modos & Subagents

> **Procurando a wiki completa?** → [`docs/WIKI.md`](./WIKI.md). Tem **todos os 79 skills + 16 subagents + 45 commands + 63 policies + 29 hooks + 22 rules path-scoped + plugin + MCP**, formato aihero, com exemplos.
>
> Esta página (`SKILLS-OVERVIEW.md`) é a versão **resumida** — para visão de 5 minutos. WIKI tem o detalhe item-por-item.

---

Página única para o pessoal entender o kit em 5 minutos. Copia o formato do post [5 Agent Skills I Use Every Day](https://www.aihero.dev/5-agent-skills-i-use-every-day): cada item tem nome, o que faz, quando usar, problema que resolve, exemplo concreto e takeaway.

> **Versão:** 79 skills, 16 subagents, 45 slash commands, 63 policies, 29 hooks, 22 rules path-scoped (TS/Python/React/backend/database/frontend + common)
> **Última atualização:** 2026-09-23 (v2.82.0 — skill 80 jev-opportunity-scout)
> **Instalação:** `claude plugin install https://github.com/felvieira/claude-skills-fv`

---

## Índice rápido

- [Os 2 fluxos: clássico vs discovery](#os-2-fluxos-clássico-vs-discovery) — escolher antes de iniciar
- [Princípio fundamental: Vertical Slicing](#princípio-fundamental-vertical-slicing)
- [Modos de uso (slash commands)](#modos-de-uso-slash-commands) — atalhos por fase
- [Skills por categoria](#skills-por-categoria) — 79 especialistas
- [Subagents dispatcháveis](#subagents-dispatcháveis) — 16 agentes via Task tool
- [Policies que governam tudo](#policies-que-governam-tudo) — 22 regras compartilhadas
- [Quando usar o quê: árvore de decisão](#quando-usar-o-quê-árvore-de-decisão)

---

## Os 2 fluxos: clássico vs discovery

O kit oferece **dois pipelines** para feature nova. Coexistem — escolha por contexto.

### Modo A — `/pipeline` (clássico)

```
/spec → /plan → /build → /test → /review → /ship
```

**Use quando:**
- feature pequena/média (<1 sprint)
- spec já clara, equipe conhece o terreno
- não precisa publicar PRD/issues no GitHub/Linear/Jira
- TDD opcional

### Modo B — `/pipeline-discovery` (novo, com discovery + TDD)

```
/grill-me → /to-prd → /to-issues → /loop --worktree --parallel N → /ship
                       ↓                ↓
                       N issues        por slice: /build + skill 37 (TDD) + /review
                       no tracker
```

**Use quando:**
- feature grande/nova/ambígua, briefing vago
- equipe nova com a área
- vai paralelizar com 2+ workers
- precisa publicar PRD + issues no issue tracker (GitHub/Linear/Jira)
- código crítico que merece TDD enforced

### Comparativo rápido

| Aspecto | `/pipeline` clássico | `/pipeline-discovery` |
|---|---|---|
| Discovery formal | não | **`/grill-me`** |
| Output da spec | `docs/specs/X.md` (interno) | PRD em **issue tracker** |
| Quebra em slices | implícita (PO escreve) | **explícita** (`/to-issues` cria 1 issue por slice) |
| Paralelização | manual | **estrutural** (N workers, 1 slice cada) |
| TDD | opcional | **obrigatório por slice** |
| Skill 38 (Architecture) | não chamado | opcional entre `/to-issues` e `/loop` |

Os 2 fluxos respeitam **`policies/vertical-slices.md`** (próxima seção). A diferença é o nível de formalismo da fase de discovery e a publicação em issue tracker.

---

## Princípio fundamental: Vertical Slicing

> **Toda feature multi-camada é entregue como uma fatia vertical (DB + back + front + teste e2e), nunca como camadas horizontais paralelas.**

Errado (layered, paraleliza mas integra mal):
```
Worker A: faz todo o front (login + cadastro + recuperar senha)
Worker B: faz todo o back (login + cadastro + recuperar senha)
Worker C: faz todo o DB (login + cadastro + recuperar senha)
→ ninguém pode testar até os 3 acabarem; integração revela 80% dos bugs
```

Certo (vertical, paraleliza E integra ponta-a-ponta):
```
Worker A: feature de login (DB + back + front + teste e2e) → mergeável sozinho
Worker B: feature de cadastro (DB + back + front + teste e2e) → mergeável sozinho
Worker C: feature de recuperar senha (DB + back + front + teste e2e) → mergeável sozinho
→ cada worker entrega feature testável e demo-able
```

**Quem força isso:** orchestrator (skill 09) recusa plano layer-first. PO (skill 01) escreve user stories já como slices. `/plan` produz tabela de slices antes do build. `policies/vertical-slices.md` tem anti-padrões e heurísticas de tamanho.

**Quando NÃO aplicar:** task single-layer (só front OU só back), bug fix localizado, refactor cross-cutting, chore.

---

## Modos de uso (slash commands)

São 12+ atalhos por fase. Não precisa decorar nome de skill — chama o atalho, ele roteia.

### `/spec` — Especificar feature

**O que faz:** PO escreve user stories, critérios de aceitação testáveis, prioridade, riscos.
**Quando usar:** ideia nova ou requisito vago precisa virar spec acionável.
**Problema que resolve:** evita "build sem entender o pedido", reduz retrabalho.
**Exemplo:** `/spec adicionar dark mode com persistência por usuário`
**Takeaway:** **toda feature começa aqui.** Pular spec custa 3-5x mais em rework.

### `/plan` — Montar pipeline

**O que faz:** orchestrator classifica complexidade da task e define o pipeline mínimo (quais skills chamar, em que ordem).
**Quando usar:** task grande, não sabe por onde começar; quer um roadmap antes de codar.
**Problema que resolve:** evita rodar pipeline cheio quando bug fix simples basta.
**Exemplo:** `/plan migrar autenticação para OAuth2`
**Takeaway:** **pipeline é mínimo necessário.** Skills caras (security, deploy) só entram quando a task pede.

### `/build` — Implementar

**O que faz:** Backend (skill 03) + Frontend (skill 04) com a stack real do projeto (lê `docs/repo-audit/current.md` antes).
**Quando usar:** spec pronta, implementar é o próximo passo.
**Problema que resolve:** consistência com convenções existentes em vez de "agente inventando estilo novo".
**Exemplo:** `/build implementar endpoint POST /api/orders conforme spec`
**Takeaway:** **stack vem da auditoria, não do treinamento.** Auditar repo primeiro evita mismatch.

### `/test` — Escrever e rodar testes

**O que faz:** QA (skill 05) seguindo "prove-it" — happy path + error + edge case + regression.
**Quando usar:** após implementar, ou para preencher gap de cobertura, ou para validar fix.
**Problema que resolve:** "funciona local" sem teste = bug em produção esperando.
**Exemplo:** `/test cobrir orderService incluindo desconto VIP e estoque insuficiente`
**Takeaway:** **se diz que funciona, prova com teste.** Falar não conta.

### `/review` — Review final + security

**O que faz:** Reviewer (skill 11) + Security (skill 06) validam o delta antes do merge.
**Quando usar:** PR pronto, antes de pedir review humano ou mergear.
**Problema que resolve:** pega bug óbvio, vulnerabilidade comum, débito antes de virar dívida.
**Exemplo:** `/review` (no contexto de PR aberto)
**Takeaway:** **Critical/High aberto = no merge.** Reviewer é gate, não sugestão.

### `/best` — Auditoria de boas práticas

**O que faz:** Reviewer + Security + QA juntos auditam clean code, DRY, SOLID, OWASP.
**Quando usar:** antes de release, código herdado, ou sentindo "isso aqui tá feio".
**Problema que resolve:** débito técnico que ninguém quer abrir issue para tratar.
**Exemplo:** `/best src/services/billing/`
**Takeaway:** **rode antes de pedir refactor.** O relatório justifica o trabalho.

### `/simplify` — Refatorar

**O que faz:** Migration & Refactor (skill 23) propõe simplificação preservando comportamento.
**Quando usar:** código funciona mas tá complicado; antes de adicionar feature em módulo god.
**Problema que resolve:** refactor "vamos limpar" sem critério vira novo bug.
**Exemplo:** `/simplify src/auth/middleware.ts (god function 200 linhas)`
**Takeaway:** **refactor com plano e teste de regressão.** Sem rede, vira regressão.

### `/ship` — Release e deploy

**O que faz:** Release Manager (skill 24) + Deploy (skill 07) — changelog, versionamento, rollout, rollback plan.
**Quando usar:** feature pronta + testada + revisada, hora de subir.
**Problema que resolve:** deploy "no susto", rollback improvisado, changelog vazio.
**Exemplo:** `/ship v2.4.0 com migration de schema`
**Takeaway:** **toda release tem changelog e rollback plan.** Sem ambos, não é release, é desespero.

### `/pipeline` — End-to-end clássico

**O que faz:** orchestrator roda spec → plan → build → test → review → ship em sequência.
**Quando usar:** feature pequena/média, equipe conhece o terreno, não precisa de issue tracker.
**Problema que resolve:** pular fases por preguiça gera retrabalho 3x maior depois.
**Exemplo:** `/pipeline criar página de configurações de usuário`
**Takeaway:** **pipeline completo é desperdício para bug fix, vital para feature pequena/média.**

### `/pipeline-discovery` — Discovery + slicing + TDD (novo)

**O que faz:** roda fluxo completo `grill-me → to-prd → to-issues → loop+TDD → ship`. Publica PRD + N issues no tracker, paraleliza por slice, TDD por slice.
**Quando usar:** feature grande/nova/ambígua, equipe nova, vai paralelizar com 2+ workers, código crítico.
**Problema que resolve:** spec rasa virando integration mess; trabalho não tracked no tracker; integração só no fim.
**Exemplo:** `/pipeline-discovery quero adicionar autenticação social (Google + GitHub)`
**Takeaway:** **discovery formal + issues no tracker + TDD por slice = qualidade alta com paralelização real.**

### `/grill-me` — Interrogatório de plano

**O que faz:** PO em modo Deep Interview sempre-ativo. Faz uma pergunta por vez, recomenda resposta, caminha pela árvore de decisão até convergir.
**Quando usar:** ideia ainda vaga, antes de `/spec` ou `/to-prd`.
**Problema que resolve:** spec produzida com "unknown unknowns" silenciosos.
**Exemplo:** `/grill-me quero refazer o checkout para reduzir abandono`
**Takeaway:** **uma pergunta por turno + resposta sugerida.** Lista de 20 perguntas mata fluxo.

### `/to-prd` — Conversa → PRD em issue tracker

**O que faz:** pega contexto da conversa atual e publica PRD no GitHub Issues (label `needs-triage`). Não entrevista — sintetiza.
**Quando usar:** após `/grill-me` convergir, antes de `/to-issues`.
**Problema que resolve:** PRDs vivem em conversas perdidas; precisam de tracker para virar trabalho.
**Exemplo:** `/to-prd` (no contexto pós-grill-me)
**Takeaway:** **PRD vai pro tracker com label needs-triage.** Spec interna usa `/spec` em `docs/specs/`.

### `/to-issues` — PRD → vertical slices no tracker

**O que faz:** quebra PRD em N issues independentes (vertical slices/tracer bullets). Cada issue é HITL ou AFK. Publica todas com label `needs-triage`, em ordem de dependência.
**Quando usar:** após `/to-prd`, antes de `/loop --worktree --parallel N`.
**Problema que resolve:** workers paralelos sem issues atribuíveis = caos; layered slicing disfarçado de vertical.
**Exemplo:** `/to-issues #142` (referência ao PRD)
**Takeaway:** **cada issue corta TODAS as camadas.** Layered slicing é proibido (`policies/vertical-slices.md`).

### `/constitution` — Princípios governantes (Spec-Driven Development)

**O que faz:** cria/atualiza `memory/constitution.md` com 5 eixos (Code Quality, Testing, UX, Performance, Security). Autoridade hierárquica sobre PRD/plan/ADRs.
**Quando usar:** bootstrap de projeto, mudança organizacional, onboarding do kit em projeto sem princípios formais.
**Problema que resolve:** princípios só vivem nas cabeças; specs/plans/reviews sem rubric objetivo.
**Exemplo:** `/constitution`
**Takeaway:** **princípios são não-negociáveis.** Mudança requer commit `chore(constitution)` dedicado. Inspirado em [github/spec-kit](https://github.com/github/spec-kit).

### `/checklist` — "Unit tests for English"

**O que faz:** gera checklist **contextual por feature** (Completeness, Clarity, Consistency, Coverage, Edge Cases). Cruza com a constituição.
**Quando usar:** após `/spec` ou `/to-prd`, antes de `/plan`.
**Problema que resolve:** ambiguidades da spec que só aparecem em `/build` (retrabalho).
**Exemplo:** `/checklist docs/specs/dark-mode.md`
**Takeaway:** **a spec é "código em português"; a checklist é a suíte de testes unitários dela.** Complementa (não substitui) os 13 checks fixos em `policies/prd-validation.md`. Inspirado em [github/spec-kit](https://github.com/github/spec-kit).

### `/swarm` — Total Autonomy (v2.0.0)

**O que faz:** prompt → PR mergeable em um comando. 7 phases (setup/PRD/Ralph loop/parallel review/synthesize/self-fix/PR/report). Worktree isolado, fresh context per story.
**Quando:** "manda e esquece" — feature, issue fix, refactor.
**Diff vs alternativas:** `/auto` (sem worktree, sem PR) · `/loop` (sem multi-agent review, sem PR) · `/run-program X` (gates humanos) · **`/swarm` é o ÚNICO 100% autônomo do prompt ao PR.**
**Exemplo:** `/swarm "implementar auth"` ou `/swarm fix #42`
**Takeaway:** **autonomia real.** Hook em modo Autonomous roteia features pra cá.

### `refactor-safely` (program v2.1.0)

**O que faz:** pipeline de refactor com **behavior preservation garantida** — baseline tests + analyze read-only + atomic plan + execute com type-check hooks + verify behavior + PR.
**Quando:** refactor de módulo grande (>500 linhas), extrair classes, split god classes.
**Diff vs `/simplify`:** simplify é local, sem garantias; refactor-safely tem baseline snapshot + verification + 3 gates humanos.
**Exemplo:** `/run-program refactor-safely --input target=src/auth/`
**Takeaway:** **único pipeline que garante que refactor não muda comportamento.** Use quando seguranca > velocidade.

### Use Cases reference (v2.1.0)

[`docs/USE-CASES.md`](./USE-CASES.md) mapeia **17 cenários reais de dev no dia-a-dia** → comando apropriado. Tabela de decisão rápida + categorias A/B/C/D/E. Hook intent-classifier v2 usa esse catálogo pra roteamento automático.

### Auto-orchestration (v1.8.0)

**O que faz:** hook `intent-classifier` detecta intent do prompt e sugere program adequado. Skill 39 (program-router) confirma com usuário.
**Quando:** prompts > 15 chars que não são informacionais, triviais, ou já slash command.
**Takeaway:** **sem precisar lembrar de `/run-program`**, kit sugere. 4 níveis de autonomia configuráveis.

### `/run-program` — Executable YAML pipelines

**O que faz:** executa `programs/<nome>.yml` com **7 step types**: command, prompt (inline), bash (deterministic), gate (humano), loop (until: TOKEN com fresh_context), parallel (com `trigger_rule`), conditional. Suporta `context: fresh`, `provider`/`model` per step, variable substitution.
**Quando usar:** pipelines repetidos com gates, paralelização, isolamento de contexto, mix AI+bash.
**Problema que resolve:** consistência entre agentes; expressividade pra workflows complexos (review multi-agente, adversarial dev).
**Exemplo:** `/run-program adversarial-dev` ou `/run-program comprehensive-review --input pr_number=42`
**Takeaway:** **6 programs prontos:** pipeline-discovery, spec-driven-development, loop-polishing, detective-spec, **adversarial-dev** (GAN-inspired), **comprehensive-review** (5-agent parallel). v1.7.0 absorveu primitives de [coleam00/archon](https://github.com/coleam00/archon).

### `/consolidate-memory` — Manutenção do vault

**O que faz:** janitor periódico do vault de memória (`D:\claude-memory\`). Merge duplicatas, archive stale, prune backlinks. Workflow seguro com snapshot.
**Quando usar:** semanalmente; após 50+ sessions; antes de release major.
**Problema que resolve:** vault degrada com duplicatas e stale facts; busca semântica perde precisão.
**Exemplo:** `/consolidate-memory --dry-run`
**Takeaway:** **snapshot antes de qualquer mudança.**

### `/humanize` — Remove AI writing patterns

**O que faz:** reescreve prosa removendo 29 padrões AI (vocabulário de alta frequência, copula avoidance, signposting, conclusões genéricas, artefatos de chatbot, hedging excessivo...). Inclui auto-auditoria antes da versão final.
**Quando usar:** antes de publicar qualquer PRD, doc, copy ou artigo gerado com assistência de IA.
**Problema que resolve:** texto AI tem tells reconhecíveis que minam credibilidade.
**Exemplo:** `/humanize docs/specs/dark-mode.md`
**Takeaway:** **limpo-mas-sem-alma ainda parece IA.** O passo de personalidade é tão importante quanto remover os padrões. Adaptado de [blader/humanizer](https://github.com/blader/humanizer).

### `/analyze` — Cross-artifact consistency check

**O que faz:** auditoria read-only entre constituição → specs → plan → issues. Findings CRITICAL/HIGH/MEDIUM/LOW; matriz de rastreabilidade.
**Quando usar:** após `/to-issues` e antes de `/build`; antes de `/ship` major; após mudança grande na constituição.
**Problema que resolve:** pipeline sem gate validando coerência entre artefatos; updates de constituição invalidando specs silenciosamente.
**Exemplo:** `/analyze --feature dark-mode --strict`
**Takeaway:** **CRITICAL = bloqueio total.** Constituição vence todos os conflitos. Inspirado em [github/spec-kit](https://github.com/github/spec-kit).

### `/auto` — Agente autônomo (1 sessão)

**O que faz:** executa task completa sem intervenção, com circuit breaker (3 erros iguais = para).
**Quando usar:** task definida, sair pra tomar café, voltar com PR.
**Problema que resolve:** ficar "babysitting" o agente em task longa.
**Exemplo:** `/auto implementar feature spec em docs/specs/dark-mode.md`
**Takeaway:** **defina escopo concreto.** Auto sem spec vira auto sem rumo.

### `/loop` — Loop autônomo v2

**O que faz:** auto-loop multi-agente (claude + codex), worktree paralelo, polishing pass automático. `node scripts/auto-loop.mjs "task"`.
**Quando usar:** task overnight, várias features em paralelo, ou quer redundância (claude + codex).
**Problema que resolve:** maximizar throughput aproveitando paralelismo de worktree.
**Exemplo:** `node scripts/auto-loop.mjs "fix all eslint warnings" --worktree --parallel 4`
**Takeaway:** **paralelo via worktree, não thread.** Isolamento real previne corrupção de estado.

### `/worktree` — Worktree isolado

**O que faz:** cria git worktree separado, copia `.env*`, valida ambiente em background.
**Quando usar:** trabalhar em feature sem afetar branch atual; antes de `/auto` ou `/loop`.
**Problema que resolve:** stash/checkout cansativo, conflito de env entre features.
**Exemplo:** `/worktree feature/dark-mode`
**Takeaway:** **worktree > branch checkout.** Disco é barato, contexto perdido não.

### `/detective-spec` — Engenharia reversa de spec em legado

**O que faz:** extrai contratos executáveis de código legado sem modificar nada (5 fases: recon → módulos → regras → fluxos → ADRs).
**Quando usar:** legado sem doc, vibe-coded, antes de evoluir feature em módulo desconhecido, onboarding em codebase grande.
**Problema que resolve:** agente quebra produção em legado por não saber regras invisíveis.
**Exemplo:** `/detective-spec --module=src/billing`
**Takeaway:** **zero writes no projeto legado.** Spec gerada em `_detective_sdd/` é contrato operacional, não doc decorativa.

---

## Skills por categoria

### Gestão e Coordenação

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 08 | **Context Manager** | rastrear focus, tasks abertas, hot files entre sessões | "o que ficou pendente da sessão de ontem?" |
| 09 | **Orchestrator** | classificar complexidade da task e definir pipeline mínimo | "quero migrar de REST pra GraphQL, por onde eu começo?" |
| 10 | **Documenter** | registrar decisões, contratos, ADRs, trilhas funcionais e Repo-Wikis HTML/Markdown rastreáveis | "documenta a decisão de usar filas em vez de webhook" |
| 11 | **Reviewer** | validar delta final antes de release | "revisa esse PR antes de eu pedir aprovação humana" |
| 17 | **Image Generator** | gerar imagens originais via fal.ai (hero, ícones, ilustrações) | "gera uma hero image pra landing page de fintech" |
| 18 | **Repo Auditor** | mapear stack real, convenções, riscos antes de qualquer task grande | "audita esse repositório antes de eu começar a feature" |
| 19 | **Asset Librarian** | catalogar logos, fontes, tokens visuais | "cataloga os assets visuais espalhados nesse projeto" |
| 20 | **Observability SRE** | logs estruturados, métricas, tracing, alerts, rollback plan | "define os logs e alertas pro serviço de pagamento" |
| 21 | **Data Analytics** | tracking events, funnels, KPIs | "define o funil de eventos do onboarding" |
| 22 | **Accessibility** | WCAG 2.2, navegação por teclado, motion reduction | "audita a acessibilidade desse formulário de checkout" |
| 23 | **Migration & Refactor** | refactor incremental com feature flags + rollback | "migra esse módulo de callback pra async/await com segurança" |
| 24 | **Release Manager** | changelog, versionamento, gradual rollout | "prepara o release da v2.3.0 com changelog" |
| 25 | **AI Integration Architect** | adapters, gateways, streaming, fallbacks de inferência | "integra a Claude API no app com fallback de provider" |
| 26 | **Prompt Engineer** | escrever, testar e iterar prompts reutilizáveis | "escreve e testa o prompt do classificador de ticket" |
| 27 | **Video Integration** | generative video — UX, latência, formato | "adiciona geração de vídeo por IA no app com fluxo assíncrono" |
| 28 | **CLAUDE.md Generator** | gerar `CLAUDE.md` inteligente para repo consumidor | "gera um CLAUDE.md pra esse projeto Next.js" |
| 30 | **Cost Tracker** | custo de tokens por sessão, skill, model tier | "quanto essa sessão gastou em tokens até agora?" |
| 31 | **Session Summary** | consolidar sessão para handoff entre conversas longas | "resume essa sessão pra eu continuar amanhã" |
| 32 | **Smart Suggestions** | sugerir próxima ação mais impactante baseado no estado real | "o que eu deveria fazer agora nesse projeto?" |
| 35 | **Skill Author** | meta-skill para criar/editar/avaliar skills do próprio kit | "cria uma skill nova pra lidar com webhooks do Stripe" |
| 38 | **Architecture Deepener** | encontra deep modules opportunities (deletion test, deepening), prep para refactor com testabilidade | "esse módulo de auth vale a pena aprofundar antes do refactor?" |
| 39 | **Program Router** | decidir qual pipeline de `programs/*.yml` rodar a partir da classificação da task | "qual program eu uso pra essa migração de banco?" |
| 40 | **Parallel Dispatcher** | despachar N slices/reviews independentes pra subagents sem cair na armadilha skill-vs-agent | "despacha esses 4 slices de feature em paralelo" |
| 44 | **Zoom Out** | mapa de módulos e topologia quando o agente está perdido em área desconhecida | "não conheço esse repo, me dá o mapa geral dos módulos" |
| 45 | **Handoff Context** | empacotar o que a próxima sessão/agente precisa pra continuar sem re-derivar contexto | "empacota o contexto pra eu passar pra outro agente" |
| 49 | **Context Budget** | auditar peso de contexto carregado (skills, agents, MCP, rules) — tokens por componente e headroom | "quanto contexto essa sessão está consumindo em skills carregadas?" |
| 65 | **Using Git Worktrees** | isolar workspace via git worktree, com baseline de testes obrigatória antes de liberar a task | "isola essa task num worktree separado antes de mexer" |

### Produto e Design

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 01 | **PO** | spec, user stories, critérios de aceitação, prioridade | "escreve a spec de dark mode com persistência por usuário" |
| 02 | **UI/UX Designer** | layout, design tokens, responsividade, heurísticas | "desenha o fluxo de checkout desse app mobile" |
| 29 | **Design Intelligence** | benchmark competitivo, screenshots, dossier estratégico | "pesquisa como os concorrentes fazem onboarding" |
| 36 | **Web Asset Generator** | favicons, PWA icons, OG images, manifest, snippet HTML | "gera o favicon e o OG image a partir desse logo" |
| 56 | **Responsive Conversion** | converter UI desktop-first em mobile, corrigir layout quebrado, modal/bottom sheet | "essa tela quebra no celular, conserta o layout" |
| 57 | **Mobile UX Foundations** | zona do polegar, dark mode físico, performance percebida, UX de auth/onboarding/permissão | "onde eu coloco a navegação principal nesse app mobile?" |
| 58 | **i18n & Localization** | preparar pra outro idioma/região/direção de escrita antes de existir tradutor | "prepara essa tela pra suportar inglês e árabe (RTL)" |
| 63 | **Mobile Paywall & Checkout** | seleção de plano e checkout em app mobile — Play Billing vs PSP, estados de pagamento, cupão | "desenha a tela de assinatura do app com Google Play Billing" |
| 64 | **Scroll Storytelling** | página onde o scroll é a timeline narrativa, com variedade de device por beat | "quero uma landing page estilo Apple, com scroll cinematográfico" |
| 73 | **SaaS Conversion Playbook** | funil de assinatura — playbook A/B, ativação, paywall, gatilhos in-app, lifecycle | "audita o funil de conversão trial-to-paid do nosso SaaS" |

### Desenvolvimento

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 03 | **Backend Engineer** | API REST/GraphQL, contratos, auth, validação, DB | "implementa o endpoint POST /api/orders com validação" |
| 04 | **Frontend Engineer** | React/Next.js, estado, performance, integração com API | "implementa a tela de listagem de pedidos com paginação" |
| 12 | **Motion Designer** | animações, transições, micro-interações | "adiciona uma animação de entrada nos cards do dashboard" |
| 15 | **Mobile / Tauri** | apps desktop e mobile com Tauri + React Native | "empacota esse app web como executável desktop com Tauri" |
| 52 | **UI Polish** | border radius concêntrico, alinhamento óptico, sombra vs borda, tabular numbers, scale on press, hit area | "esse botão parece meio 'ok', deixa mais refinado" |
| 47 | **Pattern Conformity** | extrair e codificar as convenções de código do projeto em `memory/patterns.md` | "extrai as convenções de código desse repo antes de eu codar" |
| 60 | **App Reference Architecture** | molde de app novo com login + pagamento + push + web + APK a partir de um código-fonte | "quero um app novo com login, pagamento e APK Android, por onde começo?" |
| 74 | **Web3D Scene Runtime** | scene description → cena 3D interativa no browser (WebGPU com fallback WebGL2, câmera navegável, budget medido) | "quero um modelo 3D no site que o visitante possa girar" |
| 75 | **FFmpeg Media** | corte, junção, legenda, normalização de loudness, silêncio, redação, aspect ratio via ffmpeg local — executa edição, não decide gosto | "corta os primeiros 10 segundos desse vídeo e normaliza o áudio" |
| 76 | **Diagram Validated** | SVG determinístico pra 14 tipos UML + arquitetura/fluxo, valida geometria e faz readback em PNG — "avalie, não afirme" antes de declarar pronto | "gera um diagrama de sequência dessa chamada de API" |
| 77 | **Frontend Slides** | decks HTML em palco fixo 1920×1080, 12 presets nomeados, 3 previews antes de construir o deck completo, export PDF, deploy Vercel | "monta uma apresentação de pitch em HTML pra esse produto" |
| 78 | **Business Discovery** | entrevista em português simples com dono de negócio não-técnico, mapa de dados em HTML com Sankey, lista de oportunidades, plano de 30 dias — pra quem ainda não tem repositório | "sou dono de um e-commerce sem programador, o que eu automatizo primeiro?" |
| 79 | **React useEffect Review** | checklist de quando NÃO usar useEffect (9 antipadrões lado a lado com a correção), destilada da doc oficial do React | "por que esse componente renderiza duas vezes com esse useEffect?" |
| 80 | **Jev Opportunity Scout** | varre o codebase por decisão semântica frágil (if/else de classificação, keyword hardcoded) e reporta candidato de migração pra judgment tipado do Jev, com custo real | "essa cadeia de if/else pra classificar ticket está frágil, tem algo melhor?" |

### Conteúdo e Descoberta

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 13 | **Marketing Copy** | copy de landing, CTAs, brand voice | "escreve o copy da landing page desse produto" |
| 14 | **SEO Specialist** | metadata, schema.org, Core Web Vitals, sitemap, keyword research, link building | "otimiza essa página pra SEO e faz keyword research" |
| 50 | **Direct Response Copy** | headline com gatilho mental, anúncio, página de vendas, e-mail de venda, legenda de Instagram | "escreve o anúncio de Facebook pra esse lançamento" |
| 51 | **UX Research** | discovery qualitativo: entrevista, persona, journey map, teste de usabilidade, arquitetura de informação | "monta o roteiro de entrevista pra validar esse problema" |
| 48 | **Research Prep** | pesquisa técnica multi-fonte antes de escrever docs/PRD/ADR, ranqueada por autoridade | "pesquisa as opções de fila de mensagem antes de eu decidir" |
| 54 | **Video Analysis** | analisar vídeo existente — frames, transcrição, perguntas sobre o que acontece na tela | "transcreve esse vídeo e resume o que foi dito" |
| 55 | **Marketing Reporting & Analytics** | relatório de campanha, setup de GA4/GTM, auditoria de infra de dados de marketing | "monta o relatório de performance da campanha do mês" |
| 59 | **Closed-Loop Revenue** | fechar a cadeia clique pago → venda real → margem (GCLID/UTM, reconciliação, break-even ROAS) | "conecta o gasto de anúncio com a receita real de venda" |
| 61 | **Content Growth Engine** | conteúdo como sistema de aquisição — intenção comercial, cluster, citação em IA, pipeline | "monta a estratégia de conteúdo pra ranquear e ser citado por IA" |

### Qualidade e Entrega

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 05 | **QA Engineer** | unit, integration, E2E, edge cases críticos | "escreve os testes desse serviço de checkout" |
| 06 | **Security Reviewer** | OWASP Top 10, headers, CORS, CSRF, XSS | "revisa esse fluxo de login por vulnerabilidade" |
| 07 | **Deploy Engineer** | containerização, CI/CD, blue-green, rollback | "monta o Dockerfile e o pipeline de CI/CD desse app" |
| 33 | **Detective Spec** | engenharia reversa de spec em legado (zero writes no projeto) | "esse sistema legado não tem doc, extrai a spec do código" |
| 34 | **Static Analysis** | scan automatizado via Semgrep + CodeQL com SARIF | "roda uma varredura de segurança nesse repositório" |
| 37 | **TDD Engineer** | red-green-refactor enforced, anti horizontal slicing (1 teste → 1 impl → repete) | "implementa essa feature seguindo TDD estrito" |
| 53 | **Doubt-Driven Review** | revisão adversarial EM VOO antes de decisão não-trivial ficar de pé — complementa a 11, não substitui | "antes de eu commitar essa decisão de arquitetura, questiona ela" |
| 43 | **Canary Deployment** | rollout gradual (1/10/50/100%) + 7 métricas + rollback automático | "faz o deploy dessa versão em canary gradual" |
| 46 | **Post-Deploy Canary Monitor** | vigiar produção depois do canary fechar — error budget, latência, anomalia | "monitora a produção depois desse último deploy" |
| 62 | **Persona-Driven Issue Audit** | auditar produto existente via personas simuladas, ponta a ponta até PR, sem merge automático | "testa esse app como se fosse um usuário iniciante frustrado" |

### Publicação e Automação

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 41 | **Blog Publisher** | texto/assunto → post HTML + imagens → commit/push no repo do blog → URL pública | "publica um post sobre a nova feature no blog" |
| 42 | **Blog Screenshot** | captura via Playwright pra post: viewport por destino, cookie banner, FOUT | "tira o screenshot dessa página pra ilustrar o post" |

### Desenvolvimento de Jogos

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 66 | **Game Architecture Design** | arquitetura e balanceamento numérico de jogo — a decisão antes do código de engine | "define a arquitetura e o balanceamento desse RPG antes de codar" |
| 67 | **Game Engine Development** | código real de engine: Unity C#, Unreal C++, ECS, profiling, networking multiplayer | "implementa o sistema de inventário em Unity C#" |

### Pipeline de Personagem

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 68 | **Character Animation 3D** | AccuRIG + Blender headless + IA de motion → rig e animação de personagem 3D | "faz o rig e a animação de caminhada desse personagem 3D" |
| 69 | **Character Pipeline 2D** | sprite/atlas 2D e contrato `MotionPlan.json` (LLM dirige intenção, não rotação de bone) | "gera o spritesheet de animação desse personagem 2D" |

### Produção de Campanha

| # | Skill | Quando ativar | Exemplo de prompt |
|---|---|---|---|
| 70 | **Campaign Research Strategy** | evidence ledger, claims autorizados e oportunidades antes de copy ou visual | "pesquisa os claims que podemos usar nessa campanha antes do copy" |
| 71 | **Campaign Copywriting** | estratégia → rotas de copy rastreáveis e distintas, sem repesquisar nem inventar claim | "escreve 3 rotas de copy diferentes pra essa campanha" |
| 72 | **Campaign Visual Direction** | conceito visual, bíblia de continuidade e shot intents, com overlays determinísticos | "define a direção visual e a bíblia de continuidade da campanha" |

---

## Subagents dispatcháveis

Diferença vs skill: subagent é despachado via `Task` tool, roda isolado, devolve resultado focado. Útil para revisar/auditar/triagiar sem poluir contexto principal.

### Core (5)

| Subagent | Quando despachar |
|---|---|
| `code-reviewer` | review de PR, feature concluída, código antes de merge |
| `security-auditor` | auth flows, input handling, deps, CORS, headers, pré-deploy |
| `test-engineer` | escrever testes, preencher gaps de cobertura, validar regressão |
| `orchestrator` | classificar task complexa, montar pipeline |
| `debugger` | bug com Evidence Ledger + tabela anti-rationalization (10 falácias comuns) |

### Detective Spec (4) — fases do `/detective-spec`

| Subagent | Fase |
|---|---|
| `detective-contracts` | Fase 2: extrai contratos de módulo (API, deps, invariantes, consumidores) |
| `detective-business-rules` | Fase 3: extrai regras de negócio escondidas em validações, constantes mágicas, testes |
| `detective-flows` | Fase 4: reconstrói fluxos end-to-end com edge cases e estado mutado |
| `detective-adrs` | Fase 5: infere ADRs retroativos e sintetiza overview + traceability |

### Static Analysis (5) — pipeline da skill 34

| Subagent | Quando despachar |
|---|---|
| `semgrep-scanner` | repo multi-linguagem, scans paralelos por categoria |
| `semgrep-triager` | batch >20 findings, classificação TP/FP/needs-investigation com gate de aprovação para `nosemgrep:` |
| `codeql-runner` | bug precisa taint tracking interprocedural, com cache de database |
| `sarif-parsing` | múltiplas fontes SARIF, parse + dedup com consensus check |
| `variant-analysis` | bug confirmado → caça variantes, gera custom rule reusável (gate de aprovação para `git add`) |

---

## Policies que governam tudo

63 policies compartilhadas em `policies/`. Não precisa ler todas — as 5 mais importantes:

### `tool-safety.md`
Tools com mínimo privilégio, tratar input externo como não confiável, gate de aprovação para acões médio/alto risco.

### `writing-clarity.md`
10 regras Strunk para output (commits, error messages, handoffs). Lista de palavras-tampão banidas. Aplica-se a TODA skill.

### `source-driven.md`
Toda afirmação ancorada em evidência (`file:line`, commit-sha, doc oficial). Sem evidência = hipótese, marcar `confidence: low`.

### `model-routing.md`
Roteamento automático por tier: Haiku (boilerplate), Sonnet (implementação), Opus (arquitetura). Você não paga Opus para gerar boilerplate.

### `detective-write-guardrails.md`
Hard guardrail do `/detective-spec`: writes restritos a `.detective/` e `_detective_sdd/`. Verificação dupla via `git status --porcelain` filtrado + `git diff --name-only --diff-filter=MDARCT HEAD`.

### `vertical-slices.md`
**Obrigatória para toda feature multi-camada.** Quebra a entrega em fatias verticais (DB + back + front + teste e2e por feature) em vez de horizontal (todo o front, depois todo o back). Habilita paralelização real entre features independentes via `/worktree` ou `/loop --parallel N`. Anti-padrão número 1 do kit: "front primeiro, back depois" — proibido para feature multi-camada. Orchestrator (skill 09) recusa plano layer-first.

Demais policies em `policies/`: `execution.md`, `handoffs.md`, `token-efficiency.md`, `quality-gates.md`, `evals.md`, `persistence.md`, `confusion-management.md`, `anti-rationalization.md`, `hooks.md`, `cost-optimization.md`, `code-exploration.md`, `iterative-retrieval.md`, `search-first.md`, `documentation-i18n.md`, `stack-flexibility.md`, `context-engineering.md`.

---

## Quando usar o quê: árvore de decisão

```
Você quer:
├── Adicionar feature nova
│   ├── ideia vaga, briefing curto → /grill-me primeiro (interrogatório)
│   ├── feature pequena/média, spec já clara → /spec → /pipeline (clássico)
│   ├── feature grande/nova/ambígua, paralelizar com 2+ workers → /pipeline-discovery (grill-me → to-prd → to-issues → loop+TDD → ship)
│   ├── PRD pronto em conversa, falta publicar no tracker → /to-prd
│   ├── PRD publicado, falta quebrar em issues → /to-issues
│   ├── spec pronta, single-layer (só front OU só back) → /build → /test
│   └── várias features independentes overnight → /loop --worktree --parallel N
│
├── Corrigir bug
│   ├── reproduz e arquivo conhecido → debugger subagent
│   ├── não reproduz → debugger subagent (Step 1: Reproduzir bloqueia)
│   └── parece variante de outro bug → variant-analysis subagent
│
├── Refatorar código
│   ├── auditar primeiro → /best
│   ├── plano pronto → /simplify
│   └── deep modules check → improve-codebase-architecture (futuro, ver gaps abaixo)
│
├── Trabalhar em legado
│   ├── extrair specs sem modificar nada → /detective-spec
│   ├── auditar estrutura antes → /audit-repo (skill 18)
│   └── grafo do código → graphify update . + ler graphify-out/GRAPH_REPORT.md
│
├── Validar segurança
│   ├── scan automatizado pré-release → semgrep-scanner + semgrep-triager
│   ├── taint tracking interprocedural → codeql-runner
│   ├── review manual de auth/input → security-auditor subagent
│   └── auditoria deep multi-tool → /best
│
├── Subir / fazer release
│   ├── feature pronta + testada → /ship
│   ├── /ship + scan obrigatório → /pipeline
│   └── deploy a quente, rollback prep → skill 07 (Deploy Engineer)
│
├── Trabalhar em paralelo (sempre por feature vertical, nunca por camada)
│   ├── 1 feature isolada → /worktree
│   ├── N features independentes (cada uma DB+back+front+teste) → /loop --worktree --parallel N
│   └── 1 task autônoma simples → /auto
│

├── Documentar
│   ├── CLAUDE.md do projeto → skill 28 (CLAUDE.md Generator)
│   ├── ADR ou contrato de API → skill 10 (Documenter)
│   ├── changelog de release → skill 24 (Release Manager)
│   └── visão geral pro time → este arquivo
│
└── Criar/editar/avaliar skill do próprio kit
    └── skill 35 (Skill Author) — meta-skill com scorecard de 10 critérios
```

---

## O que ainda falta (roadmap honesto)

Comparando com [aihero.dev](https://www.aihero.dev/5-agent-skills-i-use-every-day) e outras coleções de skills, identificamos 3 gaps reais:

| Gap | Por que vale | Status |
|---|---|---|
| `/grill-me` (interrogatório de spec) | nosso PO só ativa Deep Interview se ambiguity > 0.7 — falta versão sempre-ativa para pegar "unknown unknowns" cedo | candidato p/ próximo batch |
| `/to-prd` (conversa → GitHub issue formatado) | hoje produzimos spec markdown mas não em formato issue/Agile | candidato p/ próximo batch |
| `/to-issues` (PRD → vertical slices Kanban) | orchestrator monta pipeline mas não quebra em issues independentes paralelizáveis | candidato p/ próximo batch |
| `/tdd` (red-green-refactor enforced) | skill 05 escreve teste mas sem TDD obrigatório | candidato p/ próximo batch |
| Audit das skills 21, 22, 24, 27 | classificadas NEEDS-REWRITE no `evals/skill-audit-2026-05-03.md` | priorizar antes de adicionar mais skills |
| Tier 3 cleanup: adicionar `allowed-tools` em skills 01-15 | 75% das skills antigas miss esse field, fix mecânico | quick-win para próxima sessão |

Detalhes do audit: [`evals/skill-audit-2026-05-03.md`](../evals/skill-audit-2026-05-03.md).

---

## Como contribuir

1. Skill nova → use `/skill-author --action=create` ou siga template em `skills/35-skill-author/SKILL.md`
2. Eval scorecard: 10 critérios × 0-3, threshold 22/30 para merge
3. Toda mudança passa por review cycle (cycle 1 sempre pega bug; cycle 2-3 polem)
4. Ver `CONTRIBUTING.md` para fluxo completo

---

## Onde buscar mais detalhe

- **Visão geral do kit:** [`README.md`](../README.md) (EN) ou [`README.pt-BR.md`](../README.pt-BR.md)
- **Cada skill em detalhe:** `skills/NN-nome/SKILL.md`
- **Cada subagent em detalhe:** `.claude/agents/<name>.md`
- **Policies:** `policies/*.md`
- **Templates de output:** `templates/`
- **Auditoria de qualidade:** `evals/skill-audit-2026-05-03.md`
- **Setup em repo consumidor:** `docs/setup-bot-folder.md`
- **Skill discovery (decision tree completa):** `docs/skill-guides/skill-discovery.md`

---

> **Princípio do kit:** **task certa → skill certa → modelo certo → custo certo.**
> Você não paga Opus para gerar boilerplate. Você não pula QA para "ir mais rápido". Você não inventa convenção quando o repo já tem uma.
