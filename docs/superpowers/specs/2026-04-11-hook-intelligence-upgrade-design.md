# Hook Intelligence Upgrade — Design Spec

**Data:** 2026-04-11
**Status:** aprovado
**Escopo:** 5 features que elevam a inteligência do sistema de hooks e policies

---

## Visão Geral

Cinco melhorias no sistema de hooks e policies para dar mais controle ao usuário, melhorar a qualidade dos learned-skills, forçar pesquisa antes de implementação, padronizar retrieval em subagents, e tornar a gestão de contexto proativa.

| # | Feature | Artefatos principais | Esforço |
|---|---|---|---|
| 1 | Hook Profiles | utils.mjs, config.json | Baixo |
| 2 | Confidence Scoring | keyword-detector.mjs, config.json | Médio |
| 3 | Search-first Policy | policies/search-first.md, skill 09 | Baixo |
| 4 | Iterative Retrieval | policies/iterative-retrieval.md | Baixo |
| 5 | Strategic Compact | context-guard-stop.mjs, config.json | Baixo |

---

## Feature 1: Hook Profiles

### Problema

Hooks são "tudo ou nada" — não dá pra ajustar verbosidade ou desligar hooks individuais sem editar hooks.json.

### Solução

Env vars + config.json com 3 profiles pré-definidos.

**Precedência:** `DEVKIT_HOOK_PROFILE` env var → `config.hook_profiles.active` → `"standard"` fallback.

**Config (hooks/config.json):**

```json
"hook_profiles": {
  "active": "standard",
  "disabled": [],
  "profiles": {
    "minimal": {
      "disabled": ["pre-execution-gate", "keyword-detector", "post-tool-verifier", "model-routing-hook"]
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
}
```

**Novas funções em utils.mjs:**

- `getActiveProfile()` — resolve profile ativo (env > config > "standard")
- `isHookDisabled(hookId)` — checa `DEVKIT_DISABLED_HOOKS` (comma-separated) UNION com profile disabled list (ambos aplicam)
- `getProfileOverrides(section)` — retorna overrides do profile ativo para uma seção de config
- `readHookConfig(section, defaults)` evolui: aplica profile overrides por cima dos defaults

**hookId** = nome do script sem `.mjs`: `pre-execution-gate`, `keyword-detector`, `context-guard-stop`, `persistent-mode`, `pre-tool-enforcer`, `session-start`, `post-tool-verifier`, `model-routing-hook`.

**Cada hook** chama `isHookDisabled("meu-id")` no início — se disabled, retorna `{ continue: true }` imediatamente.

### Artefatos

| Arquivo | Mudança |
|---|---|
| `hooks/scripts/utils.mjs` | +3 funções, evolução de readHookConfig |
| `hooks/config.json` | +seção hook_profiles |
| Todos os 8 hooks em `hooks/scripts/` | +guard isHookDisabled no início |
| `README.md` | seção Hook System atualizada |

---

## Feature 2: Confidence Scoring nos Learned Skills

### Problema

Learned-skills são injetados por keyword match simples sem considerar utilidade. Skills velhos e inúteis competem com skills relevantes pelo limite de 3 por sessão.

### Solução

Score de confiança com boost on use, decay temporal, e auto-archive.

**Config (hooks/config.json):**

```json
"learned_skills_scoring": {
  "initial_score": 0.7,
  "boost_on_use": 0.1,
  "decay_per_week": 0.1,
  "archive_threshold": 0.3,
  "archive_dir": ".archive"
}
```

**Frontmatter do learned-skill (evolução):**

```markdown
---
name: fix-prisma-migrations
triggers: [prisma, migration, schema]
score: 0.7
last_used: 2026-04-11
created: 2026-04-08
uses: 0
---
```

**Lógica no keyword-detector.mjs:**

1. `loadLearnedSkills()` evolui: lê `score`, `last_used`, `created` do frontmatter
2. Score efetivo = `score - (weeks_since_last_used * decay_per_week)`
3. Se score efetivo < `archive_threshold` → move para `.bot/learned-skills/.archive/` → não injeta
4. Ao injetar: `score += boost_on_use`, `last_used = today`, `uses += 1` → reescreve frontmatter
5. Injeção ordenada por score decrescente — top-N pelo limite `max_learned_skills_per_session`
6. Migração: learned-skills sem frontmatter de score recebem `initial_score` e `created: today`

### Artefatos

| Arquivo | Mudança |
|---|---|
| `hooks/scripts/keyword-detector.mjs` | score calculation, auto-archive, frontmatter rewrite, sort by score |
| `hooks/config.json` | +seção learned_skills_scoring |
| `README.md` | seção Learned Skills atualizada |

---

## Feature 3: Search-First Policy

### Problema

O agente tende a implementar direto sem pesquisar docs, APIs, exemplos, ou estado atual do código. Isso gera retrabalho e código que não segue patterns existentes.

### Solução

Policy independente + integração no Orchestrator como etapa obrigatória antes de implementação.

**Policy (policies/search-first.md):**

Regras:
1. **Antes de implementar, pesquise.** Toda task de implementação exige pelo menos uma etapa de pesquisa: ler docs existentes, consultar `repo-audit/current.md`, buscar patterns no código, ou consultar docs externas (Context7 MCP, web search).
2. **Pesquisa mínima por tipo:**
   - Nova feature → ler docs/repo-audit, buscar patterns similares no código, consultar docs da lib se aplicável
   - Bug fix → ler logs/error, buscar ocorrências do pattern, entender fluxo antes de mudar
   - Integração → consultar docs da API/lib, verificar versão, buscar exemplos
   - Refactor → mapear dependências, buscar usages, entender impacto
3. **Output da pesquisa:** não precisa de documento formal — o resultado é contexto injetado na task. Se relevante, persistir em `docs/context/`.
4. **Exceções:** hotfixes críticos podem pular pesquisa se o fix é trivial e isolado.

**Integração no Orchestrator (skill 09):**

Adicionar etapa "Pesquisa" no protocolo de execução, entre classificação e delegação:
- Após classificar a task e definir pipeline, o orchestrator verifica se pesquisa é necessária
- Para tasks de implementação/integração/refactor: pesquisa é obrigatória
- Para hotfixes triviais: pesquisa é opcional
- A pesquisa usa: `docs/repo-audit/current.md`, Glob/Grep no código, Context7 MCP para libs, web search para APIs externas

### Artefatos

| Arquivo | Mudança |
|---|---|
| `policies/search-first.md` | Novo arquivo |
| `skills/09-orchestrator/SKILL.md` | +etapa de pesquisa no protocolo de execução |
| `README.md` | menção na seção Governança |

---

## Feature 4: Iterative Retrieval Policy

### Problema

Subagents recebem contexto em dump completo (tudo de uma vez) ou insuficiente (ficam cegos). Não há padrão para refinamento progressivo de contexto.

### Solução

Policy independente definindo o pattern de retrieval em rounds.

**Policy (policies/iterative-retrieval.md):**

### O Pattern

Quando uma skill ou subagent precisa de contexto para executar uma task complexa, o retrieval deve ser progressivo:

**Round 1 — Orientação:**
- Ler `docs/repo-audit/current.md` (se existir)
- Glob para entender estrutura de diretórios relevante
- Identificar 3-5 arquivos-chave

**Round 2 — Foco:**
- Read dos arquivos-chave identificados no round 1
- Grep por patterns específicos da task
- Mapear dependências diretas

**Round 3 — Profundidade (se necessário):**
- Read de arquivos de dependência
- Busca de tests relacionados
- Consulta de docs externas (Context7, web)

### Regras

1. **Máximo 3 rounds** — se após 3 rounds o contexto ainda é insuficiente, escalar para o orchestrator
2. **Cada round deve ter objetivo claro** — "entender a estrutura" vs "mapear dependências" vs "validar approach"
3. **Não repetir reads** — se um arquivo já foi lido, não reler (a menos que tenha sido editado)
4. **Handoff entre rounds** — cada round termina com uma lista do que falta (gap list)
5. **Aplicável a:** subagents, skills delegadas, qualquer operação que precise de contexto incremental
6. **Não aplicável a:** tasks triviais (1 arquivo, scope claro), hotfixes isolados

### Formato de Handoff

```
Round N completo.
Contexto obtido: [lista]
Gaps restantes: [lista]
Próximo round necessário: sim/não
```

### Artefatos

| Arquivo | Mudança |
|---|---|
| `policies/iterative-retrieval.md` | Novo arquivo |
| `README.md` | menção na seção Governança |

---

## Feature 5: Strategic Compact

### Problema

O `context-guard-stop.mjs` atual só avisa em 75% com mensagem genérica "rode /compact". O usuário descobre tarde e não sabe o que preservar.

### Solução

Warning proativo em 50% + mensagem inteligente com orientação em 75%.

**Config (hooks/config.json) — evolução:**

```json
"context_guard": {
  "warn_threshold": 0.50,
  "block_threshold": 0.75,
  "max_blocks_per_session": 2,
  "strategic_compact": true
}
```

Mudança: `warn_threshold` desce de `0.60` para `0.50` e ganha comportamento ativo.

**Lógica no context-guard-stop.mjs:**

1. **Warning proativo (50-74%):** não bloqueia stop, mas injeta mensagem:
   ```
   ⚠ Contexto em {X}%. Considere /compact em breve.
   Sugestão: preserve o foco atual ({task_hint}) e descarte exploração anterior.
   ```

2. **Block inteligente (≥75%):** bloqueia stop e injeta mensagem contextualizada:
   ```
   🛑 Contexto em {X}%. Rode /compact antes de continuar.
   
   O que preservar:
   - Task atual: {task_hint derivado do último prompt}
   - Arquivos editados nesta sessão: {lista de paths do git diff}
   - Decisões pendentes: {se houver working set ativo}
   
   O que pode ser descartado:
   - Exploração de código já concluída
   - Outputs de ferramentas já processados
   - Contexto de skills anteriores no pipeline
   ```

3. **Task hint:** extraído do último prompt do usuário (primeiros 80 chars, sanitizado)

4. **Arquivos editados:** lidos via `child_process.execSync("git diff --name-only HEAD")` em try/catch — se falhar (não-git ou sem mudanças), a seção é omitida da mensagem

5. **Working set:** checa se `.bot/.working-set.json` existe e extrai decisões pendentes

### Artefatos

| Arquivo | Mudança |
|---|---|
| `hooks/scripts/context-guard-stop.mjs` | warning proativo + mensagem inteligente + task hint + git diff |
| `hooks/config.json` | warn_threshold: 0.50, +strategic_compact flag |
| `README.md` | seção Hook System atualizada |

---

## Mudanças Transversais

### README.md

- Seção **Hook System**: adicionar coluna "Profile" indicando em qual profile cada hook está ativo
- Seção **Hook System**: mencionar env vars `DEVKIT_HOOK_PROFILE` e `DEVKIT_DISABLED_HOOKS`
- Seção **Learned Skills**: mencionar confidence scoring e auto-archive
- Seção **Governança**: adicionar `policies/search-first.md` e `policies/iterative-retrieval.md`
- Seção **Strategic Compact**: mencionar warning proativo
- **Timestamp Log**: nova entrada 2026-04-11

### Policies referenciadas

- `policies/cost-optimization.md`: mencionar search-first e iterative-retrieval como complementares
- `policies/model-routing.md`: sem mudança

### Docs

- `docs/skill-guides/orchestrator-playbook.md`: mencionar etapa search-first

---

## Ordem de Implementação Recomendada

1. **Hook Profiles** (utils.mjs) — base que todos os outros hooks usam
2. **Strategic Compact** — evolui hook existente, depende de profiles
3. **Confidence Scoring** — evolui hook existente, depende de profiles
4. **Search-first Policy** — novo arquivo + edição no orchestrator
5. **Iterative Retrieval Policy** — novo arquivo independente
6. **README + timestamp** — atualização final

Cada feature pode ser commitada independentemente.
