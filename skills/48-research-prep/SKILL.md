---
name: research-prep
description: |
  Coleta e organiza informacao tecnica multi-fonte antes de escrever docs, PRDs, ADRs ou artigos.
  Busca em: docs oficiais, GitHub (repos + issues), Stack Overflow, papers e blogs de referencia.
  Ranqueia fontes por autoridade (oficial 40% + recencia 30% + profundidade 20% + comunidade 10%).
  Output: memory/research/<slug>.md pronto para alimentar as skills documenter, po-feature-spec,
  prompt-engineer ou blog-publisher.
  Trigger em: "pesquisa tecnica", "levanta informacao", "coleta docs", "busca referencias",
  "preciso de fontes", "research antes de escrever", "levanta o que existe sobre",
  "benchmark de solucoes", "o que existe sobre X", "quero entender o estado da arte",
  "compara abordagens", "levanta referencias", "faz um research de", "coleta fontes sobre",
  "pesquisa sobre", "quero saber o que existe de", "monta um dossie tecnico",
  "background tecnico", "due diligence tecnica", "levantamento de alternativas".
allowed-tools: WebSearch, WebFetch, Bash, Read, Write, Grep, Glob
metadata:
  argument-hint: "<topico> [--depth quick|deep] [--output <slug>]"
---

# Research Prep — Coleta Técnica Multi-Fonte

> **Princípio:** Escrever sem pesquisar é opinar sem evidência. Esta skill coleta, ranqueia e
> estrutura fontes antes que qualquer skill de produção (docs, PRD, blog, prompt) comece a redigir.
> Baseada em padrões de [addozhang/openclaw-forge](https://github.com/addozhang/openclaw-forge) (MIT).
> O ledger de evidências/claims e o gate de verificação de citação (Fase 3.5) foram adaptados de
> [199-biotechnologies/claude-deep-research-skill](https://github.com/199-biotechnologies/claude-deep-research-skill).
> O Pre-Flight de qualidade de query (Fase 1.5) e o modo de scoring por engajamento (Fase 3) foram
> adaptados de [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill).

## Quando Usar

- antes de escrever doc técnico, ADR, artigo ou PRD sobre tecnologia não dominada
- ao comparar alternativas (frameworks, libs, abordagens arquiteturais)
- ao fazer due diligence técnica de uma decisão (ex: "vamos adotar X?")
- quando o usuário diz "levanta o que existe sobre", "pesquisa antes de escrever", "quero fontes"
- como prerequisito de skills 10 (documenter), 01 (po-feature-spec), 26 (prompt-engineer), 41 (blog-publisher)

## Quando NÃO Usar

- tópico trivial que qualquer dev sênior do projeto já sabe de cor
- pesquisa já existe em `memory/research/<slug>.md` com menos de 7 dias (verificar cache)
- task é puramente de implementação sem necessidade de contexto externo
- usuário quer pesquisa de mercado / negócio (não é foco desta skill — é foco da 29 design-intelligence)

## Distinção de Skills Similares

| Skill | Foco | Output |
|-------|------|--------|
| 18 (repo-auditor) | Stack e frameworks do projeto atual | `docs/repo-audit/current.md` |
| 29 (design-intelligence) | Benchmark competitivo de produto/UX | Dossier estratégico |
| 33 (detective-spec) | Regras de negócio em código legado | `_detective_sdd/` |
| **48 (research-prep)** | **Fontes técnicas externas ranqueadas** | `memory/research/<slug>.md` |

## Governança Global

Esta skill segue `GLOBAL.md`, `policies/token-efficiency.md`, `policies/source-driven.md`,
`policies/persistence.md`, `policies/handoffs.md`.

## Protocolo

### Fase 0 — Cache Check

```bash
# Verificar se pesquisa recente já existe
ls memory/research/ 2>/dev/null
# Se existir <slug>.md com menos de 7 dias → reportar ao usuário e perguntar se quer re-pesquisar
```

Se cache válido (<7 dias), pular para Fase 4 diretamente.

### Fase 1 — Clarificação do Escopo

Antes de pesquisar, definir:

1. **Tópico central** — uma frase que descreve o que se quer saber
2. **Profundidade:**
   - `--depth quick` (padrão): 30-45 min — docs oficiais + 2-3 repos + top SO threads
   - `--depth deep`: 60-90 min — fontes primárias + comparativos + papers + blogs de referência
3. **Audiência do output final** — dev sênior? PO? stakeholder técnico? (afeta o que destacar)
4. **Slug do output** — nome do arquivo em `memory/research/` (ex: `opentelemetry-node`, `pgvector-vs-pinecone`)

Se o usuário não especificou profundidade, assumir `quick`.

### Fase 1.5 — Pre-Flight de Qualidade da Query

Antes de gastar tempo de busca, checar se o tópico tem risco alto de research raso:

- **Termo ambíguo demais** — a query bate em múltiplos domínios não relacionados (ex.: "cache" sem contexto pode ser CPU cache, cache de HTTP, ou cache de CDN). Se sim, restringir o termo com o domínio explícito antes de buscar.
- **Janela temporal sem conteúdo** — tecnologia lançada há menos de 1 mês tem pouca fonte de terceiros; ajustar expectativa de confiança para `low` de antemão, e priorizar fonte oficial e changelog.
- **Keyword trap** — termo popular que satura a busca com conteúdo de marketing/SEO em vez de conteúdo técnico (ex.: nome de produto comercial que também é palavra comum). Se sim, adicionar termos técnicos que filtrem ruído (`site:github.com`, nome de API específica).

Se qualquer sinal acima disparar, ajustar a query ou o escopo **antes** da Fase 2, não depois de já ter gasto o orçamento de busca.

### Fase 2 — Coleta Multi-Fonte

Executar em paralelo quando possível. Adaptar as queries ao tópico.

#### 2a. Documentação Oficial

Buscar usando operador `site:` para garantir fontes primárias:

```
site:docs.<tecnologia>.io <tópico>
site:developer.<tecnologia>.com <tópico>
site:github.com/<org>/<repo> <tópico>
```

Ler páginas de:
- Getting Started / Overview
- Conceitos core relevantes ao tópico
- Migration guides se aplicável
- Release notes / changelog para versão atual

#### 2b. GitHub — Repos e Issues

```bash
# Repos com mais stars sobre o tópico
gh search repos "<topico>" --sort stars --limit 10 --json name,description,stargazerCount,url

# Issues abertas relevantes (bugs conhecidos, limitações)
gh search issues "<topico> <problema>" --limit 5 --json title,url,body
```

Verificar:
- README dos top 3 repos (pontos fortes, limitações admitidas)
- Issues com label `bug` ou `limitation` (problemas reais de produção)
- Discussions sobre casos de uso edge

#### 2c. Stack Overflow

Buscar threads com alto score sobre o tópico:

```
site:stackoverflow.com "<topico>" <aspecto-especifico>
```

Filtros úteis: `is:answer score:10` para respostas consolidadas pela comunidade.

Focar em:
- Perguntas com muitos votos (problema comum)
- Respostas aceitas com exemplos de código
- Comentários que contradizem a resposta aceita (gotchas)

#### 2d. Deep mode — Papers e Blogs de Referência (apenas `--depth deep`)

Fontes adicionais:
- `site:arxiv.org <topico>` para tecnologias com base acadêmica
- Blogs de engenharia de referência: Cloudflare Blog, Netflix Tech Blog, Uber Engineering, Martin Fowler, High Scalability
- `site:news.ycombinator.com <topico>` para discussões técnicas densas

### Fase 3 — Authority Scoring

Para cada fonte coletada, calcular score de autoridade (0-10):

| Dimensão | Peso | Critérios |
|----------|------|-----------|
| **Fonte oficial** | 40% | Docs do mantenedor, repo oficial, RFC/spec = 10; blog terceiro = 5; anônimo = 0 |
| **Recência** | 30% | <3 meses = 10; <1 ano = 7; <3 anos = 4; >3 anos = 1 |
| **Profundidade** | 20% | Exemplo completo + explicação = 10; só conceito = 5; superficial = 2 |
| **Comunidade** | 10% | >1000 stars/votos = 10; >100 = 7; >10 = 4; <10 = 1 |

**Score final = (oficial×0.4) + (recência×0.3) + (profundidade×0.2) + (comunidade×0.1)**

Descartar fontes com score < 4.0. Ranquear as demais.

**Checkpoint:** se restarem menos de 3 fontes acima de 4.0, isso é sinal de que a Fase 2 coletou pouco ou de baixa qualidade — voltar e ampliar a busca (mais termos, mais `site:`) antes de aceitar um research raso. Não afrouxar o threshold de 4.0 pra "ter fonte suficiente" — a régua existe pra filtrar ruído, não pra ser contornada quando incomoda.

### Fase 3 — Modo Alternativo: Scoring por Engajamento

O Authority Scoring acima ranqueia por autoridade oficial — o eixo certo para "qual é a forma correta de usar essa API". Para perguntas sobre **percepção recente ou sentimento da comunidade** ("o que devs estão achando de X", "essa lib está sendo abandonada?", "qual a reação ao release Y"), autoridade oficial é o eixo errado — o fabricante nunca vai dizer que o próprio produto está com problema.

Usar este modo alternativo quando o tópico pedir sentimento/recência em vez de correção técnica:

| Dimensão | Peso | Critérios |
|----------|------|-----------|
| **Engajamento recente** | 50% | Discussão com atividade nos últimos 30 dias = 10; últimos 6 meses = 5; mais antigo = 1 |
| **Volume de reação** | 30% | Muitos upvotes/comentários/reações = 10; moderado = 5; isolado = 1 |
| **Diversidade de fonte** | 20% | Mesmo ponto aparece em 3+ threads/plataformas independentes = 10; só 1 fonte = 2 |

Não misturar os dois scores no mesmo relatório — declarar no frontmatter do output qual modo foi usado (`scoring_mode: authority|engagement`), porque mudam o que "fonte boa" significa.

### Fase 3.5 — Ledger de Evidências e Verificação de Citação

Antes de escrever o output final, montar um ledger que separa claim de evidência de fonte — isso é o que permite auditar depois se uma afirmação do research realmente veio de algum lugar, em vez de ter sido sintetizada com confiança excessiva.

Persistir em `memory/research/<slug>.evidence.jsonl` (uma linha por entrada, append-only):

```jsonl
{"type": "source", "id": "s1", "url": "https://docs.exemplo.com/api", "title": "...", "score": 8.5}
{"type": "evidence", "id": "e1", "source_id": "s1", "quote": "trecho exato citado", "locator": "seção 'Rate Limits'"}
{"type": "claim", "id": "c1", "text": "a API limita 100 req/min por padrão", "evidence_ids": ["e1"], "status": "supported"}
```

**Gate de verificação antes de aceitar uma claim como `supported`:**
- a citação (`quote`) existe literalmente na fonte, não é paráfrase apresentada como citação direta
- se a fonte é um paper ou tem DOI, o título e ano citados batem com o registro real (não confiar em título/ano lembrados de memória — checar contra a fonte)
- uma claim sem `evidence_ids` correspondente não pode ir para o output final como afirmação categórica — vira `status: unsupported` e entra em "Gaps Identificados", não em "Recomendação"

Esse ledger é o que sustenta a seção `## Fontes Ranqueadas` do output — cada trecho citado ali deve rastrear de volta a uma entrada `evidence` real neste arquivo.

### Fase 4 — Produção do Output

Salvar em `memory/research/<slug>.md`:

```markdown
---
topic: <tópico>
slug: <slug>
researched_at: YYYY-MM-DD
depth: quick|deep
scoring_mode: authority|engagement
confidence: high|medium|low
sources_collected: N
sources_kept: M (score >= 4.0)
evidence_ledger: memory/research/<slug>.evidence.jsonl
---

# Research: <Tópico>

> Gerado por skill 48 (research-prep). Re-pesquisar com `--update` após 7 dias.

## TL;DR (3-5 bullets)

- <achado mais importante>
- <segundo mais importante>
- <terceiro>
- <limitação principal>
- <recomendação de abordagem>

## Fontes Ranqueadas

### [Score: X.X] <Título da Fonte>

**URL:** <url>  
**Tipo:** Documentação oficial | GitHub repo | SO thread | Blog | Paper  
**Data:** <data ou estimativa>  

**Resumo:** <2-3 frases do que esta fonte cobre>

**Trecho relevante:**
> "<citação direta ou parafraseada do ponto mais importante>"

**Gotchas / Limitações mencionados:**
- <se houver>

---

### [Score: X.X] <Segunda fonte>

... (repetir para top 5-8 fontes)

## Comparativo de Abordagens (se aplicável)

| Abordagem | Prós | Contras | Quando usar |
|-----------|------|---------|-------------|
| <A> | | | |
| <B> | | | |

## Gaps Identificados

Temas relevantes que não encontraram fontes de qualidade:
- <gap 1 — marcar como confidence: low>

## Recomendação

<1 parágrafo com recomendação baseada nas fontes. Sempre ancorada em evidência — citar fonte específica.>
```

**Nível de confiança:**
- `high`: fontes primárias recentes, consenso claro entre fontes
- `medium`: fontes mistas, alguma contradição ou desatualização
- `low`: poucas fontes, tópico muito novo ou muito nicho

## Output Mínimo

Ao final, reportar:

```
Research Prep — <tópico>
Fontes coletadas: N | Fontes mantidas (score ≥4.0): M
Profundidade: quick|deep
Confiança: high|medium|low
Salvo em: memory/research/<slug>.md

Top 3 achados:
1. <mais importante>
2. <segundo>
3. <terceiro>

Próximo passo sugerido: skill 10 (documenter) | skill 01 (po-feature-spec) | skill 41 (blog-publisher)
```

## Handoffs

- **→ skill 10 (documenter):** passar `memory/research/<slug>.md` como fonte de verdade para documentação técnica
- **→ skill 01 (po-feature-spec):** contexto de "o que existe" antes de especificar feature que usa a tecnologia
- **→ skill 26 (prompt-engineer):** benchmarks de modelos/prompts antes de escrever prompt de produção
- **→ skill 41 (blog-publisher):** rascunho estruturado com fontes antes de escrever artigo
- **→ skill 29 (design-intelligence):** complemento — enquanto 48 faz research técnico, 29 faz benchmark de produto/UX

## Anti-padrões

- ❌ Inventar fontes — toda afirmação deve ter URL real (policy `source-driven.md`)
- ❌ Copiar conteúdo sem atribuição — resumir e citar, nunca reproduzir integralmente
- ❌ Guardar fontes com score < 4.0 no output — ruído piora a qualidade do research
- ❌ Re-pesquisar sem checar cache — Fase 0 existe para isso
- ❌ Entrar em profundidade demais num subtópico — manter foco no tópico central definido na Fase 1
- ❌ Recomendar sem evidência — toda recomendação deve citar pelo menos 1 fonte ranqueada
- ❌ Marcar claim como `supported` sem checar o `quote` contra o texto real da fonte — paráfrase apresentada como citação direta é o erro mais comum do ledger
