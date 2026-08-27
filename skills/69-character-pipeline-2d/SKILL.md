---
name: character-pipeline-2d
description: |
  Skill de pipeline 2D de personagem e orquestracao geral do pipeline character-to-runtime. Cobre as
  cinco estrategias de producao de sprite/animacao 2D (3D->render ortografico->spritesheet, arte
  2D->layers->rig skeletal, video IA->frames, frame-by-frame IA, hibrido rig+replacement), o contrato
  MotionPlan.json (LLM como diretor de intencao/timing/fases/contatos/eventos — nunca como animador
  que produz rotacao de bone), geracao 2D nativa via Qwen-Image-Layered (decomposicao em camadas RGBA)
  e Qwen-Image-Edit (edicao com consistencia de personagem), SAM como refinamento de mascara (nao
  gerador primario), occlusion completion, DWPose/MMPose (pose 2D vs 3D) e o CanonicalPoseSequence
  intermediario obrigatorio, Wan-Animate como motion reference/previs (nunca fonte final de frame),
  ComfyUI como servidor de inferencia headless, ferramentas de rig 2D esqueletal (Blender Grease
  Pencil, Spine CLI, LoongBones), o CLI unificado assetctl, rasterizacao deterministica, atlas
  packing, separacao hitbox/hurtbox, integracao runtime Godot/Phaser, licenciamento e hardware, e
  testes/CI em 5 grupos com build graph content-addressed. Assume pipeline 3D ate GLB ja pronto via
  skill 68 — nao duplica retargeting bpy nem matematica de quaternion.
  Trigger em: "pipeline de personagem 2D", "spritesheet", "sprite sheet", "MotionPlan", "motion plan
  json", "LLM diretor de animacao", "Qwen-Image-Layered", "Qwen-Image-Edit", "decomposicao em camadas
  RGBA", "occlusion completion", "DWPose", "MMPose", "CanonicalPoseSequence", "Wan-Animate",
  "Wan2.2-Animate", "motion reference", "previs de animacao", "ComfyUI headless", "workflow ComfyUI",
  "rig 2D esqueletal", "Spine CLI", "LoongBones", "Grease Pencil rig", "assetctl", "atlas de sprite",
  "texture atlas", "hitbox hurtbox", "render ortografico", "camera ortografica fixa", "rasterizacao
  deterministica", "AccuRIG headless", "fronteira de certificacao do rig", "build graph content
  addressed", "pipeline de asset de jogo 2D", "derivar sprite de personagem 3D", "geracao 2D de
  personagem com IA", "integrar Skeleton2D Godot", "Phaser spritesheet atlas".
---

# Character Pipeline 2D — Derivacao, Geracao 2D Nativa e Orquestracao

Pipeline para produzir sprites, animacoes e assets 2D de personagem de forma automatizavel em CLI —
seja derivando de um personagem 3D ja rigado, seja gerando 2D nativamente via IA. Cobre tambem a
camada de orquestracao: o contrato `MotionPlan.json`, o CLI `assetctl`, e a arquitetura de testes/CI
que trata o pipeline como um compilador.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/source-driven.md` e
`policies/token-efficiency.md`.

Conteudo denso vive em `references/` — carregar so o arquivo relevante a task, nao os quatro de cara:

| Assunto | Arquivo |
|---|---|
| CLI `assetctl` completo (todos os subcomandos, exemplo end-to-end, isolamento de ambiente Python) | `references/assetctl-cli-reference.md` |
| Tabela de licenciamento completa (14 ferramentas) + classes de hardware com VRAM real | `references/licensing-and-hardware.md` |
| Os 5 grupos de teste/CI, exemplo de GitHub Actions, build graph content-addressed | `references/testing-and-ci.md` |

Esta skill **assume que o pipeline 3D ate GLB ja existe**. Para AccuRIG->Blender->retargeting->bake em
profundidade (matematica de quaternion, bpy, normalizacao de rig 3D), ver
`skills/68-character-animation-3d/SKILL.md` — aquela skill entrega `character.glb`+`animation.glb`
certificados; esta parte deles (ou de arte 2D nativa) para derivar sprites, atlases, rigs 2D, e prover
o `MotionPlan.json` que orquestra ambas.

## Quando Usar

- decidir qual das cinco estrategias de producao 2D usar para um personagem/projeto especifico
- projetar ou validar um `MotionPlan.json` — a intencao/timing/fases/contatos/eventos de uma acao,
  antes de qualquer resolucao em transform de bone
- gerar assets 2D nativos via IA (Qwen-Image-Layered, Qwen-Image-Edit) a partir de um personagem
  master, incluindo decomposicao em camadas e correcao de occlusion
- extrair movimento de video de referencia (DWPose/MMPose) ou usar Wan como motion reference/previs
  sem cair no anti-padrao de usar video gerado como frame final
- montar ou revisar workflows ComfyUI headless com provenance e versionamento correto
- escolher ferramenta de rig 2D esqueletal (Blender Grease Pencil, Spine, LoongBones) por requisito
  de automacao/licenca
- implementar rasterizacao deterministica (render ortografico -> spritesheet) ou packing de atlas
- separar hitbox/hurtbox de pixel alpha, ou integrar assets 2D em Godot/Phaser
- desenhar o CLI `assetctl` ou a arquitetura de testes/CI do pipeline de asset de personagem
- checar licenciamento de qualquer ferramenta citada nesta skill antes de redistribuir

## Quando Nao Usar

- matematica de retargeting 3D, normalizacao de rig no Blender via bpy, ou detalhe de export FBX do
  AccuRIG — `skills/68-character-animation-3d/SKILL.md`
- geracao de imagem generica sem ser parte do pipeline de personagem (hero image, OG card, icone) —
  `skills/17-image-generator/SKILL.md`
- decisao de arquitetura/balance de gameplay (nao visual) — `skills/66-game-architecture-design/SKILL.md`
- implementacao de codigo de engine em Unity/Unreal alem do que entra via GLB/atlas — `skills/67-game-engine-development/SKILL.md`

## Entradas Esperadas

- fonte do personagem: mesh 3D rigado e certificado (via skill 68) OU concept art/master 2D
- a acao/biblioteca de acoes a produzir, com intencao em linguagem natural (ex.: "ataque pesado de
  espada de cima para baixo, antecipacao clara, avanco curto")
- estrategia de producao 2D desejada, ou pedido de recomendacao com base no caso de uso
- engine/runtime alvo (Godot, Phaser, outro) para saber qual formato de atlas/rig exportar
- classe de hardware disponivel, quando a task envolve geracao generativa pesada (Qwen/Wan/SAM)

## Saidas Esperadas

- `MotionPlan.json` validado (schema Pydantic) por acao, sem ambiguidade de fase/evento/contato
- assets 2D: `frame_*.png` deterministicos, `atlas.png`+`atlas.json`, ou projeto `.spine`/rig Grease
  Pencil, conforme a estrategia
- JSON de hitbox/hurtbox por frame, separado de pixel
- manifest de provenance para qualquer output gerado por IA (workflow, model revision, seed, hashes)
- quando aplicavel: `assetctl` invocavel end-to-end e suite de teste dos 5 grupos cobrindo o asset

## Principio Central — Seis Elementos Independentes

O elemento mais importante da arquitetura **nao e nenhum modelo de IA especifico** — e a separacao
estrita entre `CHARACTER ≠ RIG ≠ MOTION ≠ MOTION PLAN ≠ GAMEPLAY ≠ VISUAL REPRESENTATION`. Com esses
seis elementos independentes, uma biblioteca de acoes (locomotion: idle/walk/run/sprint/jump; combat:
jab/cross/kick/overhead_slash/horizontal_slash/uppercut/dodge/parry; reactions: light_hit/heavy_hit/
knockback/knockdown/death) e criada **uma unica vez** e aplicada a multiplos personagens em multiplos
formatos (3D, spritesheet, ilustrado 2D, rig Spine).

O erro raiz a evitar: **nao ter multiplas representacoes concorrentes do movimento**. Deve existir
apenas um `CanonicalMotion` e um `MotionPlan` por acao — FBX certificado, GLB, animacao 2D, hitboxes e
spritesheet sao todos **derivados reprodutiveis** desses dados, nunca fontes de verdade paralelas que
podem divergir. Isso transforma IA de "gerador ocasional de imagem" em infraestrutura de producao de
asset reproduzivel, testavel e escalavel.

## AccuRIG como Fronteira de Certificacao do Rig

A documentacao publica atual do AccuRIG descreve o produto como aplicacao standalone guiada (import,
rigging, ajuste, export por interface) — **nao existe CLI/API headless publica e suportada**. Nao
fingir suporte a um comando `accurig --input foo.fbx --output foo_rigged.fbx` que nao existe. Por isso
o AccuRIG e tratado como uma **fronteira de certificacao**: mesh/personagem entra, sai um FBX rigado
certificado, e a partir dali o pipeline inteiro (Blender CLI -> Canonical Rig -> MotionPlan -> Motion
Resolver -> Retarget+Bake -> runtime) e 100% CLI/headless. Tres solucoes possiveis para o passo manual:

| Solucao | Automacao | Robustez | Recomendacao |
|---|---|---|---|
| Operador exporta FBX uma vez por corpo/topologia | ~95% | Muito alta | **Producao** |
| UI automation / RPA sobre o AccuRIG | ~100% | Baixa | Apenas laboratorio |
| Trocar AccuRIG por outro auto-rigger no lane unattended | 100% | Alta | Apenas se "zero humanos" for requisito rigido |

A primeira e a recomendacao: certificar o rig **uma vez** por corpo/topologia — animacoes posteriores
sao automaticas. Ingest do FBX no Blender (validacao de armature, bone_map) esta na skill 68; aqui o
que importa e que **o AccuRIG nunca entra no job de CI** — o CI comeca em `accurig/knight_01_accurig.fbx`
ja certificado, validado por hash (ver `references/testing-and-ci.md`).

## MotionPlan.json — LLM como Diretor, Nao Animador

**LLM = diretor, nao animador.** Um LLM que recebe "ataque pesado de espada de cima para baixo, com
antecipacao clara, avanco curto e janela ativa curta; recuperar lentamente; permitir cancel para dodge
apenas depois do impacto" deve devolver um `MotionPlan.json` estruturado com **semantica e
constraints** — nunca Euler angles ou rotacao de bone diretamente. Pedir angulos de quarenta bones a
uma LLM e um erro de arquitetura: um `MotionResolver` deterministico resolve os transforms a partir da
intencao declarada.

Tres camadas separadas, cada uma com autoridade diferente: **LLM = diretor** (produz `MotionPlan.json`
— intencao, timing, fases, contatos, root motion, eventos de VFX/hitbox, restricoes; nunca transform
final); **pose/mocap = movimento autoritativo** (DWPose/MMPose, video de referencia, ou clips
canonicos transformam a intencao em trajetorias reais de skeleton); **IA generativa de imagem/video =
aparencia e referencia**, nunca a fonte final dos frames de gameplay.

Campos do schema `MotionPlan`: `$schema`, `version`, `action_id`, `character_class`, `timebase`
(fps, frames), `intent` (category, style[], dominant_side), `phases` (anticipation/startup/active/
follow_through/recovery com start/end em frames), `motion_source` (type: reference_video, ref,
preferred_pose_backend), `pose_targets` (frame, name, constraints como `weapon_above_head`,
`weight_on_rear_foot`), `root_motion` (enabled, forward_m, vertical_m), `contacts` (effector foot_l/
foot_r, from/to frame, lock bool), `weapon` (bone, trajectory type/direction/arc_deg), `events` (frame,
type vfx/hitbox_on/hitbox_off/camera_shake/cancel_window, id/intensity/target), `render_2d` (views,
fps, hold_keyframes), `qa` (max_foot_slide_cm, require_ground_contact, require_no_self_intersection).
Schema completo comentado em `references/assetctl-cli-reference.md`.

**Validacao obrigatoria com Pydantic antes de qualquer execucao** — `Phase` valida `end >= start`,
`Timebase` limita `fps` (1-240) e `frames` (1-10000), `MotionPlan` usa `version: Literal["1.0"]`,
`action_id` com pattern `^[a-z0-9_]+$`, `character_class: Literal["humanoid"]`, e
`model_config = ConfigDict(extra="forbid")` para rejeitar qualquer campo fora do schema. Exemplo
completo em `references/assetctl-cli-reference.md`.

A LLM **nunca** deve produzir Python executavel diretamente — deve produzir dados declarativos sujeitos
a schema. Isso reduz erros E riscos de prompt injection (um `MotionPlan` malformado falha validacao
antes de tocar em qualquer subprocess; codigo executavel gerado por LLM nao tem essa barreira).

## Estrutura de Pastas e Contrato de Artefato

Estrutura por personagem: `source/` (concept + mesh + textures) -> `accurig/` (FBX certificado) ->
`config/` (`character.yaml` + `bone_map.json`) -> `motions/` (`motionplan.json` + references) ->
`build/` (`normalized.blend`, `animated.blend`, pose, frames) -> `dist/` (`3d/`, `2d/`, `manifest.json`).

`.blend` **nao e o formato do produto** — e artefato de compilacao intermediario. Preferir `.glb` a
`.fbx` para 3D final (GLB e container binario glTF; `.gltf` textual referencia buffers/imagens
externos — bom para debug, ruim para distribuicao). Contrato runtime-vs-build: apenas `character.glb`,
`animation.glb`, `rig.json`, `atlas.png`+`atlas.json` e o output nativo do rig 2D (`.spine`/`.atlas`)
vao para o runtime; `source.*`, `*_accurig.fbx`, `*.blend` e `frame_*.png` sao build/debug, nao
embarcam no jogo. `manifest.json` e recomendado em todo build. Tabela artefato-por-artefato completa
em `references/assetctl-cli-reference.md`.

O skeleton canonico usa **nomes semanticos** (`root -> hips -> spine_01 -> spine_02 -> chest ->
{neck -> head, clavicle_l -> upper_arm_l -> lower_arm_l -> hand_l, clavicle_r -> ...}`,
`upper_leg_l -> lower_leg_l -> foot_l -> toe_l`, espelhado a direita). O mapping Reallusion
(`hips -> CC_Base_Hip`, `spine_01 -> CC_Base_Waist`, etc.) fica em JSON separado. **Nunca** colocar
logica de gameplay nos nomes fisicos — o jogo conhece `hand_l`, nao `CC_Base_L_Hand`. Isso permite
trocar o AccuRIG por outro auto-rigger sem reescrever animacao, hitboxes ou VFX.

## As Cinco Estrategias de Producao 2D

| Estrategia | Recomendo para | Automatizacao | Consistencia |
|---|---|---:|---:|
| **3D -> render ortografico -> spritesheet** | muitos personagens, golpes, skins, fighting/RPG | Excelente | Excelente |
| **arte 2D -> layers -> rig skeletal 2D** | estilo ilustrado forte | Boa | Muito boa |
| video IA -> frames PNG | prototipos/concept | Facil | Fraca |
| frame-by-frame IA independente | concept/pixel art assistida | Media | Fraca sem controle |
| **hibrido rig + replacement frames** | personagem principal 2D | Muito boa | Excelente |

Se AccuRIG+Blender ja sao o centro do processo (via skill 68), 3D como fonte de movimento e 2D como
output e a arquitetura mais escalavel: o mesmo `heavy_slash_01` gera GLB animado, spritesheet lateral,
e serve de pose conditioning para o Qwen produzir versao ilustrada — **uma unica fonte de movimento,
multiplas representacoes derivadas**. O hibrido rig+replacement e o teto de qualidade para estilo
ilustrado forte sem perder consistencia: `3D -> animacao canonica -> render ortografico -> sprites
base -> Qwen style/edit -> keyframes de replacement`. A IA nao reinventa anatomia a cada frame — so
reestiliza keyframes que o rig ja posiciona corretamente.

## Geracao 2D Nativa via IA

A ferramenta mais relevante para geracao/edicao 2D nao e o SAM — e o **Qwen-Image-Layered**. Decompoe
uma imagem em quantidade variavel de camadas RGBA, com decomposicao recursiva das proprias camadas.
Apache 2.0, resolucao recomendada atual 640. Pipeline: `character_master.png -> Qwen-Image-Layered ->
coarse layers -> semantic classifier -> recursive decomposition -> SAM refinement -> canonical layers`
(ex.: `hair_back.png`, `torso.png`, `head.png`, `upper_arm_l.png`, `lower_arm_l.png`, `hand_l.png`
[espelhado para direita], pernas espelhadas, `weapon.png`, `hair_front.png`).

**SAM 3.1 e segunda passagem, nao gerador primario** — limpeza/refinamento de mascara, tracking,
isolamento de objeto. Requer Python 3.12+, PyTorch 2.7+, stack CUDA recente, ~848 milhoes de
parametros.

**Occlusion completion.** Se na imagem original um braco esta na frente do torso, os pixels do torso
**por baixo do braco nao existem** — separar so os pixels visiveis e rotacionar o braco produz um
buraco transparente. Solucao: `segmentation -> layer extraction -> expand bounding region ->
Qwen-Image-Edit inpaint hidden region -> clean alpha mask`. Qwen-Image-Edit-2511 (Apache 2.0) melhorou
consistencia de personagem, reducao de drift, multiplas imagens de input; uso via
`diffusers.QwenImageEditPlusPipeline`, `Qwen/Qwen-Image-Edit-2511`, bfloat16, lista
`[master, pose_guide]` + prompt de preservacao de identidade + seed fixo.

**Regra de ouro — nao gerar cada frame do zero.** Mau: prompt frame 01, frame 02... independentes
(drift garantido). Correto: `master + canonical pose + previous approved key pose -> Qwen edit -> nova
key pose`, e o rig **interpola** entre key poses aprovadas — a IA gera so as poses-chave, nunca os
frames intermediarios.

## Movimento a Partir de Video — DWPose, MMPose e Wan

Extracao: `ffmpeg -i video.mp4 -vf fps=30 frames/%06d.png`, depois `extract_pose.py --backend dwpose`
(2D) ou `--backend mmpose-3d` (3D com profundidade). DWPose (Apache 2.0, variantes tiny/small/medium/
large) e whole-body pose estimation essencialmente **2D** — excelente para sprites, mas inferir
animacao **3D** diretamente dele e causa comum de movimento ruim. MMPose (Apache 2.0) cobre pose 2D
**e** 3D — para retarget 3D onde profundidade importa, preferir seu predictor 3D ou fonte real
3D/mocap. Passo intermediario obrigatorio: `DWPose format -> CanonicalPoseSequence (fps,
coordinate_space, dimensions, frames com joints e position+confidence) -> game runtime`. **Nunca**
`DWPose format -> game runtime` direto.

**Wan como motion reference/previs — nunca fonte final.** Entra **antes** do `CanonicalPoseSequence`.
Wan2.2-Animate permite character animation/replacement; Wan-Animate-2 (Agosto 2026) recebe imagem de
referencia + driving video diretamente. Apache 2.0, Python 3.11/PyTorch 2.7/CUDA 12.6. Funcao correta:
`"quero este ataque" -> MotionPlan -> referencia OU Wan visual rehearsal -> pose extraction ->
CanonicalMotion -> retarget`. **ANTI-PADRAO EXPLICITO**: `Wan -> MP4 -> cortar em PNG -> ship
diretamente` — carrega inconsistencia generativa direto para o gameplay.

## ComfyUI como Servidor de Inferencia

ComfyUI encaixa como **servidor de inferencia**, nao dono da logica de negocio: REST+WebSocket,
`/prompt` valida e enfileira workflows headless (`python main.py --disable-auto-launch --listen
127.0.0.1 --port 8188`). Workflows versionados com nome semantico (`qwen_character_edit.v3.json` —
**nunca** `workflow_final_FINAL_7.json`). Cada output exige provenance JSON (`generator`, `model`
com revision pinned-commit-sha, `generation` com seed/steps, `inputs` com hashes) — schema completo em
`references/assetctl-cli-reference.md`.

## Rig 2D Esqueletal

| Ferramenta | Licenca | Automacao headless | Escolher quando |
|---|---|---|---|
| **Blender + Grease Pencil** (2D + deformacao com Armature) | GPL | Excelente (mais automatizavel, open-source) | open-source + 100% headless |
| **Spine** | Comercial propria | CLI oficial (`Spine -i x.spine -o dist -e export.json`); maioria headless, so export de imagem/video exige windowing | melhor authoring skeletal dedicado |
| **LoongBones** | MIT | Editor web interativo, sem CLI comparavel ao Spine | open-source + editor tradicional, aceitando gap de CI |
| So sprites raster | — | Total | Blender raster -> atlas, sem rig esqueletal |

Preservar os `.spine` originais — a versao de export deve casar com a dos runtimes consumidores.
LoongBones tem IK, mesh/weights, FFD, slots, atlas, import PSD, mas sem CLI headless confiavel.

## Rasterizacao Deterministica

Segredo para evitar "sprite shake": **nunca** recalcular a camera em cada frame (mau: `frame 0 -> fit
bounding box`, `frame 1 -> fit bounding box`... move implicitamente o personagem em relacao ao
sprite). Configurar **fixo**: camera ortografica, root anchor, canvas, ground line, pixel density.
Script bpy: resolucao fixa, PNG RGBA, `film_transparent=True`, itera `frame_start..frame_end` com
`scene.frame_set(frame)` + `render(write_still=True)`, salvando metadata (`fps`, `frames`, `origin`,
`events`) por animacao.

Atlas open-source via Pillow: packing em grelha **deterministico** (`pack_grid` ordena PNGs, compoe
sheet RGBA, gera JSON `x/y/w/h` compativel com TexturePacker) — nao e o mais eficiente, mas e
reprodutivel. TexturePacker e a opcao comercial madura para escala — **CI/automacao requer licenca
Docker/CI especifica; licencas desktop nao cobrem build/servidor**.

Separar sempre "frames visuais" de "dados de gameplay": sprite atlas = o que aparece | motionplan =
quando acontece | hitbox = onde acerta | hurtbox = onde recebe dano. **Nao** codificar hitbox no pixel
alpha — JSON proprio por frame (shape capsule/box, coordenadas a/b, radius), associado a action, para
poder refazer sprites em outro estilo sem alterar combate.

## Integracao Runtime

**Godot** (4.7.2) consome os tres mundos: 3D (`character.glb -> AnimationPlayer -> AnimationTree`), 2D
raster (`atlas.png -> SpriteFrames -> AnimatedSprite2D`), 2D skeletal (`Skeleton2D -> Bone2D ->
Polygon2D`). **Phaser** carrega spritesheets/atlases JSON (Array/Hash) via `this.load.atlas()` +
`this.anims.create({generateFrameNames})`, e Phaser 4 tem integracao Spine nativa (skeleton JSON/
`.skel` + `.atlas` + texturas).

## Licenciamento e Hardware

Cita ferramentas de terceiro com licencas variadas — **preservar sempre a tabela completa**, sem
esconder as restritivas (SAM License propria, Spine comercial, TexturePacker comercial, Hunyuan3D
Tencent restrita). Tabela completa (14 entradas) e classes de hardware com VRAM real em
`references/licensing-and-hardware.md` — carregar antes de decisao de redistribuicao ou de
dimensionamento de maquina.

## Testes, CI/CD e Build Graph

A pipeline deve ser testada como compilador — um asset que "parece razoavel" mas altera silenciosamente
skeleton/frame count/pivot e um **build quebrado**. Os 5 grupos de teste, exemplo de GitHub Actions, e
o build graph content-addressed (cache de Qwen/SAM/pose/retarget/render/atlas por hash de input) estao
em `references/testing-and-ci.md` — carregar ao montar CI ou ao decidir se um rebuild e necessario.

## Regras Duras

| Nunca | Em vez disso |
|---|---|
| Pedir a LLM Euler angles/rotacao de bone diretamente | LLM produz `MotionPlan.json`; `MotionResolver` deterministico resolve o transform |
| Fingir que o AccuRIG tem CLI/API headless publica | Tratar como fronteira de certificacao — operador exporta FBX uma vez por corpo |
| Usar video gerado pelo Wan como frame final de gameplay | Wan e previs — sempre `pose extraction -> CanonicalMotion -> retarget` |
| Ir de `DWPose format` direto para o game runtime | Passar sempre por `CanonicalPoseSequence` intermediario |
| Gerar cada frame do zero com prompts independentes | `master + pose + previous key pose -> edit -> nova key pose`, rig interpola |
| Usar SAM como gerador primario de camadas | Qwen-Image-Layered decompoe; SAM so refina mascara na segunda passagem |
| Separar um braco do torso sem tratar occlusion | `expand bounding region -> Qwen-Image-Edit inpaint -> clean alpha mask` |
| Recalcular bounding box da camera a cada frame | Camera ortografica fixa, root anchor fixo, canvas fixo, ground line fixa |
| Codificar hitbox dentro do pixel alpha do sprite | JSON proprio de hitbox/hurtbox por frame, associado a action |
| Manter mais de um `CanonicalMotion`/`MotionPlan` por acao | Fonte unica; todo o resto e derivado reprodutivel |
| Instalar Qwen/SAM/Wan/Blender no mesmo virtualenv | Isolar por worker ou Docker services separados |
| Usar SHA-256 do PNG como golden test de visual regression | Validacao estrutural/perceptual + artefato de auditoria |
| Assumir que licenca pessoal/comercial do rig cobre o ecossistema (ex. CC Components) | Auditar assets adquiridos separadamente do programa que fez o rig |

## Handoff

### Recebe de

- Skill 68 (Character Animation 3D) — `character.glb`+`animation.glb` certificados e rig canonico
  normalizado, para derivar 2D ou servir de fonte de pose
- Skill 66 (Game Architecture Design) — biblioteca de acoes (locomotion/combat/reactions) que vira
  `MotionPlan.json` por acao
- Skill 09 (Orchestrator) — quando a task maior decide que producao/derivacao 2D e a proxima etapa

### Entrega para

- Skill 67 (Game Engine Development) — atlas/rig 2D prontos para integracao runtime via codigo
- Skill 68 (Character Animation 3D) — quando a derivacao 2D revela que o rig/retargeting 3D precisa de
  ajuste (ex.: pose_target inatingivel na mesh)
- Skill 20 (Observability/SRE) — quando o build de asset roda em CI continuo e precisa de
  alerta/rollback proprio

## Evidencia de Conclusao

- `MotionPlan.json` validado por schema Pydantic, sem campo fora do schema (`extra="forbid"`)
- assets 2D com manifest de provenance completo quando envolvem IA generativa
- hitbox/hurtbox em JSON separado, nunca inferido de pixel alpha
- para asset derivado de 3D: camera/canvas/anchor fixos documentados, sem "shake" entre frames
- teste cobrindo os grupos aplicaveis (schema sempre; skeleton/motion com rig; visual-regression com
  render; round-trip com export para runtime)

## Fontes

Conteudo desta skill e pesquisa tecnica original do usuario (whitepaper proprio, nao material de
terceiro sujeito a licenca de conteudo) sobre pipeline completo de personagem, fornecido integralmente
para curadoria. Estrutura em `references/` segue o formato padrao deste kit; o conteudo tecnico
(schemas, comandos, tabelas, decisoes) foi preservado sem generalizacao.

O documento cita ferramentas de terceiro com licencas variadas — tabela completa (14 entradas, sem
omitir as restritivas: SAM License propria, Spine comercial, TexturePacker comercial, Hunyuan3D
Tencent restrita) em `references/licensing-and-hardware.md`, junto das classes de hardware.

Curadoria em 2026-08-27.
