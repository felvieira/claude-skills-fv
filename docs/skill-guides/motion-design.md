# Motion Design Guide

> Guia auxiliar da skill `12-motion-design`. Consultar apenas quando a tarefa exigir tokens, variants ou implementacoes detalhadas de animacao.

---

## Indice

- [Motion Tokens](#motion-tokens)
- [Variants de Entrada e Saida](#variants-de-entrada-e-saida)
- [Stagger — Listas Animadas](#stagger--listas-animadas)
- [Transicao de Pagina](#transicao-de-pagina)
- [Micro-Interacoes](#micro-interacoes)
- [Loading e Skeleton](#loading-e-skeleton)
- [Scroll Animations](#scroll-animations)
- [Hierarquia de Animacao](#hierarquia-de-animacao)
- [Reduced Motion](#reduced-motion)
- [Regras de Performance](#regras-de-performance)

---

## Motion Tokens

Centralizar todos os valores de duracao, easing e stagger em um unico arquivo. Nunca usar numeros magicos diretamente nas variants.

```typescript
// src/lib/motion-tokens.ts
export const motionTokens = {
  duration: {
    instant:   0.1,
    fast:      0.2,
    normal:    0.3,
    slow:      0.5,
    dramatic:  0.8,
  },
  easing: {
    default: [0.25, 0.1, 0.25, 1],
    smooth:  [0.4, 0, 0.2, 1],
    snappy:  [0.2, 0, 0, 1],
    bounce:  [0.34, 1.56, 0.64, 1],
    spring:  { type: 'spring', stiffness: 300, damping: 20 },
  },
  stagger: {
    fast:   0.03,
    normal: 0.05,
    slow:   0.1,
  },
} as const;
```

---

## Variants de Entrada e Saida

```typescript
// src/lib/motion-variants.ts
import type { Variants } from 'framer-motion';
import { motionTokens } from './motion-tokens';

const { duration, easing } = motionTokens;

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.normal, ease: easing.smooth } },
};

export const slideUp: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: easing.smooth } },
};

export const slideInFromLeft: Variants = {
  hidden:  { opacity: 0, x: -30 },
  visible: { opacity: 1, x: 0, transition: { duration: duration.normal, ease: easing.snappy } },
};

export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: duration.fast, ease: easing.bounce } },
};

export const fadeOut: Variants = {
  visible: { opacity: 1 },
  exit:    { opacity: 0, transition: { duration: duration.fast, ease: easing.default } },
};

export const slideDown: Variants = {
  visible: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: 20, transition: { duration: duration.fast, ease: easing.smooth } },
};
```

---

## Stagger — Listas Animadas

```typescript
// src/lib/motion-variants.ts (continuacao)
export const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: motionTokens.stagger.normal,
      delayChildren:   0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.normal, ease: easing.smooth } },
};
```

```tsx
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

function AnimatedList({ items }: { items: Item[] }) {
  return (
    <motion.ul variants={staggerContainer} initial="hidden" animate="visible">
      {items.slice(0, 10).map((item) => (
        <motion.li key={item.id} variants={staggerItem}>
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

> **Limite:** no maximo 10 itens visiveis por stagger. Acima disso, animar apenas os primeiros ou usar virtualizacao.

---

## Transicao de Pagina

```typescript
export const pageTransition: Variants = {
  hidden:  { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: { duration: duration.fast, ease: easing.default },
  },
};
```

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { pageTransition } from '@/lib/motion-variants';

function PageWrapper({ children, pageKey }: { children: React.ReactNode; pageKey: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        variants={pageTransition}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
```

---

## Micro-Interacoes

```tsx
import { motion } from 'framer-motion';
import { motionTokens } from '@/lib/motion-tokens';

function ButtonPress({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: motionTokens.duration.instant, ease: motionTokens.easing.snappy }}
      onClick={onClick}
    >
      {children}
    </motion.button>
  );
}

function CardHover({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)' }}
      transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
    >
      {children}
    </motion.div>
  );
}

function FocusRing({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileFocus={{ boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)' }}
      transition={{ duration: motionTokens.duration.instant }}
    >
      {children}
    </motion.div>
  );
}
```

---

## Loading e Skeleton

```tsx
import { AnimatePresence, motion } from 'framer-motion';
import { motionTokens } from '@/lib/motion-tokens';

function SkeletonToContent({
  isLoading,
  skeleton,
  children,
}: {
  isLoading: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: motionTokens.duration.fast }}
        >
          {skeleton}
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: motionTokens.duration.normal }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SpinnerRotate({ size = 24 }: { size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: motionTokens.duration.dramatic, repeat: Infinity, ease: 'linear' }}
      style={{ width: size, height: size }}
      className="border-2 border-gray-300 border-t-blue-500 rounded-full"
    />
  );
}
```

---

## Scroll Animations

```tsx
function ScrollFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.smooth }}
    >
      {children}
    </motion.div>
  );
}
```

> `once: true` garante que a animacao nao se repete ao rolar de volta. `margin: '-50px'` dispara a animacao um pouco antes do elemento entrar na viewport.

---

## Hierarquia de Animacao

```
Nivel 1: Pagina      → fade/slide da pagina inteira
Nivel 2: Secoes      → stagger das secoes principais
Nivel 3: Componentes → entrada individual de cards, listas, etc.
Nivel 4: Conteudo    → texto, icones, badges dentro dos componentes
```

Cada nivel espera o anterior iniciar antes de comecar. Usar `delayChildren` e `staggerChildren` para orquestrar a cascata.

```tsx
const sectionVariants: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: motionTokens.stagger.slow,
      delayChildren:   motionTokens.duration.fast,
    },
  },
};

const componentVariants: Variants = {
  hidden:  { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: motionTokens.duration.normal,
      ease: motionTokens.easing.smooth,
      staggerChildren: motionTokens.stagger.fast,
    },
  },
};
```

---

## Reduced Motion

### Hook

```typescript
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

### Uso no componente

```tsx
function AnimatedHero({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={prefersReduced ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReduced
          ? { duration: 0 }
          : { duration: motionTokens.duration.normal, ease: motionTokens.easing.smooth }
      }
    >
      {children}
    </motion.div>
  );
}
```

**CSS alternativo:**

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Regras de Performance

| Animar isso | Nunca animar isso |
|-------------|-------------------|
| `transform` (translate, scale, rotate) | `width`, `height` |
| `opacity` | `top`, `left`, `right`, `bottom` |
| `filter` (blur, brightness) | `margin`, `padding` |
| | `background-color` (preferir `opacity` overlay) |

- `will-change: transform, opacity` apenas nos elementos que vao animar e remover apos (`will-change: auto`) quando a animacao terminar
- 60fps e o alvo em todos os devices
- Limitar stagger a no maximo 10 itens visiveis por vez
- Evitar animacoes simultaneas em muitos elementos — agrupamento > quantidade
