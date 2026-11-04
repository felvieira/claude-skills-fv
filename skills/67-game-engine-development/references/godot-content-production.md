# Godot — producao de conteudo via CLI e jobs

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Como dirigir Godot 4.x
(alvo: 4.7.2 stable, build standard sem C#) instalada via binary headless, editor headless `-e`,
janela pequena pra capturas, testes GUT/gdUnit4, exports por CLI e MCP dentro do editor. Sem Godot
instalada, ignorar este arquivo.

## Detectar instalacao

Primeira acao, antes de qualquer job:

```bash
godot --version              # esperado: 4.7.x.stable...
godot4 --version             # alias comum em Linux
```

- macOS: `/Applications/Godot.app/Contents/MacOS/Godot`. Build .NET: `Godot_mono` — checar
  `.csproj` no projeto antes de assumir GDScript.
- Windows: `Godot_v4.7.2-stable_win64.exe` (sem instalador). Linux: `godot` ou flatpak
  `org.godotengine.Godot`.
- Export templates: conferir `version.txt` em `export_templates/4.7.2.stable/` dentro do data dir
  (`~/Library/Application Support/Godot` macOS, `~/.local/share/godot` Linux). Sem template da
  versao exata, export falha.
- MCP em editor aberto: checar `project.godot` por plugins (`godot-editor-mcp`) e `.mcp.json`
  local. Versao 3.x detectada → parar: o conteudo abaixo e 4.x.

## Como dirigir

Quatro canais, do mais barato ao mais rico:

| Canal | Comando | Serve para |
| ----- | ------- | ---------- |
| Job headless | `godot --headless --path <proj> --script res://tools/job.gd` | logica, builds de cena, auditorias, testes |
| Import | `godot --headless --path <proj> --import` | resolve `class_name`, gera `.godot/imported` |
| Editor headless | `godot --headless -e --path <proj> --script res://tools/editor_job.gd` | `EditorInterface`, abrir/salvar cenas, `reimport_files` |
| Janela pequena | `godot --path <proj> --fixed-fps 60` (sem `--headless`) | capturas, GPU time, MultiMesh, particles |

- **Saida headless e a verdade; exit code nao.** Parse error sai 0, ate com `--check-only`; script
  path inexistente sai 0. Ler o log: varrer `ERROR:`, `SCRIPT ERROR`, `SCRIPT ERROR:` e um
  envelope proprio (`print("AGENT_RESULT " + JSON.stringify(result))`).
- `--check-only` quebra em codigo com autoloads ("Identifier not found") — falso positivo; checar
  com o projeto carregado. `class_name` so resolve depois de `--import`: importar projeto novo antes.
- Job GDScript: estender `SceneTree`/`MainLoop` com `_initialize()`/`_process()` ou chamar metodo
  estatico; imprimir resultado, `quit()`. `-e` espera 2 frames antes de chamar `EditorInterface`.
- Captura = prova. Headless nao desenha nada: screenshot, `--write-movie`, MultiMesh buffer e
  GPUParticles precisam de janela (160x90 basta; renderizar num SubViewport do tamanho pedido).
  Toda captura passa por checagem de imagem (all_black, all_white, uniform) e contact sheet aberta.
- GPU timing: Metal reporta `gpu_ms` 0 — perfilar com `--rendering-driver vulkan`. Janela trava o
  frame no refresh; julgar `gpu_ms`/`cpu_ms`. `Performance.TIME_*` refresca ~1x/s e le 0 sob
  `--fixed-fps`; medir wall ms em nos sentinela.
- Benchmark headless: frame dorme ~6.9 ms (`low_processor_usage_mode_sleep_usec`) — rodar com
  `--fixed-fps 60` e medir tempo de trabalho.
- Testes: GUT (`addons/gut/gut_cmdln.gd -gdir=res://test -gexit`; exit != 0 em falha) ou gdUnit4
  (`addons/gdUnit4/bin/GdUnitCmdTool.gd`, exit 100 = falhas, `-rd res://...` nunca path absoluto).
  Headless nao tem input device: `get_viewport().push_input(event, true)` chega em Controls,
  `Input.parse_input_event` nao passa por `MOUSE_FILTER_STOP`. Teste so vale se ja foi visto
  falhando (esvaziar a funcao, ver vermelho).
- Export CLI: `godot --headless --path . --export-release "<preset>" <out>`. Julgar pelo artefato
  (existe, tamanho, conteudo do .pck): `--export-pack` pode crashar no shutdown e o pack sair
  completo. Credenciais em env vars `GODOT_ANDROID_KEYSTORE_*`, `GODOT_MACOS_*`.
- MCP: no editor GUI (live tree, undo) ou no jogo rodando (eval, input). MCP que raspa o Output
  panel mente (erros de linhas que nao existem mais); preferir tools headless.
- **Um escritor por projeto.** Editor GUI aberto sobrescreve edicao headless no proximo save:
  trabalhar pelo editor (MCP) ou pedir pra fechar. Edicao so persiste com `owner` + save explicito;
  script fora do `EditorUndoRedoManager` nao entra no undo. `.tscn` com merge conflict passa em
  `ResourceLoader.exists` — carregar pra validar.

## Arquitetura (scenes, nodes, signals, Resources)

- Regra de ouro: "call down, signal up, event out". Cena que sobe a arvore (`get_node("/root/")`,
  `../`) acopla a uma arvore so. Event bus autoload guarda so signals, sem estado.
- `_ready` roda filhos antes do pai: estado mora alto na arvore e e injetado pra baixo.
- Definicoes em Resources tipados custom (nao Dictionaries); um `class_name` por arquivo, default
  em todo param de `_init`. Resource carregado e instancia compartilhada: tratar como read-only;
  copia por instancia = `duplicate()` (flat) ou `duplicate_deep(DEEP_DUPLICATE_ALL)` (sub-resources
  externos; `duplicate(true)` nao copia externos desde 4.5).
- Nunca listar pastas em runtime: scan funciona no editor e quebra no export (`.pck` so devolve
  `*.remap`). Construir registro em edit time ou `ResourceLoader.list_directory`. Case-sensitive
  no pack: snake_case em tudo.
- Save = dados, nunca codigo: `.tres` em `user://` executa GDScript embutido no `load()`;
  `str_to_var`/`ConfigFile` tambem constroem objetos. Usar JSON envelope (`format`, `version`,
  `data`) com `JSON.from_native`/`to_native` (preserva int, StringName, Vector3), escrita atomica
  (`.tmp` → rename), migracao por versao.
- Input: tabela unica → `project.godot`, todo evento `device = -1`, bind por `physical_keycode`
  (keyboard reporta device 16, mouse 32 em 4.7). Rebinds em runtime: JSON/ConfigFile, nao
  InputEvent resources.
- Tipagem estatica como gate: warnings sobem a error (nivel 2). `as T` retorna null quieto;
  `var l: Label = node` aborta com erro claro. `:=` em `get_node` infere `Node` — declarar tipo.
- `preload` e referencia forte: mantem a cadeia viva enquanto o script existir. `load()` em
  `_ready` libera quando o node morre. Nivel em `instantiate() as BaseLevel` com checagem `is`.
- Flip 2D: `flip_h` + espelhar markers — `move_and_slide` reescreve `scale.x = -1` como rotacao.
- Layout: `Main > Systems; World(pausable) > LevelRoot, EntityRoot, EffectRoot; CanvasLayers
  HUD/Pause/Transition/Debug`. Level expoe spawn markers, nunca possui o player. Trocar de nivel
  fora de callback de fisica (deferrer).

## 2D

- Feel e numero: gravidade e take-off da altura de pulo (multiplo do tile) e tempo ao apice;
  compensar `g*dt/2`. Coyote/buffer em ticks inteiros, nao segundos float. Top-down: `move_toward`,
  nunca aritmetica de length (vibra).
- Camera2D e projetada: lookahead, damping, re-baseline no pouso, shake com off; `process_callback`
  default Idle — com interpolacao off, setar `CAMERA2D_PROCESS_PHYSICS`. Zoom via `Camera2D.zoom`,
  nunca redimensionar viewport.
- Pixel-perfect: `viewport` + `keep` + integer + Nearest; base 640x360 (ou 320x180) escala inteiro
  pra 720p/1080p/1440p/4K. Ship Exclusive Fullscreen (mode 4) — Fullscreen comum derruba o fator
  numa faixa de 1 px.
- Tiles: TileMapLayer por camada (TileMap/ParallaxLayer deprecados desde 4.3), TileSet externo,
  terreno 47-blob ou dual grid de 16; pintar o lado da terra; peering bits derivados do alpha.
- Uma collision layer por objeto, varias masks; nomear layers em `layer_names/2d_physics/layer_N`.
- Sprite gerado: detectar pixel scale/grid phase, snap, registrar clip na linha dos pes; key-color
  precisa `fix_alpha_edges` ou fringe magenta sob filtro linear. Origem nos pes pra y-sort.

## Mundo 3D

- Direcao camera-relativa: zerar Y antes de normalizar, senao olhar pra baixo anda devagar.
- CharacterBody3D + escada: snap-up via `body_test_motion` + ray no degrau (a capsula so toca a
  quina; tomar altura do travel sobe degrau acima do limite). Guardar snap-down com ray de chao.
- CSG pra graybox, depois bake; nunca animar (custo segue o operando; operando aberto e ignorado
  em silencio).
- Sufixos de import: `-col` trimesh, `-convcol` convexo, `-colonly` so corpo, `-noimp` some.
  Trimesh so pra geometria estatica; props e dinamicos: box/convex.
- Post-import script roda fora da arvore: `global_transform` retorna identidade,
  `reparent(n, false)`, owner manual ou nada salva. SpringArm3D: SphereShape3D r~0.3, pivot
  `top_level`, `add_excluded_object(player)`.
- GLB de IA (Tripo/Meshy/etc): chegam em escala arbitraria, pivot centrado, double-sided,
  metallic 1.0, 4K textures — normalizar por manifest (altura, pivot, facing +Z, colisao, budget).
  Decimar antes de importar; LOD nao salva 1M tris.
- Terrain3D: `change_region_size()` dentro da arvore (setar a propriedade e ignorado), regioes
  256/512, alinhar ao grid; dados em `.res`, nao `.tres`.
- Streaming: `unload_radius > load_radius` (histerese) ou cells ficam carregando/descarregando.
- MultiMesh so em run windowed: headless nao escreve o buffer e a cena salva vazia.

## Animacao

- Medir o movimento: ground speed que nao desliza vem do clip, nao do chute; escala com
  `Skeleton3D.motion_scale` em retargets (re-medir por corpo).
- Codigo decide, AnimationTree apresenta: controller funciona sem a arvore; tree le estado via
  advance expressions (`advance_expression_base_node`).
- Transicoes: `advance_mode = ADVANCE_MODE_AUTO` — o default Enabled nunca dispara por expressao.
  Duas transicoes verdadeiras no mesmo frame: `priority` menor vence.
- OneShot/Add sem filtro com clip parcial: blending deterministico (default da tree) snapa ossos
  nao listados pro RESET = T-pose. Filtros definem layers, nao tracks faltantes.
- Import: `animation/import_rest_as_RESET` (import nao traz RESET); BoneMap com nomes importados
  (`mixamorig:` vira `mixamorig_`), `:` invalido em bone name.
- Drivers: locomocao por velocidade com clips in-place; root motion so pra one-shots (dodge,
  climb) e com osso Root de verdade, nao Hips.
- IK (4.6+): TwoBoneIK3D/FABRIK/CCDIK/SplineIK sao SkeletonModifier3D, settings por indice;
  SkeletonIK3D deprecado. Ler resultado em `skeleton_updated`/`modification_processed`, nunca em
  `_process` (le a pose animada). Output de modifier e rolado a cada frame — pose persistida
  precisa SNAPSHOT/RESTORE.
- Tweens: guardar referencia e `kill()` (dois numa propriedade escrevem juntos). Conferir por
  sheets de pose em tempos fixos (seek + step), nunca captura em tempo real.

## Gameplay

- Crowd nao e gargalo cedo: 200 CharacterBody3D + avoidance ~2 ms/frame; linear ate ~800.
  Avoidance compra correcao (0 overlaps), nao velocidade. Server agents + MultiMesh so quando os
  agentes nao precisam de nodes.
- Navmesh 4.7 e async: nao esperar "um physics frame" — ler `region_get_iteration_id`, esperar
  mudar, mais um sync. Bake por grupo de colliders estaticos: o default (Both) deixa NPC escavar
  buraco no mapa.
- NavigationAgent3D: avoidance exige `target_position`; uma chamada de `get_next_path_position()`
  por physics tick, nenhuma depois de `is_navigation_finished()` (retorna o ultimo ponto e o
  agente rasteja); `path_desired_distance` > um tick de deslocamento + float do navmesh.
- IA por tier: enum brain pra crowds, FSM de nodes pro heroi, behavior tree (LimboAI) quando
  designer autora. Pensar a ~5 Hz com cap por tick; distancia ao quadrado pras faixas
  (`is_on_screen` falso headless).
- Combate: hitbox maska, hurtbox e layer; um HitLog por swing (areas novas batem no proprio
  dono). `monitoring=false` dentro de `area_entered` crasha — `set_deferred`.
- Projeteis: dados ray-swept ou RigidBody3D com `continuous_cd` (sem CCD atravessa parede a 30
  m/s; Jolt trava em 500 m/s). Layer propria ou 1000 corpos viram 100+ ms.
- Procedural: dados com seed primeiro, validadores, depois geometria + bake + path.

## UI

- Base size pros extremos: 720x720 quadrado + `canvas_items` + `expand` + orientation `sensor`
  cobre phone portrait e 4K com uma escala so. Base 1920x1080 = botoes minusculos em portrait.
- Containers posicionam, anchors fixam: `set_anchors_and_offsets_preset` (anchors sozinho mantem
  offsets); elemento de canto precisa `grow_*` ou texto longo sai da tela. Expand sem Fill deixa o
  espaco vazio.
- Um Theme resource construido em codigo, type variations em vez de overrides por no; StyleBox e
  Resource compartilhado (override reusado muda os dois nos).
- Foco explicito: nada tem foco no start; `grab_focus()` no default, menu stack devolve foco ao
  opener. `ui_accept`/`ui_cancel` em 4.7 so tem teclas — adicionar Joypad 0 e 1.
- HUD passivo: root `MOUSE_FILTER_IGNORE` (STOP full-rect engole `_unhandled_input`), muda por
  signals, nao `_process`; string identica e early-out, o custo e o texto novo.
- Texto e chave, nunca literal: placeholders nomeados, `tr_n()` plural, contexto pra homonimos.
  Pseudolocalizacao: `expansion_ratio` default 0 — setar 0.3-0.4 + `reload_pseudolocalization`.
- Safe area: MarginContainer recomputando em `size_changed`; MSDF pra texto em escala variavel.
  Verificar headless (`root.size` aplica o stretch em qualquer tamanho), capturar windowed.

## VFX + game feel

- Efeito e camadas de sistemas pequenos; a cabeca do projetil e shader mesh com HDR > 1, nao
  particles. Explosao = flash, fogo, fumaca, sparks, debris, shockwave, luz.
- Settings de particle falham em silencio: cor/alpha precisam `vertex_color_use_as_albedo`; escala
  em billboard precisa `billboard_keep_scale`; trail precisa `trail_enabled` + Ribbon/Tube +
  `use_particle_trails`; AABB do sub-emitter nao herda. Auditar em codigo.
- `visibility_aabb` e culling E area de colisao; `capture_aabb()` ignora escala da particula —
  medir dentro do level.
- Tier por renderer, nunca `amount_ratio` (esconde sem economia): Compatibility derruba decals sem
  aviso e loga warnings pra trails/sub-emitters; CPUParticles como fallback.
- Particles nao tocam fisica: hit de gameplay = ray varrido por tick; colisao de particula =
  GPUParticlesCollision, passo = velocidade / `fixed_fps` (30 default).
- Replay com `restart()`, nao `emitting = true`. Determinismo: `use_fixed_seed` +
  `request_particles_process(t)`. Hit-stop: `Engine.time_scale` baixo + timer que ignora
  time_scale; shake = noise suave com decaimento.

## Shaders (.gdshader)

- Texto primeiro (`#include`, loops, diff limpo); VisualShader construido em codigo e salvo como
  `.tres` quando humano quiser grafo (port names nao expostos — checar `get_code()`).
- Compilar headless por renderer, desenhar windowed: stencil lido em pass opaco e fog shader em
  Compatibility so falham na hora de desenhar; locais nao inicializados nunca falham — lint.
- Espaco mundo/objeto > UV de mesh (dissolve, vento, agua, triplanar). Por objeto em material
  compartilhado = `instance uniform` (max 16, sem sampler/array).
- Escrever `ALPHA` ou ler screen/depth texture move pro pass transparente: perde sombra e sorting.
  Dissolve = `ALPHA_SCISSOR_THRESHOLD` (fica opaco, sombra dissolve junto).
- HDR edge: cor > 1.0 + `EMISSION` + Glow no WorldEnvironment, os tres juntos.
- `source_color` em uniform de cor e sampler de cor; nunca em normal/roughness/mask. Uniform
  buffer 16 KB mobile / 64 KB desktop; vec3 pad a 16 B.
- `TIME` reseta em 3600 s e ignora pause — tempo de gameplay via global uniform escrita por
  autoload (`RenderingServer.global_shader_parameter_set`).
- `#include` so `.gdshaderinc`. Fullscreen quad: `POSITION = vec4(VERTEX.xy, 1.0, 1.0)`. Em
  canvas_item, `COLOR` ja carrega textura × modulate — nao multiplicar de novo.
- Global uniform precisa estar registrada em `[shader_globals]` antes de salvar; fora disso
  compila e le o valor de outra global.
- Shader baker (4.5+): so funciona num export com rendering device — export `--headless` empacota
  nada extra, em silencio. Compute na tela: Texture2DRD no RenderingDevice principal dentro de
  `call_on_render_thread`; resultado pra CPU = local device, liberar todo RID.

## Rendering e lighting

- Renderer decide o resto: Forward+ desktop, Mobile phones, Compatibility web/low-end. Lightmaps
  pra estatico (mais barato longe), SDFGI pra mundo aberto dinamico (converge em ~30 frames),
  VoxelGI pra medio porte. Nunca SDFGI + VoxelGI juntos.
- Environment novo vem Linear: setar AgX (ou ACES) e reajustar exposure. AgX e o mais caro —
  pesa no mobile.
- `fallback_to_opengl3` default true: fallback silencioso desde 4.4; `false` no PC pra falhar
  alto. Mobile ignora SDFGI/VoxelGI/SSR/SSAO/SSIL/volumetric fog; Compatibility idem menos SSAO —
  um WARNING por feature no load.
- Bake de lightmap: `LightmapGI.bake` nao existe via script — job `-e` windowed aperta o botao.
  Luz escondida ainda bakes: `Bake Mode Disabled`. Mesh precisa UV2 (`Static Lightmaps` no glTF).
- Shadow: varrer `shadow_normal_bias` depois `shadow_bias` (0.05 vs default 0.1); max distance no
  alcance jogavel; Cull Mask nao para sombra — desligar Cast Shadow na mesh.
- Volumetric fog: qualidade em Project Settings (64 pouco, 256 bom; 512 ≈ +3.9 ms a 1080p);
  god rays = anisotropy ~0.7 + length curto + Volumetric Fog Energy na luz heroi.
- CompositorEffect = GLSL compute (nao `.gdshader`): padrao com storage image loga 170+ erros no
  Mobile (color buffer sem storage bit) e Compatibility ignora em silencio. Ship so em Forward+.
- `gi_lightmap_texel_scale`, nao `lightmap_scale` (removido). Reversed-z desde 4.3;
  `#if CURRENT_RENDERER == RENDERER_COMPATIBILITY` pra NDC. GPU time: Metal = 0, usar Vulkan.

## Audio

- Headless nao e mudo de verdade: Dummy driver mixa em tempo real a 44.1 kHz — peak meters e
  `AudioEffectCapture` funcionam. Timing exato: render offline via `mix_audio()`.
- Mix como dados: layout de buses nomeados (Music, SFX…) salvo no file de
  `audio/buses/default_bus_layout`; referenciar por nome — player cujo bus sumiu le "Master" e
  ignora o slider.
- Audio de combate = nao tocar sons: pool com cap por tipo, raio (~2 plays por raio), cooldown
  (~25 ms) e takes randomizados; sem cooldown todas as voices disparam no mesmo tick e o mix
  pulsa. Sem cap: 200 inimigos = +32 dBFS antes do limiter.
- AudioStreamInteractive: matriz de transicoes auditada par a par (par faltante = fade de um beat,
  nao corte). "Hold" vai na transicao que SAI do clip de retorno; no sentido contrario a musica
  morre depois do stinger.
- `area_mask` default 0 em 4.7: reverb/occlusion de Area3D nao faz nada ate setar 1. Sem
  Camera3D/AudioListener3D current, todo 3D sai a -200 dB sem erro. `AudioEffectLimiter`
  deprecado → `AudioEffectHardLimiter`.
- Web: playback default Sample ignora efeitos de bus — marcar Stream nos players que precisam.

## Multiplayer

- Autoridade por objeto, decidida antes: co-op casual pode client-authority; competitivo =
  servidor simula, cliente so manda input (senao cheat cola).
- Nome do node do player = peer id; `set_multiplayer_authority(name.to_int())` em `_enter_tree`
  (propriedade sincronizada ainda le 0 la). `add_child(node, true)` ou nascem nomes `@Node@2` e
  "node not found" no RPC.
- Todo RPC `any_peer` e request: `get_remote_sender_id()` ANTES de qualquer `await` (depois le 0),
  checar dono e valores possiveis.
- Checksum de RPC compara so nomes de metodo: nome faltando de um lado = "rpc node checksum
  failed" nos dois e chamadas casadas por indice (cliente chama `b`, servidor roda `a`). Um
  script por node path nos dois lados. Testar com 3+ processos e latencia injetada (UDP proxy)
  — localhost e 2 players escondem bugs.
- Banda e input de design: ALWAYS manda todo frame; ON_CHANGE e reliable e custa mais que ALWAYS
  com valores em movimento. Servidor headless nao tem cap de fps (~145 → 2.4x a banda):
  `--max-fps` ou `replication_interval`.
- Dedicated server = mesmo projeto exportado em modo "dedicated server" (forca headless + audio
  dummy; Strip Visuals tira texturas do pack). `create_server` fora de `assert()` — release stripa
  o corpo do assert e o server nunca escuta.
- Web = WebSocket atras de TLS (`wss://`); ENet nao roda no browser, WebRTC precisa signalling +
  extensao nativa no desktop. Aba em background para `_process` e derruba o socket: reconectar.

## Performance e export

- Classificar antes de otimizar: frame = max(CPU, GPU); cortar draw calls nao mexe em GPU-bound.
  Pass em meia resolucao diz se fill-rate e o problema. Logar
  `RenderingServer.get_video_adapter_name()` (laptop hibrido pode ir na iGPU; `--gpu-index N`).
- Custo comum e nodes, nao pixels: `_process` por no, milhares de nodes. MultiMesh + shader no
  lugar de MeshInstance repetido; centralizar ticking; fase aleatoria em trabalho periodico.
  Auto-instancing so no Forward+ (Mobile manteve 2501 draws); Label3D = 2 draws por label.
- Occlusion e raster de CPU: OccluderInstance3D boxes por parede grande; julgar por objects drawn.
- Hitch = load, pipeline compile, bake em runtime: `load_threaded_request` + instantiate off-main,
  shader baker no export, monitorar `PIPELINE_COMPILATIONS_*` por frame.
- Export: templates da versao exata; Android JDK 17 + SDK paths (semeados so na criacao do editor
  settings; `--install-android-build-template` so junto com comando de export). iOS exporta
  projeto Xcode (`export_project_only`), depois `xcodebuild`. macOS: `import_etc2_astc` +
  bundle id valido; `codesign --verify --deep --strict`.
- Web: so Compatibility, single-thread por default; threads = COOP `same-origin` + COEP
  `require-corp` via HTTPS (sem headers nem boota). itch.io serve sem compressao — orcar bytes
  reais. C# nao exporta pra web.
- Telemetria minima: custom monitor como metodo bound (lambda congela e crasha no exit), sentinel
  nodes pra `_process`, soak no device real 20-30 min.

## Pipeline e automacao

- Escrever `.import` sidecars ANTES do primeiro import (`[remap] importer=...` + `[params]`):
  headless `--import` honra e evita reimport dobrado. Parametros por arquivo via
  `EditorScenePostImportPlugin` (roda headless quando o plugin consta no `project.godot`).
- GLB de IA nao se detecta por `asset.generator` (diz "Blender I/O") — so manifest. Encaixar por
  altura do manifest; props de DCC ficam no tamanho autoral.
- `.gdignore` vazio (sem patterns) esconde pasta do importer, nao do `load()`.
- gdUnit4: exit 0 pass, 100 falhas, 103 headless recusado; `-rd res://...`. GUT: suite com falha
  plantada deve sair vermelha uma vez. Excluir testes/addons de dev do preset
  (`exclude_from_export`).
- Plugins ligam/desligam editando `[editor_plugins]` no `project.godot`, nao por job `-e`.
  GDExtension so carrega depois que `--import` escreve `.godot/extension_list.cfg`.
- EditorScript: `_run()` via job `-e`, abrir cena por `EditorInterface.open_scene_from_path`,
  esperar frames, `save_scene()`; mudancas por `EditorInterface.get_editor_undo_redo()`. Owner em
  todo node novo.
- Bump de `_get_format_version()` sozinho nao reimporta: job `-e` com `scan()` +
  `reimport_files()`. `ResourceLoader.exists` nao prova import bom — ler `valid` no sidecar.
- `ProjectSettings.save()` reescreve `project.godot` sem header e sem defaults: reler Jolt e
  stretch depois.

## Armadilhas Godot 4.7

- Exit code mente em tudo: parse error, `--check-only`, export crashado no shutdown — ler log e
  artefato. Flags desconhecidas sao ignoradas; `-d` espera stdin; `--script` com path errado sai 0.
- Headless nao: desenha nada, sem input device, sem MultiMesh/GPUParticles buffer, sem
  `LightmapGI.bake`, `is_on_screen` sempre falso, `audio` so via Dummy (que mixa de verdade).
- Deprecados/nomes mortos (parse ok, comportamento errado): `KinematicBody2D`, `YSort`, `TileMap`,
  `ParallaxLayer`, `set_cellv`, `Camera2D.current`, `SCREEN_TEXTURE`, `hint_color`,
  `WORLD_MATRIX`, `yield`, `EditorScript.get_scene`, `LightmapGI.lightmap_scale`,
  `AudioEffectLimiter`, `get_rpc_config` (→ `get_node_rpc_config`), `overwrite_axis` em `.import`.
- `queue_free()` em autoload nao crasha em 4.7.2: todo acesso seguinte e "previously freed" — reset
  state, nunca free.
- Clones do mesmo projeto compartilham `user://` por nome: renomear `application/config/name` ou
  `isolate_user_dir`.
- Versao cliente/servidor diferentes: protocolo mudou em 4.3 — mesma build 4.7.x nos dois lados.
