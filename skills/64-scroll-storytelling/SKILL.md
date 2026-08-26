---
name: scroll-storytelling
description: |
  Skill de arquitetura de scrollytelling completo — pagina onde o scroll e a timeline narrativa, nao so
  uma lista de secoes que aparecem com fade. Use quando o pedido for uma landing page estilo Apple, um
  scroll experience, um site que "parece um template" e precisa ser diferente, video que roda conforme
  rola a pagina, ou qualquer pedido de scrollytelling/scroll-driven storytelling completo (jornada,
  estrutura de pagina, variedade de efeito por secao — nao so a mecanica solta de uma transicao).
  Cobre protocolo de entrevista antes de gerar qualquer coisa, 4 regras centrais de variedade e mundo
  visual, 8 gramaticas de pagina mutuamente exclusivas, kit de 10 devices de scroll, engine vanilla
  JS/CSS zero-dependencia incluso, e verificacao por screenshot em multiplas posicoes de scroll.
  Trigger em: "scrollytelling", "scroll storytelling", "scroll animation site", "site que anima com o
  scroll", "scroll-driven", "Apple-style landing page", "scroll experience", "rola como um filme",
  "video que roda com o scroll", "roda conforme rola a pagina", "parece um template",
  "quero um site diferente de todo mundo", "3D scroll world", "interactive landing page",
  "landing page cinematografica".
---

# Scroll Storytelling — Arquitetura de Scrollytelling

Scroll e o unico input que todo visitante ja sabe usar. Esta skill trata scroll como timeline: a roda do
mouse e um scrubber, a pagina e um filme com texto real por cima, e cada secao se comporta diferente o
suficiente pra o visitante continuar rolando pra descobrir o que a proxima faz.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`,
`policies/stack-flexibility.md` e `policies/evals.md`.

Conteudo denso (kit de devices, gramaticas de pagina, taste floor, verificacao) vive em `references/` —
carregar sob demanda, nao de cara. O motor (`engine/scrollcraft.js` + `engine/scrollcraft.css`) e vanilla
JS/CSS zero-dependencia, pronto pra copiar pro projeto do cliente.

Esta skill decide a **arquitetura completa** de uma pagina scrollytelling: estrutura, jornada narrativa,
variedade de efeito por secao, gramatica de pagina. Nao e sobre mecanica de easing ou spring solta — para
isso, ver `skills/12-motion-design/SKILL.md` (dono do sistema de motion tokens, Framer Motion, GSAP
ScrollTrigger genericos). Nao e sobre decidir paleta, tipografia ou direcao estetica do zero — para isso,
ver `skills/02-ui-ux-design/SKILL.md` (aesthetic anchor, paleta, leis cognitivas de layout). Esta skill
consome as duas: usa motion tokens da 12 pra timing generico do CSS de UI e usa decisao estetica da 02
como insumo pra escolher o "world" (ver references/worlds.md) e a familia estetica.

## Quando Usar

- pedido de landing page ou site inteiro estruturado como jornada de scroll (nao so uma secao com fade-in)
- "quero um site que pareça uma experiencia, nao um documento"
- video ou sequencia de imagem que precisa scrubar (avancar frame a frame) conforme o usuario rola
- pagina que precisa pinning de secao, pan horizontal, ou um "mundo" continuo que a rolagem atravessa
- cliente pede algo no estilo Apple product page, ou cita um site de referencia desse tipo

## Quando Nao Usar

- micro-interacao isolada (hover, click, spring de botao, transicao de rota) — isso e `skills/12-motion-design/SKILL.md`
- fade-in simples de secao ao entrar no viewport sem jornada nem variedade de efeito — `whileInView` do
  Framer Motion (ja documentado na skill 12) resolve sozinho, sem precisar desta skill
- decisao de paleta, tipografia ou wireframe do zero, sem o componente de scroll — `skills/02-ui-ux-design/SKILL.md`
- gerar apenas os assets visuais (imagem/video) sem construir a pagina — usar direto
  `skills/17-image-generator/SKILL.md` ou o pipeline canonico de geracao de imagem/video do ambiente

## Entradas Esperadas

- objetivo de negocio da pagina e publico (normalmente vindo do PO, skill 01)
- direcao estetica ja decidida ou a decidir em conjunto com skill 02 (paleta, tipografia)
- assets que o cliente ja possui (fotos, video, brand kit) — perguntar antes de gerar nada
- acesso a pipeline de geracao de imagem/video do ambiente quando for preciso gerar asset novo

## Saidas Esperadas

- `BRIEF.md` da entrevista (jornada, curva de emocao, pico, gramatica escolhida)
- pagina HTML real (semantica, nao gerada por config) usando o motor `engine/scrollcraft.js`/`.css`
- tabela de score (device por beat da jornada)
- evidencia de verificacao por screenshot em multiplas posicoes de scroll, incluindo mobile e reduced-motion

## O que isto NAO e

Nao e "gerar um flythrough e jogar texto em cima". Essa abordagem produz um device so aplicado na pagina
inteira, e todo site construido assim se reconhece de longe: mesmo diorama de argila, mesmo texto
centralizado, mesmo contador `01/06`, mesmo "scroll to explore" piscando. Cinco secoes que se comportam
identico sao uma secao mostrada cinco vezes.

Quatro regras seguem disso e sao a espinha desta skill:

1. **Variedade e o produto.** A pagina usa pelo menos quatro familias de device (ver references/devices.md)
   e nunca repete o mesmo device duas vezes seguidas.
2. **O mundo visual e fotografico por padrao, salvo a marca ser genuinamente ilustrada.** Diorama de argila
   low-poly fosco e banido como padrao. Ver references/worlds.md.
3. **Sem corrente continua de camera**, a menos que o brief peça literalmente "uma jornada continua". Um
   plano-sequencia continuo e a coisa mais cara e fragil que da pra construir, e existe so pra esconder
   cortes entre cenas. Variar o device resolve o corte de graca, porque o visitante nao esta assistindo um
   filme so.
4. **Um mundo visual diferente nao e uma estrutura de pagina diferente.** O kit de devices varia a
   aparencia. Estrutura e um eixo separado — a gramatica de pagina (ver references/uniqueness.md) — e
   precisa ser decidida deliberadamente, ou todo build herda o mesmo esqueleto.

## Pipeline (5 Passos)

Detalhe completo, com as oito perguntas literais, o metodo de curva de emocao, a tabela de score por beat
e o protocolo de verificacao, em `references/pipeline.md`. Resumo:

1. **Entrevista (Passo 0).** Oito perguntas numa passada — vibe, jornada, curva de energia, curva de
   emocao + pico, signature move seed, range estetico, mundo continuo vs. cenas, assets existentes.
   Escrever tudo em `<build>/BRIEF.md` antes de qualquer geracao. Sem cliente acessivel, escrever sozinho
   e marcar `Self-authored, nao entrevistado`.
2. **Brief e jornada (Passo 1).** So o que a entrevista nao cobriu: o que e / pra quem, o que o visitante
   precisa acreditar, a proxima acao, assets, direcao de arte. Depois a jornada: 4 a 7 beats.
3. **Gramatica, gate, score (Passo 2).** Escolher 1 das 8 gramaticas (tabela abaixo), inventar o signature
   move, rodar o fingerprint gate se houver builds anteriores no mesmo workspace, escrever a curva de
   emocao, so entao montar a tabela de device-por-beat.
4. **Gerar assets (Passo 3).** Usar `skills/17-image-generator/SKILL.md` ou o pipeline canonico de
   imagem/video do ambiente — nao montar chamada ad-hoc. Regras de composicao em references/worlds.md e
   references/assets.md.
5. **Construir e verificar (Passos 4-5).** HTML real com `data-sc-*`, motor de `engine/` copiado sem
   edicao, tokens de tema sobrescritos. Depois verificar rolando: servir via HTTP, screenshot em multiplas
   posicoes (desktop, mobile, reduced-motion), feel check contra o BRIEF.md, nota sobre o que nao foi
   testado em dispositivo real.

### As 8 gramaticas de pagina

Mutuamente exclusivas — cada uma proibe o que as outras exigem. Detalhe (o que permite, proibe, como sao
nav/hero/close) em references/uniqueness.md §2.

| Gramatica | Serve quando |
|---|---|
| Filmic one-shot | Um argumento linear, um arco emocional |
| Chaptered editorial | Substancia longa — metodo, manifesto, historia de fundador |
| Live surface | Software, ferramenta, dashboard — a demo e o argumento |
| Continuous world | Jornada com geografia real — cadeia de suprimento, processo fisico |
| Typographic poster | Marca cujo asset e uma frase — manifesto, agencia |
| Gallery / catalog | Um range — produto com variantes, portfolio, cardapio |
| Split stage | Argumento com dois lados — antes/depois, manual/automatico |
| Rhythmic cutlist | Marca de energia — streetwear, evento, musica |

Recorrer a filmic one-shot de novo exige dizer no relatorio por que as outras sete nao serviram — e a
gramatica-padrao que qualquer build tende a reproduzir sem decidir, entao carrega onus de prova maior.

### Checagem antes de construir

- Bans da gramatica escolhida seguram (references/uniqueness.md).
- 4+ familias distintas de device (references/devices.md), nunca a mesma duas vezes seguidas.
- No maximo dois atos `scrub`.
- Nenhum par de atos adjacentes com a mesma emocao (references/feel.md).
- Um ato e o pico, com o maior espaco por margem visivel.
- Comprimento total da pagina entre 8 e 14 viewport-heights.

## Regras Duras

Bloqueadores de entrega, nao preferencia. Cada uma e algo que faz uma pagina ler como feita por maquina.

| Nunca | Em vez disso |
|---|---|
| Diorama de argila / low-poly / claymation como mundo padrao | Fotografico. Ver references/worlds.md |
| Um cue de "scroll", seta, ou icone de mouse animado | Nada. O visitante ja esta olhando o hero; ele sabe |
| Contador de secao `01 / 06` | Deletar. Sequencia nao e informacao aqui |
| Eyebrow acima de todo titulo de secao | No maximo um a cada tres secoes |
| Em dash visivel em qualquer lugar | Ponto, virgula, dois-pontos, ou parenteses |
| Copy centralizado em todo ato | Variar a ancora: lead, trail, centro, split |
| O mesmo device duas vezes seguidas | Fazer o score da jornada corretamente no Passo 2 |
| Gerar qualquer coisa antes de entrevistar o cliente | Rodar o Passo 0. Escrever `BRIEF.md`, ou marcar como auto-escrito |
| Pagina sem pico projetado, ou com tres picos competindo | Um pico. Ele leva o orcamento de asset, o silencio antes, o maior espaco |
| Final que se dissolve, esmaece, ou vira rodape sem resolver | O close resolve e segura. A ultima sensacao e a que fica |
| Planejar atos antes da curva de emocao existir | Curva primeiro, devices depois |
| Entregar sem um signature move bespoke | Inventar um. Reduzir um spotlight de cor ou reajustar um tilt nao conta |
| Editar o motor pra conseguir um comportamento bespoke | JS bespoke na pagina, dirigido por `--sc-p` e `data-sc-*` proprios |
| Recorrer a filmic one-shot so porque foi o ultimo build | Escolher entre as oito gramaticas e dizer por que as outras sete perderam |
| Overlay escuro full-frame pra corrigir contraste | Um scrim so onde o texto senta |
| Texto embutido numa imagem gerada | Markup real, sempre — selecionavel, traduzivel, nitido |
| Estatistica inventada num contador | So numeros reais. Sem numero real, sem contador |
| `transition: all`, ou animar width/height/top/left | `transform` e `opacity`; `clip-path` pra wipes |
| Gradiente em texto, glow neon, sombra de halo colorido sem offset | Peso e tamanho pra enfase; sombras com offset e blur |
| Audio autoplay, ou qualquer audio num clipe de scrub | Tirar a trilha do encode |
| Entregar sem rodar o Passo 5 | Rodar o Passo 5 |

## Handoff

### Recebe de

- Skill 01 (PO) — objetivo de negocio, publico, o que o visitante precisa fazer ao final
- Skill 02 (UI/UX) — direcao estetica ja decidida (paleta, tipografia), quando existir; senao decide-se em
  conjunto durante o Passo 0/1 desta skill
- Assets do cliente, quando existirem — fotos, video, brand kit

### Entrega para

- Skill 04 (Frontend) — se a pagina scrollytelling precisar virar componente dentro de uma app maior
  (React/Next.js) em vez de ficar standalone, a integracao do HTML/JS do motor no framework e trabalho da
  Frontend
- Skill 12 (Motion Design) — para qualquer micro-interacao adicional fora do escopo de scroll (hover de
  botao, spring de modal) que a pagina resultante venha a precisar depois de pronta
- Skill 22 (Accessibility) — revisao de teclado, `prefers-reduced-motion`, contraste, quando o projeto
  exigir auditoria formal alem da verificacao embutida no Passo 5

## Evidencia de Conclusao

- `BRIEF.md` da entrevista, com curva de emocao e pico nomeados
- gramatica escolhida e justificativa de por que as outras sete nao serviram
- tabela de score (device por beat) respeitando os leans-on/bans da gramatica
- signature move descrito e distinguivel de qualquer parametro do kit
- contact sheet de verificacao (desktop, mobile, reduced-motion) e feel check com diff da curva pretendida vs. sentida
- URL local ou caminho do build entregue

## Fontes Externas

Skill adaptada de [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft) (MIT, copyright
Nate Herk 2026). Curadoria em 2026-08-26. Detalhe completo do que foi copiado, adaptado e deixado de fora
em `references/PROVENANCE.md` — resumo:

- **Copiado quase verbatim**: `engine/scrollcraft.js` e `engine/scrollcraft.css` (codigo generico,
  zero-dependencia, sem acoplamento ao resto do repo original).
- **Traduzido e reestruturado** no esqueleto de secoes do kit: o corpo do `SKILL.md` original e
  `references/devices.md`, `worlds.md`, `uniqueness.md`, `verify.md`, `feel.md`, `taste.md`, `assets.md`.
- **Nao portado**: os scripts operacionais (`doctor.mjs`, `workspace.mjs`, `kie.mjs`, `serve.mjs`,
  `shoot.mjs`, `worldflight-assert.mjs`, `encode.sh` — acoplados ao ambiente/provedor do repo original),
  `references/worldflight.md` e `references/device-diag.html` (nao lidos nesta curadoria por prioridade de
  tempo — se o build precisar da gramatica "continuous world" ou diagnostico mobile profundo, ler o
  original antes de implementar), `templates/FINGERPRINTS.md`, `references/template.html` e `EXAMPLES.md`
  (templates/registro de exemplo especificos do fluxo multi-build do autor original).
