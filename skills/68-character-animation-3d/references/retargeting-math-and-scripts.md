# Matematica de Retargeting e Scripts Completos

Conteudo denso de apoio ao `SKILL.md` principal. Ver `## Fontes` no arquivo principal.

## Arquitetura recomendada: 5 responsabilidades separadas

Evitar ligar diretamente "nome do bone do modelo A" a "nome do bone do AccuRIG". O modelo correto tem
uma camada semantica intermediaria:

```
Source motion -> Source adapter -> Canonical Skeleton <- Target adapter <- AccuRIG FBX
                                          |
                                          v
                              Retarget Solver -> Quaternion transforms
                                          |
                                          v
                            Blender Action -> Bake -> FBX/GLB/ABC
```

Isso separa cinco responsabilidades que nunca devem ficar acopladas no mesmo bloco de codigo: formato
de origem, esqueleto semantico, matematica de retargeting, animacao no Blender, e exportacao final.
Trocar qualquer uma (novo formato de IA, novo target rig, novo formato de saida) nao deveria exigir
tocar nas outras quatro.

## Formato canonico JSON proprio

Mais valioso que depender de BVH como intermediario, porque BVH nao declara o espaco de rotacao nem a
rest pose de referencia:

```json
{
  "version": 1,
  "fps": 30,
  "coordinate_system": "z_up_right_handed",
  "rotation_space": "local_rest_space",
  "rotation_format": "quaternion_wxyz",
  "units": "meters",
  "skeleton": [
    "hips", "spine", "chest", "neck", "head",
    "left_upper_arm", "left_forearm", "left_hand",
    "right_upper_arm", "right_forearm", "right_hand",
    "left_thigh", "left_shin", "left_foot",
    "right_thigh", "right_shin", "right_foot"
  ],
  "frames": [
    {
      "root_translation": [0.0, 0.0, 0.0],
      "bones": {
        "hips": [1.0, 0.0, 0.0, 0.0],
        "left_upper_arm": [0.991, 0.0, 0.131, 0.0]
      }
    }
  ]
}
```

`rotation_space: "local_rest_space"` e o campo mais critico do schema — sem declarar em que espaco
uma quaternion foi capturada, quatro numeros nao carregam significado suficiente pra um retargeter
aplicar corretamente. Uma quaternion `[0.991, 0.0, 0.131, 0.0]` significa coisas fisicamente diferentes
dependendo se ela representa rotacao absoluta em world space, rotacao relativa ao pai, ou delta em
relacao a rest pose.

## Aplicar pose ja normalizada (caso simples)

Quando a fonte de IA ja devolveu as rotacoes no espaco local do rig alvo (basis identico), aplicar e
direto:

```python
import bpy
from mathutils import Quaternion

def apply_pose(armature, semantic_to_bone, rotations, frame):
    for semantic_name, quat_values in rotations.items():
        bone_name = semantic_to_bone.get(semantic_name)
        if bone_name is None:
            continue
        pose_bone = armature.pose.bones.get(bone_name)
        if pose_bone is None:
            continue
        w, x, y, z = quat_values
        pose_bone.rotation_mode = "QUATERNION"
        pose_bone.rotation_quaternion = Quaternion((w, x, y, z))
        pose_bone.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bone_name)
```

Isto evita Euler angles durante a fase matematica — quaternion nao sofre de gimbal lock e compoe de
forma previsivel, o que importa muito quando o mesmo dado ainda vai passar por mais um estagio de
transformacao (retargeting real, abaixo).

**Importante: isto ainda NAO e retargeting.** O codigo acima so funciona quando
`source quaternion basis == target quaternion basis` — ou seja, quando a IA ja gerou as rotacoes
diretamente no espaco local do rig alvo. Quando o movimento vem de BVH, Mixamo, SMPL, ou qualquer
outro esqueleto com orientacao de rest pose diferente, e necessario compensar a rest pose antes de
aplicar. Aplicar `apply_pose` direto num caso desses produz uma pose visualmente errada mesmo com os
numeros "corretos", porque o significado da quaternion depende da orientacao do osso em repouso, que
difere entre rigs.

## A relacao matematica do retargeting real

A ideia central: transferir a **mudanca** em relacao a rest pose, nao copiar literalmente a rotacao
absoluta do bone de origem.

```
ΔR_source(t) = R_source,pose(t) · R_source,rest⁻¹
R_target,pose(t) = ΔR_source(t) · R_target,rest
```

Em palavras: calcula-se o delta de rotacao da fonte em relacao a sua propria rest pose no frame `t`,
depois aplica-se esse mesmo delta a rest pose do alvo. Isso e fundamentalmente diferente — e muito
mais correto — do que `target.rotation_euler = source.rotation_euler`, que so funcionaria por
coincidencia se os dois rigs tivessem exatamente a mesma orientacao de osso em repouso (raro entre
ferramentas diferentes).

## Script de retargeting em armature/world space

Funcoes que processam bones em **ordem de profundidade hierarquica** (pais antes de filhos),
calculando o delta de rotacao em world space e aplicando a rest pose do target, preservando a posicao
atual do bone:

```python
import bpy
from mathutils import Matrix, Quaternion

def bone_depth(bone) -> int:
    depth = 0
    parent = bone.parent
    while parent is not None:
        depth += 1
        parent = parent.parent
    return depth

def matrix_from_rotation_translation(rotation: Quaternion, translation) -> Matrix:
    mat = rotation.to_matrix().to_4x4()
    mat.translation = translation
    return mat

def world_rotation(armature, pose_bone) -> Quaternion:
    return (armature.matrix_world @ pose_bone.matrix).to_quaternion()

def target_armature_rotation(target_armature, target_pose_bone, delta_world: Quaternion) -> Quaternion:
    rest_world = (
        target_armature.matrix_world @ target_pose_bone.bone.matrix_local
    ).to_quaternion()
    return delta_world @ rest_world

def retarget_frame(
    source_armature,
    target_armature,
    semantic_to_source_bone: dict[str, str],
    semantic_to_target_bone: dict[str, str],
    source_rest_world: dict[str, Quaternion],
    frame: int,
):
    ordered_semantics = sorted(
        semantic_to_source_bone.keys(),
        key=lambda s: bone_depth(source_armature.pose.bones[semantic_to_source_bone[s]]),
    )
    for semantic in ordered_semantics:
        source_bone_name = semantic_to_source_bone[semantic]
        target_bone_name = semantic_to_target_bone.get(semantic)
        if target_bone_name is None:
            continue
        source_pose_bone = source_armature.pose.bones[source_bone_name]
        target_pose_bone = target_armature.pose.bones[target_bone_name]

        source_pose_world = world_rotation(source_armature, source_pose_bone)
        source_rest = source_rest_world[semantic]
        delta_world = source_pose_world @ source_rest.inverted()

        target_world_rotation = target_armature_rotation(target_armature, target_pose_bone, delta_world)
        target_local_rotation = (
            target_pose_bone.matrix.to_quaternion().inverted() @ target_world_rotation
        )

        target_pose_bone.rotation_mode = "QUATERNION"
        target_pose_bone.rotation_quaternion = target_local_rotation
        target_pose_bone.keyframe_insert(
            data_path="rotation_quaternion", frame=frame, group=target_bone_name
        )
```

Esta abordagem e substancialmente melhor que `target.rotation_euler = source.rotation_euler` porque
considera a diferenca entre rest poses e trabalha inteiramente com quaternions. Processar em ordem de
profundidade (pais primeiro) importa porque o world space de um bone filho depende da rotacao ja
resolvida do pai — inverter a ordem produz resultado incorreto pra qualquer bone que nao seja raiz.

**O que este script ainda nao resolve por si so**: diferencas anatomicas entre rigs (proporcao de
membro), numero diferente de spine bones entre source e target, claviculas presentes num rig e
ausentes no outro, twist de antebraco/coxa nao capturado pela cadeia principal, foot contacts (o pe
penetrando o chao ou flutuando quando as pernas tem proporcao diferente), e rigs em A-Pose vs T-Pose
(que mudam a rest pose de referencia e portanto todo o calculo de delta). Esses problemas continuam
exigindo calibracao especifica por par de rigs — nao ha solucao puramente matematica genérica pra
eles.

## Root motion: sempre separado das rotacoes de membro

Root motion **nao** deve ser tratado pela mesma matematica de delta-de-rotacao usada pros membros.
Medir deslocamento do hip da fonte em relacao a sua posicao inicial, depois escalar pela proporcao de
altura entre os personagens:

```
Δp_s(t) = p_s(t) - p_s(0)
Δp_t(t) = Δp_s(t) × (h_t / h_s)
```

**Nunca** usar simplesmente `target.location = source.location` quando os personagens tem alturas
diferentes — o deslocamento absoluto da fonte nao faz sentido fisico aplicado a um corpo de proporcao
diferente (um personagem duas vezes mais baixo que anda o mesmo deslocamento em metros estaria
"deslizando" ao inves de andar).

```python
def calculate_leg_scale(source_armature, target_armature, hip_bone: str, foot_bone: str) -> float:
    def leg_length(armature, hip: str, foot: str) -> float:
        hip_world = (armature.matrix_world @ armature.pose.bones[hip].matrix).translation
        foot_world = (armature.matrix_world @ armature.pose.bones[foot].matrix).translation
        return (hip_world - foot_world).length

    source_length = leg_length(source_armature, hip_bone, foot_bone)
    target_length = leg_length(target_armature, hip_bone, foot_bone)
    if source_length == 0:
        raise ValueError("Comprimento de perna da fonte e zero — nao e possivel calcular escala.")
    return target_length / source_length
```

`calculate_leg_scale` mede o comprimento de perna source vs target via posicao world de hip/foot
bones — usar essa proporcao (ou uma equivalente de altura total) como fator de escala do deslocamento,
nao um valor arbitrario.

### Uma unica entidade responsavel pelo movimento global

Estrategia obrigatoria pra evitar bug de movimento duplicado: escolher **uma unica** entidade
responsavel pelo deslocamento global — Armature object, OU Root bone, OU Hips — **nunca misturar as
tres** representando a mesma trajetoria. Se o Armature object se move pelo mundo E o Hips bone tambem
carrega translacao acumulada, o personagem se desloca duas vezes (soma dos dois), visualmente parecendo
deslizar mais rapido que a animacao de pernas sustenta.

Para game engines, o modelo limpo e uma cadeia unidirecional clara:

```
Root (deslocamento pelo mundo) -> Hips (motion corporal/local) -> skeleton
```

O Root bone (ou o proprio objeto Armature, dependendo da convencao do engine-alvo) carrega o
deslocamento absoluto pelo mundo; o Hips e todo o resto do skeleton so carregam movimento relativo ao
Root. Isso e o que permite ao engine ler root motion isoladamente (pra sincronizar com fisica/colisao)
sem precisar decompor a translacao do Hips.

## Bake de constraints e IK

`bpy.ops.nla.bake()` converte o resultado visual de constraints (Copy Rotation, Copy Transforms, IK,
Child Of) em keyframes explicitas no deform skeleton:

```python
def bake_constraints(armature, frame_start: int, frame_end: int):
    bpy.context.view_layer.objects.active = armature
    armature.select_set(True)
    bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.nla.bake(
        frame_start=frame_start,
        frame_end=frame_end,
        only_selected=True,
        visual_keying=True,
        clear_constraints=True,
        bake_types={"POSE"},
    )
    bpy.ops.object.mode_set(mode="OBJECT")
```

Particularmente importante quando o target foi animado via Copy Rotation/Copy Transforms/IK/Child
Of/Rigify/Auto-Rig Pro/constraint customizada de qualquer tipo — depois do bake, o deformation skeleton
deve reproduzir a animacao sozinho, sem depender mais de nenhuma constraint ou objeto externo
resolvido em runtime. Isso e obrigatorio antes de exportar FBX/GLB pra um engine, porque a maioria dos
formatos de export/runtime nao preserva constraints procedurais do Blender — so keyframes assadas.

## Script completo de pipeline (referencia final)

Fluxo CLI completo: import -> mapear -> retargetar -> bake -> exportar, com validacao explicita de
bones essenciais.

```python
import argparse
import json
import sys
from pathlib import Path

import bpy


REQUIRED_SEMANTIC_BONES = ["hips", "left_thigh", "left_shin", "right_thigh", "right_shin"]


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    argv = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", required=True)
    parser.add_argument("--motion", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--frame-start", type=int, default=1)
    parser.add_argument("--frame-end", type=int, required=True)
    return parser.parse_args(argv)


def validate_required_bones(mapping: dict[str, str]) -> None:
    missing = [b for b in REQUIRED_SEMANTIC_BONES if b not in mapping]
    if missing:
        raise RuntimeError(
            f"Bones essenciais ausentes no mapeamento semantico: {', '.join(missing)}"
        )


def run_pipeline(args: argparse.Namespace) -> None:
    bpy.context.scene.render.fps = args.fps

    character_objects = import_asset(args.character)
    character_armature = find_armature(character_objects)
    character_mapping = resolve_mapping(character_armature, BONE_ALIASES)
    validate_required_bones(character_mapping)

    motion_objects = import_asset(args.motion)
    motion_armature = find_armature(motion_objects)
    motion_mapping = resolve_mapping(motion_armature, BONE_ALIASES)
    validate_required_bones(motion_mapping)

    source_rest_world = {
        semantic: world_rotation(motion_armature, motion_armature.pose.bones[bone_name])
        for semantic, bone_name in motion_mapping.items()
    }

    for frame in range(args.frame_start, args.frame_end + 1):
        bpy.context.scene.frame_set(frame)
        retarget_frame(
            source_armature=motion_armature,
            target_armature=character_armature,
            semantic_to_source_bone=motion_mapping,
            semantic_to_target_bone=character_mapping,
            source_rest_world=source_rest_world,
            frame=frame,
        )

    bake_constraints(character_armature, args.frame_start, args.frame_end)

    bpy.ops.object.select_all(action="DESELECT")
    character_armature.select_set(True)
    for child in character_armature.children:
        if child.type == "MESH":
            child.select_set(True)

    export_fbx(args.output, args.frame_start, args.frame_end)


if __name__ == "__main__":
    run_pipeline(parse_args())
```

`validate_required_bones` falha explicitamente (`RuntimeError`) se `hips`, `left_thigh`, `left_shin`,
`right_thigh`, ou `right_shin` estiverem faltando no mapeamento — sem essas cinco articulacoes, root
motion e a cadeia de pernas nao tem como ser calculados de forma confiavel, entao o pipeline deve parar
cedo e explicito em vez de produzir um FBX com pernas quebradas silenciosamente. Este script assume
que `import_asset`, `find_armature`, `resolve_mapping`, `BONE_ALIASES`, `world_rotation`,
`retarget_frame`, `bake_constraints` e `export_fbx` estao disponiveis (definidos nas secoes acima e em
`blender-cli-and-semantic-mapping.md`) — na pratica, organizar como modulos importados por este script
de orquestracao, nao repetir as definicoes inline.
