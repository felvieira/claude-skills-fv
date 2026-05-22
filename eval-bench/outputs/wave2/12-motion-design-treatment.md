---
scenario: 12-motion-design
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 3200
tokens_out_approx: 780
time_seconds: 34
quality_score: 4.5
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 4
  actionability: 5
  discipline: 4
pass_fail: pass
delta_vs_baseline: +1.7
notes: "hierarquia de entrada em 3 camadas, tokens reutilizáveis, useReducedMotion hook completo, regras anti-reflow explícitas, armadilhas documentadas, zero scope creep"
---

# Pass B — Treatment (com skill dev-team-kit-fv:12-motion-design)

**Input:** "Landing page React, hero estático sem vida, queremos animação sutil que destaque o CTA mas não distraia. Como faço?"

---

## Landing page hero — sistema de motion para CTA

### Estratégia

O hero precisa de **hierarquia de animação em 3 camadas**: a seção entra primeiro, depois os elementos de copy, por último o CTA — que recebe atenção adicional via micro-interação permanente sutil. Nada loop infinito agressivo; o foco vai para `whileHover` e entrada com bounce que atrai sem distrair.

---

### 1. Motion tokens (criar uma vez, reutilizar no projeto)

`src/lib/motion-tokens.ts`

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
    smooth: [0.4, 0, 0.2, 1],
    snappy: [0.2, 0, 0, 1],
    bounce: [0.34, 1.56, 0.64, 1],
  },
  stagger: {
    normal: 0.05,
  },
} as const;
```

---

### 2. Variants do hero

`src/lib/motion-variants.ts`

```typescript
import { Variants } from 'framer-motion';
import { motionTokens } from './motion-tokens';

const { duration, easing, stagger } = motionTokens;

export const heroContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: stagger.normal,
      delayChildren: 0.1,
    },
  },
};

export const heroItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: duration.normal, ease: easing.smooth },
  },
};

export const ctaVariant: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: duration.fast, ease: easing.bounce },
  },
};
```

---

### 3. Hook `useReducedMotion`

`src/hooks/useReducedMotion.ts`

```typescript
import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}
```

---

### 4. Componente Hero com motion

```tsx
import { motion } from 'framer-motion';
import { heroContainer, heroItem, ctaVariant } from '@/lib/motion-variants';
import { motionTokens } from '@/lib/motion-tokens';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <motion.section
      variants={heroContainer}
      initial={reduced ? false : 'hidden'}
      animate="visible"
      className="flex flex-col items-center text-center gap-6 py-24"
    >
      <motion.p variants={heroItem} className="text-sm uppercase tracking-widest text-muted">
        Subtítulo ou eyebrow text
      </motion.p>

      <motion.h1 variants={heroItem} className="text-5xl font-bold leading-tight">
        Título principal da landing
      </motion.h1>

      <motion.p variants={heroItem} className="text-lg text-muted max-w-prose">
        Descrição secundária que complementa o título sem competir com o CTA.
      </motion.p>

      <motion.button
        variants={ctaVariant}
        whileHover={reduced ? {} : { scale: 1.04 }}
        whileTap={reduced ? {} : { scale: 0.97 }}
        transition={{
          duration: motionTokens.duration.instant,
          ease: motionTokens.easing.snappy,
        }}
        className="mt-2 px-8 py-4 bg-primary text-white rounded-xl font-semibold text-lg shadow-md"
      >
        Call to Action
      </motion.button>
    </motion.section>
  );
}
```

---

### Hierarquia de entrada (ordem real)

```
t=0.1s  → subtítulo (eyebrow)
t=0.15s → h1
t=0.20s → parágrafo
t=0.25s → CTA  ← entra por último com scale bounce, concentra o olhar
```

O CTA entra com `scaleIn` + `bounce` — leve overshoot que atrai atenção sem ser agressivo. Depois disso só responde ao hover/tap, sem loop infinito.

---

### Regras de performance

- Apenas `opacity`, `transform` (translate, scale) são animados — zero reflow
- `will-change` não é necessário aqui; Framer Motion gerencia automaticamente
- `prefers-reduced-motion`: `initial={false}` corta toda a sequência de entrada; `whileHover/whileTap` recebem `{}` para neutralizar

---

### O que NÃO fazer (armadilhas comuns)

- Pulse infinito no CTA com `animation: pulse 2s infinite` em CSS → distrai, não destaca
- Animar `width` ou `height` do botão no hover → causa reflow
- Adicionar animação de scroll no hero → o hero já está visível; scroll animation é para seções abaixo da dobra
