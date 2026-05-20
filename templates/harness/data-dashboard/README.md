# Harness Template — Data Dashboard

## Quando usar

Frontend de visualização de dados. Aplicações analíticas, BI interno, painéis operacionais. Padrões típicos:
- Múltiplas queries em paralelo (data fetching)
- Charts/visualizations (D3, recharts, plotly, victory)
- Filtros globais que afetam múltiplos widgets
- Tabelas grandes com paginação/virtualização
- Drill-down (linkar visualizações)

## Topology profile

```yaml
runtime: [react, vue, svelte, solid]
data_fetching: [react-query, swr, urql, apollo]
charts: [recharts, victory, d3, plotly, echarts]
table: [tanstack-table, ag-grid]
state: [zustand, jotai, redux, context]
build: [vite, next, remix, nuxt]
```

## Guides (feedforward)

### Convenções

- **Data loading com loading/error/empty states explícitos** (3-state pattern)
- **Skeleton loaders > spinners** para FCP melhor
- **Virtualização obrigatória** em tabelas > 100 rows
- **Memoização disciplinada** — useMemo/useCallback apenas onde profiling mostrou ganho
- **Query co-location** — queries perto de quem consome, não global
- **Filtros como URL params** — links compartilháveis

### Module boundaries

```
src/
├── features/<feature>/           ← um feature = uma view
│   ├── components/              ← componentes da feature
│   ├── hooks/                   ← queries, transformations
│   ├── widgets/                 ← visualizations específicas
│   └── index.tsx                ← entrypoint da feature
├── shared/
│   ├── charts/                  ← chart wrappers consistentes
│   ├── filters/                 ← filtros reutilizáveis
│   └── tables/                  ← table abstractions
└── api/                         ← clients de API
```

## Sensors (feedback)

### Fitness functions

```yaml
fitness_functions:
  - id: lcp-budget
    description: LCP < 2.5s em P75 de page loads
    type: performance
    runner: lighthouse
    budget:
      LCP: 2500ms
      FID: 100ms
      CLS: 0.1
    severity: high

  - id: bundle-size-budget
    description: Bundle inicial < 200KB gzip
    type: performance
    runner: bundlesize
    budget_kb: 200
    severity: high

  - id: a11y-AA-compliance
    description: WCAG AA via axe-core
    type: accessibility
    runner: axe-core
    fail_on: critical,serious
    severity: high

  - id: chart-without-empty-state
    description: Todo componente de chart trata empty state
    type: structural
    runner: grep
    rule: '<Chart(?!.*emptyState)'
    fail_threshold: 0
    severity: medium

  - id: query-without-loading-error
    description: Todo useQuery/useSWR é destructured pra { data, error, isLoading }
    type: structural
    runner: tsc-walker
    rule: 'useQuery without isLoading/isError handling'
    severity: medium

  - id: large-list-without-virtualization
    description: Listas com > 100 itens usam react-window/react-virtualized/tanstack-virtual
    type: structural
    runner: heuristic
    rule: '.map\\(.*\\) renderizando estrutura DOM em loop sem virtualização'
    severity: medium

  - id: console-log-clean
    description: Sem console.log em produção
    type: structural
    runner: grep
    rule: 'console\\.log\\('
    fail_threshold: 0
    severity: low
```

### Runtime sensors

- Real User Monitoring (RUM) → LCP, FID, CLS reais
- Erros JS (Sentry/Datadog)
- Query latency P95 por endpoint

## Gaps cobertos vs não cobertos

**Cobre:**
- Performance budgets concretos
- A11y (estrutural + runtime via axe)
- Boundary entre features
- Empty states / loading states

**NÃO cobre:**
- UX subjetivo (humano revisa)
- Design fidelity (skill 02/29)
- Data correctness (responsabilidade do backend)
- A11y de fluxos complexos (humano testa com screen reader real)

## Anti-padrões específicos

- ❌ Filtro global que cada widget re-busca por conta própria (gerar N queries)
- ❌ Charts re-renderizando em cada keystroke de filtro
- ❌ Tabela sem virtualização com mil rows
- ❌ Estado de filtro em useState (perde no refresh) — usar URL
- ❌ Memoização preemptiva em todo lugar (degrada perf)

## Próximos passos

- v2.5.1 — fitness functions runnable contra Lighthouse CI
- v2.5.2 — `/init-harness data-dashboard`
