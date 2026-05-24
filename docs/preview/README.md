# docs/preview — Insights Dashboard

POC standalone do dashboard de insights do Dev Team Kit. Visualiza, em um unico HTML, os seis snapshots que o kit ja produz: graph do graphify, resultado do bench, savings telemetry, drift scan, skill quality score e trigger eval.

## O que e

`dashboard.html` e um arquivo unico, sem build, sem npm, sem framework. Carrega Cytoscape.js + fcose via CDN (unpkg). Os dados sao 6 arquivos JSON em `dashboard-data/`, gerados pelo script de snapshot.

Seis abas:

- **Graph** — grafo interativo do `graphify-out/graph.json` (212 nodes, 251 links, 41 communities). Busca por label/arquivo, filtro por comunidade, detalhe por node.
- **Bench** — sumario + tabela do run mais recente em `docs/benchmarks/runs/*.json`.
- **Savings** — output de `scripts/savings-report.mjs --format json` (tokens economizados, USD, bugs prevenidos, sensores).
- **Drift** — output de `scripts/drift-scan.mjs --format json` (findings por severidade, por sensor).
- **Skill Quality** — output de `scripts/skill-quality-score.mjs --json` (heatmap de score por dimensao: frontmatter, structure, size, anti-ai, attribution). Click na linha expande o breakdown detail.
- **Trigger Eval** — output de `scripts/eval-triggers.mjs --json` (should % vs shouldn't %, ordenado pelas piores skills primeiro, com verdict pass/fail).

## Como rodar localmente

```bash
# 1. Gerar/atualizar os snapshots em docs/preview/dashboard-data/ (6 arquivos)
node scripts/build-dashboard.mjs

# 2a. Abrir direto no browser (file://) — funciona na maioria dos browsers
#     Mac/Linux: open docs/preview/dashboard.html
#     Windows: start docs/preview/dashboard.html

# 2b. Ou subir HTTP local (recomendado, evita CORS em alguns browsers)
cd docs/preview && python -m http.server 8000
# depois abrir http://localhost:8000/dashboard.html
```

## Flags do build script

```bash
node scripts/build-dashboard.mjs                                          # todas as 6 fontes
node scripts/build-dashboard.mjs --only graph,bench                       # subset
node scripts/build-dashboard.mjs --only skill-quality,trigger-eval        # so quality + eval
node scripts/build-dashboard.mjs --silent                                 # so exit code
node scripts/build-dashboard.mjs --help                                   # uso curto
```

Cada fonte falha de forma independente — se o `drift-scan` quebrar, o resto continua. Exit 0 se pelo menos uma fonte teve sucesso; exit 2 se todas falharam.

## Atualizar dados

Re-rodar `node scripts/build-dashboard.mjs` e dar reload no browser. Os snapshots sao um corte no tempo — nao ha auto-refresh.

## Limitacoes conhecidas

- **CORS em file://**: alguns browsers (Chrome com flags restritas) bloqueiam `fetch()` para arquivos locais. Se o dashboard ficar vazio ao abrir via `file://`, use `python -m http.server` ou equivalente.
- **CDN dependency**: precisa de internet pra carregar Cytoscape e fcose. Em ambiente offline, vendore os scripts manualmente.
- **Snapshot estatico**: nao reflete mudancas em tempo real. Re-rode o build script depois de qualquer alteracao relevante.
- **Sem persistencia de estado**: filtros e tab ativa nao sao salvos entre sessoes.

## Por que nao esta deployado

POC v2.18.x. A decisao de adocao formal (deploy, integracao no fluxo) esta documentada em [`docs/patterns/insights-dashboard-future.md`](../patterns/insights-dashboard-future.md). Resumo: validar utilidade antes de investir em build pipeline, CI e hosting.
