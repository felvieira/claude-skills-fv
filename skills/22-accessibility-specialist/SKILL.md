---
name: accessibility-specialist
description: |
  Skill dedicada a acessibilidade digital. Use quando precisar revisar WCAG, teclado, screen reader, contraste,
  semantica, motion reduction e acessibilidade de formularios, componentes e fluxos.
  Trigger em: "acessibilidade", "accessibility", "a11y", "WCAG", "screen reader", "navegacao por teclado", "contraste de cor", "ARIA", "semantica HTML", "motion reduction", "leitor de tela", "audit de acessibilidade".
---

# Accessibility Specialist

Acessibilidade nao e um check cosmetico de ultima hora — e um conjunto de requisitos verificaveis (WCAG 2.2 AA) que decidem se 15-20% dos usuarios conseguem usar o produto. Esta skill traz rigor dedicado sem depender de UI/UX, Frontend ou SEO improvisarem.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/quality-gates.md`, `policies/token-efficiency.md`, `policies/verification-before-completion.md` (toda claim de "acessivel" precisa de evidencia: axe limpo, teste de teclado, ou screen reader) e `policies/stack-flexibility.md`.

### Gate contra constituicao

Quando `memory/constitution.md` define eixo UX/acessibilidade:
- nenhum componente interativo novo passa sem navegacao por teclado completa
- contraste minimo AA (4.5:1 texto normal, 3:1 texto grande/UI) e gate, nao sugestao
- se o eixo marca WCAG AA como CRITICAL, violacao de nivel A/AA bloqueia o merge

## Quando Usar

- revisar acessibilidade de um fluxo, tela ou componente antes de merge
- auditar um app existente contra WCAG 2.2 AA e priorizar gaps
- validar teclado, screen reader, contraste e semantica de um formulario complexo
- definir requisitos a11y para uma feature nova (antes da implementacao, nao depois)

## Quando Nao Usar

- substituir UI/UX ou Frontend na implementacao base (esta skill revisa e especifica, nao reescreve tudo)
- tratar a11y como verniz final — chamada tarde, vira retrabalho caro
- conformidade legal formal (VPAT/ACR) — isso exige auditor certificado humano; esta skill prepara o terreno

## Entradas Esperadas

- fluxo/componente alvo + estados de UI (loading, error, empty, disabled, expanded)
- stack e biblioteca de componentes (Radix, MUI, shadcn, headless, custom)
- nivel alvo (WCAG 2.2 A, AA — default AA; AAA so se exigido)

## Saidas Esperadas

- findings priorizados por impacto x esforco, cada um com criterio WCAG citado (ex: "1.4.3 Contrast")
- correcoes concretas (snippet de codigo / atributo ARIA), nao "melhorar acessibilidade"
- handoff claro para Frontend (implementar), QA (regredir) ou UI/UX (repensar design)

## As 4 categorias de teste (faca as 4, nao so a automatica)

Ferramentas automaticas pegam ~30-40% das violacoes WCAG. As outras exigem mao e ouvido.

| Metodo | Cobre | Como |
|---|---|---|
| **Automatico** | contraste, alt faltando, label faltando, ARIA invalido, ordem de heading | `axe-core` (via `@axe-core/playwright`, jest-axe, ou extensao Axe DevTools); Lighthouse a11y |
| **Teclado** | foco, ordem, traps, ativacao, skip links | Desconecte o mouse. `Tab`/`Shift+Tab`/`Enter`/`Space`/`Esc`/setas pelo fluxo inteiro |
| **Screen reader** | nome/role/estado anunciados, live regions, contexto | NVDA (Win, gratis) ou VoiceOver (Mac, `Cmd+F5`); navegue por landmarks e headings |
| **Zoom / reflow** | 200%-400% zoom sem perda de conteudo, reflow a 320px | Browser zoom + viewport estreito; sem scroll horizontal em texto |

## Checklist WCAG 2.2 AA — os criterios que mais quebram

**Perceivable**
- [ ] **1.1.1** Todo `<img>` com `alt` (decorativa → `alt=""`); icone-botao com label acessivel
- [ ] **1.4.3** Contraste texto ≥ 4.5:1 (≥ 3:1 para ≥ 24px ou ≥ 19px bold)
- [ ] **1.4.11** Contraste de UI nao-texto (borda de input, icone, foco) ≥ 3:1
- [ ] **1.4.11 (grafico)** Barra, linha e fatia ≥ 3:1 contra o fundo **e** contra a serie vizinha; serie distinguivel sem depender de cor (rotulo direto, padrao de preenchimento, espessura ou marcador diferente) — legenda colorida ao lado do grafico nao resolve para daltonismo

> Contraste de token e **calculavel**, nao opinavel: `node scripts/check-contrast.mjs <css>` computa o ratio de cada par texto/superficie nos **dois** temas e falha (exit 1) abaixo do minimo. Passar no claro nao garante o escuro. Tokens em `hsl()`/`oklch()`/`var()` ficam fora desse passe e exigem verificacao manual documentada.
- [ ] **1.4.4 / 1.4.10** Texto escala a 200% e faz reflow a 320px sem scroll horizontal
- [ ] **1.3.1** Estrutura semantica: headings hierarquicos (sem pular de h1 → h4), listas reais, `<table>` com `<th>`

**Operable**
- [ ] **2.1.1** Tudo operavel por teclado; **2.1.2** sem keyboard trap
- [ ] **2.4.3** Ordem de foco logica (segue a leitura visual)
- [ ] **2.4.7** Foco visivel sempre (nunca `outline: none` sem substituto)
- [ ] **2.4.11** (2.2 novo) Elemento focado nao fica escondido atras de sticky header/footer
- [ ] **2.5.8** (2.2 novo) Alvo de toque ≥ 24x24 CSS px (ou espacamento equivalente)
- [ ] **2.4.1** Skip link para o conteudo principal

**Understandable**
- [ ] **3.3.2** Todo campo de form com `<label>` associado (`htmlFor`/`id`), nao so placeholder
- [ ] **3.3.1** Erro de validacao identificado em texto (nao so cor) e ligado ao campo (`aria-describedby`)
- [ ] **3.2.3** Navegacao consistente entre paginas

**Robust**
- [ ] **4.1.2** Componente custom expoe name/role/value corretos (use HTML nativo antes de ARIA)
- [ ] **4.1.3** Mudancas dinamicas anunciadas via `aria-live` (toast, erro, contador)

**Motion**
- [ ] **2.3.3** `prefers-reduced-motion` respeitado em toda animacao nao-essencial

## Exemplos concretos

**Icone-botao sem nome acessivel (1.1.1 / 4.1.2)**
```html
<!-- ERRADO: screen reader anuncia "button" sem contexto -->
<button><svg>...</svg></button>

<!-- CERTO -->
<button aria-label="Fechar dialogo"><svg aria-hidden="true">...</svg></button>
```

**Erro de form so por cor (1.4.1 / 3.3.1)**
```html
<!-- ERRADO: borda vermelha e a unica pista -->
<input class="border-red-500" />

<!-- CERTO: texto + associacao + estado programatico -->
<input aria-invalid="true" aria-describedby="email-err" />
<p id="email-err" role="alert">Email invalido: falta o @</p>
```

**`prefers-reduced-motion` (2.3.3)**
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

**Regra de ouro ARIA:** HTML nativo > ARIA. `<button>` ja e focavel, clicavel por teclado e tem role. Um `<div role="button" tabindex="0">` exige reimplementar `Enter`/`Space` na mao — e quase sempre faz errado.

## Anti-padroes frequentes

- `outline: none` sem `:focus-visible` substituto → teclado fica invisivel
- placeholder usado como label → some ao digitar, contraste baixo, screen reader inconsistente
- `aria-label` em elemento nao-interativo (ignorado) ou duplicando texto visivel
- `tabindex` positivo (`tabindex="3"`) → quebra a ordem natural, vira pesadelo de manutencao
- modal sem focus trap nem retorno de foco ao trigger no fechamento
- carrossel/autoplay sem pause e sem respeitar reduced-motion

## Evidencia de Conclusao

- axe-core rodado sem violacoes serias/criticas (anexar contagem)
- fluxo principal percorrido 100% por teclado, com foco visivel — descrever o caminho
- screen reader interpreta nome/role/estado dos controles-chave
- gaps restantes priorizados (impacto x esforco) com criterio WCAG citado

## Handoff

- **Frontend (04)** implementa as correcoes de codigo/ARIA
- **QA (05)** adiciona teste `jest-axe`/`@axe-core/playwright` para regredir
- **UI/UX (02)** repensa o design quando o problema e estrutural (contraste de paleta, alvo pequeno)
- **Responsive Conversion (56)** cobre o recorte de a11y que colide com mobile — hit area em tela de toque, focus trap e scroll lock de modal/bottom sheet, zoom de input no iOS. Esta skill continua dona do WCAG completo; a 56 aplica esse subconjunto durante a conversao para mobile
- **Mobile UX Foundations (57)** cobre contraste minimo verificado nos dois temas (o erro de halation com preto puro no dark mode), erro de formulario que nao depende so de cor, e alvo tatil por norma (44/48 vs. o piso de 24 da WCAG 2.2). Esta skill segue dona da auditoria completa
- Seguir `policies/handoffs.md` e, quando util, `templates/accessibility-check.md`
