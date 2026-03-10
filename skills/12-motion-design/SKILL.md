---
name: motion-design
description: |
  Skill de Motion Design para animações, transições e micro-interações. Use quando precisar definir ou implementar
  animações de interface, transições entre páginas, efeitos de hover/click/focus, loading states animados, ou
  qualquer interação visual com movimento. Trigger em: "animacao", "transicao", "motion", "micro-interacao",
  "framer motion", "spring", "easing", "parallax", "scroll animation", "hover effect".
---

# Motion Design - Animações, Transições e Micro-Interações

O Motion Designer entra após o Frontend, quando os componentes estão prontos para receber vida. Toda animação deve ser intencional, performática e acessível.

## Responsabilidades

1. Criar sistema de animação consistente com tokens reutilizáveis
2. Implementar transições entre páginas fluidas
3. Definir micro-interações (hover, click, focus) para feedback do usuário
4. Criar transições de loading/skeleton suaves
5. Implementar animações baseadas em scroll
6. Garantir 60fps em todas as animações

## Stack

```
Animações:       Framer Motion
Transições:      CSS Transitions / CSS Animations
Estilo:          Tailwind CSS
Performance:     requestAnimationFrame
Acessibilidade:  prefers-reduced-motion
```

## Motion Tokens

```typescript
export const motionTokens = {
  duration: {
    instant: 0.1,
    fast: 0.2,
    normal: 0.3,
    slow: 0.5,
    dramatic: 0.8,
  },

  easing: {
    default: [0.25, 0.1, 0.25, 1],
    smooth: [0.4, 0, 0.2, 1],
    snappy: [0.2, 0, 0, 1],
    bounce: [0.34, 1.56, 0.64, 1],
    spring: { type: 'spring', stiffness: 300, damping: 20 },
  },

  stagger: {
    fast: 0.03,
    normal: 0.05,
    slow: 0.1,
  },
} as const;
```

## Padrões de Animação

### Animações de Entrada

```typescript
import { Variants } from 'framer-motion';
import { motionTokens } from '@/lib/motion-tokens';

const { duration, easing } = motionTokens;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

export const slideInFromLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: duration.normal, ease: easing.snappy },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.fast, ease: easing.bounce },
  },
};
```

### Animações de Saída

```typescript
export const fadeOut: Variants = {
  visible: { opacity: 1 },
  exit: {
    opacity: 0,
    transition: { duration: duration.fast, ease: easing.default },
  },
};

export const slideDown: Variants = {
  visible: { opacity: 1, y: 0 },
  exit: {
    opacity: 0,
    y: 20,
    transition: { duration: duration.fast, ease: easing.smooth },
  },
};
```

### Animações de Lista (Stagger)

```typescript
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: motionTokens.stagger.normal,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};
```

```tsx
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

function AnimatedList({ items }: { items: Item[] }) {
  return (
    <motion.ul
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {items.slice(0, 10).map((item) => (
        <motion.li key={item.id} variants={staggerItem}>
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

### Transição de Página

```typescript
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 10 },
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

function PageWrapper({ children, key }: { children: React.ReactNode; key: string }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={key}
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

### Micro-Interações

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
      whileHover={{
        y: -4,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
      }}
      transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.smooth }}
    >
      {children}
    </motion.div>
  );
}

function FocusRing({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      whileFocus={{
        boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.5)',
      }}
      transition={{ duration: motionTokens.duration.instant }}
    >
      {children}
    </motion.div>
  );
}
```

### Loading e Skeleton

```tsx
import { motion, AnimatePresence } from 'framer-motion';
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
      transition={{
        duration: motionTokens.duration.dramatic,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{ width: size, height: size }}
      className="border-2 border-gray-300 border-t-blue-500 rounded-full"
    />
  );
}
```

### Animações Baseadas em Scroll

```tsx
import { motion } from 'framer-motion';
import { motionTokens } from '@/lib/motion-tokens';

function ScrollFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: motionTokens.duration.slow,
        ease: motionTokens.easing.smooth,
      }}
    >
      {children}
    </motion.div>
  );
}
```

## Regras de Performance

1. **NUNCA** animar `width`, `height`, `top`, `left`, `margin`, `padding`
2. **SEMPRE** animar `transform` (translate, scale, rotate) e `opacity`
3. Usar `will-change` com moderação e apenas quando necessário
4. Desabilitar animações para `prefers-reduced-motion`
5. Manter **60fps** em todas as animações
6. Limitar stagger a no máximo **10 itens** visíveis por vez

```css
.animated-element {
  will-change: transform, opacity;
}

.animated-element.done {
  will-change: auto;
}
```

## Hook de Reduced Motion

```typescript
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReduced(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

```tsx
import { useReducedMotion } from '@/hooks/useReducedMotion';

function AnimatedComponent({ children }: { children: React.ReactNode }) {
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

## Hierarquia de Animação

A ordem de entrada dos elementos segue a hierarquia visual:

```
1. Página      → Fade/slide da página inteira
2. Seções      → Stagger das seções principais
3. Componentes → Entrada individual de cards, listas, etc.
4. Conteúdo    → Texto, ícones, badges dentro dos componentes
```

Cada nível espera o anterior iniciar antes de começar. Usar `delayChildren` e `staggerChildren` para orquestrar a cascata.

```tsx
const sectionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: motionTokens.stagger.slow,
      delayChildren: motionTokens.duration.fast,
    },
  },
};

const componentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
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

const contentVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: motionTokens.duration.fast },
  },
};
```

## Handoff

### Recebe do Frontend

1. Componentes implementados e funcionais
2. Estrutura de páginas com rotas definidas
3. Estados de loading/skeleton existentes
4. Lista de interações que precisam de animação

Motion NAO cria componentes novos — adiciona animacao e transicoes aos componentes existentes do Frontend. O codigo de motion e adicionado ao MESMO codebase do Frontend. Apos Motion finalizar, o repositorio do Frontend contem os componentes com animacao integrada.

### Entrega para Copy/Marketing

1. Componentes com animações aplicadas e funcionais
2. Motion tokens documentados para consistência
3. Padrões de micro-interação implementados
4. Animações de scroll e transições de página prontas

## Regra de Código Limpo

ZERO comentários no código. O código deve ser autoexplicativo através de:
- Nomes descritivos de variantes e tokens
- Separação clara de responsabilidades por arquivo
- Tipos TypeScript expressivos
- Estrutura previsível e consistente
