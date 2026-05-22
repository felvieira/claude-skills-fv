---
scenario: 02-ui-ux-design
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 120
tokens_out_approx: 380
time_seconds: 18
quality_score: 2.25
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 2
  discipline: 3
pass_fail: reference
delta_vs_baseline: n/a
notes: "cold answer, no skill loaded, no design system or stack context; skips states, a11y, backend handoff, and component specs"
---

# Baseline — Dashboard de Analytics SaaS para Marketing

## Layout

Use sidebar navigation fixa (240-280px) à esquerda com área de conteúdo principal.

**Nav items:** Overview, Campaigns, Audiences, Reports, Settings.

**Estrutura da área principal:**
- Header sticky: date range picker + account switcher
- Linha 1: 4 KPI cards lado a lado
- Linha 2: 2 gráficos (line + bar) em grid 2 colunas
- Linha 3: data table com sort/filter/pagination

**Breakpoints:** 1280px, 1024px, 768px.

## Componentes

- **KPI Cards:** valor da métrica, badge de delta (▲/▼ %), sparkline
- **Charts:** Recharts ou Chart.js — Line para tendência, Bar para comparação, Pie/Donut para distribuição
- **Data Table:** colunas ordenáveis, filtros inline, paginação, seleção múltipla
- **Date Range Picker:** presets (Últimos 7/30/90 dias, Este mês, Custom)
- **Dropdown filters:** canal, campanha, segmento
- **Status badges:** Active, Paused, Draft, Error
- **Skeleton loaders** para todos os componentes assíncronos
- **Empty states** com CTA quando não há dados

## Tokens Visuais

```
Cores:
  primary:    #6366F1 (indigo-500)
  primary-dark: #4F46E5
  success:    #10B981
  warning:    #F59E0B
  danger:     #EF4444
  neutral-50: #F9FAFB
  neutral-900: #111827

Tipografia:
  font-family: Inter, system-ui, sans-serif
  base:        14px / 1.5
  label:       12px / 1.4
  heading-lg:  24px / 1.2 bold
  heading-md:  18px / 1.3 semibold

Espaçamento (base 4px):
  xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | 2xl: 48px

Bordas:
  radius-sm:  4px (inputs, badges)
  radius-md:  8px (cards, dropdowns)
  radius-lg:  12px (modais)

Sombras:
  card:   0 1px 3px rgba(0,0,0,0.12)
  modal:  0 8px 32px rgba(0,0,0,0.16)
```

## Notas

- Considere tema dark mode (neutral-900 como surface)
- Acessibilidade: contraste mínimo 4.5:1 para texto
- Charts devem ter tooltips acessíveis e labels para leitores de tela
