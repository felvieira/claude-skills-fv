# Dev Team Kit — O que é, o que faz, e 30 cenários do dia-a-dia em que ele salva sua pele

> Material de marketing/conteúdo para postar 1 cenário por dia.
> Cada cenário mostra **a dor real de quem usa IA pra codar**, o que acontece **sem o kit** (IA solta, sem definições), e o que muda **com o kit**.

---

## Parte 1 — O que o Dev Team Kit é

**Em uma linha:** um time inteiro de devs sênior dentro do seu agente de IA.

**Em três:**
- 39 especialistas (PO, designer, backend, frontend, QA, security, SRE, copywriter, SEO, release manager, etc.) embarcados como skills numeradas;
- 14 subagents despacháveis em paralelo (code-reviewer, security-auditor, debugger, detective-contracts, semgrep-scanner, etc.);
- 37 ferramentas MCP + 9 hooks de ciclo de vida + 25+ slash commands + 6 pipelines YAML executáveis + memória persistente entre sessões.

**Em uma frase pra investidor:** transforma qualquer agente de coding (Claude Code, Cursor, Windsurf, Copilot, Gemini CLI) em uma fábrica de software com pipeline estruturado, gates de qualidade e roteamento automático de modelo — sem vendor lock-in, MIT, grátis.

---

## Parte 2 — Tudo que ele faz (catálogo cru, pra ninguém duvidar do escopo)

### Os 39 especialistas
**Gestão e coordenação (16):** Context Manager (08), Orchestrator (09), Documenter (10), Reviewer (11), Image Generator (17), Repo Auditor (18), Asset Librarian (19), Observability/SRE (20), Data Analytics (21), Accessibility (22), Migration & Refactor (23), Release Manager (24), AI Integration Architect (25), Prompt Engineer (26), Video Integration (27), CLAUDE.md Generator (28), Cost Tracker (30), Session Summary (31), Smart Suggestions (32), Detective Spec (33), Skill Author (35), Architecture Deepener (38).
**Produto e design (4):** PO (01), UI/UX Designer (02), Design Intelligence (29), Web Asset Generator (36).
**Desenvolvimento (4):** Backend Engineer (03), Frontend Engineer (04), Motion Designer (12), Mobile/Tauri (15).
**Conteúdo e descoberta (2):** Marketing Copy (13), SEO Specialist (14).
**Qualidade e entrega (5):** QA Engineer (05), Security Reviewer (06), Static Analysis (34), TDD Engineer (37), Deploy Engineer (07).
**Meta-skills (3):** Skill Author (35), Parallel Dispatcher (40), Program Router (39).

### Os comandos (slash) que você usa direto
`/spec` — especifica feature com critérios de aceitação.
`/plan` — classifica task e monta pipeline mínimo.
`/build` — implementa com stack do projeto.
`/test` — escreve e roda testes.
`/review` — review final + security audit.
`/simplify` — simplifica e refatora.
`/ship` — release e deploy.
`/pipeline` — pipeline completo end-to-end.
`/best` — auditoria boas práticas + DRY + clean code.
`/auto` — agente autônomo, prompt-based.
`/loop` — loop multi-agente (claude+codex), worktree paralelo, polishing pass.
`/swarm` — autonomia total: prompt → PR mergeable. Worktree isolado + Ralph loop (fresh context per story) + 4 reviewers paralelos + self-fix CRITICAL/HIGH + auto PR.
`/worktree` — git worktree isolado, copia .env, valida ambiente.
`/detective-spec` — engenharia reversa de specs em legado, sem tocar no código.
`/grill-me` — interroga seu plano até atingir entendimento.
`/to-prd` — converte conversa em PRD com label `needs-triage`.
`/to-issues` — quebra PRD em N issues independentes (vertical slices).
`/pipeline-discovery` — discovery completo: grill-me → to-prd → to-issues → loop+TDD → ship.
`/constitution` — bootstrap de princípios governantes (Code Quality, Testing, UX, Performance, Security).
`/checklist` — checklist contextual por feature.
`/analyze` — cross-artifact consistency check (constituição → spec → plan → issues).
`/humanize` — remove 29 padrões de AI-generated writing de qualquer prosa.
`/consolidate-memory` — manutenção do vault de memória persistente.
`/savings` — mostra o que o kit economizou na sessão (tokens, USD, riscos prevenidos).
`/drift-scan` — scan contínuo de drift no codebase (dead-code, large-files, stale-todos, dep-staleness, doc-code drift, coverage).
`/run-program` — executa pipeline YAML declarativo (spec-driven, refactor-safely, adversarial-dev, comprehensive-review, detective-spec, loop-polishing).

### Os 9 hooks que rodam sem você pedir
**pre-execution-gate** — detecta prompt vago e confirma antes de agir.
**keyword-detector** — injeta skill relevante automaticamente baseado em palavras-chave.
**context-guard-stop** — alerta em 50% do contexto, bloqueia em 75% com resumo inteligente.
**persistent-mode** — bloqueia stop enquanto um pipeline está ativo.
**pre-tool-enforcer** — relê arquivo antes de editar (anti context decay).
**session-start** — restaura estado da sessão anterior.
**post-tool-verifier** — detecta padrão de debugging e sugere extrair learned skill.
**model-routing-hook** — sugere troca de modelo (Opus pra plan, Sonnet pra ExitPlanMode), valida subagent sem `model` explícito.
**intent-classifier** — detecta intenção do prompt e auto-roteia pro program apropriado (configurável em 4 níveis: manual / passivo / ativo / autônomo).

### Os 4 níveis de autonomia
**Nível 0 — Manual:** você invoca tudo na unha.
**Nível 1 — Passivo:** kit sugere program, espera você confirmar.
**Nível 2 — Ativo (padrão desde v1.9.0):** kit auto-roda `--dry-run`, gates dentro do program ainda pausam.
**Nível 3 — Autonomo:** zero confirmações, gates auto-aprovados. CI/cron only.

### O que tem rodando automático no background
- **Memória persistente** por projeto (`learned-skills/`, score 0-1, decaimento semanal, auto-archive abaixo de 0.3);
- **Compressão de output verboso** (npm install, stack traces, file lists) antes de mandar pro modelo — até 70% de economia em tokens;
- **Model routing automático**: Haiku pra boilerplate, Sonnet pra implementação, Opus pra arquitetura;
- **Circuit breaker** do auto-loop: mesmo erro 3x, stall (3 iterações sem `git diff`), budget esgotado, task bloqueada → para;
- **Anti-AI-writing**: detecta 29 padrões de prosa robotizada (em-dashes em rajada, "elevate your...", "delve into", "comprehensive", etc.) em docs/copy/PRDs;
- **Self-correcting sensors** (v2.7+): sinaliza quando seguir uma regra do kit causou problema, abre rota de revisão.

---

## Parte 3 — 30 cenários do dia-a-dia
### Formato de cada cenário
> **A dor.** O que o usuário tenta.
> **Sem o kit (IA solta).** O que acontece. Por que fica capenga.
> **Com o Dev Team Kit.** O que muda. Por que fica decente.

---

### Cenário 1 — "Implementa login social"
**A dor.** Você pede pro Claude "implementa login com Google e GitHub no meu app".
**Sem o kit.** A IA assume um stack (provavelmente NextAuth, mesmo se você não usa Next), inventa um schema de user que conflita com o seu, esquece de validar CSRF, escreve 1 teste happy-path, e termina com "Done! Let me know if you have questions". Você descobre na produção que o callback URL tá hardcoded em `localhost:3000`.
**Com o kit.** Hook detecta intent de feature → roteia pro `/swarm`. Repo Auditor lê o stack real, PO (01) escreve spec com critérios de aceitação, AI Integration Architect (25) define adapter de OAuth, Backend (03) implementa, Security (06) revisa CSRF/PKCE/scope leak, QA (05) cobre happy + falha de callback + token expirado. Volta um PR mergeable.

---

### Cenário 2 — "Tem um bug que crasha o login quando o user não tem email"
**A dor.** Issue chega, você cola pro Claude e pede "arruma isso aí".
**Sem o kit.** IA adiciona um `if (!user.email) return null` na primeira função que ela vê. Bug some na superfície, volta dois dias depois em outro fluxo. Nenhum teste de regressão. Nenhuma investigação de **por que** o user chegou sem email.
**Com o kit.** Categoria C (direto). Hook roteia pra `/auto` + subagent `debugger`. Debugger segue Evidence Ledger: hipótese → busca evidência → confirma causa raiz. Descobre que veio de OAuth da Apple (que mascara email). Fix vai na origem (validação no callback) + teste de regressão + nota no ADR.

---

### Cenário 3 — "Refatora o `src/auth/` que tá um monstro"
**A dor.** Pasta com 2.000 linhas, lógica espalhada, ninguém mexe com medo.
**Sem o kit.** Claude pega entusiasmo, reescreve metade do módulo, quebra 3 fluxos que não tinham teste, "esquece" do edge case do refresh token, e te entrega um diff de 1.500 linhas sem rationale.
**Com o kit.** `/run-program refactor-safely`. Pipeline com baseline tests (captura comportamento atual) → analyze read-only → plano atômico de extração → execute com type-check hook → verify behavior preservation → PR. Skill 38 (Architecture Deepener) identifica deep modules; skill 23 (Migration & Refactor) executa com feature flags + rollback.

---

### Cenário 4 — "Documenta esse legado que herdei, não tem nada"
**A dor.** 80k linhas, zero docs, dev original saiu da empresa.
**Sem o kit.** IA gera um README genérico tipo "This project is a Node.js application that uses Express." Inútil.
**Com o kit.** `/detective-spec`. Pipeline read-only de 5 fases: recon → contratos de módulo (detective-contracts) → regras de negócio escondidas (detective-business-rules) → fluxos end-to-end (detective-flows) → ADRs retroativos (detective-adrs). Saída em `_detective_sdd/` com specs executáveis, sem alterar uma linha do código.

---

### Cenário 5 — "Cria CI/CD com GitHub Actions"
**A dor.** Você quer test + lint + build + deploy.
**Sem o kit.** IA copia um workflow do StackOverflow, com Node 16 (deprecated), sem cache, sem matriz, sem proteção em main.
**Com o kit.** Skills 07 (Deploy) + 20 (Observability) coordenadas pelo Orchestrator. Workflow com cache, matriz de versões reais do seu `package.json`, deploy gradual blue-green, rollback automático, observabilidade (logs estruturados, metrics, alertas). Sai com `policies/tool-safety.md` aplicada — sem `git push --force` em main, sem skip-hooks.

---

### Cenário 6 — "Quero hero image + favicon + OG cards pra landing"
**A dor.** Designer sumiu, lançamento é amanhã.
**Sem o kit.** IA sugere "use Unsplash" e te deixa procurando 40 minutos numa imagem que não combina com a marca.
**Com o kit.** Skill 17 (Image Generator) usa fal.ai com prompt escrito pelo Prompt Engineer (26), routing por caso de uso (`gemini-25-flash` default, `gpt-image-1-mini` se for muita imagem barata, `gemini-3-pro` se for prompt difícil). Skill 36 (Web Asset Generator) gera favicons multi-size, PWA icons (incl. maskable), OG e Twitter cards, manifest. Tudo derivado da sua marca. Custo estimado antes de gerar.

---

### Cenário 7 — "Faz uma landing page que converta"
**A dor.** Copy genérico + design "estilo Notion 2021" + zero SEO = zero conversão.
**Sem o kit.** IA escreve "Welcome to the future of X. Elevate your Y with our comprehensive solution." Você morre por dentro.
**Com o kit.** Pipeline `Copy → Design Intelligence → UI/UX → Frontend → SEO → QA → Reviewer`. Design Intelligence (29) pesquisa concorrentes via Brave/Firecrawl, monta dossiê estratégico. Marketing Copy (13) escreve com voz da marca, CTAs testados, proposta de valor concreta. SEO (14) cuida de schema.org, OG, Core Web Vitals, sitemap. Hook `humanize` remove os 29 padrões de AI writing.

---

### Cenário 8 — "Adiciona testes nesse módulo sem cobertura"
**A dor.** Coverage de 12%, deploy travado pela política de qualidade.
**Sem o kit.** IA escreve 8 testes que **chamam a função e checam se retorna sem throw**. Coverage sobe pra 80%, qualidade real continua 12%.
**Com o kit.** Skill 05 (QA) opera no princípio **Prove-It**: se você diz que funciona, prova com teste. Cobre happy path, error path, edge cases, regressão, performance crítica. Skill 37 (TDD Engineer) combate horizontal slicing (escrever todos os testes antes de toda implementação) — força ciclo red-green-refactor real.

---

### Cenário 9 — "Investiga por que `/api/users` tá lento"
**A dor.** P95 saiu de 80ms pra 1.2s, ninguém sabe quando aconteceu.
**Sem o kit.** IA olha o código do endpoint, sugere "add caching", você aplica, problema persiste, ela sugere "use Redis", você instala Redis, problema persiste, ela sugere "consider sharding".
**Com o kit.** Subagent `debugger` + skill 20 (Observability). Evidence Ledger: levanta hipóteses (DB query, N+1, JSON serialize, middleware, deps externa), busca evidência em logs/traces/metrics, confirma causa antes de propor fix. Anti-rationalization table impede "isso provavelmente é cache".

---

### Cenário 10 — "Migra do React 17 pro 18"
**A dor.** Concurrent mode, Suspense, novos patterns, riscos de breaking change.
**Sem o kit.** IA atualiza `package.json`, roda `npm install`, "looks good!", commita. Você descobre na produção que o `StrictMode` quebrou metade dos `useEffect`.
**Com o kit.** `/run-program spec-driven-development` com ADR de migração. Skill 23 (Migration & Refactor) executa em incrementos com feature flags. Skill 33 (Detective Spec) mapeia o que existe antes de mexer. Cada incremento passa por QA + Security + Reviewer.

---

### Cenário 11 — "Escreve um PRD pra essa ideia vaga"
**A dor.** Você tem 2 parágrafos no Notion, precisa virar issue no GitHub.
**Sem o kit.** IA escreve um PRD genérico com 5 seções padrão e zero questões reais. "Goals, Non-goals, Success metrics, ..." vazio.
**Com o kit.** `/grill-me` faz interrogatório relentless (uma pergunta + resposta sugerida por turno) até convergir. `/to-prd` converte conversa em PRD validado por 13 checks. `/to-issues` quebra em N issues independentes (vertical slices) com label `needs-triage`.

---

### Cenário 12 — "Review meu PR antes de mostrar pro time"
**A dor.** Você sabe que vai levar pau no review humano.
**Sem o kit.** IA olha 2 arquivos, diz "looks good!", e você manda. Aí vem o senior dev e abre 23 comentários.
**Com o kit.** `/run-program comprehensive-review --input pr_number=87`. 5 subagents paralelos: code-reviewer + security-auditor + test-engineer + comments-checker + docs-checker. Synthesize com severity matrix (CRITICAL/HIGH/MEDIUM/LOW). Self-fix automático dos CRITICAL/HIGH antes de você mostrar pra outro humano.

---

### Cenário 13 — "Tô gastando uma fortuna em API"
**A dor.** Conta da Anthropic chegando em 4 dígitos por mês, você nem sabe pra quê.
**Sem o kit.** IA gasta Opus pra renomear variável, lê o repo inteiro a cada pergunta, repete o `npm install` log inteiro como contexto.
**Com o kit.** Model routing automático (Haiku → boilerplate, Sonnet → implementação, Opus → arquitetura). Hook `compressOutput` tira ANSI codes, dedup linhas adjacentes, colapsa listings de diretório, trunca repetições. Skill 30 (Cost Tracker) reporta por sessão, por skill, por modelo. `/savings` mostra economia da janela.

---

### Cenário 14 — "Spike rápido pra ver se dá pra integrar Stripe"
**A dor.** Você não quer toda a cerimônia, é descartável.
**Sem o kit.** IA escreve produção-ready, com testes, docs, error handling, retry com backoff exponencial. 4 horas depois você ainda tá numa POC.
**Com o kit.** `/auto --no-tdd` ou `/loop --polish=none`. Skip de QA + Security + Reviewer. Direto ao código mínimo. Termina em 20 minutos.

---

### Cenário 15 — "Implementa essa feature do issue #142"
**A dor.** Issue grande, contexto espalhado em comentários, label, milestone.
**Sem o kit.** Você copia o título da issue e cola no Claude. Ela perde 80% do contexto que tava nos comentários.
**Com o kit.** `/swarm fix #142`. Kit chama `gh issue view 142 --comments`, lê título + body + todos os comentários + labels. Implementa em worktree isolado. PR sai com `Closes #142` e referência aos comentários relevantes.

---

### Cenário 16 — "Configurar acessibilidade WCAG"
**A dor.** Auditoria do cliente exige WCAG 2.2 AA. Você não sabe nem por onde começar.
**Sem o kit.** IA adiciona `aria-label` em alguns botões aleatórios e diz "should be accessible now".
**Com o kit.** Skill 22 (Accessibility Specialist) revisa: WCAG 2.2, navegação por teclado, screen reader, contraste, semântica HTML, `prefers-reduced-motion`, formulários com label/error associado, ordem de foco, skip links. Sai com checklist auditável.

---

### Cenário 17 — "Tô há 3 dias debugando o mesmo erro"
**A dor.** Mesmo erro, mesma causa aparente, fix não cola.
**Sem o kit.** IA continua sugerindo a mesma fix com pequenas variações, você queima tokens.
**Com o kit.** Circuit breaker do auto-loop: mesmo erro 3x → para, avisa que está em loop. Post-tool-verifier sugere extrair learned skill ("você já viu esse padrão 3x essa semana, vamos virar skill"). Anti-rationalization policy força você a parar e revisar a hipótese.

---

### Cenário 18 — "Atualizar dependências antigas"
**A dor.** 47 deps com major version atrás, ninguém tem tempo.
**Sem o kit.** IA roda `npm update`, commita, manda. CVE-2024-XXXX entra no bundle.
**Com o kit.** `/drift-scan` reporta dep-staleness com CVE link, breaking changes do changelog, recomendação por dep. Skill 24 (Release Manager) coordena upgrades em ondas. Skill 34 (Static Analysis) roda Semgrep + CodeQL antes do merge.

---

### Cenário 19 — "Tô refazendo o mesmo trabalho toda sessão"
**A dor.** A cada nova janela do Claude você reexplica seu stack, suas convenções, seus padrões.
**Sem o kit.** A IA esquece tudo. Você gasta os primeiros 30 minutos de cada sessão recontextualizando.
**Com o kit.** Memória persistente em `learned-skills/` (score 0-1 por padrão, decaimento semanal). Hook `session-start` restaura. Skill 18 (Repo Auditor) gera `docs/repo-audit/current.md` reusável. Skill 28 gera `CLAUDE.md` inteligente. Skill 31 (Session Summary) consolida pra handoff entre sessões.

---

### Cenário 20 — "IA reescreveu um arquivo que eu não pedi"
**A dor.** Você pediu fix de bug. Ela reescreveu 4 arquivos relacionados "por consistência".
**Sem o kit.** Diff de 800 linhas, você não consegue revisar, aceita e reza.
**Com o kit.** Policy `vertical-slices.md` + hook `pre-tool-enforcer` reforça mudança mínima. `policies/execution.md` exige menor mudança capaz de resolver a causa. Reviewer (11) rejeita scope creep no review final.

---

### Cenário 21 — "Tô com prompt vago e a IA chuta"
**A dor.** Você digitou "faz aquilo lá que a gente viu ontem".
**Sem o kit.** IA inventa um "aquilo lá", implementa errado, você só percebe quando o teste falha (se tiver teste).
**Com o kit.** Hook `pre-execution-gate` detecta prompt vago, confirma intent antes de agir. Skill 32 (Smart Suggestions) sugere próxima ação baseada em estado real do projeto.

---

### Cenário 22 — "Tem rotina semanal de manutenção pra rodar"
**A dor.** Toda quarta você esquece de rodar security scan, update de deps, review de PRs abertos.
**Sem o kit.** Você esquece. Sempre.
**Com o kit.** `/schedule weekly comprehensive-review` agenda. `/loop` roda autônomo. `/drift-scan` continuous. Logs em `.run-program/*.log.json`.

---

### Cenário 23 — "PRD que escrevi tem inconsistência com spec antiga"
**A dor.** Você só descobre na implementação, gastou 2 dias programando contra spec errada.
**Sem o kit.** IA nem sabe que a spec antiga existe.
**Com o kit.** `/analyze` faz cross-artifact consistency check (read-only) entre `constitution → spec → plan → issues`. Findings classificados CRITICAL/HIGH/MEDIUM/LOW. CRITICAL bloqueia `/build`. Skill 35 (Skill Author) mantém artefatos coerentes.

---

### Cenário 24 — "Texto da landing tá com cara de IA"
**A dor.** "Elevate your workflow. Delve into a comprehensive solution that..." Cringe nível Linkedin.
**Sem o kit.** Você reescreve no manual, demora 1 hora.
**Com o kit.** `/humanize` remove os 29 padrões catalogados de AI-generated writing (em-dashes excessivos, "delve", "comprehensive", "elevate", "leverage", "robust", "seamless", construções "isn't just X — it's Y", listas trincas paralelas, etc.). Self-audita antes de devolver. Skill 13 (Marketing Copy) escreve com voz humana desde o começo.

---

### Cenário 25 — "Vazei secrets no commit"
**A dor.** `OPENAI_API_KEY` foi pro GitHub público. Pânico.
**Sem o kit.** IA continua commitando coisa parecida porque "não tem como saber".
**Com o kit.** Skill 34 (Static Analysis) + skill 06 (Security Review) escaneiam padrões de secret. Hook `pre-tool-enforcer` relê arquivos sensíveis antes de editar. Policy `tool-safety.md` proíbe `--no-verify` e `git push --force` em main sem confirmação explícita.

---

### Cenário 26 — "Quero que a IA toque o projeto sozinha enquanto eu durmo"
**A dor.** Você tem 6 tickets, quer acordar com 6 PRs prontos.
**Sem o kit.** IA roda 1 ticket, trava num erro qualquer, fica esperando você por 8 horas.
**Com o kit.** `/swarm` + nível 3 autônomo. Worktree por ticket, Ralph loop com fresh context por story, 4-agent paralelo review, self-fix CRITICAL/HIGH, auto PR. Circuit breaker se travar. Logs JSONL em `.auto/runs/<run-id>/debug.jsonl`. Você acorda com 6 PRs pra revisar — não com 6 worktrees travados.

---

### Cenário 27 — "Mudei de Claude pra Cursor"
**A dor.** Você customizou 50 prompts no Claude Code. Trocou de tool. Perdeu tudo.
**Sem o kit.** Recomeça do zero.
**Com o kit.** Kit roda em Claude Code, Cursor, Windsurf, Copilot, Gemini CLI, OpenCode, Antigravity. MCP server universal expõe 37 tools pra qualquer cliente MCP-compatível. Skills via `AGENTS.md`/`.windsurf/rules/`/`.github/copilot-instructions.md`/`GEMINI.md`. Zero vendor lock-in.

---

### Cenário 28 — "Sou solo founder, não tenho time"
**A dor.** Você é PO, designer, dev, QA, SRE, marketing — sozinho.
**Sem o kit.** IA te ajuda em uma coisa por vez, mal. Você é o gargalo de tudo.
**Com o kit.** 39 especialistas embarcados. Pipeline `PO → UI/UX → Backend → Frontend → Motion → Copy → SEO → QA → Security → Reviewer → Deploy` num só fluxo. Cada um opera no modelo certo (Haiku → Sonnet → Opus). Você só revisa output.

---

### Cenário 29 — "IA me deu uma resposta linda mas errada"
**A dor.** Texto bonito, tom confiante, fato inventado. Confabulação.
**Sem o kit.** Você acredita e cola na doc.
**Com o kit.** Policy `source-driven.md` exige hierarquia de fontes pra decisões de framework/lib. Policy `search-first.md` força research antes de implementar. Policy `confusion-management.md` aciona STOP-NAME-OPTIONS-WAIT se a IA detecta confusão. Skill 26 (Prompt Engineer) usa few-shot e templates pra reduzir hallucination.

---

### Cenário 30 — "Quero saber o quanto esse kit já me economizou"
**A dor.** Você instalou, sente que está ajudando, mas não tem prova.
**Sem o kit.** Achismo.
**Com o kit.** `/savings` reporta da sessão (ou janela maior): tokens economizados, custo em USD prevenido, riscos prevenidos (PRs sem QA bloqueados, secrets pegos antes do commit, scope creep evitado), hot files trabalhados, decisões do gate. Auditável em `policies/savings-metrics.md`. Stop hook gera mini-resumo automático.

---

### Cenário 31 — "/auto rodou 2h e gastou $40 só re-rodando npm test"
**A dor.** Loop autônomo trabalhando overnight, você acorda e vê a fatura. O modelo re-executou `npm test`, `eslint`, `tsc --noEmit` em todas as 47 iterações. Output idêntico, custo cheio cada vez.
**Sem o kit.** IA não tem memória cross-call. Cada `npm test` chega como novidade. Você paga 47x pelo mesmo bloco de saída — só os timestamps mudam.
**Com o kit (v2.9.0+).** Cross-call dedup (stage 0 do output-compressor) mantém janela deslizante de 16 chamadas, faz MinHash em trigrams normalizados (durações/SHAs/timestamps viram placeholders), e quando o Jaccard ≥0.85, substitui o output inteiro por `[squeez-style: ~97% similar to call #12 (npm test)]`. Benchmark publicado em `bench/`: **98% de redução agregada no second-run**. Ligar via `devkit_compress_output` com `cross_call: true` ou via API (`crossCall: true`). Auditável com `devkit_dedup_status`.

---

## Parte 4 — Calendário sugerido de posts (30 dias)

| Dia | Cenário | Hook de copy |
|---|---|---|
| 1 | #1 Login social | "IA solta esquece CSRF. Kit não." |
| 2 | #2 Bug do user sem email | "Sintoma vs causa raiz." |
| 3 | #13 Conta da Anthropic alta | "70% de economia em tokens. Sem mexer no seu prompt." |
| 4 | #19 Refazendo trabalho toda sessão | "Memória persistente que não esquece o que você decidiu." |
| 5 | #26 IA trabalhando enquanto você dorme | "Acorda com PR pronto, não com agente travado." |
| 6 | #4 Documentar legado | "5 fases. Zero linha de código tocada." |
| 7 | #7 Landing que converte | "Concorrentes mapeados, copy humano, SEO nasceu indexado." |
| 8 | #3 Refatorar src/auth | "Baseline tests antes. Behavior preservation depois." |
| 9 | #24 Texto com cara de IA | "29 padrões. Removidos automático." |
| 10 | #6 Hero + favicon + OG | "Da marca pro asset em minutos." |
| 11 | #12 Review do meu PR antes do humano | "5 reviewers paralelos. Você escolhe o que mostrar." |
| 12 | #9 Endpoint lento | "Evidence Ledger contra chute." |
| 13 | #17 3 dias no mesmo bug | "Circuit breaker. Mesmo erro 3x = stop." |
| 14 | #28 Solo founder | "Time de 39 dentro de 1 agente." |
| 15 | #11 PRD da ideia vaga | "Grill-me → to-prd → to-issues." |
| 16 | #16 WCAG | "Checklist auditável, não 'aria-label aleatório'." |
| 17 | #21 Prompt vago | "Hook confirma intent antes de agir." |
| 18 | #15 Issue #142 | "Title + body + comentários + labels. Tudo." |
| 19 | #10 React 17 → 18 | "Migração com feature flag, não no escuro." |
| 20 | #25 Secret vazado | "Tool-safety bloqueia antes do push." |
| 21 | #20 Scope creep | "Vertical slices. Menor mudança. Reviewer rejeita o resto." |
| 22 | #23 PRD inconsistente | "Constitution → spec → plan → issues. CRITICAL bloqueia build." |
| 23 | #5 CI/CD | "Cache, matriz, rollback, observability. Não copy-paste." |
| 24 | #8 Testes em código sem cobertura | "Prove-It. Não 'looks ok'." |
| 25 | #27 Trocou de Claude pra Cursor | "Mesmo kit, mesmas skills. Sem refazer setup." |
| 26 | #14 Spike POC | "Polish=none. 20 minutos, não 4 horas." |
| 27 | #18 Deps com CVE | "Drift scan reporta. Release Manager coordena ondas." |
| 28 | #22 Manutenção semanal | "Schedule + loop. Quartas-feiras agendadas." |
| 29 | #29 Confabulação | "Source-driven, search-first. Não chuta." |
| 30 | #30 ROI provado | "/savings: tokens economizados, USD prevenido, riscos pegos." |
| 31 | #31 Loop $40 em re-runs | "98% de redução no second-run. Cross-call dedup com MinHash. Benchmark publicado." |

---

## Parte 5 — Posicionamentos curtos (pra bio, header, OG card)

- "39 devs sênior dentro do seu Claude. Grátis. MIT."
- "A IA sozinha chuta. O Dev Team Kit não."
- "Pipeline estruturado. Gates de qualidade. Memória que persiste."
- "Do prompt ao PR mergeable — enquanto você dorme."
- "Sem o kit: IA solta, 70% de tokens desperdiçados, zero review. Com o kit: time virtual coordenado, modelo certo pra cada step, QA + Security obrigatórios."
- "O agente que sabe quando não saber."
