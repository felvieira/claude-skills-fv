---
name: ui-polish
description: |
  Skill de polish de interface — os detalhes pequenos que fazem uma UI parecer refinada em vez de "ok". Use ao
  construir componentes, revisar codigo frontend, implementar animacoes, hover states, sombras, bordas, tipografia
  ou qualquer trabalho de detalhe visual. Trigger em: "polish", "deixar mais refinado", "parece meio off",
  "acabamento", "border radius", "alinhamento optico", "font smoothing", "tabular numbers", "shadow em vez de
  border", "sombra pra dar profundidade", "stagger na animacao de entrada", "animacao de saida",
  "scale on press", "stagger animation", "hit area", "image outline", "revisar detalhes visuais".
---

# UI Polish - Detalhes que Fazem a Interface Parecer Melhor

Grandes interfaces raramente vêm de uma coisa só. É uma coleção de pequenos detalhes que se acumulam. Esta skill entra depois que Frontend (04) e/ou Motion Design (12) já produziram o componente — ela revisa e ajusta acabamento, não substitui a estrutura.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md` e `policies/evals.md`.

Para exemplos extensos de CSS/Tailwind/Motion por categoria, consultar `docs/skill-guides/ui-polish.md` apenas quando necessario.

## Quando Usar

- revisar ou ajustar acabamento visual de componentes ja implementados
- implementar animacoes de entrada/saida, hover states, micro-interacoes de icone
- resolver feedback subjetivo tipo "parece meio off" ou "falta polish"
- checklist final antes de considerar um componente "pronto"

## Quando Nao Usar

- para definir estrutura, layout ou fluxo de tela do zero (isso e 02-ui-ux-design)
- para sistema de motion tokens ou orquestracao de animacao em escala (isso e 12-motion-design — esta skill foca em detalhes pontuais, nao no sistema)
- para logica de componente, estado ou integracao com API (isso e 04-frontend-integration)

## Entradas Esperadas

- componente(s) ja implementados (Frontend) e/ou com motion base (Motion Design)
- codigo CSS/Tailwind/Motion existente para revisar
- feedback subjetivo do usuario sobre "sensacao" da interface, se houver

## Saidas Esperadas

- tabela markdown com mudancas Before/After, agrupadas por principio
- checklist de revisao marcado
- codigo ajustado (CSS, Tailwind ou Motion) aplicado direto nos arquivos do Frontend

## Principios Core

### 1. Border Radius Concentrico

Raio externo = raio interno + padding. Raios diferentes em elementos aninhados e a coisa mais comum que faz uma interface parecer errada.

```
outerRadius = innerRadius + padding
```

Se o padding for maior que `24px`, tratar as camadas como superficies separadas — nao forcar concentricidade.

### 2. Alinhamento Optico > Geometrico

Quando a centralizacao geometrica parece errada, alinhar oticamente. Botoes com icone, triangulos de play e icones assimetricos (estrela, seta, caret) precisam de ajuste manual.

- Botao com texto + icone: `padding do lado do icone = padding do lado do texto - 2px`
- Play button: deslocar o triangulo levemente pra direita (`margin-left: 2px`)
- Icones assimetricos: preferir corrigir o SVG na fonte a adicionar margin

### 3. Sombra em Vez de Borda

Para cards, containers e botoes com proposito de profundidade/elevacao, usar `box-shadow` em camadas transparentes em vez de `border` solida. Sombra se adapta a qualquer fundo; borda solida nao.

**Nao aplicar em dividers** (`border-b`, `border-t`, separadores de layout) — esses continuam borda.

```css
--shadow-border:
  0px 0px 0px 1px rgba(0, 0, 0, 0.06),
  0px 1px 2px -1px rgba(0, 0, 0, 0.06),
  0px 2px 4px 0px rgba(0, 0, 0, 0.04);
```

Dark mode: simplificar pra um unico ring branco (`0 0 0 1px rgba(255, 255, 255, 0.08)`).

### 4. Animacoes Interrompiveis

CSS transitions para mudancas de estado interativas (hover, toggle, abrir/fechar) — retomam de onde pararam se o usuario mudar de intencao no meio. Keyframes ficam reservados para sequencias que rodam uma vez (loading, entrada de pagina) — reiniciam do zero se interrompidas, o que parece quebrado em elemento interativo.

### 5. Split e Stagger em Animacoes de Entrada

Nao animar um container unico. Quebrar em blocos semanticos (titulo, descricao, botoes) e escalonar com ~100ms de delay entre eles. Para titulos, considerar quebrar em palavras individuais com ~80ms de stagger. Combinar `opacity` + `blur` + `translateY`.

### 6. Animacoes de Saida Sutis

Saida deve ser mais discreta que entrada — o foco do usuario ja foi pro proximo lugar. Usar `translateY` pequeno e fixo (ex: `-12px`), nao a altura total do elemento. Duracao de saida menor que entrada (ex: 150ms vs 300ms). Nunca remover a animacao de saida completamente (`display: none` direto) — motion sutil preserva contexto.

### 7. Animacao Contextual de Icone

Ao trocar icone (hover, mudanca de estado), animar com `opacity` + `scale` + `blur` em vez de so alternar visibilidade. Valores exatos, sem desvio:

- `scale`: `0.25` → `1` (nunca `0.5` ou `0.6`)
- `opacity`: `0` → `1`
- `filter`: `blur(4px)` → `blur(0px)`
- Se o projeto tiver `motion`/`framer-motion` no `package.json`: `transition: { type: "spring", duration: 0.3, bounce: 0 }` — bounce **sempre** `0`
- Sem lib de motion: manter os dois icones no DOM (um absolute) e cross-fade via CSS transition com `cubic-bezier(0.2, 0, 0, 1)` — da entrada e saida sem dependencia nova

### 8. Font Smoothing

`-webkit-font-smoothing: antialiased` + `-moz-osx-font-smoothing: grayscale` no root do layout (afeta so macOS, seguro aplicar universal).

### 9. Tabular Numbers

`font-variant-numeric: tabular-nums` (Tailwind: `tabular-nums`) em qualquer numero que atualiza dinamicamente (contador, preco, timer, coluna de tabela) — evita layout shift. Nao usar em numeros estaticos (versao, CEP, telefone).

### 10. Text Wrapping

- `text-wrap: balance` (Tailwind: `text-balance`) em headings — so funciona ate 6 linhas (Chromium) / 10 (Firefox), nao usar em paragrafo longo
- `text-wrap: pretty` (Tailwind: `text-pretty`) em paragrafo curto/medio, descricao, caption, item de lista — evita palavra orfa na ultima linha
- Texto muito longo (10+ linhas): nenhum dos dois, deixar wrapping default

### 11. Image Outline

Outline sutil de `1px` em imagens para profundidade consistente. Regra de cor **nao-negociavel**: preto puro `rgba(0, 0, 0, 0.1)` no light mode, branco puro `rgba(255, 255, 255, 0.1)` no dark mode. Nunca usar near-black/near-white da paleta do projeto (slate-900, zinc-900, etc) — outline com tinta pega a cor da superficie ao redor e parece sujeira na borda da imagem.

```tsx
<img className="outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" />
```

### 12. Scale on Press

`scale(0.96)` sutil no click para feedback tatil. Sempre `0.96` — nunca menor que `0.95` (fica exagerado). Usar CSS transition (interrompivel). Adicionar prop `static` no componente de botao pra desabilitar quando o movimento for indesejado.

### 13. Skip Animation on Page Load

`initial={false}` em `AnimatePresence` evita animacao de entrada no primeiro render — funciona bem pra icon swap, toggle, tabs. **Nao usar** quando o componente depende do `initial` pra configurar a entrada da pagina (hero com stagger, loading state) — verificar sempre com refresh completo da pagina.

### 14. Nunca Usar `transition: all`

Sempre especificar propriedades exatas: `transition-property: scale, opacity`. Tailwind `transition-transform` cobre `transform, translate, scale, rotate` — usar quando so anima transform; para multiplas propriedades nao-transform, usar `transition-[scale,opacity,filter]`.

### 15. `will-change` com Moderacao

So para `transform`, `opacity`, `filter`, `clip-path` — propriedades que a GPU compoe. Nunca `will-change: all`. Adicionar so quando notar stutter no primeiro frame (Safari se beneficia mais); nao adicionar preventivamente — cada layer de composicao custa memoria.

### 16. Hit Area Minima

Elementos interativos precisam de pelo menos 40x40px (WCAG pede 44x44px) de area clicavel. Estender com pseudo-elemento se o elemento visivel for menor (ex: checkbox 20x20). Duas areas de hit nunca podem sobrepor — se colidir, encolher o pseudo-elemento até nao colidir.

## Erros Comuns

| Erro | Correcao |
| --- | --- |
| Mesmo border radius em pai e filho | Calcular `outerRadius = innerRadius + padding` |
| Icone parece descentralizado | Ajustar oticamente com padding ou corrigir SVG direto |
| Borda dura entre secoes | Usar `box-shadow` em camadas com transparencia |
| Animacao de entrada/saida abrupta | Split, stagger, e manter saida sutil |
| Numero causa layout shift | Aplicar `tabular-nums` |
| Texto pesado no macOS | Aplicar `antialiased` no root |
| Animacao toca no page load | Adicionar `initial={false}` no `AnimatePresence` |
| `transition: all` em elementos | Especificar propriedades exatas |
| Stutter no primeiro frame | Adicionar `will-change: transform` (com moderacao) |
| Hit area minuscula em controle pequeno | Estender com pseudo-elemento ate 40x40px |

## Formato de Output da Revisao

Sempre apresentar mudancas como tabela markdown com colunas **Before** e **After**, agrupadas por principio (um heading por principio, uma tabela por heading). Incluir toda mudanca feita, nao um subconjunto. Se um principio foi revisado mas nada precisou mudar, omitir a tabela inteira — tabela vazia so gera ruido.

```markdown
#### Border radius concentrico
| Before | After |
| --- | --- |
| `rounded-xl` no card + `rounded-xl` no botao interno (`p-2`) | `rounded-2xl` no card (`12+8`), `rounded-lg` no botao interno |

#### Scale on press
| Before | After |
| --- | --- |
| `scale(0.9)` no press | Ajustado para `scale(0.96)` — abaixo de `0.95` fica exagerado |
```

## Checklist de Revisao

- [ ] Elementos aninhados com border radius usam concentricidade
- [ ] Icones alinhados oticamente, nao so geometricamente
- [ ] Sombra usada em vez de borda onde aplicavel (nao em dividers)
- [ ] Animacoes de entrada divididas e escalonadas
- [ ] Animacoes de saida sutis
- [ ] Numeros dinamicos usam `tabular-nums`
- [ ] Font smoothing aplicado no root
- [ ] Headings usam `text-wrap: balance`; paragrafos curtos usam `text-wrap: pretty`
- [ ] Imagens tem outline sutil (preto/branco puro, nunca tintado)
- [ ] Botoes usam scale on press onde aplicavel
- [ ] `AnimatePresence` usa `initial={false}` quando o estado default nao deve animar no load
- [ ] Nenhum `transition: all` — sempre propriedades especificas
- [ ] `will-change` so em transform/opacity/filter/clip-path, nunca `all`
- [ ] Elementos interativos com pelo menos 40x40px de hit area, sem sobreposicao

## Evidencia de Conclusao

- tabela Before/After cobrindo toda mudanca aplicada
- checklist de revisao marcado
- nenhuma regressao visual introduzida (validar com screenshot/preview quando disponivel)

## Handoff

### Recebe de Frontend (04) e/ou Motion Design (12)

1. Componente implementado e funcional
2. Motion tokens e padroes de animacao ja definidos (se Motion Design ja rodou)

Esta skill NAO cria componentes novos — ajusta acabamento no MESMO codebase do Frontend/Motion. Se Motion Design ainda nao rodou e a tarefa envolve sistema de animacao amplo (nao so detalhe pontual), delegar a 12-motion-design primeiro.

### Entrega para Reviewer (11) / QA (05)

1. Tabela Before/After completa
2. Checklist marcado
3. Alertar se alguma mudanca de acabamento impacta acessibilidade (contraste, motion, hit area) — nesse caso, sinalizar tambem para 22-accessibility-specialist

## Regra de Codigo Limpo

ZERO comentarios explicando o que o codigo faz. Nomes de classes/variaveis autoexplicativos. Comentario so quando existe uma restricao nao-obvia (ex: por que um valor exato como `bounce: 0` ou `scale(0.96)` foi escolhido, se nao for evidente do contexto).

## Fontes

- Principios e valores exatos adaptados de [jakubkrehel/make-interfaces-feel-better](https://github.com/jakubkrehel/make-interfaces-feel-better) (MIT license).

## Integracao com Pipeline

- **Orquestrador (skill 09):** decide quando esta skill entra — tipicamente apos Frontend (04) e opcionalmente apos Motion Design (12)
- **UI/UX Design (skill 02):** aesthetic anchors definem direcao; esta skill garante que a execucao nao destoa em detalhe
- **Motion Design (skill 12):** dono do sistema de motion tokens/orquestracao; esta skill foca em ajustes pontuais de acabamento, incluindo animacao
- **Accessibility Specialist (skill 22):** consultar quando ajuste de polish tocar contraste, motion ou hit area
