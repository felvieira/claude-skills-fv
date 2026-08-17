---
name: responsive-conversion
description: |
  Skill de conversao de interface web para mobile e correcao de layout quebrado. Use quando componente
  nao ocupa 100% da largura, corta no meio da tela, quebra em telas pequenas, tem scroll horizontal
  indevido, modal estourando viewport, ou quando precisar definir padroes de confirmacao para acoes
  destrutivas (excluir, enviar, cadastrar). Trigger em: "responsivo", "mobile", "nao pega 100%",
  "cortando na tela", "quebrou no celular", "scroll horizontal", "viewport", "safe area", "notch",
  "bottom sheet", "modal no mobile", "confirmacao de exclusao", "modal de confirmar", "undo",
  "grid quebrado", "overflow", "converter para mobile", "adaptar layout".
argument-hint: "[--audit=path] [--scope=page|component|app] [--target=mobile|tablet|all]"
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Responsive Conversion — Web para Mobile e Padroes de Interacao

Converte interface pensada para desktop em interface que funciona de verdade em telas pequenas, e define os padroes de modal, formulario e confirmacao que a conversao expoe. Diferente da skill 02 (que decide como a interface **vai** parecer antes de existir), esta skill audita e conserta o que **ja** existe.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`, `policies/token-efficiency.md`, `policies/stack-flexibility.md`, `policies/evals.md` e `policies/visual-diff-precision.md` (validar correção de layout comparando screenshot antes/depois — decompor em passes de zoom, não afirmar "corrigido" a partir de uma olhada única).

Para catalogo completo de bugs com snippet de fix por framework (Tailwind, CSS puro, styled-components), consultar `docs/skill-guides/responsive-conversion.md` apenas quando necessario.

Fronteira com skills vizinhas:
- **02-ui-ux-design** define ancora estetica, tokens e wireframe **antes** de codar — esta skill nao redefine estetica, herda a que ja existe
- **52-ui-polish** cuida do acabamento micro (border radius concentrico, alinhamento optico) **depois** que o layout esta correto — layout quebrado nao se resolve com polish
- **22-accessibility-specialist** e dona de WCAG completo — esta skill cobre so o subconjunto que colide com mobile (hit area, focus trap em modal, zoom de input)
- **57-mobile-ux-foundations** define, **antes** desta, onde o elemento deve morar pela zona do polegar, como o tema escuro se comporta, como tratar espera acima de 1s e como desenhar login/onboarding — esta skill executa o layout dentro dessas restricoes
- **58-i18n-localization** trata a quebra causada pelo **conteudo** (texto traduzido cresce, RTL inverte a direcao); esta skill trata a quebra causada pela **largura da tela**. A raiz costuma ser a mesma — container que se recusa a crescer — entao o fix de `min-w-0` daqui frequentemente resolve os dois

## Quando Usar

- converter tela/app pensado para desktop em versao mobile funcional
- corrigir componente que nao ocupa a largura esperada ou corta conteudo
- resolver scroll horizontal indevido ou layout que "estoura" a tela
- definir comportamento de modal, drawer ou bottom sheet em telas pequenas
- especificar fluxo de confirmacao para acao destrutiva ou irreversivel
- auditar formulario que fica inutilizavel em mobile

## Quando Nao Usar

- escolher paleta, tipografia ou direcao visual do zero (isso e 02-ui-ux-design)
- ajustar detalhe de acabamento em layout que ja funciona (isso e 52-ui-polish)
- auditoria completa de acessibilidade WCAG (isso e 22-accessibility-specialist)
- decidir sistema de animacao e motion tokens (isso e 12-motion-design)

## Entradas Esperadas

- codigo da interface existente (componentes, paginas, CSS/Tailwind)
- descricao do sintoma observado, se houver ("nao pega 100%", "corta no meio")
- breakpoints e ancora estetica ja definidos (skill 02), se existirem
- print/screenshot do bug, quando disponivel

## Saidas Esperadas

- relatorio de auditoria com sintoma → causa raiz → fix aplicado, por ocorrencia
- codigo corrigido nos arquivos reais
- checklist de conversao marcado
- padroes de modal/confirmacao especificados para os fluxos destrutivos encontrados

## Protocolo de Auditoria

Rodar nesta ordem. Cada fase alimenta a seguinte — pular fase gera fix superficial que reaparece.

### Fase 1 — Inventario de viewport

Mapear onde o layout assume largura de desktop:

```bash
# Larguras fixas em px (o suspeito numero 1)
grep -rn "width: *[0-9]\{3,\}px\|w-\[[0-9]\{3,\}px\]\|min-width: *[0-9]\{3,\}px" src/ app/

# Alturas de viewport legadas (quebram com barra do browser mobile)
grep -rn "100vh\|h-screen\|min-h-screen" src/ app/

# Grids com contagem fixa de coluna
grep -rn "grid-cols-[3-9]\|grid-template-columns" src/ app/
```

Cada hit e um candidato — nao um bug confirmado. Confirmar na Fase 2.

### Fase 2 — Reproduzir em viewport real

Nao confiar em "parece ok no devtools responsivo". Testar em 3 larguras que quebram coisas diferentes:

| Largura | Representa | O que quebra tipicamente |
| --- | --- | --- |
| **320px** | iPhone SE / Android pequeno | Largura fixa, botao com texto longo, tabela |
| **390px** | iPhone padrao atual | Grid de 2 colunas apertado, modal com padding grande |
| **768px** | Tablet retrato / limiar | Layout que troca de sidebar para hamburger no ponto errado |

Quando houver Playwright no projeto (skill 05), preferir teste automatizado de viewport a inspecao manual — o teste vira regressao.

### Fase 3 — Classificar e corrigir

Usar o catalogo abaixo. Fix sem entender a causa raiz reaparece na proxima tela.

### Fase 4 — Verificar sem regressao

Reconferir as 3 larguras da Fase 2 **e** a largura desktop original — conversao mobile que quebra o desktop nao e conversao, e troca de bug.

## Catalogo de Bugs — Sintoma, Causa, Fix

### 1. Componente nao ocupa 100% da largura

O sintoma mais comum e quase sempre a mesma causa raiz: **item de flex/grid tem `min-width: auto` por default**, entao ele se recusa a encolher abaixo do conteudo, e o container "estoura" em vez de caber.

| Sintoma | Causa | Fix |
| --- | --- | --- |
| Filho de flex nao encolhe, empurra layout | `min-width: auto` implicito no flex item | `min-w-0` no filho (CSS: `min-width: 0`) |
| Coluna de grid estoura o container | Mesma causa, em grid | `min-w-0` no item **ou** `grid-template-columns: minmax(0, 1fr)` |
| Texto longo sem espaco empurra tudo | Palavra sem quebra (URL, hash, email) | `break-words` / `overflow-wrap: anywhere` |
| `w-full` nao surte efeito | Pai tem largura intrinseca (`w-fit`, `inline-block`, tabela) | Corrigir o **pai**, nao o filho |
| Componente com largura correta mas conteudo vaza | `overflow` nao definido | `overflow-hidden` no container **so** depois de confirmar que nao esconde conteudo util |

Regra: `min-w-0` no filho de flex/grid resolve a maioria absoluta destes casos. Aplicar antes de tentar qualquer outra coisa.

### 2. Altura de viewport quebrada em mobile

`100vh` no mobile **nao** e a altura visivel — browsers mobile contam a viewport sem descontar a barra de endereco, entao o conteudo fica cortado atras dela.

| Unidade | Comportamento | Quando usar |
| --- | --- | --- |
| `100vh` | Altura **maxima** (barra recolhida) — corta conteudo | Nunca em mobile sem fallback |
| `100dvh` | Altura **dinamica** real, acompanha a barra | Default para tela cheia em mobile |
| `100svh` | Altura **minima** (barra visivel) | Quando o conteudo nunca pode ficar escondido |
| `100lvh` | Altura maxima explicita | Background decorativo que pode passar por baixo |

Fallback para browsers antigos: declarar `100vh` primeiro e `100dvh` na linha seguinte — quem nao entende `dvh` ignora a segunda.

```css
.tela-cheia {
  height: 100vh;
  height: 100dvh;
}
```

### 3. Safe area — notch, ilha dinamica e barra de gestos

Conteudo colado na borda em iPhone fica embaixo do notch (topo) ou da barra de gestos (base). Exige duas coisas juntas — falta uma, nao funciona:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
```

```css
.header-fixo  { padding-top: env(safe-area-inset-top); }
.barra-inferior { padding-bottom: env(safe-area-inset-bottom); }

/* Somar ao padding proprio em vez de substituir */
.barra-inferior { padding-bottom: calc(1rem + env(safe-area-inset-bottom)); }
```

Afeta: header fixo, bottom navigation, botao flutuante, bottom sheet, modal full-screen.

### 4. Scroll horizontal indevido

A pagina inteira desliza pro lado. Debug em ordem — o primeiro hit costuma ser o culpado:

```js
// Cole no console: lista todo elemento mais largo que a tela
document.querySelectorAll('*').forEach(el => {
  if (el.offsetWidth > document.documentElement.offsetWidth) console.log(el);
});
```

Causas por frequencia: largura fixa em px maior que a tela → margem negativa sem `overflow-hidden` no pai → `100vw` (ignora a barra de scroll, use `100%`) → grid com `grid-cols-N` fixo → imagem sem `max-width: 100%` → tabela sem wrapper com scroll.

Nunca "resolver" com `overflow-x: hidden` no `body` — isso esconde o sintoma, mantem o bug e quebra `position: sticky` dentro da pagina.

### 5. Grid e posicionamento que colapsam

| Padrao desktop | Conversao mobile | Como |
| --- | --- | --- |
| Grid de N colunas fixas | Colunas por espaco disponivel | `grid-cols-[repeat(auto-fit,minmax(280px,1fr))]` — sem media query |
| Sidebar + conteudo | Stack vertical ou drawer | `flex-col md:flex-row` |
| Tabela de dados | Cards empilhados | Repetir o dado como card < `md`, tabela >= `md` |
| Toolbar horizontal | Scroll horizontal proprio ou menu "mais" | Wrapper com `overflow-x-auto` **so na toolbar**, nunca no body |
| Modal centralizado | Bottom sheet | Ver secao de modais |
| Icone + label lado a lado | So icone com `aria-label` | Manter hit area de 44px mesmo sem o label |

`auto-fit` + `minmax` resolve a maioria dos grids sem escrever uma media query — preferir a media query manual so quando a quebra precisa acontecer em ponto especifico do design.

### 6. Formulario em mobile

| Problema | Fix |
| --- | --- |
| iOS aplica zoom ao focar input | `font-size: 16px` minimo no input (nao no label) |
| Teclado errado (numerico, email) | `inputmode` correto: `numeric`, `decimal`, `email`, `tel` |
| Autofill nao funciona | `autocomplete` semantico (`given-name`, `cc-number`, `one-time-code`) |
| Teclado cobre o campo focado | `scroll-margin-bottom` no input ou scroll manual no focus |
| Campos lado a lado ilegiveis | Empilhar sempre em mobile — `grid-cols-1 md:grid-cols-2` |
| Botao de submit fora do alcance | Fixar no rodape com `env(safe-area-inset-bottom)` |
| Erro so no topo do form | Erro inline no campo **e** foco programatico no primeiro invalido |
| Erro so aparece no submit | Validar no `blur` de cada campo — no submit, o usuario ja perdeu o contexto do que digitou (ver skill 57) |
| Label vira placeholder e some ao digitar | Label flutuante — placeholder sozinho quebra leitor de tela e apaga a instrucao (ver skill 57) |

## Modais, Drawers e Bottom Sheets

### Qual usar

| Situacao | Desktop | Mobile | Motivo |
| --- | --- | --- | --- |
| Confirmar acao curta | Modal centralizado | Modal centralizado (pequeno) | Precisa de foco total, conteudo cabe |
| Formulario medio/longo | Modal centralizado | **Bottom sheet** ou tela cheia | Modal com scroll interno em tela pequena e hostil |
| Navegacao secundaria | Sidebar / dropdown | Drawer lateral | Preserva contexto da tela |
| Selecao de opcao em lista | Dropdown / popover | Bottom sheet | Alcance do polegar |
| Conteudo imersivo (imagem, leitura) | Modal grande | Tela cheia (rota propria) | Modal full-screen sem URL quebra o botao voltar |

Regra de ouro: se o conteudo do modal exige scroll em mobile, provavelmente deveria ser bottom sheet ou uma rota propria — nao um modal menor.

### Requisitos nao-negociaveis de todo modal

Falta qualquer um destes e o modal esta quebrado, independente da aparencia:

- **Focus trap** — Tab circula dentro do modal, nunca vaza para a pagina atras
- **Retorno de foco** — ao fechar, foco volta ao elemento que abriu
- **Escape fecha** — e o mesmo caminho de fechar do botao X
- **Scroll lock no fundo** — a pagina atras nao rola junto (cuidado: `overflow: hidden` no body perde a posicao de scroll no iOS; salvar e restaurar `scrollY`)
- **Role e label** — `role="dialog"` + `aria-modal="true"` + `aria-labelledby` apontando para o titulo
- **Clique no backdrop** — fecha em modal informativo; **nao** fecha em modal com formulario preenchido ou confirmacao destrutiva (evita perda acidental)
- **Respeitar safe area** — bottom sheet precisa de `padding-bottom: env(safe-area-inset-bottom)`

Preferir primitiva acessivel pronta (Radix Dialog, Headless UI, `<dialog>` nativo) a implementar focus trap na mao — implementacao propria erra em detalhe de teclado quase sempre.

### Bottom sheet — comportamento esperado

- Sobe da base, ocupa altura pelo conteudo (`max-height: 85dvh` como teto)
- Handle visual no topo indicando que arrasta
- Fecha por: arrastar pra baixo, tocar no backdrop, Escape, botao explicito
- Conteudo longo rola **dentro** da sheet, com a sheet ancorada
- Nunca ultrapassar `100dvh` nem esconder conteudo atras da barra de gestos

## Confirmacao de Acoes — Destrutivo, Envio, Cadastro

O erro mais comum e tratar tudo igual: ou confirma tudo (fricção que treina o usuario a clicar "sim" sem ler), ou nao confirma nada (perda de dado real).

### Escolher o padrao pela reversibilidade

| Tipo de acao | Padrao correto | Nunca fazer |
| --- | --- | --- |
| **Reversivel e barata** (arquivar, marcar lido, remover item do carrinho) | Executar direto + **toast com Desfazer** (5-10s) | Modal de confirmacao — fricção sem beneficio |
| **Irreversivel comum** (excluir registro, cancelar pedido) | Modal de confirmacao com consequencia explicita | Botao destrutivo sem nenhuma confirmacao |
| **Irreversivel catastrofica** (excluir conta, apagar workspace, deletar em massa) | Confirmacao com **digitacao** do nome do recurso | Modal simples de "Tem certeza?" |
| **Envio que gera efeito externo** (enviar email, publicar, cobrar cartao) | Revisao antes + estado de loading bloqueante + confirmacao de sucesso | Permitir duplo clique (submit duplo) |
| **Cadastro/formulario longo** | Autosave de rascunho + aviso ao sair com dado nao salvo | Perder tudo em navegacao acidental |

Preferir **Desfazer a Confirmar** sempre que a acao for tecnicamente reversivel — undo respeita mais o tempo do usuario e produz menos erro que um modal que ele aprendeu a dispensar.

### Anatomia do modal de confirmacao destrutiva

```
Titulo:     nomeia a acao e o alvo especifico
            "Excluir o projeto Vendas Q4?"
            NAO: "Tem certeza?" / "Confirmar acao"

Corpo:      consequencia concreta e verificavel
            "Os 128 registros e 3 integracoes serao removidos. Nao da pra desfazer."
            NAO: "Esta acao nao pode ser desfeita." (generico, ninguem le)

Botao 1:    verbo da acao, nao "OK" — visual destrutivo
            "Excluir projeto"
            NAO: "Sim" / "Confirmar" / "OK"

Botao 2:    saida segura, e o default do foco
            "Cancelar"

Foco:       inicia no botao seguro, nunca no destrutivo
Escape:     cancela
Backdrop:   NAO fecha (evita dispensar sem querer)
```

Para acao catastrofica, exigir digitacao literal do nome do recurso e manter o botao desabilitado ate bater exatamente — atrito proposital e desejavel aqui.

### Estados obrigatorios de qualquer acao com efeito

Toda acao que chama API precisa dos quatro:

1. **Idle** — botao habilitado com verbo claro
2. **Loading** — botao desabilitado com indicacao de progresso (previne submit duplo; nao basta esconder o botao)
3. **Sucesso** — confirmacao visivel do que aconteceu, com Desfazer quando aplicavel
4. **Erro** — mensagem que diz o que falhou **e** o que fazer, preservando o dado que o usuario digitou

Nunca fechar o modal antes da resposta chegar: fechar otimista em acao destrutiva esconde o erro do usuario.

## Anti-Padroes

- `overflow-x: hidden` no `body` para "resolver" scroll horizontal — esconde o bug e quebra `position: sticky`
- `100vh` em tela cheia mobile sem fallback `dvh`
- Media query como primeira ferramenta — testar antes `min-w-0`, `auto-fit`/`minmax`, `flex-wrap`, `clamp()`
- Detectar mobile por user agent para decidir layout — usar largura de container/viewport
- Esconder funcionalidade em mobile (`hidden md:block`) como solucao de layout — mover ou reorganizar, nao amputar
- Modal full-screen sem rota propria — quebra o botao voltar do Android
- Backdrop que fecha modal de confirmacao destrutiva ou formulario preenchido
- Modal de confirmacao para acao trivialmente reversivel — treina o usuario a confirmar no automatico
- "Tem certeza?" sem nomear o alvo nem a consequencia
- Botao destrutivo como default do foco
- Toast de erro que some sozinho em acao critica — erro precisa persistir ate o usuario agir
- `touch-action: none` global para "resolver" scroll — mata gesto legitimo

## Checklist de Conversao

Layout:
- [ ] Testado em 320px, 390px e 768px, alem do desktop original
- [ ] Zero scroll horizontal em todas as larguras
- [ ] Filhos de flex/grid com `min-w-0` onde encolhem
- [ ] `dvh` em vez de `vh` em tela cheia (com fallback)
- [ ] `viewport-fit=cover` + `env(safe-area-inset-*)` em elementos de borda
- [ ] Grids usam `auto-fit`/`minmax` ou colapsam por breakpoint
- [ ] Imagens com `max-width: 100%` e `aspect-ratio` definido
- [ ] Tabelas viram cards ou tem wrapper com scroll proprio

Interacao:
- [ ] Hit area minima de 44x44px em todo alvo de toque
- [ ] Inputs com `font-size` >= 16px, `inputmode` e `autocomplete` corretos
- [ ] Modal com focus trap, retorno de foco, Escape e scroll lock
- [ ] Conteudo longo em mobile usa bottom sheet ou rota propria, nao modal com scroll
- [ ] Toda acao com API tem os 4 estados (idle, loading, sucesso, erro)
- [ ] Submit duplo impossivel (botao desabilita no loading)

Confirmacao:
- [ ] Acao reversivel usa Desfazer, nao modal
- [ ] Modal destrutivo nomeia alvo e consequencia concreta
- [ ] Botao de acao usa o verbo, nao "OK"
- [ ] Foco inicia no botao seguro; backdrop nao fecha
- [ ] Acao catastrofica exige digitacao do nome do recurso
- [ ] Formulario longo avisa antes de descartar dado nao salvo

## Evidencia de Conclusao

- relatorio sintoma → causa → fix para cada ocorrencia corrigida
- checklist de conversao marcado, com item nao aplicavel justificado
- verificacao nas 3 larguras mobile **e** na largura desktop original (sem regressao)
- quando houver Playwright no projeto, teste de viewport cobrindo os bugs corrigidos

## Handoff

### Recebe de

- **02-ui-ux-design** — ancora estetica, tokens e breakpoints ja definidos
- **04-frontend-integration** — componentes implementados a auditar

### Entrega para

- **52-ui-polish** — layout correto e pre-requisito do polish; despachar depois, nunca antes
- **22-accessibility-specialist** — quando a auditoria revelar problema de acessibilidade alem do subconjunto mobile
- **05-qa-testing** — para transformar os bugs corrigidos em teste de viewport (regressao)
- **11-reviewer** — relatorio e checklist para validacao final

## Regra de Codigo Limpo

Comentario so quando o valor nao e obvio — `min-w-0` e `100dvh` merecem uma linha explicando o porque, ja que parecem arbitrarios para quem nunca caiu no bug. Classe utilitaria autoexplicativa nao precisa de comentario.

## Integracao com Pipeline

- **Orquestrador (skill 09):** aciona esta skill quando a task menciona mobile, responsivo ou bug de layout; tipicamente depois de 04-frontend-integration
- **UI/UX Design (skill 02):** dona da direcao estetica — esta skill herda a ancora, nunca a redefine
- **UI Polish (skill 52):** entra depois desta; acabamento sobre layout quebrado e desperdicio
- **Accessibility (skill 22):** dona do WCAG completo; esta skill cobre so o recorte que colide com mobile
- **QA (skill 05):** converte os fixes em teste automatizado de viewport
- **Context Manager (skill 08):** rastreia progresso da auditoria por tela/componente
