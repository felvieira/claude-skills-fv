# Responsive Conversion Guide

Guia de referência da skill `56-responsive-conversion`. Consultar quando precisar do snippet exato por framework, ou do detalhe de um bug que a SKILL.md só resume.

## Bug 1 — `min-width: auto` (a causa nº1 de "não pega 100%")

Todo item de flex e grid nasce com `min-width: auto`, não `0`. Ele se recusa a encolher abaixo do tamanho do conteúdo, então em vez de caber, ele empurra o container.

```html
<!-- QUEBRA: o texto longo empurra o container inteiro -->
<div class="flex gap-4">
  <div class="flex-1">
    <p class="truncate">texto-muito-longo-sem-espaco-nenhum-aqui</p>
  </div>
  <button>Ação</button>
</div>

<!-- CORRETO -->
<div class="flex gap-4">
  <div class="flex-1 min-w-0">
    <p class="truncate">texto-muito-longo-sem-espaco-nenhum-aqui</p>
  </div>
  <button class="shrink-0">Ação</button>
</div>
```

`truncate`, `text-ellipsis` e `overflow-hidden` **não funcionam** dentro de um flex item sem `min-w-0` — a causa raiz precisa vir primeiro.

Em grid, existe a alternativa de resolver na definição da coluna:

```css
/* Em vez de min-width: 0 em cada item */
.grid { grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); }
```

Diagnóstico rápido: se `w-full` no filho não surtiu efeito, o problema quase sempre está no **pai** (largura intrínseca via `w-fit`, `inline-block`, `table`, ou falta de `min-w-0`).

## Bug 2 — Unidades de viewport

```css
/* Ordem importa: navegador que não entende dvh ignora a 2ª linha */
.tela-cheia {
  height: 100vh;
  height: 100dvh;
}
```

| Unidade | Barra do browser | Uso |
| --- | --- | --- |
| `vh` | Ignora (assume recolhida) | Legado; corta conteúdo em mobile |
| `dvh` | Acompanha dinamicamente | Default para tela cheia |
| `svh` | Assume visível (menor) | Quando nada pode ficar escondido |
| `lvh` | Assume recolhida (maior) | Background decorativo |

Tailwind v3.4+: `h-dvh`, `min-h-dvh`, `h-svh`. Versões anteriores exigem CSS custom.

Cuidado com `dvh` em elemento que anima — a altura muda enquanto o usuário rola (barra some/aparece) e a animação treme. Nesses casos, `svh` é mais estável.

## Bug 3 — Safe area (notch, ilha dinâmica, barra de gestos)

Exige as duas peças. Só o CSS, sem a meta tag, não faz nada.

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
:root {
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

/* Somar ao padding próprio, não substituir */
.header-fixo    { padding-top: calc(0.75rem + var(--safe-top)); }
.bottom-nav     { padding-bottom: calc(0.5rem + var(--safe-bottom)); }
.bottom-sheet   { padding-bottom: calc(1.5rem + var(--safe-bottom)); }
```

O fallback `0px` no `env()` é obrigatório — em browser sem suporte, `env()` sem fallback invalida a declaração inteira do `calc()`.

Tailwind (config):

```js
// tailwind.config.js
theme: {
  extend: {
    padding: {
      'safe-b': 'env(safe-area-inset-bottom, 0px)',
      'safe-t': 'env(safe-area-inset-top, 0px)',
    },
  },
}
```

## Bug 4 — Caçar scroll horizontal

```js
// Console: lista quem é mais largo que a tela
document.querySelectorAll('*').forEach(el => {
  if (el.offsetWidth > document.documentElement.offsetWidth) {
    console.log(el.offsetWidth, el);
  }
});

// Alternativa visual: pinta a borda de todo mundo
document.querySelectorAll('*').forEach(el => el.style.outline = '1px solid red');
```

Causas ordenadas por frequência real:

1. Largura fixa em px maior que a tela (`w-[400px]` numa tela de 320px)
2. `100vw` — inclui a largura da barra de scroll no desktop; usar `100%`
3. Margem negativa sem `overflow-hidden` no pai
4. `grid-cols-3` fixo sem breakpoint
5. Imagem sem `max-width: 100%`
6. Tabela sem wrapper com `overflow-x-auto`
7. `position: absolute` com `right` negativo

Nunca aplicar `overflow-x: hidden` no `body` como correção: esconde o sintoma, mantém o bug, e quebra `position: sticky` em qualquer descendente.

## Bug 5 — Grid responsivo sem media query

```html
<!-- Colunas se ajustam sozinhas ao espaço; sem breakpoint nenhum -->
<div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
```

```css
/* CSS puro equivalente */
.grid-auto {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
  gap: 1rem;
}
```

O `min(280px, 100%)` é o detalhe que evita overflow quando a tela é menor que o próprio `minmax` — sem ele, uma tela de 250px estoura com o mínimo de 280px.

`auto-fit` vs `auto-fill`: `auto-fit` estica os itens para preencher a linha; `auto-fill` mantém as trilhas vazias. Para card de conteúdo, quase sempre `auto-fit`.

Tipografia fluida sem breakpoint:

```css
.titulo { font-size: clamp(1.5rem, 5vw, 3rem); }
```

## Bug 6 — Formulário mobile

```html
<input
  type="email"
  inputmode="email"
  autocomplete="email"
  class="text-base"   <!-- 16px: abaixo disso o iOS aplica zoom ao focar -->
/>

<input type="text" inputmode="numeric" autocomplete="one-time-code" />
<input type="tel"  inputmode="tel"     autocomplete="tel" />
<input type="text" inputmode="decimal" />
```

Valores de `autocomplete` que realmente mudam a experiência: `given-name`, `family-name`, `email`, `tel`, `street-address`, `postal-code`, `cc-number`, `cc-exp`, `one-time-code` (traz o código do SMS no iOS).

Teclado cobrindo o campo:

```css
input, textarea { scroll-margin-bottom: 6rem; }
```

Botão de submit fixo no rodapé, respeitando a barra de gestos:

```html
<div class="sticky bottom-0 border-t bg-white px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
  <button class="w-full">Salvar</button>
</div>
```

## Modal e bottom sheet

Preferir primitiva pronta com acessibilidade resolvida (Radix Dialog, Headless UI, `<dialog>` nativo) a implementar focus trap na mão.

Scroll lock que não perde a posição no iOS:

```js
// Ao abrir
const scrollY = window.scrollY;
document.body.style.position = 'fixed';
document.body.style.top = `-${scrollY}px`;
document.body.style.width = '100%';

// Ao fechar
const top = document.body.style.top;
document.body.style.position = '';
document.body.style.top = '';
window.scrollTo(0, parseInt(top || '0', 10) * -1);
```

`overflow: hidden` sozinho no `body` não segura o scroll no Safari iOS — daí o `position: fixed` com restauração manual.

Bottom sheet — estrutura mínima:

```html
<div class="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-2xl
            bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
  <div class="sticky top-0 flex justify-center py-3">
    <div class="h-1 w-10 rounded-full bg-gray-300"></div>  <!-- handle -->
  </div>
  <!-- conteúdo -->
</div>
```

`max-h-[85dvh]` deixa o topo da tela visível, sinalizando que é uma camada e não uma nova página.

## Confirmação — exemplos concretos

Destrutivo comum:

```
Título:  Excluir o projeto "Vendas Q4"?
Corpo:   Os 128 registros e 3 integrações conectadas serão removidos permanentemente.
Ações:   [Cancelar]  [Excluir projeto]
Foco:    Cancelar
```

Catastrófico (exige digitação):

```
Título:  Excluir a conta da organização Acme?
Corpo:   Isso remove 14 projetos, 1.204 registros e revoga o acesso de 8 membros.
         Não há backup recuperável depois desta ação.
Campo:   Digite "Acme" para confirmar   [__________]
Ações:   [Cancelar]  [Excluir organização]  ← desabilitado até bater exato
```

Reversível — sem modal, com undo:

```
Toast:   Item arquivado.  [Desfazer]
Duração: 5–10s (mais que isso vira ruído; menos, o usuário não alcança)
```

Regra prática: se dá pra implementar undo, implemente undo. Modal de confirmação em ação reversível treina o usuário a clicar "sim" sem ler — e aí ele clica "sim" também no modal que importava.

## Teste de viewport com Playwright

Transforma o bug corrigido em regressão permanente (handoff para skill 05):

```js
const VIEWPORTS = [
  { name: 'mobile-small', width: 320, height: 568 },
  { name: 'mobile',       width: 390, height: 844 },
  { name: 'tablet',       width: 768, height: 1024 },
  { name: 'desktop',      width: 1280, height: 800 },
];

for (const vp of VIEWPORTS) {
  test(`sem scroll horizontal em ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/');
    const overflows = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(overflows).toBe(false);
  });
}
```

Para hit area:

```js
test('alvos de toque têm 44px mínimo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const pequenos = await page.evaluate(() =>
    [...document.querySelectorAll('button, a, input, [role="button"]')]
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.width < 44 || r.height < 44);
      })
      .map(el => el.outerHTML.slice(0, 100))
  );
  expect(pequenos).toEqual([]);
});
```

## Referência rápida de breakpoints

```
320px   iPhone SE, Android pequeno    — o piso real
390px   iPhone 14/15/16 padrão
414px   iPhone Plus/Max
768px   iPad retrato / limiar tablet
1024px  iPad paisagem / laptop pequeno
1280px  desktop padrão
```

Testar 320, 390 e 768 pega quase todo bug de layout. Abaixo de 320px não existe dispositivo relevante hoje.
