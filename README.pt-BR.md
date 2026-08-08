> 🌎 [English version](README.md) · 🇧🇷 Versão em Português

# Dev Team Kit — 55 Skills Especialistas para Coding Agents

![Version](https://img.shields.io/badge/version-2.42.0-0f766e)
![Skills](https://img.shields.io/badge/skills-54-1d4ed8)
![Plugin](https://img.shields.io/badge/Claude%20Code-plugin-f59e0b)
![License](https://img.shields.io/badge/license-Apache--2.0-7c3aed)

> Um time completo de especialistas de software dentro do seu agente de código.  
> Cada task é roteada para o especialista certo, executada no modelo certo, e entregue com qualidade de produção.

### ✨ Novidades v2.22-v2.25

| Versão | Destaque | Onde |
|---|---|---|
| **v2.44.0** | **Skill 56 `responsive-conversion`** — converte UI pensada pra desktop em UI que funciona de verdade no mobile, e é dona dos padrões de interação que a conversão expõe. Preenche um buraco real: responsividade eram 9 linhas na skill 02, e modal/confirmação existiam só como pergunta do checklist de Nielsen. Inclui catálogo sintoma→causa raiz→fix (`min-width: auto` como o motivo real de um filho de flex/grid "não pegar 100%", `dvh` vs `vh`, `env(safe-area-inset-*)` pro notch e barra de gestos, caça a scroll horizontal), protocolo de auditoria em 4 fases testado em 320/390/768px, tabela de decisão modal vs. bottom sheet com requisitos não-negociáveis (focus trap, retorno de foco, scroll lock que funciona no iOS), e padrões de ação destrutiva por reversibilidade (preferir Desfazer a Confirmar; confirmação por digitação em ação catastrófica). | [`skills/56-responsive-conversion/SKILL.md`](skills/56-responsive-conversion/SKILL.md), [`docs/skill-guides/responsive-conversion.md`](docs/skill-guides/responsive-conversion.md) |
| **v2.43.0** | `/catalog-project` agora sintetiza `product`, `sessions` e `operations` no manifesto, alimentando o app companheiro `project-brain` (catálogo cross-repo). Confere `git remote -v` antes de gravar valor real de secret. | [`commands/catalog-project.md`](commands/catalog-project.md) |
| **v2.42.0** | **Skill 55 `marketing-reporting-analytics`** — operações de marketing analytics, distinta do escopo de tracking de produto da skill 21: estrutura de relatório de performance de Ads/GA4 (fórmulas de ROAS/CPA/CTR, seções adaptadas por audiência), checklist técnico de setup GA4+GTM em 4 fases ("configurado" só após validação da Fase 4, não apenas instalação da tag), auditoria de infraestrutura de dados de marketing em 8 categorias com PASS/FAIL/PARTIAL + severidade, e calculadoras financeiras de CAC-payback/ROI/ROAS (custo totalmente carregado, payback ajustado por churn). | [`skills/55-marketing-reporting-analytics/SKILL.md`](skills/55-marketing-reporting-analytics/SKILL.md) |
| **v2.41.0** | **Catálogo de roteamento de plugins** — `plugins/catalog/*.json` agrupa as 53 skills em 9 composições orientadas a tarefa (development, design-quality, product-marketing, release-ops, core-discovery, ai-integration, mais 3 plugins externos/alto-risco: finance, legal, Context7 docs). `node scripts/route-task.mjs "<tarefa>"` (e a tool MCP `devkit_route_task`) retornam a menor composição útil, com nível de risco e flag de revisão humana pra recomendações externas — roteadores CLI e MCP verificados em paridade via suite de fixtures compartilhada. Feedback estruturado de roteamento (`accepted`/`overridden`/`rejected`) alimenta `/insights` e `/savings`, com rotação por tamanho pra o log não crescer sem fim. Também: gerador de config MCP pro Kimi Code, transporte HTTP opcional do Context7 (junto do stdio padrão), um boot check real via JSON-RPC stdio do MCP server plugado no `devkit doctor` + CI (os evals de roteamento checam *o que* é recomendado; isso checa se o *recomendador* de fato sobe), correção de path do installer no Windows/Git Bash, e skills de design/SEO expandidas (dials numéricos de intensidade + anti-padrões por indústria na skill 02, biblioteca copy-paste `templates/transitions.css`, e seções de local/e-commerce/internacional na skill 14). | [`plugins/catalog/`](plugins/catalog/), [`policies/plugin-catalog.md`](policies/plugin-catalog.md), [`scripts/route-task.mjs`](scripts/route-task.mjs) |
| **v2.40.0** | **Skill 53 `doubt-driven-review`** — absorvida de [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT, 76.7k stars). Revisão adversarial EM VOO — diferente do gate pós-hoc de PR da skill 11 — pra decisão não-trivial enquanto corrigir rota ainda é barato: CLAIM (nomear a decisão) → EXTRACT (menor unidade revisável, sem o raciocínio) → DÚVIDA (revisor de contexto fresco, prompt adversarial, viesado a refutar) → RECONCILIA (classificar findings: contrato mal-lido / acionável / trade-off / ruído) → PARA (limitado a 3 ciclos). Referência cruzada na skill 11 (reviewer). Também apertou o protocolo de Deep Interview da skill 01 (`templates/deep-interview.md`) com a disciplina `interview-me` do mesmo repo: pergunta com palpite anexado, sonda "want vs. should-want", linha "fora de escopo" obrigatória no restate, e gate de confirmação explícito mais rígido. | [`skills/53-doubt-driven-review/SKILL.md`](skills/53-doubt-driven-review/SKILL.md), [`templates/deep-interview.md`](templates/deep-interview.md) |
| **v2.39.0** | **Absorção de ideias (não código) de ponytail + repowise + paper COMPILOT** — a escada de 7 degraus do ponytail antes de gerar código (YAGNI → já existe no codebase → stdlib → feature nativa → dependência instalada → one-liner → só então código novo), como policy + hook PreToolUse, mais modo delete-list pro `/simplify` e skill 23; deduções ponderadas por risco na skill 18 (harnessability score), risk banding qualitativo no `/diff-impact` e skill 11, e o padrão de truncamento reversível `_meta.omitted` documentado em `mcp-builder-patterns.md`, todos do repowise (só conceitos — o repowise em si é AGPL); a taxonomia de anti-parada-prematura e feedback categorizado do paper COMPILOT PACT 2025 aplicada ao `/loop` e `/swarm`. | [`policies/`](policies/), [`hooks/scripts/pre-code-ladder-guard.mjs`](hooks/scripts/pre-code-ladder-guard.mjs) |
| **v2.38.0** | **Skill 52 `ui-polish`** — absorvida do agent skill externo [jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) (MIT). 16 princípios de acabamento visual: border radius concêntrico, alinhamento óptico, sombra em vez de borda, animações interrompíveis, split/stagger de entrada, saída sutil, animação contextual de ícone (valores exatos: scale 0.25→1, blur 4px→0, spring bounce 0), font smoothing, tabular numbers, text wrapping (balance/pretty), image outline (preto/branco puro, nunca tintado), scale on press (0.96), skip animation on load, proibição de `transition: all`, `will-change` moderado, hit area mínima de 40×40px. Referência cruzada nas skills 12 (motion-design, dona do sistema de tokens) e 02 (ui-ux-design, checklist pós-Frontend). | [`skills/52-ui-polish/SKILL.md`](skills/52-ui-polish/SKILL.md), [`docs/skill-guides/ui-polish.md`](docs/skill-guides/ui-polish.md) |
| **v2.37.0** | **Absorção de 7 ebooks (Casa do Código)** — só o gap real virou skill nova: **skill 51 `ux-research`** (discovery qualitativo — entrevista com usuário, persona baseada em pesquisa, journey map, teste de usabilidade, arquitetura de informação; fica *antes* do PO 01 e do UI/UX 02). O resto virou incremento cirúrgico: 3 policies de XP (`pair-programming`, `continuous-integration`, `sustainable-pace`, ligadas à skill 37); skill 01 ganha **Fundamento de Negócio** (validação de hipótese, MVP, monetização, AARRR, product-market fit — do *Guia da Startup*); skill 14 ganha **Keyword Research** (KEI, intent, cauda longa) + **Off-Page/Link Building**; skill 07 ganha **Infrastructure as Code** (provisionamento declarativo, idempotência, drift — princípios de DevOps mapeados pra Terraform/Ansible); skill 38 ganha lentes de coesão/acoplamento, seam distribuído (REST/async/RPC, HATEOAS) e camadas. Jogos HTML5 Canvas descartado (nicho <2%). | [`skills/51-ux-research/SKILL.md`](skills/51-ux-research/SKILL.md), [`policies/pair-programming.md`](policies/pair-programming.md) |
| **v2.36.0** | **Skill 50 `direct-response-copy`** — copy de direct response destilada de 3 ebooks clássicos de copy PT-BR: biblioteca de fórmulas de headline em 20 categorias de gatilho (357 modelos destilados em fórmulas parametrizadas), os 8 gatilhos mentais + estrutura de storytelling de venda, copy de Instagram (legenda/engajamento). Gate de integridade obrigatório: sem claim não-verificável, sem depoimento fabricado, escassez só real. Complementa a skill 13 (copy de produto) — 13 cobre landing/microcopy/brand voice, 50 cobre ads/página de vendas/e-mail/social. | [`skills/50-direct-response-copy/SKILL.md`](skills/50-direct-response-copy/SKILL.md), [`skills/50-direct-response-copy/references/headline-formulas.md`](skills/50-direct-response-copy/references/headline-formulas.md) |
| **v2.27.0** | **Investigate-first guard** — princípio com enforcement ativo: a IA nunca deve perguntar ao usuário algo que ela mesma pode descobrir. Hook PreToolUse intercepta `AskUserQuestion`, detecta pergunta auto-descobrível (user do github, gh logado, branch, package manager, porta, versão de runtime, stack, conta de MCP) e manda rodar o comando primeiro (`gh auth status`, `git config`, Glob lockfile, MCP `whoami`) em vez de interromper. Não bloqueia — educa. Conservador: preferência/intenção/trade-off passam livres. 10/10 padrões descobríveis pegos, 5/5 perguntas legítimas passam. | [`policies/investigate-first.md`](policies/investigate-first.md), [`hooks/scripts/investigate-first-guard.mjs`](hooks/scripts/investigate-first-guard.mjs) |
| **v2.26.0** | **Absorção ECC (rodada 2)** — `silent-failure-hunter` (16º subagent, review-only: caça `catch{}` vazio, erros engolidos, fallbacks perigosos, stack traces perdidos, rollback faltando) + skill 49 `context-budget` (audita peso de contexto carregado por componente, headroom + alertas de overflow; distinto do cost-tracker que mede completions runtime) + comando `/context-budget`. | [`agents/silent-failure-hunter.md`](agents/silent-failure-hunter.md), [`skills/49-context-budget/SKILL.md`](skills/49-context-budget/SKILL.md) |
| **v2.25.0** | **Rules system path-scoped** (`.claude/rules/` com `paths:` glob — o harness anexa um padrão de codificação só quando um arquivo editado casa o glob, layering common+linguagem, inspirado no [ECC](https://github.com/affaan-m/ECC)) + paydown de dívida: corrigido o bug da allowlist de subagents (o 15º subagent `anti-ai-writing` faltava na allowlist enumerada), reconciliado o count drift, e reescritos os 5 skills stub (19/21/22/24/27) com profundidade real. | [`rules/`](rules/), [`policies/rules-system.md`](policies/rules-system.md) |
| **v2.24.0** | Memory curator vira **autônomo** — o agente lapida a própria memória sem pedir permissão. Async no SessionStart, faz decay/archive/dedup em JS puro (zero LLM) e delega só o merge *semântico* ao agente já presente da sessão (sem forkar `claude -p` = sem cobrar 2×). | [`hooks/scripts/memory-curator.mjs`](hooks/scripts/memory-curator.mjs), [`policies/memory-curator.md`](policies/memory-curator.md) |
| **v2.23.0** | Absorção curada de addozhang — skill 48 `research-prep`, playbook de migração Spring Boot 2→3 (skill 23), padrões de memória mem9 no session-start + skill 08. | [`skills/48-research-prep/SKILL.md`](skills/48-research-prep/SKILL.md), [`skills/23-migration-refactor-specialist/playbooks/spring-boot-2-to-3.md`](skills/23-migration-refactor-specialist/playbooks/spring-boot-2-to-3.md) |
| **v2.22.0** | Memory curator (primeira versão) — hook Stop disparado por inatividade que *sugeria* `/consolidate-memory`. Substituído pelo curador autônomo na v2.24.0. | [`policies/memory-curator.md`](policies/memory-curator.md) |
| **v2.21.0** | Context-cost guards — automatiza as 9 táticas de economia de plano. `topic-shift-detector` sugere `/clear` ao mudar de assunto; `session-start` avisa CLAUDE.md gordo (>200 linhas) + MCPs do projeto. Sensores conservadores (precisão > cobertura, falso positivo treina o user a ignorar avisos). | [`hooks/scripts/topic-shift-detector.mjs`](hooks/scripts/topic-shift-detector.mjs), [`policies/token-efficiency.md`](policies/token-efficiency.md) |
| **v2.20.0** | Skill 47 `pattern-conformity` — detecta e codifica padrões de coding do projeto existente (naming, estrutura de arquivos, error handling, testing style, async, DI, API design) em `memory/patterns.md`. Novo código é restringido por esses padrões. 46/46 eval-triggers PASS. | [`skills/47-pattern-conformity/SKILL.md`](skills/47-pattern-conformity/SKILL.md), [`evals/triggers/47-pattern-conformity.json`](evals/triggers/47-pattern-conformity.json) |
| **v2.19.1** | Polish pass: bugs no `skill-health.mjs` (parser YAML multiline), 9 overlaps cross-section refinados, 4 commands ganharam frontmatter. Portfolio limpo: 0 overlaps, 0 dead policies, 100% cobertura de fixture, 45/45 eval-triggers PASS. | [`scripts/skill-health.mjs`](scripts/skill-health.mjs), [`docs/skill-health.md`](docs/skill-health.md) |
| **v2.19.0** | Absorção curada de ECC/gstack/mattpocock/ruflo — 3 skills novas (zoom-out, handoff-context, post-deploy-canary-monitor), 6 commands (instinct-export/import/promote, multi-plan, aside, skill-health), `policies/boil-the-lake.md`, truth-score em verification + stream-chain em programs-schema. | [`docs/plans/2026-05-27-v2.19.0-absorption-plan.md`](docs/plans/2026-05-27-v2.19.0-absorption-plan.md), [`docs/inspiration/ruflo-evaluation.md`](docs/inspiration/ruflo-evaluation.md) |
| **v2.18.0** | Dashboard web interativo: 6 tabs (Graph, Bench, Savings, Drift, Skill Quality, Trigger Eval). Zero-build, zero-dep, single-file HTML + CDN. | [`docs/preview/dashboard.html`](docs/preview/dashboard.html), [`scripts/build-dashboard.mjs`](scripts/build-dashboard.mjs) |
| **v2.17.0** | `/diff-impact` (ripple analysis) + graph auto-update hook (PostToolUse regenera graphify-out após Edit/Write). | [`commands/diff-impact.md`](commands/diff-impact.md), [`scripts/diff-impact.mjs`](scripts/diff-impact.mjs) |

**Como usar:** ver [`docs/quickstart.md`](docs/quickstart.md) com os 4 cenários (gerar imagem CLI, swarm com geração automática, bootstrap do template, adapters em runtime).

---

### 📖 Wiki Completa — ponto de partida recomendado

| Idioma | Link |
|---|---|
| 🇧🇷 **Português** | [`docs/WIKI.pt-BR.md`](docs/WIKI.pt-BR.md) |
| 🌎 **English** | [`docs/WIKI.md`](docs/WIKI.md) |

Cada skill, subagent, command, policy, plugin e MCP tool documentado — no formato do post [aihero.dev "5 Agent Skills I Use Every Day"](https://www.aihero.dev/5-agent-skills-i-use-every-day).

---

### 📊 Bench de Qualidade — resultados medidos, sem marketing

Testamos cada skill e subagent com rubrica publicada. 53 cenários de isolamento + 3 testes end-to-end. Mesmo modelo, mesmo prompt — com e sem o kit. Números medidos, código real, resultados auditáveis.

| Idioma | Link | Destaques |
|---|---|---|
| 🇧🇷 **Português** | [`analyze-doc/index.pt-BR.html`](analyze-doc/index.pt-BR.html) | 92.6% pass rate · +1.84 delta médio · 53/53 E2E verdes |
| 🌎 **English** | [`analyze-doc/index.en.html`](analyze-doc/index.en.html) | Same report in English |

Inclui before/after com texto completo dos outputs, scores delta por skill, resultados dos testes process-based, e verificação dos fixes da v2.10.1. Metodologia em [`eval-bench/`](eval-bench/).

---

## Por Que Isso Importa (Para Qualquer Pessoa)

Se você usa IA pra construir produto — seja um dev experiente, um indie hacker fazendo SaaS, ou alguém que só sabe descrever o que quer — esse kit muda o jogo. Em linguagem simples, o que ele faz:

### 💰 Economiza sua conta de API (até 70%)
A IA adora ler tudo: o output inteiro de um `npm install`, stack traces repetidos, listas enormes de arquivos. Tudo isso vira token, que vira dinheiro. O kit **comprime automaticamente** esse ruído antes de mandar pro modelo — você paga só pelo que importa.

### 🧠 Entende o que você quer antes de sair fazendo
Em vez de um agente genérico que "chuta" a implementação, o kit tem um **orquestrador** que lê seu pedido, classifica a complexidade, e monta o pipeline mínimo necessário. Se você for vago, ele pergunta. Se for claro, ele executa. Nunca sai inventando.

### 🗂️ Memória persistente entre sessões
A maioria dos agentes esquecem tudo quando você fecha a janela. Esse aqui **lembra**: o que você decidiu, quais arquivos são importantes, que padrões o seu projeto segue, que bugs apareceram antes. Resultado: menos retrabalho, menos token gasto recontextualizando, e respostas muito mais assertivas a cada sessão.

### 🤖 Modo autônomo — manda e esquece
Dá uma task complexa com `/auto` ou `/loop` e vai tomar um café. O agente executa, testa, corrige, valida e **só para quando está pronto, funcional e testado**. Tem circuito de segurança: se travar no mesmo erro 3x, detecta e avisa — não fica queimando API à toa.

### 🖼️ Geração de imagem profissional, sem placeholder
Landing page com caixinha cinza "imagem aqui"? Nunca mais. O kit integra **fal.ai** com prompts escritos por um especialista em IA generativa — você descreve a cena, o sistema traduz em prompt técnico, e entrega imagens prontas pra produção. Ilustrações, hero images, ícones, mockups, todos consistentes com a sua marca.

### 🔒 Segurança antes do deploy, não depois do vazamento
Um **auditor de segurança** pensa como atacante e revisa o código antes dele chegar em produção. Findings críticos vêm com prova de conceito. Nada de descobrir vulnerabilidade na conta do cliente.

### 🧪 Testes que realmente provam que funciona
Um **engenheiro de QA** que segue o princípio "prove-it": se você disse que funciona, me prove com um teste. Nada de "parece ok". Cobre cenários de sucesso, falha, edge cases e regressão.

### 🎨 Design e copy que vendem
- **Designer** com análise competitiva: olha os concorrentes e recomenda o que converte
- **Copywriter** especialista em marketing: texto pronto pra landing, email, anúncio
- **SEO** que otimiza antes do Google indexar — seu site nasce achável

### 🚀 Do zero ao deploy sem contratar 5 freelancers
Backend, frontend, mobile (Tauri), observability, analytics, acessibilidade (WCAG), refatoração, release, documentação — **37 especialistas no total**. Cada task vai pro profissional certo, com o modelo de IA certo (Haiku pro simples, Sonnet pro médio, Opus pra arquitetura) — você não paga Opus pra gerar boilerplate.

### 🔌 Funciona em tudo que você já usa
Plugin nativo do **Claude Code** + MCP server universal que roda em **Cursor, Windsurf, Copilot, Gemini CLI** e qualquer agente compatível com MCP. **Zero vendor lock-in.** Trocou de ferramenta? Seu time vai junto.

### 🆓 Grátis, Apache-2.0, open source
Sem mensalidade. Sem trial. Sem tier premium escondido. Clona, instala, usa pra sempre — inclusive em projeto comercial. Apache-2.0 com arquivo `NOTICE` força atribuição rio abaixo: quem reempacotar o kit é obrigado a manter o crédito de quem moldou as ideias dentro dele.

---

## O Que É

O **Dev Team Kit** é um conjunto de 37 skills especializadas que transforma qualquer agente de coding compatível em um time completo de desenvolvimento — com orchestrator, backend, frontend, QA, security, deploy, design, copy, SEO, observability e mais.

**O que você ganha:**

- **Pipeline estruturado** — cada task passa pelas etapas certas, na ordem certa, sem improvisar
- **QA, Security e Reviewer obrigatórios** — nenhuma entrega sai sem validação
- **Model routing automático** — haiku para boilerplate, sonnet para implementação, opus para arquitetura
- **Lifecycle hooks** — o agente detecta contexto vago, re-lê arquivos antes de editar, monitora custo de tokens
- **MCP server próprio** — 37 tools expostas para qualquer cliente MCP
- **Memória persistente** — working set, context pack, learned skills com confidence scoring acumuladas por projeto
- **Instalação multi-plataforma** — Claude Code, Cursor, Windsurf, Copilot, Gemini CLI e mais

### Construído sobre princípios de Context Engineering

A arquitetura do kit se mapeia para a [hierarquia de engenharia de contexto](https://github.com/davidkimai/Context-Engineering): skills individuais são **átomos**, templates são **moléculas**, learned-skills + working-set são **células**, subagents despachados são **órgãos**, e programs compostos por protocol shells são a **camada de campo emergente**. Novidade na v1.1: protocol shells tipados em 3 subagents piloto, schemas de I/O em `schemas/skill-io/`, scoring de iteração no circuit breaker do auto-loop, e definições declarativas em `programs/`. Veja `docs/WIKI.md → Context Engineering Stack`.

> **Tour de 5 min:** [`docs/SKILLS-OVERVIEW.md`](docs/SKILLS-OVERVIEW.md) — toda skill, modo, subagent e policy em uma página navegável (formato aihero.dev).

---

## Instalação Rápida

### Modo 1 — Plugin Global (Claude Code)

Instala as 38 skills e hooks globalmente. Funciona em qualquer projeto sem configuração adicional.

```bash
# Via Claude Code CLI
claude plugin install https://github.com/felvieira/claude-skills-fv
```

O que é instalado globalmente: skills, hooks, commands (`/audit-repo`, `/devkit-install-fv`, `/plan-feature`, `/review-release`, `/inventory-assets`).

### Modo 2 — Kit Completo por Repo (via comando)

Com o plugin instalado, rode dentro do repo que quer configurar:

```
/devkit-install-fv
```

Isso instala `.bot/` completo: MCP server, policies, templates, docs, hooks, learned-skills e configs multi-plataforma.

### Modo 3 — Bash Direto

```bash
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh /caminho/do/projeto
```

Se o kit já estiver em `.bot/`, você também pode rodar diretamente do repo instalado:

```bash
bash .bot/setup/install.sh
```

O instalador inclui `setup/` e todos os diretórios do kit em `.bot/`. Suporta flags de perfil não-interativo:
- `--profile lean` — instala sem MCP e sem scripts pesados
- `--no-input` — sem prompts, usa defaults
- `--yes` — aceita tudo automaticamente

Na tabela abaixo, considere o `dev-team-kit` como 37 tools apoiadas pelas 38 skills.
O MCP expoe 37 tools apoiadas pelas skills instaladas.

### Comparativo dos Modos

| O que é instalado | Plugin Global | /devkit-install-fv | Bash direto |
|---|:---:|:---:|:---:|
| 37 skills | ✅ | ✅ | ✅ |
| Hooks (lifecycle) | ✅ | ✅ | ✅ |
| Slash commands | ✅ | ✅ | ✅ |
| Policies | ❌ | ✅ | ✅ |
| MCP server (37 tools) | ❌ | ✅ | ✅ |
| Templates de handoff | ❌ | ✅ | ✅ |
| Docs + repo-audit | ❌ | ✅ | ✅ |
| Configs multi-plataforma | ❌ | ✅ | ✅ |
| Learned skills por projeto | ❌ | ✅ | ✅ |

---

## Plataformas Compatíveis

| Plataforma | Skills | Hooks | MCP | Slash Commands | Notas |
|---|:---:|:---:|:---:|:---:|---|
| **Claude Code** | ✅ | ✅ | ✅ | ✅ | suporte completo — plugin nativo |
| **Cursor** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via AGENTS.md, MCP via config |
| **Windsurf** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via rules, MCP via `.windsurf/mcp.json` |
| **GitHub Copilot** | ✅ via `.bot/` | ❌ | ❌ | ❌ | skills via `.github/copilot-instructions.md` |
| **Gemini CLI** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via GEMINI.md, MCP via `.gemini/settings.json` |
| **OpenCode** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via AGENTS.md |
| **Antigravity** | ✅ via `.bot/` | ❌ | ✅ | ❌ | skills via config local |

> Para plataformas sem hooks nativos, as mesmas regras estão em `policies/hooks.md` — o agente as aplica manualmente.

---

## Os 37 Especialistas

### Gestao e Coordenacao

| # | Skill | O que faz |
|---|---|---|
| 08 | **Context Manager** | rastreia foco, tasks abertas, arquivos quentes e handoffs entre sessões |
| 09 | **Orchestrator** | define o pipeline mínimo suficiente, delega para specialists, adapta em caso de rejeição |
| 10 | **Documenter** | registra decisões, contratos de API, operações e impactos em docs vivos |
| 11 | **Reviewer** | valida o delta final antes de liberar — qualidade, escopo e risco |
| 17 | **Image Generator** | gera e adapta assets visuais via fal.ai com suporte a t2i, i2i, rembg e ícones Tauri |
| 18 | **Repo Auditor** | fotografia completa do repo — stack, convenções, riscos, entry points e dívida técnica |
| 19 | **Asset Librarian** | inventaria logos, ícones, fontes, tokens visuais e assets reutilizáveis |
| 20 | **Observability SRE** | define logs estruturados, métricas, tracing, alertas e plano de rollback |
| 21 | **Data Analytics** | define eventos de tracking, naming, funis e KPIs de produto |
| 22 | **Accessibility Specialist** | revisa WCAG 2.2, navegação por teclado, semântica HTML e motion reduction |
| 23 | **Migration & Refactor Specialist** | conduz migrações incrementais, feature flags e rollback seguro |
| 24 | **Release Manager** | organiza changelog, release notes, versionamento e rollout gradual |
| 25 | **AI Integration Architect** | projeta adapters de IA, gateways, streaming, fallbacks e custo de inferência |
| 26 | **Prompt Engineer** | cria e itera prompts, templates reutilizáveis e estratégias de few-shot |
| 27 | **Video Integration Specialist** | integra vídeo generativo com foco em UX, latência e formatos de output |
| 28 | **CLAUDE.md Generator** | gera `CLAUDE.md` inteligente para projetos consumidores do kit |
| 30 | **Cost Tracker** | rastreia custo de tokens e API calls por sessão, por skill e por tier de modelo |
| 31 | **Session Summary** | consolida resumo de sessão para handoff limpo entre sessões longas |
| 32 | **Smart Suggestions** | sugere a próxima ação mais impactante baseado no estado real do projeto |
| 33 | **Detective Spec** | engenharia reversa de specs executáveis a partir de código legado — módulos, regras de negócio, fluxos, ADRs retroativos, zero writes fora de `_detective_sdd/` |
| 35 | **Skill Author** | meta-skill para criar, editar, avaliar e otimizar as próprias skills do kit — sustenta o kit conforme cresce além de 37 especialistas |
| 38 | **Architecture Deepener** | encontra deepening opportunities (deletion test, deep modules) usando glossário de domínio + vocabulário arquitetural; pareia com skill 23 (Migration & Refactor) para execução |

### Produto e Design

| # | Skill | O que faz |
|---|---|---|
| 01 | **PO** | escreve spec, histórias de usuário, critérios de aceitação e define prioridade |
| 02 | **UI/UX Designer** | define layout, sistema de tokens, responsividade e heurísticas de uso |
| 29 | **Design Intelligence** | pesquisa concorrentes, captura screenshots, analisa tendências visuais e entrega dossier estratégico para UI/UX |
| 36 | **Web Asset Generator** | favicons (multi-size), PWA icons (incl. maskable), Open Graph e Twitter card images, manifest e snippets de meta tags — derivados de logo ou texto da marca |

### Desenvolvimento

| # | Skill | O que faz |
|---|---|---|
| 03 | **Backend Engineer** | APIs REST/GraphQL, contratos, auth, validação, banco de dados e integrações |
| 04 | **Frontend Engineer** | React/Next.js, estado, chamadas de API, performance e experiência do app |
| 12 | **Motion Designer** | animações, transições, micro-interações e comportamento visual coeso |
| 15 | **Mobile / Tauri** | extensão opcional para apps desktop e mobile com Tauri + React Native |

### Conteudo e Descoberta

| # | Skill | O que faz |
|---|---|---|
| 13 | **Marketing Copy** | copy de produto, CTAs, landing pages, brand voice e mensagens de conversão |
| 14 | **SEO Specialist** | metadata, schema.org, Core Web Vitals, sitemap e discoverability |

### Qualidade e Entrega

| # | Skill | O que faz |
|---|---|---|
| 05 | **QA Engineer** | testes unitários, integração, E2E, cobertura e edge cases críticos |
| 06 | **Security Reviewer** | OWASP Top 10, headers, CORS, CSRF, XSS, injeção e exposição de dados |
| 34 | **Static Analysis** | scan automatizado de segurança e bugs via Semgrep + CodeQL com output SARIF, triagem de severidade e integração CI — alimenta findings na skill 06 |
| 37 | **TDD Engineer** | red-green-refactor enforced; combate anti-padrão horizontal slicing (escrever todos os testes antes de toda impl); 1 teste → 1 impl → repete. Pareia com skill 38 para deep modules |
| 07 | **Deploy Engineer** | containerização, CI/CD, rollout blue-green, rollback e infra como código |

---

## Pipeline Principal

```mermaid
flowchart LR
    A[Task] --> B[Orchestrator 09]
    B --> C[Context Manager 08]
    B --> D[Pipeline mínimo suficiente]
    D --> E[Specialists 01–32]
    E --> F[QA 05 + Security 06 + Reviewer 11]
    F --> G[Deploy 07 ou Release 24]
    B --> H[Model Routing por etapa]
```

### Pipelines Comuns

| Tipo de tarefa | Pipeline |
|---|---|
| Feature completa | `PO → UI/UX → Backend → Frontend → Motion → Copy → SEO → QA → Security → Reviewer → Deploy` |
| Bug fix | `Backend → QA → Security → Reviewer → Deploy` |
| Hotfix crítico | `Backend → Security → Reviewer → Deploy` |
| Melhoria de UI | `UI/UX → Frontend → Motion → QA → Security → Reviewer → Deploy` |
| Landing page | `Copy → Design Intelligence → UI/UX → Frontend → SEO → QA → Reviewer` |
| Integração de IA | `Repo Auditor → AI Architect → Prompt Engineer → Backend → Observability → QA → Security → Reviewer` |
| Release formal | `Reviewer → Observability SRE → Release Manager → Deploy` |

---

## Model Routing — Modelo Certo para Cada Etapa

| Tier | Modelo | Quando usar |
|---|---|---|
| Fast | haiku | boilerplate, rename, microcopy, templates, formatação |
| Balanced | sonnet | implementação, testes, debug, integração, design |
| Deep | opus | arquitetura, security review, orquestração, decisões críticas |

**Enforcement automático (Claude Code):**
- `EnterPlanMode` → hook sugere `/model opus`
- `ExitPlanMode` → hook sugere `/model sonnet`
- Subagent sem `model` explícito → hook alerta e sugere tier por keywords

**Em outros ambientes:** seguir `policies/model-routing.md` manualmente.

---

## Hook System — Inteligência em Lifecycle Events

| Hook | Evento | O que faz | Perfil |
|------|--------|-----------|--------|
| `pre-execution-gate` | UserPromptSubmit | detecta prompt vago e confirma antes de agir | standard, strict |
| `keyword-detector` | UserPromptSubmit | injeta skill ou learned skill relevante automaticamente | standard, strict |
| `context-guard-stop` | Stop | avisa em 50% (não-bloqueante) e bloqueia em 75% com resumo inteligente | todos |
| `persistent-mode` | Stop | bloqueia stop quando pipeline está ativo | todos |
| `pre-tool-enforcer` | PreToolUse | re-lê antes de editar, sugere code intelligence tools | todos |
| `investigate-first-guard` | PreToolUse | intercepta `AskUserQuestion`, bloqueia pergunta auto-descobrível (user do github, branch, package manager, porta…) e manda rodar o comando primeiro | standard, strict |
| `session-start` | SessionStart | restaura estado da sessão anterior e injeta skill-discovery | standard, strict |
| `post-tool-verifier` | PostToolUse | detecta debugging patterns, sugere extração de learned skill | standard, strict |
| `model-routing-hook` | PreToolUse | sugere troca de modelo em plan mode e valida subagent spawns | standard, strict |
| `simplify-ignore` | PreToolUse + PostToolUse | Protege blocos `simplify-ignore-start/end` de simplificação automática | standard, strict |

### Perfis de Hook

Controlados pela variável de ambiente `DEVKIT_HOOK_PROFILE` (padrão: `standard`):

| Perfil | Hooks ativos |
|--------|-------------|
| `minimal` | `context-guard-stop`, `persistent-mode`, `pre-tool-enforcer` |
| `standard` | todos |
| `strict` | todos |

- **`DEVKIT_HOOK_PROFILE`** — define o perfil ativo (`minimal`, `standard` ou `strict`)
- **`DEVKIT_DISABLED_HOOKS`** — lista separada por vírgula de hookIds a desativar independente do perfil

### Context Guard — Strategic Compact

O hook `context-guard-stop` opera em dois níveis:
- **50%** — aviso não-bloqueante: sugere `/compact` enquanto ainda há margem
- **75%** — bloqueio inteligente: exibe hint da task atual, arquivos editados na sessão e decisões do working set antes de bloquear

---

## Subagents — Especialistas Despacháveis via `Task` Tool

O kit inclui 16 subagents Claude Code em `.claude/agents/`, prontos para despachar com a `Task` tool ou invocar pelo prompt.

### Core (5)
| Subagent | Quando usar | Tools |
|---|---|---|
| `code-reviewer` | Review de PR, feature concluída ou qualquer código antes de merge | Read, Grep, Glob, Bash |
| `security-auditor` | Auth flows, input handling, deps, CORS, headers, pré-deploy | Read, Grep, Glob, Bash |
| `test-engineer` | Escrever testes, preencher gaps de cobertura, validar regressão | Read, Grep, Glob, Bash, Edit, Write |
| `orchestrator` | Classificar task complexa, montar pipeline, resolver overlap de skills | todas |
| `debugger` | Bug, comportamento inesperado, falha que você não consegue explicar — usa Evidence Ledger + tabela anti-rationalization | Read, Grep, Glob, Bash, Edit |

### Detective Spec (4) — fases do `/detective-spec`
| Subagent | Quando usar | Tools |
|---|---|---|
| `detective-contracts` | Fase 2: extrai contratos de módulo (API, deps, invariantes, consumidores) de código legado — read-only | Read, Grep, Glob, Bash |
| `detective-business-rules` | Fase 3: extrai regras de negócio escondidas em validações, constantes mágicas, transições de estado, testes — read-only | Read, Grep, Glob, Bash |
| `detective-flows` | Fase 4: reconstrói fluxos end-to-end (entry → side effects) com edge cases e estado mutado — read-only | Read, Grep, Glob, Bash |
| `detective-adrs` | Fase 5: infere ADRs retroativos e sintetiza overview + traceability — read-only | Read, Grep, Glob, Bash |

### Static Analysis (5) — pipeline da skill 34
| Subagent | Quando usar | Tools |
|---|---|---|
| `semgrep-scanner` | Repo multi-linguagem: scans Semgrep em paralelo por categoria de linguagem, agrega SARIF | Read, Grep, Glob, Bash |
| `semgrep-triager` | Batch >20 findings: classifica TP/FP/needs-investigation lendo contexto fonte, propõe fixes | Read, Grep, Glob, Write |
| `codeql-runner` | Bug precisa taint tracking interprocedural: orquestra build de database CodeQL + queries | Read, Grep, Glob, Bash |
| `sarif-parsing` | Múltiplas fontes SARIF: parse, dedup, agrega em relatório único (Semgrep + CodeQL + outros) | Read, Glob, Bash, Write |
| `variant-analysis` | Bug confirmado → caça variantes do mesmo padrão, gera custom rule reusável para CI | Read, Grep, Glob, Bash, Write |

### Conteúdo (1)
| Subagent | Quando usar | Tools |
|---|---|---|
| `anti-ai-writing` | Review de prosa nova entrando no repo: detecta os 29 padrões de AI-generated writing em docs, PRDs, copy, changelogs | Read, Grep, Glob, Write |

### Qualidade (1)
| Subagent | Quando usar | Tools |
|---|---|---|
| `silent-failure-hunter` | Review-only: caça falhas silenciosas — `catch{}` vazio, `.catch(() => [])`, stack trace perdido, fallback que esconde falha, rollback faltando | Read, Grep, Glob, Bash |

**Exemplo de invocação:**

```
Despache o subagent code-reviewer para revisar as mudanças em src/auth/login.ts
```

```
Use o subagent debugger para investigar o crash em TypeError: Cannot read properties of undefined em api/users.ts
```

Os subagents são copiados para `.claude/agents/` do repo consumidor pelo `install.sh`.
Ver `docs/skill-guides/subagents.md` para guia completo de quando usar cada um.

---

## MCP Server — 36 Tools para Qualquer Cliente MCP

```json
{
  "mcpServers": {
    "dev-team-kit": {
      "command": "node",
      "args": [".bot/mcp-server/dist/index.js"],
      "env": {
        "FAL_KEY": "fal-...",
        "BRAVE_SEARCH_KEY": "BSA...",
        "FIRECRAWL_KEY": "fc-..."
      }
    }
  }
}
```

Funciona no Claude Code, Windsurf, Gemini CLI, Cursor e qualquer cliente MCP.

| Bloco | Tools | Exemplos |
|-------|-------|----------|
| **Knowledge** | 14 | classifica task, monta pipeline, resume diff, monta context pack |
| **Execution** | 6 | busca concorrentes (Brave), scraping (Playwright/Firecrawl), gera imagens (fal.ai) |
| **Persistence** | 12 | salva contexto, working set, custo, learned skills e guardrails de sessão |
| **Session Intelligence** | 4 | comprime output verboso, lê log JSONL da sessão, lista arquivos/erros vistos |

Ver `mcp-server/README.md` para documentação completa das tools.

---

## API Keys Necessárias

| Key | Para que serve | Onde obter |
|-----|---------------|-----------|
| `FAL_KEY` | geração de imagens (skill 17, MCP moodboards) | fal.ai/dashboard/keys |
| `BRAVE_SEARCH_KEY` | pesquisa de concorrentes (skill 29, MCP) | brave.com/search/api |
| `FIRECRAWL_KEY` | scraping avançado (opcional) | firecrawl.dev |

O instalador solicita cada key e salva em `.env.local` do projeto.

---

## Ergonomia Diaria

- leia `docs/quickstart.md` para entrar rápido no fluxo
- reutilize `docs/repo-audit/current.md` antes de explorar o repo
- use `devkit_context_pack` para iniciar task sem reler metade do repo
- use `devkit_diff_brief` para retomar trabalho ou preparar review
- use `devkit_working_set` para persistir arquivos quentes e próximos passos
- use `commands/` como atalhos operacionais
- consulte `docs/skill-call-matrix.md` quando houver overlap entre skills
- consulte `docs/skill-guides/` apenas sob demanda
- consulte `docs/skill-guides/ideation-frameworks.md` — SCAMPER, HMW, First Principles, JTBD para fase de ideação
- consulte `docs/skill-guides/skill-discovery.md` — decision tree para escolher skill certa por tipo de task
- consulte `docs/skill-guides/context-engineering.md` — hierarquia de contexto, trust levels e packing strategies
- consulte `docs/skill-guides/autonomous-loop.md` — protocolo do `/auto` para execução autônoma

---

## Slash Commands — Atalhos por Fase de Desenvolvimento

| Command | O que faz | Skills ativadas |
|---------|-----------|-----------------|
| `/spec` | Especificar feature com critérios de aceitação | PO (01) |
| `/plan` | Classificar task e montar pipeline | Orchestrator (09) |
| `/build` | Implementar com stack do projeto | Backend (03) + Frontend (04) |
| `/test` | Escrever e rodar testes | QA (05) |
| `/review` | Review final + security audit | Reviewer (11) + Security (06) |
| `/simplify` | Simplificar e refatorar código | Migration & Refactor (23) |
| `/ship` | Release e deploy | Release Manager (24) + Deploy (07) |
| `/pipeline` | Pipeline completo end-to-end | Orchestrator (09) → todas |
| `/best` | Auditoria de boas práticas, clean code e DRY | Reviewer (11) + Security (06) + QA (05) |
| `/auto` | Agente autônomo — executa task completa sem intervenção | Todas as necessárias + circuit breaker |
| `/loop` | Orquestrador autônomo multi-agente (auto-loop v2) — claude + codex, paralelo via worktree, polishing pass | `scripts/auto-loop/` |
| `/worktree` | Cria git worktree isolado, copia `.env*`, valida ambiente em background | — |
| `/detective-spec` | Engenharia reversa de specs em legado — extrai contratos sem modificar o código | Detective Spec (33) |
| `/catalog-project` | Sintetiza repo-audit + detective-spec + narrativa de produto (resumo/planos/FAQ) + histórico de sessões + dados operacionais (envs/endereços/métricas) em `.project-memory/manifest.yaml` — alimenta o catálogo cross-repo `project-brain` | Repo Auditor (18) + Detective Spec (33) |
| `/grill-me` | Interrogatório relentless de uma ideia/plano — uma pergunta + resposta sugerida por turno | PO (01) Deep Interview |
| `/to-prd` | Converte conversa atual em PRD publicado no issue tracker (label `needs-triage`) | PO (01) modo PRD |
| `/to-issues` | Quebra PRD em N issues independentes (vertical slices) e publica no tracker | Orchestrator (09) + vertical-slices |
| `/pipeline-discovery` | Fluxo COMPLETO de discovery: grill-me → to-prd → to-issues → loop+TDD → ship | Orchestrator (09) coordenando, todas as skills |
| `/constitution` | Bootstrap/update de `memory/constitution.md` com princípios governantes (Code Quality, Testing, UX, Performance, Security) — autoridade hierárquica sobre PRD/plan/ADRs | PO (01) modo governance |
| `/checklist` | Gera checklist contextual por feature ("unit tests for English") — Completeness, Clarity, Consistency, Coverage, Edge Cases | PO (01) + validation |
| `/analyze` | Cross-artifact consistency check (read-only) — constituição → specs → plan → issues. Findings classificados CRITICAL/HIGH/MEDIUM/LOW | Reviewer (11) modo auditoria |
| `/humanize` | Remove 29 padrões AI de qualquer prosa (docs, PRDs, copy, changelogs). Auto-auditoria antes da versão final. | Documenter (10) modo editor |
| `/consolidate-memory` | Janitor do vault de memória — merge duplicatas, archive stale, prune índice. Workflow snapshot-first. | Context Manager (08) modo janitor |
| `/run-program` | Executa pipeline YAML declarativo (programs/*.yml) com gates humanos, parallel/conditional steps, variable substitution | Orchestrator (09) modo executor |
| `/swarm` | **AUTONOMIA TOTAL**: prompt → PR mergeable. Worktree isolado + Ralph loop (fresh context per story) + 4 agentes paralelos de review + self-fix CRITICAL/HIGH + auto PR. v2.0.0 | Todas as skills coordenadas |
| `/constitution` | Bootstrap/update de `memory/constitution.md` com princípios governantes (Code Quality, Testing, UX, Performance, Security) — autoridade hierárquica sobre PRD/plan/ADRs | PO (01) modo governance |
| `/checklist` | Gera checklist contextual por feature ("unit tests for English") — Completeness, Clarity, Consistency, Coverage, Edge Cases | PO (01) + validation |
| `/analyze` | Cross-artifact consistency check (read-only) — constituição → specs → plan → issues. Findings classificados CRITICAL/HIGH/MEDIUM/LOW | Reviewer (11) modo auditoria |

### `/loop` — Auto-Loop v2 (Multi-Agente Orquestrador)

`scripts/auto-loop/` é um orquestrador autônomo que entrega tasks **prontas, funcionais, bonitas e testadas**. Roda de noite, acorda com PR pronto pra merge.

```bash
# Uso básico (single run, agente claude)
node scripts/auto-loop "sua task aqui"

# Escolher agente
node scripts/auto-loop "task" --agent codex
node scripts/auto-loop "task" --agent claude

# Worktree isolado + paralelo (3 tasks em 3 worktrees)
node scripts/auto-loop --worktree --parallel 3 -- "task A" -- "task B" -- "task C"

# Polishing pass configurável (default: standard)
node scripts/auto-loop "task" --polish=full

# Controle fino
node scripts/auto-loop "task" --max-tokens 200000 --stop-when "tests cover the new endpoint"
```

**Recursos v2:**

| Recurso | Detalhe |
|---------|---------|
| Multi-agente | adapters para `claude --print` e `codex exec`, interface comum, troca via `--agent` |
| Worktree integrado | cria `<repo>-auto-worktrees/<slug>/` em branch `auto/<slug>`, preserva se commitado |
| Modo paralelo | `--worktree --parallel N` roda N runners isolados, agrega logs por run-id |
| Polishing pass | `--polish=none\|light\|standard\|full` — `simplify` + `review` (+ `security-review` + `test` no `full`) antes do commit |
| Prevent-sleep cross-OS | macOS `caffeinate`, Linux `systemd-inhibit`, Windows `SetThreadExecutionState` |
| JSONL debug log | `.auto/runs/<run-id>/debug.jsonl` com `error.cause` chain completo |
| Backoff classificado | `permanent` aborta, `retryable` exponencial (60s→600s, 5x), `agent-reported` retry imediato |
| Graceful interrupt | 1× Ctrl+C = termina iteração e sai limpo, 2× = SIGKILL com rollback |
| Resume robusto | `session.json` com prompt/model/agent/branch — rerun pergunta update/new branch/quit |
| Token cap | `--max-tokens N` aborta mid-run com commit limpo se válido |
| Stop-when | `--stop-when "<condição>"` — agente reporta `STOP_WHEN_MET: true|false` por iter |

**Circuit breaker:** mesmo erro 3x, stall (3 iter sem `git diff`), budget estourado, ou task bloqueada — para automaticamente.

**Exit codes:** `0` ok / `1` uso / `2` erro permanente / `3` retry esgotado / `4` breaker tripped / `5` stall / `6` token cap / `7` polish incompleto / `130` interrompido / `99` fatal.

**Pronto para produção:**
- 21 smoke tests em `scripts/tests/auto-loop/`, todos verdes. Rodar: `node scripts/tests/auto-loop/run-all.mjs`.
- Cross-platform (macOS, Linux, **Windows**) — adapters usam shell no Windows para resolver launchers `.cmd` instalados via `npm`.
- Cada run grava `.auto/runs/<runId>/status.json` com `{iterations, commits, exitCode, worktreePath, ...}` para o parent paralelo e ferramentas externas consumirem.
- Smoke real-LLM opt-in: `node scripts/tests/auto-loop/smoke-real.mjs` (manual, custa tokens).

**O que mudou de 2026-04-30 → 2026-05-01:**
- Release v2 inicial em 30/04: multi-agente (claude + codex), worktree integrado, modo paralelo, polishing pass, flags inspiradas no gnhf (`--max-tokens`, `--stop-when`, prevent-sleep, JSONL log, backoff classificado, Ctrl+C 2-estágios, resume robusto), docs bilíngues.
- Gap fixes em 01/05: teste E2E do codex com shim fake (zero tokens), verificação de skill paths do polish + teste de retry, teste de integração runner+worktree, `status.json` consumido pelo summary do paralelo (antes mostrava `-`), fixes de portabilidade Windows (`gitDiffSinceBaseline` não usa mais sintaxe POSIX-only; adapters resolvem launchers `.cmd`/`.bat`).
- Testes: 17 → 21, todos passando. Comandos e exit codes inalterados.

---

## Governanca Global

- `GLOBAL.md` é a camada mais alta de instrução
- `policies/` padroniza execução, risco, persistência, qualidade e avaliação
- `templates/` reduz variação de handoff, plano, review e rejeição
- `policies/tool-safety.md` — uso seguro de escrita, rede, MCP e ações externas
- `policies/model-routing.md` — tiers de modelo, enforcement e integração com cost-tracker
- `policies/evals.md` — evidência mínima para mudanças estruturais no kit
- `policies/search-first.md` — pesquisa obrigatória antes de implementar (feature, bugfix, integração, refactor)
- `policies/iterative-retrieval.md` — retrieval progressivo em 3 rounds para subagents e skills delegadas
- `policies/anti-rationalization.md` — tabelas de racionalizações comuns + rebuttals por skill crítica
- `policies/source-driven.md` — hierarquia de fontes obrigatória para decisões de framework/lib
- `policies/confusion-management.md` — protocolo STOP-NAME-OPTIONS-WAIT para confusão detectada
- `policies/context-engineering.md` — hierarquia de contexto em 5 níveis e 3 trust levels

### Hierarquia de Instrucoes

1. `GLOBAL.md`
2. `policies/*.md`
3. `skills/*/SKILL.md`
4. `templates/*.md`

---

## Estrutura Real Deste Repo

```text
.
├── .claude/              ← slash commands (/spec, /plan, /build, /test, /review, /simplify, /ship, /pipeline, /best, /auto, /loop)
│   └── commands/
├── .claude-plugin/       ← manifesto do plugin Claude Code
│   └── plugin.json
├── .github/              ← CI workflows (validate-plugin, validate)
│   └── workflows/
├── AGENTS.md
├── CLAUDE.md
├── GLOBAL.md
├── README.md
├── commands/             ← slash commands (/audit-repo, /devkit-install-fv, ...)
├── docs/
│   ├── quickstart.md
│   ├── repo-audit/
│   ├── skill-guides/
│   └── skill-call-matrix.md
├── evals/
├── hooks/                ← lifecycle hooks para Claude Code
│   ├── hooks.json
│   ├── config.json
│   └── scripts/
├── mcp-server/           ← MCP server com 37 tools
├── patterns/ai-integration/
├── personas/             ← agent personas (code-reviewer, security-auditor, test-engineer)
├── policies/             ← model-routing, tool-safety, cost-optimization, evals
├── scripts/              ← generate-image.py e utilitários
├── setup/                ← install.sh multi-plataforma
├── skills/               ← 37 specialists (*/SKILL.md)
├── src/                  ← hooks, stores, components e middleware reutilizáveis
└── templates/            ← handoff, plano, review, rejeição
```

---

## Estrutura Instalada no Repo Consumidor

Quando instalado via `/devkit-install-fv` ou `setup/install.sh`:

```text
repo-consumidor/
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── .claude/settings.json         ← hooks + MCP registrados
├── .claude/commands/             ← slash commands (/spec, /plan, /build, /loop, ...)
├── .claude/agents/               ← subagents despacháveis via Task tool
├── .github/copilot-instructions.md
├── .windsurf/rules/dev-team-kit.md
├── .windsurf/mcp.json
├── .gemini/settings.json
└── .bot/
    ├── GLOBAL.md
    ├── commands/                 ← comandos operacionais (/audit-repo, /devkit-install-fv, ...)
    ├── docs/                     ← skill-guides, repo-audit, quickstart
    ├── evals/
    ├── hooks/                    ← lifecycle hooks
    ├── learned-skills/           ← conhecimento acumulado do projeto (score 0-1, decay semanal, auto-arquivado em .archive/ abaixo de 0.3)
    ├── mcp-server/               ← compilado e pronto
    ├── patterns/ai-integration/
    ├── personas/                 ← code-reviewer, security-auditor, test-engineer
    ├── policies/
    ├── scripts/
    ├── setup/
    ├── skills/
    └── templates/
```

O repo consumidor também recebe `.claude/commands/` (10 slash commands) na raiz, instalado pelo `setup/install.sh`.


---

## Validacao Rapida

```bash
pytest scripts/tests -q
node scripts/check-consistency.mjs
cd mcp-server && npm run build
bash scripts/smoke-install.sh
```

---

## Contribuindo

Quer adicionar uma skill, corrigir um bug ou propor uma melhoria? Veja o guia completo em **[CONTRIBUTING.pt-BR.md](./CONTRIBUTING.pt-BR.md)**.

**Resumo rápido:**
1. Crie a skill em `skills/NN-nome/SKILL.md` e registre no `plugin.json`
2. Para slash commands, adicione em `.claude/commands/` e registre no `plugin.json`
3. Rode `node scripts/check-consistency.mjs` antes de commitar
4. Abra um PR com entry no `CHANGELOG.md`

---

## Changelog

Histórico completo em **[CHANGELOG.md](./CHANGELOG.md)**.

| Versão | Data | Destaques |
|---|---|---|
| **v2.43.0** | 2026-08-06 | `/catalog-project` agora sintetiza `product` (resumo/planos/FAQ), `sessions` (a partir de `docs/context/session-*.md`) e `operations` (envs, endereços, métricas) no manifesto — alimenta o app companheiro `project-brain`, catálogo cross-repo. Confere `git remote -v` antes de gravar valor real de secret e avisa se o repo tem remote configurado |
| **v2.1.0** | 2026-05-20 | **Smart routing**: hook intent-classifier v2 (regex expandido + LLM Haiku opcional), 9 patterns novos (bug/issue/refactor/test/spike/etc), telemetry em .swarm/classifier.jsonl. Novo program `refactor-safely` com baseline tests + behavior preservation. `docs/USE-CASES.md` mapeia 17 cenarios |
| **v2.0.0** | 2026-05-20 | **MAJOR: modo `/swarm`** — autonomia total: prompt → PR mergeable. Worktree isolado + Ralph loop (fresh context per story) + 4 agentes paralelos de review + self-fix CRITICAL/HIGH + auto PR. Em modo Autonomous, intent-classifier roteia prompts de feature pra /swarm. Inspirado em Ralph/fix-issue/comprehensive-review do coleam00/archon |
| **v1.9.0** | 2026-05-20 | **Active mode agora é default**. Hook auto-roda `--dry-run` mostrando plano, gates dentro do program ainda pausam. Tutorial de setup do Nível 3 (Autonomous) adicionado ao README com checklist de segurança |
| **v1.8.0** | 2026-05-20 | **Auto-orchestration** — hook `intent-classifier` sugere program adequado baseado em intent do prompt (sem usuário invocar slash); skill 39 nova (program-router); 4 níveis de autonomia configuráveis |
| **v1.7.0** | 2026-05-20 | **Program Engine v2** — 6 primitives novos (`prompt`/`bash`/`loop`/`context: fresh`/`provider+model`/`trigger_rule`) + 2 programs avançados (`adversarial-dev` GAN-inspired, `comprehensive-review` 5-agent paralelo). Absorvido de [coleam00/archon](https://github.com/coleam00/archon) |
| **v1.6.0** | 2026-05-18 | Pipelines YAML executáveis: comando `/run-program` + 4 programs (`pipeline-discovery`, `spec-driven-development`, `loop-polishing`, `detective-spec`); schema com gates/parallel/conditional/vars; scripts validator + planner. Adaptado de [github/spec-kit workflows/](https://github.com/github/spec-kit/tree/main/workflows) com extensões |
| **v1.5.2** | 2026-05-16 | Layout do plugin pra autodiscovery do Claude Code 2.x: `.claude/commands/` → `commands/`, `.claude/agents/` → `agents/`, hooks/hooks.json convertido, `.mcp.json` adicionado |
| **v1.5.1** | 2026-05-15 | Gaps de docs do v1.5.0: tabela de versões, Acknowledgements (5 fontes novas), checklist de policy no CONTRIBUTING |
| **v1.5.0** | 2026-05-15 | Absorve 6 padrões de skills externas no kit: MCP builder patterns, verification-before-completion, receiving-code-review, memory consolidation; comando `/consolidate-memory`; skill 18 modo `--recommend-automation`; skill 28 modo `audit` |
| **v1.4.2** | 2026-05-15 | Gaps do humanize: evals para `/humanize`, assert no consistency check, gate de prosa no quality-gates, nota no skill-author |
| **v1.4.1** | 2026-05-15 | Comando `/humanize` + `policies/anti-ai-writing.md` (29 padrões) + hook opt-in; gates nas skills 10/13/14. De [blader/humanizer](https://github.com/blader/humanizer) |
| **v1.4.0** | 2026-05-15 | Release hygiene: docs alinhados, Acknowledgements, quality-gates, hook constitution-watcher, evals migrados, tags + releases |
| **v1.3.x** | 2026-05-15 | **Spec-driven development**: `/constitution` (princípios governantes, 5 eixos), `/checklist` (unit tests for English), `/analyze` (cross-artifact consistency); 4 skills críticas consultam constituição; pipeline canônico em handoffs.md; `programs/spec-driven-development.md`; patterns de inference-time-compute do optillm |
| **v1.2.x** | 2026-05-13 | Validação de PRD com 13 checks (desacoplado de Taskmaster); padrões de agent prompting (layering A→B→C, template agent-spec, policy no-drift); modelo 4-tier de memória; token budget no hook SessionStart |
| **v1.1.0** | 2026-05-09 | Adoção Context Engineering: protocol shells (Pareto-lang), schemas I/O de skills, scoring de iteração, camada programs/, 3 subagents piloto migrados |
| **v1.0.0** | 2026-04-30 | Auto-loop v2: multi-agente (claude + codex), worktrees paralelos, polishing pass, circuit breaker, 21 smoke tests |

---

## `/swarm` — Autonomia Total (v2.0.0+)

O **único comando que vai do prompt ao PR mergeable sem intervenção humana.**

```
/swarm "implementar auth social com Google + GitHub"
```

O kit:
1. Cria worktree git isolado
2. Gera PRD + quebra em stories
3. **Ralph loop:** implementa cada story com contexto fresco (zero contaminação)
4. **4 agentes paralelos de review:** code + security + tests + anti-AI-writing
5. **Synthesize** findings com decision matrix de severity
6. **Auto-fix** CRITICAL/HIGH automaticamente
7. **Cria PR** com synthesis no comment, rebased em main

Você volta pra um PR pronto pra review.

### Quando usar vs outros comandos

| Command | Worktree | Fresh ctx per story | Multi-agent review | Self-fix | Auto-PR | Use case |
|---|:-:|:-:|:-:|:-:|:-:|---|
| `/auto` | opcional | ❌ | ❌ | ❌ | ❌ | Task pequena |
| `/loop` | opcional | ❌ | ❌ | ❌ | ❌ | Task média |
| `/run-program X` | depende | ❌ | depende | ❌ | ❌ | Pipeline declarativo |
| **`/swarm`** | **sempre** | **✅** | **✅** | **✅** | **✅** | **Autonomia total: prompt → PR** |

### Inputs

```bash
/swarm "implementar feature X"          # texto livre
/swarm fix #142                          # issue GitHub
/swarm --prd docs/prd/auth.md            # PRD existente
/swarm --resume <run-id>                 # retoma run que parou
```

### Autonomous + /swarm = manda e esquece

Em `~/.claude/dev-team-kit-config.json` setar `intent_classifier.autonomous: true`:
- Hook detecta intent de feature → auto-sugere `/swarm`
- Claude auto-executa (gates não pausam)
- Você volta pra um PR pronto

### Cleanup

Worktree NUNCA é deletado automático. Após PR mergeado:
```bash
git worktree remove .swarm/<run-id>/workspace
rm -rf .swarm/<run-id>
```

Protocolo completo: [`policies/swarm-protocol.md`](policies/swarm-protocol.md).

---

## Auto-Orchestration (v1.8.0+)

O kit detecta intent do seu prompt e **sugere o program apropriado automaticamente** — você não precisa lembrar de invocar `/run-program` manualmente.

```
Você diz: "preciso adicionar autenticação social no app"
   ↓
[hook intent-classifier]
   → detecta padrão de feature → emite: /run-program spec-driven-development
   ↓
[Claude] invoca skill 39 (program-router)
   → pergunta via AskUserQuestion: dry-run / direto / ad-hoc / cancelar
   ↓
Você escolhe → program executa com gates humanos onde definido
```

### 4 níveis de autonomia

| Nível | Comportamento | Quando usar |
|---|---|---|
| **0 — Manual** | Hook desabilitado. Você invoca `/run-program <nome>` manualmente. | Controle total, exploração |
| **1 — Passive** | Hook sugere. Claude mostra e espera. Nada auto-executa. | Quer só sugestão, decide tudo manualmente |
| **2 — Active (DEFAULT desde v1.9.0)** | Hook sugere + Claude auto-roda `--dry-run` (mostra plano). **Gates humanos no program ainda pausam.** | Default: menos fricção, segurança preservada via gates |
| **3 — Autonomous** | Hook sugere + Claude auto-roda com `--auto-yes` (gates auto-aprovam). | **CI / cron only.** Risco alto se program tem `bash:` destrutivo. |

**Active vs Autonomous — diferença chave:**
- **Active** = "mostre o plano automaticamente, mas pause nos gates pra eu aprovar durante a execução"
- **Autonomous** = "execute tudo sem me perguntar nada"

A diferença real é se **gates humanos durante a execução continuam ativos**.

### Configure seu nível

```jsonc
// hook config (via /update-config ou settings.json)
{
  "intent_classifier": {
    "enabled": true,         // false = Nível 0 (manual)
    "auto_dry_run": true,    // DEFAULT v1.9.0+ — Nível 2 Active
    "autonomous": false,     // true = Nível 3 (autonomous, só CI)
    "suppress": []           // ids de programs para nunca sugerir
  }
}
```

Edite `~/.claude/settings.json` (Windows: `C:\Users\<user>\.claude\settings.json`), salve, e **restarte o Claude Code**.

### Configurar Nível 3 (Autonomous) — só sua máquina (user-wide)

⚠ **Zero confirmações humanas.** Use só em contextos não-interativos (CI, scheduled tasks).
**Recomendado:** coloque isso no user-wide config para o default do repo continuar Active (mais seguro). Arquivo: `~/.claude/dev-team-kit-config.json`


```jsonc
{
  "intent_classifier": {
    "enabled": true,
    "autonomous": true,
    "suppress": [
      "adversarial-dev",       // tem bash que mexe em $ARTIFACTS_DIR/app
      "comprehensive-review"   // postaria em PR sem revisão humana
    ]
  }
}
```

**Checklist pré-voo antes de ativar Autonomous:**
- [ ] Backup do repo / working tree limpa
- [ ] Programs perigosos no `suppress`
- [ ] CI/cron tem timeout (ex: máx 30min)
- [ ] Logs persistentes em `.run-program/*.log.json` acessíveis pra debug pós-mortem
- [ ] `git push --force` proibido (ver `policies/tool-safety.md`)
- [ ] Notification webhook em caso de falha

### Configurar Nível 0 (Manual) — desabilitar completamente

```jsonc
{
  "intent_classifier": {
    "enabled": false
  }
}
```

### Override temporário via env var

```bash
# bash/zsh — uma sessão só
export DEVKIT_INTENT_CLASSIFIER_AUTONOMOUS=true
claude

# powershell
$env:DEVKIT_INTENT_CLASSIFIER_AUTONOMOUS="true"; claude
```

Referência completa: [`policies/auto-orchestration.md`](policies/auto-orchestration.md).

### 6 intent patterns detectados

| Seu prompt menciona... | Program sugerido |
|---|---|
| "criar feature", "spec-driven", "constitution" | `spec-driven-development` |
| "ideia vaga", "discovery", "preciso de PRD" | `pipeline-discovery` |
| "review crítico", "5-agent", "comprehensive review" | `comprehensive-review` |
| "from scratch", "greenfield", "do zero" | `adversarial-dev` |
| "legacy", "legado", "reverse engineering" | `detective-spec` |
| "auto-loop", "autônomo", "fire and forget" | `loop-polishing` |

Skip automático: prompts informacionais ("o que é..."), triviais ("fix typo"), ou já começando com `/`.

---

## Acknowledgements

Este kit é resultado de olhar muita prior art e reimplementar as ideias que fazem sentido no nosso modelo de skill kit. Nada aqui é código copiado — cada item abaixo foi reimaginado como policy, skill ou script zero-dep nas convenções do kit. Os links apontam para os projetos upstream que serviram de inspiração para cada direção.

A atribuição completa (licença + escopo) está em [`NOTICE`](./NOTICE), preservada conforme Apache-2.0 §4(d).

| Projeto | Feature neste kit | Versão |
|---|---|---|
| [github/spec-kit](https://github.com/github/spec-kit) | Inspirou os comandos `/constitution`, `/analyze`, `/checklist` e o workflow spec-driven | v1.3.0+ |
| [anombyte93/prd-taskmaster](https://github.com/anombyte93/prd-taskmaster) | Inspirou a taxonomia de validação de PRD com 13 checks | v1.2.1 |
| [algorithmicsuperintelligence/optillm](https://github.com/algorithmicsuperintelligence/optillm) | Inspirou a doc de inference-time compute (MoA, Self-Consistency, BoN, PlanSearch, SPL, RTO) | v1.3.0 |
| [mattpocock/skills](https://github.com/mattpocock/skills) | Inspirou os comandos `/grill-me`, `/to-prd`, `/to-issues` | v1.4.0+ |
| [davidkimai/Context-Engineering](https://github.com/davidkimai/Context-Engineering) | Inspirou protocol shells (Pareto-lang), taxonomia atom→field e a camada de programs | v1.1.0 |
| [rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) | Inspirou o modelo de consolidação de memória 4-tier e o filtro de privacy | v1.2.0 |
| [ClickUp Agent Prompting Guide](https://clickup.com/blog/agent-prompting-guide/) | Inspirou o framework dos Five Building Blocks e o layering A→B→C | v1.2.0 |
| [sandeco/reversa](https://github.com/sandeco/reversa) | Inspirou o pipeline Detective Spec (skill 33) | v1.6.0 |
| [aihero.dev](https://www.aihero.dev/5-agent-skills-i-use-every-day) | Inspirou o formato de documentação usado em WIKI / SKILLS-OVERVIEW | v1.5.0 |
| Anthropic Skills (`anthropic-skills:*`) | Inspiraram `policies/mcp-builder-patterns.md`, `policies/memory-consolidation.md`, `/consolidate-memory` | v1.5.0 |
| Superpowers (`superpowers:*`) | Inspiraram `policies/verification-before-completion.md`, `policies/receiving-code-review.md` e o framing de paralelização | v1.5.0 |
| Claude Code Setup | Inspirou o modo `--recommend-automation` na skill Repo Auditor | v1.5.0 |
| Claude MD Management | Inspirou o modo `audit` na skill CLAUDE.md generator | v1.5.0 |
| [blader/humanizer](https://github.com/blader/humanizer) + [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing) | Inspiraram os 29 padrões anti-AI writing e o comando `/humanize` | v1.4.1, v2.12 |
| [coleam00/archon](https://github.com/coleam00/archon) | Inspirou os primitives do program engine + os patterns `adversarial-dev` e `comprehensive-review` | v1.7.0 |
| [claudioemmanuel/squeez](https://github.com/claudioemmanuel/squeez) | Inspirou a abordagem de cross-call output dedup (MinHash + Jaccard) e a metodologia de benchmark público | v2.9.0 |
| [bytedance/deer-flow](https://github.com/bytedance/deer-flow) | Inspirou três convenções: observability trace tags, skill manifest frontmatter v2 e o framing de progressive skill loading | v2.10.0 |
| [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) | Inspirou o pilar "Goal-Driven Execution" (o 4º princípio que faltava no set de policies) | v2.10.2 |
| [anthropics/skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Inspirou o framework de aesthetic anchors e a regra "ban generic fonts" da skill UI/UX | v2.12.0 |
| [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) | Inspirou a seção GEO/AEO da skill SEO (Generative/Answer Engine Optimization) | v2.12.0 |
| [garrytan/gstack](https://github.com/garrytan/gstack) | Inspirou a skill `/canary` (3 estratégias, 7 métricas, rollback automático) | v2.12.0 |
| [obra/superpowers](https://github.com/obra/superpowers) | Inspirou o framing "Iron Law" e a tabela de rationalization prevention | v2.12.0 |
| [anthropics/financial-services](https://github.com/anthropics/financial-services) | Inspirou o pattern arquitetural de vertical-plugin (documentado para adoção futura) | v2.12.0 |
| [openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc) | Inspirou o guia de integração Codex (não reimplementamos — usuários instalam o plugin direto) | v2.12.0 |
| [alirezarezvani/claude-skills](https://github.com/alirezarezvani/claude-skills) | Inspirou o programmatic skill quality scoring e o formato de trigger eval | v2.12.0 |
| [Tencent/TencentDB-Agent-Memory](https://github.com/Tencent/TencentDB-Agent-Memory) | Inspirou as policies `symbolic-memory` (Mermaid canvas + node_id drill-down) e `memory-pyramid` (L0→L3) | v2.14.0 |

Toda inspiração acima é em nível de **ideia**. Não empacotamos código desses projetos; nossas implementações são independentes e alinhadas às convenções do kit (zero runtime deps, markdown-first). Quando a abordagem de um projeto não se encaixava (LangGraph runtime, servidores proxy, CLIs Python, etc.), registramos isso em [`NOTICE`](./NOTICE).

---

> 🌎 [Read this in English](README.md)
