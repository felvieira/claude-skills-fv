---
name: motion-design
description: |
  Skill de Motion Design para animações, transições e micro-interações. Use quando precisar definir ou implementar
  animações de interface, transições entre páginas, efeitos de hover/click/focus, loading states animados, ou
  qualquer interação visual com movimento. Trigger em: "animacao", "transicao", "motion", "micro-interacao",
  "framer motion", "spring", "easing", "parallax", "scroll animation", "hover effect",
  "shared element", "flip", "layout animation", "haptic", "vibracao", "som de interface",
  "reduced motion", "flash", "piscando", "quando nao animar", "animacao demais".
---

# Motion Design - Animações, Transições e Micro-Interações

O Motion Designer entra após o Frontend, quando os componentes estão prontos para receber vida. Toda animação deve ser intencional, performática e acessível.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

Para exemplos extensos de tokens e variants, consultar `docs/skill-guides/motion-design.md` apenas quando necessario.

Para ajustes pontuais de acabamento (scale on press, animacao contextual de icone, skip animation on load, split/stagger de entrada, saida sutil), ver `skills/52-ui-polish/SKILL.md` — esta skill (12) e dona do sistema de motion tokens; a 52 cobre o detalhe fino que faz o motion parecer refinado.

## Quando Usar

- adicionar movimento significativo a componentes e fluxos
- definir microinteracoes, transicoes e comportamento de entrada/saida

## Quando Nao Usar

- para substituir UI/UX estrutural ou implementacao frontend base
- quando o movimento nao agrega clareza ou acessibilidade

## Entradas Esperadas

- componentes frontend ja definidos
- intencao da interface e hierarquia visual
- restricoes de performance e acessibilidade

## Saidas Esperadas

- sistema de motion coerente
- transicoes e microinteracoes justificadas
- handoff claro para QA/Frontend

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

## Scroll-Driven Complexo — GSAP ScrollTrigger

Framer Motion `whileInView` cobre fade/slide-on-scroll simples (ver `ScrollFadeIn` acima). Para scroll-driven **coreografado** (pin de seção, scrub vinculado ao progresso do scroll, transições entre cards empilhados), GSAP + ScrollTrigger é a ferramenta certa — Framer Motion não tem `pin`/`scrub` nativos com o mesmo controle.

**Regra dura:** nunca escutar scroll manualmente (`window.addEventListener('scroll')` em estado React) para dirigir animação — sempre `ScrollTrigger` (ou `useScroll`/`IntersectionObserver` para o caso simples). Listener manual perde sincronia de frame e não limpa corretamente.

### Sticky-stack (cards empilhando ao rolar)

```typescript
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function useStickyStack(cardRefs: React.RefObject<HTMLElement>[]) {
  useEffect(() => {
    const triggers = cardRefs.map((ref, i) => {
      if (!ref.current) return null;
      return ScrollTrigger.create({
        trigger: ref.current,
        start: 'top top',
        pin: true,
        pinSpacing: false,
        animation: gsap.to(ref.current, {
          scale: 0.92,
          opacity: 0.6,
          ease: 'none',
        }),
        endTrigger: cardRefs[i + 1]?.current || undefined,
        end: 'top top',
        scrub: true,
      });
    });
    return () => triggers.forEach((t) => t?.kill());
  }, [cardRefs]);
}
```

### Horizontal-pan (seção que rola na horizontal)

```typescript
export function useHorizontalPan(containerRef: React.RefObject<HTMLElement>, distance: number) {
  useEffect(() => {
    if (!containerRef.current) return;
    const panel = containerRef.current;
    const track = panel.querySelector<HTMLElement>('[data-pan-track]');
    if (!track) return;

    const tween = gsap.to(track, {
      x: -distance,
      ease: 'none',
      scrollTrigger: {
        trigger: panel,
        start: 'top top',
        pin: true,
        scrub: 1,
        end: `+=${distance}`,
      },
    });
    return () => tween.scrollTrigger?.kill();
  }, [containerRef, distance]);
}
```

Sempre limpar (`.kill()`) no cleanup do `useEffect` — trigger órfão continua calculando em resize/unmount e vaza memória. Isolar GSAP em Client Components (`"use client"`), nunca em Server Components.

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

## Continuidade de Objeto — Shared Element e FLIP

Quando o **mesmo objeto** aparece em dois estados (card na lista → detalhe; thumbnail → player; item que muda de posição ao filtrar), a animação certa preserva a identidade dele em vez de destruir e recriar. O usuario acompanha o objeto com os olhos e nao perde o contexto de origem.

| Situacao | Padrao | Por que |
| --- | --- | --- |
| Card → tela de detalhe | Shared element / container transform | O card **vira** a tela; a origem fica óbvia |
| Item muda de posicao (filtro, ordenacao, reorder) | FLIP / layout animation | Preserva a identidade; fade+remount faz parecer lista nova |
| Thumbnail → media em tela cheia | Shared element na imagem | A imagem é o objeto; o resto é moldura |
| Troca de contexto sem relacao | Crossfade curto | Nao existe objeto compartilhado para preservar |

FLIP (First, Last, Invert, Play) mede a posicao antes e depois da mudanca no DOM e anima a diferenca — o layout real acontece instantaneamente, so a percepcao é animada. Em React com `motion`, a prop `layout` faz isso automaticamente; em DOM puro, GSAP Flip ou `getBoundingClientRect` manual.

**Stagger em lista que reordena precisa ser mínimo** — algo em torno de 15ms entre itens. Stagger de 50-100ms numa lista de 10 itens faz o ultimo esperar quase um segundo e transforma uma operacao de dados em apresentacao.

A direcao da transicao deve codificar a estrutura, nao ser sempre "de baixo pra cima": aprofundar segue a arquitetura da navegacao, voltar é a inversao exata da entrada, abrir a partir de um elemento nasce **naquele elemento**.

## Morphing de Ícone-pra-Ícone

Caso especifico de continuidade de objeto (ver tabela acima): quando o icone em si troca de forma pra comunicar mudanca de estado — play↔pause, hamburguer↔X, coracao vazio↔cheio, chevron que gira. So faz sentido quando os dois icones representam **o mesmo conceito em dois estados reconheciveis**; nao use pra trocar entre icones sem relacao semantica (isso e so um crossfade).

Interpolar `d` de um path pro outro manualmente distorce a forma em transito (encolhe, cisalha). Pra esse caso pontual, usar [`morphicons`](https://github.com/guillermolg00/morphicons) (MIT, zero dependencia, ~7KB) em vez de reinventar a interpolacao — ele resolve rotacao e correspondencia de pontos automaticamente (Procrustes 2D + interpolacao polar), funciona com icones stroke-based (Lucide, Tabler, Heroicons, Iconoir):

```tsx
import { MorphIcon } from "morphicons/react";
import { Menu, X } from "lucide"; // data, nao componentes — usar o pacote "lucide", nao "lucide-react"

<button onClick={() => setOpen(o => !o)} aria-expanded={open}>
  <MorphIcon icon={open ? X : Menu} spring="snappy" />
</button>
```

Modo uncontrolled (acima) cobre a maioria dos casos: o prop `icon` muda e a lib anima sozinha. Existe tambem modo controlled (`from`/`to`/`progress`, pra scroll/gesture) e imperativo (`ref.current.morphTo(icon)` pra sequencias). Bindings equivalentes existem pra Vue, Svelte, React Native, Astro e web component puro (`<morph-icon>`), alem do driver vanilla `createMorph` sem framework. Spring aceita preset (`"snappy"`, `"gentle"`, etc.) ou `{ stiffness, damping }` customizado.

**Ressalva de acessibilidade — default da lib diverge do padrao desta skill.** Por padrao (`reducedMotion="never"`), a lib anima o morph mesmo com `prefers-reduced-motion: reduce` ativo no SO, sob o argumento de que morph de icone e uma micro-transicao pequena e comunicativa, nao movimento de tela cheia. Isso conflita com a regra geral desta skill (ver "Limites de Seguranca — Flash e Movimento Vestibular" e o hook `useReducedMotion` acima: **sempre respeitar `prefers-reduced-motion`**). Pra manter consistencia com essa regra, passar explicitamente `reducedMotion="user"` em todo uso — isso faz o morph degradar pra troca instantanea quando o SO pede movimento reduzido, sem perder a comunicacao do estado (o icone final ainda aparece, so sem a trajetoria animada).

## Feedback Multimodal — Haptic e Som

Visual, haptic e som devem parecer **um unico evento**, nao tres. Feedback dessincronizado é percebido como defeito de hardware.

```
visual  → onde e o que mudou
haptic  → que um evento discreto aconteceu
som     → evento relevante mesmo fora do foco visual
```

**Regra de redundancia (nao negociavel):** nenhum erro, sucesso ou alerta critico pode existir **so** em som ou **so** em haptic. Quem esta no silencioso, com deficiencia auditiva, ou com haptic desligado precisa receber a mesma informacao.

Haptic — "menos é mais". Vibracao demais irrita, distrai e produz habituacao (o usuario para de perceber):

| Evento | Haptic |
| --- | --- |
| Botao comum | Nenhum |
| Toggle importante, snap de slider | Leve e preciso |
| Conclusao de operacao | Sucesso |
| Erro destrutivo | Padrao de alerta/erro |
| Drag cruzando threshold | Impacto discreto |
| Scroll, navegacao comum, animacao decorativa | Nenhum |

Preferir a constante semantica da plataforma (`HapticFeedbackConstants` no Android, `sensoryFeedback` no SwiftUI) a inventar padrao de vibracao proprio — a plataforma mantem consistencia e tem fallback por hardware. Haptic ruim é pior que nenhum.

**Timing:** haptic de "input recebido" vai no press; haptic de "acao concluida" vai no **resultado**, nunca no press — senao mente sobre o que aconteceu.

Som serve quando a informacao precisa sobreviver a ausencia de foco visual, o evento é raro e importante, e existe metafora clara. Nunca em hover, navegacao comum ou ambiente continuo. Audio que inicia sozinho e dura mais de 3s precisa de controle de pausa/volume (WCAG 1.4.2), e audio concorrente atrapalha leitor de tela.

## Limites de Seguranca — Flash e Movimento Vestibular

Estes nao sao preferencia estetica; sao risco de saude.

**Flash (WCAG 2.3.1, nivel A):** nada pode piscar mais de **3 vezes por segundo**, salvo abaixo dos limiares de flash geral e vermelho. Acima disso ha risco de convulsao fotossensitiva. Afeta: transicao piscante, loading que alterna cor rapido, video/GIF autoplay, efeito estroboscopico.

**Movimento vestibular:** parallax, zoom grande, rotacao e deslocamento de tela inteira podem causar tontura, nausea e enxaqueca em quem tem disturbio vestibular. Por isso `prefers-reduced-motion` nao é opcional em produto que usa esses efeitos.

**Reduced motion nao é `animation: none` global.** A implementacao correta preserva a **informacao** e remove o **deslocamento**:

```css
.modal { animation: modal-enter 260ms cubic-bezier(.16,1,.3,1); }

@keyframes modal-enter {
  from { opacity: 0; transform: translateY(18px) scale(.985); }
  to   { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  /* Mantem o "apareceu", remove o deslocamento espacial */
  .modal { animation: modal-reduced 90ms linear; }
  @keyframes modal-reduced { from { opacity: 0 } to { opacity: 1 } }
}
```

Asset animado (Lottie, Rive, video) tambem precisa respeitar: em reduced motion, mostrar o **frame final** em vez de tocar a trajetoria. A preferencia deve virar um token global que a aplicacao inteira le, incluindo bibliotecas externas.

## Quando NAO Animar

O criterio mais importante desta skill. Animação tem custo — de atencao, de tempo e de frame budget.

Nao animar quando:

- **A tarefa é repetitiva e o usuario é experiente.** Animacao que "explica" o mesmo evento pela centesima vez virou latencia pura. 300ms numa operacao feita 100 vezes ao dia é meia hora de espera por mes
- **A animacao esconde dado.** Reordenar tabela justifica continuidade; fazer cada celula entrar com stagger, nao
- **Varios elementos ja competem por atencao.** Movimento tem saliencia alta — animar tudo é nao priorizar nada
- **O usuario esta digitando ou decidindo algo critico.** Nunca deslocar layout sob o cursor ou o foco
- **O sistema esta em erro critico.** Primeiro torne a mensagem legivel; erro nao é espetaculo
- **A unica justificativa é "fica premium".** Isso nao é hipotese testavel
- **A animacao causa jank ou layout shift.** Transicao simples e estavel comunica mais qualidade que animacao sofisticada a 30fps

**Regra de bloqueio:** animacao ornamental nunca pode impedir a proxima interacao. Em tarefa frequente, o movimento precisa ser interrompivel — o input do usuario tem prioridade sobre a animacao em curso.

**Teste final da linguagem de motion:** quando o movimento é removido, o produto continua claro; quando é restaurado, passa a parecer inequivocamente ele mesmo. Se remover quebra o entendimento, o motion esta carregando informacao que deveria estar na estrutura. Se restaurar nao muda nada, o motion é decoracao.

## Evidencia de Conclusao

- movimento com intencao clara
- `prefers-reduced-motion` considerado
- impacto em performance e QA destacado

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

## Efeitos Vanilla — Referência de Código (naocodei.com)

> **Aviso de proveniência.** Código copiado de https://naocodei.com/free-code/, **licença não declarada, autoria não identificada**, risco assumido pelo usuário em 2026-08-23. Ver [`references/naocodei-vanilla-effects.md`](references/naocodei-vanilla-effects.md) — abrir só ao implementar de verdade.

5 efeitos JS puro sem framework: stack cards, rolagem com inércia, partículas em canvas, scramble de texto, shader WebGL fluido. Cobrem o caso que Framer Motion/GSAP não resolvem sozinhos — dependência zero.

## Fontes Externas

- Skeletons de GSAP ScrollTrigger (sticky-stack, horizontal-pan) inspirados em [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill).
- API de morphing de icone-pra-icone baseada em [guillermolg00/morphicons](https://github.com/guillermolg00/morphicons) (MIT). Gap real: `skills/12-motion-design/` e `patterns/` nao cobriam morph entre icones (play↔pause, hamburguer↔X) antes desta secao — so transicoes, spring e easing genericos.
- 5 efeitos vanilla JS copiados de [naocodei.com/free-code](https://naocodei.com/free-code/) — **licença não declarada, autoria não identificada** (diferente das entradas acima). Detalhe em `references/naocodei-vanilla-effects.md`. Gap real: skill não tinha exemplo de JS puro sem framework (canvas, WebGL raw, scroll com `lerp`).
