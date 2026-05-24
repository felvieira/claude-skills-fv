# Insights Dashboard + Multi-Agent Pipeline — Roadmap Futuro

**Data:** 2026-05-24
**Status:** Roadmap futuro — decisao consciente de adiar
**Autoria:** Dev Team Kit

## TL;DR

- Repo de referencia [Lum1104/Understand-Anything](https://github.com/Lum1104/Understand-Anything) (24.7k stars, MIT, TS) tem 2 capacidades que valem absorver: um dashboard web interativo e um pipeline multi-agent dedicado a entender codebase.
- Este doc separa as duas em parts independentes, descreve trade-offs de stack e propoe caminhos de adocao incremental.
- **Decisao atual:** nao executar nenhuma das duas agora. v2.17.0 entrega `/diff-impact` + auto-update hook. v2.18.x candidato e o dashboard fase 1. v3.0 candidato e a primeira skill do pipeline.
- Razoes para adiar: feature creep antes de validar demanda; risco de bloat (chegar perto do anti-padrao de kits com 300+ skills); refactor profundo das skills 18/33/38 tem custo alto e ROI nao comprovado.
- Este doc existe pra registrar o pattern e o vocabulario. Quando aparecer demanda concreta, reabrir com este texto como ponto de partida.

## O Que Motivou

[Lum1104/Understand-Anything](https://github.com/Lum1104/Understand-Anything) (MIT, TypeScript) chamou atencao por 2 aspectos:

1. **Interactive web dashboard** em `understand-anything.com/demo/` — visualizacao de graph forca-direcionada + busca fuzzy + UI persona-adaptativa + clustering por comunidade. Bem polido, mas e app TypeScript standalone com build pipeline pesado.

2. **Pipeline multi-agent** com 9 agentes dedicados a analise de codebase:
   - `file-analyzer`, `architecture-analyzer`, `domain-analyzer`
   - `project-scanner`, `tour-builder`, `knowledge-graph-guide`
   - `article-analyzer`, `assemble-reviewer`, `graph-reviewer`

O Dev Team Kit hoje tem:
- `graphify-out/graph.json` + `GRAPH_REPORT.md` (gerado pela lib externa `graphifyy`)
- Skills 18 (repo-auditor), 28 (claude-md-generator), 33 (detective-spec) — fazem analise de codebase mas nao geram graph proprio
- `bench/` com fixtures e `run.mjs`
- `analyze-doc/index.{en,pt-BR}.html` — relatorio HTML estatico com bench results

O kit e markdown + Node zero-dep. **Nao** e TypeScript app. **Nao** tem build pipeline. Qualquer absorcao precisa respeitar essa restricao.

## Parte 1 — Interactive Web Dashboard

### Objetivo

Visualizacao web unica dos insights que o kit ja produz: grafo do graphify, resultados do bench, telemetry de custo, savings report, drift-scan.

### Caso de Uso

- Mostrar pra time o estado do kit num glance
- Onboarding visual de quem chega no projeto
- Debug arquitetural — identificar god nodes, hot paths, modulos isolados
- Apresentacao em reviews de design ou postmortems

### O Que Renderizar

| Fonte de dado | Visualizacao | Frequencia de update |
|---|---|---|
| `graphify-out/graph.json` | Grafo forca-direcionada com clustering | Por commit (hook) |
| `bench/results/*.json` | Tabela + sparkline historico | Por release |
| `D:\claude-memory\logs\` (opcional) | Timeline de sessoes | Por sessao |
| `/savings` output | Tokens economizados, riscos prevenidos | Por sessao |
| `/drift-scan` output | Dead code, stale TODOs, doc drift | Por scan |

### Stack Candidatos

| Stack | Build complexity | Tamanho | Trade-off | Recomendacao |
|---|---|---|---|---|
| Static HTML + Cytoscape.js via CDN | Zero | ~100KB | Simples, integra direto com `graphify-out/graph.json` | **MVP Fase 1** |
| Static HTML + Vis-Network via CDN | Zero | ~150KB | Alternativa visual; menos features de layout | Backup |
| Vite + D3 + React | Alta (npm install, build step) | varia | Mais bonito, animacoes ricas, mas exige build pipeline | Rejeitado — vai contra kit zero-dep |
| Static HTML + Pyvis (pre-gerado offline) | Media (Python lib) | ~200KB output | Saida e HTML standalone, Python ja roda pra graphify | Backup se Cytoscape nao bastar |
| Astro + Tailwind | Alta (build + framework) | varia | Overkill pra dashboard interno | Rejeitado |

A escolha do MVP e **Static HTML + Cytoscape.js via CDN**. Razoes:

- Zero build — basta abrir o arquivo no navegador
- CDN ja resolve dependencias — sem `node_modules`
- Cytoscape tem clustering e fuzzy search via plugins (cytoscape-fcose, cytoscape-popper)
- `fetch('./graph.json')` resolve o data loading sem cerimonia
- Integra direto com o output que o `graphifyy` ja gera

### Custo de Manutencao

Cada feature nova do kit que produz output proprio (skill nova, novo report, novo formato de bench) potencialmente precisa atualizar o dashboard. Solucoes:

1. **Geracao automatica do dashboard a partir de `graphify-out/`** — escolha do tipo de visualizacao determinada por data shape, nao codigo novo. Exemplo: se `report.metric_type == 'timeseries'`, renderiza sparkline; se `'category'`, renderiza barchart.

2. **Schema fixo de input** — qualquer skill que queira aparecer no dashboard escreve em `dashboard-feeds/<skill-id>.json` no formato canonico. Skill nova so adiciona o arquivo; dashboard ja sabe ler.

3. **Auto-discovery** — dashboard escaneia `dashboard-feeds/` em build time, gera tabs dinamicas.

A opcao 1+2 combinadas dao baixo custo de manutencao. Skill nova nao toca em codigo do dashboard.

### Por Que NAO Fazer Agora

1. **Feature creep antes de validar demanda** — ninguem pediu. O kit funciona sem dashboard. Investir 8-15h em visualizacao que pode nao ter usuario e desperdicio.

2. **Dashboards externos ja existem** — o proprio `graphifyy` tem viewer integrado. VS Code tem extensoes pra visualizar JSON graphs. GitHub renderiza diagramas Mermaid. Nao e gap critico.

3. **Tempo investido melhor gasto em mais skills/policies** — uma skill nova entrega valor direto na proxima sessao. Dashboard entrega valor visual sem mover capacidade.

4. **Risco de criar dependencia em UI** — qualquer mudanca de output das skills passa a precisar de validacao no dashboard. Custo cumulativo sobe.

5. **Validacao de mercado primeiro** — perguntar nos proximos 30 dias se algum usuario quer ver graph visual. Se sim, fase 1.

### Caminho de Adocao Incremental

#### Fase 1 — Preview standalone (~3h)

Criar `docs/preview/dashboard-poc.html`:
- 1 arquivo HTML estatico
- `fetch('../../graphify-out/graph.json')` carrega data
- Cytoscape.js via CDN renderiza forca-direcionada
- Sem build, sem npm, sem nada — abre no browser direto
- Nao vira parte oficial do kit; vive em `docs/preview/` como demonstracao

Se o preview gerar feedback positivo (interno ou externo), avancar pra Fase 2. Se nao, deletar `docs/preview/dashboard-poc.html` sem custo.

#### Fase 2 — Build automatizado (~6h)

Se Fase 1 vingou:
- Mover pra `scripts/build-dashboard.mjs`
- Roda junto com o hook post-commit que ja regenera graphify
- Gera HTML estatico atualizado em `docs/dashboard/index.html`
- Adiciona ao README do kit como link "Ver dashboard atual"

#### Fase 3 — Tabs para outros outputs (~8h)

Se a base funcionar:
- Tab "Graph" (do fase 2)
- Tab "Bench" — le `bench/results/latest.json`, renderiza tabela + sparkline
- Tab "Savings" — le ultima saida do `/savings`
- Tab "Drift" — le ultima saida do `/drift-scan`

Cada tab e arquivo HTML independente carregado via iframe ou tab logic simples.

#### Fase 4 (opcional) — Deploy automatico

Se houver interesse externo:
- GitHub Action publica `docs/dashboard/` no GitHub Pages
- `claude-skills-fv.github.io/dashboard/` mostra estado atual do kit
- Usuarios externos veem evolucao publica

## Parte 2 — Pipeline Multi-Agent Para Analise Profunda

### Objetivo

Analise de codebase com profundidade maior que o graphify entrega sozinho. Graphify mapeia estrutura; este pipeline mapearia **intencao, dominio e roteiros de leitura**.

### O Que Os 9 Agents Do Lum1104 Fazem

| Agent | Responsabilidade |
|---|---|
| `file-analyzer` | Resumo per-file (proposito, exports principais, dependencias) |
| `architecture-analyzer` | Identifica camadas (API/Service/Data/UI/Utility) e fluxos entre elas |
| `domain-analyzer` | Mapeia codigo para processos de negocio (vocabulario do dominio) |
| `project-scanner` | Descoberta inicial — stack, convencoes, estrutura de pastas |
| `tour-builder` | Walkthroughs ordenados por dependencia (roteiro de leitura para humano novo) |
| `knowledge-graph-guide` | Orquestra os outros, monta narrativa coesa |
| `article-analyzer` | Para knowledge bases — extrai conceitos de textos longos |
| `assemble-reviewer` | QA do output assemblado |
| `graph-reviewer` | QA especifico do grafo gerado |

### Mapeamento Pro Nosso Kit

| Agent do Lum1104 | Equivalente no kit | Acao |
|---|---|---|
| `file-analyzer` | Pattern ja em skill 33 (detective-spec) | Reutilizar, talvez consolidar |
| `architecture-analyzer` | Skill 38 (architecture-deepener) | Enrichment — adicionar extracao automatica de layers |
| `domain-analyzer` | Skill 33 (detective-spec) | Adicionar subagent business-rules |
| `project-scanner` | Skill 18 (repo-auditor) | Ja cobre |
| `tour-builder` | NAO existe | **NOVA: skill 44 ou 45 — `onboarding-tour-builder`** |
| `knowledge-graph-guide` | Skill 09 (orchestrator) | Ja cobre (orquestrador geral do kit) |
| `article-analyzer` | Nao aplicavel direto | Skip — kit nao processa knowledge base de textos |
| `assemble-reviewer` | Skill 11 (reviewer) | Enrichment — review especifico de outputs de analise |
| `graph-reviewer` | Skill 11 (reviewer) | Enrichment — validacao de `graphify-out/` consistency |

### Por Que NAO Fazer Agora

1. **Refactor profundo das skills 18/33/38** — cada uma cresceria significativamente. Estimativa: ~12-20h so de refactor + testes de regressao.

2. **2 skills novas alem do refactor** — `tour-builder` e `domain-analyzer` em isolado. Estimativa adicional: ~6-10h.

3. **Integracao com graphify** — pipeline precisa ler `graphify-out/graph.json` e enriquecer com semantica. Acoplamento com lib externa que pode mudar API.

4. **Risco de bloat** — kit tem 42 skills hoje (sequência vai até ID 43; skill 16 foi deprecada). Adicionar 2-3 mais sem demanda comprovada caminha pra chegar perto do anti-padrao de kits com 300+ skills (ex: `alirezarezvani/claude-skills` com 329 skills — discovery vira problema, value-per-skill cai).

5. **Demanda nao validada** — ninguem pediu tour builder. Skill 28 (claude-md-generator) ja gera onboarding textual; faltam evidencias de que walkthrough visual interativo agrega.

### Caminho Incremental Sugerido

#### Fase 1 — 1 skill nova: `tour-builder` (~3-4h)

- Skill standalone que le `graphify-out/graph.json` e gera roteiro markdown ordenado por dependencia
- Output: arquivo `docs/onboarding-tour.md` com sequencia "leia primeiro X, depois Y, depois Z"
- ROI claro — usuario novo no repo sabe por onde comecar
- Sem dependencia de Fase 2 do dashboard
- Nao bloqueia nada — falha graceful se `graphify-out/` nao existir

#### Fase 2 — Enrichment da skill 38 (architecture-deepener) (~4h)

Quando Fase 1 provar valor:
- Adicionar subagent `layer-extractor` na skill 38
- Le grafo, identifica clusters por proximidade + naming patterns (`*Controller`, `*Service`, `*Repository`, `*View`)
- Output: anotacao em `graphify-out/layers.json` que outras skills podem consumir

#### Fase 3 — Skill nova: `domain-analyzer` (~4-6h)

Se Fases 1 e 2 vingaram:
- Le codigo + comentarios + nomes de modulo
- Mapeia para vocabulario de negocio (extrai termos recorrentes, agrupa por proximidade textual)
- Output: `docs/domain-glossary.md`
- Util pra projetos que crescem sem documentacao de dominio

#### Fase 4 — Integracao com dashboard (se dashboard existir)

- Tour vira tab "Onboarding"
- Layers viram colorizacao do grafo
- Domain glossary vira filtro lateral
- So executar se tanto pipeline quanto dashboard existirem

## Decisao Atual

| Versao | Entrega | Status |
|---|---|---|
| v2.17.0 (agora) | `/diff-impact` + auto-update post-commit hook | Em andamento nesta sessao |
| v2.18.x candidato | Dashboard MVP Fase 1 (HTML estatico + Cytoscape CDN) | Aguarda validacao de demanda |
| v3.0 candidato | Pipeline Fase 1 (skill `tour-builder`) | Aguarda dashboard ou demanda independente |

**Nao fazer ainda:**
- Dashboard com build pipeline (Vite/React/Astro)
- Refactor profundo das skills 18/33/38
- Mais que 1 skill nova por release

**Razoes consolidadas:**
- Validar demanda antes de investir ~20-40h cumulativos
- Manter kit zero-dep e markdown-first
- Evitar bloat (kit tem 42 skills hoje, sequência até ID 43; cada skill nova precisa justificar valor incremental)

## Fontes

- [Lum1104/Understand-Anything](https://github.com/Lum1104/Understand-Anything) — MIT, TypeScript, 24.7k stars
- Demo publico: `understand-anything.com/demo/`
- [Cytoscape.js](https://js.cytoscape.org/) — MIT, graph library para web
- [graphifyy](https://pypi.org/project/graphifyy/) — Python lib usada pelo kit (autor: terceiros, MIT)
- Doc relacionado: [`vertical-plugins.md`](./vertical-plugins.md) — padrao de empacotamento que afeta como features novas (incluindo dashboard) seriam distribuidas
- Doc relacionado: [`submodule-skills.md`](./submodule-skills.md) — pattern de sync de docs externas que poderia aplicar ao Cytoscape upstream se a dependencia crescer
