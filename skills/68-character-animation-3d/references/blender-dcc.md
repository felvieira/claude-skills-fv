# Blender — DCC dirigido por agente (modelagem, rig, animacao, render, export)

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Como dirigir Blender
instalada via `bpy` headless ou ponte MCP ao vivo. Sem Blender instalada, ignorar este arquivo.
Alvo: Blender 5.2 LTS (medido em 5.2.1) — confira `bpy.app.version`; API lembrada de tutoriais
2.8x-4.2 quebra.

## Detectar instalacao

```bash
blender --version                      # PATH; primeira linha diz "Blender 5.x.x"
which blender                          # nada = fora do PATH
ls /Applications/Blender.app/Contents/MacOS/Blender        # macOS padrao
# Windows: "C:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
# Linux padrao distro: /usr/bin/blender ; tarball: /opt/blender-*/blender
```

- Sempre `blender --version` antes: `blender` antigo no PATH **recusa** `.blend` mais novo; macOS
  fora do PATH chama `/Applications/Blender.app/Contents/MacOS/Blender` direto. Playblast
  headless deve usar `bpy.app.binary_path` do Blender do usuario.
- Ponte MCP viva (Blender GUI aberto): checar se o servidor `scenario-blender` / `blender-mcp`
  responde — plugin Scenario expoe `scene_summary`; nao existe `execute_blender_code` nele.
- Add-ons: Rigify vem **desabilitado** em `--factory-startup`; testar `bpy.ops.object.armature_basic_human_metarig_add` ou habilitar antes.

## Como dirigir

**Headless (padrao; nunca abrir janela na maquina do usuario):**

```bash
blender -b scene.blend --factory-startup --python-exit-code 1 -P script.py -- args...
```

- `--factory-startup` mantem add-ons/preferencias do usuario fora do run (um add-on pode chamar
  rede ou mudar defaults). Excecao: servidor headless do plugin precisa da extensao carregada.
- Sem `--python-exit-code 1`, script que falha ainda sai com codigo 0.
- Imprimir linha final legivel por maquina; um processo Blender por vez (outras sessoes podem
  renderizar na mesma maquina).

**Live bridge (GUI do usuario via MCP/plugin):** `scene_summary` -> `object_detail` ->
`execute_python` (com `bpy` e `result = {}` pre-carregados) -> `screenshot_viewport` /
`render_still` -> `select_objects`, `set_frame`. Regras:

- `execute_python` so funciona depois do usuario habilitar "Allow connected agents to run
  Python"; `PermissionError` = pedir ou ficar nas tools especificas.
- Limite de 120 s por call (clientes morrem em 60 s): uma mudanca logica por call, idempotente,
  get-or-create por nome. Bakes, QuadriFlow pesado, turntable e render final -> headless numa
  copia salva. Call em timeout tem resultado desconhecido: rele a cena antes de retentar, nunca
  reenvie cego.
- Stage backup apos cada estagio: `bpy.ops.wm.save_as_mainfile(filepath=..., copy=True)` — copia
  separada, nao toca o arquivo aberto do usuario.
- Nunca tocar em objetos que voce nao criou; nomes sao globais ao arquivo.

**Review loop (orbit do agente):** numeros + imagem. Render sheet por estagio (silhueta, matcap,
wire, front/side/three-quarter/low), abrir toda imagem; quick look ~768 px, sheet ~1600 px.
**Nunca reportar modelo/rig/animacao como pronto sem olhar render.** Gate de entrega antes de
export: partes flutuantes, z-fighting, normals invertidas, scale nao aplicado, UV ausente —
engines cullam backfaces, render `culling=True` mostra faces viradas (magenta vaza).

## Modelagem e sculpt

- Planos sao declarados, nao "achados": cortar com meio-espacos/plane cuts; `flatten`/`scrape`
  dab segue a bola embaixo e nao cria plano.
- Estrutura antes de superficie: voxel H/40 blockout -> H/65-110 primarios -> H/130-235
  secundario -> ~H/330 detalhe. Forma antes de 100k faces; detalhe ~500k. Jaw = bloco com canto
  gonial; bigonial 0.9-1.0x bizygomatico. Review em lente longa 85-95 mm; julgar appeal.
- **Headless crashes (segfault verificado 5.2.1):** `sculpt.symmetrize`, `sculpt.mesh_filter`,
  `paint.mask_flood_fill`, `sculpt.mask_filter`, `sculpt.face_sets_*`, `object.voxel_remesh` em
  Sculpt Mode. Poll falha: `sculpt.brush_stroke`, `set_pivot_position`, `detail_flood_fill`.
  Funcionam headless: `brush.asset_activate`, Edit Mode `mesh.symmetrize`, `quadriflow_remesh`,
  multires ops. Escrever geometria via numpy/bmesh ou usar GUI via bridge.
- OpenVDB vem no 5.2 (`import openvdb`): `FloatGrid.copyFromArray` + `convertToQuads`.
- Hard-surface: cortes primeiro, bevel depois, normals por ultimo. Boolean acima do micro bevel
  (30 graus, Harden Normals, Miter Arc); Weighted Normal no fundo. Solver `'EXACT'` (FLOAT deixa
  non-manifold em coplanar). Parede/sulco/faca menor que 2x largura do bevel clampa o objeto
  inteiro. Scale 1.0 obrigatorio em tudo com bevel/solidify/array.

## Retopologia

- Mapear primeiro (edge flow, articulacao, landmarks), construir depois. Loops fecham em volta de
  olhos, boca e juntas; polos (valence 3/5) so onde nada se move — nunca em crease loop, rim de
  shell ou linha central da face. Espiral ao redor de olho/labio = refazer.
- Articulacao: 3 loops por junta; palpebra = 2 loops + ~4 de largura; upper = lower no anel.
  Cada unidade de reducao de anel custa 4 polos.
- QuadriFlow serve para estatico/scan/bake-only e como **base** para massas lisas — nao faz loops
  de olho/boca, rasga orelhas finas, e `symmetry=True` default erra metade em mesh posado.
  `quadriflow_remesh` exige manifold; falhar -> voxel fallback. Nao relaxar auto-remesh (encolhe
  pontas).
- Julgar a **superficie subdividida**, nao a cage: cage snapada afunda ao subdividir (fit com
  fator suave; Shrinkwrap offset piora cavidades; Apply Base overshoot).
- Game low poly: silhueta + loops de animacao; cabeca ~3x densidade do corpo; quads torcidos
  triangulados a mao; low poly levemente acima do high; todo hard edge e seam de UV.
- Calibracao Studio: 99.9%+ quads, 0-4 polos valencia 6+ (justificar cada), head ~2 mil faces,
  corpo 9-16 mil, game character <10k tris (cabeca 2-3k, corpo 5-6k).

## UV e baking

- Aplicar scale antes de tudo ("conserta a maioria dos problemas"). Seams seguem o metodo de
  texturing: painting 3D/bake = mais seams toleraveis; **todo hard edge e seam** ou o normal map
  racha. Shell fechado precisa de 1 corte; ilha com buracos flata bem (test-unwrap antes de
  cortar).
- `uv.unwrap` default 5.2 = CONFORMAL (distorcao de area; falhar mantem UVs antigas e repacka).
  Passar `method=` sempre; MINIMUM_STRETCH da densidade mais uniforme.
- Texel density antes de tamanho de textura: FPS 10.24 px/cm, arma 20.48, third-person 5.12,
  top-down 2.56. Prioridade segue camera (face/maos alto, solas/boca baixo). 10-20% de mismatch
  invisivel; nunca escalar set denso para cima.
- Pack: straighten (Follow Active Quads) -> equalize -> pack CARDINAL. Gap = res/128 (16 px em
  2K), margin FRACTION = gap/(2*res). Coverage >= 70-75% por tile 0-1. UDIM: pack primeiro, mover
  tile depois.
- Bake: medir projecao, nao chutar extrusao — rays partem do low e `max_ray_distance` conta a
  partir do ponto extrudado; ray = extrusao + profundidade para dentro. Extrusao unica global
  inverte texels em partes finas vizinhas (orelha na cabeca): bake adaptativo ou por par, ou
  explode. Teste em 512, final em 2048+; samples 16 normal / 128 AO.
- Target node **selecionado E ativo** ou `bpy.ops.object.bake` retorna CANCELED sem erro (5.0).
  AO com outros objetos render-visible = AO preto. AO distance ~0.2x diagonal do asset. Low com
  Multires residual gera normal quase flat: render levels 0 para o bake.
- Julgar bake em pixels: blue < 0.5 = ray bateu no lado de tras; exatamente flat = ray errou; AO
  todo branco = distancia pequena. UVs empilhadas dentro de 0-1 -> ultima ilha vence; mover
  copias um tile para fora. Hard edge dentro da ilha = linha de crack.

## Shading e texturing

- Data maps sao **Non-Color** (normal, roughness, metallic, height); so base color e emission
  sRGB. Metallic binario 0 ou 1; specular 0.5; cornea shadow off (thickness default amplifica
  iris no EEVEE).
- Normal map OU displacement, nunca os dois (codificam o mesmo relevo). Bump Distance = altura
  real do mapa (~0.001-0.01), nao 1.0. Normal map + displacement juntos = flag.
- Mascaras em grayscale dirigem tudo (Mix/HSV Factor): cor mora nos inputs A/B; rampar contraste
  ou efeito mal aparece. Roughness edita via HSV Value; micro-detalhe de pele vai na roughness,
  nao no bump.
- Bevel, AO, Pointiness e Random Per Island sao **Cycles-only** — EEVEE nao mostra; threshold em
  mask viva gera metallic fracionado grafitado. Bake antes de thresholdar.
- SSS segue anatomia (orelha, nariz, labios alto; osso baixo). 5.2 Random Walk rescalou: scale
  0.005-0.04 m; valores antigos (0.02-0.15) ficam waxy.
- Julgar honesto: Standard view, fundo cinza, Base Color preto para ler roughness, backlight e
  luz de baixo; EEVEE itera, Cycles e verdade — devem casar.
- `surface_render_method` substitui `blend_method`; Principled v2: sockets por nome, Emission
  Strength default **0** (glow morto); `material.displacement_method`; `use_nodes` deprecated.
- Texture paint: brushes sao assets; sessao factory pinta PRETO ate setar cor; strokes projetam
  da tela; bleed 8-12 px; imagens nunca salvam junto com .blend — `save_image` explicito.

## Hair

- Guias espacadas uniformes com 2 pontos ate a direcao estar certa (3 fur curta, 8 cabelo longo,
  resample 15 para humano longo). Interpolate **sempre** com Density Mask: filho longe de guia
  faz o que quer (falhas viram bald spots que abrem na pose).
- Densidade conta por m2 e e gigante: fur longa ~1.000.000/m2 com radius ~0.2 mm; viewport 4%
  para trabalhar, mas **julgar render em densidade plena**. Aleatorizar por curva, nao por ponto
  (~80% sem frizz; strays = 10% das curvas com noise forte).
- Camadas procedurais mascaradas (Noise, Curl, Clump, Frizz, Trim, Rotate); cada camada prova
  seu lugar em render A/B. Trim: Replace Length off + Random Offset ou todo fio vira 1 m. Frizz
  com Shape negativo ou destroi pontas de curl/clump.
- Cabelo humano: cap separada cortada na partilha; Part by Mesh Islands ligado (21% das criancas
  cruzam a partilha sem ele, 0% com). UVs nao sobrepostas e scale aplicado antes (bind usa UV;
  densidade conta area local).
- Blender 5.2: `sculpt_curves.brush_stroke` sem exec retorna PASS_THROUGH — escrever posicoes
  como data ou delegar ao usuario. Hair Dynamics modifier substitui Surface Deform, fica por
  ultimo na stack. Principled Hair BSDF fica escuro no EEVEE: usar Principled BSDF com cores.
- Cards para games: curva -> mesh em copia, cap texturizado embaixo; alpha EEVEE via
  `surface_render_method = 'DITHERED'`.

## Rigging

- Posicionamento e a especificacao: juntas no centro do volume que movem (nao no esqueleto
  anatomico); joelho/cotovelo com pre-bend 1-3 graus (curvatura da cadeia = plano IK); rolls
  colocam cada dobradica num eixo local.
- Rigify: metarig e fonte, rig gerado e descartavel — todo fix vai no metarig e regenera.
  Erros comuns: "bone position is disjoint" (mover juntas como unidade), "Expected 2 eye
  corners". Regenerar preserva nomes de controle, weights e animacao.
- Automatic weights **falham em silencio**: `parent_set` retorna FINISHED com warning de heat
  fail. Medir vertices sem weight; fallback = proxy voxel + Data Transfer. Vazam entre pernas/
  axilas: strip pesos .L da metade direita.
- Weights julgados em movimento, firme melhor que borracha: 2-3 bones por seam, pecas rigidas
  a 1.0 nunca pintadas. Armature DEPOIS de Mirror e ANTES de Subdivision. Roupas recebem weight
  da mesma fonte (transfer **aplicado**, nao live).
- Export manda nas ferramentas: twist = 4 bones segmentados, nao Preserve Volume; Corrective
  Smooth e B-bone sao Blender-only. Max 4 influencias por vertice para engine.
- Shape keys por nome exato: ARKit = 52 nomes (`jawOpen`, nao `JawOpen`), visemes 15 (`sil` a
  `U`); chave igual ao Basis nao anima nada. Esculpir Left, espelhar Right. `shape_key_add` deixa
  valor 1.0 no 5.2.1 — zerar antes de dirigir. `VertexGroup.remove` com indice fora de range
  **crash** 5.2.1.
- `EditBone.transform` em bone conectado move a ponta compartilhada duas vezes: usar
  `transform_bones`. Driver em bone animavel mata canal de key: usar Transformation ou Copy
  Rotation Mix Add. Bone collections substituem layers (4.0); `edit_bones.new()` nao entra em
  colecao nenhuma.

## Animacao

- Ficar stepped longo: poses-chave + breakdowns feitos a mao; spline e curto e tardio e so no
  corpo — face e dedos ficam stepped ate o proprio passe. Nunca converter blocking inteiro para
  Bezier (drift medido de 84% no proximo movimento); usar pillars (copiar pose no fim do hold).
  Contato dentro de movimento continuo (pouso de pulo) nao e hold: pillar ali corta velocidade.
- Poses em frames impares com gaps pares (existe frame do meio real); snaps sao autoral (2-3
  frames apos hold); handles sao decisao de timing: AUTO_CLAMPED em holds, VECTOR em
  contatos/decolagens, FREE para burst spacing.
- Gravidade real a 24 fps: aceleracao 0.01703 m/frame2; cabeca nunca gira num eixo so; eye dart
  1-2 frames, lidera a cabeca; M/B/P fecha >= 2 frames antes do som.
- Gates medidos: foot_slip < 1 mm; lowest_point nunca abaixo do chao; hold_drift ~0;
  limb_extension < 0.99 quando deveria dobrar; sujeito >= 12-15% da altura do frame; arcos
  limpos em pixels de camera (`to_camera` com res real, nao coords normalizadas — aspecto achata
  x e cria falsos cotovelos).
- 5.2 animacao: `action.fcurves` nao existe — channelbags via
  `bpy_extras.anim_utils.action_get_channelbag_for_slot(action, slot)`; action so anima se slot
  casar (senao setar `ad.action_slot`). Uma layer por action. `keyframe_points.insert` gera
  BEZIER AUTO_CLAMPED.
- Headless: `anim.keyframe_insert` falha; `pose.breakdown`/`blend_to_neighbor` precisam
  `prev_frame`/`next_frame` explicitos; `render.opengl` recusa — playblast e render Workbench
  (`scene.display.light_direction` e camera-relative; converter apos `view_layer.update()`).
  Audio no playblast: sound strip + `render.ffmpeg.audio_codec = 'AAC'`.

## Geometry nodes

- Field e pergunta adiada, nao dado: avaliada pelo node que consome, no dominio dele. Duas
  atualizacoes acopladas (posicao + velocidade) precisam de UM Capture Attribute ou a segunda le
  o valor novo da primeira. `float > 0` e true — selecao subdividida sangra; usar epsilon.
- Simulacao so quando historia importa: funcao do tempo usa Scene Time (scrub/sub-frame de
  graca). Loops sao ultimo recurso: sem acceleration structures.
- Tudo e object-local: direcao do mundo via Self Object > Object Info > Invert Matrix >
  Transform Direction, ou o efeito gira junto com o objeto.
- Ferramentas, nao arvores: toda dependencia de cena e Group Input; hard-ref a objeto dentro de
  asset quebra na reutilizacao.
- `tree.links.new` entre arvores retorna None sem erro (nada linka). Input de modifier:
  `md.properties.inputs.<Socket_N>.value` (o antigo `md["Socket_N"]` da TypeError) **mais**
  `obj.update_tag()` — headless fica stale sem o tag. Menus viraram sockets (Transform Geometry
  `Mode`='Matrix').
- `bound_box` avaliado ignora instancias; position do point cloud de instancia le zeros — usar
  `instance_transform`. Simulation jump alem do cache calcula um passo so; bake funciona
  headless. Assets em `datafiles/assets/nodes/geometry_nodes_essentials.blend`.
- Same Seed em dois Random Value = correlacao 1.0 (scale e rotacao se movem juntos): offset
  seeds. Join Geometry: ultimo link criado entra primeiro.

## Grease pencil (v3)

- Objetos `GREASEPENCIL`, data em `bpy.data.grease_pencils`; strokes sao curvas com atributos —
  escrever como data. `frame.strokes`, `point.co`, `GPENCIL`, `grease_pencil_modifiers` sumiram;
  modifiers sao normais (`'GREASE_PENCIL_NOISE'`, Line Art = `'LINEART'`).
- `grease_pencil.brush_stroke` e `sculpt_paint` nao tem exec: chamados com stroke list logam
  "Invalid operator call" e nao desenham nada (GUI verificado). Editar via ops de Edit Mode
  (`stroke_smooth`, `set_uniform_thickness`) ou data.
- Fill e geometria: `fill_id != 0` preenche; ids iguais preenchem juntos com holes even-odd;
  `hide_stroke` esconde so o contorno. Material fill toggle deprecated. `attributes.new("radius")`
  em drawing com strokes zera radius e apaga tudo: preencher defaults antes.
- Layer nova tem `use_lights=True`: ambiente vem de `World.color` (default 0.05) — paleta flat
  renderiza a ~25% do valor. `use_lights=False` ou subir World + lamps.
- Interpolacao limpa so entre pares com mesmo numero/ordem/cor de strokes e mesmos pontos:
  checar match antes, senao redesenhar ou clip. Primeiro key em ou antes de `frame_start` (pop-in
  caso contrario). `frames.new` em frame existente raise.
- Rig cutout: um objeto por elemento fisico (~60 num lead), parent FK, sculpt como deformer —
  nunca weight painting em drawing (todo redraw requer novos pesos).
- Line Art: `radius` e largura total (pontos ganham radius/2); objetos hidden-from-render sao
  ignorados. GN Curves to GP precisa de `fill_id` INT no curve domain ou nao preenche.

## Iluminacao e render

- Separacao por valor primeiro: conferir desaturado; a area de maior contraste vira o foco queira
  ou nao — escurecer o set antes de clarear o sujeito. Key 30-60 graus fora do eixo, acima da
  linha do olho; key frontal = foto com flash (form ratio ~1.3).
- Tamanho e distancia da fonte sao os controles: fonte grande le forma e esconde poros, pequena
  le textura. Toda luz tem fonte motivada e cor do mundo; rim no lado da key (no lado da sombra
  le bounce vindo de lugar nenhum).
- EEVEE (`BLENDER_EEVEE` no 5.x; `BLENDER_EEVEE_NEXT` falha): ray tracing OFF em factory —
  luz do mundo atravessa paredes sem volume probe com samples exteriores nas paredes internas.
  Light groups so em Cycles; light linking e propriedade do objeto Light, nao do datablock
  (`obj.light_linking`).
- Cycles economico: 3 bounces, sem caustics, sem clamp, Fast GI, bounces falsificados com luzes;
  specular agudo so em olhos e metal hero.
- EXR linear ate o fim; PNG assa a view transform. AgX esconde clipping — ler o EXR (linear
  `linear_max`). Brilho global = `exposure` na view transform, nunca escalar lamps (preserva
  razoes, mundo e emissivos). Working space read-only: `bpy.ops.wm.set_working_color_space`.
- Compositor virou node group (5.0): `scene.compositing_node_group`, nao `scene.node_tree`.
  Rebalancear em comp com light groups por papel, nao re-render.
- `matrix_world` fica stale apos setar transform ate `view_layer.update()`.
- Video: `image_settings.media_type = 'VIDEO'` ANTES de `file_format = 'FFMPEG'` (5.0).

## Export para game engines

- Export so termina quando o arquivo foi **re-importado e medido** (round-trip), nao quando o
  exporter retorna FINISHED. Comparar tamanho (1 mm), tris, bones deform, root bones (um so),
  scale de armature, shape keys, actions e maps por material.
- Presets: Unity estatico `unity` FBX; Unity character `unity_skeletal`; Unreal `unreal` FBX
  (Convert Scene Unit -> cm); Unreal char `unreal_skeletal`; Godot 4 `godot` GLB; Roblox
  `roblox` FBX (20k tris/mesh, max 4 influencias, bones congelados, root na origem sem pesos);
  web/three.js `web` GLB+meshopt (nao para Godot); USD `usdc`; Quick Look `usdz` (tex 2048);
  print STL em mm (x1000).
- Meters, Z-up, frente em -Y; `scale_length` da cena em 1.0; aplicar scale de objeto antes
  (`obj.data.transform(...)` + `obj.scale=(1,1,1)`) ou vira transform do node na engine. Pivot
  no centro da base.
- FBX scale: `unity` escreve `FBX_SCALE_ALL`; `unreal` mantem `FBX_SCALE_NONE` (Unity le como
  0.01); `roblox` usa `FBX_SCALE_UNITS`.
- `add_leaf_bones` OFF sempre (leaf bones quebram retarget). Exportar armature **com** seus
  meshes; `use_armature_deform_only`; um unico root bone (Unreal recusa multiplas raizes).
  `unity_skeletal`/`unreal_skeletal` bakeiam todas as actions (um clip por action; Unity nomeia
  `Armature|Action` — nomear actions como os clips devem ler).
- Armadilha glTF->FBX: importer glTF rotearia metallic+roughness packed via Separate Color e o
  exporter FBX **dropa os dois mapas** — re-importa com Metallic 0, Roughness 0.5. Escrever
  `<mat>_Metallic.png`/`<mat>_Roughness.png` (Roblox/Unreal) ou `<mat>_MetallicSmoothness.png`
  (Unity, sRGB off) para o engine. Godot recebe GLB que guarda tudo.
- Bake Axis Conversion / Apply Transform nao removem rotacao do node armature; o primeiro ainda
  vira o personagem. LODs: `Name_LOD0..n` sob um Empty `Name` (Unity le LOD Group; Godot gera no
  import; UV-seam splits de glTF import precisam de weld antes de decimar ou LODs abrem).
- Collision: Unreal `UCX_`/`UBX_` no mesmo FBX; Godot `Name-colonly`/`-convcolonly`; Unity e
  Roblox configuram collider no editor. `extensions_required` num GLB trava loaders sem decoder.

## Blockout e previs

- Blockout para video-model (render-to-real): o modelo copia camera, framing, massas e
  trajetorias — e inventa o resto. Ambiguidade destrui o passe; crudeza nao. Identidade fixa em
  geometria primeiro (frente de veiculo marcada, nada solto perto de figura), texto depois.
- Cena: metros, Z-up, chao em z=0, raizes nos pes; prefixos de papel (`ENV_`, `FIG_`, `PRP_`,
  `CAM_`, `RIG_`); um saturated color por hero (`B.PALETTE`), set num esquema, extras em cinzas.
  Playblast todo cinza = perdeu identidade. Estacionar (nao deletar) Cube/Light/Camera default.
- `lock_format` antes de qualquer geometria: fps inteiro, frames 1..fps*seg, 1920x1080 100%. Uma
  camera por shot bound a marker `CUT_` no primeiro frame, hard cuts, zero transicao. Reframar
  movendo o aim target, nunca rotacionando a camera; uma lente por shot, sem key de lente no
  cut frame.
- Easing Bezier AUTO_CLAMPED; LINEAR so para deslocamento baked por frame (rodas). Handheld =
  NOISE F-curve modifiers (nunca jitter keyado); `animation_data_clear()` remove modifiers —
  re-adicionar apos rekeyar. Chaves passam por todo cut.
- Previs de diretor (diferente de blockout p/ video): lista de beats um-fato-por-linha antes de
  qualquer shot; teatro locked-off primeiro, depois cinematic (~1.6-1.9 s/beat); camera e lente
  travadas por A/B; um lado da action line; 10 frames por shot, keys CONSTANT; cheats keyados
  (unkeyed cheat quebra shots anteriores).
- Previs e a versao mais barata que carrega a ideia: Workbench cinzas, manequins, stills + push
  fakeado na edicao; `live` so quando o movimento e a historia. `render.opengl` falha em
  `--background` — usar Workbench `render.render` ou camera-locked viewport.
- `marker.camera = cam` binda headless (`bpy.ops.marker.camera_bind` precisa de timeline). Scene
  que nao e a da janela: `frame_set` deixa transforms stale e `write_still` usa o frame da janela.
- Audits: framing por shot, oclusao de cabeca, distancia, interpenetracao, chao (pes/rodas),
  amplitude handheld, cuts — numeros primeiro, depois olhar primeiro/meio/ultimo frame de cada
  shot. Veiculo "de re" se a frente nao estiver marcada; ocupante atras de cabine opaca some
  (alpha na cabine).

## Armadilhas (cruzam dominios — Blender 5.2)

- **Brushes sao assets (4.3):** `bpy.ops.brush.asset_activate(asset_library_type='ESSENTIALS',
  relative_asset_identifier="brushes/...blend/Brush/Clay Strips")`; `size` agora e **diametro**;
  Flatten/Fill/Scrape viraram Plane; Draw Sharp default SUBTRACT.
- **Auto Smooth removido (4.1):** `mesh.shade_smooth()` ou modifier Smooth by Angle; voxel remesh
  sai flat-shaded, mantem atributos/mask, dropa shape keys.
- **Principled BSDF v2 (4.0):** sockets por nome; Emission Strength default 0.
- **Slotted actions (4.4/5.0):** `action.fcurves` removido — `bpy_extras.anim_utils`; action sem
  slot nao anima (`ad.action_slot`). Uma layer por action.
- **Bone collections (4.0)** substituem armature layers; GP v3 e `GREASEPENCIL` + `bpy.ops.grease_pencil.*`.
- **Context dicts posicionais sumiram:** usar `with bpy.context.temp_override(...)`.
- **Modifier pinned (5.2):** `ob.modifiers.move(i,j)` recusa moves envolvendo pinned, e novos
  modifiers caem ACIMA do grupo pinned — unpin, move, re-pin bottom-up.
- **`bmesh.ops.bevel` defaults `segments=0, profile=0.0`**: passar ambos sempre.
- **NumPy 2:** `np.ptp(a)`, nao `a.ptp()`.
- **Sync select (5.0)** vem ligado; referencia `me.uv_layers[...]` e wrappers de stroke/point
  de GP morrem apos mudanca — guardar nome / re-fetch. Julgar SEMPRE por render + metrica;
  metrica passando com render errado -> render vence.
