# Unreal Engine — Producao de conteudo (materiais, lighting, mundo, VFX, cine, pipeline)

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Como dirigir o Unreal
Engine 5 instalado (alvo: 5.8) via Editor Python, `UnrealEditor-Cmd` headless, Unreal MCP da Epic,
Remote Control API e comandos de console. Sem Unreal instalada, ignorar este arquivo. Codigo de
gameplay C++ fica em `unreal-cpp.md`; aqui e o lado de conteudo e tooling.

## Detectar instalacao

Primeira acao antes de qualquer coisa: achar engine e projeto.

- **macOS (Launcher):** `/Users/Shared/Epic Games/UE_5.8/Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor`
- **macOS source build:** `<repo>/Engine/Binaries/Mac/UnrealEditor` (mesmo `.app`)
- **Windows:** `C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe` e `UnrealEditor-Cmd.exe`
- **Linux:** `~/UnrealEngine/Engine/Binaries/Linux/UnrealEditor` (so source build)
- Versao: `UnrealEditor -version` ou ler `Engine/Build/Build.version` (`"MajorVersion": 5, "MinorVersion": 8`).
- `-Cmd` no Mac: nao existe binario separado; usar o `UnrealEditor` do `.app` com `-run=` (o
  exemplo de batch da Epic no Mac faz exatamente isso).
- UAT: `Engine/Build/BatchFiles/RunUAT.sh` (Mac/Linux), `RunUAT.bat` (Windows).
- Projeto: arquivo `.uproject` (JSON). Listar plugins declarados nele; checar `Config/DefaultEngine.ini`.
- Editor ja rodando com o projeto aberto: `ps aux | grep UnrealEditor` — decide o canal (o editor
  segura write lock nos assets carregados; job headless que salva nao pode tocar esse projeto).
- MCP: plugin `ModelContextProtocol` (Experimental) no projeto; servidor em `127.0.0.1:8000/mcp`.
- Remote Control: `curl http://127.0.0.1:30010/remote/info` — responde so se `WebControl.StartServer` ja rodou.
- Mac: Apple Silicon obrigatorio (renderizacao em Intel removida na 5.8). Nanite e VSM Beta em M2+;
  Lumen HWRT e MegaLights Experimental em M2+; path tracing pede macOS 26.4+.
- Xcode para projetos C++: Epic lista 26.0 minimo, 26.1.1 recomendado, 26.4 incompativel — versoes
  fora da lista exigem um build de teste antes de prometer toolchain.

## Como dirigir

Cinco canais; escolher pelo trabalho, nunca misturar chamadas MCP paralelas (rodam serial na game thread).

| Canal | Quando usar |
| ----- | ----------- |
| **Editor Python no editor aberto** | loops, auditorias, screenshots, tudo que os toolsets nao cobrem. Habilitar Python Remote Execution (Project Settings > Plugins > Python). API `unreal` completa; o editor ticka entre chamadas. |
| **Unreal MCP da Epic** (plugin `ModelContextProtocol`) | edicoes estruturadas cobertas pelos toolsets (actors, scene, material instances, Sequencer, PCG, UMG, animation). Habilitar plugin + **All Toolsets** (+ Editor Toolset, que a doc omite). Start: `-ModelContextProtocolStartServer -ModelContextProtocolPort=8000` ou console `ModelContextProtocol.StartServer`; `ModelContextProtocol.GenerateClientConfig ClaudeCode` escreve `.mcp.json`. So HTTP/SSE, sem auth, loopback only. Editor primeiro, agente depois. `describe_toolset` pode vir gigante (Niagara ~250k tokens) — descrever so o toolset necessario. |
| **Commandlet headless** | auditorias, imports em massa, validacao, CI — quando nenhum editor tem o projeto aberto: `UnrealEditor-Cmd <uproject> -run=pythonscript -script=<arquivo.py>`. Nao carrega level (adicionar `map=` se precisar), menos modulos, sem render. Esperar o Asset Registry: `unreal.AssetRegistryHelpers.get_asset_registry().wait_for_completion()`. Veredito e a linha de resultado do proprio job no log, **nunca o exit code**. |
| **Editor completo, um tiro** | jobs que precisam de todos os modulos: `-ExecutePythonScript=<script>` (desliga logo apos; nada ticka). Adicionar `-ScriptErrorsAreFatal` (5.5+) para script falho derrubar o processo. Screenshots/renders sem editor aberto: boot latente com ticker que espera warm-up e sai. |
| **Remote Control API** (`127.0.0.1:30010` HTTP, `30020` WS) | writes de propriedades em lote em objetos conhecidos, presets live, builds `-game`. Off ate `WebControl.StartServer`. Nomes C++ (`bSweep`), so propriedades EditAnywhere publicas, `WRITE_TRANSACTION_ACCESS` para undo. |

- **Console/cvars** de Python: `unreal.SystemLibrary.execute_console_command(world, cmd)`; no
  launch `-DPCVars=` (antes do init, sobrepoe cvars read-only) — nao `-ExecCmds`. Restaurar o que
  mudou.
- **UAT / commandlets:** `RunUAT BuildCookRun -project=<uproject> -build -cook -stage -package -platform=Mac -clientconfig=Development`;
  `ResavePackages -fixupredirects`; `WorldPartitionBuilderCommandlet`; `-run=DataValidation`.
- **Regra do Details panel:** `set_editor_property` (rebuilda como a UI); atribuicao direta nao
  rebuilda nada. Uma chamada = uma transacao nomeada; saves explicitos.
- **Prova por captura:** nunca declarar level, material, shot ou build pronto sem numeros e um
  frame olhado. Screenshot via `AutomationLibrary.take_high_res_screenshot` ou `HighResShot 1920x1080`;
  checar histograma (frame todo branco/preto = falha). Fechar relatorio com **Verified** (o que
  rodou + linha de log/frame que prova) e **Assumed** (nao rodado na engine).
- **API moderna:** `EditorLevelLibrary`/`EditorAssetLibrary` sao pre-5.x. Usar subsistemas:
  `unreal.get_editor_subsystem(unreal.EditorActorSubsystem)`, `LevelEditorSubsystem`,
  `UnrealEditorSubsystem`, `EditorAssetSubsystem`, `StaticMeshEditorSubsystem`. Os proprios samples
  da Epic 5.8 ainda usam os nomes antigos.
- Unidades: centimetros, Z-up. Python embutido: 3.11.8.
- Substitutos para o que nao e scriptavel: Blueprint graphs (C++ + data-only Blueprints filhos,
  ou `unreal.BlueprintGraphEditor` 5.8 [verificar escopo]); material graphs (`MaterialEditingLibrary`
  parcial — alguns pins nao expostos); Niagara emitters (sem edicao por Python — templates +
  User parameters); sculpt/foliage paint/fracture manual (heightmap import, PCG, Dataflow, ou
  passo humano declarado).

## Materiais

- Few masters, muitas instances: o grafo e autorado uma vez (script ou template); tudo mais e
  instance, Custom Primitive Data e texturas com politica por papel.
- **Permutacoes = usage flags x conjuntos unicos de static parameters entre instances** — nao
  contagem de nodes. Flags no parent adicionam uma linha de shader para cada filho unico; parents
  carregam o minimo, instances optam (Usage Flag Overrides na 5.8).
- Static switch so para gatear texture samples ou matematica pesada; o resto e `If`, scalar bound
  a Enum ou Channel Mask Parameter (Static Component Mask Parameter obsoleto).
- **Instruction count nao e custo:** um fetch ~200 ciclos, sine ~20; matematica independente do
  fetch esconde dentro da espera. Medir em ms com camera fixa, nao contar instrucoes.
- **Substrate:** um Slab (ou helper Metalness) por material, nunca node Substrate Shading Model
  a mao. Blendable = teto para todas as plataformas; Adaptive cai por plataforma sozinha e custa
  20-80 B/px de GBuffer (+~15% cook, forca DBuffer decals). Converter para Substrate e one-way.
- Metal do lado de tinta = dois slabs com Horizontal Blend (parameter-blended), nao metallic cinza
  (le como gesso).
- Texturas: 2K teto de jogo, compressao por papel, sRGB so em cor, ORM packed nunca como Normalmap,
  BC7 para canais nao relacionados. Verdade de memoria: `listtextures` em cooked build.
- RVT e cache ortografico capturado no tempo 0: sem Time, Panner, camera distance ou MPC no write pass.
- Vidro e materia, nao opacity: Colored Transmittance so quando tingido, Pixel Normal Offset para
  panos planos, slab Simple Volume com Transmittance-To-MFP.
- Numeros: Specular 0.5 = F0 0.04 (90-98% dos nao-metais); dieletrico F0 <= 0.08; metal albedo 0
  com F0 >= 0.5; base color sRGB 20-240 (min 50 com roughness); vidro IOR 1.5.
- Flags erradas: decal/UI/Niagara-only com `Used with Static Mesh` ligado compila shaders a toa;
  auto usage off; flags nas instances.

## Lighting e rendering (Lumen, MegaLights, path tracer)

- **Camera antes de luzes.** Auto exposure padrao "achata" tudo: sol de 100k lux e lampada de 10
  lux parecem iguais. Chrome ball no sujeito, Exposure Compensation 0, Min/Max EV100 clampados as
  condicoes, depois luzes. Julgar pela exposure de Game Settings, nunca pelo override EV100 do viewport.
- **Valores fisicos primeiro, cheats listados depois.** Lumens reais removem ~80% do flicker do
  Lumen; albedo e lighting (<= 0.8, floor 0.02); toda luz tem fixture visivel e source com a forma
  dela. Sol = 120.000 lux no zenite; lua 0.26 lux. EV100 alvos: sol 14, nublado 10, interior 4,
  luar 1.
- **Emissive e o look, luzes fazem a iluminacao.** Neon: rect light encaixada na face, a frente;
  emissive pequeno e ruidoso e clampado desde 5.6 (`r.Lumen.ScreenProbeGather.MaxRayIntensity` 10).
- **O renderer ve um proxy — olhar para ele:** Lumen Scene/Surface Cache (preto = so screen traces,
  rosa = sem mesh cards — frequentemente um quarto de uma mesh so), mismatch view do MegaLights,
  cached pages do VSM.
- **MegaLights: ruido e amostra roubada, nao contagem de luz.** Luzes escondidas comem ate 20% das
  amostras; o sol ate 50% — sol fica em deferred + VSM. Radius apertado, cones, barn doors, nada de
  luz dentro de geometria. Alpha masks sao ignorados pelo ray tracing dele por padrao.
- **Shadow method segue o que se move:** luzes locais ray-traced em gameplay (personagem cruzando
  VSM local invalida pages todo frame); VSM para o sol.
- Interior escuro = problema de tone mapper primeiro: Toe 0.55 -> 0.3, Local Exposure Shadow
  Contrast 0.6, depois a escada (direct, indirect boost de uma luz, Diffuse Color Boost, exposure
  global por ultimo).
- Still: path tracer e ground truth; amostras sao seu unico knob de qualidade (256 draft a 1024+
  spatial, 1 temporal; vidro 10 bounces). No deferred, amostras compram so motion blur e AA.
- Lumen GI + reflections ~4 ms a 60 fps; ler como delta do frame com Lumen off.

## World building

- Comecar do template: File > New Level > **Open World** da World Partition + OFPA + Data Layers +
  HLOD + lighting externo. Um runtime grid so; WP + OFPA desde o dia um (Subnautica 2: 100k actors).
- Colocacao por tier: heroes e areas-chave a mao; arbustos/arvores/rochas pre-baked; so detalhe
  classe grama gerado em runtime na GPU. Colisao e visibilidade distante forcam placement persistente.
- **PCG e autorado como materiais:** template graphs com parametros, Graph Instances por uso,
  `Is Partitioned` praticamente obrigatorio. Output herda Data Layer e HLOD Layer do actor PCG —
  atribuir **antes** de gerar. Grids: unbounded p/ parametros, 128 m p/ landscape reads, 32 m p/
  scatter. Pop-in e latencia de geracao — julgar em Test build.
- **Landscape e dimensionado, nao escolhido:** tamanhos validos 2017/4033 (nunca 2048), max 1024
  components, 2x2 sections, edit layers obrigatorios. Z scale e actor Z vem do range exportado
  (`Z = span_cm / 512`, actor no midpoint) — nunca do relief declarado; gate: 0 pixels clipados.
  Material: base layer LB Alpha Blend, Layer Info com o mesmo nome por layer, triplanar so no layer
  ingreme.
- **Nanite por padrao, mas construcao importa:** kitbash poroso, hard-edge splits e seams matam a
  simplificacao (250 MB vs 12 MB, mesmo look). Distance culling nao aplica em Nanite. Tessellation
  sem colisao: center 0.5 no chao, 1 em rocha vertical; dicing rate 2.
- Estrutura de streaming segue o conteudo: um HLOD layer por familia (Instancing p/ foliage, Merged
  p/ predios, Simplified se merged pesar); Level Instance quando gameplay muda o conteudo, Packed
  Level Actor para sets estaticos; Runtime Data Layers so para estado de gameplay.
- Trabalho em escala de mundo e scripted e regional: nunca Outliner select-all; builders geram,
  depois HLODs; conteudo regenerado por builder fica fora de changelists.
- Grama runtime: dois aneis (denso ate 128 m em cells de 32 m, esparso ate 256 m em cells de 128 m,
  borda recolorida); `pcg.FrameTime` default 5 ms.

## VFX (Niagara e Chaos)

- **Python nao edita emitters/modules (5.8):** trabalhar via templates com contrato de `User.*`
  parameters, Material Instances, Effect Types e recipes Dataflow; edicoes de grafo viram pedidos
  GUI precisos.
- **Verdade de gameplay primeiro:** a borda mais forte fica na fronteira de colisao e le o numero
  do jogo (`User.Radius` = raio de dano — nunca constante casada a mao).
- Contraste e budget de tela: nucleo quase-branco nunca branco puro; saturacao na franja. Branco
  inesperado = duplicatas additive empilhadas — contar spawns antes de mexer em cor.
- Timing e historia: antecipacao montada na animacao de cast; build-up para de spawnar no hit;
  flash pica no frame do hit; dissipacao menor que build-up. Projetil rapido e redondo estroba:
  esticar ao longo da velocidade, motion blur na textura.
- **Otimizar o mundo, nao o efeito:** Effect Type em todo sistema (Lyra: 227 -> 103 sistemas
  ativos, RT 5.07 -> 1.51 ms). Um Effect Type por sistema, nunca por emitter; secundarios com
  Scalability Mode Self. Ler GT, GT Concurrent e RT separado no core count alvo. Distance culling
  para o tick, nao o render; todo sistema GPU paga dispatch RT mesmo invisivel.
- Spawn por classe: pooling para one-shots moderados (Manual Release = Release to Pool), Niagara
  Data Channel listener para spam, stateless emitters para bursts simples (footsteps GT 1387 -> 271 us).
- **Destruicao custa corpos ativos e contatos:** ordem de fix — rendering (Nanite no GC, root proxy
  com ISM renderer), contagem/lifetime de corpos (clusters, Remove on Break, Tiny Geo), colisao
  (one-way debris, um convex por cluster, boxes < 0.3), throttles por ultimo.
- Projeteis quebram com strain, nao fields: Apply External Strain + Apply Breaking Linear Velocity
  proporcional a velocidade, sem falloff. Um modelo de dano so (Material Strength/Connectivity ou
  thresholds por level). Densidade pedra = 2 g/cm3, 2000 e erro de unidade.
- Budget referencia: todo Niagara <= ~2 ms GT+GT Concurrent e 1.5 ms RT no min spec.

## Cinematica (Sequencer e Movie Render Graph)

- **O master e um edit; shots possuem o conteudo.** Cameras/personagens/keys dentro de shots,
  subsequences por disciplina (`_LGT` etc.); spawnables por-shot, set possessable. Duplicar master
  compartilha shots — experimentar com New Take.
- Timing travado antes de animar: board com keys constantes, musica em track propria, stingers nos
  cortes.
- Warm-up tem tres causas: CPU idle -> Engine Warm Up Count > 30; historico temporal -> Render
  Warm Up; coisa se movendo no frame 1 -> pre-roll + camera-cut warm-up (avalia o lead-in).
  **End frames sao exclusivos: 0-50 renderiza 0-49.**
- Amostras compram motion blur e AA, nada mais: ruido volta para a fonte (luz/PPV). Temporal so,
  contagens impares com Frame Center (15-31 cobre 95-98%); AA None acima de 8 amostras.
- Grade fora, de EXR linear: tone curve off = linear sRGB, ~1 stop mais escuro que o viewport (a
  curva da UE e "ACES-flavored", nao ACES). Resolve: tone curve on -> sRGB (Linear) p/ sRGB Texture;
  off -> Linear sRGB p/ sRGB. Trabalhar com o OCIO Display do viewport no view da grade.
- **O shot e a unidade de render:** um job por corte, um template graph, variaveis por job — nunca
  editar o graph compartilhado. Multi-shot unattended pede farm manager (crash no MRQ perde a fila);
  render CLI sempre com `-notexturestreaming`.
- MRG na 5.8 e Production Ready; features novas so no graph; presets MRQ legacy; fila default
  "Basic"; `MoviePipelinePrimaryConfig` (nao Master); jobs de graph usam `set_graph_preset()`.
- Spawnables via `LevelSequenceEditorSubsystem.add_spawnable_from_class`; nao existe `add_master_track`;
  funcoes de tempo tomam `MovieSceneTimeUnit`.

## Animacao

- Transfer mais barata primeiro: mesmo esqueleto > esqueletos compativeis > Copy Pose From Mesh /
  Leader Pose > IK Retargeter. Retarget: pose nomeada nova (nunca Default) com auto align, snap to
  ground, leve bend em joelho/cotovelo; Scale Source no topo do stack; Blend to Source no leg IK ou
  pes afundam; retargeters auto-exportados vem com IK off. Pinar IK helper bones (`ik_foot_l/r`,
  `ik_hand_gun`).
- **Modelo de movimento antes de animar:** tunar velocidades/aceleracao/braking da capsule com
  animacao rascunho ate jogar bem, exportar a trajetoria, animar o root frame-exato com o peito
  (nao quadril), paradas de 5 frames.
- Motion matching = dados sob controle do designer: databases separados por estado, Chooser com
  enums cacheados, interromper so quando estado core muda no frame, root motion ligado em todo clip
  de locomocao. Sets minimos: 13 clips base, 26 com strafe, 60-80 com estados.
- AnimBP fora da game thread: thread-safe update, Property Access, fast path em todo node.
  Root Motion from Everything E from Montages Only rodam o AnimGraph na game thread — Montages
  Only e escolha de networking, nao de custo; sem montage root-motion, No Root Motion Extraction.
- Limpar na fonte: strip de twist/face/deformation tracks e helper curves cortou 71% storage/90%
  memoria num clip. `Only Tick Pose When Rendered` default; budget allocator OU URO, nunca os dois;
  um LOD Settings asset com histerese.
- Control Rig: Construction cacheia, Forwards Solve por frame; FBIK ajusta pose, nao cria;
  Backwards Solve torna o rig bakeable.
- MetaHuman: nunca shippar tier cinematico (~800 MB cooked vs ~60 MB Optimized High); LODs a partir
  de LOD 2; face MetaHuman Animator roda no macOS, body e Windows-only.

## Pipeline e automacao (import, validacao, cook)

- **Politica de import e um asset passado, nunca memoria de dialog:** duplicar o pipeline generico
  para o projeto, setar todas as opcoes, passar em `override_pipelines`. Ordem do stack e ordem de
  execucao. Filtrar em factory-node (sem materiais orfaos); tirar Graph Inspector do stack (popup
  no meio do batch). Asset gruda o stack — mudanca de politica so alcanca assets via reimport com preset.
- **Nomes vem do plano, nao do importer:** Interchange ignora `AssetImportTask.destination_name`
  (5.8); estagiar cada arquivo com o nome alvo; rename deixa redirector (e Zen loader ignora core
  redirects). Reimportar, nao importar de novo (duplicata).
- **Nanite por elegibilidade, nao por triangulos:** opaque/masked static meshes em target Nanite
  ligam Nanite, low-poly incluso; off em translucency (desenha material default), morph targets e
  targets sem Nanite. Fallback settings em toda mesh Nanite; colisao simples ainda obrigatoria.
- Validacao e codigo no ponto de criacao: `k2_can_validate_asset`/`k2_validate_loaded_asset`,
  sempre `asset_passes` no sucesso; validators Python se registram a cada sessao; `-run=DataValidation`
  roda so regras C++; cook sem `-ValidationErrorsAreFatal` vira warning.
- Headless para bulk, editor aberto para o que ele segura; sem confiar em exit code — o veredito e
  a linha de resultado do job. `set_editor_property` sim; imports nao tem undo (snapshot antes).
- Listar-alvo, confirmar, agir; uma passada por mesh (Nanite + LODs + colisao, save por chunk de ~25
  com `collect_garbage()` entre chunks). LOD group pode nao gerar LODs — contar depois de setar.
- Build = linha de comando reproduzivel provada por boot: gerar a linha BuildCookRun de um perfil
  do Project Launcher e diffar; `-skipcook` nao e omitir `-cook`; mesma linha local e CI; bootar
  (`UE.BootTest` no Gauntlet).
- Unidades: 1 uu = 1 cm, FBX 2020.2, colisao `UCX_/UBX_/UCP_/USP_` + nome da mesh, texturas max 8192
  power-of-two.

## Performance

- **ms por estagio, nao fps:** a 60 fps game thread, render thread e GPU tem 16.67 ms cada (33.3 a
  30), pipeline game N / render N-1 / GPU N-2. `stat unit` classifica o bound; Insights diz onde na
  CPU; captura GPU explica GPU; sampling profiler quando a instrumentacao acaba (Mac: Instruments
  Time Profiler — Insights nao lista memory callstacks nem ContextSwitch).
- **Captura honesta antes de qualquer fix:** build Test/Development cooked no hardware alvo, rota
  fixa; dynres travada (75%) e async compute off so para atribuir passes, nunca para a prova.
  `-NoVerifyGC` e `-handleensurepercent=0` tiram hitches falsos de Development. Captura lean para
  "estamos no budget", rich (`-statnamedevents`, ~20% overhead) para "por que".
- A barra mais longa costuma ser espera: excluir markers idle/wait/frame-sync e seguir a
  dependencia ate a thread que trabalha.
- **Scalability Epic e o modo 30 fps:** High (2) e o nivel de 60 fps; nada ativa o device profile
  de 60 fps a nao ser que voce o construa. `sg.ResolutionQuality` e percentual (2 = 2%, nao nivel 2).
  Cadeia de resolucao (dynres 800p->1080p, TSR p/ 1440p, upscale espacial p/ 4K) e a maior alavanca.
- Vitorias grandes sao content settings: complex collision em tudo (Use Simple as Complex desde o
  dia um), overlaps em load, translucency After DOF em full res, DF shadows ao lado de VSM, PDO/WPO
  foliage pagando 3x, luzes locais shadowed sobrepostas, props deixados Movable (~20% drop com ~1000
  meshes).
- **Hitches sao passe proprio:** centenas de ms e quase certeza blocking load (validator proibe);
  GC segue a contagem de UObjects (<500k bom, >1M errado); spawns nao sao incrementais (1 actor
  complexo por frame); camera cuts perdem historico de oclusao (`r.Nanite.PrimeHZB`); PC e Mac
  testam PSO a frio, consoles nao tem hitch de PSO em runtime.
- Fix no conteudo antes de band-aid; uma mudanca por medicao; prova com 3 runs mesma rota/build;
  parity por screenshot da mesma camera.

## Gameplay (resumo — C++ em `unreal-cpp.md`)

- Dados por lifetime e presenca de rede: GameMode so servidor; GameState/PlayerState replicam;
  PlayerController so dono; GameInstance subsystems sobrevivem mapas. Estado em replicated property
  com RepNotify, nunca multicast. BeginPlay pode rodar varias vezes sob World Partition — idempotente.
- Base C++ + Blueprint data-only filho; Blueprint depende de C++, nunca o reverso. Custo de
  Blueprint nao e por node — e hard references (cast para classe Blueprint a carrega junto).
- GAS: effects sao o "que", abilities o "quando"; sempre End Ability; `PlayMontageAndWait`; Wait
  Delay, nao Delay; ASC no pawn (ou PlayerState se atributos sobrevivem respawn); `InitAbilityActorInfo`
  server em `PossessedBy`, cliente em `AcknowledgePossession`/`OnRep_PlayerState`.
- StateTree: seleciona folha antes de transicionar; enter conditions so re-checadas quando uma
  transicao pede — toda condicao que deve encerrar estado precisa de evento ou transicao.
- UI por eventos, nunca property binding; Global Invalidation on e cacar widgets congelados;
  Hidden vs Collapsed (Collapsed relayouta).
- Grafos (event graphs, GE modifiers, StateTree states, BT nodes) vao por templates duplicados,
  toolsets MCP, `BlueprintGraphEditor` (5.8) ou um passe GUI preciso — nao fingir autoria de grafo.

## Armadilhas

Cortantes e traps 5.8:

- **Editor segura write lock:** job headless que salva nao pode tocar projeto aberto noutro editor —
  rodar dentro dele (MCP/PythonRemote) ou fechar antes. `load_level` descarta mudancas nao salvas.
- **`delete_asset`/`delete_loaded_asset` sao force-delete:** sem checagem de referencia, fecham
  editors, podem limpar undo. `get_all_level_actors` retorna so actors carregados (cells WP fora
  ficam invisiveis).
- **Substrate depende da idade do projeto:** on por padrao em projetos criados na 5.7+; upgrades
  ficam legacy ate opt-in. Material Substrate com `r.Substrate` off renderiza preto; Slab nao tem
  pin Metallic; conversao one-way. Ler o ini antes de autorar.
- **Remote Control 5.8 desliga chamadas UFUNCTION remotas por padrao** (allow list nas project
  settings) — todo exemplo `/remote/object/call` de 2022 falha num projeto 5.8 novo. Servidor off
  ate `WebControl.StartServer`; loopback so — abrir `DefaultBindAddress` para LAN provavelmente
  expoe tambem o MCP sem auth.
- **MRG renomeou tudo:** `MoviePipelineMasterConfig` -> `MoviePipelinePrimaryConfig`; jobs de graph
  com `get_graph_preset()`/`set_graph_preset()`; executor PIE tem que ficar referenciado global
  (GC no meio do render); Execute Script node precisa de modo "Editor Only" para Python. End frames
  exclusivos. Node H.264 e Windows-only (Mac: ffmpeg; ProRes [verificar]).
- **Game Overrides invisiveis:** configs MRQ legacy aplicam mesmo sem o setting adicionado; em MRG
  so com o node conectado. Render diferente do viewport -> Global Game Overrides primeiro.
- **Rendering defaults mudam por heranca:** projetos convertidos de UE4/5.x velhas carregam settings
  antigas — ler `r.DynamicGlobalIlluminationMethod`, `r.ReflectionMethod`, `r.Shadow.Virtual.Enable`,
  `r.Substrate` antes de planejar. `r.AllowStaticLighting=False` desde 5.5 (passos "Build Lighting"
  de tutorial UE4 nao aplicam). SSGI deprecated 5.8; RTGI morto desde 5.4.
- **Warning de exposure range (5.8):** `r.EyeAdaptation.CachedLightingPreExposure` unificou
  pre-exposure; o editor mostra aviso on-screen quando exposure sai do range suportado — checar apos
  todo render/screenshot e grep o log.
- **Cvars deprecated viram ensure/warn/assert na 5.8:** nunca setar cvar de memoria; ler a lista por
  dominio. `-DPCVars=` no launch, nao `-ExecCmds`.
- **Commandlet nao confia em exit code:** Python failure so loga erro sem `-ScriptErrorsAreFatal`
  (5.5+); o veredito e a linha de resultado do proprio job. Asset Registry pode ainda estar
  scanneando no boot: `wait_for_completion()` antes de queries.
- **Mac so Metal:** tips/cvars DX11, DX12, Vulkan nao aplicam; RenderDoc nao suporta Metal (Xcode
  Metal debugger); docs mostram paths Windows e Ctrl — traduzir. Path sem espacos para o projeto.
- **Rotator posicional e roll, pitch, yaw** — passar keywords.
- **Niagara:** sem edicao de emitter/module por Python/MCP pratico; Effect Type por sistema, nunca
  por emitter; budget so em tipos nao-criticos com decay damping (`fx.Budget.AdjustedUsageDecayRate`)
  ou oscila cull-respawn.
- **Imports nao tem undo** (snapshot antes); `destination_name` ignorado sob Interchange; `ResavePackages`
  precisa `-autocheckout` sob Perforce; changelists OFPA se submetem de dentro do editor — submits
  parciais deixam referencias penduradas.
- **Cook no editor morre na 5.9:** usar CookCommandlet/UAT. Zen e store default de cooked output
  em 5.8 (`LimitProcessLifetime=false` para CI). In-editor cook removido.
- **Cook frio nao prova PSO:** PC/Mac testam PSO stutter a frio (`-clearPSODriverCache`); consoles
  nao tem hitch de PSO runtime. `sg.ResolutionQuality` e percentual.
- **5.8 assorted:** `landscape.ForceLayersFullUpdate` substitui `ForceLayersUpdate`; edit layers de
  landscape obrigatorios (5.7); MegaLights Production Ready (sol fora, salvo `r.MegaLights.DirectionalLights 1`);
  Lumen Lite Beta no Medium; `r.HeterogeneousVolumes.Allow` novo; `snapshothitches -start` +
  TraceQuery JSONL; `BlueprintGraphEditor` abre grafos a Python [verificar escopo]; `Automation RunTest`
  (nao `RunTests`); `-nullrhi` nao serve para screenshots (frames pretos); `unreal.Rotator` ordem
  roll/pitch/yaw; Python 3.11.8 (samples com Python 2 quebram).
