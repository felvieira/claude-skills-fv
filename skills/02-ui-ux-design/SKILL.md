---
name: ui-ux-design
description: |
  Skill do Designer UI/UX para definição de interfaces e experiência do usuário. Use quando precisar criar
  wireframes, design system tokens, componentes de UI, fluxos de navegação, acessibilidade, ou qualquer
  decisão de interface. Trigger em: "design", "UI", "UX", "interface", "wireframe", "componente visual",
  "layout", "responsivo", "mobile first", "acessibilidade", "design system", "protótipo", "Figma".
---

# UI/UX Designer - Interface e Usabilidade

O Designer é responsável por traduzir user stories em interfaces utilizáveis, acessíveis e bonitas.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

Para exemplos longos de tokens, heuristicas e acessibilidade, consultar `docs/skill-guides/ui-ux-design.md` apenas quando necessario.

## Quando Usar

- definir interface, fluxo e comportamento responsivo
- transformar spec em estrutura de tela e decisao de usabilidade

## Quando Nao Usar

- para decidir regras de negocio ou contrato de API sozinho
- para substituir implementacao frontend

## Entradas Esperadas

- spec do PO
- restricoes de plataforma e acessibilidade
- contexto de usuarios e fluxos principais

## Saidas Esperadas

- wireframe, fluxo ou direcao de interface
- regras de responsividade e acessibilidade
- handoff claro para Frontend e, se necessario, Backend

## Responsabilidades

1. Definir arquitetura de informação e fluxos de navegação
2. Criar wireframes e protótipos
3. Manter design system consistente
4. Garantir acessibilidade (WCAG 2.1 AA mínimo)
5. Definir breakpoints e comportamento responsivo
6. Validar usabilidade com heurísticas de Nielsen

## Design System - Tokens Base

Todo projeto começa com a definição destes tokens:

**src/lib/design-tokens.ts**

```typescript
export const tokens = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    success: '#22c55e',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.875rem', { lineHeight: '1.25rem' }],
      base: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.125rem', { lineHeight: '1.75rem' }],
      xl: ['1.25rem', { lineHeight: '1.75rem' }],
      '2xl': ['1.5rem', { lineHeight: '2rem' }],
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
  transitions: {
    fast: '150ms ease',
    normal: '250ms ease',
    slow: '350ms ease',
  },
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
    toast: 1070,
  },
} as const;
```

## Breakpoints e Responsividade

Abordagem **Mobile First** obrigatória:

```
Mobile:  0 - 639px    → Layout single column, touch targets 44px mín
Tablet:  640 - 1023px → Layout adaptado, sidebar colapsável
Desktop: 1024px+      → Layout completo, múltiplas colunas
```

Regras de responsividade:
- Imagens: usar `object-fit: cover` + `aspect-ratio` definido
- Tabelas: viram cards em mobile (padrão stacked)
- Navegação: hamburger em mobile, sidebar em desktop
- Formulários: inputs full-width em mobile, grid em desktop
- Touch targets: mínimo 44x44px em mobile
- Font-size mínimo: 16px em inputs (evita zoom no iOS)

## Componentes - Padrão de Especificação

Cada componente deve ter:

```markdown
## Componente: [Nome]

### Variantes
- Default / Primary / Secondary / Ghost / Destructive

### Estados
- Default / Hover / Focus / Active / Disabled / Loading / Error

### Props
| Prop | Tipo | Default | Descrição |
|------|------|---------|-----------|
| variant | string | 'default' | Estilo visual |
| size | 'sm' \| 'md' \| 'lg' | 'md' | Tamanho |
| disabled | boolean | false | Desabilita interação |
| loading | boolean | false | Mostra skeleton/spinner |

### Acessibilidade
- Role ARIA: [role]
- Keyboard: [teclas suportadas]
- Screen reader: [comportamento esperado]

### Skeleton
- Formato do skeleton que aparece durante loading
- Dimensões devem refletir o conteúdo final (evitar layout shift)
```

## Skeleton Loading - Padrões

Skeleton é obrigatório em toda tela que faz fetch de dados:

```
Tipos de skeleton:
├── TextSkeleton    → Linhas com largura variável (100%, 80%, 60%)
├── AvatarSkeleton  → Círculo (sm: 32px, md: 40px, lg: 48px)
├── CardSkeleton    → Retângulo com rounded corners
├── TableSkeleton   → Grid de retângulos imitando rows
├── ImageSkeleton   → Retângulo com aspect-ratio da imagem
└── FormSkeleton    → Inputs placeholder com labels
```

Regras:
- Skeleton DEVE refletir o layout final (mesmas dimensões)
- Animação: pulse (não shimmer — mais leve)
- Cor: gray-200 com pulse para gray-300
- Nunca mostrar skeleton por mais de 3s — se demorar, mostrar mensagem

## Heurísticas de Nielsen - Checklist

Antes de aprovar qualquer interface, validar:

1. **Visibilidade do status** — Usuário sempre sabe o que tá acontecendo?
2. **Compatibilidade com o mundo real** — Linguagem do usuário, não jargão técnico?
3. **Controle e liberdade** — Tem "desfazer"? Tem "voltar"?
4. **Consistência e padrões** — Mesma ação = mesmo visual em toda app?
5. **Prevenção de erros** — Confirmação antes de ações destrutivas?
6. **Reconhecer ao invés de lembrar** — Info visível, não memorizada?
7. **Flexibilidade e eficiência** — Atalhos pra usuários avançados?
8. **Design minimalista** — Só info relevante na tela?
9. **Recuperação de erros** — Mensagens claras com ação sugerida?
10. **Ajuda e documentação** — Tooltips, onboarding?

## Evidencia de Conclusao

- fluxo principal definido
- estados de loading, erro e vazio considerados
- responsividade e acessibilidade especificadas

## Handoff para Frontend

Entregar:
1. Wireframes/mockups com estados (default, loading, error, empty, success)
2. Design tokens configurados
3. Especificação de cada componente novo
4. Fluxo de navegação completo
5. Comportamento responsivo definido por breakpoint
6. Skeleton patterns para cada tela
7. Micro-interações e animações especificadas
8. Acessibilidade: roles ARIA, tab order, screen reader labels

## Handoff para Backend

Comunicar:
1. Dados necessários por tela (quais campos, formatos)
2. Paginação: tipo (offset vs cursor), itens por página
3. Filtros e ordenação que a UI precisa
4. Estados de loading e como o skeleton se comporta
5. Feedback visual que depende de resposta da API (sucesso, erro)

## Código Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
