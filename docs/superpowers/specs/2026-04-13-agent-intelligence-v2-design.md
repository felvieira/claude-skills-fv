# Agent Intelligence Upgrade v2 — Design Spec

**Data:** 2026-04-13
**Status:** aprovado
**Escopo:** 5 features que elevam a inteligência do agente com proteção de código, governança de fontes, anti-racionalização, frameworks de ideação e gestão de confusão

---

## Visão Geral

Cinco melhorias no sistema de skills, policies e hooks para: impedir que o agente racionalize pular etapas, proteger código crítico de simplificação indevida, exigir fontes oficiais para decisões de framework, oferecer frameworks estruturados de ideação, e definir protocolo claro quando o agente detecta confusão.

| # | Feature | Artefatos principais | Esforço |
|---|---|---|---|
| 1 | Anti-Rationalization Tables | policies/anti-rationalization.md, 5 SKILL.md | Baixo |
| 2 | Simplify-Ignore Hook | simplify-ignore.mjs, hooks.json, config.json | Alto |
| 3 | Source-Driven Development | policies/source-driven.md, skill 09 | Baixo |
| 4 | Idea Refinement Frameworks | docs/skill-guides/ideation-frameworks.md, skill 01 | Baixo |
| 5 | Confusion Management Protocol | policies/confusion-management.md | Baixo |

---

## Feature 1: Anti-Rationalization Tables

### Problema

O agente frequentemente racionaliza pular etapas ("é simples demais", "vou adicionar depois", "é só código interno"). Sem defesa explícita, essas racionalizações passam sem contestação.

### Solução

Policy genérica + tabelas específicas nas 5 skills mais críticas.

**Policy (`policies/anti-rationalization.md`):**

Define o conceito e o formato padrão. Qualquer skill pode referenciar. Conteúdo:

- Explicação do pattern: o agente encontra um obstáculo → gera desculpa plausível → pula etapa → qualidade degrada
- Formato da tabela: coluna "Racionalização" + coluna "Realidade" (rebuttal)
- Regra: se o agente reconhece um pensamento listado na tabela, deve PARAR e seguir o processo correto
- Tabela genérica com racionalizações universais:

| Racionalização | Realidade |
|---|---|
| "É simples demais pra seguir o processo" | Projetos simples são onde suposições não examinadas causam mais retrabalho |
| "Vou fazer isso depois" | "Depois" = "nunca". Faça agora ou registre como task explícita |
| "O usuário não pediu isso" | Se está no processo da skill, é implícito. Pergunte antes de pular |
| "Já sei a resposta" | Saber o conceito ≠ ter verificado. Verifique |
| "É só uma mudança pequena" | Mudanças pequenas sem verificação causam regressões silenciosas |

**5 skills recebem seção `## Anti-Rationalization`:**

**Skill 09 — Orchestrator:**

| Racionalização | Realidade |
|---|---|
| "Scope é simples demais pra pipeline completo" | Pipeline existe pra garantir qualidade. Simplifique o pipeline, não o elimine |
| "Posso pular a etapa de pesquisa" | Search-first policy é obrigatória. Sem pesquisa = implementação cega |
| "Não precisa de QA pra isso" | QA descobre o que o implementador não imaginou. Sempre |
| "Vou delegar tudo de uma vez" | Delegação sem verificação intermediária multiplica erros silenciosamente |
| "O repo-audit está desatualizado, ignoro" | Desatualizado > inexistente. Use como base e verifique |

**Skill 05 — QA Testing:**

| Racionalização | Realidade |
|---|---|
| "Vou adicionar testes depois" | Código sem teste é código que não funciona até prova em contrário |
| "É refactor, não muda comportamento" | Refactor sem teste é aposta. Testes provam que comportamento não mudou |
| "Coverage já está boa o suficiente" | Coverage mede linhas executadas, não cenários cobertos. Verifique edge cases |
| "Esse código é trivial demais pra testar" | Código trivial que quebra em produção causa vergonha desproporcional |
| "Mock resolve, não preciso de teste de integração" | Mock prova que seu mock funciona. Integração prova que o sistema funciona |

**Skill 11 — Reviewer:**

| Racionalização | Realidade |
|---|---|
| "É só uma mudança cosmética" | Mudanças "cosméticas" escondem alterações de lógica. Revise tudo |
| "O autor é sênior, confio" | Senioridade não é imunidade. Code review é sobre o código, não a pessoa |
| "PR é grande demais pra revisar linha a linha" | PR grande é sinal de que deveria ter sido dividido. Revise ou peça split |
| "Já vi esse pattern, funciona" | Contexto importa. O mesmo pattern em contexto diferente pode ser bug |
| "Não entendo essa parte, mas parece OK" | "Parece OK" não é aprovação. Pergunte ou pesquise antes de aprovar |

**Skill 06 — Security Review:**

| Racionalização | Realidade |
|---|---|
| "É só código interno, não precisa de segurança" | Lateralização de ataque vem de código interno. Interno ≠ seguro |
| "Não tem input do usuário aqui" | Input vem de APIs, DBs, configs, env vars — não só de forms |
| "Vou hardcodar temporário" | "Temporário" no código vive pra sempre. Secrets hardcoded são CVEs |
| "Escopo é muito pequeno pra ter vulnerabilidade" | SQLi precisa de 1 linha. XSS precisa de 1 linha. Tamanho é irrelevante |
| "Já passou no linter de segurança" | Linters pegam patterns conhecidos. Lógica de negócio insegura passa limpa |

**Skill 03 — Backend API:**

| Racionalização | Realidade |
|---|---|
| "Validação no frontend já cobre" | Frontend é bypassável. Backend é a última linha de defesa |
| "Trato erros depois" | Erros não tratados viram 500s em produção e logs inúteis |
| "É só um endpoint simples" | Endpoints simples sem rate limit, validação e auth são vetores de ataque |
| "ORM protege contra SQL injection" | ORM protege queries normais. Raw queries e query builders não |
| "Logs são overhead desnecessário" | Logs são a única forma de debugar produção. Sem logs = voo cego |

### Artefatos

| Arquivo | Mudança |
|---|---|
| `policies/anti-rationalization.md` | Novo arquivo |
| `skills/09-orchestrator/SKILL.md` | +seção Anti-Rationalization |
| `skills/05-qa-testing/SKILL.md` | +seção Anti-Rationalization |
| `skills/11-reviewer/SKILL.md` | +seção Anti-Rationalization |
| `skills/06-security-review/SKILL.md` | +seção Anti-Rationalization |
| `skills/03-backend-api/SKILL.md` | +seção Anti-Rationalization |
| `README.md` | menção na seção Governança |

---

## Feature 2: Simplify-Ignore Hook

### Problema

O agente tende a "simplificar" código otimizado, performance-critical, ou intencionalmente complexo. Sem proteção, código cuidadosamente escrito é degradado por refactors automáticos.

### Solução

Hook PreToolUse/PostToolUse que esconde blocos marcados do agente via hash placeholders, restaurando na escrita.

**Novo hook:** `hooks/scripts/simplify-ignore.mjs`

**Registros em hooks.json:**

```json
{
  "PreToolUse": [..., "hooks/scripts/simplify-ignore.mjs"],
  "PostToolUse": [..., "hooks/scripts/simplify-ignore.mjs"]
}
```

**Detecção de blocos protegidos (híbrida):**

1. **Comentários no código:**
   - `// simplify-ignore-start` / `// simplify-ignore-end`
   - `# simplify-ignore-start` / `# simplify-ignore-end`
   - `/* simplify-ignore-start */` / `/* simplify-ignore-end */`
   - `<!-- simplify-ignore-start -->` / `<!-- simplify-ignore-end -->`

2. **Config (`.bot/simplify-ignore.json`):**
   ```json
   {
     "files": {
       "src/hot-path.ts": "full",
       "src/wasm-bindings.ts": "full",
       "src/renderer.ts": [[10, 50], [80, 120]]
     }
   }
   ```
   - `"full"` = arquivo inteiro protegido (agente vê placeholder no lugar de todo conteúdo)
   - Array de `[start, end]` = line ranges protegidos

**Mecânica do hook:**

**PreToolUse (Read interception):**
1. Detecta se tool é `Read` e o arquivo tem blocos protegidos
2. Para cada bloco: gera hash SHA-256 curto (8 chars) do conteúdo
3. Substitui o bloco por: `/* PROTECTED_BLOCK_<hash> — do not modify */`
4. Salva mapa `{ hash: { file, start, end, content } }` em `.bot/.simplify-ignore-state.json`
5. Retorna conteúdo modificado para o agente

**PostToolUse (Edit/Write interception):**
1. Detecta se tool é `Edit` ou `Write` e o arquivo tem blocos no state
2. Lê `.bot/.simplify-ignore-state.json`
3. Para cada `PROTECTED_BLOCK_<hash>` encontrado no output: restaura conteúdo original
4. Se um hash está no state mas não aparece no output: WARNING — bloco pode ter sido removido intencionalmente, preservar e logar em stderr
5. Atualiza state removendo entries de arquivos sem mais blocos

**Concorrência e crash recovery:**
- Lock file: `.bot/.simplify-ignore.lock` com PID do processo
- Antes de escrever state: adquirir lock (check PID ativo, se morto → limpar)
- Após escrever state: liberar lock
- Crash recovery: se state existe sem lock → estado válido, usar normalmente

**Config (hooks/config.json):**

```json
"simplify_ignore": {
  "enabled": true,
  "state_file": ".simplify-ignore-state.json",
  "config_file": "simplify-ignore.json",
  "comment_patterns": ["simplify-ignore-start", "simplify-ignore-end"]
}
```

**Integração com hook profiles:**
- hookId: `simplify-ignore`
- Ativo em: `standard`, `strict`
- Desativado em: `minimal`
- Adicionar ao `hook_profiles.profiles.minimal.disabled` em config.json

### Artefatos

| Arquivo | Mudança |
|---|---|
| `hooks/scripts/simplify-ignore.mjs` | Novo hook |
| `hooks/hooks.json` | +entries em PreToolUse e PostToolUse |
| `hooks/config.json` | +seção simplify_ignore, +minimal disabled entry |
| `README.md` | hook na tabela com coluna Profile |

---

## Feature 3: Source-Driven Development

### Problema

O agente toma decisões sobre frameworks e libs baseado em training data que pode estar desatualizado, sem verificar docs oficiais. Isso gera código que usa APIs deprecated ou patterns obsoletos.

### Solução

Policy independente com hierarquia de fontes + integração no orchestrator.

**Policy (`policies/source-driven.md`):**

**Hierarquia de fontes (obrigatória para decisões de framework/lib):**
1. Documentação oficial (docs site, README do repo, API reference)
2. Changelogs / Release notes da versão em uso
3. MDN / specs oficiais (para web APIs)
4. GitHub issues do repo da lib (para bugs e workarounds)
5. **Nunca aceitar sem fonte:** StackOverflow, blog posts aleatórios, respostas de IA sem citação

**Regras:**
1. Toda decisão de API, config, ou pattern de framework deve ser respaldada por doc oficial buscada via Context7 MCP, web search, ou leitura direta de docs
2. Citação inline obrigatória: `[fonte: Next.js docs/app-router/routing]` no output quando recomendando API/config
3. Se doc oficial não encontrada → flag para o usuário: "Não encontrei doc oficial para X. Prosseguir com base em conhecimento geral ou buscar alternativa?"
4. Verificar versão: doc da v15 não vale para projeto em v13. Sempre checar versão do projeto antes de buscar
5. Exceções: patterns genéricos de linguagem (loops, types, etc.) não precisam de fonte — apenas uso específico de libs/frameworks

**Integração no orchestrator (skill 09):**

Adicionar ao protocolo de execução:
- Para tasks de integração/framework: após search-first, verificar se decisões de API/config passaram por source verification
- Se task envolve lib/framework: adicionar "source-driven verification" como step obrigatório antes de delegar para implementação
- Orchestrator pode usar Context7 MCP (`resolve-library-id` → `query-docs`) para buscar docs automaticamente

### Artefatos

| Arquivo | Mudança |
|---|---|
| `policies/source-driven.md` | Novo arquivo |
| `skills/09-orchestrator/SKILL.md` | +source verification no protocolo |
| `README.md` | menção na seção Governança |

---

## Feature 4: Idea Refinement Frameworks

### Problema

A skill 01 (PO Feature Spec) parte direto para especificação sem fase divergente de ideação. Para features ambíguas ou inovadoras, falta um vocabulário estruturado de exploração.

### Solução

Library de 4 frameworks de ideação como skill-guide, referenciada pela skill 01.

**Arquivo:** `docs/skill-guides/ideation-frameworks.md`

**4 frameworks com template de uso:**

**1. SCAMPER:**
- **Quando usar:** melhorar feature existente, encontrar variações
- **Template:** Para cada letra (Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse), gerar 1-2 ideias aplicadas ao problema
- **Exemplo:** "Feature de busca → Eliminate: o que acontece se removermos filtros e usarmos apenas NLP?"

**2. How Might We (HMW):**
- **Quando usar:** reformular problemas como oportunidades, desbloquear quando o time está travado
- **Template:** "Como poderíamos [ação desejada] sem [restrição atual]?"
- **Exemplo:** "Como poderíamos onboar usuários sem exigir cadastro completo?"

**3. First Principles:**
- **Quando usar:** resolver problema não-óbvio, questionar suposições do domínio
- **Template:** 1) Listar suposições, 2) Questionar cada uma, 3) Reconstruir sem suposições falsas
- **Exemplo:** "Suposição: precisamos de um banco relacional → Questão: os dados são realmente relacionais? → Reconstrução: event store pode ser mais adequado"

**4. Jobs To Be Done (JTBD):**
- **Quando usar:** entender motivação do usuário, priorizar features por impacto
- **Template:** "Quando [situação], quero [ação], para que [resultado esperado]"
- **Exemplo:** "Quando estou revisando um PR grande, quero ver só os arquivos que mudaram lógica, para que eu não perca tempo com formatação"

**Referência na skill 01 (PO Feature Spec):**

Adicionar seção:
```markdown
## Fase Divergente (Opcional)

Para features ambíguas ou inovadoras, use os frameworks de ideação antes de especificar:
→ `docs/skill-guides/ideation-frameworks.md`

Quando usar:
- Requisito vago ("melhore a experiência de busca")
- Feature sem referência clara no mercado
- Stakeholder indeciso entre abordagens
```

### Artefatos

| Arquivo | Mudança |
|---|---|
| `docs/skill-guides/ideation-frameworks.md` | Novo arquivo |
| `skills/01-po-feature-spec/SKILL.md` | +seção Fase Divergente |
| `README.md` | menção nos skill-guides |

---

## Feature 5: Confusion Management Protocol

### Problema

Quando o agente encontra requisitos contraditórios, scope indefinido, ou informação ausente, ele tende a adivinhar ou fazer suposições silenciosas em vez de parar e perguntar. Isso gera implementações que não correspondem à intenção do usuário.

### Solução

Policy independente com protocolo de 4 passos.

**Policy (`policies/confusion-management.md`):**

**Protocolo STOP-NAME-OPTIONS-WAIT:**

1. **STOP** — parar execução imediatamente. Não gerar código, não tomar decisões.
2. **NAME** — declarar explicitamente o que está confuso:
   - "Requisitos A e B se contradizem"
   - "Scope não definido para X"
   - "Dependência Y não encontrada"
   - "Instrução Z é ambígua — pode significar W1 ou W2"
3. **OPTIONS** — apresentar 2-3 interpretações possíveis com trade-offs e consequências de cada uma
4. **WAIT** — não prosseguir até o usuário escolher. Silêncio não é consentimento.

**Sinais de confusão (quando ativar):**
- Requisitos contraditórios no prompt ou entre prompt e CLAUDE.md
- Scope indefinido ("faça o necessário" sem contexto suficiente)
- Dependência de informação ausente (API key, endpoint, schema)
- Conflito entre estado do código e instrução do usuário
- Task que implica destruição de trabalho existente sem confirmação

**Template de output:**

```
⚠ Confusão detectada: [descrição clara do problema]

Interpretações possíveis:
A) [interpretação] → [consequência se escolhida]
B) [interpretação] → [consequência se escolhida]
C) [interpretação, se aplicável] → [consequência]

Qual caminho seguir?
```

**O que NÃO é confusão (não ativar):**
- Decisão técnica com solução clara (escolher entre 2 libs onde uma é objetivamente melhor)
- Detalhes de implementação dentro do scope definido
- Formatação ou estilo de código coberto por linter/config existente

### Artefatos

| Arquivo | Mudança |
|---|---|
| `policies/confusion-management.md` | Novo arquivo |
| `README.md` | menção na seção Governança |

---

## Mudanças Transversais

### README.md

- **Hook System table:** adicionar `simplify-ignore` com coluna Profile
- **Governança:** adicionar `policies/anti-rationalization.md`, `policies/source-driven.md`, `policies/confusion-management.md`
- **Skill Guides:** mencionar `ideation-frameworks.md`
- **Timestamp Log:** entrada 2026-04-13

### config.json

- Seção `simplify_ignore` (Feature 2)
- Entry `simplify-ignore` em `minimal.disabled` (Feature 2)

### hooks.json

- `simplify-ignore.mjs` em PreToolUse e PostToolUse (Feature 2)

---

## Ordem de Implementação Recomendada

1. **Anti-Rationalization Tables** — policy + 5 skill edits (base conceitual)
2. **Confusion Management Protocol** — policy independente
3. **Source-Driven Development** — policy + orchestrator edit
4. **Idea Refinement Frameworks** — skill-guide + skill 01 edit
5. **Simplify-Ignore Hook** — hook complexo (usa infra de profiles já existente)
6. **README + timestamp** — atualização final

Cada feature pode ser commitada independentemente.
