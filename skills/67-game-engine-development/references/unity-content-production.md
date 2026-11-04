# Unity — Producao de Conteudo e Direcao do Editor

Destilado do pack `scenario-labs/skills` (MIT, 14 skills `scenario-unity-*`), adaptado ao nosso
stack. Como dirigir Unity instalada via batch mode (`-batchmode -executeMethod`), Unity CLI +
`com.unity.pipeline`, MCP e Test Framework. Sem Unity instalada, ignorar este arquivo. Alvo:
Unity 6000.3.21f1 (6.3 LTS), URP 17.3, macOS Apple Silicon. Padroes MonoBehaviour/arquitetura:
ver `unity-patterns.md` — aqui so conteudo e ferramental.

## Detectar instalacao

- Editor instalado via Unity Hub (nao Unity solta). Caminhos do binario:
  - macOS: `/Applications/Unity/Hub/Editor/<versao>/Unity.app/Contents/MacOS/Unity`
  - Windows: `C:\Program Files\Unity\Hub\Editor\<versao>\Editor\Unity.exe`
  - Linux: `~/Unity/Hub/Editor/<versao>/Editor/Unity`
- Listar versoes: `ls "/Applications/Unity/Hub/Editor"` (mac). Modulos de plataforma (Android, iOS,
  Web) ficam em `<versao>/PlaybackEngines/` — sem o modulo, nao ha build target.
- Hub: `/Applications/Unity Hub.app` (mac), `Unity Hub` no PATH (linux). Versao do projeto:
  `ProjectSettings/ProjectVersion.txt`.
- Licenca: Personal ativa so via sign-in no Hub e expira ~30 dias offline. Linha de recusa real:
  `No valid Unity Editor license found` — `Access token is unavailable` e alarme falso.
- Unity CLI (beta, package `com.unity.pipeline`): `unity --version`; `unity test` / `unity build`.
  Exit codes do `unity test`: 0 passou, 8 falhou (nunca retry), 6 sem veredito (retry). Bloqueado
  por Safe Mode e por sandbox.
- Log do editor: `~/Library/Logs/Unity/Editor.log` (mac), `%LOCALAPPDATA%\Unity\Editor.log` (win).
  Lock: um editor por projeto — `Temp/UnityLockfile` indica editor aberto; batch job no mesmo
  projeto e recusado ou corrompe a Library.

## Como dirigir

- **Batch job** (canal padrao, nenhum editor aberto; 6-13 s por job incluindo boot):
  `Unity -batchmode -nographics -quit -projectPath <P> -logFile <log> -executeMethod <Ns.Classe.Metodo>`
  - Job C# static publico (editor asmdef) escreve o resultado; args por arquivo ou arg de string.
    Editor que trava apos o resultado: matar por PID, nunca por nome. `-nographics` por padrao;
    NUNCA para captures, bakes de luz ou profiling — sem GPU device.
- **Plataforma fixa no lancamento**: `-buildTarget <Target>` (e `-activeBuildProfile <nome>` no 6.3)
  na linha de comando. Trocar target dentro de um job batch silenciosamente nao faz nada — um
  processo por target, mesmo target em TODOS os estagios (senao cada estagio reimporta texturas).
- **Test Framework**: `-batchmode -projectPath <P> -runTests -testPlatform EditMode|PlayMode
  -testResults <saida.xml>`. NUNCA `-runTests` com `-quit` — sai sem XML nem veredito. NUnit XML:
  `failed == 0` e `total > 0`. Qualquer `Debug.LogError` nao-esperado falha teste: `LogAssert.Expect`.
- **Builds por linha de comando**: `-executeMethod` chamando `BuildPipeline.BuildPlayer`, ou
  `-activeBuildProfile` + metodo de build no 6.3 (Build Profiles substituem Build Settings; nao ha
  API publica pra criar profile antes do 6.5 — copiar de template commitado). Medir tamanho da
  pasta shipada no disco, NUNCA `BuildReport.summary.totalSize` (inclui `*_DoNotShip`, da GB a mais).
- **Editor vivo**: se o usuario tem o projeto aberto, dirigir o editor GUI, nao abrir batch
  (lock!). Ponte: package `com.unity.pipeline` + Unity CLI — `eval` Roslyn roda C# no editor sem
  domain reload (0.03-0.15 s por call). Instalar o package ANTES de abrir o editor. Nao conectar nao
  prova editor fechado: descartar Safe Mode e sandbox primeiro.
- **MCP**: o MCP server do Unity AI Assistant esta DEPRECADO — usar Unity CLI; servidores
  comunitarios so se ja instalados e vetados.
- **Prova por captura**: todo resultado visual sai como PNG + checagem programatica (rejeitar
  all_white, all_black, uniform, magenta) e contact sheet aberta pelo agente. Mentiras conhecidas
  de capture em editor: materiais brancos no primeiro frame, 2D lights nao aquecidas, bind pose,
  Overlay UI nunca aparece em target de camera, metais pretos sem probe. Overlay UI: capturar via
  canvas Screen Space Camera em camera escondida; UI Toolkit via PanelSettings com targetTexture.
- **Edicao segura**: edits passam por serializacao — `SerializedObject`, `Undo.RecordObject` no
  COMPONENTE que muda (record `transform`, nao `gameObject`), `SetDirty` + `SaveAssets`. Nunca
  editar `.unity`/`.prefab`/`.asset` YAML na mao com editor aberto: fileIDs errados.

## 2D (sprites, tilemaps, luzes)

- Pixel perfect e pipeline: UM PPU em tudo (tile px = 1 unidade), Point filter, Compression None,
  pivots inteiros. Em URP usar `UnityEngine.Rendering.Universal.PixelPerfectCamera` — NUNCA
  `com.unity.2d.pixel-perfect` (do Built-in). Arte HD: `PPU = altura / (2 x orthoSize)`; referencia
  pixel 320x180, orto 5.625 @ 16 PPU.
- Sprite Atlas (V2 em 6.3): sob SRP Batcher corta TEXTURAS bound, nao Batches/SetPass. Uma pagina
  por grupo co-visivel; paginas pixel-art sem compressao (muda cor). Analisador: Window > Analysis
  > Sprite Atlas Analyzer.
- Luzes 2D: batches por intervalo de sorting layers contiguas — uma luz que pula uma layer quebra o
  batch e toda luz redesenha. Custo e fill rate: Fast em tier baixo, poucas shadow lights. Agent
  cria Light2D por script: setar shadow + `m_NormalMapQuality` via SerializedObject (read-only).
- Tilemap: `Tilemap.SetTiles`, `RuleTile.m_TilingRules`, reskin via `RuleOverrideTile` (nunca
  duplicar Rule Tile). Colliders: Composite + Merge + Outlines + Static. Seams: checar por captura.
- Sprite anim: exit time off, duration 0, Any State self-transition off; parametros vem do que o
  controller fez, nao do input. `Rigidbody2D.linearVelocity`/`bodyType`; `Physics2D.autoSyncTransforms` obsoleto.

## Animacao e Cameras

- Animator: camadas de baixo ganham; additive para na primeira Override; transicoes sao
  nao-interrompiveis por padrao (Ordered Interruption: so acima da rodando cortam). Blend tree:
  children nas `averageSpeed`/`averageAngularSpeed` MEDIDAS dos clips, nao 0/0.5/1; clamp do
  parametro aos extents senao a pose trava e o pe desliza.
- Root motion por clip e por eixo: idle bakeia Rotation+Y+XZ; locomocao reta bakeia Rotation+Y;
  clip que sobe (pulo) deixa Y unbaked com Based Upon Feet. Based Upon nunca causa drift — eixo
  bakeado tem delta zero. Um `CharacterController.Move(deltaPosition + y)` em `OnAnimatorMove`.
- Import automatico: `OnPreprocessModel`/`OnPreprocessAnimation`, `GetVersion()` bump a cada mudanca
  de regra, escopo por `assetPath` ou rules file (postprocessor sem escopo vira Humanoid em todo
  FBX). Nomes de take Mixamo sao todos "mixamo.com": papel vem do nome do ARQUIVO.
- Cinemachine 3 (`Unity.Cinemachine`, `CinemachineCamera`): pinar `com.unity.cinemachine@3.1.7` —
  manifest lista 2.10.7 mas `Client.Add` resolve 3.1.7 (observado). Um Brain; cameras em lados
  opostos precisam de blend hint CylindricalPosition (senao atravessam o alvo); `Priority` de script
  nao troca camera viva — `cam.Prioritize()`. Timeline ignora prioridade do Brain enquanto toca.
- Timeline: tracks para acoes continuas, markers para instantes, Signals sem payload; type-check em
  `OnNotify` (`if (n is MyMarker m)`). Markers nao disparam em scrub — testar em Play mode.
- Sampling sem janela: `Animator.Update` com step fixo, Culling Mode Always Animate (bind pose no
  capture batch senao). Rig constraints resolvem depth-first na ordem de irmaos: corpo antes de
  cabeca/mao. GUI-only: Animator window e Skinning Editor nao tem API — authoring via
  `AnimatorController`, `AvatarMask`, TimelineAsset; rigging fica humano.

## UI (uGUI e UI Toolkit)

- uGUI ainda e a recomendacao runtime em 6.3; a matriz decide: UI Toolkit so p/ data binding, USS
  transitions, layout flexivel, estilos globais, RTL/emoji, SVG; uGUI so p/ Animation Clips,
  Timeline, serialized events, authoring em Scene view. Custom shaders e world space: AMBOS tem.
- Canvas Scaler: referencia 1920x1080, Scale With Screen Size, Match 0.5 se duas orientacoes
  (Match 0 encolhe portrait pra 0.5625 com ref landscape). UI Toolkit escala LINEAR, uGUI em log
  space — mesmo Match da valor diferente; validar `panel_scale`.
- Canvas e a unidade de rebuild e batch: separar sub-canvases estatico vs por-frame; canvas nao
  batcheia com canvas (400 nameplates world-space = 400 batches). Esconder com `Canvas.enabled` +
  `CanvasGroup.interactable` (SetActive gera rebuild de mesh, botoes escondidos ficam navegaveis).
- Layout: preferred > min > 0; filho sem nada colapsa sob Control Child Size; Content Size Fitter so
  no topo; sem layout groups em UI por-frame. Sorting: uma tabela, ordens distintas (HUD 0, menus
  10, modal 20) — `Canvas.sortingOrder` e `PanelSettings.sortingOrder` competem na mesma escala;
  empate cai pra ordem de Hierarchy. Foco cruza sistemas: `element.Focus()` seleciona panel,
  `SetSelectedGameObject` desfoca ele.
- Fontes: fallbacks TMP NUNCA chegam a texto UI Toolkit (Panel Text Settings proprias) — gatear
  todo locale nos dois sistemas, `tryAdd` ligado. Efeitos de texto no material TMP, nao shadow
  components (28 -> 280 tri).
- Input: `InputSystemUIInputModule` apontando pra `InputSystem.actions` ou rebinds nao chegam a
  navegacao. `using UnityEngine.UI` + `UnityEngine.UIElements`: `Image`, `Button`, `Slider`
  ambiguos (CS0104) — alias.
- USS 6.3 tem parser estrito: UM erro -> StyleSheet vazio `importedWithErrors` (UI sem estilo,
  silencioso). `[GeneratePropertyBag]` exige tambem o atributo de assembly.

## VFX (Shuriken e VFX Graph)

- Escolha do sistema: Particle System para mobile/WebGL/controle por particula em C#/colisao
  fisica; VFX Graph so com compute (Android so subset high-end; Web so WebGPU experimental).
- Mobile: textura movendo sobre mesh vence nuvem de particulas (~90% dos efeitos shipped; max 100
  particulas/emitter). Overdraw machuca mais que draw call — medir fill por frame (layers/pixel,
  FSE), nao contagem de particulas.
- Um uber material por efeito (LUT ramp, erosion, fade) + variacao via Custom Data module e custom
  vertex streams — um material serve todas as variantes e SRP Batcher fica ligado. Stream order e
  contrato: shader sem o stream le zeros.
- Texturas VFX: Clamp, 256 tipico / 512 max mobile; data textures channel-packed com sRGB OFF (cinza
  0.5 le 0.21); LUT sem compressao. Vertex color em mesh de particula: `Color32`
  (`Mesh.SetColors(List<Color32>)`) — `Color` float da azul escuro flat; MeshRenderer nao tem o bug.
- 6.3: Shader Graph de particula PERDE GPU instancing em mesh particles silenciosamente (+69%).
  URP particle shaders nao castam sombra; flipbook blend sem motion vectors.
- VFX Graph e black box com API: copiar template, expor properties/events, dirigir por IDs
  cacheados; comandos deferred — `aliveParticleCount` le -1 ate o primeiro readback (~60 frames).
  Templates `01_Minimal_System`..`06_Firework` nao expoem nada.
- Seeds fixos so pra captura; `Random.InitState` novo no spawn ou todo tiro sai identico. Pool com
  Clear + Play em taxa alta de fogo; nunca Instantiate/Destroy por shot. Batch Play mode roda
  uncapped (~40k fps): fixar `Time.captureDeltaTime = 1f/60f` pra simular em tempo real.

## Shaders (URP / Shader Graph / HLSL)

- Texto primeiro: Shader Graph nao tem loops nem nodes de luz — HLSL e a rota primaria; graphs por
  template duplicado + `.hlsl` proprio atras de Custom Function nodes (File mode).
- Todo pass concorda: displacement e `clip()` tambem em ShadowCaster, DepthOnly e DepthNormals.
  DepthOnly faltando = objeto invisivel com Depth Priming. DepthNormals escreve normal RAW, nao
  `n*0.5+0.5` (SSAO e outline errados).
- Keywords do `Lit.shader` INSTALADO, nao do tutorial: 6.3 usa `_CLUSTER_LIGHT_LOOP` (nao
  `_FORWARD_PLUS`), quatro variantes de soft shadow. `LIGHT_LOOP_BEGIN` pula directionals — loop
  direcional proprio antes sob Forward+.
- Variantes sao budget contado APOS stripping: `shader_feature` pra toggle de material,
  `multi_compile` pra toggle C# runtime, `dynamic_branch` testado com `if()` nunca `#if`. Variant
  de `shader_feature` so embarca se material no build a ativa — NUNCA toggle via C# runtime (pink).
  Strict Shader Variant Matching antes de strip; Shader Build Settings (6.3) exclui/retypea
  keywords sem codigo.
- PSO warm-up: `GraphicsStateCollection` (experimental) tracada em development player, uma por
  graphics API, aquecida na loading screen. Prova: zero `Shader.CreateGPUProgram` em gameplay.
- Per-object value SRP-Batcher-friendly: `MeshRenderer`/`SkinnedMeshRenderer.SetShaderUserValue`
  (shader le `unity_RendererUserValue`); MaterialPropertyBlock quebra o SRP Batcher.
- Render Graph only em 6.3: `RecordRenderGraph` declara, nao grava; blit uma vez pra textura nova
  depois `cameraColor = destination`; nunca escrever no back buffer; injetar em After Rendering
  Post Processing (After Rendering = erro).
- Custo e ms de GPU, nao contagem de instrucao: `half` so paga onde device profiler mostra ALU-bound
  (desktop compila half como float).
- VolumeProfile solto em Assets/ (samples, testes) gera variantes de post que nenhuma cena usa —
  mover pra fora.

## Rendering e Lighting (URP, lightmaps, APV)

- Exposicao primeiro: URP 6.3 so tem Fixed exposure — resolver luzes a partir de um gray card 18%,
  um Post Exposure por zona, depois lights por razao.
- Shadow distance antes de resolucao: 1024 em 10m > 2048 em 40m. Max Distance = a sombra dinamica
  mais longe que o player ve.
- O asset que renderiza e o do Quality level ativo: reportar antes de editar. Unity 6 empilha
  Graphics default profile -> profile do URP asset -> volumes de cena, por parametro: custo de post
  por tier (bloom, DoF, APV leak) vai no PROFILE DO ASSET do tier, nunca em scene volume.
- Bake o que nao se move: luz Mixed + Shadowmask onde tier movel precisa de sombra estatica;
  props pequenos: Contribute GI on + Receive GI = Light Probes. Um texel de shadowmask guarda 4
  luzes Mixed — mais que 4: extras ficam frozen. Lightmap ~3-4x mais barato de amostrar que APV mas
  ~3x a memoria; APV para objetos dinamicos e layouts que mudam.
- Sem bake GI e probe local, interiores e glossy pegam o CEU (superficies azul-acinzentadas). Box
  reflection probe por zona.
- Em tilers (mobile), bandwidth e o orcamento: Forward, sem depth/opaque texture salvo necessidade
  (Opaque Texture derruba MSAA sem StoreAndResolve), MSAA 2x, render scale 0.85, sem soft shadows.
  Cada pass full-screen extra: 1-2 ms em GPU classe Quest 2.
- GRD (GPU Resident Drawer) silenciosamente nao faz nada sem a cadeia completa: BRG Variants =
  Keep All + todos os renderers Forward+/Deferred+ + static batching off + sem
  MaterialPropertyBlock/LPPV.
- GPU lightmapper only no Apple Silicon (sem CPU fallback); bake exige graphics (nao `-nographics`).
  Toon/custom shader em geometria lightmapped precisa amostrar lightmaps, shadowmask e probes ou o
  bake some.

## World Building (terrain, ProBuilder, streaming)

- Estrutura antes de conteudo: tamanho e resolucoes do terrain travados ANTES de esculpir (mudar
  depois resampla). Heightmap 2^n+1 (513/1025/2049), Detail Resolution Per Patch 16. `TerrainData`:
  persistir o asset ANTES de `SetAlphamaps` (senao alphamaps se perdem).
- Nao-destrutivo: gerar em passos ordenados, deterministicos, re-executaveis em CI. PolyShape do
  ProBuilder reconstruido da footprint dropa toda edicao posterior — guardar a receita, nao a mesh.
- Graybox exit gate mecanico: portas pelo raio do agente E pelo boom da camera; NavMesh em todo piso
  com folhas de porta fora do bake (`NavMeshModifier.ignoreFromBuild`), telhados Not Walkable,
  andares ligados por NavMeshLink; uma NavMesh Surface por area (duas sobre uma area = paths
  "completos" atraves de parede na stale).
- `PrefabUtility`: `RecordPrefabInstancePropertyModifications` ANTES de substituir/mover instancia
  (sem ele, `ReplacePrefabAssetOfPrefabInstance` empilha tudo na origem).
- Streaming so se nao couber: nucleo persistente dono de RenderSettings/lightmaps/fog; nunca segurar
  `allowSceneActivation = false` (trava unload enfileirado); `backgroundLoadingPriority` e o marker
  Integrate so significam algo em Player built — no Editor os contadores leem 0.
- LOD Group e a alavanca: arvores com LOD Group ignoram `Terrain.treeDistance`; em GPU tiler movel,
  foliage LOD opaco vence impostor alpha-tested. ProBuilder 6.1.2: sem janela (tool context na Scene
  view), `PivotLocation.FirstVertex`. Polybrush deprecado e nunca funcionou em Terrain — raycast.

## Mobile (Android / iOS)

- Orcamento do frame SUSTENTADO: ~65% de 1000/fps (10.8 ms a 60, 21.7 ms a 30), medido em p95/max
  no aparelho mais fraco, soaks de 10-15 min. Sob calor: baixar render scale SO se GPU-bound —
  resolucao quase nao ajuda frame CPU-bound.
- Texturas: conferir formato IMPORTADO por target (HDR sem ASTC HDR override importa como
  ETC2_RGBA8). ASTC 4x4 UI/faces, 6x6 default, 8x8 mapas grandes. Audio: WAV fonte, SFX mono ate
  22050 Hz, ADPCM <200 KB, Streaming so >~400 KB. `AssetPostprocessor` mantem compliance.
- URP mobile nao e PC baixado: Depth Priming Disabled (nao suportado), Native RenderPass on, Depth/
  Opaque off salvo uso, HDR off ou 32-bit, soft shadows off, Store Actions Auto/Discard. Um URP
  asset por Quality tier — batch editor Android pode reportar Quality "PC" (observado).
- Build reproduzivel: Unity nao guarda senhas de keystore — env vars no processo de build; Google
  recusa debug keystore; symbols no PRIMEIRO bundle (crashes anteriores nunca simbolicam). ANR:
  maioria no backgrounding — nada pesado em `OnApplicationPause`; SDKs escalonados; `Application.exitInfo`
  na proxima sessao.
- Monetizacao idempotente: pinar IAP 5.x e LevelPlay 9.x (o editor 6.3 defaulta IAP 4.15.1 /
  LevelPlay 8.10.1 atras dos docs). Validar -> grant -> `ConfirmPurchase`; dedupe por transaction id;
  reward em `OnAdRewarded` nunca `OnAdClosed`.
- Touch: EnhancedTouch (nunca `Touchscreen.current` em Update); on-screen controls emitem Gamepad
  virtual — HUD que se esconde "quando gamepad conecta" esconde a si mesma. Safe area: um painel
  `SafeAreaFitter`; UI Toolkit: topo = `Screen.height - safeArea.yMax`.
- Limites: AAB base 200 MB / APK 100 MB Play; paginas 16 KB (Android 15+); min API 25, target API
  36; iOS 15, Xcode 26 + iOS 26 SDK. `BuildReport.totalSize` nao e tamanho de AAB (789 MB reportado
  vs 53.9 MB real — usar `bundletool get-size`).

## Web (WebGL / WebGPU)

- O host escolhe a compressao: HTTPS proprio -> Brotli + `Content-Encoding` por arquivo +
  `application/wasm`; HTTP simples -> gzip (Chrome recusa Brotli fora de localhost); itch.io ->
  Decompression Fallback ON; Poki -> Disabled.
- Budget em bytes ate `gameplayStart` (CrazyGames: 20 MB mobile homepage / 50 MB geral, 1500
  arquivos). Preload tags so pra bundles do primeiro momento — contam no download. Uma thread, um
  heap: QUALQUER ThreadPool API e hang irrecuperavel (`Task.Run().Result` congela a aba) —
  `Awaitable`, coroutines, `UnityWebRequest`. `targetFrameRate` deixar -1 (Unity nao le refresh do
  browser). Initial Memory Size = pico medido (padrao 32 MB cresceu pra 68-74 MB -> travar em 80).
- WebGL 2 shipa (faz skinning em CPU); WebGPU experimental 6.3-6.5 — manter WebGL 2 abaixo e logar
  `SystemInfo.graphicsDeviceType` (fallback silencioso).
- Interop: `.jslib` em ES5, strings como heap pointers, resposta via `makeDynCall` +
  `[MonoPInvokeCallback]`; `SendMessage` com JSON pra objeto com nome exato.
  `WebGLInput.captureAllKeyboardInput = false` ou campo de texto da pagina nao recebe tecla. Sem
  system fonts: CJK/grego sai em branco — fallback font ou desenhar em HTML.
- Strip Engine Code + bundles: `Could not produce class with ID` — gerar `link.xml` antes do build.
  Code Optimization e texture subtarget moram em `Library/` (clone fresco volta ao default): passar
  em todo job ou commitar Build Profile. Template 6.3 shipa Shorter Build Time + Minimal stripping
  (46 MB wasm raw) — release: Disk Size with LTO, Explicitly Thrown, WASM 2023 on.

## Pipeline Automation (AssetPostprocessor, Addressables, CI)

- Regras de import em `OnPreprocess*`, `GetVersion()` bump a cada mudanca, config declarada
  (`context.DependsOnSourceAsset`), sem relogio nem ordem de dicionario, sem escrever assets no
  callback. Prova de determinismo: `-consistencyCheck` (bump de GetVersion reimporta TODOS os assets
  do tipo — medido 1513 texturas num no-op).
- Edicao conta so via serializacao no objeto exato; `StartAssetEditing`/`StopAssetEditing` em
  `try/finally` com `SaveAndReimport`/`ImportAsset` DENTRO do batch (195 FBX: 19s solto vs 5.1s
  batched). Contar com `AssetDatabaseExperimental.counters`, nao o log.
- Addressables: empacotar por CONDICAO de carregamento, nao por pasta; dependencia compartilhada
  sem grupo e copiada em TODO bundle (inclui `Lit.shader` da URP — atribuir explicita). Assign em
  ordem ordinal (determinismo). Released != unloaded: memoria volta quando refcount do bundle zera;
  cena de build referenciando Addressable carrega duas vezes — gatear hard references.
- `DoNotBuildWithPlayer` no content build: senao todo player build rebuilda o conteudo e o
  `addressables_content_state.bin` arquivado fica stale (um por plataforma por release).
- Testes como gate: regras de conteudo como EditMode tests parametricos (um case por asset),
  rodando sincrono em pre-build callback. Erro logado falha teste exceto `LogAssert.Expect`.
- CI: um processo por estagio, MESMO `-buildTarget` em todos (testes inclusos), checkout sem
  `Library/`, licenca Personal so ativa via Hub sign-in (CI precisa seat pago ou ULF),
  `-cacheServerWaitForUploadCompletion` com Accelerator. Release: arvore limpa, sem defines de
  debug, `IPreprocessBuildWithContext` (nao `...WithReport`) filtrando `BuildPipeline.isBuildingPlayer`.
  Keystore/senhas via env vars, nunca persistidas.

## Performance

- Nomear o bound antes de mexer: CPU main vs render thread vs GPU. GPU precisa timing de GPU (Frame
  Debugger nao tem); Metal System Trace em player mac.
- Editor itera, PLAYER decide: veredito so de development build no device mais baixo. Contagens
  (draw calls, SetPass) sao evidencia estavel de Editor; tempos nao sao. GC.Alloc mostrado nao e o
  custo: contar bytes+calls e medir `GC.Collect`; alvo 0 B por frame; o proprio probe nao aloca.
- Draw calls em 6.3 = SRP Batcher + GPU Resident Drawer: "Enable GPU Instancing" off, static
  batching off, sem MaterialPropertyBlock. Draws GRD aparecem como "Hybrid Batch Group" no Frame
  Debugger.
- Hitches atribuidos um a um com ProfilerMarkers proprios mantidos no codigo (Deep Profile infla
  funcoes pequenas); compiles aparecem como `Shader.CreateGPUProgram` (warm PSO na load); primeiro
  frame ~250 ms pode ser `Mono.JIT` — IL2CPP.
- Estrutura antes de tuning: manager + structs + Burst + SoA antes de otimizar dentro do Update.
  Medir p95 E pior frame, ~200 frames por lado, antes/depois interleaved (maquina compartilhada
  mente).
- MeshCollider em runtime: `Physics.BakeMesh` em job na carga (48-80 ms spawn spike -> 0);
  InstantiateAsync nao e fix de hitch — pool + prewarm. Memory: resident mata, untracked geralmente
  nao (0.75 GB untracked ~ 140 MB resident); memoria de Editor ~5x a do player.

## Armadilhas

- "Scripts have compiler errors": qualquer erro em qualquer assembly aborta TODO batch job; no
  editor vivo o equivalente e Safe Mode (bloqueia `com.unity.pipeline`).
- `Time.*` setters + `SaveAssets` nao persistem — `SerializedObject` em `TimeManager.asset` e ler de
  volta num segundo processo. `GetComponent<T>() ?? AddComponent<T>()` e `?.` em Unity objects:
  fake null — `== null` explicito ou `TryGetComponent`. Runtime asmdef referenciando editor asmdef:
  Editor compila, build falha.
- `Object.Destroy` em 6000.3 ja chama `OnDisable` em toda a hierarquia (docs dizem filhos diretos
  ate 6.4): unregister em `OnDisable` E `OnDestroy` idempotente. Enter Play Mode sem domain reload
  (opcional 6.3, default 6.6): resetar statics em `SubsystemRegistration`, unsubscribe em `ExitingPlayMode`.
- UnityYAMLMerge: exit 2 em QUALQUER campo conflitado (mesmo com `-l`/`-r`) e sem eles escreve o
  valor BASE — checar exit code sempre.
- `Physics.autoSyncTransforms` deprecado: `Physics.SyncTransforms()` explicito antes de queries de
  colliders movidos por transform.
- Templates 6.3 rodam Input System only — `Input.GetAxis`/`OnMouseDown` legado lanca excecao.
- Quality: apos `SetQualityLevel`, `GraphicsSettings.currentRenderPipeline` ainda retorna o asset
  anterior no mesmo frame — ler `QualitySettings.renderPipeline`. `BuildNavMesh()` e salvar a cena
  embute o data e a torna binaria — `AssetDatabase.CreateAsset(surface.navMeshData)` antes.
- Matar editor por nome mata editors de outros agentes — so por PID, e nunca o que voce nao abriu.
  `EditorSceneManager.NewScene` descarrega assets nao-referenciados: criar a cena antes de carregar
  UXML. Paths com espaco funcionam — quotar tudo. Nunca shipar `*_BurstDebugInformation_DoNotShip`.

## Traps Unity 6.3 (6000.3)

- Render Graph only; Compatibility Mode removido (define morre em 6.4); `_CLUSTER_LIGHT_LOOP`
  substitui `_FORWARD_PLUS`.
- Build Profiles substituem Build Settings; sem API publica pra criar profile antes do 6.5;
  `EditorUserBuildSettings` mudado num platform profile ativo afeta TODOS os platform profiles.
- `FindObjectsByType<T>(FindObjectsSortMode.None)`; `Rigidbody.linearVelocity`/`linearDamping`;
  `[SerializeField]` so em fields; `Lightmapping.TryGetLightingSettings` (o getter joga excecao
  quando unassigned).
- `GetInstanceID` vira erro em 6.5 (usar `EntityId`); `[SerializeReference]` types precisam
  `[Serializable]` a partir de 6.4.
- Versoes pinadas divergem dos docs: Cinemachine 2.10.7 no manifest mas resolve 3.1.7; IAP 4.15.1,
  LevelPlay 8.10.1 (docs ja falam IAP 5, LevelPlay 9) — pinar sempre.
- Addressables 2.9.1 default em 6.3; postprocessor dele adota qualquer group asset importado nas
  settings default. Content Directories substituem AssetBundle builds em 6.6.
- Web: template URP shipa Brotli (nao gzip do Manual); WebGPU experimental (opt-in em 6.6);
  Built-in RP deprecado em 6.5. 2D: Sprite Atlas V2, Tilemap Extras 6.0.2; Light Batching Debugger
  em Window > Analysis. Runtime atlases chegam 6.4; PVRTC removido 6.4.
- macOS: Metal only, sem CPU lightmapper em Apple Silicon, GPU Frame Time le 0 no Editor (medir GPU
  em player); VFX Graph panel sem GPU timings.
