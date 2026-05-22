---
scenario: 02-ui-ux-design
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 2100
tokens_out_approx: 1950
time_seconds: 68
quality_score: 4.75
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +2.50
notes: "skill loaded: 02-ui-ux-design; tokens include skill prompt injection (~1800 in); B2B context + dark sidebar rationale + Amplitude/Mixpanel refs + Nielsen checklist + backend handoff contract; discipline -1 for not flagging absent existing design system as a risk"
---

# Treatment — Dashboard de Analytics SaaS para Marketing

## 1. Arquitetura de Informação

**Estrutura de navegação:**
```
Sidebar fixa (240px desktop) / Bottom nav (mobile)
├── Overview          ← landing page com KPIs globais
├── Campaigns         ← performance por campanha
├── Audiences         ← segmentos e comportamento
├── Channels          ← breakdown por canal (paid, organic, email…)
├── Reports           ← relatórios customizados + export
└── Settings          ← integrações, time, alertas
```

**Header persistente:** Logo + workspace switcher + date range picker + avatar/notificações.

---

## 2. Layout por Tela Principal — Overview

```
┌─────────────────────────────────────────────────────┐
│  [Logo] [Workspace ▾]          [Date Range] [Avatar] │  ← Header 64px
├──────────┬──────────────────────────────────────────┤
│          │  [Alert banner — se houver anomalia]      │
│  Sidebar │  ┌──────┬──────┬──────┬──────┐           │
│  240px   │  │ KPI  │ KPI  │ KPI  │ KPI  │  ← row 1  │
│          │  └──────┴──────┴──────┴──────┘           │
│ Overview │  ┌──────────────────┬───────────────┐    │
│ Campaigns│  │  Line Chart      │  Bar Chart    │    │  ← row 2
│ Audiences│  │  (trend 30d)     │  (by channel) │    │
│ Channels │  └──────────────────┴───────────────┘    │
│ Reports  │  ┌──────────────────────────────────┐    │
│ Settings │  │  Data Table — Top Campaigns      │    │  ← row 3
│          │  │  (sort, filter, pagination)      │    │
└──────────┴──────────────────────────────────────────┘
```

**Grid:** 12 colunas, gutter 24px. Row 1: 4×3col. Row 2: 7col + 5col. Row 3: full 12col.

**Por que sidebar dark?** SaaS de analytics B2B usa sidebar escura para reduzir carga visual na navegação, deixando o canvas de dados (branco/cinza claro) com toda atenção. Padrão usado por Amplitude, Mixpanel, Looker.

---

## 3. Componentes

### KPI Card

```markdown
## Componente: KPICard

### Variantes
- Default (métrica neutra)
- Positive (crescimento ≥0)
- Negative (queda)
- Loading (skeleton)

### Estados
- Default / Hover (elevação shadow-md) / Loading / Error

### Props
| Prop       | Tipo     | Default    | Descrição              |
|------------|----------|------------|------------------------|
| label      | string   | —          | Nome da métrica        |
| value      | string   | —          | Valor formatado        |
| delta      | number   | —          | % vs período anterior  |
| trend      | number[] | []         | dados p/ sparkline     |
| loading    | boolean  | false      | Skeleton mode          |

### Skeleton
Retângulo 100% × 96px, rounded-lg, pulse gray-200→300

### Acessibilidade
- role="article" com aria-label="${label}: ${value}, ${delta}% vs anterior"
- Sparkline: aria-hidden="true" (decorativo)
```

### Tabela de Componentes Obrigatórios

| Componente | Biblioteca sugerida | Notas |
|---|---|---|
| Line/Area Chart | Recharts | `<AreaChart>` com gradiente fill |
| Bar/Grouped Chart | Recharts | horizontal p/ rankings |
| Donut Chart | Recharts | distribuição de canal |
| Data Table | TanStack Table v8 | virtualização p/ >500 rows |
| Date Range Picker | react-day-picker v8 | presets: 7d, 30d, 90d, MTD, YTD |
| Dropdown/Select | Radix UI Select | acessível, keyboard-navigable |
| Filter chips | custom | removíveis, com badge de contagem |
| Status Badge | custom | Active/Paused/Draft/Error |
| Skeleton | custom via CSS pulse | NÃO usar lib externa |
| Toast/Notification | Radix UI Toast | erros de fetch, export concluído |
| Empty State | custom | ilustração + CTA contextual |
| Modal/Sheet | Radix UI Dialog | detalhes de campanha, export config |

---

## 4. Tokens Visuais

```typescript
// src/lib/design-tokens.ts — recorte para marketing dashboard

export const tokens = {
  colors: {
    primary: {
      50:  '#eff6ff',
      500: '#3b82f6',   // ações primárias, links, seleção ativa
      600: '#2563eb',   // hover
      700: '#1d4ed8',   // pressed
    },
    // Semântica de dados
    success:  '#22c55e',   // crescimento, metas atingidas
    warning:  '#f59e0b',   // queda leve, alertas
    error:    '#ef4444',   // queda forte, erros
    info:     '#3b82f6',

    // Chart palette — 6 cores distintas e acessíveis (daltonismo-safe)
    chart: ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#06b6d4'],

    // Surface
    surface: {
      page:       '#f9fafb',
      card:       '#ffffff',
      sidebar:    '#1f2937',   // sidebar dark contrast
      sidebarText:'#f9fafb',
    },
  },

  spacing: {
    xs: '0.25rem', sm: '0.5rem', md: '1rem',
    lg: '1.5rem',  xl: '2rem',  '2xl': '3rem',
  },

  typography: {
    fontFamily: { sans: "'Inter', system-ui, sans-serif" },
    fontSize: {
      xs:    ['0.75rem',  { lineHeight: '1rem'    }],
      sm:    ['0.875rem', { lineHeight: '1.25rem' }],
      base:  ['1rem',     { lineHeight: '1.5rem'  }],
      lg:    ['1.125rem', { lineHeight: '1.75rem' }],
      xl:    ['1.25rem',  { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem',   { lineHeight: '2rem'    }],
    },
  },

  borderRadius: {
    sm: '0.25rem',   // badges, inputs
    md: '0.375rem',  // botões
    lg: '0.5rem',    // cards, dropdowns
    xl: '0.75rem',   // modais
  },

  shadows: {
    card:  '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    hover: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    modal: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },

  transitions: {
    fast:   '150ms ease',
    normal: '250ms ease',
  },
} as const;
```

---

## 5. Responsividade (Mobile First)

```
Mobile  (< 640px):
  - Sidebar → Bottom tab bar (5 ícones)
  - KPI cards → scroll horizontal snapping (2 visíveis)
  - Charts → altura fixa 200px, scroll se necessário
  - Tabela → card stacked por row
  - Date picker → sheet modal bottom

Tablet  (640–1023px):
  - Sidebar → colapsada (ícones apenas, 64px)
  - KPI cards → 2×2 grid
  - Charts → stack vertical
  - Tabela → colunas reduzidas (esconder secundárias)

Desktop (1024px+):
  - Layout completo conforme wireframe acima
```

---

## 6. Estados Obrigatórios por Componente

| Estado | Comportamento |
|---|---|
| Loading | Skeleton pulse para cada componente (não spinner global) |
| Error | Banner inline com mensagem + botão "Tentar novamente" |
| Empty (sem dados no período) | Ilustração neutra + sugestão de ação ("Conecte sua conta de ads") |
| Filtro ativo | Filter chips visíveis no topo do canvas + badge de count |
| Export em andamento | Toast "Gerando relatório…" → "Download pronto" |
| Anomalia detectada | Alert banner amarelo no topo do canvas (dismissível) |

---

## 7. Acessibilidade (WCAG 2.1 AA)

- Contraste mínimo 4.5:1 texto normal, 3:1 texto grande
- Charts: tooltip acessível via teclado (arrow keys entre pontos)
- Tabela: `role="grid"`, `aria-sort` em colunas, `aria-rowcount`
- Sidebar: `role="navigation"`, `aria-current="page"` no item ativo
- Date picker: `role="dialog"` quando aberto, foco trap
- Todos os ícones decorativos: `aria-hidden="true"`
- Ícones informativos: `aria-label` explícito

---

## 8. Micro-interações

```
Hover em KPI Card   → shadow-md (250ms ease), cursor pointer se clicável
Chart tooltip       → fade-in 150ms, posição dinâmica (não corta viewport)
Sidebar item        → background transition 150ms, ícone scale 1.05
Filtro aplicado     → chip aparece com fade+slide-down 200ms
Row na tabela       → background hover gray-50, 150ms
Skeleton → conteúdo → opacity 0→1 crossfade 200ms (evita flash)
```

---

## Handoff Backend

| Dado necessário | Formato | Notas |
|---|---|---|
| KPIs agregados | `{ metric, value, delta, trend: number[] }` | trend = últimos 30 pontos |
| Série temporal | `{ date: ISO8601, value: number }[]` | granularidade por período selecionado |
| Top campanhas | paginado, cursor-based | ordenação server-side |
| Filtros disponíveis | `{ channels[], campaigns[], segments[] }` | lazy-load se >100 itens |
| Anomalias | `{ metric, threshold, detected_at }[]` | polling 5min ou websocket |

---

## Checklist Nielsen (pré-handoff)

- [x] Status: skeleton + toast + banner de anomalia
- [x] Mundo real: labels em português, formatos BR (R$, %)
- [x] Controle: date range customizável, filtros removíveis
- [x] Consistência: mesma paleta de chart em todas as telas
- [x] Prevenção de erro: confirmação antes de deletar relatório salvo
- [x] Reconhecer: filtros ativos sempre visíveis como chips
- [x] Eficiência: presets de data, atalho de teclado `/` para busca
- [x] Minimalismo: sidebar dark mantém foco no canvas
- [x] Recuperação: erro inline com ação clara
- [x] Ajuda: tooltips em métricas com definição no hover

---

**Próximo passo:** Frontend (skill 04) para implementar `KPICard`, `AreaChart` e grid responsiva. Backend (skill 03) para contratos das APIs de KPI e série temporal.
