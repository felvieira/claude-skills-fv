# Testamos Nosso Kit de IA Contra Si Mesmo. Os Números São Esses.

**TL;DR:** Rodamos 53 cenários de avaliação + 3 testes end-to-end no Dev Team Kit. Mesmo modelo. Mesmo prompt. Com e sem o kit. Os números são reais, o código é real, e sim — funciona. **92.6% de pass rate. +1.84 delta médio de qualidade. 53/53 testes E2E verdes.** Os relatórios são públicos e reproduzíveis.

---

## O problema que ninguém quer falar

Você instala um pacote de "AI coding skills". O README diz que é fantástico. Você usa por uma semana. As coisas parecem um pouco melhores? Mas você não sabe ao certo.

A maioria das ferramentas de IA vive nessa neblina: claim de marketing, vibes, anedotas. Ninguém mede. Quando construímos o **Dev Team Kit** (um plugin Apache-2.0 que adiciona 39 skills especialistas, 15 subagents e 32 slash commands ao Claude Code, Cursor, Windsurf, etc.) prometemos não publicar nessa neblina.

Então construímos nosso próprio bench. Rodamos ele. Publicamos os resultados.

Os relatórios estão aqui, bilíngues, um único arquivo HTML cada, sem servidor:

- 🇧🇷 **Português:** [`analyze-doc/index.pt-BR.html`](https://github.com/felvieira/claude-skills-fv/blob/main/analyze-doc/index.pt-BR.html)
- 🌎 **English:** [`analyze-doc/index.en.html`](https://github.com/felvieira/claude-skills-fv/blob/main/analyze-doc/index.en.html)

Esse post explica o que tem dentro deles.

---

## O que testamos

Dois tipos de teste, de propósito.

### 1. Bench de isolamento — 53 cenários

Cada skill (39) e cada subagent (15, menos um que travou em timeout) passou pelo mesmo procedimento:

- **Pass A — Baseline.** Prompt real. Claude Sonnet 4.6 frio. Sem skill carregada.
- **Pass B — Treatment.** Mesmo prompt. Mesmo modelo. Skill carregada.
- **Rubrica.** 5 critérios × escala 1-5: especificidade, completude, correção, executabilidade, disciplina.
- **Threshold de aprovação.** Delta de treatment ≥ 1.5 sobre o baseline.

Por que isolamento? Porque a pergunta "essa skill agrega valor?" só tem sentido se você consegue isolar o efeito. Caso contrário você está testando o modelo, não a skill.

### 2. End-to-end — 3 testes reais

Mas isolamento não diz se o *sistema* funciona. Então também rodamos:

- **Teste 1 — App do zero.** Pedido único: *"app de gestão de tarefas com JWT auth, CRUD, Node.js + SQLite"*. Pipeline de 4 fases (PO → Orchestrator → Backend → QA). **Resultado: 33/33 testes Jest passando.**
- **Teste 2 — Pipeline manual.** Handoffs reais entre 6 skills (PO → Orchestrator → Backend → QA → Security → Reviewer) para uma feature de export CSV. **Resultado: 12/12 testes + Security pegou um bug de CSV injection que o QA tinha perdido.** Isso é a cadeia funcionando.
- **Teste 3 — Feature em repo existente.** Skill 03 num repo sandbox, sem Prisma, sem TypeScript — só Node puro + better-sqlite3. **Resultado: 8/8 testes, zero dependência inventada.**

---

## O que encontramos

### Geral

| Métrica | Valor |
|---|---|
| Pass rate | **92.6%** (50/54) |
| Baseline médio | 2.69 / 5 |
| Treatment médio | 4.52 / 5 |
| Delta médio | **+1.84** |
| Testes E2E verdes | **53/53** |
| Redução de tokens em re-run (cross-call dedup) | **98%** |

### Melhor resultado: `semgrep-triager` — delta +3.25

O modelo frio tirou 1.75/5 fazendo triagem de findings do Semgrep. Essencialmente: "lê o código e vê se parece falso positivo." Genérico, perigoso, sem protocolo.

Com o subagent carregado: parser jq pra SARIF, tabela de 3 perguntas pra decisão TP/FP, guardrails anti-bias (3 FPs seguidos sem leitura de código = parar), suppression gate com aprovação explícita obrigatória antes de qualquer `// nosemgrep`, fix diff com owner e esforço por TP.

Isso é transformativo. O modelo frio não estava só menos completo — estava sem a camada de segurança inteira.

### Falha mais interessante: agent `code-reviewer`

Teste inicial: delta +1.0 (FAIL — abaixo do threshold 1.5). Investigação mostrou que o cenário era fácil demais. Os bugs no PR de teste eram óbvios o suficiente pra até o modelo frio pegar. A estrutura do kit (OWASP labels, severity gate, owner por finding) era valor real — mas o teto do baseline estava alto.

Fizemos o que bons benches fazem: **reescrevemos o cenário mais difícil.** Nova versão: um PR com 23 arquivos, 8 findings distribuídos em concerns diferentes (race condition, timing attack em comparação de senha, import circular, N+1 em `map async`, teste fraco, secrets vs `.gitignore` — alarme falso ou real?, regressão Dockerfile).

Resultado no reteste: **+2.29 PASS.** Modelo frio achou 3 dos 8. Treatment achou 8 + 2 bônus.

A lição metodológica: quando uma skill parece falhar, cheque o cenário antes de culpar a skill.

---

## Como corrigimos o que o bench achou

Tínhamos 4 problemas flagrados na primeira rodada:

| Skill | Problema | Fix |
|---|---|---|
| 25 — AI Integration | 2 templates eram stubs de 3–9 linhas | Escrevemos 422 + 225 linhas reais (adapter pattern, fallback chain, observability, security checklist) |
| 07 — Deploy Docker | Rollback usava prev-tag hardcoded, bloco SSL assumia certbot já rodado | Adicionamos `.last-tag` persistido + `ssl-init.sh` idempotente (+196 linhas) |
| 03 — Backend API | Playbook era só TypeScript/Prisma | Adicionamos seção de 90 linhas "Plain JS + better-sqlite3" |
| Code-reviewer | Cenário fácil demais | Reescrevemos o cenário (ver acima) |

Aí **rodamos o bench de novo** nos 4. Três viraram PASS com deltas medidos (+2.0, +1.8, +2.29). O quarto (skill 24 — Release Manager) ficou near-miss, mas por outra razão: o baseline também ficou mais forte quando demos contexto de repo ao modelo, comprimindo o delta. Não é problema da skill — é teto de cenário.

O princípio que isso estabelece: **cada FAIL no bench vira fix concreto na versão seguinte. Não justificamos achados. Corrigimos e medimos de novo.**

Isso não é marketing. É como o projeto é tocado.

---

## O que isso prova sobre LLM coding

O resultado interessante não é "o kit funciona." É *que tipo de trabalho* o kit faz.

O kit não agrega valor por "saber mais." Agrega valor **enforçando estrutura que o modelo frio nunca produz espontaneamente:**

- **Paths persistentes de artefatos** — skills nomeiam onde escrever (`_detective_sdd/`, `docs/repo-audit/current.md`). Modelo frio produz conteúdo com estrutura inventada.
- **Handoff chains** — outputs referenciam a próxima skill por número (`→ skill 06 → skill 11`). Modelo frio termina sem apontar pra frente.
- **Tabelas anti-pattern** — toda skill crítica tem uma tabela "racionalização vs realidade". Modelos frios não listam o que NÃO fazer.
- **Evidence anchors** — skills detective exigem `[evidence: file:linha]` + tier de confiança. Modelo frio afirma fatos sem citar fonte.
- **Suppression gates** — `semgrep-triager` exige aprovação explícita pra silenciar findings. Modelo frio silencia silenciosamente.

Não são features. São **constraints**. O modelo frio é capaz, mas sem constraint. O kit constringe a saída em formas que tornam ela auditável e encadeável.

---

## E os modos autônomos?

Boa pergunta. Esses também testamos. Modos process-based que rodam como subprocesso Node (`auto-loop.mjs`, `swarm/index.mjs`, 7 programs YAML):

- **`auto-loop.mjs`** — Executado de verdade. Disparou Claude, capturou output, rodou validation. 12 flags documentadas, 9 exit codes. Funciona.
- **`swarm/index.mjs`** — Se recusou a rodar com working tree sujo. *Isso é o comportamento certo* — modo autônomo não deve sobrescrever trabalho não commitado. Testamos o guard, que era o que queríamos validar.
- **7 programs YAML** — `pipeline-discovery`, `spec-driven-development`, `loop-polishing`, `detective-spec`, `adversarial-dev`, `comprehensive-review`, `refactor-safely`. Todos validados, todos com dry-run estruturado. 6 step types em uso (command, gate, conditional, parallel, bash, loop, prompt).

A maquinaria autônoma existe, roda, e tem safety rails. Os relatórios detalham.

---

## O que deliberadamente *não* testamos

Honestidade importa mais que parecer completo. Lista do que pulamos:

- Geração de imagem contra a API real do fal.ai (queimaria créditos sem mudar a conclusão)
- Multi-plataforma — só validado em Claude Code. Cursor/Windsurf/Gemini CLI listados como suportados mas não testados nessa rodada.
- `/swarm` com PR real aberto no GitHub (working tree estava ocupada)
- `/loop --parallel` com worktrees reais (subprocess, consome tempo)

Estão na seção "Honestidade" do relatório público. O kit não está pronto — mas medimos o que entregamos.

---

## Testa você mesmo

É [Apache-2.0](https://github.com/felvieira/claude-skills-fv/blob/main/LICENSE), grátis, e vem com arquivo [`NOTICE`](https://github.com/felvieira/claude-skills-fv/blob/main/NOTICE) que preserva atribuição aos 17+ projetos open-source cujas ideias moldaram ele (DeerFlow, spec-kit, archon, mattpocock/skills, observações do Karpathy, e mais).

```bash
# Instalar no Claude Code
claude plugin install https://github.com/felvieira/claude-skills-fv

# Ou clone + instala no seu projeto
git clone https://github.com/felvieira/claude-skills-fv /tmp/dev-team-kit
bash /tmp/dev-team-kit/setup/install.sh /caminho/do/seu/projeto
```

Funciona em Claude Code, Cursor, Windsurf, Copilot, Gemini CLI, OpenCode. Traz 39 skills, 15 subagents, 32 slash commands, 7 programs YAML executáveis, e um benchmark público que você roda na sua máquina em menos de 30 segundos.

Os relatórios do bench — com todo teste, todo número, todo snippet de código — estão em:

- 🇧🇷 [`analyze-doc/index.pt-BR.html`](https://github.com/felvieira/claude-skills-fv/blob/main/analyze-doc/index.pt-BR.html)
- 🌎 [`analyze-doc/index.en.html`](https://github.com/felvieira/claude-skills-fv/blob/main/analyze-doc/index.en.html)

O repo: **[github.com/felvieira/claude-skills-fv](https://github.com/felvieira/claude-skills-fv)**

Se você só lembrar de uma coisa desse post: **ferramenta de IA que não publica os resultados do próprio bench está pedindo pra você confiar em vibes.** Não confia.

---

*Construído e entregue sob Apache-2.0 com atribuição forçada via NOTICE. Grafo de skills gerado por graphify. Cenários do bench reproduzíveis.*
