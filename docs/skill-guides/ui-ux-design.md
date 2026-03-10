# UI UX Design Guide

Guia de referência para a skill `02-ui-ux-design`. Consultar quando precisar de tokens base, exemplos de layout ou heurísticas detalhadas.

## Design Tokens Base

```typescript
// src/lib/design-tokens.ts
export const tokens = {
  colors: {
    primary: {
      50: '#eff6ff',  100: '#dbeafe',  200: '#bfdbfe',
      300: '#93c5fd', 400: '#60a5fa',  500: '#3b82f6',
      600: '#2563eb', 700: '#1d4ed8',  800: '#1e40af', 900: '#1e3a8a',
    },
    success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#3b82f6',
  },
  spacing: { xs: '0.25rem', sm: '0.5rem', md: '1rem', lg: '1.5rem', xl: '2rem', '2xl': '3rem' },
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, sans-serif",
      mono: "'JetBrains Mono', monospace",
    },
    fontSize: {
      xs: ['0.75rem', '1rem'],   sm: ['0.875rem', '1.25rem'],
      base: ['1rem', '1.5rem'],  lg: ['1.125rem', '1.75rem'],
      xl: ['1.25rem', '1.75rem'], '2xl': ['1.5rem', '2rem'],
    },
  },
  borderRadius: { sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px' },
  zIndex: { dropdown: 1000, sticky: 1020, fixed: 1030, modal: 1040, tooltip: 1060, toast: 1070 },
} as const;
```

## Responsividade — Mobile First

```
Mobile:  0–639px    → single column, touch targets 44px mín
Tablet:  640–1023px → layout adaptado, sidebar colapsável
Desktop: 1024px+    → layout completo, múltiplas colunas
```

| Elemento | Mobile | Desktop |
|----------|--------|---------|
| Tabelas | cards empilhados | tabela normal |
| Navegação | hamburger / bottom nav | sidebar / top nav |
| Formulários | inputs full-width | grid de colunas |
| Touch target | mín 44×44px | cursor normal |
| Font-size inputs | mín 16px (evita zoom iOS) | — |

## Especificação de Componente

```markdown
## Componente: Button

### Variantes
Primary · Secondary · Ghost · Destructive

### Estados
Default · Hover · Focus · Active · Disabled · Loading

### Props
| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| variant | string | 'primary' | Estilo visual |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Tamanho |
| disabled | boolean | false | Desabilita interação |
| loading | boolean | false | Spinner + desabilita |

### Acessibilidade
- Role: `button`
- Keyboard: Enter e Space ativam
- Screen reader: anuncia label + estado disabled/loading
```

## Skeleton Loading

Obrigatório em toda tela que faz fetch de dados.

```
TextSkeleton    → linhas com largura variável (100%, 80%, 60%)
AvatarSkeleton  → círculo (32px, 40px, 48px)
CardSkeleton    → retângulo com rounded corners
TableSkeleton   → grid imitando rows
ImageSkeleton   → retângulo com aspect-ratio fixo
FormSkeleton    → inputs placeholder com labels
```

Regras:
- Skeleton deve refletir o layout final (mesmas dimensões — evita layout shift)
- Animação: `animate-pulse` (não shimmer — mais leve)
- Cor: `gray-200` → `gray-300`
- Nunca mostrar skeleton por mais de 3s — se demorar, exibir mensagem

## Heurísticas de Nielsen — Checklist

1. **Visibilidade do status** — usuário sempre sabe o que está acontecendo?
2. **Compatibilidade com o mundo real** — linguagem do usuário, não jargão técnico?
3. **Controle e liberdade** — tem "desfazer"? tem "voltar"?
4. **Consistência e padrões** — mesma ação = mesmo visual em toda a app?
5. **Prevenção de erros** — confirmação antes de ações destrutivas?
6. **Reconhecer ao invés de lembrar** — info visível, não memorizada?
7. **Flexibilidade e eficiência** — atalhos para usuários avançados?
8. **Design minimalista** — só info relevante na tela?
9. **Recuperação de erros** — mensagens claras com ação sugerida?
10. **Ajuda e documentação** — tooltips, onboarding?

## Checklist de Entrega

```
☐ Fluxo principal definido (happy path)
☐ Estados: loading, erro, vazio, sucesso especificados
☐ Responsividade por breakpoint definida
☐ Skeleton patterns por tela
☐ Touch targets mínimos respeitados (44×44px)
☐ WCAG 2.1 AA: contraste mín 4.5:1 para texto
☐ Roles ARIA e tab order mapeados
☐ Micro-interações e animações especificadas
```
