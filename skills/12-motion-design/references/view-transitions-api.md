# View Transition API Nativa (React `<ViewTransition>`)

Referencia de apoio para a skill 12 (Motion Design). Cobre a API nativa do browser exposta pelo React — `document.startViewTransition` via componente declarativo — para casos onde nao faz sentido puxar Framer Motion ou GSAP: transicao de rota, shared element morph entre lista e detalhe, e reveal de conteudo pos-Suspense. Complementa, nao substitui, o sistema de motion tokens desta skill.

## Quando usar isto em vez de Framer Motion / GSAP

`<ViewTransition>` e nativo do browser (`document.startViewTransition`) exposto como componente React — sem lib externa, degrada graciosamente em browser sem suporte. Faz sentido quando a animacao é **estrutural** (mudanca de rota, item de lista virando tela de detalhe, revelação de conteúdo Suspense) e não precisa da precisão de física de mola do Framer Motion nem da coreografia de scroll do GSAP. Para micro-interação de botão/hover/toggle, o sistema de motion tokens desta skill (Framer Motion) continua sendo o padrão — `<ViewTransition>` entra quando o **DOM muda de estrutura**, não quando um elemento existente muda de estado visual.

**Disponibilidade:** Next.js App Router já embute React canary — não instalar `react@canary` manualmente, `ViewTransition` funciona direto. Fora de Next.js, precisa `react@canary react-dom@canary` (não está em React estável ainda). Suporte de browser: Chromium 125+, Firefox 144+, Safari 18.2+ — degrada sem quebrar em navegadores antigos.

## O componente `<ViewTransition>`

```jsx
import { ViewTransition } from 'react';

<ViewTransition>
  <Component />
</ViewTransition>
```

O React atribui um `view-transition-name` automaticamente e chama `document.startViewTransition` por trás — nunca chamar `startViewTransition` manualmente.

**Regra critica de posicionamento:** só ativa enter/exit se aparecer **antes de qualquer nó de DOM** que o envolva. Um `<div>` por fora do `<ViewTransition>` suprime a animação de entrada/saída:

```jsx
// funciona
<ViewTransition enter="auto" exit="auto"><div>Conteudo</div></ViewTransition>

// quebrado — o div externo engole o VT, enter/exit nao dispara
<div><ViewTransition enter="auto" exit="auto"><div>Conteudo</div></ViewTransition></div>
```

**Gatilhos de animação** — só `startTransition`, `useDeferredValue` ou `Suspense` ativam a transição; `setState` comum não anima nada:

| Gatilho | Quando dispara |
|---|---|
| `enter` | `<ViewTransition>` é inserido pela primeira vez durante uma Transition |
| `exit` | `<ViewTransition>` é removido pela primeira vez durante uma Transition |
| `update` | Mutação de DOM dentro do `<ViewTransition>`, ou a própria fronteira muda de tamanho/posição por causa de um irmão imediato |
| `share` | Um VT nomeado desmonta e outro com o mesmo `name` monta na mesma Transition |

## `addTransitionType` — animação por contexto

Marca a transição com um "tipo" pra que VTs diferentes reajam de forma diferente à mesma navegação (ex: slide da direita indo pra frente, da esquerda voltando):

```jsx
startTransition(() => {
  addTransitionType('nav-forward');
  router.push('/detalhe/1');
});
```

```jsx
<ViewTransition
  enter={{ 'nav-forward': 'slide-from-right', 'nav-back': 'slide-from-left', default: 'none' }}
  exit={{ 'nav-forward': 'slide-to-left', 'nav-back': 'slide-to-right', default: 'none' }}
  default="none"
>
  <Page />
</ViewTransition>
```

Ponto de atenção: `router.back()` e os botões nativos de voltar/avançar do browser **não carregam tipo nenhum** — animação direcional tipada cai no `default` e não toca (morph nomeado sem tipo ainda funciona). Pra animação tipada garantida, usar `router.push()` com URL explícita.

Se `default="none"`, todo gatilho fica desligado a menos que explicitamente listado — inclusive `share`, então um par nomeado sem `share` explícito nunca morfa.

## Shared Element Morphing

Mesmo `name` em dois VTs — um desmontando, outro montando — cria o morph:

```jsx
// vista de lista
<ViewTransition name={`item-${id}`}><img src="/thumb.jpg" /></ViewTransition>

// vista de detalhe — mesmo name
<ViewTransition name={`item-${id}`}><img src="/full.jpg" /></ViewTransition>
```

Regras que evitam morph quebrado:
- Só um VT com determinado `name` pode estar montado por vez — usar nome único por item (`item-${id}`), nunca um nome fixo reusado em componente compartilhado (modal + página ao mesmo tempo quebra o morph).
- `share` tem precedência sobre `enter`/`exit`, mas só dispara quando existe par correspondente — se a rota de destino não tiver o mesmo `name`, cai pra `enter`/`exit` normal.
- Nunca usar fade-out como saída de página com shared morph — usar slide direcional, senão o efeito de continuidade se perde.

Quando um item de lista contém um shared element (ex: imagem que morfa pro detalhe), usar duas fronteiras `<ViewTransition>` aninhadas — a externa cuida da identidade de lista (reorder/enter), a interna cuida do morph entre rotas:

```jsx
{items.map(item => (
  <ViewTransition key={item.id}>
    <Link href={`/itens/${item.id}`}>
      <ViewTransition name={`item-imagem-${item.id}`} share="morph">
        <Image src={item.imagem} />
      </ViewTransition>
    </Link>
  </ViewTransition>
))}
```

## Integração com Next.js (`transitionTypes` no `next/link`)

O `next/link` aceita a prop `transitionTypes` pra disparar `addTransitionType` automaticamente na navegação, sem precisar envolver o `router.push` manualmente em `startTransition`:

```jsx
<Link href="/detalhe/1" transitionTypes={['nav-forward']}>
  Ver detalhe
</Link>
```

Requer a flag `experimental.viewTransition` no `next.config.js`. Sem essa prop, todo link cai no `default` do mapa de tipos — se o objetivo é slide direcional ou morph tipado, cada link que deveria disparar precisa declarar o tipo explicitamente.

## Reduced Motion

Assim como todo o resto desta skill, `<ViewTransition>` respeita `prefers-reduced-motion` — a diferença é que aqui a responsabilidade é do CSS que estiliza os pseudo-elementos (`::view-transition-old`, `::view-transition-new`), não de um hook React. Adicionar a query de redução ao stylesheet global cobrindo os pseudo-elementos de transição evita que o morph ou slide toque quando o usuário pediu menos movimento — mesma lógica do `useReducedMotion` já documentado no SKILL.md principal desta skill, aplicada em CSS puro.

## Fontes

Adaptado de [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) (MIT), skill `react-view-transitions` (`skills/react-view-transitions/SKILL.md` e references).
