# Roblox Studio — dirigir o Studio e produzir conteudo de jogo por codigo

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Como dirigir Roblox
Studio instalada via servidor MCP embutido do Studio (Luau em Edit, playtests com Server e
Client, input simulado e captures), checagem offline com Rojo/luau-lsp/Lune, RunScript headless
e Open Cloud. Sem Roblox Studio instalada, ignorar este arquivo.

## Detectar instalacao

- macOS: `/Applications/RobloxStudio.app` (`brew install --cask robloxstudio`; auto-atualiza).
  Build de referencia: 0.743, outubro 2026, Apple Silicon. Windows:
  `%LOCALAPPDATA%\Roblox\Versions\RobloxStudioBeta.exe`. Conta Roblox logada exigida.
- Servidor MCP embutido: ligar uma vez em Assistant > Manage MCP Servers > "Enable Studio as
  MCP server". Ferramentas: `list_roblox_studios`, `execute_luau`, `start_stop_play`,
  `screen_capture`, `user_keyboard_input`, `user_mouse_input`, `generate_mesh`.
- Toolchain de arquivos (offline): `rojo --version` (7.7.x), `luau-lsp` (1.70+), `lune`
  (0.11+), `selene` (0.32), `stylua` (2.6), `rokit` (substitui Aftman/Foreman), `wally`
  (0.3.x). Instalar via `rokit install` a partir do `rokit.toml` do projeto, ou brew.
- Sincronizador em uso: `*.project.json` na raiz = Rojo; Script Sync ativo =
  `InstanceFileSyncService:GetAllInstances()` nao vazio. Nunca os dois na mesma pasta.

## Como dirigir

- MCP em Edit: `execute_luau` roda chunks Luau no data model Edit (~67 ms por chamada).
  Retorna so o primeiro valor de retorno; prints vao pro Output log — passar num resultado
  parseado, nunca no texto da ferramenta. `list_roblox_studios` primeiro; bind por nome exato
  da janela, senao edita o jogo errado do usuario.
- Playtest: `start_stop_play` abre um Server + um Client. Rodar codigo em cada lado com
  `execute_luau` no data model correspondente (`datamodel_type` "Client"). Um playtest = um
  cliente; multi-cliente so via `StudioTestService`/varias janelas. Sempre parar o playtest —
  Edit fica "not available in Play mode" se ele ficar aberto.
- Input e captura: `user_keyboard_input` (so teclado; gamepad KeyCodes nao chegam ao IAS),
  `user_mouse_input` com `instance_path` (clicar em `"LocalPlayer.PlayerGui..."`), caminhar
  segurando teclas. `screen_capture` com camera fixa antes/depois + contact sheet: toda mudanca
  visual exige captura julgada, nao so numero. Janela coberta devolve frames escuros/parados.
- Type check offline: `rojo sourcemap --include-non-scripts` depois `luau-lsp analyze
  --sourcemap` duas vezes — padrao e com `--flag:LuauSolverV2=true` — porque luau-lsp 1.70 roda
  o solver velho e o Studio usa o novo em scripts nonstrict. `selene.toml` precisa de
  `std = "roblox"`. `lune run` pra testes de logica pura (sem fisica, sem rede).
- Rojo: `rojo build` gera `.rbxl` a partir de `*.project.json` + `src/`. Nunca rebuildar um
  `.rbxl` que o Studio tem aberto. `rojo serve` sincroniza `src/` pra janela aberta; sem
  `$ignoreUnknownInstances` um reconnect apaga instancias so-do-Studio.
- RunScript headless: `RobloxStudio --task RunScript` ~6 s por run, mas sai 0 mesmo com erro de
  runtime e no macOS pode assumir/fechar a janela aberta — parsear marker de resultado, nunca
  o exit code, e recusar enquanto qualquer Studio roda.
- Open Cloud: Luau Execution API pra CI em place publicado (5 tasks/min, 10 pendentes por
  place, 429 depois; 4 MB script, sem fisica, nada persiste). Place publishing API nao atualiza
  CSG, SurfaceAppearance, EditableImage/EditableMesh, BaseWrap — esses publicam via Studio. Uma
  API key por job, escopo minimo; o usuario cria a key, agente nunca.
- GUI-only, nao fingir: Animation Editor, terrain brushes, Accessory Fitting Tool, Creator Hub,
  publicar/uploadar/gastar Robux — sempre pedir ao usuario. Substitutos: `Terrain:WriteVoxels`,
  `KeyframeSequenceProvider:RegisterKeyframeSequence`,
  `AvatarCreationService:ValidateUGCAccessoryAsync`. Persistencia: mudancas Edit vivem na sessao
  ate alguem salvar (nenhuma ferramenta MCP salva); writes de Server em playtest somem ao parar;
  nunca SIGTERM no Studio.

## Luau

- `task.spawn` roda ate o primeiro yield antes de retornar — nao e concorrencia. `task.defer` =
  "depois deste step". `task.wait()`/`task.delay(0)` retomam no proximo Heartbeat (mesmo frame
  de PreSimulation, frame seguinte de Heartbeat). `wait()`/`spawn()`/`delay()` deprecated;
  `Stepped`/`RenderStepped` superados por `PreSimulation`/`PostSimulation`/`PreRender`.
- SignalBehavior: templates novos e Server Authority usam Deferred; `Default` ainda e
  Immediate. Em Deferred, handlers rodam no proximo resumption point, nunca dentro do `:Fire()`;
  handler de `Destroying`/`CharacterRemoving` le `Parent` nil — capturar estado antes de
  Destroy. Listener conectado dentro de outro handler perde fires ja na fila: conectar no Init.
- Nunca yield em `__index`, comparator de `table.sort`, callback de `gsub`, nem em handler de
  frame (`task.wait(0.25)` num Heartbeat empilhou 16 threads em 1 s). `pcall` nao salva.
- Tipagem: `--!strict` em modulo novo; metodos como `function C.m(self: C, ...)` (dot) — colon
  deixa typo de campo passar. Composicao, nao heranca de metatable tipada. Narrow com `IsA`,
  nao `:: any`. Gatear nos dois solvers.
- Cleanup: `Destroy` idempotente e desconecta conexoes que ele criou; tabelas por player limpas
  em `PlayerRemoving`; `PlayerCharacterDestroyBehavior` Enabled (NotScriptable — setar em
  Properties/Rojo). Leak = piso que nao desce; crescimento sozinho nao e leak.
- Parallel Luau: um Actor por unidade independente (cada Actor e uma VM — estado de modulo nao
  e compartilhado), `require` antes de `task.desynchronize()`, writes so depois de
  `task.synchronize()`. SharedTable: `SharedTable.increment`/`update`, nunca `+=` plain.
- `--!native` so com numero: 3-5x em loop numerico tipado, ~0 sem anotacao. Buffers so acima de
  ~50 KB/s; writes inteiros wrapam — range-check sempre. `collectgarbage` so aceita `"count"`.

## Arquitetura

- Um Script de entrada por lado: RunContext Server em `ServerScriptService`, RunContext Client
  em `ReplicatedStorage`. Todo o resto e ModuleScript. Client Script em StarterPlayerScripts
  roda duas vezes.
- Boot em duas fases por um loader: Init monta estado proprio e nunca yield; Start pode yield e
  chamar outros. Ordem de `GetDescendants` e indefinida — modulo nao chama modulo no load.
- Servidor detem a verdade; Attributes num Configuration espelham pro cliente; UI nao detem
  nada. Attribute-change e remote nao tem ordem entre si: mandar estado no payload ou re-render
  a cada mudanca. Tempos como `EndsAt` absoluto, nao timer remoto. require-by-string:
  `./`, `../`, `@self`, `@game`; Creator Store nao faz `require(assetId)` — vendorizar.
- Comportamento por tag (CollectionService) + Binder com filtro de ancestor — template tagueado
  em ServerStorage tambem aparece em GetTagged; reparent pode nao disparar InstanceAdded (watch
  AncestryChanged). Codigo server e mapas nunca em ReplicatedStorage (exploiter le tudo;
  cliente baixa tudo no join): ServerStorage + um clone por round.
- Remotes criados em codigo, nunca na mao no Explorer. Cliente pergunta ("posso construir
  aqui?"), servidor decide. Framework por time: solo/pequeno = loader + Signal + cleanup
  (Trove/Janitor); Knit existente = manter.
- Rojo: `"emitLegacyScripts": false` (senao `.client.luau` vira LocalScript que nao roda em
  ReplicatedStorage), `"CFrame"` com 12 numeros (`"Position"` e descartado em silencio — parte
  fica na origem), sufixos so `.server`/`.client`/`.plugin` (`.local.luau` vira ModuleScript
  `X.local`), um `init` por pasta, `globIgnorePaths` cobrindo Packages.

## Networking e seguranca

- Remote carrega intencao, nunca resultado: cliente nomeia o item, servidor precifica; arma
  reporta origem e ponto de hit, nunca vitima nem dano.
- Validar em ordem fixa: rate limit, depois argumentos, depois contexto. NaN passa em
  `typeof(v) == "number"` — `math.isfinite` sempre. Instance argument = claim: `typeof` +
  `IsDescendantOf(pasta esperada)`; cliente pode replay de pickup destruido.
- Toda superficie client-triggeravel e remote: ProximityPrompt (re-checar distancia/Enabled/
  rate), ClickDetector (zero checks), `Touched` (fisica do cliente — nunca decide dano/pickup).
  ~500 req/s por cliente por tipo de remote.
- UnreliableRemoteEvent: payload 1.000 bytes pos-compressao (980 chegou, 1.000 dropou) — so
  dados cosmeticos frequentes; batches ficam reliable. `SetNetworkOwner(nil)` em pickups
  unanchored, NPC roots e pais de prompt.
- Movimento casual = MoveGuard (WalkSpeed + 5 studs/s de tolerancia, grace antes de teleport do
  servidor); competitivo novo = Server Authority (`Workspace.AuthorityMode = Server`: forca
  Deferred, fixed-step, StreamingEnabled, InputAction; live: teleport de cliente moveu 0).
- Hits: sem lag compensation embutida — rewind `[now - min(ping+0.1, 0.4), now]` sobre historico
  server-side, ou cone ~10 graus. Parede so com geometria estatica.
- Consequencias em escada e tardias: suspicion score com decay, dois motivos distintos antes de
  enforcement, delay aleatorio 20-90 s. Rubber-band em vez de kick (lag gera falso positivo).
  Honeypot remotes = sinal forte. `InvokeClient` = thread pendurada: usar RemoteEvent
  pedido/resposta com timeout.

## Data

- Session lock evita duplicacao — UpdateAsync sozinho nao. Um ProfileStore profile por player
  (ProfileService/DataStore2 mortos). `StartSessionAsync` com `Cancel`, kick em nil, `AddUserId`,
  migrar ANTES de `Reconcile` (Reconcile copia `SchemaVersion` do template e pula a migracao),
  `EndSession` ao sair.
- Write pode ter falhado depois de pousar: ler com `UseCache=false` antes de repetir; op id
  dentro do valor torna retry no-op. `KeyQueue` serializa por chave — retry tardio sobrescreve
  dado novo.
- Compra granta uma vez e salva antes: log de `PurchaseId` no profile (100 entradas); retornar
  `PurchaseGranted` so quando `LastSavedData` confirma — tudo mais `NotProcessedYet`. Schema:
  `SchemaVersion` + `Migrate{latest, steps}`; recusar versao maior que a sua (servidor velho
  nunca salva dado novo — kick). Publicar todos os places de um universo juntos.
- Trade: dois profiles nunca salvam atomicamente — escrow dos dois lados + um trade-log decide.
  Unpublished place: toda chamada DataStore falha — mock (`ProfileStore.Mock`) + multi-server
  simulado. Studio com API access escreve em chaves live: universo de teste separado.
  `GetDataStore` sempre dentro de pcall em Studio.
- Limites (experience-wide desde 2026-07): read 300+40xCCU, write 300+20xCCU por min; servidor
  60+40xplayers; UpdateAsync gasta 1 read + 1 write; valor 4.194.304 chars; chave/nome/scope 50;
  fila de 30 por tipo, depois erros 301-306. ProfileStore: autosave 300 s, steal 40 s,
  assume-dead 630 s. BindToClose: 30 s. `JSONEncode` encoda NaN/infinito como tagged objects e
  dropa entradas sparse em silencio. `ReserveServerAsync`: reusar o access code em retry.

## Environment

- Graybox em parts simples, composto da camera de spawn (template SpawnLocation pode estar
  virado pro lado errado). Portas/corredores >= 10 studs, paredes >= 10. WalkSpeed 16, 1 stud
  ~28 cm.
- Parts antes de CSG; cada union e um mesh+colisao proprio. Live: Hull e Box fecharam uma porta
  10x10; Default/PreciseConvexDecomposition mantiveram aberta — testar passagem com
  `GetPartsInPart` ou ray, nao confiar no nome do fidelity. `GetPartBoundsInBox` compara
  bounding box e mente pra aberturas.
- Terrain por codigo com leitura de voxels de prova: region calls resolucao 4, regioes
  grid-aligned, max 4.194.304 voxels cada. `FillBlock` com topo em y=0 deixa superficie ~y=2 —
  checar `surfaceY` real. Raycast logo apos fill pode voltar vazio. Grama atravessa pisos:
  pintar LeafyGrass embaixo (`paintUnder`). MaterialVariant liga por nome — renomear quebra
  usos; terrain so via `SetBaseMaterialOverride` (Grass e LeafyGrass separados); cor de
  material do terrain multiplica o mapa — clarear com `Terrain:SetMaterialColor`.
- Luz: frase de mood primeiro, `Looks`/`aimSun` depois (GeographicLatitude controla direcao),
  cor por ultimo. Realistic + PrioritizeLightingQuality; `LightingStyle` substitui `Technology`
  (script nem le mais). Atmosphere dia: Density 0.3-0.4, Offset 0. Noite externa precisa de luz
  focal e silhueta (a receita de corredor do BONES apaga 96-100% das vistas longas). Interior:
  vidro com `CastShadow` off ou o sol nao entra; fake bounce = PointLight junto a janela.
  ColorCorrection em passos de 0.05.
- Streaming: Enabled por padrao em places novos. Configs de raio sao file-only
  (NotScriptable/"not a valid member" via script) — Rojo `$properties` ou Properties panel.
  LevelOfDetail StreamingMesh so com TargetRadius >= 1000; SLIM pra modelos estaticos. Script
  clamps: Atmosphere Glare/Haze <= 10, Density/Offset <= 1; Light Range <= 120.
  `GeometryService:SubtractAsync` substitui `BasePart:SubtractAsync` (unparented). `ClockTime`
  nao avanca sozinho.

## Assets e UGC

- GLB de AI image-to-3d chega com defeitos conhecidos: ~0.95 unidades, frente +Z, `doubleSided`
  em tudo, metallicFactor 1.0, mapas 2048 JPEG, pinholes. Tamanho em studs decidido no Blender
  (1 unidade = 1 stud), frente pra -Z (yaw 180), pivot embaixo-centro pra props, centro pra
  accessories. Budgets: 20k tri por MeshPart, 4k por accessory, EditableMesh 60k verts/20k tri.
- Watertight por medicao: `holes_fill` nao fecha tudo e decimacao cria edges novos — capar
  loops, reparar pos-decimacao, recontar. Nunca Make Double Sided pra esconder buraco. Preview
  sem upload: EditableMesh/EditableImage via `AssetService:CreateEditable*` — session-only,
  vazio em playtest e ao reabrir; iterar via Importer com "Upload to Roblox" off.
- Validar local ate sobrarem so strings de upload: `ValidateUGCAccessoryAsync` em playtest, max
  10 calls/60 s. Bounds de accessory por `AvatarPartScaleType` (Hat Classic 3x4x3; Normal
  1.87x2.5x1.87). Coroa de chapeu 1.35 studs pra cabeca R15.
- Texturas por densidade: 256 px por 2x2x2 studs, potencia de dois, normals OpenGL, metalness 0
  ou 1, ColorMap opaco em accessory. Places aceitam 4096 px desde 2026-01.
- Armadilhas de validator: TextureID + SurfaceAppearance juntos (#146), attributes/tags no
  accessory (#191), `Massless` no Handle, >10 componentes desconexos (#187), 0.05-4.0 studs por
  eixo (#176/#177).
- `GenerateMeshAsync` indo pra deprecacao; `GenerationService:GenerateModelAsync` substitui.
  Avatar Joint Upgrade junta accessories com `RigidConstraint`, nao weld.

## Gameplay

- Intencao sobe, hit e decidido no servidor com spatial query — `Touched` nunca decide dano. Um
  hit por character por swing (chavear por model, nao por limb).
- Spherecast/Blockcast/Shapecast ignoram parts onde comecam dentro — overlap query no inicio.
  `ExcludeInstances`/`IncludeInstances` substituem `FilterDescendantsInstances`/`FilterType`
  (2026-04). `RaycastParams.Margin`/`SizeGradient` existem na doc mas dao "not enabled yet" em
  0.743 — usar Spherecast pra ray grosso. Debug parts com `CanQuery=false`.
- Movimento: sweep completo antes de commitar o step; deslocamento por trapezio deixa o path
  independente de frame rate. Teleportar por Position a cada frame = tunneling.
- NPC: um scheduler pra todos (buckets por frame, ~10 thinks/s/NPC, ~30 paths/s servidor),
  `SetNetworkOwner(nil)` no root (NPC a 6 studs de um player passa a ser simulado pelo
  cliente). Humanoid custa mais que o cerebro: estados desnecessarios off, `BreakJointsOnDeath`
  false, pool de modelos. Medido: 100 R15 patrulhando = 0,14 ms de AI/frame, fisica 1,8 ms.
- Pathfinding: `pcall` E `Status == Success`; `ComputeAsync` pode yield ~65 ms; `MoveTo`
  desiste em 8 s — reemitir. So computar no chao, mundo carregado, <3.000 studs. Custos de rota
  numa tabela `Costs` (materiais, PathfindingModifier/Link). Falhou o move: snap pro waypoint,
  nunca pro goal. Stun cancela swings pendentes. Knockback: `LinearVelocity` segurado 0.2 s;
  movers novos: LinearVelocity/VectorForce/AlignPosition — BodyVelocity morto. Collision groups
  em `workspace.RegisterCollisionGroup` (PhysicsService deprecated).
- Carro = CylindricalConstraint + SpringConstraint por roda nos mesmos attachments, limite
  superior abaixo de 0, centro de massa baixo. Dono = driver sentado (reassign on `Occupant`);
  ao sair, soltar motores e sair pelo ponto de saida mais alto. Ler `ThrottleFloat`/
  `SteerFloat`, nao `Throttle`. `BindToSimulation`: `time()` dentro; efeitos em PreRender.

## UI e input

- Uma arvore so, adaptada por medicao: layout por `GuiService.ViewportDisplaySize`, prompts por
  `UserInputService.PreferredInput`. `TouchEnabled`/`IsTenFootInterface` chutam errado (phone
  com controle, laptop com touch).
- Scale pra casca com `UISizeConstraint`, Offset pra botao/texto. `UIScale` no ScreenGui
  inteiro quebra tudo. Constrain o container, nao os filhos. HUD persistente: filho DIRETO de
  StarterGui com `ResetOnSpawn=false` — dentro de Folder o flag e ignorado e o HUD reseta.
- Top bar inset medido: 58 px em 0.743 (doc velha dizia 36) — `ScreenInsets.CoreUISafeInsets` e
  medir, nunca hard-code. Touch controls: posicionar botoes relativos ao `JumpButton`.
- Look em StyleSheet: tokens + temas + seletores (`@ViewportDisplaySizeLarge`,
  `@PreferredInputTouch`, `@ReducedMotionEnabledFalse`). Property setada em codigo ganha de
  toda rule; ler com `GetStyled`. `SelectorError` pode ler "" em regra antiga — reassignar e
  esperar.
- IAS (release 2026-06): gameplay context Priority 2000, menu 3000 com `Sink`; prioridades
  iguais disparam sem ordem. Toda acao = tecla + gamepad; `UIButton` binding so onde a tela nao
  cobre. `InputAction:Fire` deprecated — `InputBinding:Fire` Scriptable. IAS nao desenha botoes
  mobile — voce constroi.
- `Activated` (ou binding IAS) em vez de `MouseButton1Click`. `ScrollingFrame` com
  `AutomaticCanvasSize=Y`. `AutoLocalize=false` em labels dinamicos. Alvos 44 px, texto >= 11
  px, contraste 4.5:1 (3:1 >= 24 px). `StudioDeviceSimulatorService` driveia presets do Device
  Simulator via execute_luau (Edit e Client; Server recusado).

## Animacao

- Avatar Joint Upgrade: joints R15 sao `AnimationConstraint`, nao `Motor6D` — `C0`/`C1`
  read-only. Lookup de joint aceita as duas classes. Procedural = multiplicar em `Transform` no
  PreSimulation (nao replica).
- `Animator:LoadAnimation` (Humanoid:LoadAnimation deprecated). Quem possui o rig carrega:
  cliente pro seu character, servidor pra NPC — replica pros outros. Preview Edit:
  `Animator:StepAnimations` + reset do rig antes de salvar.
- Prioridade particiona joints — maior so ganha joints que ela keya; key de identidade tambem
  clama. Em clip montado por codigo, Poses so-de-caminho com Weight 0. Ordem: Core < Idle <
  Movement < Action < Action2+.
- Timing de gameplay por markers com parametro (`GetMarkerReachedSignal`), nunca `task.wait`.
  Face = clip no Animator: write/tween em `FaceControls` reverte a 0 em ~0,5 s. IKControl
  criado no servidor; look-at Weight 0.999 (1.0 torce o pescoco quando alvo passa atras);
  `Priority` ordena solves.
- Blender: 24 fps, so armature, sem scale keys (60 fps dobra keys sem ganho). `active://` e
  `RegisterKeyframeSequence` = so Studio — ship usa `rbxassetid` publicado pelo dono.

## VFX e audio

- Camadas emitidas uma vez, nao um sprite gigante: 5+ texturas empilhadas, `Emit` pra burst,
  `Enabled` pra cauda. Flash de impacto Lifetime ~0.05 s; slash 0.2-0.3 s; ZOffset 0.001 entre
  camadas. Mobile capa 100 particles/s por emitter e dropa flipbooks em low memory.
- Particle orientada a velocidade: Speed 0.001-0.01, nunca 0 (some). Emitter via `Instance.new`
  vem com LightInfluence 0 — setar explicito (e <1 pra brilho responder). Trail/Beam precisam
  de Attachment0 E Attachment1.
- Beam semicirculo: CurveSize = chord x 2/3, pontas viradas pro bulge, FaceCamera, segmentos so
  quando curva. Flipbook: 1024x1024, grids 2x2/4x4/8x8, <=30 fps. Servidor decide, cada cliente
  desenha: valida (tipo, cooldown, range, raycast) e broadcasta; clientes clonam e cullam —
  zero instancias de efeito no servidor.
- Audio: sem AudioListener/AudioDeviceOutput nada se ouve — `SoundService.DefaultListenerLocation`
  = Camera (plugin security, setar em Edit). n efeitos = n+1 Wires; assertar `Wire.Connected` e
  path ate o output. AudioEmitter so em Attachment/Part/Camera — em Folder/Model fica mudo.
  `AudioPlayer.Asset` (nao `AssetId`). Ducking = AudioCompressor `Sidechain`.
- Footsteps por evento de animacao `footstep` com `left`/`right` nos frames de contato +
  conjuntos por material; stride fallback ~4.4 studs. Passos por `MoveDirection` falham com
  `Humanoid:MoveTo` — usar velocidade do root. Uploads de audio (<20 MB, <7 min, 48 kHz) e de
  qualquer asset = sempre passo do usuario.

## Monetizacao e live ops

- Grant so no receipt handler e so depois do save confirmado (`BindReceiptHandler` atual;
  `ProcessReceipt` legado — um so por servidor; um segundo bind catch-all derra, um segundo
  ProcessReceipt e aceito em silencio). `PromptProductPurchaseFinished` NAO prova pagamento.
- Preco mostrado = preco do player via `GetProductInfoAsync` no client (preco digitado quebra
  price optimization e Plus). Servidor nunca precisa de preco pra grantir.
  `Enum.InfoType.GamePass` (a doc diz `GamePasses`, que nao existe). Cross-game sales acabaram
  2026-05.
- Odds: uma tabela so pro roll e pro disclosure; `ArePaidRandomItemsRestricted` por player;
  prompt de item aleatorio pago sai do servidor depois do check.
  `HasRobloxSubscription`/`PromptRobloxSubscriptionPurchase` (Plus substituiu Premium).
- Rewarded video: `GetAdAvailabilityNowAsync` no client, `CreateAdRewardFromDevProductId` +
  `ShowRewardedVideoAdAsync` no servidor; recompensa chega como receipt `AdReward`.
- Analytics/config so no servidor ("only available in the game server" no client); cliente le
  via attributes `cfg_`/`perk_`. Steps de funnel so pra frente (exploiter infla). Limites:
  120+20xCCU req/min, 10 funnels/100 steps. Live config com defaults locais (ConfigService
  falha ~30 s em unpublished) + flag `cfgReady`. Experimentos: snapshot onde o player encontra
  a feature, MDE antes, rollout 10/50/100%, ~1.000 DAU minimo.

## Performance

- Orcar pro phone baixo: 2 GB, 60 fps — 500 draw calls, 500k triangulos, 1,3 GB de memoria,
  150k instancias, 50 KB/s down. CPU de phone ~4x mais lento que desktop. Memoria do Studio "is
  incorrect" — numeros de Studio sao numeros de Studio.
- Frame gate: p95 <= 1,2x budget (20 ms a 60 fps), pior <= 2x (33,3 ms); lugar saudavel le p95
  17,2-17,4 ms (bare 16,67 falha). Consistencia > FPS medio. Comparar ms POR FRAME.
- Nomear a causa: `debug.profilebegin` em todo sistema per-frame; `require("@rbx/LibMP")` expoe
  MicroProfiler ao execute_luau; `ScriptProfilerService`/`HeapProfilerService` = PluginSecurity
  (execute_luau alcanca, game Script nao). `SceneAnalysisService` = queries de cena.
- Remover trabalho server que ninguem ve: nunca tween no servidor; resize de part weldada
  re-replica a assembly inteira; partes cosmeticas moveis giram no CLIENTE (medido: moedas
  anchored giradas no server = 7,6-10 MB/s, no cliente = 12 KB/s). `BulkMoveTo` ~2x mais
  rapido que writes por part.
- Replicacao e memoria+banda+join: tags/attributes em cada part replicam pra cada cliente (um
  jogo foi de 3-4% pra 45% de crash). ~1 KB/s por assembly movel server-owned; ~10k
  instancias/s de join. Dado server-only em tabelas Luau, pastas pesadas em ServerStorage.
- Leak = piso que sobe: snapshot 3-4x no mesmo estado; `Destroy` nao desconecta conexoes que a
  part fez com outros sinais — disconnect em `Destroying:Once`. `gcinfo()` lido via
  execute_luau devolve o heap do chunk injetado, nao do jogo.
- Release: `ServerRestartScheduled` handler, restart so de servers desatualizados, crash >2-3%
  investigar. Rollback = restore + publish + restart (restore sozinho nao publica). Agente faz
  dry-run; dono publica.

## Armadilhas (0.743 e gerais)

- `execute_luau` retorna so o primeiro valor; prints ficam no Output — sempre parsear payload.
  Chunk injetado tem module cache proprio: `require` de servico live devolve copia zerada —
  ler estado por attributes/BindableFunction.
- Settings NotScriptable/"lacking capability RobloxScript": `SignalBehavior`, `AuthorityMode`,
  `UseFixedSimulation`, `PlayerScriptsUseInputActionSystem`, `LuauTypeCheckMode`,
  `UseNewLuauTypeSolver`, `PlayerCharacterDestroyBehavior`, raios de streaming,
  `Terrain.Decoration`, `Lighting.Technology` — escrever no Rojo project ou Properties.
- Rojo: `"Position"`/`"Orientation"` em `$properties` = parte na origem com exit 0 (usar CFrame
  12 numeros); `.local.luau`/`.legacy.luau` viram ModuleScripts; `MeshId`/`HttpEnabled` mudados
  sob `rojo serve` nao aplicam (rebuild+reopen); place Rojo comeca com GlobalShadows off,
  ambients cinza, sem Sky/Atmosphere.
- Editar `ModuleScript.Source` em Edit e re-require: codigo velho continua rodando — trocar instancia.
- Janela coberta para de renderizar: draw calls/triangles congelam; capturas voltam escuras —
  confirmar contadores mexendo antes de medir. `GetPartBoundsInBox` e bounding box: toda porta/
  union parece bloqueada — `GetPartsInPart`/ray. `CollectionService:CreateCollection` existe na
  doc mas erro "Collections are not enabled" — usar tags + Binder. Luau Execution em place
  nao-publicado e DataStore em unpublished: tudo falha — mock primeiro.
- Studio MCP: `is_start`, `capture_id`, `datamodel_type` "Client"; respostas podem se perder
  (retry ~45 s). Nunca SIGTERM; ~2,9 GB por janela, renderiza o tempo todo.
