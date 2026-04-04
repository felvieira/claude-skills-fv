# Token Efficiency Tooling — Design Spec

**Data:** 2026-04-03
**Status:** Aprovado
**Abordagem:** Recomendacao leve com deteccao automatica via hooks

---

## Contexto

Agentes de coding gastam tokens massivamente na exploracao de codigo: multiplas chamadas de Grep, Read e Glob para entender estrutura, call paths e impacto. Ferramentas externas de code intelligence resolvem isso com grafos AST, symbol navigation e busca semantica — mas precisam de enforcement ativo para que o agente as prefira sobre ferramentas nativas.

Alem disso, o `docs/repo-audit/current.md` monolitico forca agentes a ler contexto irrelevante quando precisam de apenas uma fatia (rotas, schema, componentes).

## Decisoes

| Decisao | Escolha | Alternativas descartadas |
|---|---|---|
| Nivel de acoplamento | **A — Recomendacao leve** (detect + suggest via hook) | B — Wrappers no MCP (superficie de manutencao), C — Skill dedicada (overhead) |
| Repo-audit split | **B — Arquivos dinamicos** (auditor decide quais gerar) | A — 5 fixos (desperdicam tokens vazios), C — Monolitico com secoes (nao resolve leitura parcial) |

---

## Frente A: Acoplamento de 3 Ferramentas Externas

### A1. Ferramentas selecionadas

| Ferramenta | Tipo | O que faz | Token savings | Licenca | Stars |
|---|---|---|---|---|---|
| codebase-memory-mcp | MCP server | Knowledge graph AST (tree-sitter + SQLite), 14 MCP tools, 66 linguagens | ~120x | MIT | 1186 |
| cymbal | CLI | Symbol navigator (tree-sitter + SQLite), 24 linguagens | ~62-100% | MIT | 126 |
| ory/lumen | Claude plugin | Busca semantica local (Ollama embeddings + SQLite) | ~26-39% | Apache 2.0 | 127 |

**Complementaridade:** codebase-memory para grafo estrutural, cymbal para lookups rapidos, lumen para busca por significado. Nenhuma se sobrepoe.

**Descartado:** jcodemunch-mcp (95% token savings, mas licenca comercial $79-$1999).

### A2. Deteccao e Enforcement via Hook

O `pre-tool-enforcer.mjs` (PreToolUse) e expandido para detectar ferramentas disponiveis e injetar sugestoes.

**Fluxo:**

```
PreToolUse intercepta Read/Grep/Glob
  → le .bot/.env.tools (cache no escopo do script, leitura unica)
  → checa disponibilidade:
    1. codebase-memory-mcp → CODEBASE_MEMORY_AVAILABLE=1?
    2. cymbal → CYMBAL_AVAILABLE=1?
    3. lumen → LUMEN_AVAILABLE=1?
  → se alguma disponivel + tool e Read/Grep/Glob + intervalo > 30s:
    → injeta additionalContext com sugestao especifica
  → se nenhuma disponivel:
    → passa normal (zero impacto)
```

**Mensagem injetada (exemplo quando Grep e interceptado):**

```
Prefira ferramentas de code intelligence antes de Grep/Read bruto:
- search_graph (codebase-memory): busca estrutural por funcoes, classes, call paths
- cymbal investigate <symbol>: lookup rapido de simbolo com callers e impacto
- semantic_search (lumen): busca por significado, nao por texto literal
Use Grep apenas como fallback quando as ferramentas acima nao resolverem.
```

Apenas as ferramentas detectadas como disponiveis aparecem na mensagem.

**Anti-spam:** `min_suggestions_interval_ms: 30000` evita repeticao. Se ja sugeriu ha menos de 30s, nao repete.

### A3. Arquivo de disponibilidade

**`.bot/.env.tools`** — criado pelo install.sh, lido pelo hook:

```bash
# Gerado por setup/install.sh — nao editar manualmente
CODEBASE_MEMORY_AVAILABLE=1
CYMBAL_AVAILABLE=1
LUMEN_AVAILABLE=0
```

Vantagem sobre env vars do shell: persiste entre sessoes.

### A4. Config do hook

`hooks/config.json` ganha nova secao:

```json
{
  "code_exploration": {
    "suggest_on_tools": ["Read", "Grep", "Glob"],
    "min_suggestions_interval_ms": 30000,
    "env_file": ".bot/.env.tools"
  }
}
```

### A5. Policy de Code Exploration

Novo arquivo `policies/code-exploration.md` que define hierarquia para todos os agentes (Claude Code, Copilot, Windsurf, Gemini CLI).

**Hierarquia de 4 niveis:**

```
Nivel 1 — Graph (estrutural)     → codebase-memory: search_graph, trace_call_path, get_architecture
Nivel 2 — Symbol (tatico)        → cymbal: investigate, structure, impact, trace
Nivel 3 — Semantic (por intent)  → lumen: semantic_search
Nivel 4 — Bruto (fallback)       → Grep, Glob, Read nativo
```

**Regras:**

1. Sempre tente o nivel mais alto disponivel primeiro
2. Nivel 4 so quando 1-3 nao estao disponiveis ou nao resolveram
3. Nunca ler arquivo inteiro pra entender estrutura — use `get_architecture` ou `cymbal structure`
4. Nunca grep por nome de funcao pra achar callers — use `trace_call_path` ou `cymbal impact`
5. Se nenhuma ferramenta externa instalada, a policy nao muda nada — fallback normal

**Exemplos concretos:**

| Tarefa | Sem policy (hoje) | Com policy |
|---|---|---|
| Quem chama essa funcao? | Grep → Read 5 arquivos → Grep denovo | `trace_call_path` (1 call) |
| Como o repo esta organizado? | Glob → Read 10 arquivos | `get_architecture` (1 call) |
| Onde implementa autenticacao? | Grep "auth" → Read 8 matches | `semantic_search("authentication flow")` |
| Qual o impacto de mudar X? | Manual, incompleto | `cymbal impact X` (1 call) |

### A6. Install Flow — Step 8

O `setup/install.sh` ganha um Step 8 (depois do gitignore) que oferece instalacao opcional.

**Fluxo:**

```
Step 8: Ferramentas de Code Intelligence (opcional)

[1/3] codebase-memory-mcp (graph estrutural, 66 linguagens)
      Instalar? [s/N]
      → s: baixa binario, registra MCP em .claude/settings.json
      → n: pula

[2/3] cymbal (symbol navigator CLI, 24 linguagens)
      Instalar? [s/N]
      → s: docker pull ou go install, verifica no PATH
      → n: pula

[3/3] ory/lumen (busca semantica local, requer Ollama)
      Instalar? [s/N]
      → s: instala plugin via claude plugin add
      → n: pula

→ Gera .bot/.env.tools com status de cada ferramenta
→ Mostra resumo do que foi instalado
```

**Metodos de instalacao:**

| Ferramenta | Metodo primario | Fallback | Verificacao |
|---|---|---|---|
| codebase-memory-mcp | Script de install do repo (PowerShell/bash) | Download binario direto | `codebase-memory-mcp --version` |
| cymbal | `docker pull` (sem CGO) | `go install` se Go disponivel | `cymbal --version` ou `docker run cymbal version` |
| lumen | `claude plugin add ory/lumen` | Manual | `claude plugin list \| grep lumen` |

**Regras do step:**

1. Nunca bloqueia — N e o default, Enter pula
2. Nunca quebra o install — se falhar, loga warning e continua
3. Idempotente — se ja instalado, detecta e pula
4. Registra MCP automaticamente — codebase-memory entra em `.claude/settings.json` (mesmo merge logic existente)

---

## Frente B: Melhorias Internas de Token Efficiency

### B1. Repo-Audit Split Dinamico

O Repo Auditor (skill 18) passa a gerar arquivos focados por tipo, decidindo quais criar baseado no que encontra.

**Catalogo de arquivos possiveis:**

| Arquivo | Gerado quando | Conteudo |
|---|---|---|
| `current.md` | **sempre** | Stack, convencoes, riscos, gaps — indice enxuto com ponteiros |
| `routes.md` | detecta API routes (Express, Fastify, Next API, Django, etc.) | Endpoints por recurso, metodos HTTP, middlewares |
| `schema.md` | detecta ORM/schema (Prisma, Drizzle, TypeORM, migrations) | Models, campos-chave, relacoes FK |
| `components.md` | detecta framework de componentes (React, Vue, Svelte, Angular) | Arvore por feature, props, client/server |
| `services.md` | detecta camada de servicos/usecases | Servicos, dependencias, metodos publicos |
| `infra.md` | detecta Docker, CI/CD, terraform, k8s | Containers, pipelines, environments |

**Principios:**

1. **current.md continua como indice** — nunca cresce, aponta pros detalhados: `Ver routes.md para endpoints detalhados`
2. **So gera o que existe** — projeto CLI sem frontend = zero `components.md`
3. **Cada arquivo cabe em ~200 linhas** — se passar, o auditor resume mais
4. **Leitura parcial** — agente que precisa so de routes le so `routes.md`
5. **Geracao incremental** — so re-gera se arquivos relevantes mudaram (git diff)

**Token savings estimado:**

| Cenario | Hoje (monolitico ~500 linhas) | Com split |
|---|---|---|
| Agente precisa so de rotas | Le ~500 linhas | Le ~80 linhas de routes.md |
| Agente precisa de schema | Le ~500 linhas | Le ~60 linhas de schema.md |
| Full audit | Le ~500 linhas | Le current.md (~100 linhas) + arquivo relevante |

### B2. Mudancas na skill 18

O `skills/18-repo-auditor/SKILL.md` ganha secao "Output Split":

- Quais deteccoes ativam quais arquivos
- Formato compacto de cada arquivo (notacao curta, sem redundancia)
- Regra: current.md nunca duplica conteudo dos splits

---

## Atualizacoes em Arquivos Existentes

### GLOBAL.md

Nova linha na secao de eficiencia de contexto:

```
- Prefira ferramentas de code intelligence (graph, symbol, semantic) sobre Grep/Read bruto — ver `policies/code-exploration.md`
```

### README.md

Nova secao "Ferramentas de Code Intelligence (Opcionais)" depois da secao Hook System:

- Tabela com 3 ferramentas (nome, tipo, funcao, token savings, licenca)
- Referencia ao install.sh Step 8
- Referencia a `policies/code-exploration.md`

### policies/hooks.md

Nova secao "Code Exploration" no final:

- Resumo da hierarquia de 4 niveis
- Referencia a policy completa

### hooks/config.json

Nova secao `code_exploration` com thresholds configuráveis.

---

## Mapa de Artefatos

| Artefato | Acao | Depende de |
|---|---|---|
| `policies/code-exploration.md` | **criar** | — |
| `hooks/scripts/pre-tool-enforcer.mjs` | **expandir** | policies/code-exploration.md |
| `hooks/config.json` | **expandir** | — |
| `setup/install.sh` | **expandir** (Step 8) | — |
| `skills/18-repo-auditor/SKILL.md` | **expandir** (Output Split) | — |
| `policies/hooks.md` | **expandir** (Code Exploration) | policies/code-exploration.md |
| `GLOBAL.md` | **expandir** (1 linha) | policies/code-exploration.md |
| `README.md` | **expandir** (nova secao) | — |

## Grafo de Dependencias

```
policies/code-exploration.md (independente)
  ├── hooks/scripts/pre-tool-enforcer.mjs (depende da policy)
  ├── policies/hooks.md (referencia a policy)
  └── GLOBAL.md (referencia a policy)

hooks/config.json (independente)
  └── hooks/scripts/pre-tool-enforcer.mjs (le config)

setup/install.sh (independente)
  └── .bot/.env.tools (gerado pelo install)
      └── hooks/scripts/pre-tool-enforcer.mjs (le env.tools)

skills/18-repo-auditor/SKILL.md (independente)

README.md (independente)
```
