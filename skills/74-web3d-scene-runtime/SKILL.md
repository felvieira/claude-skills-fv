---
name: web3d-scene-runtime
description: |
  Monta e renderiza cena 3D interativa no browser a partir de uma scene description estruturada —
  o elo entre asset GLB pronto e pagina real. Cobre o schema de scene description que um LLM emite
  (camera, luzes, ambiente, slots de asset, materiais, particulas), WebGPURenderer com fallback
  WebGL2 automatico, camera navegavel (OrbitControls/orbit manual, raycasting), e orcamento de
  performance web (Draco/KTX2, LOD, dispose, pixelRatio, prefers-reduced-motion, fallback estatico).
  Nao gera mesh 3D nem anima personagem — consome GLB da skill 68/69.
  Trigger em: "three.js", "WebGPU", "WebGPURenderer", "WebGL", "cena 3D no browser",
  "landing page com 3D", "produto 3D interativo no site", "configurador 3D", "visualizador 3D",
  "carregar GLB na pagina", "GLTFLoader", "camera navegavel", "OrbitControls", "raycasting",
  "scene description", "montar cena proceduralmente", "3D interativo em vez de video",
  "react-three-fiber", "R3F", "modelo 3D no site", "girar o produto na tela".
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
metadata:
  argument-hint: "<scene description | prompt de cena> [--renderer webgpu|webgl] [--stack vanilla|r3f]"
  version: "1.0.0"
---

# Web3D Scene Runtime — Scene Description, WebGPU e Camera Navegavel

Recebe assets 3D prontos e uma intencao de cena, e entrega uma cena real no browser: navegavel,
editavel e re-renderizavel sem custo de geracao. O oposto de video gerado — trocar camera, luz,
horario ou posicao de objeto e mudar um campo do scene description, nao gerar um novo clipe.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`,
`policies/token-efficiency.md`, `policies/evals.md` e `policies/verification-before-completion.md`
(cena 3D e afirmacao visual: "renderizou" exige screenshot real, nao "o codigo esta correto").

Conteudo denso vive em `references/` — carregar so o arquivo relevante:

| Assunto | Arquivo |
|---|---|
| Schema completo do scene description (campos, tipos, exemplo end-to-end, regras de validacao) | `references/scene-schema.md` |
| Setup de renderer, compressao de asset, orcamento de performance e matriz de fallback | `references/renderer-and-performance.md` |

**Guidelines de codigo three.js nao vivem aqui.** A skill 02 ja mantem 53 guidelines verificadas
(three.js 0.185.1) com Do/Don't e codigo bom/ruim em `skills/02-ui-ux-design/data/stacks/threejs.csv`.
Consultar antes de escrever qualquer linha:

```bash
python skills/02-ui-ux-design/scripts/design_search.py "GLTF loader camera orbit" --stack threejs
```

Esta skill decide **a cena e o contrato**; aquele CSV decide **como escrever o codigo**. Duplicar as
53 guidelines aqui criaria duas fontes de verdade que envelhecem em ritmos diferentes.

## Quando Usar

- landing page ou site com objeto/cena 3D que o visitante gira, aproxima ou explora
- configurador de produto (trocar cor, material, peca, com camera livre)
- visualizador de asset GLB no browser — inclusive o GLB que saiu das skills 68/69
- transformar um prompt de cena em cena montada proceduralmente (scene description → runtime)
- decidir entre WebGPU e WebGL2, ou entre three.js vanilla e react-three-fiber
- diagnosticar cena 3D que trava, esquenta o device, ou nao abre em Safari/mobile

## Quando Nao Usar

- gerar o mesh/modelo 3D do zero (text-to-3D) — **nenhuma skill do kit faz isso hoje**; a 17 gera
  imagem 2D, nao 3D, apesar de 66/67 a citarem como geradora de "modelo 3D" (handoff defeituoso)
- rigging, retargeting ou animacao de personagem — `skills/68-character-animation-3d/SKILL.md`
- sprite/atlas 2D derivado de 3D — `skills/69-character-pipeline-2d/SKILL.md`
- scrollytelling onde o scroll e a timeline narrativa e o mundo e fotografico —
  `skills/64-scroll-storytelling/SKILL.md` (ver fronteira abaixo)
- micro-interacao, hover, spring, transicao de rota — `skills/12-motion-design/SKILL.md`
- codigo de gameplay em Unity/Unreal — `skills/67-game-engine-development/SKILL.md`

### Fronteira com a skill 64 (scroll storytelling)

A 64 tem uma regra dura contra render 3D (`references/worlds.md`: "NAO render 3D") e contra corrente
continua de camera — **e ela esta certa no dominio dela**: o mundo dela e fotografico, o scroll e o
unico input, e um flythrough continuo e a coisa mais cara e fragil de construir. Nada aqui revoga
aquela regra.

A fronteira e o **input**: se o visitante so rola a pagina, e a 64. Se o visitante **controla a
camera** (arrasta, orbita, aproxima, clica num objeto pra focar), e esta skill. Um beat de scrollytelling
que precise de um objeto 3D girando conforme o scroll pode delegar so aquele bloco pra ca — a pagina
continua sendo da 64, o canvas e daqui.

## Entradas Esperadas

- assets 3D em `.glb`/`.gltf` (das skills 68/69, de biblioteca licenciada, ou do proprio cliente)
- intencao de cena: prompt em linguagem natural, ou um scene description ja estruturado
- ancora estetica e tokens da skill 02 (paleta, luz, acabamento) — cena 3D nao escapa da ancora
- restricoes reais: device alvo, orcamento de peso, se precisa funcionar sem WebGPU
- se a cena e hero de landing: metrica de LCP alvo da skill 14

## Saidas Esperadas

- `scene.json` valido contra `references/scene-schema.md` — o artefato que o LLM emite e o runtime consome
- codigo de runtime (vanilla three.js ou R3F) que le esse JSON e monta a cena, nao hardcoda objetos
- canvas funcionando com camera navegavel e pelo menos um alvo de raycasting quando a cena pede interacao
- fallback declarado: o que o visitante ve sem WebGPU, sem WebGL2, e com `prefers-reduced-motion`
- evidencia de render: screenshot em desktop e mobile, mais contagem de draw call/triangulo medida
- orcamento de peso preenchido (GLB comprimido, textura KTX2, total transferido)

## Protocolo

### 1. Fechar o scene description antes de escrever runtime

O contrato existe pra que o LLM seja **diretor de cena**, nao autor de codigo de render. Ele decide
enquadramento, luz, o que entra na cena e o que e interativo; nao escreve `camera.position.set()`.
Mesma disciplina do `MotionPlan` da skill 69 (LLM dirige intencao, nunca rotacao de bone crua) —
aqui aplicada a cena: o JSON descreve **o que a cena e**, o runtime decide **como desenhar**.

Sem esse contrato, cada cena vira um arquivo `main.js` artesanal que ninguem mais consegue editar
por campo. Schema completo em `references/scene-schema.md`.

### 2. Resolver a decisao de renderer antes do wireframe

WebGPU atingiu Baseline em janeiro de 2026 (Chrome/Edge, Firefox no Windows e macOS Tahoe, Safari
26+). O `WebGPURenderer` do three.js **cai pra WebGL2 automaticamente** quando o browser nao suporta
— nao e preciso escrever dois caminhos. Ele segue oficialmente experimental (previsao de estabilizar
ao fim de 2026), o que muda o texto do risco no handoff, nao a escolha default.

Duas consequencias praticas que nao sao obvias:

- `setAnimationLoop()` cuida da inicializacao do backend sozinho. `await renderer.init()` explicito
  so e necessario quando algo roda **antes** do primeiro frame (compute pass, render unico pra
  thumbnail).
- Material embutido (`MeshStandardMaterial`) continua funcionando — e mapeado pro sistema de nodes.
  Mas `ShaderMaterial`, `RawShaderMaterial` e patch via `onBeforeCompile` **nao atravessam** pro
  backend WebGPU: precisam ser reescritos em TSL. Herdar um shader custom de projeto WebGL antigo e
  o ponto onde a migracao quebra em silencio.

Comandos, importmap, tabela de fallback e o que cada caminho custa: `references/renderer-and-performance.md`.

### 3. Camera navegavel e o que e clicavel

Camera livre nao e "adicionar OrbitControls e pronto". Decidir e declarar no scene description:
limite de orbita (evitar o visitante ver o avesso da cena), limite de zoom, se ha alvo de foco, e o
que acontece no mobile (touch tem menos eixos que mouse).

Raycasting tem duas armadilhas que o CSV da skill 02 documenta com codigo: um unico raycaster
compartilhado (nao um por frame) e a **flag recursiva** em `intersectObjects` — sem ela, um GLB
carregado nao registra clique nenhum, porque as meshes sao descendentes de um `Group`, e o bug se
apresenta como "o modelo carregou mas nao responde".

### 4. Orcamento antes de otimizacao

Peso e performance sao decisao de escopo, nao ajuste final. Definir antes de modelar/importar:
budget de triangulo, de textura, e o teto de particulas. Compressao nao e opcional em cena web —
Draco/meshopt pra geometria, KTX2/Basis pra textura (fica comprimida na VRAM, nao so no download).

**Checkpoint obrigatorio:** medir na pagina composta, em device real ou throttle equivalente —
contagem de draw call, triangulo, e peso transferido. Se estourar o budget, cortar escopo da cena
(menos objeto, menos luz com shadow, LOD mais agressivo) e medir de novo. Nao aceitar "no meu
desktop roda liso" como evidencia: a cena 3D e o item mais caro da pagina e o celular do visitante
e outra maquina. Repetir ate o budget fechar **na mesma medicao**.

### 5. Fallback e acessibilidade como parte da cena

Toda cena declara o que aparece quando ela nao pode rodar: sem WebGL2, com `prefers-reduced-motion`,
ou em device que nao aguenta o budget. Um `<canvas>` vazio nao e fallback — imagem estatica do
mesmo enquadramento e. O canvas precisa de `aria-label`, e a cena precisa de um caminho de teclado
quando ha objeto interativo (clicar no objeto nao pode ser a unica forma de chegar na informacao).

## Heuristicas

- **Um renderer por pagina.** Varios canvas independentes e a causa mais comum de aba travando —
  compartilhar um renderer e alternar cena/viewport.
- **`dispose()` ao remover da cena.** Geometria e textura nao saem da VRAM por garbage collection.
  Configurador que troca peca 20 vezes sem dispose vaza ate o tab morrer.
- **Pausar o loop com a aba escondida.** `requestAnimationFrame` sozinho nao resolve tudo; cena
  rodando em aba oculta gasta bateria e aparece como "o site esquenta o celular".
- **Instanciar o repetido.** 200 arvores iguais sao um `InstancedMesh`, nao 200 meshes.
- **Luz com shadow e caro.** Sombra seletiva (o objeto principal projeta, o cenario nao) e quase
  sempre indistinguivel visualmente e muito mais barata.
- **Camera com limite é decisão de produto.** Orbita livre total quase sempre expõe o modelo por um
  ângulo que ninguém aprovou.

## Anti-Padroes

- Hardcodar objeto/camera/luz no runtime e chamar isso de cena procedural — sem scene description,
  nao ha o que um LLM edite por campo, e a promessa de "editavel sem re-gerar" morre
- Prometer text-to-3D: pedir "uma Ferrari" e esperar mesh detalhada. Sem asset existente ou gerador
  de mesh, a cena nao tem o que montar — isso e limite real, nao detalhe de implementacao
- Migrar cena WebGL antiga pra WebGPU sem checar `onBeforeCompile`/`ShaderMaterial` — quebra em
  silencio, sem erro de import
- Tratar "o GLB carregou" como "a cena esta pronta" — sem percorrer o grafo (`traverse`), sombra e
  material das meshes filhas ficam sem configurar, e a cena renderiza chapada sem erro nenhum
- `intersectObjects` sem flag recursiva em cena com GLB — clique nunca acerta nada
- Entregar cena sem fallback estatico e chamar de progressive enhancement
- Medir performance so no desktop do dev
- Duplicar as guidelines de three.js da skill 02 dentro desta skill

## Evidencia de Conclusao

- `scene.json` valida contra o schema, e trocar um campo (camera, luz, material) muda a cena
  renderizada sem tocar em codigo
- screenshot real da cena em desktop **e** mobile, mais o caminho de fallback capturado
- budget medido na pagina composta (draw call, triangulo, peso transferido) dentro do teto declarado
- camera navegavel testada nos dois inputs (mouse e touch); raycasting acertando alvo em GLB
- `dispose()` verificado em troca de asset (sem crescimento de memoria entre trocas)
- `aria-label` no canvas e caminho de teclado para objeto interativo
- guidelines relevantes do `threejs.csv` consultadas (nao reescritas)

## Handoff

### Recebe de

- **68-character-animation-3d** — `character.glb` + `animation.glb` certificados. Fecha o handoff
  que faltava: a 68 entregava so pra engine de jogo (Unity/Unreal), nunca pro browser
- **69-character-pipeline-2d** — quando o alvo e web e o pipeline decidiu 3D em vez de sprite
- **02-ui-ux-design** — ancora estetica, paleta, tokens, e as 53 guidelines de `threejs.csv`
- **01-po-feature-spec** — o que a cena precisa provar (girar o produto? configurar? explorar?)

### Entrega para

- **04-frontend-integration** — integrar o canvas em Next/React, lazy-load, estado da pagina
- **64-scroll-storytelling** — quando a pagina e dela e so um beat precisa de canvas 3D
- **22-accessibility-specialist** — revisar canvas, teclado e reduced-motion
- **14-seo-specialist** — validar LCP/INP com o canvas no caminho critico
- **05-qa-testing** — matriz de device/browser, incluindo o caminho sem WebGPU

## Integracao com Pipeline

`01 spec -> 02 ancora estetica -> (68/69 assets, se houver personagem) -> 74 cena e runtime ->
04 integracao -> 22 a11y + 14 performance -> 05 QA`.

- **Orchestrator (09):** aciona esta skill quando o pedido envolve 3D interativo no browser, e nao
  scrollytelling 2D (64) nem micro-interacao (12)
- **Documenter (10):** registra a decisao de renderer (WebGPU vs WebGL2) e o budget como ADR — sao
  decisoes com custo de reversao
- **Reviewer (11):** cobra a evidencia de render e o budget medido, nao aceita "o codigo compila"

## Fontes

- Estado de suporte a WebGPU (Baseline em janeiro de 2026: Chrome/Edge, Firefox no Windows e macOS
  Tahoe, Safari 26+) e comportamento do `WebGPURenderer` do three.js — fallback automatico pra
  WebGL2, opcao `forceWebGL`, `setAnimationLoop()` cobrindo a inicializacao e `await renderer.init()`
  necessario so antes do primeiro frame: verificado na documentacao oficial do three.js
  (`WebGPURenderer`) e em levantamento de suporte de browser em 2026-09, nao presumido.
- Especificadores `three/webgpu` e `three/tsl` (build `three.webgpu.js`) e caminhos de loader
  (`three/addons/loaders/{GLTFLoader,DRACOLoader,KTX2Loader}.js`, com `setDRACOLoader`/`setKTX2Loader`):
  documentacao e exemplos oficiais do three.js.
- Limite de materiais no backend WebGPU (embutidos mapeados pro sistema de nodes; `ShaderMaterial`,
  `RawShaderMaterial` e `onBeforeCompile` exigem reescrita em TSL): documentacao do sistema de nodes
  do three.js.
- As 53 guidelines de codigo (three.js 0.185.1) **nao sao desta skill** — vivem em
  `skills/02-ui-ux-design/data/stacks/threejs.csv`, portadas de
  [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) (MIT),
  e sao consultadas via `design_search.py`. Ver `## Fontes` da skill 02 para a proveniencia completa.
- O conceito de contrato "LLM como diretor, runtime como executor" e uma adaptacao deliberada do
  `MotionPlan.json` da skill 69 para o dominio de cena — mesma arquitetura, dominio diferente.
