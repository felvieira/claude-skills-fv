---
name: research-prep
description: |
  Coleta e organiza informacao tecnica multi-fonte antes de escrever docs, PRDs, ADRs ou artigos.
  Busca em: docs oficiais, GitHub (repos + issues), Stack Overflow, papers e blogs de referencia.
  Ranqueia fontes por autoridade (oficial 40% + recencia 30% + profundidade 20% + comunidade 10%).
  Output: memory/research/<slug>.md pronto para alimentar skill 10 (documenter), skill 01 (po-feature-spec),
  skill 26 (prompt-engineer) ou skill 41 (blog-publisher).
  Trigger em: "pesquisa tecnica", "levanta informacao", "coleta docs", "busca referencias",
  "preciso de fontes", "research antes de escrever", "levanta o que existe sobre",
  "benchmark de solucoes", "o que existe sobre X", "quero entender o estado da arte",
  "compara abordagens", "levanta referencias", "faz um research de", "coleta fontes sobre",
  "pesquisa sobre", "quero saber o que existe de", "monta um dossie tecnico",
  "background tecnico", "due diligence tecnica", "levantamento de alternativas".
argument-hint: "<topico> [--depth quick|deep] [--output <slug>]"
allowed-tools: WebSearch, WebFetch, Bash, Read, Write, Grep, Glob
---

# Research Prep — Coleta Técnica Multi-Fonte

> **Princípio:** Escrever sem pesquisar é opinar sem evidência. Esta skill coleta, ranqueia e
> estrutura fontes antes que qualquer skill de produção (docs, PRD, blog, prompt) comece a redigir.
> Baseada em padrões de [addozhang/openclaw-forge](https://github.com/addozhang/openclaw-forge) (MIT).

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

### Fase 4 — Produção do Output

Salvar em `memory/research/<slug>.md`:

```markdown
---
topic: <tópico>
slug: <slug>
researched_at: YYYY-MM-DD
depth: quick|deep
confidence: high|medium|low
sources_collected: N
sources_kept: M (score >= 4.0)
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
