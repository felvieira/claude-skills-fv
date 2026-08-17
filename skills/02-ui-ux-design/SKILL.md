---
name: ui-ux-design
description: |
  Skill do Designer UI/UX para definição de interfaces e experiência do usuário. Use quando precisar criar
  wireframes, design system tokens, componentes de UI, fluxos de navegação, acessibilidade, ou qualquer
  decisão de interface. Cobre também derivação de paleta (esquema de cor, OKLCH, 60/30/10), leis
  cognitivas de layout (Hick, Fitts, Gestalt, Von Restorff) e estados vazios por tipo. Cobre ainda
  auditoria de interface existente: modo dual auditoria/implementação, classificação de achado
  (norma/evidência/heurística/preferência), priorização por severidade e tabela de achados.
  Trigger em: "design", "UI", "UX", "interface", "wireframe", "componente visual",
  "layout", "responsivo", "mobile first", "acessibilidade básica", "acessibilidade dos componentes",
  "wcag", "design system", "protótipo", "Figma", "aesthetic anchor", "âncora estética",
  "paleta", "esquema de cores", "estado vazio", "empty state", "quantas opções mostrar",
  "auditar a interface", "auditar essa tela", "revisar o design", "auditoria de UI",
  "avaliar a usabilidade", "achados de UX", "review de design", "dar um parecer",
  "parecer sobre a usabilidade".
---

# UI/UX Designer - Interface e Usabilidade

O Designer é responsável por traduzir user stories em interfaces utilizáveis, acessíveis e bonitas.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/evals.md` e `policies/visual-diff-precision.md` (comparar dois screenshots/estados para achar diferença fina de posicionamento, espaçamento ou cor — obrigatória no modo Auditoria quando o achado depende de medir, não só descrever).

Conteúdo sob demanda vive em `references/` (auditoria, marketing, produto, formulário) — não em `docs/skill-guides/`; tokens, breakpoints, componentes, skeleton e Nielsen já estão neste arquivo, não há guia externo duplicado.

Para uso de MCPs de bibliotecas visuais como referencia ou aceleracao, consultar `docs/skill-guides/ui-component-mcps.md`.

Para checklist de acabamento fino (border radius concentrico, alinhamento optico, sombra vs borda, tabular numbers, hit area minima), ver `skills/52-ui-polish/SKILL.md` — despachar apos Frontend implementar, antes do Reviewer final.

Esta skill decide como a interface **vai** parecer, antes de existir. Para converter interface ja implementada em versao mobile, ou corrigir layout quebrado (componente que nao ocupa 100%, corta na tela, scroll horizontal, modal estourando viewport), ver `skills/56-responsive-conversion/SKILL.md` — inclui tambem os padroes de modal/bottom sheet e de confirmacao de acao destrutiva, que esta skill so cita como heuristica de Nielsen.

Se o produto pode receber outro idioma — mesmo que hoje seja so pt-BR — ver `skills/58-i18n-localization/SKILL.md` antes de fixar largura de botao, alinhamento ou formato de data: texto traduzido cresce ate 30% e RTL inverte o layout inteiro. Preparar depois custa muito mais que projetar assim desde o inicio.

Para as restricoes fisiologicas que os tokens desta skill tem de respeitar — zona do polegar (onde a navegacao pode morar), superficie base do dark mode (`#121212`, nunca preto puro) e contraste minimo verificado nos dois temas — ver `skills/57-mobile-ux-foundations/SKILL.md`. Essa skill tambem cobre percepcao de espera (skeleton vs. spinner por faixa de duracao) e UX de login/onboarding/permissao.

## Dois Modos: Desenhar vs. Auditar

O corpo deste arquivo (âncora estética, tokens, leis cognitivas) é para **desenhar do zero** — interface que ainda não existe.

Quando o pedido é **revisar, avaliar ou corrigir** uma interface que já existe, o protocolo é outro: carregar `references/audit-framework.md`. Ele define os dois submodos (auditoria = nenhuma alteração de arquivo; implementação = edição com escopo restrito), o fluxo de 9 passos, a classificação de achado em norma/evidência/heurística/preferência, a priorização por severidade×alcance×frequência×confiança, o formato de tabela de achados, e a definição de pronto. Não misturar os dois: pedido de análise nunca sai em diff.

## Quando Usar

- definir interface, fluxo e comportamento responsivo, do zero
- transformar spec em estrutura de tela e decisao de usabilidade
- auditar interface existente (ver "Dois Modos" acima — carrega `references/audit-framework.md`)
- corrigir interface existente quando explicitamente autorizado a editar

## Quando Nao Usar

- para decidir regras de negocio ou contrato de API sozinho
- para editar arquivo quando o pedido só autorizou análise — ver modo Auditoria acima
- para construir feature nova a partir de spec — isso é `skills/04-frontend-integration/SKILL.md`. O modo Implementação desta skill é escopado a corrigir a causa de um achado de auditoria, não a implementar funcionalidade nova

## Entradas Esperadas

- spec do PO
- restricoes de plataforma e acessibilidade
- contexto de usuarios e fluxos principais
- dossie de Design Intelligence (skill 29), quando disponivel: concorrentes analisados, tendencias visuais, moodboards, paleta e tipografia sugeridas, direcao estrategica (copiar/evitar/diferenciar)

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

**Wireframe não é um estágio só.** Baixa fidelidade (estrutura, sem cor nem tipografia real) valida conceito, hierarquia e sequência de tela — errar rápido aqui é barato. Alta fidelidade (com âncora estética, tokens e conteúdo real) só entra depois que a direção de baixa fidelidade está validada, porque é onde se testa conteúdo real, estado e entrega ao Frontend. Pular direto para alta fidelidade sem validar a estrutura é decorar um esqueleto que ainda pode mudar.

## Direção Estética — Aesthetic Anchors

Antes de qualquer wireframe ou token, escolher **uma** âncora estética e comprometer com ela. Interface sem direção vira média genérica — o padrão "SaaS azul com Inter". A âncora orienta paleta, tipografia, textura, densidade, ritmo visual e até a complexidade da implementação. Misturar âncoras dilui o resultado; escolher uma e executar com precisão diferencia.

Âncoras disponíveis (escolher 1):

- **Brutally minimal** — preto/branco/cinza, tipografia neutra precisa (Helvetica, Söhne, Aktiv), espaço em branco generoso, zero ornamento
- **Maximalist chaos** — múltiplas cores saturadas, sobreposições, layers, animações densas, tipografia mista e expressiva
- **Retro-futuristic** — paletas anos 70/80 (laranja queimado, marrom, creme), grotescas geométricas (Eurostile, Orbitron), grids visíveis
- **Organic/natural** — tons terrosos, serifs orgânicas (Cooper, Recoleta), texturas de papel, formas irregulares, ilustração feita à mão
- **Luxury/refined** — paletas restritas (off-white, bordô, dourado fosco), serifs de alto contraste (Didot, Bodoni), espaçamento amplo, fotografia premium
- **Playful/toy-like** — cores primárias vibrantes, tipografia arredondada (Fraunces wonky, Mochiy), formas chunky, ícones ilustrados
- **Editorial/magazine** — grid tipográfico forte, mistura serif display + sans body, hierarquia jornalística, drop caps, fotografia com bleed
- **Brutalist/raw** — HTML default exposto, bordas duras, tipografia monoespaçada ou system-ui propositalmente "feia", contraste agressivo
- **Art deco/geometric** — simetria, linhas finas douradas/metálicas, paletas escuras profundas, tipografia geométrica (Poiret, Limelight)
- **Soft/pastel** — pastéis dessaturados, serifs suaves ou rounded sans, sombras difusas, gradientes sutis
- **Industrial/utilitarian** — monoespaçadas técnicas (JetBrains Mono, IBM Plex Mono), tabelas de dados, grids visíveis, paletas funcionais (verde terminal, âmbar)

**Regra de complexidade casada com visão:**
- Maximalist/editorial/art deco exigem implementação elaborada (layers, custom shaders, animações orquestradas) — código simples nessas âncoras parece preguiçoso
- Brutally minimal/refined exigem precisão obsessiva em espaçamento, tipografia e timing — código complicado nessas âncoras parece poluído

**Reforço de atmosfera:** uma vez escolhida a âncora, considerar gradient meshes, noise/grain overlays, padrões geométricos, transparências em camadas, sombras dramáticas, cursors customizados — desde que alinhados à âncora (não como ornamento solto).

**Dials de intensidade (ajuste fino dentro da âncora):**

Depois de escolher a âncora, calibrar 3 dials de 1-10 antes de gerar tokens ou wireframe. Eles não substituem a âncora — modulam o quão longe executá-la:

- **DESIGN_VARIANCE** (1 = execução conservadora e previsível da âncora; 10 = interpretação ousada, quebra convenções do gênero) — subir para produtos que competem em diferenciação visual, baixar para produtos onde familiaridade reduz fricção (formulários financeiros, dashboards operacionais)
- **VISUAL_DENSITY** (1 = muito espaço em branco, poucos elementos por tela; 10 = denso, muita informação simultânea) — dashboards e ferramentas B2B tendem alto; landing pages e onboarding tendem baixo
- **MOTION_INTENSITY** (1 = estático ou só feedback essencial; 10 = movimento expressivo e contínuo) — só a referência aqui; a implementação real do dial pertence à skill 12 (`skills/12-motion-design/SKILL.md`), que recebe o valor como contexto de handoff

Registrar os 3 valores escolhidos (com justificativa de 1 frase cada) no handoff para Frontend — eles orientam decisões que o Frontend tomaria sozinho por falta de contexto.

**Anti-padrões a evitar (independente da âncora):**

- Fonts genéricas sem justificativa: Arial, Inter, Roboto, Space Grotesk, system-ui default
- Gradiente roxo-para-rosa em fundo branco (clichê "AI SaaS 2023")
- Paleta indigo-500/violet-500 default do Tailwind sem customização
- Sombras `shadow-lg` genéricas sem direção de luz definida
- Border-radius `rounded-2xl` em tudo sem razão estética
- "Bento grid" como solução padrão para qualquer landing
- Hero com headline + subhead + 2 CTAs centralizado sem identidade
- Em-dash (—) como recurso estilístico em copy de interface (headline, CTA, microcopy) — tell reconhecível de texto gerado por IA; usar ponto, vírgula ou quebrar em duas frases

**Anti-padrões por indústria/vertical:**

Quando o projeto se encaixa claramente em uma destas verticais, aplicar também as restrições específicas — além dos anti-padrões gerais acima:

| Vertical | Paleta banida | Tipografia a evitar | Anti-padrão específico |
| --- | --- | --- | --- |
| **Banking/fintech tradicional** | Gradiente roxo-rosa, "AI purple" genérico | Sans geométrica sem peso (sinaliza informalidade) | Dashboards com excesso de cor — dados financeiros pedem paleta contida e hierarquia por peso tipográfico, não por cor |
| **Fintech consumer/neobank** | Verde escuro corporativo tradicional (sinaliza banco legado) | Serif (sinaliza "tradicional demais" pro público) | Copiar 1:1 o layout de app bancário legado — a expectativa do segmento é mobile-first, não desktop-first adaptado |
| **Saúde/wellness** | Azul clínico frio isolado sem calor (sinaliza hospital impessoal) | Tipografia condensada/técnica como corpo de texto | Ícones médicos genéricos de stock (cruz vermelha, estetoscópio) como atalho visual |
| **E-commerce** | — (paleta é dirigida pela marca do produto, não pela vertical) | Display font pesada em preço/CTA de compra (reduz legibilidade em decisão rápida) | Grid de produto sem hierarquia de destaque — tudo do mesmo tamanho força o usuário a escolher sem orientação |
| **SaaS B2B (operacional/dashboard)** | Paleta vibrante multi-cor sem função (cor deve significar estado, não decorar) | Display expressivo em dados tabulares | Onboarding com tour de 10 passos antes de deixar o usuário agir — fricção que a persona B2B não tolera |
| **Educação/e-learning** | Paleta infantilizada em produto para adulto (erro comum em upskilling B2C) | Tipografia lúdica quando o público é profissional | Gamificação genérica (barra de XP, badges) sem conexão com o resultado real de aprendizagem |

## Adotar um Design System Existente

Antes de derivar tokens do zero, decidir se um design system maduro resolve — Material 3, Apple HIG, Fluent 2, Carbon, ou primitiva + tokens próprios. Tabela de encaixe por tipo de produto, regra de decisão e o que compartilhar entre plataformas: `references/product-apps.md`.

A ordem de construção não é negociável: **semântica → tokens → primitivas → componentes → estados → dados → responsivo → estilo visual → motion**. Design que só funciona depois que a decoração entra está escondendo problema de hierarquia ou de arquitetura da informação.

## Componente de Feedback — Escolher pela Gravidade

O componente de mensagem é escolhido por **urgência × persistência × necessidade de ação**, não pelo que é mais fácil implementar:

| Padrão | Quando | Evitar |
| --- | --- | --- |
| **Inline** (junto do elemento) | Erro de campo, estado de uma seção | Abrir modal para problema que se resolve no próprio contexto |
| **Snackbar / toast** | Resultado breve e não bloqueante, com ação opcional ("Desfazer") | Informação que precisa continuar visível até ser resolvida — some antes de ser lida |
| **Banner** | Condição relevante que deve permanecer visível (offline, conta suspensa, manutenção) | Sucesso rotineiro; ruído permanente |
| **Sheet / drawer** | Subtarefa focal que preserva relação com a tela anterior | Empilhar sheet sobre sheet |
| **Dialog / alert** | Decisão que justifica interromper, confirmação destrutiva | "Salvo com sucesso" — isso é snackbar |
| **Push** | Informação útil quando o app está fechado | Reengajamento sem valor para quem recebe |

Erro que exige ação nunca é toast: some sozinho e leva a informação junto.

## Bibliotecas com MCP

Quando a tarefa se beneficiar de bibliotecas prontas de componentes ou motion, esta skill pode consultar ou configurar MCPs como `Magic UI MCP` e `React Bits MCP`, desde que:

- o projeto seja compativel com a stack exigida
- a integracao nao conflite com o design system existente
- o componente seja adaptado ao contexto visual real do app

Se o projeto ja tiver componentes, branding ou linguagem visual estabelecidos, o MCP serve como referencia ou acelerador, nunca como desculpa para destoar do produto.

## Derivar a Paleta — Não Copiar a Padrão

O azul `#3b82f6` do bloco abaixo é **placeholder**, não default. Paleta herdada sem decisão é a marca registrada de interface genérica — junto com Inter e `border-radius: 8px`. A paleta se deriva da âncora estética, nesta ordem:

1. **Uma cor de marca** (hue primário). Vem do produto, do setor ou da âncora — não do framework. Se o produto já tem marca, ela manda.
2. **Escolher o esquema** a partir do hue primário:

| Esquema | Como | Serve para | Cuidado |
| --- | --- | --- | --- |
| **Monocromático** | um hue, variando luminosidade e saturação | produto operacional, dashboard, ferramenta — cor fica livre para significar estado | precisa de tipografia e espaçamento fortes, senão fica sem hierarquia |
| **Análogo** (hues vizinhos, ±30°) | primário + 1-2 vizinhos | interface calma, wellness, conteúdo, marca coesa | contraste baixo entre os hues — a separação tem que vir de luminosidade |
| **Complementar** (oposto, ~180°) | primário + oposto **só como acento** | destacar CTA e alertas contra a base | nunca em texto sobre fundo do hue oposto (vibração ótica); nunca em áreas grandes lado a lado |
| **Tríade** (3 hues a ~120°) | um domina, dois em papel de apoio | marca expressiva, produto lúdico, ilustração | dividir 60/30/10 — três cores em proporção igual não tem foco |

3. **Gerar a escala em OKLCH, não em HSL.** Em HSL, mesma `lightness` em hues diferentes produz cores com brilho percebido diferente — é por isso que amarelo `hsl(50 90% 50%)` parece muito mais claro que azul `hsl(240 90% 50%)`, e a escala fica inconsistente. OKLCH é perceptualmente uniforme: fixar `L` entrega contraste equivalente entre hues. Em CSS moderno: `oklch(0.65 0.15 250)`.
4. **Separar cor de marca de cor semântica.** `success`/`warning`/`error`/`info` são canais de significado. Se o primário da marca for vermelho, o `error` precisa de outro sinal (ícone, peso, posição) — senão erro e marca se confundem.
5. **Validar contraste antes de fechar** — a paleta bonita que reprova em 4.5:1 vai ser remendada depois com cinza aleatório. Rodar `scripts/check-contrast.mjs`; regras em `skills/22-accessibility-specialist/SKILL.md`.

**Regra dos 60/30/10** — 60% neutro dominante (fundo/superfície), 30% secundário (blocos, bordas, estados), 10% acento (CTA, foco, destaque). Acento em mais de ~10% da tela deixa de ser acento.

**Sinais de paleta genérica:** azul-500 do Tailwind sem justificativa; gradiente roxo→rosa como "identidade"; cor de marca aplicada em toda superfície em vez de reservada ao acento; `success` verde / `error` vermelho como única distinção (falha para daltonismo — ver skill 22).

**RGB é o único modelo relevante aqui.** CMYK só entra se o entregável for impresso (material de marca, embalagem) — nesse caso, cor de tela e cor impressa divergem e a marca precisa dos dois valores especificados.

### Três Camadas de Token — Nunca Pular Direto para o Componente

Cor (e, por extensão, espaçamento e raio) se organiza em três camadas. Pular a camada semântica e ir direto de primitivo para componente é o que torna dark mode, rebranding e diferença de plataforma um refactor em vez de uma troca de valor:

```
Primitivo   → blue-600, gray-100, space-4, radius-md
Semântico   → color-surface, color-text, color-border, color-primary,
              color-success, color-warning, color-danger, color-info, color-focus
Componente  → button-primary-bg, input-border-focus, card-surface
```

- **Primitivo** é a paleta crua — não carrega significado, só valor
- **Semântico** é onde a decisão de produto mora: `color-danger` aponta pra um primitivo hoje, pode apontar pra outro amanhã (dark mode, tema, rebranding) sem tocar em nenhum componente
- **Componente** consome só o semântico, nunca o primitivo direto — `button-primary-bg: var(--color-primary)`, não `button-primary-bg: #3b82f6`

Produto que estiliza direto em cima de `blue-600` em 40 arquivos não sobrevive a um rebranding sem busca-e-substituição arriscada. Produto em cima de `color-primary` troca uma linha.

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
      // CHOOSE ONE that fits the aesthetic anchor — see "Direção Estética" section.
      // NEVER default to Inter/Roboto/Arial without justification.
      // Examples by anchor: minimal → Helvetica/Söhne; editorial → Fraunces + Inter Tight;
      // retro-futuristic → Eurostile/Orbitron; refined → Didot/Bodoni + Söhne.
      // Pair a distinctive display font with a refined, legible body font.
      sans: "/* SET PER PROJECT — display + body pairing */",
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
- Altura de tela cheia: `dvh`, nunca `vh` puro (`vh` corta conteúdo atrás da barra do browser)
- Elementos na borda: `viewport-fit=cover` + `env(safe-area-inset-*)` (notch e barra de gestos)

Estas regras orientam a **decisão de design**. A execução — auditar layout já implementado, achar a causa raiz de "não pega 100%", converter grid/modal/formulário para mobile — pertence à skill 56 (`skills/56-responsive-conversion/SKILL.md`), que tem o catálogo de bugs com fix por caso.

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

## Comportamento dos Estados Interativos

Listar os estados não basta — cada um tem comportamento e propósito próprios. Especificar todos antes do handoff, porque o que fica indefinido o Frontend inventa.

| Estado | Comportamento | Regra |
| --- | --- | --- |
| **Default** | Legível como clicável sem depender de hover — cor, sombra, borda ou sublinhado | Se só o cursor revela que é clicável, o mobile perde a affordance |
| **Hover** | Mudança sutil de cor ou elevação | **Só desktop.** Nunca colocar informação exclusiva em hover (tooltip crítico não existe em touch) |
| **Focus** | Anel de foco visível, contraste ≥ 3:1 contra o fundo adjacente | Usar `:focus-visible` (teclado sim, clique de mouse não). `outline: none` sem substituto quebra navegação por teclado |
| **Active** | Feedback imediato do toque — leve escurecimento ou `scale(0.96)` | Precisa aparecer em até 100ms, senão a ação parece ignorada |
| **Disabled** | Contraste reduzido e cursor bloqueado | **Sempre dizer por quê** (tooltip ou texto ao lado). Alternativa melhor: manter habilitado e responder com erro específico no clique |
| **Loading** | Substituir o rótulo por indicador, mantendo a largura do botão | Precisa desabilitar o clique — senão o usuário envia duas vezes. Largura fixa evita o layout pular |
| **Error** | Mensagem específica + ícone, preservando o que foi digitado | Nunca só cor; nunca limpar o formulário |

Sobre `disabled` em botão de submit: desabilitar até o formulário estar válido esconde do usuário *o que* falta. Manter habilitado e, no clique, focar o primeiro campo inválido com a mensagem costuma converter mais — a exceção é ação destrutiva ou cobrança, onde bloquear é mais seguro.

## Orçamento de Design para Performance

Decisão visual tem custo de carregamento, e o custo é decidido aqui — não no Frontend. Antes de fechar a direção, verificar o impacto nas Core Web Vitals (a skill 14 é dona das métricas e da medição; esta skill é dona das escolhas que as afetam):

- **LCP** — a maior imagem ou bloco de texto acima da dobra é o gargalo. Hero em vídeo, imagem não comprimida ou fonte que bloqueia render empurram o LCP para além dos 2,5s
- **CLS** — todo elemento que carrega depois precisa de espaço reservado (`aspect-ratio` em imagem, altura fixa em banner/anúncio). Skeleton com dimensão diferente do conteúdo final é causa de layout shift, não a cura
- **Fontes** — cada peso/família extra é um arquivo. Duas famílias com 2-3 pesos é o teto saudável; usar `font-display: swap` e pré-carregar só a fonte da dobra

Estas escolhas cabem no handoff junto com os tokens, não como otimização posterior.

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

## Estado Vazio — Tela Sem Dado É Tela, Não Ausência de Tela

Empty state é onde o produto perde o usuário em silêncio: ele chegou, não entendeu se está quebrado ou se é assim mesmo, e saiu. **Todo empty state precisa de: o que aconteceu + o que fazer agora (ação clicável).** Sem a ação, é tela morta.

Os tipos não se resolvem com a mesma mensagem:

| Tipo | Situação | O que a tela deve fazer | Erro comum |
| --- | --- | --- | --- |
| **Primeiro uso** (zero data) | conta nova, ainda não existe nada | explicar o valor + CTA para criar o primeiro item — é o melhor momento de onboarding do produto | tratar como erro ("Nada encontrado") e desperdiçar a única tela que ensina |
| **Busca sem resultado** | filtro/termo não casou | mostrar o termo buscado, oferecer limpar filtro e sugerir alternativa | "0 resultados" seco, deixando o usuário sem saber se o filtro ou o dado é o problema |
| **Limpo por conclusão** | inbox zerada, fila vazia, tudo concluído | reconhecer como sucesso — o tom aqui é positivo, não neutro | usar a mesma tela de "não há nada", transformando conquista em vazio |
| **Erro / falha de carga** | request falhou | dizer que falhou e oferecer **tentar de novo**; nunca fingir lista vazia | mascarar erro como vazio (`.catch(() => [])`) — ver `agents/silent-failure-hunter.md` |
| **Sem permissão** | existe dado, o usuário não pode ver | explicar a restrição e como pedir acesso | mostrar vazio genérico, sugerindo que o dado não existe |
| **404 / rota inexistente** | destino não existe | rota de volta para um lugar útil (home, busca), preservando a navegação | beco sem saída sem link |

Regras: distinguir **vazio** de **erro** de **carregando** — os três são estados diferentes e nunca compartilham a mesma tela. Um destaque só (Von Restorff): o CTA. Ilustração é opcional e serve ao tom da marca; ela **não substitui** a ação — empty state bonito sem CTA continua sendo tela morta.

## Leis Cognitivas — Justificar a Estrutura, Não o Gosto

Nielsen (abaixo) audita a interface pronta. Estas leis decidem a estrutura **antes** de desenhar — e dão vocabulário para defender a decisão em review sem apelar a "achei mais bonito".

| Lei / viés | O que diz | Decisão que ela força |
| --- | --- | --- |
| **Hick-Hyman** | tempo de decisão cresce com o número e a complexidade das opções | menu com 12 itens de peso igual → agrupar, priorizar ou revelar progressivamente. Onboarding não pede 3 decisões na mesma tela |
| **Fitts** | tempo para atingir um alvo depende do tamanho dele e da distância | alvo primário grande e perto do polegar (ver skill 57); ação destrutiva **longe** da confirmação. Botão de 44px não é só acessibilidade, é velocidade |
| **Miller / carga cognitiva** | memória de trabalho é curta e frágil | quebrar sequências longas em grupos (telefone, cartão, código); formulário longo em passos com progresso visível |
| **Jakob** | o usuário passa a maior parte do tempo em *outros* produtos | padrão consagrado (carrinho no topo à direita, logo volta pra home) só se quebra com ganho comprovado. Inovar na navegação cobra caro |
| **Gestalt: proximidade** | o que está perto é lido como do mesmo grupo | espaçamento é hierarquia. Label colada no campo errado é bug de layout, não de estética |
| **Gestalt: similaridade** | o que se parece é lido como mesma função | dois botões com o mesmo visual precisam ter o mesmo peso de ação. Link que parece botão gera clique errado |
| **Gestalt: fechamento/continuidade** | a mente completa formas e segue linhas | card cortado na borda da viewport sinaliza "tem mais, role" — é affordance de carrossel, não defeito |
| **Von Restorff (isolamento)** | o item que destoa é o lembrado | **um** destaque por tela. Três CTAs em cores diferentes = nenhum destaque |
| **Estética-usabilidade** | interface percebida como bonita é percebida como mais fácil | polimento visual não é opcional — mas também mascara problema real de usabilidade em teste. Nunca substitui teste com usuário (skill 51) |
| **Tesler (complexidade irredutível)** | toda operação tem complexidade que não some, só muda de lugar | "simplificar" escondendo campo obrigatório empurra o trabalho pro usuário depois. Decidir conscientemente quem absorve: sistema ou pessoa |
| **Efeito do gradiente de meta** | motivação cresce perto do fim | mostrar progresso e começar o checklist com um item já concluído aumenta conclusão (aplicação em onboarding: skill 57) |
| **Ancoragem** | a primeira informação vista enviesa o julgamento seguinte | ordem dos planos de preço não é neutra; primeiro número visto vira régua |
| **Modelo mental** | o usuário chega com ideia pronta de como aquilo funciona | nomear função pelo que o usuário chama, não pelo nome interno da entidade no banco |
| **Feedforward** | o usuário quer saber o que vai acontecer **antes** de agir | rótulo diz o resultado ("Excluir 3 arquivos"), não o mecanismo ("Confirmar"). Complementa feedback, não substitui |
| **Adaptação sensorial** | estímulo repetido deixa de ser percebido | badge de notificação sempre aceso, banner permanente e toast a cada ação viram invisíveis — e junto com eles o alerta que importava |
| **Fadiga de decisão** | decisões seguidas degradam a qualidade da escolha | fluxo longo precisa de default sensato, não de mais uma pergunta. Todo campo opcional exibido é uma decisão cobrada |
| **Ilusão de trabalho** | processo visivelmente "trabalhando" é percebido como mais valioso | vale para busca/análise real (mostrar as etapas). Delay artificial em operação instantânea é manipulação — não fazer |
| **Divulgação progressiva** | complexidade não desaparece, mas pode ser adiada até que o usuário sinalize intenção | mostrar só o essencial na primeira tela; opção avançada, campo condicional e configuração rara ficam atrás de um "mostrar mais" explícito — nunca escondidos sem pista de que existem |

Não aplicar as 18 em toda tela. Elas entram quando a decisão está em disputa: quantas opções mostrar, onde por o botão, o que destacar, o que agrupar.

### Dark Patterns — Onde a Manipulação Vira Categoria, Não Exceção

A linha de "Ilusão de trabalho" acima cita manipulação como exceção pontual. Dark pattern é o nome para quando isso vira **prática deliberada de UI/copy para extrair uma ação que o usuário não teria tomado com informação completa**. Reconhecer os seis padrões mais comuns evita reintroduzi-los sem perceber que têm nome:

| Padrão | Como aparece | Por que não fazer |
| --- | --- | --- |
| **Urgência falsa** | contagem regressiva ou "oferta expira" sem prazo real por trás | some no reload ou reaparece idêntico amanhã — usuário percebe e a marca perde credibilidade acumulada, não só a conversão daquele clique |
| **Escassez fabricada** | "só 3 restantes" sem estoque real checável | mentira verificável é o pior tipo — uma busca ou uma segunda visita expõe |
| **Custo escondido** | preço final maior que o anunciado, revelado só no checkout | abandono de carrinho no último passo é caro; a informação tinha que estar na página de preço (skill 61) |
| **Pré-seleção enganosa** | opt-in de cobrança/newsletter marcado por padrão, opt-out difícil de achar | dado pessoal e cobrança recorrente exigem ação explícita do usuário, não omissão dele |
| **Dificuldade artificial de cancelar** | assinar é 1 clique, cancelar exige ligação/chat/formulário | fricção assimétrica entre entrar e sair é o antipadrão mais citado em regulação de assinatura |
| **Confirm-shaming** | botão de recusa com texto que constrange ("Não, prefiro pagar mais") | pressão emocional no texto do próprio controle, não no argumento de venda |

Diferença de escopo com a skill 13: lá a regra é "urgência real, nunca fabricada" aplicada à copy de venda. Aqui a lista cobre o padrão de **interface e fluxo**, não só o texto — pré-seleção e dificuldade de cancelar são decisão de componente e de arquitetura de tela, não de palavra.

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

Nielsen audita a **interação com a interface pronta**. Não cobre se o problema certo foi resolvido, se a arquitetura de informação faz sentido, ou se alguém testou com usuário real — isso é o checklist abaixo.

## Checklist de Fechamento — Além da Interação

Gate mais amplo que Nielsen, para as pontas que ele não cobre: estratégia, estrutura e validação. Rodar antes de considerar a interface pronta para handoff, não durante o desenho.

**Estratégia** — o público e o problema estão definidos (não "quem vai gostar", e sim "quem tem a dor")? Existe uma tarefa principal por tela, não uma lista de possibilidades? Há métrica de sucesso declarada, não só "parece melhor"?

**Estrutura** — a arquitetura de informação foi decidida antes do wireframe, não descoberta desenhando? Os fluxos cobrem erro e caminho alternativo, não só o feliz? Nenhuma página de conversão está órfã de link de entrada (ver "Plano de links internos" na skill 61)?

**Validação** — alguém testou com usuário representativo, ou só com quem já sabia onde clicar (skill 51)? A hipótese da próxima iteração está escrita, ou a interface "está pronta" sem plano do que medir depois de publicada?

Estratégia e estrutura sem checklist formal são o motivo mais comum de retrabalho tarde — a interface fica visualmente correta e resolve o problema errado.

## Quando precisar de imagem (hero, ilustração, mascote, background)

Não gere prompt direto pra FAL/DALL-E. **Despache a skill 17 (`image-generator`)** com contexto visual coletado nesta etapa:

```
Contexto: hero image pra landing de [produto]
Paleta: [primary], [secondary], [contrast]
Mood: minimalist / playful / corporate / etc
Composição esperada: [centro/lateral/full-bleed]
Referências (se houver): paths de assets existentes no projeto
```

Skill 17 aplica a regra default (grok-imagine pra t2i, gemini-25-flash pra edit) — você só precisa passar contexto, ela escolhe model + executa.

## Verificacao — a ancora foi mesmo aplicada?

Declarar a ancora nao garante que ela chegou no codigo. Dois checkers transformam as regras desta skill em verificacao:

```bash
node scripts/check-design-generic.mjs <path>   # indigo default, system-ui, gradiente AI, preto puro
node scripts/check-contrast.mjs <path>         # ratio WCAG calculado, nos DOIS temas
```

Ambos falham com exit 1 quando encontram problema (`--warn` so reporta, `--json` para consumo programatico). O hook `design-anchor-guard` roda o primeiro conjunto de regras no momento da escrita e **bloqueia** arquivo visual com sinal de default estatistico.

Se o checker acusa indigo, a ancora nao foi aplicada — foi declarada e esquecida.

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
9. Comportamento dos 7 estados interativos por componente clicável — não só a lista de nomes
10. Orçamento de performance: qual é o elemento de LCP da tela, o que reserva espaço para não gerar CLS, e quantos pesos de fonte a direção exige
11. Paleta com o esquema declarado (mono/análogo/complementar/tríade), o hue de origem e a proporção 60/30/10 — não só a lista de hex
12. Empty state especificado por tipo para toda tela que lista dados (primeiro uso, busca sem resultado, erro, sem permissão) — cada um com seu CTA

## Handoff para Backend

Comunicar:
1. Dados necessários por tela (quais campos, formatos)
2. Paginação: tipo (offset vs cursor), itens por página
3. Filtros e ordenação que a UI precisa
4. Estados de loading e como o skeleton se comporta
5. Feedback visual que depende de resposta da API (sucesso, erro)

## Código Limpo

Codigo deve priorizar clareza. Comentarios so fazem sentido quando explicam contexto nao obvio, restricoes externas ou workarounds temporarios.

## Fontes

- Aesthetic anchors pattern adapted from [anthropics/skills/frontend-design](https://github.com/anthropics/skills/tree/main/skills/frontend-design) (custom license, see source).
- Intensity dials (DESIGN_VARIANCE, VISUAL_DENSITY, MOTION_INTENSITY) e em-dash ban inspirados em [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill).
- Anti-padroes de "AI purple gradient"/layout centralizado genérico reforçados por [usehallmark.com](https://www.usehallmark.com/).
- Leis cognitivas, esquemas de cor e taxonomia de empty state consolidados a partir do blog da [Blush](https://blush.design/blog) (design psychology, color theory, empty states) — curados aqui para decisão de interface digital; recomendações de ilustração do material original, que são CTA do produto deles, ficaram de fora.
- Estrutura de "Anti-padrões por indústria/vertical" (paleta banida + tipografia a evitar + anti-padrão específico por vertical) inspirado em [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), que mapeia 161 combinações estilo→cor→tipografia→anti-padrão por indústria; aqui curado para as 6 verticais mais comuns neste kit, não um port literal.
- Três camadas de token, wireframe lo-fi/hi-fi como estágios distintos, divulgação progressiva nomeada, dark patterns como categoria e o checklist de fechamento (estratégia/estrutura/validação) vieram de um estudo do usuário sobre a biblioteca Design Basics da [Figma](https://www.figma.com/resource-library/) — medido por grep contra o kit antes de aplicar; só entrou o que era gap real, não redundante com Nielsen ou com o que a skill já cobria.
- Modo dual auditoria/implementação, fluxo de 9 passos, classificação de achado (norma/evidência/heurística/preferência), priorização por severidade×alcance×frequência×confiança e definição de pronto vieram de um protocolo de auditoria/implementação UI/UX fornecido pelo usuário — extraídos para `references/audit-framework.md` após medir que 6 das 8 peças não existiam em nenhuma skill do kit, e as outras 2 estavam fragmentadas sem ponto de consolidação (`skills/11-reviewer` tinha só 1 eixo de severidade; `skills/22-accessibility-specialist` tinha impacto×esforço, não os 4 eixos do protocolo).

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
