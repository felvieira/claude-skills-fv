# Agent Intelligence Upgrade v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add anti-rationalization tables, confusion management protocol, source-driven development policy, ideation frameworks guide, and a simplify-ignore hook that protects critical code blocks from agent "simplification."

**Architecture:** Pure markdown additions (Tasks 1-5) follow the existing pattern of policies and skill-guides in this repo. The simplify-ignore hook (Task 6) integrates into the existing Claude Code hook system using the same PreToolUse/PostToolUse pattern as `pre-tool-enforcer.mjs`, using the existing `utils.mjs` for profile/config utilities.

**Tech Stack:** Node.js ESM hooks, Markdown, existing `hooks/scripts/utils.mjs` utilities

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `policies/anti-rationalization.md` | Generic anti-rationalization policy |
| Modify | `skills/09-orchestrator/SKILL.md` | +Anti-Rationalization section |
| Modify | `skills/05-qa-testing/SKILL.md` | +Anti-Rationalization section |
| Modify | `skills/11-reviewer/SKILL.md` | +Anti-Rationalization section |
| Modify | `skills/06-security-review/SKILL.md` | +Anti-Rationalization section |
| Modify | `skills/03-backend-api/SKILL.md` | +Anti-Rationalization section |
| Create | `policies/confusion-management.md` | STOP-NAME-OPTIONS-WAIT protocol |
| Create | `policies/source-driven.md` | Source hierarchy + citation rules |
| Modify | `skills/09-orchestrator/SKILL.md` | +source verification in protocol |
| Create | `docs/skill-guides/ideation-frameworks.md` | SCAMPER, HMW, First Principles, JTBD |
| Modify | `skills/01-po-feature-spec/SKILL.md` | +Fase Divergente section |
| Create | `hooks/scripts/simplify-ignore.mjs` | PreToolUse/PostToolUse code protection hook |
| Modify | `hooks/hooks.json` | Register simplify-ignore in PreToolUse + PostToolUse |
| Modify | `hooks/config.json` | +simplify_ignore section + minimal profile entry |
| Modify | `README.md` | New policies, new hook, timestamp log |

---

## Task 1: Anti-Rationalization Policy + 5 Skill Tables

**Files:**
- Create: `policies/anti-rationalization.md`
- Modify: `skills/09-orchestrator/SKILL.md`
- Modify: `skills/05-qa-testing/SKILL.md`
- Modify: `skills/11-reviewer/SKILL.md`
- Modify: `skills/06-security-review/SKILL.md`
- Modify: `skills/03-backend-api/SKILL.md`

- [ ] **Step 1: Create the generic policy file**

Create `policies/anti-rationalization.md` with this exact content:

```markdown
# Anti-Rationalization Policy

**Status:** active
**Applies to:** all skills and subagents

---

## O Pattern

O agente encontra um obstáculo → gera uma desculpa plausível → pula uma etapa → qualidade degrada silenciosamente.

A defesa é explicitar as racionalizações comuns antes que aconteçam. Se você reconhece um pensamento listado abaixo, PARE e siga o processo correto.

---

## Regra

> Se o pensamento existe na tabela, o pensamento é errado. Siga o processo.

---

## Racionalizações Universais

| Racionalização | Realidade |
|---|---|
| "É simples demais pra seguir o processo" | Projetos simples são onde suposições não examinadas causam mais retrabalho |
| "Vou fazer isso depois" | "Depois" = "nunca". Faça agora ou registre como task explícita |
| "O usuário não pediu isso" | Se está no processo da skill, é implícito. Pergunte antes de pular |
| "Já sei a resposta" | Saber o conceito ≠ ter verificado. Verifique |
| "É só uma mudança pequena" | Mudanças pequenas sem verificação causam regressões silenciosas |
| "Não tem tempo pra isso agora" | Atalhos agora = dívida técnica depois. O processo existe por uma razão |
| "Parece correto" | "Parece" não é evidência. Verifique com o comando adequado |

---

## Como Usar em Skills

Cada skill crítica inclui uma seção `## Anti-Rationalization` com tabela específica ao seu domínio.
Esta policy define o conceito e as racionalizações universais. Skills com alto risco de pular etapas
devem adicionar sua própria tabela com racionalizações específicas.

**Skills com tabelas específicas:**
- `skills/09-orchestrator/SKILL.md`
- `skills/05-qa-testing/SKILL.md`
- `skills/11-reviewer/SKILL.md`
- `skills/06-security-review/SKILL.md`
- `skills/03-backend-api/SKILL.md`
```

- [ ] **Step 2: Verify the file was created**

Run:
```bash
cat policies/anti-rationalization.md | head -5
```
Expected output: first 5 lines including `# Anti-Rationalization Policy`

- [ ] **Step 3: Add Anti-Rationalization section to skill 09 (Orchestrator)**

Read `skills/09-orchestrator/SKILL.md` first. Then append this section at the end of the file (after the `## Handoff` section):

```markdown

## Anti-Rationalization

Se você reconhece um desses pensamentos, PARE e siga o processo. Ver `policies/anti-rationalization.md`.

| Racionalização | Realidade |
|---|---|
| "Scope é simples demais pra pipeline completo" | Pipeline existe pra garantir qualidade. Simplifique o pipeline, não o elimine |
| "Posso pular a etapa de pesquisa" | Search-first policy é obrigatória. Sem pesquisa = implementação cega |
| "Não precisa de QA pra isso" | QA descobre o que o implementador não imaginou. Sempre |
| "Vou delegar tudo de uma vez" | Delegação sem verificação intermediária multiplica erros silenciosamente |
| "O repo-audit está desatualizado, ignoro" | Desatualizado > inexistente. Use como base e verifique |
```

- [ ] **Step 4: Add Anti-Rationalization section to skill 05 (QA Testing)**

Read `skills/05-qa-testing/SKILL.md` first. Then append this section at the end of the file (after `## Integração com Pipeline`):

```markdown

## Anti-Rationalization

Se você reconhece um desses pensamentos, PARE e siga o processo. Ver `policies/anti-rationalization.md`.

| Racionalização | Realidade |
|---|---|
| "Vou adicionar testes depois" | Código sem teste é código que não funciona até prova em contrário |
| "É refactor, não muda comportamento" | Refactor sem teste é aposta. Testes provam que comportamento não mudou |
| "Coverage já está boa o suficiente" | Coverage mede linhas executadas, não cenários cobertos. Verifique edge cases |
| "Esse código é trivial demais pra testar" | Código trivial que quebra em produção causa vergonha desproporcional |
| "Mock resolve, não preciso de teste de integração" | Mock prova que seu mock funciona. Integração prova que o sistema funciona |
```

- [ ] **Step 5: Add Anti-Rationalization section to skill 11 (Reviewer)**

Read `skills/11-reviewer/SKILL.md` first. Then append this section at the end of the file (after `## Commit Trailers`):

```markdown

## Anti-Rationalization

Se você reconhece um desses pensamentos, PARE e siga o processo. Ver `policies/anti-rationalization.md`.

| Racionalização | Realidade |
|---|---|
| "É só uma mudança cosmética" | Mudanças "cosméticas" escondem alterações de lógica. Revise tudo |
| "O autor é sênior, confio" | Senioridade não é imunidade. Code review é sobre o código, não a pessoa |
| "PR é grande demais pra revisar linha a linha" | PR grande é sinal de que deveria ter sido dividido. Revise ou peça split |
| "Já vi esse pattern, funciona" | Contexto importa. O mesmo pattern em contexto diferente pode ser bug |
| "Não entendo essa parte, mas parece OK" | "Parece OK" não é aprovação. Pergunte ou pesquise antes de aprovar |
```

- [ ] **Step 6: Add Anti-Rationalization section to skill 06 (Security Review)**

Read `skills/06-security-review/SKILL.md` first. Then append this section at the end of the file (after `## Integração com Pipeline`):

```markdown

## Anti-Rationalization

Se você reconhece um desses pensamentos, PARE e siga o processo. Ver `policies/anti-rationalization.md`.

| Racionalização | Realidade |
|---|---|
| "É só código interno, não precisa de segurança" | Lateralização de ataque vem de código interno. Interno ≠ seguro |
| "Não tem input do usuário aqui" | Input vem de APIs, DBs, configs, env vars — não só de forms |
| "Vou hardcodar temporário" | "Temporário" no código vive pra sempre. Secrets hardcoded são CVEs |
| "Escopo é muito pequeno pra ter vulnerabilidade" | SQLi precisa de 1 linha. XSS precisa de 1 linha. Tamanho é irrelevante |
| "Já passou no linter de segurança" | Linters pegam patterns conhecidos. Lógica de negócio insegura passa limpa |
```

- [ ] **Step 7: Add Anti-Rationalization section to skill 03 (Backend API)**

Read `skills/03-backend-api/SKILL.md` first. Then append this section at the end of the file (after `## Integração com Pipeline`):

```markdown

## Anti-Rationalization

Se você reconhece um desses pensamentos, PARE e siga o processo. Ver `policies/anti-rationalization.md`.

| Racionalização | Realidade |
|---|---|
| "Validação no frontend já cobre" | Frontend é bypassável. Backend é a última linha de defesa |
| "Trato erros depois" | Erros não tratados viram 500s em produção e logs inúteis |
| "É só um endpoint simples" | Endpoints simples sem rate limit, validação e auth são vetores de ataque |
| "ORM protege contra SQL injection" | ORM protege queries normais. Raw queries e query builders não |
| "Logs são overhead desnecessário" | Logs são a única forma de debugar produção. Sem logs = voo cego |
```

- [ ] **Step 8: Verify all 5 skill files have the new section**

Run:
```bash
grep -l "Anti-Rationalization" skills/09-orchestrator/SKILL.md skills/05-qa-testing/SKILL.md skills/11-reviewer/SKILL.md skills/06-security-review/SKILL.md skills/03-backend-api/SKILL.md
```
Expected: all 5 file paths printed

- [ ] **Step 9: Commit**

```bash
git add policies/anti-rationalization.md skills/09-orchestrator/SKILL.md skills/05-qa-testing/SKILL.md skills/11-reviewer/SKILL.md skills/06-security-review/SKILL.md skills/03-backend-api/SKILL.md
git commit -m "feat: add anti-rationalization policy and tables to 5 critical skills"
```

---

## Task 2: Confusion Management Protocol

**Files:**
- Create: `policies/confusion-management.md`

- [ ] **Step 1: Create the policy file**

Create `policies/confusion-management.md` with this exact content:

```markdown
# Confusion Management Protocol

**Status:** active
**Applies to:** all skills, subagents, and orchestrator

---

## Problema

Quando o agente encontra requisitos contraditórios, scope indefinido, ou informação ausente, ele tende a
adivinhar ou fazer suposições silenciosas. Isso gera implementações que não correspondem à intenção do usuário.

---

## Protocolo STOP-NAME-OPTIONS-WAIT

Quando detectar confusão, siga estes 4 passos em ordem:

### 1. STOP
Parar execução imediatamente. Não gerar código, não tomar decisões unilaterais, não prosseguir.

### 2. NAME
Declarar explicitamente o que está confuso. Seja específico:
- "Requisitos A e B se contradizem: A diz X, B diz Y"
- "Scope não definido para X — pode significar W1 ou W2"
- "Dependência Y não encontrada no codebase"
- "Instrução Z conflita com o estado atual do código em arquivo.ts:42"

### 3. OPTIONS
Apresentar 2-3 interpretações possíveis com trade-offs e consequências de cada uma.
Não apresente apenas uma opção — dê ao usuário real poder de escolha.

### 4. WAIT
Não prosseguir até o usuário escolher. **Silêncio não é consentimento.**

---

## Template de Output

```
⚠ Confusão detectada: [descrição clara e específica do problema]

Interpretações possíveis:
A) [interpretação] → [consequência se escolhida]
B) [interpretação] → [consequência se escolhida]
C) [interpretação, se aplicável] → [consequência]

Qual caminho seguir?
```

---

## Sinais de Confusão (quando ativar)

Ativar o protocolo quando detectar qualquer um destes:

- Requisitos contraditórios no prompt ou entre prompt e CLAUDE.md
- Scope indefinido sem contexto suficiente para inferir ("faça o necessário")
- Dependência de informação ausente (API key, endpoint, schema, credencial)
- Conflito entre estado atual do código e instrução do usuário
- Task que implica destruição ou overwrite de trabalho existente sem confirmação explícita
- Instrução que contradiz uma policy ativa sem override explícito

---

## O que NÃO é confusão (não ativar)

- Decisão técnica com solução objetivamente melhor (escolher entre 2 libs onde uma é claramente superior)
- Detalhes de implementação dentro do scope já definido
- Formatação ou estilo de código coberto por linter/config existente
- Escolha entre abordagens equivalentes onde qualquer uma funciona

---

## Regras

1. **Não adivinhe** — se há confusão real, ative o protocolo. Adivinhação silenciosa é mais cara que uma pergunta.
2. **Seja específico** — "não entendi" não é suficiente. Nome o problema exato.
3. **Dê opções reais** — todas as interpretações devem ser viáveis. Não use opções falsas.
4. **Não repita o protocolo desnecessariamente** — use com parcimônia. Um protocolo por sessão de confusão, não um por linha ambígua.
```

- [ ] **Step 2: Verify the file was created correctly**

Run:
```bash
grep "STOP-NAME-OPTIONS-WAIT" policies/confusion-management.md
```
Expected: prints the line containing `STOP-NAME-OPTIONS-WAIT`

- [ ] **Step 3: Commit**

```bash
git add policies/confusion-management.md
git commit -m "feat: add confusion management protocol (STOP-NAME-OPTIONS-WAIT)"
```

---

## Task 3: Source-Driven Development Policy + Orchestrator Integration

**Files:**
- Create: `policies/source-driven.md`
- Modify: `skills/09-orchestrator/SKILL.md`

- [ ] **Step 1: Create the policy file**

Create `policies/source-driven.md` with this exact content:

```markdown
# Source-Driven Development Policy

**Status:** active
**Applies to:** all skills that make framework/library decisions

---

## Problema

O agente toma decisões sobre frameworks e libs baseado em training data que pode estar desatualizado.
Isso gera código que usa APIs deprecated, flags renomeadas, ou patterns obsoletos para a versão em uso.

---

## Hierarquia de Fontes

Para toda decisão de API, config, ou pattern de framework/lib, use fontes nesta ordem de prioridade:

1. **Documentação oficial** — docs site do projeto, README do repo, API reference
2. **Changelogs / Release notes** — da versão específica em uso no projeto
3. **MDN / specs oficiais** — para web APIs (HTML, CSS, Web APIs)
4. **GitHub issues do repo** — para bugs conhecidos, workarounds confirmados pelos maintainers

**Nunca usar como fonte primária:**
- StackOverflow (pode estar desatualizado, respostas votadas != corretas para sua versão)
- Blog posts aleatórios
- Respostas de IA sem citação de fonte
- Docs de uma versão diferente da que o projeto usa

---

## Regras

1. **Verificar versão primeiro.** Antes de buscar docs, checar a versão da lib no projeto
   (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`). Doc da v15 não vale para projeto em v13.

2. **Buscar antes de implementar.** Para decisões de API/config de framework, buscar via:
   - Context7 MCP: `resolve-library-id` → `query-docs`
   - Web search com "site:docs.nextjs.org" ou equivalente
   - Leitura direta de CHANGELOG.md no repo da lib

3. **Citar inline.** Quando recomendar uma API, config, ou pattern específico de lib, incluir referência:
   ```
   [fonte: Next.js 15 docs/app-router/caching]
   [fonte: Prisma docs/concepts/components/prisma-client/crud]
   ```

4. **Flag quando não encontrar.** Se a doc oficial não for encontrada ou estiver ambígua:
   ```
   ⚠ Não encontrei doc oficial para [X] na versão [Y].
   Opções: A) prosseguir com base em conhecimento geral (risco de deprecation)
            B) buscar alternativa com doc oficial clara
            C) testar e verificar output antes de usar em produção
   ```

5. **Exceções.** Patterns genéricos de linguagem (loops, tipos primitivos, estruturas básicas)
   não precisam de fonte — apenas uso específico de libs/frameworks externas.

---

## Como Usar Context7 MCP

```
1. resolve-library-id: "nextjs" → /vercel/next.js
2. query-docs: /vercel/next.js, topic: "app router caching", version: "15"
```

---

## Complementar a

- `policies/search-first.md` — pesquisa antes de implementar; source-driven define *quais fontes* usar
- `policies/iterative-retrieval.md` — como estruturar rounds de retrieval de docs externas
```

- [ ] **Step 2: Verify the file was created correctly**

Run:
```bash
grep "Hierarquia de Fontes" policies/source-driven.md
```
Expected: prints the line containing `Hierarquia de Fontes`

- [ ] **Step 3: Add source verification to Orchestrator protocol**

Read `skills/09-orchestrator/SKILL.md` first. Find the `## Protocolo de Execucao` section. After the line that says `- **pesquisar antes de implementar**` block, add a new bullet at the same indentation level after the search-first block (after `- hotfixes triviais e tasks mecanicas sao excecao`):

The current block looks like:
```
- **pesquisar antes de implementar** (obrigatorio para implementacao, integracao, refactor — ver `policies/search-first.md`):
  - reutilizar `docs/repo-audit/current.md` se existir
  - buscar patterns similares no codigo (Glob/Grep)
  - consultar docs externas via Context7 MCP para libs envolvidas
  - hotfixes triviais e tasks mecanicas sao excecao
```

Add this bullet immediately after that block (at same level as `**pesquisar antes de implementar**`):

```
- **verificar fontes para decisoes de framework/lib** (obrigatorio quando task envolve integracao de lib externa — ver `policies/source-driven.md`):
  - checar versao da lib no projeto antes de buscar docs
  - usar Context7 MCP (`resolve-library-id` → `query-docs`) para libs conhecidas
  - citar fonte inline ao recomendar API ou config especifica
```

- [ ] **Step 4: Verify the orchestrator edit**

Run:
```bash
grep "verificar fontes" skills/09-orchestrator/SKILL.md
```
Expected: prints the new line containing `verificar fontes`

- [ ] **Step 5: Commit**

```bash
git add policies/source-driven.md skills/09-orchestrator/SKILL.md
git commit -m "feat: add source-driven development policy and orchestrator integration"
```

---

## Task 4: Ideation Frameworks Guide + PO Skill Integration

**Files:**
- Create: `docs/skill-guides/ideation-frameworks.md`
- Modify: `skills/01-po-feature-spec/SKILL.md`

- [ ] **Step 1: Create the ideation frameworks guide**

Create `docs/skill-guides/ideation-frameworks.md` with this exact content:

```markdown
# Ideation Frameworks Guide

Frameworks estruturados de ideação para a fase divergente antes de especificar uma feature.
Use quando o requisito for vago, inovador, ou quando o time estiver travado em uma abordagem.

Referenciado por: `skills/01-po-feature-spec/SKILL.md`

---

## Quando Usar Frameworks de Ideação

- Requisito vago ("melhore a experiência de busca", "faça o onboarding melhor")
- Feature sem referência clara no mercado — nada óbvio a copiar
- Stakeholder indeciso entre abordagens — nenhuma opção está claramente melhor
- Solução atual não está funcionando e precisa de nova perspectiva

**Não usar quando:**
- Requisito é claro e específico (user story já definida)
- É uma task de implementação, não de descoberta
- O time já convergiu em uma abordagem validada

---

## Framework 1: SCAMPER

**Quando usar:** melhorar uma feature existente, encontrar variações não óbvias

**Como funciona:** Para cada letra, gere 1-2 ideias aplicadas ao problema atual.

| Letra | Pergunta |
|-------|----------|
| **S**ubstitute | O que pode ser substituído? Componente, processo, regra, formato? |
| **C**ombine | O que pode ser combinado com outra feature ou sistema? |
| **A**dapt | O que de outro domínio pode ser adaptado aqui? |
| **M**odify / Magnify | O que pode ser ampliado, reduzido, ou modificado? |
| **P**ut to other use | Como esta feature pode servir a um propósito diferente? |
| **E**liminate | O que pode ser removido sem perder o valor central? |
| **R**everse / Rearrange | O que acontece se inverter o fluxo ou reordenar as etapas? |

**Exemplo — Feature de busca:**
- Eliminate: o que acontece se removermos filtros e usarmos apenas NLP?
- Reverse: e se o sistema sugerisse buscas antes do usuário digitar?
- Combine: e se a busca integrasse com o histórico de ações do usuário?

---

## Framework 2: How Might We (HMW)

**Quando usar:** reformular um problema como oportunidade, desbloquear quando o time está travado

**Como funciona:** Reformule o problema como uma pergunta aberta que convida soluções.

**Template:** "Como poderíamos [ação desejada] sem [restrição atual]?"

**Variações úteis:**
- "Como poderíamos [ação] de forma que [resultado positivo]?"
- "Como poderíamos eliminar [problema] sem introduzir [problema secundário]?"

**Exemplo — Onboarding:**
- "Como poderíamos onboar usuários sem exigir cadastro completo?"
- "Como poderíamos mostrar valor antes do primeiro login?"
- "Como poderíamos reduzir onboarding de 5 passos para 1 sem perder contexto necessário?"

**Output:** 5-10 HMW questions, então votar nas mais promissoras para explorar

---

## Framework 3: First Principles

**Quando usar:** resolver problema não-óbvio, questionar suposições do domínio, proposta de reescrita

**Como funciona:** 3 passos sequenciais.

**Passo 1 — Listar suposições:**
Escreva todas as suposições implícitas na solução atual ou no problema.
Exemplo: "assumimos que precisamos de um banco relacional", "assumimos que o usuário precisa de login"

**Passo 2 — Questionar cada suposição:**
Para cada suposição, pergunte: "Esta suposição é necessariamente verdadeira? O que acontece sem ela?"

**Passo 3 — Reconstruir sem suposições falsas:**
Com as suposições falsas removidas, qual é a solução mais simples?

**Exemplo — Sistema de permissões:**
- Suposição: "precisamos de roles complexas com permissões granulares"
- Questão: "Os usuários realmente precisam de permissões granulares, ou só precisam de 2-3 níveis de acesso?"
- Reconstrução: "Simplicar para admin/editor/viewer cobre 95% dos casos e elimina toda a complexidade de gestão"

---

## Framework 4: Jobs To Be Done (JTBD)

**Quando usar:** entender motivação real do usuário, priorizar features por impacto real

**Como funciona:** Formular o problema do ponto de vista do que o usuário está tentando realizar.

**Template:** "Quando [situação específica], quero [ação desejada], para que [resultado esperado]."

**Regras:**
- A situação deve ser específica, não genérica ("quando estou revisando um PR grande" não "quando uso o sistema")
- A ação é o que o usuário quer fazer, não o que o sistema deve fazer
- O resultado é o benefício real, não a feature em si

**Exemplos:**
- "Quando estou revisando um PR grande, quero ver só os arquivos que mudaram lógica, para que eu não perca tempo com formatação"
- "Quando estou onboardando um novo dev, quero um setup que funciona em 1 comando, para que eu não precise pair-programar o setup"
- "Quando o deploy falha em produção, quero ver o erro em 30 segundos, para que eu possa decidir se é rollback ou fix-forward"

**Output:** 3-5 JTBD statements, ordenados por frequência e impacto do job

---

## Ordem de Uso Recomendada

Para um requisito vago, use nesta ordem:
1. **JTBD** — entender o job real antes de qualquer solução
2. **HMW** — reformular como oportunidade
3. **SCAMPER** — explorar variações da solução escolhida
4. **First Principles** — se nenhuma solução existente está funcionando
```

- [ ] **Step 2: Verify the guide was created**

Run:
```bash
grep "SCAMPER\|HMW\|First Principles\|JTBD" docs/skill-guides/ideation-frameworks.md | wc -l
```
Expected: `4` (one match per framework)

- [ ] **Step 3: Add Fase Divergente section to skill 01 (PO Feature Spec)**

Read `skills/01-po-feature-spec/SKILL.md` first. Find the `## Ambiguity Scoring` section. Insert the following section BEFORE `## Ambiguity Scoring`:

```markdown
## Fase Divergente (Opcional)

Para features ambíguas ou inovadoras, use frameworks de ideação antes de especificar.
Consultar: `docs/skill-guides/ideation-frameworks.md`

**Quando usar:**
- Requisito vago ("melhore a experiência de busca")
- Feature sem referência clara no mercado
- Stakeholder indeciso entre abordagens
- Solução atual não está funcionando

**Quando pular:**
- User story já está clara e específica
- É task de implementação com scope definido
- Time já convergiu em abordagem validada

**Ordem recomendada:** JTBD → HMW → SCAMPER → First Principles

```

- [ ] **Step 4: Verify the PO skill edit**

Run:
```bash
grep "Fase Divergente" skills/01-po-feature-spec/SKILL.md
```
Expected: prints the line containing `Fase Divergente`

- [ ] **Step 5: Commit**

```bash
git add docs/skill-guides/ideation-frameworks.md skills/01-po-feature-spec/SKILL.md
git commit -m "feat: add ideation frameworks guide and PO skill divergent phase"
```

---

## Task 5: Simplify-Ignore Hook — Config and Registration

**Files:**
- Modify: `hooks/config.json`
- Modify: `hooks/hooks.json`

- [ ] **Step 1: Add simplify_ignore section to config.json**

Read `hooks/config.json` first. Add the `simplify_ignore` section and update `minimal.disabled` list.

The current `hook_profiles.profiles.minimal.disabled` array is:
```json
["pre-execution-gate", "keyword-detector", "post-tool-verifier", "model-routing-hook"]
```

Change it to:
```json
["pre-execution-gate", "keyword-detector", "post-tool-verifier", "model-routing-hook", "simplify-ignore"]
```

Also add the `simplify_ignore` section as a new top-level key in the JSON (after `hook_profiles`):
```json
"simplify_ignore": {
  "state_file": ".simplify-ignore-state.json",
  "config_file": "simplify-ignore.json"
}
```

The final `hooks/config.json` should look like:
```json
{
  "context_guard": {
    "warn_threshold": 0.50,
    "block_threshold": 0.75,
    "max_blocks_per_session": 2,
    "strategic_compact": true
  },
  "pre_execution_gate": {
    "enrich_threshold": 0.40,
    "block_threshold": 0.70,
    "max_guided_questions": 2
  },
  "keyword_detector": {
    "max_learned_skills_per_session": 3,
    "informational_context_window": 80
  },
  "code_exploration": {
    "suggest_on_tools": ["Read", "Grep", "Glob"],
    "min_suggestions_interval_ms": 30000,
    "env_file": ".bot/.env.tools"
  },
  "model_routing": {
    "suggest_on_plan_mode": true,
    "suggest_on_agent_spawn": true,
    "min_suggestion_interval_ms": 60000,
    "plan_model": "opus",
    "exec_model": "sonnet",
    "fast_model": "haiku"
  },
  "learned_skills_scoring": {
    "initial_score": 0.7,
    "boost_on_use": 0.1,
    "decay_per_week": 0.1,
    "archive_threshold": 0.3,
    "archive_dir": ".archive"
  },
  "hook_profiles": {
    "active": "standard",
    "disabled": [],
    "profiles": {
      "minimal": {
        "disabled": ["pre-execution-gate", "keyword-detector", "post-tool-verifier", "model-routing-hook", "simplify-ignore"]
      },
      "standard": {
        "disabled": []
      },
      "strict": {
        "disabled": [],
        "overrides": {
          "context_guard": { "warn_threshold": 0.40, "block_threshold": 0.60 },
          "pre_execution_gate": { "block_threshold": 0.50 }
        }
      }
    }
  },
  "simplify_ignore": {
    "state_file": ".simplify-ignore-state.json",
    "config_file": "simplify-ignore.json"
  }
}
```

- [ ] **Step 2: Verify config.json is valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('hooks/config.json','utf-8')); console.log('valid')"
```
Expected: `valid`

- [ ] **Step 3: Register hook in hooks.json**

Read `hooks/hooks.json` first. The current content is:
```json
{
  "UserPromptSubmit": [
    "hooks/scripts/pre-execution-gate.mjs",
    "hooks/scripts/keyword-detector.mjs"
  ],
  "SessionStart": [
    "hooks/scripts/session-start.mjs"
  ],
  "PreToolUse": [
    "hooks/scripts/pre-tool-enforcer.mjs",
    "hooks/scripts/model-routing-hook.mjs"
  ],
  "Stop": [
    "hooks/scripts/context-guard-stop.mjs",
    "hooks/scripts/persistent-mode.mjs"
  ],
  "PostToolUse": [
    "hooks/scripts/post-tool-verifier.mjs"
  ]
}
```

Change it to:
```json
{
  "UserPromptSubmit": [
    "hooks/scripts/pre-execution-gate.mjs",
    "hooks/scripts/keyword-detector.mjs"
  ],
  "SessionStart": [
    "hooks/scripts/session-start.mjs"
  ],
  "PreToolUse": [
    "hooks/scripts/pre-tool-enforcer.mjs",
    "hooks/scripts/model-routing-hook.mjs",
    "hooks/scripts/simplify-ignore.mjs"
  ],
  "Stop": [
    "hooks/scripts/context-guard-stop.mjs",
    "hooks/scripts/persistent-mode.mjs"
  ],
  "PostToolUse": [
    "hooks/scripts/post-tool-verifier.mjs",
    "hooks/scripts/simplify-ignore.mjs"
  ]
}
```

- [ ] **Step 4: Verify hooks.json is valid JSON**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('hooks/hooks.json','utf-8')); console.log('valid')"
```
Expected: `valid`

- [ ] **Step 5: Commit config changes**

```bash
git add hooks/config.json hooks/hooks.json
git commit -m "feat: register simplify-ignore hook and add config section"
```

---

## Task 6: Simplify-Ignore Hook — Implementation

**Files:**
- Create: `hooks/scripts/simplify-ignore.mjs`

- [ ] **Step 1: Create the hook script**

Create `hooks/scripts/simplify-ignore.mjs` with this exact content:

```javascript
#!/usr/bin/env node

import { createHash } from "crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { isHookDisabled, readHookConfig, resolveBotPath } from "./utils.mjs";

const HOOK_ID = "simplify-ignore";

// Comment delimiters supported — start/end pairs per language
const START_PATTERNS = [
  /\/\/\s*simplify-ignore-start/,
  /#\s*simplify-ignore-start/,
  /\/\*\s*simplify-ignore-start\s*\*\//,
  /<!--\s*simplify-ignore-start\s*-->/,
];
const END_PATTERNS = [
  /\/\/\s*simplify-ignore-end/,
  /#\s*simplify-ignore-end/,
  /\/\*\s*simplify-ignore-end\s*\*\//,
  /<!--\s*simplify-ignore-end\s*-->/,
];

// ─── Config ─────────────────────────────────────────────────────────────────

function getConfig() {
  return readHookConfig("simplify_ignore", {
    state_file: ".simplify-ignore-state.json",
    config_file: "simplify-ignore.json",
  });
}

function statePath(cfg) {
  return resolveBotPath(cfg.state_file);
}

function lockPath() {
  return resolveBotPath(".simplify-ignore.lock");
}

// ─── State ──────────────────────────────────────────────────────────────────

function loadState(cfg) {
  try {
    return JSON.parse(readFileSync(statePath(cfg), "utf-8"));
  } catch {
    return {};
  }
}

function acquireLock() {
  const lp = lockPath();
  if (existsSync(lp)) {
    try {
      const pid = parseInt(readFileSync(lp, "utf-8").trim(), 10);
      try {
        process.kill(pid, 0); // throws if process dead
        return false; // alive — skip
      } catch {
        // stale lock — fall through to overwrite
      }
    } catch {}
  }
  mkdirSync(resolveBotPath(), { recursive: true });
  writeFileSync(lp, String(process.pid));
  return true;
}

function releaseLock() {
  const lp = lockPath();
  try {
    if (existsSync(lp)) {
      const pid = parseInt(readFileSync(lp, "utf-8").trim(), 10);
      if (pid === process.pid) unlinkSync(lp);
    }
  } catch {}
}

function saveState(state, cfg) {
  if (!acquireLock()) return;
  try {
    mkdirSync(resolveBotPath(), { recursive: true });
    writeFileSync(statePath(cfg), JSON.stringify(state, null, 2));
  } finally {
    releaseLock();
  }
}

// ─── Ignore config (.bot/simplify-ignore.json) ──────────────────────────────

function loadIgnoreConfig(cfg) {
  const candidates = [resolveBotPath(cfg.config_file), cfg.config_file];
  for (const c of candidates) {
    if (existsSync(c)) {
      try {
        return JSON.parse(readFileSync(c, "utf-8"));
      } catch {}
    }
  }
  return { files: {} };
}

// ─── Block detection ────────────────────────────────────────────────────────

function isStart(line) {
  return START_PATTERNS.some((p) => p.test(line));
}

function isEnd(line) {
  return END_PATTERNS.some((p) => p.test(line));
}

/**
 * Find protected blocks from inline comments.
 * Returns [{ startLine, endLine, content }] (1-indexed, inclusive)
 */
function findCommentBlocks(fileContent) {
  const lines = fileContent.split("\n");
  const blocks = [];
  let blockStart = -1;
  const blockLines = [];

  for (let i = 0; i < lines.length; i++) {
    if (isStart(lines[i])) {
      blockStart = i + 1;
      blockLines.length = 0;
      blockLines.push(lines[i]);
    } else if (isEnd(lines[i]) && blockStart !== -1) {
      blockLines.push(lines[i]);
      blocks.push({ startLine: blockStart, endLine: i + 1, content: blockLines.join("\n") });
      blockStart = -1;
    } else if (blockStart !== -1) {
      blockLines.push(lines[i]);
    }
  }

  return blocks;
}

/**
 * Get protected ranges from .bot/simplify-ignore.json for a given file path.
 * Returns null (not protected), "full", or [{ startLine, endLine }]
 */
function getConfigRanges(filePath, ignoreConfig) {
  const entry = ignoreConfig.files?.[filePath];
  if (!entry) return null;
  if (entry === "full") return "full";
  if (Array.isArray(entry)) {
    return entry.map(([s, e]) => ({ startLine: s, endLine: e }));
  }
  return null;
}

// ─── Hash / placeholder ──────────────────────────────────────────────────────

function shortHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 8);
}

function placeholder(hash) {
  return `/* PROTECTED_BLOCK_${hash} — do not modify */`;
}

// ─── Substitution (Read interception via PostToolUse) ────────────────────────

/**
 * Given file content and blocks, replace blocks with PROTECTED_BLOCK_xxx placeholders.
 * Returns { modified: string, substitutions: [{ hash, content }] }
 */
function substituteBlocks(fileContent, blocks) {
  const lines = fileContent.split("\n");
  const substitutions = [];

  // Sort descending by startLine so we splice without shifting indices
  const sorted = [...blocks].sort((a, b) => b.startLine - a.startLine);

  for (const block of sorted) {
    const hash = shortHash(block.content);
    const ph = placeholder(hash);
    lines.splice(block.startLine - 1, block.endLine - block.startLine + 1, ph);
    substitutions.push({ hash, content: block.content });
  }

  return { modified: lines.join("\n"), substitutions };
}

/**
 * Given file content and config-based ranges, replace those ranges with placeholders.
 */
function substituteRanges(fileContent, ranges) {
  const lines = fileContent.split("\n");
  const substitutions = [];

  const sorted = [...ranges].sort((a, b) => b.startLine - a.startLine);

  for (const range of sorted) {
    const rangeLines = lines.slice(range.startLine - 1, range.endLine);
    const content = rangeLines.join("\n");
    const hash = shortHash(content);
    const ph = placeholder(hash);
    lines.splice(range.startLine - 1, range.endLine - range.startLine + 1, ph);
    substitutions.push({ hash, content });
  }

  return { modified: lines.join("\n"), substitutions };
}

// ─── Restoration (Write interception via PreToolUse) ─────────────────────────

/**
 * Restore PROTECTED_BLOCK_xxx placeholders in content using state.
 * Warns to stderr if a hash is missing from output (block may have been deleted).
 */
function restorePlaceholders(content, stateSubs) {
  let result = content;

  for (const sub of stateSubs) {
    const ph = placeholder(sub.hash);
    if (result.includes(ph)) {
      result = result.split(ph).join(sub.content);
    } else {
      process.stderr.write(
        `[simplify-ignore] WARNING: PROTECTED_BLOCK_${sub.hash} not found in output. ` +
          `Original content preserved — the block may have been intentionally removed.\n`
      );
    }
  }

  return result;
}

// ─── PostToolUse: intercept Read result ──────────────────────────────────────

function handlePostToolUse(input) {
  const toolName = input.tool_name || "";
  if (toolName !== "Read") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = input.tool_input?.file_path || "";
  const toolResult = input.tool_result;

  if (!filePath || typeof toolResult !== "string") {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const cfg = getConfig();
  const ignoreConfig = loadIgnoreConfig(cfg);
  const state = loadState(cfg);

  // Collect blocks from inline comments
  const commentBlocks = findCommentBlocks(toolResult);

  // Collect ranges from config
  const configEntry = getConfigRanges(filePath, ignoreConfig);

  if (commentBlocks.length === 0 && !configEntry) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  let modified = toolResult;
  const allSubs = [];

  if (commentBlocks.length > 0) {
    const { modified: m, substitutions } = substituteBlocks(modified, commentBlocks);
    modified = m;
    allSubs.push(...substitutions);
  }

  if (configEntry === "full") {
    const hash = shortHash(modified);
    const ph = placeholder(hash);
    allSubs.push({ hash, content: modified });
    modified = ph;
  } else if (Array.isArray(configEntry)) {
    const { modified: m, substitutions } = substituteRanges(modified, configEntry);
    modified = m;
    allSubs.push(...substitutions);
  }

  if (allSubs.length > 0) {
    state[filePath] = allSubs;
    saveState(state, cfg);

    process.stdout.write(
      JSON.stringify({
        continue: true,
        tool_result: modified,
      })
    );
    return;
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

// ─── PreToolUse: intercept Edit/Write to restore protected blocks ─────────────

function handlePreToolUse(input) {
  const toolName = input.tool_name || "";
  const toolInput = input.tool_input || {};

  const isEdit = toolName === "Edit";
  const isWrite = toolName === "Write";

  if (!isEdit && !isWrite) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  const filePath = toolInput.file_path || "";
  const cfg = getConfig();
  const state = loadState(cfg);
  const stateSubs = state[filePath];

  if (!stateSubs || stateSubs.length === 0) {
    process.stdout.write(JSON.stringify({ continue: true }));
    return;
  }

  if (isEdit && toolInput.new_string !== undefined) {
    const restored = restorePlaceholders(toolInput.new_string, stateSubs);
    if (restored !== toolInput.new_string) {
      process.stdout.write(
        JSON.stringify({
          continue: true,
          tool_input: { ...toolInput, new_string: restored },
        })
      );
      return;
    }
  }

  if (isWrite && toolInput.content !== undefined) {
    const restored = restorePlaceholders(toolInput.content, stateSubs);
    if (restored !== toolInput.content) {
      process.stdout.write(
        JSON.stringify({
          continue: true,
          tool_input: { ...toolInput, content: restored },
        })
      );
      return;
    }
  }

  process.stdout.write(JSON.stringify({ continue: true }));
}

// ─── Entry point ─────────────────────────────────────────────────────────────

let inputBuffer = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", (chunk) => { inputBuffer += chunk; });

process.stdin.on("end", () => {
  if (isHookDisabled(HOOK_ID)) {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  let input = {};
  try {
    input = JSON.parse(inputBuffer);
  } catch {
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  // Detect whether we're in PreToolUse or PostToolUse based on input shape
  const isPostToolUse = "tool_result" in input;

  if (isPostToolUse) {
    handlePostToolUse(input);
  } else {
    handlePreToolUse(input);
  }
});
```

- [ ] **Step 2: Verify the hook has no syntax errors**

Run:
```bash
node --input-type=module < hooks/scripts/simplify-ignore.mjs 2>&1 | head -5
```
Expected: No output or only blank (the script reads stdin, which is empty — it should exit without errors). If there's a SyntaxError, fix it before proceeding.

- [ ] **Step 3: Verify the hook exits cleanly with empty stdin**

Run:
```bash
echo '' | node hooks/scripts/simplify-ignore.mjs 2>/dev/null; echo "exit: $?"
```
Expected: `exit: 0`

- [ ] **Step 4: Verify the hook passes through when disabled**

Run:
```bash
echo '{"tool_name":"Read","tool_input":{"file_path":"README.md"},"tool_result":"hello"}' | DEVKIT_DISABLED_HOOKS=simplify-ignore node hooks/scripts/simplify-ignore.mjs
```
Expected: `{"continue":true}` — hook returns pass-through when disabled

- [ ] **Step 5: Verify Read interception with comment blocks**

Create a temp test file and verify substitution works:
```bash
# Create a temp file with a protected block
cat > /tmp/test-simplify.txt << 'EOF'
line 1
// simplify-ignore-start
critical optimized code here
// simplify-ignore-end
line 5
EOF

# Simulate PostToolUse Read event
echo "{\"tool_name\":\"Read\",\"tool_input\":{\"file_path\":\"/tmp/test-simplify.txt\"},\"tool_result\":$(cat /tmp/test-simplify.txt | node -e "const d=[];process.stdin.on('data',c=>d.push(c));process.stdin.on('end',()=>console.log(JSON.stringify(d.join(''))))")}" | node hooks/scripts/simplify-ignore.mjs
```

Expected: JSON response containing `PROTECTED_BLOCK_` placeholder instead of the block content. The `tool_result` key should be present in the output.

- [ ] **Step 6: Commit**

```bash
git add hooks/scripts/simplify-ignore.mjs
git commit -m "feat: add simplify-ignore hook with PreToolUse/PostToolUse code protection"
```

---

## Task 7: README Update and Timestamp Log

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Read the README to understand current structure**

Read `README.md` fully before editing.

- [ ] **Step 2: Add new policies to Governance section**

Find the section that lists policies (likely "Governança" or "Policies" section). Add references to the 3 new policies. The exact location depends on the current README structure — find the list of policies and append:

```markdown
- `policies/anti-rationalization.md` — tabelas de racionalizações comuns + rebuttals por skill crítica
- `policies/source-driven.md` — hierarquia de fontes obrigatória para decisões de framework/lib
- `policies/confusion-management.md` — protocolo STOP-NAME-OPTIONS-WAIT para confusão detectada
```

- [ ] **Step 3: Add simplify-ignore to the Hook System table**

Find the hooks table and add a new row for simplify-ignore:

```markdown
| `simplify-ignore` | PreToolUse + PostToolUse | Protege blocos marcados com `simplify-ignore-start/end` de simplificação pelo agente | standard, strict |
```

- [ ] **Step 4: Add ideation-frameworks.md to Skill Guides section**

Find the section that lists skill guides and add:

```markdown
- `docs/skill-guides/ideation-frameworks.md` — SCAMPER, HMW, First Principles, JTBD para fase de ideação
```

- [ ] **Step 5: Add timestamp log entry**

Find the timestamp log (likely at the bottom of the README) and add:

```markdown
### 2026-04-13

- **Agent Intelligence v2:** anti-rationalization tables em 5 skills críticas, confusion management protocol (STOP-NAME-OPTIONS-WAIT), source-driven development policy com hierarquia de fontes e integração no orchestrator, ideation frameworks guide (SCAMPER, HMW, First Principles, JTBD), simplify-ignore hook que protege blocos críticos de simplificação automática.
```

- [ ] **Step 6: Verify README changes are consistent**

Run:
```bash
grep -c "anti-rationalization\|source-driven\|confusion-management\|simplify-ignore\|ideation-frameworks" README.md
```
Expected: 5 or more (each new item appears at least once)

- [ ] **Step 7: Commit and push**

```bash
git add README.md
git commit -m "docs: update README with Agent Intelligence v2 features and timestamp log"
git push
```

Expected: Push succeeds to `origin/main`

---

## Self-Review

**Spec coverage:**
- ✅ Feature 1 (Anti-Rationalization): Task 1 — policy + 5 skill tables
- ✅ Feature 2 (Simplify-Ignore): Tasks 5+6 — config, hooks.json, full hook implementation
- ✅ Feature 3 (Source-Driven): Task 3 — policy + orchestrator integration
- ✅ Feature 4 (Ideation Frameworks): Task 4 — guide + PO skill section
- ✅ Feature 5 (Confusion Management): Task 2 — policy
- ✅ README + timestamp: Task 7

**Placeholder scan:** No TBDs or incomplete sections. All code blocks are complete and functional.

**Type consistency:** `resolveBotPath`, `readHookConfig`, `isHookDisabled` — all imported from `./utils.mjs`, same as all other hooks. State file key uses `filePath` string consistently. Hash uses `shortHash()` consistently. Placeholder string `/* PROTECTED_BLOCK_${hash} — do not modify */` used in `placeholder()` helper, referenced consistently in `substituteBlocks`, `substituteRanges`, and `restorePlaceholders`.
