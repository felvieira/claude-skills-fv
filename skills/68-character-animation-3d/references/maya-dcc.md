# Maya — dirigir Autodesk Maya instalada (2025-2027) via Python e bridge

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Como dirigir Maya
instalada via `mayapy` headless ou commandPort/MCP numa sessao GUI aberta. Sem Maya instalada,
ignorar este arquivo. Alvo: Maya 2027, mas os canais valem para 2025+; ver `## Armadilhas` para o
que quebra codigo lembrado de versoes antigas.

## Detectar instalacao

Primeira acao antes de qualquer coisa: provar que o binario existe e versao real.

```bash
# macOS (Apple Silicon ou Intel)
ls /Applications/Autodesk/maya*/Maya.app/Contents/bin/mayapy
/Applications/Autodesk/maya2027/Maya.app/Contents/bin/mayapy --version

# Windows
dir "C:\Program Files\Autodesk\Maya2027\bin\mayapy.exe"
dir "C:\Program Files\Autodesk\Maya2027\bin\maya.exe"

# Linux (padrao Autodesk)
ls /usr/autodesk/maya2027/bin/mayapy
rpm -qa | grep -i maya   # ou: dpkg -l | grep -i maya
```

Ordem de busca programatica: `$MX_MAYAPY`, `$MAYA_LOCATION/bin/mayapy` (no macOS `MAYA_LOCATION`
termina em `Maya.app/Contents`), depois o mais novo de `/Applications/Autodesk/maya20*/`. Sem
`mayapy`, nao ha canal headless — cair no caminho GUI/bridge ou abortar.

Sessao GUI ja aberta pelo usuario: verificar commandPort ouvindo (`lsof -iTCP -sTCP:LISTEN | grep
-i maya`) ou perguntar ao usuario se existe bridge/MCP ativa. Logar `cmds.about(version=True)` no
inicio: Smart Bevel, MtoA e USD for Maya mudam entre 2027.0/.1/.2.

Plug-ins relevantes (carregar via `loadPlugin` ou flag de job): `mtoa` (Arnold), `fbxmaya`,
`AbcExport`/`AbcImport`, `mayaUsdPlugin`, `xgen`, `bifrost`, `MASH`, `ngSkinTools` (Skin Tools).

## Como dirigir

Dois canais; escolher pelo que o trabalho precisa.

### Headless: `mayapy` batch (canal padrao)

Um processo filho por cena — crash ou hang custa um job so. Para audits, validacao, exports
(FBX/Alembic/USD), renders Arnold de revisao, qualquer coisa sem viewport.

```bash
# dentro de um wrapper python3 que chama mayapy como subprocesso
"$MAYAPY" -c "import maya.standalone; maya.standalone.initialize(); exec(open('job.py').read())"
```

Convencao do pack: wrapper `mx_run.py` — um filho por cena, env `MAYA_DISABLE_ADP=1`, stderr do
Maya em `warning` (`MAYA_BATCH_STDERR_LOGGING_LEVEL`), script nodes desligados, ultima linha de
stdout `MX_RESULT {json}`, exit 0 ok / 1 erro de job / 4 timeout. NUNCA sobrescrever a cena
fonte: sempre `--save-as` versao nova (`<asset>_v###.ma`).

Dentro do job: `import maya.cmds as cmds` e `import maya.api.OpenMaya as om` (OpenMaya 2.0).
Regras que codigo generalista erra:

- **Selection-free**: passar nomes de nós em todo comando; nunca `select` + operar.
- Capturar retorno de criacao (`polyCube` devolve `[transform, history]`; `#` expande nomes) e
  usar o retorno, nao o nome pedido.
- Long names ou UUIDs para qualquer coisa com nome curto duplicavel; `or []` apos `ls`,
  `listRelatives`, `listConnections`.
- **Undo e responsabilidade sua**: escritas OpenMaya 2.0 nao entram na fila de undo; apagar via
  OM2 um no criado por cmds corrompe o undo. OM2 para leituras pesadas e matrizes, cmds para
  edits que o usuario pode desfazer.
- **Unidades**: OpenMaya devolve centimetros e radianos; cmds devolve unidades de UI e graus.
- `cmds` so na main thread. `maya.utils.executeInMainThreadWithResult` nao existe em batch.
- Nunca tocar nos que voce nao criou; taguear os seus (namespace, atributo ou set) e limpar por tag.
- `MFnMesh` levanta excecao em mesh vazio; `MItGeometry` precisa group -1 para todos os vertices.
- PyMEL NAO vem bundled; versao do Python nao documentada — fazer probe.

### GUI via bridge: commandPort / MCP

Para playblast, capturas de viewport, ferramentas interativas (Quad Draw, Multi-Cut, Paint Skin
Weights, XGen brushes — sem API de stroke; scriptar os comandos subjacentes), `scriptJob`,
PySide6/`workspaceControl`, cena aberta do usuario.

**Por que arquivos e nao socket cru**: commandPort default e MEL, buffer de 4096 caracteres
(comandos maiores fecham a conexao, resultados maiores viram erro) e devolve so o resultado de um
statement. Bridge robusta (padrao `mx_bridge`/`maya-mcp`): envia uma linha curta e troca codigo e
resultados como arquivos; cada resposta carrega `result`, `stdout`, `stderr`, `maya_messages` —
ler TODOS a cada call, senao o agente fica cego. Uma call = um undo chunk (`try/finally`).

Servidor: o usuario inicia uma vez no Script Editor (`mx_bridge_server.start()` ou equivalente);
cliente `Bridge(port=7001).run(code)`. Antes de mexer em cena do usuario: `cmds.file(q=True,
modified=True)`. Nunca abrir UI modal (`confirmDialog`, `input()`, `pdb`, file dialogs): trava a
main thread e a bridge junto.

**Seguranca**: porta abre como `127.0.0.1:<port>` sem autenticacao — qualquer processo local roda
comandos como o usuario, incluindo `system()`. Maquina pessoal apenas; fechar apos a sessao. Um
render Arnold por vez por maquina. NAO abrir GUI Maya por conta propria: gasta seat de licenca e
nao e dirigivel sem bridge.

### Prova por captura

Nunca reportar modelo, rig, shot ou render como pronto sem olhar um render. Headless: contact
sheet via Arnold (views front/side/back/threequarter/top, modos clay/wire/silhouette/normals);
GUI: `playblast` (default scale 0.5 — passar `percent=100`). Numeros primeiro, olhos depois.

## Modeling

- Densidade minima = feature mais estreita; quads vizinhos abaixo de 2:1. Loops sao a prova: loop
  que para morto = double extrude escondido.
- Triangulos: remover, resolver, reinstalar so onde o teste de highlight aguenta; n-gons NUNCA em
  cage que subdivide ou deforma. Cleanup automatico corrige so lamina, non-manifold e arestas
  zero — n-gon a mao.
- Cilindros em multiplos de 4 lados (20/24/28/32), caps em quads, sem fans de alta valencia.
- Metodo de edge-holding depende do destino: SubD portatil = support loops; SubD que fica no
  Maya/USD = creases; game low = chamfers/Smart Bevel + weighted normals ou hard edges em seams +
  normal map baked. Creases se perdem no FBX — bevel ou smoothed copy.
- Topologia de deformacao e trabalho do modeler: 1 loop de controle + 2 de suporte por joint
  (juntas 3), sem pole em superficie que deforma.
- Smart Bevel (`polySmartBevel`, 2027): Width em unidades de mundo, Depth 1 chamfer / 0.5 rounded;
  output difere entre 2027.0/.1/.2. Bevel antigo = "legacy bevel".
- Higiene de entrega: freeze transforms, delete history, nomes unicos, `castsShadows` default,
  preview de smooth DESLIGADO ao salvar (Arnold renderiza o preview por cima das iteracoes dele —
  arquivo pesado e render lento). Personagem: simetrico em X, pes no grid, Y-up virado para +Z.

## Retopology + UV

- Sem mouse: reusar topologia aprovada (template fit), construir tubos por secoes para membros,
  `polyRetopo` so para props/armadura/pano estatico — NUNCA em rosto ou torso que anima sem gate
  de deformacao. `polyRetopo` re-solve em edit e file open: deletar historia; Pause o node ao
  mudar varios attrs; Preprocess Mesh so em input 100k+ tris ruidoso.
- Plano antes de geometria: rings concentricos olhos/boca, contagem de loops igual upper/lower em
  labios e palpebras, 1+2 loops por joint, poles em areas paradas, triangulos so em cavidades.
- Bend test antes de handoff (cotovelo/joelho 90 e 130 graus, punho, tornozelo, quadril): loops
  ao longo da articulacao = problema do modeler; perda de volume em articulacao bem looppada =
  problema do rig (corrective). Palpebras fitadas sobre os eyeballs reais.
- UVs: seams como edge loops (base do pescoco, dentro da boca, linha da manga, punhos, cintura,
  pernas internas, solas); densidade de texel derivada do shot mais proximo (2x pixels de tela,
  arredondar para potencia de 2); padding 4 px entre shells / 2 px na borda, dobrando por mip.
- Bake prep: hard edges em TODA seam de UV, UMA triangulacao para bake e export, modelo espelhado
  inteiro com UVs espelhados um tile ao lado, low abracando o high.
- Unfold3D e o default: recusa non-manifold (triangular copia), pins sao os UVs NAO selecionados
  (legacy: selecionados). Quad Draw e interativo apenas. Reduce e decimation, nao retopo.

## Rigging

- Valores limpos, um lugar para cada: rotacoes zero em rest, orientacao em `jointOrient`,
  placement de controle em `offsetParentMatrix`. OPM: `world = local * OPM * dagParentWorld` —
  worldMatrix debaixo de parent movel = double transform; multiplicar por `worldInverseMatrix` do
  pai DAG ou usar `.matrix`, e zerar TRS ou aplicam em dobro.
- NUNCA eyeball: `joint -orientJoint` pula silenciosamente joints com rotacao ou sem filho; eixo
  secundario ao longo do osso e indefinido. Computar jointOrient das posicoes; pole vector no
  plano da cadeia. Cotovelos pre-dobrados, joelhos para frente; `preferredAngle`.
- IK/FK e space switches que nao movem nada: pop zero no neutro (<1e-3 cm), so o modo ativo
  visivel, tudo mais locado ("select hierarchy and key all" do animador). Solver proprio por
  personagem — ikHandles dividem solver node e conflitam entre personagens referenciados.
- `blendMatrix` e stack ordenado (cada target sobrepoe os anteriores: medias iguais = 1, 1/2,
  1/3...); `parentMatrix` (2025) normaliza e guarda offsets. Spaces blendam targets de offset,
  nunca a matriz do espaco, senao o IK flipa.
- Rig e output de build script + dados (guias, pesos serializados): rebuild limpo sempre.
- Performance: keys antes de profilear (rig sem keys profilea rapido e mente); Graph de avaliacao
  ignora curvas estaticas; sem nos Python, expressions que consultam cena, nem `frozen` driven;
  hosts de settings FORA dos membros. DG/Serial/Parallel devem concordar antes de otimizar. GPU
  Override: HUD deve mostrar count nao-zero; 2027.2 tem crash conhecido scrubando com ele ligado.
- Skeleton de engine aparte do rig de controle: um root na origem, nomes do engine, budget de
  joints; engines veem so joints, skin e blendshapes.
- Foot roll padrao: break 25 graus (ball = roll ate 25, depois 50 - roll; toe = roll - 25);
  limites footRoll -40..80.

## Skinning / Deformation

- Raw blocked weights (cada vertice 100% no joint mais proximo) sao teste do RIG: se a pose crua
  nao lembra o resultado, consertar pivots/placement/loops antes de suavizar. Smoothing sobre
  pivot ruim = o defeito volta.
- Bind explicito: passar TODA flag (`skinMethod`, `normalizeWeights`) — defaults de cmds e UI
  divergem. Heat Map em shell unico watertight com joints dentro; Geodesic Voxel para multi-piece.
- Ordem de regioes: torso -> clavicula/ombro -> braco -> antebraco -> mao -> dedos -> cabeca ->
  pernas -> pes. Twist chains como ramps pares; masks decidem forma, nao vertices.
- Julgar em movimento: calisthenics (key a cada 10 frames, pose em cada segundo, volta ao bind
  entre), um movimento por teste; thresholds: edge ratio <0.7 pinch / >1.3 stretch, area de secao
  <0.7 = candy wrapper.
- **Skin Tools layers bloqueiam** Mirror, Copy, Hammer, Paste, Normalize, Set Max Influences —
  `Delete Skin Layers` antes de handoff (mantem os pesos). API: `from ngSkinTools2 import api`.
- `-mi` em edit mode num skinCluster vivo reseta pesos custom silenciosamente — usar
  `pruneWeights` + `setMaxInfluences` em ordem segura. `copySkinWeights` sem flags = associacao
  errada: passar `surfaceAssociation`, `influenceAssociation`, `mirrorMode="YZ"`.
- Correctives: pre-deformation segura em qualquer pose; post-deformation em Transform Space (um
  joint dono) ou Tangent Space (segue a superficie). Pose Editor em joint dirigido por IK/OPM:
  criar interpolator SEM neutral poses, adicionar controllers em Driver Settings, DEPOIS Add
  Neutral Poses; ler `dagLocalMatrix`, nao `.matrix` nem `.rotate`.
- Face: budget primeiro; olhos/palpebras/mandibula em joints mesmo em face de shapes; split
  shapes somam EXATAMENTE ao master; labios levemente abertos no neutro.
- Cap de influencias: Unity 4, Unreal reporta histograma; prune <0.01. ML Deformer: Delta Mush
  fora antes de treinar; poses 30 graus por step.

## Animation

- Workflow por shot: pose-to-pose para acting, straight-ahead para fluxo; blocking acaba quando
  as 5 categorias de keys existem (main, anticipation, overshoot/follow-through, breakdown, hold).
- Maya e pessimo in-betweener: keys em ones nas acoes rapidas, 2-4 frames nas lentas. `setKeyframe`
  nativo remodela curvas vizinhas — inserir keys e provar com diff de curva.
- Peso = resistencia, depois release, depois stop capturado: beat de resistencia 2+ frames, queda
  capturada abrupta, hold maior no squash. Mais up/down = balao, nao peso. Gravidade real:
  1.703 cm/frame² a 24 fps em cena cm.
- Pes e espinha vendem todo weight shift: foot roll em todo crouch, espinha arrasta atras do
  quadril numa queda grande, touch-down flat em ~1 frame, toe aponta de volta ao ponto de saida
  no primeiro frame aereo.
- Julgar em camera space a velocidade: playblast da shot camera trancada; motion trail 3D mente.
  Walk cycle 24 frames: contact 1, down 4, pass 7, up 10, contact 13.
- Lip sync anima sons, nao palavras: jaw sozinho primeiro (muppet pass), depois big five;
  bilabiais no frame; shift global 1-2 frames antes so se a linha toda toca atrasada. Blinks
  fecham 2 / abrem 4; darts 2 frames lineares.
- Layers: experimento com prazo; nunca limpar curvas dentro dela; merge com Smart Bake, Euler
  filter depois. Mocap: consertar so o defeito pedido. Time Editor clips nunca misturam com
  animation layers.
- Entrega para engines: skeleton baked por clip, um clip por arquivo, nomes/ranges como
  bookmarks, regra de root motion (in place ou root), loop seam reportado.

## Groom (XGen)

- Interactive Groom para trabalho novo; legacy descriptions nao funcionam com ferramentas IG
  (converter uma por vez + Rebuild). Brushes sem API de stroke — groom por dados: guides de um
  flow sheet, masks como imagens, modificadores por valor.
- Flow nos guides primeiro (setas sobre a referencia); clump hierarchy depois: raiz solta (sem
  atracao nos primeiros ~14% do comprimento senao linhas carecas), 3-5 clumps pequenos por
  grande, 2 niveis (3 so em crina). Cada clump diferente: size, profile (spike/onion), variance.
- Mask e tightness sao knobs diferentes: mask decide triangulo vs quadrado (clump pequeno apertado
  dentro de um grande solto, ambos masks baixos); tightness 0 mantem forma sem convergir.
- Noise no nivel certo: clump-level quebra clumps grandes mantendo os pequenos; Noise modifier de
  strand dissolve tudo — so em parcela pequena de fios (strays ~5%). Strays saem de buracos na
  mask do clump primario, nao de sistema novo. Fill layer curto esconde o couro.
- Shader: trocar `hairPhysicalShader` default por `aiStandardHair` (Ai Kd Ind default 0 = sem
  difuso indireto). Realismo = melanin (0.2 blonde / 0.5 red-brown / 1.0 black), roughness, IOR
  1.55; diffuse 0, tints brancos, ribbon mode (Min Pixel Width so funciona ali).
- Movimento: Linear Wire dirige poucos wires, nunca o pelo; Reference State no rest pose frame 1.
- Unreal: `.abc` com `groom_group_id`, `groom_guide`, `groom_root_uv` (UV set `map1`); MtoA nao
  renderiza XGen Card primitives. Load MtoA antes do XGen. IG computa na GPU — headless em Apple
  Silicon e nao verificado; batch render de cenas XGen "pode produzir resultados incorretos".
- Alembic e Ogawa only; caches com Multiple Transforms + Write Final Width.

## FX (nCloth, Bifrost, MASH)

- Escala antes de tudo: Nucleus e Bifrost computam em METROS — Space Scale /
  `scene_units_in_meters` 0.01 em cena cm, senao um personagem de 182 cm vira 182 m no solver.
  MPM `detail_size` e em metros.
- Nunca simular a mesh de producao: duplicar corpo+roupa, dirigir por blend shape weight 1.
- Start limpo: hold 25 frames + blend 25 para a primeira pose, acao no frame 0, Nucleus start -50.
- Substeps antes de stiffness: iteracoes de colisao abaixo do substep count nao fazem nada.
  Primeira passada 10/12, final 30/35. Triagem na ordem: escala -> start state -> substeps ->
  thickness -> stretch+compression juntos -> Bend Solver High Quality -> Collide Last Threshold.
- Bifrost falha em silencio: outputs nao puxados nunca computam; arrays vazios sao dados validos;
  mismatched truncam. Sim so resolve para frente do proprio start frame — e o start tem que
  existir na timeline. Legacy Bifrost Fluids morreu: `basic_liquid_graph` + Explode. Bifrost 3.0
  sempre instalado no 2027.
- Cache, julgar o cache, renderizar o cache: nCache antes de playblast (mcc para em 2 GB — usar
  mcx), cena de render so com Alembics (Ogawa only), VDB so com campos necessarios
  (density+velocity, +temperature para fogo). `AbcExport -j` quebra em espacos no path.
- MASH: Signal substituiu Noise/Trig, Strength substituiu Mute, Repro e o default; scatter em
  mesh skinned = jitter (Mesh from Points + copy weights).
- Games: flipbooks (64 frames x 512px, 8x8 em 4096), Alembic/USD de baixa resolucao para engines.

## Lookdev (Arnold)

- Todo mapa = contrato de 3 partes: color space, plug grayscale, destino. Base/subsurface/emission
  sao cor (sRGB 8/16-bit, linear Rec.709 para EXR); todo o resto e Raw. `outAlpha` sem Alpha Is
  Luminance nao le dado — usar `outColorR`. Regras 2027 marcam .tx/.hdr/.exr como Raw: base color
  .tx chega ERRADO — override + Ignore Color Space File Rules.
- Sob ACEScg um HDRI linear e linear Rec.709, NAO Raw (senao lighting supersaturado).
- Metais sao dados: OpenPBR base color = F0, specular color = F82 edge tint, da tabela Arnold;
  IOR nao faz nada em metal. Specular branco em metal = erro de generalista.
- Escala e fisica: SSS radius e transmission depth sao comprimentos de mundo (pele ~1 mm, scale
  0.1 em cm); cor de vidro vive em depth, nao saturacao. Dielectric Priority para vidro/liquido
  sobrepostos (maior vence; vidro 3, inclusoes 2, liquido 1).
- Perfeito le como CG: noise ranged em roughness, micro bump, waviness no COAT normal (nunca no
  base), smudge/fingerprint ate em cromado.
- OpenPBR e o shader default: parametros NAO portam de Standard Surface (emission em nits — 1 a
  1000; thin film em micrometros; papeis SSS radius/scale trocados; sheen -> fuzz). "Convert All"
  pula shaders dentro de networks — lint depois.
- Normal maps: `aiNormalMap` com `tangent_space_type="mikk"` (MtoA 5.6.1.1+) para bakes de engine;
  DirectX vs OpenGL = `invertY`. Displacement: EXR float com zero em 0, bounds padded (senao
  buracos pretos), catclark 2 trabalhando / 3-4 final.
- Julgar numa lookdev rig (chrome+gray ball, chart, HDRI neutro, 85mm), depois sob a luz da
  referencia. Um lobe por render.

## Lighting / Render (Arnold)

- Uma luz domina; rim mais quente que a key falha ("small and hot" e radiance, nao energia).
  Key upstage medido do eixo da FACE, nao da camera; wrap frontal-lower-saturado ~2x o tamanho da
  key; sem ambient light (Arnold nao suporta).
- Valores de tras pra frente, counterchange atras de cada sujeito; brightening = escurecer o
  entorno, nao empurrar o sujeito.
- Ruido: achar o AOV barulhento ANTES de mexer em sampler — rays/pixel = AA² x samples², subir AA
  significa baixar o resto. 2027 usa Global Light Sampling: uma contagem (<=4 em CPU); per-light
  samples so importam em dome/distant/local-mode. Emissao e a luz mais ruidosa — mesh light.
- Render e engenharia: OIDN primeiro na cadeia (forca box filter, denoisa frame inteiro — crops
  de um frame completo), noice para sequencias (`-ef` ate 2, sem `-t` no macOS); fireflies vao
  para playbook de clamp, nao para samples. Ray depth: diffuse 1-2 exteriores/produtos, 3-4
  interiores; specular 2 salvo vidro.
- Entrega: EXR scene-linear ACEScg single-part zip, half color, float Z/P/N, light groups
  (max 16) que somam de volta a beauty dentro de 1%, masks. Julgar ATRAVES da ACES view
  (scene 1.0 ~ 0.81) — sem tone mapping sub-expoem tudo.
- `Render -r arnold`, nunca `maya -render` (obsoleto). Render Setup e legacy render layers sao
  exclusivos por sessao. IPR do Maya nao funciona com MtoA 5+ — usar Arnold RenderView.
- macOS: Arnold CPU only (sem GPU/OptiX); batch sem licenca de Arnold batch = watermark; batch
  aborta em license fail por default (`ARNOLD_FORCE_ABORT_ON_LICENSE_FAIL=0` para testes).

## Pipeline scripting (FBX / Alembic / USD para engines)

- Contrato + prova: todo arquivo sai com nome gerado, settings explicitos e re-import check em
  cena limpa (meshes, tris, joints, bounds por mesh, normais <2% movidos, units, up axis). Ler
  takes com `FBXRead`; USD com `pxr`.
- FBX e estado global: push, reset, setar TODA opcao, limpar acumulador de takes, query back, log
  ao lado do arquivo, pop. `FBXExportGenerateLog` sempre on — em batch o log e o unico feedback.
  Versao FBX 2020.2 para Unreal; Take001 sempre existe; Bake Start/End nunca ficam em presets —
  `bake=(s,e)` explicito, um clip por arquivo.
- Tangentes so exportam em mesh toda triangulada: `polyTriangulate` no Maya com arestas
  controladas ANTES do bind; triangulacao do exporter = smoothing aleatorio. Matrizes
  nao-ortogonais sao dropadas — freeze/rebuild hierarchy.
- `mayaUSDExport` defaults sao armadilha: `frameRange` [1,1], `defaultMeshScheme` catmullClark
  (sem normals — passar `none` + normals), skeletons off, namespaces mantidos. `-parentScope`
  deprecado por `-rootPrim`; MaterialX e material target default em installs novos.
- Batch: um `mayapy` por arquivo (settings de FBX e optionVars sobrevivem `file(new=True)`);
  filhos com `MAYA_DISABLE_ADP=1`; preflight inclui resolucao de localhost/hostname (batch render
  no macOS trava sem isso).
- Referencias: edits replay por nome e DAG path — nunca renomear/reestruturar arquivo filho
  publicado; checar health (unloaded, missing, failed edits) antes de fixar e apos swap.
- Engine contract: cm = unidade Unreal; Y-up na cena Maya mesmo para engine Z-up (FBX converte);
  `UCX_`/`UBX_`/`USP_`/`UCP_` + `_00` colisao Unreal; `SOCKET_<mesh>_##`; Unity 4 influencias,
  humanoid 15+ bones T-pose; E27 = frame rate bate com o alvo.
- Auto-fix so o seguro: history, smooth_preview, unknown nodes, namespaces. N-gons, non-manifold,
  simetria, units, orientacao de joints = reportar, nunca consertar. Locked normals apos
  FBX/OBJ import = `unlock` antes de riggear.

## Armadilhas

- **2026/2027 renames**: `addDoubleLinear`/`multiplyDoubleLinear`/`pointMatrixMult` viraram
  `addDL`/`multiplyDL`/`pointMatrixMultDL`; nomes `power` etc. criam nos sem unidade.
- **Flags removidas**: `getAttr(noEvaluation=)`, `attributeQuery(computeModifies=)`; todas as
  keys = `cutKey(time=(None, None))`.
- **PySide6 only** — sem fallback PySide2 (crashava 2027.0). `dockControl` morreu:
  `workspaceControl`. PyMEL nao bundled.
- **Color**: OCIO v2, ACEScg; input default `sRGB Encoded Rec.709 (sRGB)` desde 2026.2; nomes de
  espaco variam — query, nunca hardcode; regerar .tx ao mudar rendering space.
- **commandPort**: 4 KB buffer, MEL default, sem auth — bridge por arquivos e so localhost.
- **Nucleus/Bifrost em metros** numa cena cm: Space Scale 0.01 ou o sim e de um gigante.
- **Skin Tools layers** bloqueiam as ferramentas classicas de peso ate `Delete Skin Layers`.
- **`file(new=True)` nao reseta** FBX optionVars nem o acumulador de takes — um mayapy por arquivo.
- **Undo**: escritas OM2 fora da fila; misturar delete OM2 em no cmds = undo corrompido.
- **Smooth Mesh Preview ligado ao salvar** + iteracoes Arnold = render 4x+ mais lento por nivel.
- **`ls`/`listRelatives`/`listConnections` devolvem None**, nao lista vazia: sempre `or []`.
- **Orient Joint** falha em silencio com rotacoes presentes ou sem filho.
- **Alembic Ogawa only**; `AbcExport -j` splita em espacos — exportar por path sem espaco.
- **Batch render no macOS** trava se localhost/hostname nao resolve — preflight obrigatorio.
- **Sem modal nunca** (`confirmDialog`, `input()`, `pdb`): trava main thread e a bridge.
- **`maya -render` obsoleto**: `Render -r <renderer>`; GPU Override 2027.2 crasha scrubando.
