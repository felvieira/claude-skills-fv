---
name: ui-ux-design
description: |
  Skill do Designer UI/UX para definição de interfaces e experiência do usuário. Use quando precisar criar
  wireframes, design system tokens, componentes de UI, fluxos de navegação, acessibilidade, ou qualquer
  decisão de interface. Trigger em: "design", "UI", "UX", "interface", "wireframe", "componente visual",
  "layout", "responsivo", "mobile first", "acessibilidade básica", "design system", "protótipo", "Figma".
---

# UI/UX Designer - Interface e Usabilidade

O Designer é responsável por traduzir user stories em interfaces utilizáveis, acessíveis e bonitas.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md` e `policies/evals.md`.

Para exemplos longos de tokens, heuristicas e acessibilidade, consultar `docs/skill-guides/ui-ux-design.md` apenas quando necessario.

Para uso de MCPs de bibliotecas visuais como referencia ou aceleracao, consultar `docs/skill-guides/ui-component-mcps.md`.

Para checklist de acabamento fino (border radius concentrico, alinhamento optico, sombra vs borda, tabular numbers, hit area minima), ver `skills/52-ui-polish/SKILL.md` — despachar apos Frontend implementar, antes do Reviewer final.

Esta skill decide como a interface **vai** parecer, antes de existir. Para converter interface ja implementada em versao mobile, ou corrigir layout quebrado (componente que nao ocupa 100%, corta na tela, scroll horizontal, modal estourando viewport), ver `skills/56-responsive-conversion/SKILL.md` — inclui tambem os padroes de modal/bottom sheet e de confirmacao de acao destrutiva, que esta skill so cita como heuristica de Nielsen.

Se o produto pode receber outro idioma — mesmo que hoje seja so pt-BR — ver `skills/58-i18n-localization/SKILL.md` antes de fixar largura de botao, alinhamento ou formato de data: texto traduzido cresce ate 30% e RTL inverte o layout inteiro. Preparar depois custa muito mais que projetar assim desde o inicio.

Para as restricoes fisiologicas que os tokens desta skill tem de respeitar — zona do polegar (onde a navegacao pode morar), superficie base do dark mode (`#121212`, nunca preto puro) e contraste minimo verificado nos dois temas — ver `skills/57-mobile-ux-foundations/SKILL.md`. Essa skill tambem cobre percepcao de espera (skeleton vs. spinner por faixa de duracao) e UX de login/onboarding/permissao.

## Quando Usar

- definir interface, fluxo e comportamento responsivo
- transformar spec em estrutura de tela e decisao de usabilidade

## Quando Nao Usar

- para decidir regras de negocio ou contrato de API sozinho
- para substituir implementacao frontend

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

Antes de derivar tokens do zero, decidir se um design system maduro resolve. Adotar um DS existente entrega componentes, tokens, acessibilidade e documentação já resolvidos — inventar do zero só se justifica quando diferenciação visual é o produto.

**A âncora estética e o design system são decisões separadas.** O DS define componentes e estrutura; a âncora define a pele. Carbon com paleta e tipografia próprias continua Carbon na estrutura.

| Design system | Dono | Melhor encaixe | Custo |
| --- | --- | --- | --- |
| **Material 3** | Google | Android nativo, produto consumer, quando dynamic color agrega | Alto no Android (nativo no Compose); na web, avaliar o estado de manutenção da implementação escolhida |
| **Apple HIG** | Apple | iOS/iPadOS/macOS | Baixo se usar componentes nativos — o sistema aplica a linguagem atual sozinho |
| **Fluent 2** | Microsoft | Ferramenta de produtividade, ecossistema Microsoft, densidade média-alta | Médio, biblioteca React ampla |
| **Carbon** | IBM | Enterprise com muita tabela, formulário e dado denso | Médio, forte em padrão de dados |
| **Shadcn/Radix + tokens próprios** | — | Quando a marca precisa mandar, mas acessibilidade de primitiva não pode ser reinventada | Baixo, mas exige construir o sistema visual |

Regra de decisão por tipo de produto:

- **Enterprise / muito dado** → Carbon ou Fluent. Tabela densa é o caso onde card não substitui: comparar registros exige linha e coluna
- **Mobile nativo** → o DS da plataforma (M3 no Android, HIG no iOS). Forçar visual idêntico entre as duas quebra a expectativa adquirida do usuário de cada uma
- **Landing / marca forte** → primitiva acessível + tokens próprios; DS completo engessa sem devolver benefício
- **Dashboard** → Carbon/Fluent para diagnóstico; layout modular em cards para visão executiva

**Compartilhar entre plataformas:** regra de negócio, conteúdo, hierarquia e tokens semânticos. **Não compartilhar:** componente e interação onde a convenção nativa diverge — navegação, seletor de data, ação de linha, sheet.

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
- Estrutura de "Anti-padrões por indústria/vertical" (paleta banida + tipografia a evitar + anti-padrão específico por vertical) inspirado em [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill), que mapeia 161 combinações estilo→cor→tipografia→anti-padrão por indústria; aqui curado para as 6 verticais mais comuns neste kit, não um port literal.

## Integração com Pipeline

- **Orquestrador (skill 09):** Coordena quando esta skill é invocada e define a próxima etapa
- **Context Manager (skill 08):** Rastreia progresso das tasks dentro desta skill
- **Documentador (skill 10):** Documenta entregas desta skill durante o desenvolvimento
