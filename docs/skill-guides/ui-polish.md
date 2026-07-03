# UI Polish Guide

> Guia auxiliar da skill `52-ui-polish`. Consultar apenas quando a tarefa exigir codigo CSS/Tailwind/Motion detalhado por categoria. Adaptado de [jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) (MIT license).

---

## Indice

- [Tipografia](#tipografia)
- [Superficies](#superficies)
- [Animacoes](#animacoes)
- [Performance](#performance)

---

## Tipografia

### text-wrap: balance vs pretty

| Cenario | Usar |
| --- | --- |
| Headings/titulos, distribuicao uniforme importa | `text-wrap: balance` (max 6 linhas Chromium / 10 Firefox) |
| Paragrafo curto/medio, descricao, caption, texto de UI | `text-wrap: pretty` (sem limite de linhas, so evita orfa) |
| Texto longo (10+ linhas), code block | Nenhum — default do browser |

```css
h1, h2, h3 { text-wrap: balance; }
p, li, figcaption, blockquote { text-wrap: pretty; }
```

Tailwind: `text-balance` / `text-pretty`.

### Font Smoothing (macOS)

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

Aplicar uma vez no root — nunca por elemento (gera inconsistencia entre heading e body). So afeta macOS, seguro aplicar universal.

### Tabular Numbers

```css
.counter { font-variant-numeric: tabular-nums; }
```

Usar em: contador, timer, preco que atualiza, coluna numerica de tabela, scoreboard.
Nao usar em: numero estatico, versao (`v2.1.0`), telefone, CEP.

Caveat: em fontes como Inter, o digito `1` fica mais largo e centralizado com tabular-nums — geralmente desejavel para alinhamento, mas verificar visualmente.

---

## Superficies

### Border Radius Concentrico

```
outerRadius = innerRadius + padding
```

```tsx
// Bom
<div className="rounded-2xl p-2">   {/* 16px radius, 8px padding */}
  <div className="rounded-lg">      {/* 8px = 16 - 8 ✓ */}
</div>

// Ruim — mesmo radius nos dois
<div className="rounded-xl p-2">
  <div className="rounded-xl">
</div>
```

Se o padding entre camadas passar de `24px`, tratar como superficies separadas — escolher radius independente em vez de forcar a formula.

### Alinhamento Optico

- Botao com texto + icone: `padding-right = padding-left - 2px` (lado do icone recebe menos padding)
- Play button (triangulo): `margin-left: 2px` no SVG pra compensar o centro visual vs geometrico
- Icones assimetricos (estrela, seta, caret): preferir corrigir o SVG/viewBox direto; fallback e margin no wrapper

### Sombra em Vez de Borda

Aplicar em: cards, containers com profundidade, botoes com estilo bordered, elementos elevados (dropdown, modal), elementos sobre fundos variados, hover/focus com efeito de lift.

Nao aplicar em: dividers, bordas de celula de tabela, outline de input (acessibilidade), separadores hairline.

```css
:root {
  --shadow-border:
    0px 0px 0px 1px rgba(0, 0, 0, 0.06),
    0px 1px 2px -1px rgba(0, 0, 0, 0.06),
    0px 2px 4px 0px rgba(0, 0, 0, 0.04);
  --shadow-border-hover:
    0px 0px 0px 1px rgba(0, 0, 0, 0.08),
    0px 1px 2px -1px rgba(0, 0, 0, 0.08),
    0px 2px 4px 0px rgba(0, 0, 0, 0.06);
}

/* Dark mode — simplificar pra um ring so, depth shadow nao aparece em fundo escuro */
--shadow-border: 0 0 0 1px rgba(255, 255, 255, 0.08);
--shadow-border-hover: 0 0 0 1px rgba(255, 255, 255, 0.13);
```

```css
.card {
  box-shadow: var(--shadow-border);
  transition-property: box-shadow;
  transition-duration: 150ms;
  transition-timing-function: ease-out;
}
.card:hover { box-shadow: var(--shadow-border-hover); }
```

### Image Outline

Regra de cor nao-negociavel: preto puro no light (`rgba(0,0,0,0.1)`), branco puro no dark (`rgba(255,255,255,0.1)`). Nunca slate/zinc/near-black da paleta — tinge com a cor da superficie ao redor e parece sujeira na borda.

```tsx
<img
  className="outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
  src={src} alt={alt}
/>
```

`outline-offset: -1px` mantem a imagem no tamanho original (outline nao afeta layout como border afeta).

### Hit Area Minima

40x40px minimo (WCAG pede 44x44px). Estender com pseudo-elemento se o elemento visivel for menor:

```tsx
<button className="relative size-5 after:absolute after:top-1/2 after:left-1/2 after:size-10 after:-translate-1/2">
  <CheckIcon />
</button>
```

Se a area estendida colidir com outro elemento interativo, encolher ate nao colidir — nunca deixar hit areas sobrepostas.

---

## Animacoes

### CSS Transitions vs Keyframes

| | CSS Transition | CSS Keyframe |
| --- | --- | --- |
| Comportamento | Interpola pro ultimo estado | Roda em timeline fixa |
| Interrompivel | Sim — retarget no meio | Nao — reinicia do zero |
| Usar para | Mudanca de estado interativa (hover, toggle) | Sequencia que roda uma vez (entrada, loading) |

```css
/* Bom — interrompivel */
.drawer { transform: translateX(-100%); transition: transform 200ms ease-out; }
.drawer.open { transform: translateX(0); }

/* Ruim — keyframe em elemento interativo, fecha no meio = snap/restart */
.drawer.open { animation: slideIn 200ms ease-out forwards; }
```

### Entrada: Split e Stagger

1. Split em blocos logicos (titulo, descricao, botoes)
2. Stagger ~100ms entre blocos; titulos podem quebrar em palavras com ~80ms
3. Combinar `opacity` + `blur` + `translateY`

```tsx
<motion.div
  initial="hidden" animate="visible"
  variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
>
  <motion.h1 variants={{
    hidden: { opacity: 0, y: 12, filter: "blur(4px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)" },
  }}>Welcome</motion.h1>
</motion.div>
```

CSS-only (sem Motion): `animation-delay` escalonado via `:nth-child`.

### Saida Sutil

```tsx
<motion.div exit={{
  opacity: 0, y: -12, filter: "blur(4px)",
  transition: { duration: 0.15, ease: "easeIn" },
}}>{content}</motion.div>
```

Regras: `translateY` pequeno e fixo (nao altura total), duracao menor que a entrada (150ms vs 300ms), nunca remover a animacao de saida (`display: none` direto quebra o contexto).

### Animacao Contextual de Icone

Valores exatos — sem desvio:

```tsx
<motion.span
  initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
  exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
>
  <Icon />
</motion.span>
```

Sem Motion no projeto (checar `package.json`): dois icones no DOM, um `absolute`, cross-fade via `transition-[opacity,filter,scale]` com `cubic-bezier(0.2, 0, 0, 1)`.

Quando animar icone: hover de action button, troca de estado (play↔pause, like↔liked), toolbar contextual, indicador de loading/success.
Quando nao: navegacao estatica, icone decorativo, icone sempre visivel, label de texto ao lado do icone.

### Scale on Press

```css
.button { transition-property: scale; transition-duration: 150ms; transition-timing-function: ease-out; }
.button:active { scale: 0.96; }
```

Sempre `0.96`, nunca abaixo de `0.95`. Prop `static` no componente de botao pra desabilitar quando indesejado:

```tsx
const tapScale = "active:not-disabled:scale-[0.96]";
function Button({ static: isStatic, className, children, ...props }) {
  return (
    <button className={cn("transition-transform duration-150 ease-out", !isStatic && tapScale, className)} {...props}>
      {children}
    </button>
  );
}
```

### Skip Animation on Page Load

`initial={false}` em `AnimatePresence` evita entrada no primeiro render — bom pra icon swap, toggle, tabs. Quebra quando o componente depende do `initial` pra configurar a entrada da pagina (hero com stagger) — sempre verificar com refresh completo.

---

## Performance

### Transition Especifica, Nunca `all`

```css
/* Bom */
.button { transition-property: scale, background-color; transition-duration: 150ms; }
/* Ruim */
.button { transition: all 150ms ease-out; }
```

Tailwind `transition-transform` cobre `transform, translate, scale, rotate` — usar quando so anima transform. Multiplas propriedades nao-transform: `transition-[scale,opacity,filter]`.

### `will-change` com Moderacao

| Propriedade | GPU-compositavel | Vale `will-change` |
| --- | --- | --- |
| `transform` | Sim | Sim |
| `opacity` | Sim | Sim |
| `filter` | Sim | Sim |
| `clip-path` | Sim | Sim |
| `top`, `left`, `width`, `height` | Nao | Nao |
| `background`, `border`, `color` | Nao | Nao |

Adicionar so quando notar stutter no primeiro frame (Safari se beneficia mais). Nunca `will-change: all` — cada layer de composicao custa memoria.
