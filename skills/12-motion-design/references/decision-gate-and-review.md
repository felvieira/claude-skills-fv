# Gate de Decisao, Vocabulario e Review de Motion

Referencia de apoio a esta skill (12) para 3 momentos distintos do ciclo de vida de uma animacao: decidir SE algo deveria animar, nomear o efeito com o termo tecnico certo, e revisar codigo de motion ja escrito contra um bar de qualidade explicito. Adaptado (nao copiado) de 3 skills do repo publico [emilkowalski/skills](https://github.com/emilkowalski/skills) (MIT) — ver `## Fontes Externas` do SKILL.md principal para a correspondencia exata.

## Parte 1 — O Gate de 4 Perguntas (decidir SE anima)

Antes de propor qualquer animacao nova, cada candidato precisa sobreviver as 4 perguntas abaixo, em ordem. Se falhar em qualquer uma, a resposta e nao animar — e essa e a resposta correta na maioria dos casos, nao uma derrota.

### 1. Frequencia — com que frequencia o usuario ve isso?

| Frequencia | Veredito |
| --- | --- |
| 100+ vezes/dia (atalho de teclado, command palette, navegacao core) | **Rejeitar. Nunca animar.** |
| Dezenas de vezes/dia (hover, navegacao de lista, toggle frequente) | Rejeitar, ou so movimento quase imperceptivel (rapido, sutil) |
| Ocasional (modal, drawer, toast, configuracao) | Elegivel — animacao padrao |
| Raro / primeira vez (onboarding, empty state, sucesso, celebracao) | Elegivel — aqui mora o orcamento de "encantamento" |

Acao disparada por teclado (atalho, command palette, salto de foco) e desqualificador automatico, nao julgamento de caso — repetida centenas de vezes ao dia, animacao deixa a acao com sensacao de lenta e desconectada. O Raycast nao tem animacao de abrir/fechar; essa e a experiencia correta.

### 2. Proposito — por que isso anima?

A resposta precisa ser uma destas, nomeada explicitamente:

- **Feedback** — confirmar que a interface percebeu o usuario (scale de press, preenchimento de hold-to-confirm)
- **Consistencia espacial** — mostrar de onde algo veio ou para onde foi (toast entra e sai pela mesma borda; painel cresce a partir do gatilho)
- **Indicacao de estado** — tornar uma mudanca de estado legivel (botao que muda de forma, accordion que expande)
- **Prevenir mudanca abrupta** — conteudo que teleporta, aparece ou some sem transicao
- **Explicacao** — movimento que demonstra como um recurso funciona (so em marketing/onboarding)
- **Encantamento** — permitido *apenas* no nivel Raro/primeira-vez

"Fica bonito" nao esta nessa lista. Se o proposito nao cabe em uma dessas palavras, rejeitar.

### 3. Velocidade — cabe no orcamento?

A sugestao precisa caber nos orcamentos padrao (UI abaixo de 300ms):

| Elemento | Duracao |
| --- | --- |
| Feedback de press | 100-160ms |
| Tooltip, popover pequeno | 125-200ms |
| Dropdown, select | 150-250ms |
| Modal, drawer | 200-500ms |
| Marketing/explicativo | Pode ser mais longo |

Se o momento so "funciona" como animacao lenta e chamativa, falha o gate.

### 4. Funcao — o movimento ajuda ou atrapalha aqui?

Decoracao em UI funcional e densa em informacao atrapalha. Um efeito decorativo de mouse-tracking cabe numa landing page; num grafico funcional de app bancario, nao animar e melhor. Dado que o usuario esta tentando *ler* ou *agir sobre* nao deveria se mover por estilo.

## Parte 2 — Varredura por Categoria de Seam (onde procurar)

Varrer a interface por estas categorias — cada uma e uma classe conhecida de oportunidade genuina:

**Gaps de feedback**
- Elemento clicavel sem estado `:active` → `transform: scale(0.97)` com `transition: transform 160ms ease-out` (sutil: 0.95-0.98)
- Acao destrutiva confirmada com clique simples onde hold-to-confirm evitaria erro → overlay `clip-path: inset(0 100% 0 0)`, 2s linear no press, 200ms ease-out de volta no release

**Teleporte de estado**
- Conteudo que troca, aparece ou some instantaneamente (render condicional, conteudo de rota, secao que expande) → entrada fade/scale a partir de `scale(0.95-0.97)` + `opacity: 0`, `ease-out`, nunca `scale(0)`; `@starting-style` para entrada sem JS
- Accordion/collapse que abre seco → transicao de height + opacity
- Item de lista adicionado/removido sem ponte (e a lista nao e de alta frequencia) → transicao de entrada/saida; CSS transitions, nao keyframes, para disparo rapido retargetar suavemente

**Historia espacial ausente**
- Painel, popover, menu que aparece sem conexao com o gatilho → scale-in com `transform-origin` no gatilho; modal e excecao — fica centrado
- Superficie dispensavel (toast, sheet) que sai por caminho diferente de como entrou → trajetoria simetrica; `translateY(100%)` em porcentagem, nunca pixel fixo

**Entradas em grupo**
- Grid ou lista que aparece tudo de uma vez numa tela vista ocasionalmente → stagger de 30-80ms; decorativo, nunca pode bloquear interacao

**Gaps de gesto**
- Elemento arrastavel/deslizavel que trava sem fisica → spring (`{ type: "spring", duration: 0.5, bounce: 0.2 }`, bounce 0.1-0.3), dispensa por velocidade (`Math.abs(distance)/elapsedMs > ~0.11`), rubber-banding nos limites em vez de parada seca

**Orcamento de encantamento**
- Momento raro e de alta emocao renderizado sem vida — primeiro uso, empty state, sucesso/conclusao, celebracao. Sao os unicos lugares onde bounce, stagger generoso ou um beat mais longo sao bem-vindos.

## Parte 3 — Formato de Saida ao Propor Oportunidades

Ao levantar candidatos para uma tela ou app inteiro: no maximo 5-7 sugestoes, ordenadas por alavancagem (nao por quao divertidas sao de construir). Uma tabela `# | Local | Hoje | Proposito | Frequencia | Movimento sugerido` para os que sobrevivem ao gate, seguida de uma lista de 2-5 candidatos rejeitados citando qual pergunta do gate matou cada um. Essa segunda lista e o que separa uma varredura seria de uma wishlist de animacao.

## Parte 4 — Vocabulario de Motion (nomear o efeito certo)

Glossario reverso: usar para traduzir descricao vaga ("aquele bounce quando abre", "o scroll que resiste e volta") no termo tecnico correto — de implementacao ou de prompt para outro agente.

| Termo | Definicao | Quando usar |
| --- | --- | --- |
| Fade in / Fade out | Elemento aparece ou some mudando opacidade | Entrada/saida neutra, sem direcao |
| Slide in | Elemento entra deslizando de fora da tela | Quando a origem espacial importa |
| Scale in | Elemento cresce do menor ao tamanho final, geralmente com fade | Popover, card, modal |
| Pop in | Elemento aparece com leve overshoot, como se saltasse no lugar | Momento de encantamento, nunca em alta frequencia |
| Reveal | Conteudo e descoberto gradualmente via clip-path ou mask | Scroll reveal, wipe entre imagens |
| Origin-aware animation | Elemento anima a partir do seu gatilho, nao do proprio centro | Popover/dropdown/tooltip (nunca modal) |
| Stagger | Varios itens animam em sequencia com pequeno delay entre eles | Grupo de entrada ocasional |
| Orchestration | Multiplas animacoes cronometradas para parecer um unico movimento coordenado | Hierarquia de entrada pagina→secao→componente |
| Spring | Movimento guiado por fisica (tensao, massa, damping), sem duracao fixa | Drag, elemento "vivo", gesto interrompivel |
| Bounce | Spring que ultrapassa o alvo e assenta, adicionando leveza | So em momento de encantamento ou drag-to-dismiss |
| Rubber-banding | Resistencia e retorno ao arrastar alem do limite (overscroll do iOS) | Fronteira de scroll ou drag |
| Momentum / Velocity | Movimento que carrega velocidade apos um drag ou interrupcao | Dismissal por flick, sem exigir distancia minima |
| Interruptible animation | Animacao que pode ser redirecionada em pleno voo sem reiniciar | Toast, toggle, qualquer coisa disparada rapido |
| Crossfade | Um elemento esmaece enquanto outro aparece, no mesmo lugar | Troca de conteudo sem objeto compartilhado |
| Morph | Uma forma se transforma suavemente em outra | Dynamic Island, icone que muda de estado |
| Shared element transition | Elemento viaja e se transforma de uma posicao para outra | Thumbnail → tela cheia; card → detalhe |
| Layout animation (FLIP) | Elemento anima ate a nova posicao/tamanho em vez de saltar | Reorder de lista, filtro, drag-to-reorder |
| Direction-aware transition | Conteudo desliza numa direcao ao avancar e na oposta ao voltar | Navegacao com sentido de profundidade |
| Parallax | Fundo e primeiro plano se movem em velocidades diferentes no scroll | Landing page, storytelling — nunca em UI funcional |
| View transition | O browser faz morph nativo entre duas paginas/estados | Troca de rota com elemento compartilhado |
| Hold to confirm | Efeito de progresso que preenche enquanto o usuario segura o botao | Acao destrutiva, para evitar toque acidental |
| Shake / Wiggle | Jitter rapido lateral sinalizando erro ou input rejeitado | Validacao de formulario |
| Ripple | Circulo se expandindo do ponto de toque, confirmando o press | Feedback tatil visual em Material Design |
| Ease-out | Comeca rapido, termina devagar — padrao para UI e qualquer resposta ao usuario | Default de entrada/saida |
| Ease-in | Comeca devagar, termina rapido — evitar em UI, sensacao de lentidao | So quando o elemento esta saindo de cena e o usuario ja nao olha mais |
| Ease-in-out | Devagar, rapido, devagar | Elemento ja em tela se movendo de A para B |
| Asymmetric easing | Curva que acelera e desacelera em ritmos diferentes | Sensacao mais viva que uma curva simetrica |
| Perceptual duration | Ha quanto tempo um spring *parece* terminado, mesmo ainda assentando | Julgar feel de spring, nao so o numero de config |
| Skeleton / Shimmer | Placeholder com brilho em movimento durante carregamento | Loading state |
| Number ticker | Digitos rolando ou contando ate um valor | Contador, metrica, preco |
| Tabular numbers | Digitos de largura fixa para o numero nao "tremer" ao mudar | Obrigatorio em ticker, timer, contador |
| Layout thrashing | Animar `width`/`height`/`top`/`left` forca recalculo de layout todo frame | Anti-padrao — identificar e substituir por `transform` |
| Compositing | GPU move/esmaece o elemento na propria camada sem redo de layout/paint | O que faz `transform`/`opacity` serem baratos |

Quando dois termos competem (Clip-path vs Mask, Pop in vs Bounce, Shared element transition vs Layout animation), a diferenca esta em: Clip-path corta em linha reta, Mask permite borda suave/gradiente; Pop in e a entrada com overshoot, Bounce e a propriedade fisica do spring que causa esse overshoot; Shared element transition move um elemento fisico entre lugares, Layout animation reflui um elemento que ja esta la para a nova posicao/tamanho.

## Parte 5 — Checklist de Review com Hierarquia de Remediacao

Ao revisar codigo de motion ja escrito (nao ao propor um novo), aplicar os 10 padroes abaixo. Default e sinalizar — aprovacao se conquista, nao se presume.

### Os 10 padroes nao-negociaveis

1. **Motivo justificado.** Toda animacao responde "por que isso anima?" — consistencia espacial, indicacao de estado, feedback, explicacao ou prevencao de mudanca abrupta. "Fica bonito" em elemento visto com frequencia bloqueia.
2. **Frequencia apropriada.** Acao 100+/dia ou disparada por teclado: zero animacao. Dezenas/dia: reduzida. Ocasional: padrao. Raro: encantamento permitido.
3. **Easing responsivo.** Entrada/saida usa `ease-out` ou curva custom forte. `ease-in` em UI e bloqueio — atrasa o exato momento que o usuario esta olhando.
4. **Teto de 300ms em UI.** Animacao de UI fica abaixo de 300ms; qualquer coisa mais lenta precisa de justificativa explicita ou e achado de review.
5. **Origem e correcao fisica.** Popover/dropdown/tooltip escala a partir do gatilho (`transform-origin`), nunca do centro. `scale(0)` e anti-padrao — nada no mundo real aparece do nada; comecar de `scale(0.9-0.97)` + opacity. Modal e excecao, fica centrado.
6. **Interrompibilidade.** Motion disparado rapido ou por gesto (toast, toggle, drag) precisa ser interrompivel — CSS transitions ou spring que retarget do estado atual, nunca keyframes que reiniciam do zero.
7. **Propriedades GPU-only.** Animar apenas `transform` e `opacity`. Animar `width`/`height`/`margin`/`padding`/`top`/`left` (ou os atalhos `x`/`y`/`scale` do Framer Motion sob carga, que rodam na main thread) e achado de performance.
8. **Acessibilidade.** `prefers-reduced-motion` respeitado (mais gentil, nao zero — manter opacity/cor, remover deslocamento). Hover gated atras de `@media (hover: hover) and (pointer: fine)`.
9. **Entrada/saida assimetrica.** Acao deliberada (press, hold, confirmacao destrutiva) anima mais devagar; resposta do sistema e seca. Timing simetrico num press-and-release ou hold e achado.
10. **Coesao.** Motion casa com a personalidade do componente e do resto do produto — mais playful pode ter mais bounce, dashboard fica seco e rapido. Quando em duvida se o motion "sente certo", a jogada mais forte costuma ser remover.

### Gatilhos de escalonamento agressivo (sinalizar na hora)

`transition: all` sem escopo; `scale(0)` ou entrada so-fade sem transform inicial; `ease-in` em qualquer interacao de UI; animacao em atalho de teclado/command palette/acao 100+/dia; duracao de UI acima de 300ms sem justificativa; `transform-origin: center` em popover ancorado a gatilho; keyframes em toast/toggle/qualquer coisa disparada rapido; animar propriedade de layout; prop `x`/`y`/`scale` do Framer Motion rodando com a pagina ocupada; CSS variable no pai dirigindo transform do filho (recalc storm); `prefers-reduced-motion` ausente em movimento; `:hover` sem media query de pointer; timing simetrico em press-and-release; entrada tudo-de-uma-vez onde caberia stagger de 30-80ms.

### Hierarquia de remediacao (em cascata — preferir os primeiros)

Ao propor correcao, sempre preferir a opcao mais cedo nesta lista:

1. **Deletar a animacao** — alta frequencia, sem proposito, ou disparada por teclado
2. **Reduzir** — duracao menor, transform menor, menos propriedades animadas
3. **Corrigir o easing** — trocar `ease-in` por `ease-out`/curva custom forte
4. **Corrigir origem/fisicalidade** — `transform-origin` certo; substituir `scale(0)` por `scale(0.95)` + opacity
5. **Tornar interrompivel** — keyframes → transitions, ou spring para motion guiado por gesto
6. **Mover para GPU** — propriedade de layout → `transform`/`opacity`; atalho → string completa de `transform`; WAAPI para motion programatico em CSS
7. **Timing assimetrico** — desacelerar a fase deliberada, manter a resposta seca
8. **Polish** — blur para mascarar crossfade imperfeito, stagger para grupo, `@starting-style` para entrada, spring para elemento "vivo"
9. **Acessibilidade e coesao** — adicionar reduced-motion + gating de hover; ajustar a personalidade

### Formato de saida do review

Tabela unica `Antes | Depois | Por que` — nunca uma lista solta de "Antes:/Depois:". Fechar com veredito agrupado por tier de impacto (regressao que quebra o feel, simplificacao perdida, performance, interrompibilidade/timing, origem/fisicalidade/coesao, acessibilidade) e decisao explicita: **Bloquear** (qualquer regressao de feel, motion em acao de teclado/alta frequencia, `scale(0)`/`ease-in` em UI, ou animacao nao-GPU com correcao facil) ou **Aprovar** (sem regressao de feel, sem motion obviamente removivel, duracao/easing dentro do orcamento, interrompibilidade tratada, reduced-motion respeitado).
