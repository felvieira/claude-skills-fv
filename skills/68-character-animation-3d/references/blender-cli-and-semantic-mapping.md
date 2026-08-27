# Blender CLI Headless e Semantic Bone Mapping

Conteudo denso de apoio ao `SKILL.md` principal. Ver `## Fontes` no arquivo principal.

## Blender como "compilador de animacao"

O Blender funciona como compilador de animacao num pipeline automatizado: inputs
(`character.fbx`, `motion.bvh`, `mapping.json`) entram, um script roda em modo headless
(import -> normalize -> retarget -> bake -> validate -> export), outputs saem
(`character_walk.fbx`, `character_walk.glb`). Isso o torna adequado pra automacao em servidor ou
pipeline CI/CD: `--background` roda sem interface, `--python` executa um script, e argumentos
proprios do script vao depois de `--`.

Invocacao basica:

```bash
blender --background --factory-startup --python pipeline.py -- \
  --character ./character.fbx --motion ./motion.bvh --output ./output.fbx --fps 30
```

O `--` e a fronteira entre argumentos do Blender e argumentos do script Python — tudo antes pertence
ao Blender, tudo depois pertence ao `argparse` do script.

## Parsear argumentos dentro do script

```python
import argparse
import sys

def parse_args() -> argparse.Namespace:
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", required=True)
    parser.add_argument("--motion", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--fps", type=int, default=30)
    return parser.parse_args()
```

## Importacao automatizada multi-formato

```python
from pathlib import Path
import bpy

def import_asset(filepath: str) -> list[bpy.types.Object]:
    path = Path(filepath).resolve()
    ext = path.suffix.lower()
    before = set(bpy.data.objects)
    if ext == ".fbx":
        bpy.ops.import_scene.fbx(
            filepath=str(path), ignore_leaf_bones=True, automatic_bone_orientation=False
        )
    elif ext in {".glb", ".gltf"}:
        bpy.ops.import_scene.gltf(filepath=str(path))
    elif ext == ".bvh":
        bpy.ops.import_anim.bvh(filepath=str(path))
    else:
        raise ValueError(f"Formato nao suportado: {ext}")
    return [obj for obj in bpy.data.objects if obj not in before]
```

## Encontrar armature sem hardcode de nome

**Nunca** `bpy.data.objects["Armature"]` — o nome do objeto armature varia por exportador (AccuRIG,
Mixamo, DeepMotion e cada ferramenta usam convencao diferente). Descobrir por tipo de objeto e
heuristica de tamanho, nao por nome literal:

```python
def find_armature(objects=None):
    candidates = objects or bpy.context.scene.objects
    armatures = [obj for obj in candidates if obj.type == "ARMATURE"]
    if not armatures:
        raise RuntimeError("Nenhum armature encontrado.")
    return max(armatures, key=lambda obj: len(obj.data.bones))
```

`max(..., key=lambda obj: len(obj.data.bones))` resolve o caso comum de uma cena com mais de um
armature (ex: prop com bone unico importado junto) — o armature real do personagem quase sempre tem
mais bones que qualquer outro objeto na cena.

## Semantic bone mapping / canonical skeleton — decisao arquitetural central

Esta e a decisao mais importante do pipeline inteiro. Em vez de escrever codigo acoplado a
`CC_Base_L_Upperarm`, `mixamorig:LeftArm`, `LeftUpperArm`, ou qualquer outra convencao de nomes
especifica de exportador, o pipeline trabalha internamente com conceitos semanticos: `hips`, `spine`,
`chest`, `neck`, `head`, `left_upper_arm`, `left_forearm`, `left_hand`, `right_upper_arm`,
`right_forearm`, `right_hand`, `left_thigh`, `left_shin`, `left_foot`, `right_thigh`, `right_shin`,
`right_foot`, entre outros conforme a granularidade do rig (dedos, clavicula, spine multi-segmento).

Isso torna possivel trocar AccuRIG, Mixamo, DeepMotion, Rokoko, ou um modelo experimental de pesquisa
sem reescrever a logica de retargeting inteira — so o dicionario de aliases muda.

Os nomes `CC_Base_*` sao aliases tipicos do ecossistema Reallusion — **nao sao contrato imutavel do
AccuRIG**. O programa deve descobrir bones semanticamente e falhar explicitamente quando falta uma
articulacao importante, em vez de assumir silenciosamente que um bone existe.

```python
BONE_ALIASES: dict[str, list[str]] = {
    "hips": ["CC_Base_Hip", "Hips", "mixamorig:Hips", "pelvis", "hip"],
    "spine": ["CC_Base_Spine01", "Spine", "mixamorig:Spine", "spine_01", "spine"],
    "chest": ["CC_Base_Spine02", "Chest", "mixamorig:Spine2", "spine_02", "chest", "upperchest"],
    "neck": ["CC_Base_NeckTwist01", "Neck", "mixamorig:Neck", "neck"],
    "head": ["CC_Base_Head", "Head", "mixamorig:Head", "head"],
    "left_upper_arm": ["CC_Base_L_Upperarm", "LeftArm", "mixamorig:LeftArm", "upperarm_l", "left_upper_arm"],
    "left_forearm": ["CC_Base_L_Forearm", "LeftForeArm", "mixamorig:LeftForeArm", "lowerarm_l", "left_forearm"],
    "left_hand": ["CC_Base_L_Hand", "LeftHand", "mixamorig:LeftHand", "hand_l", "left_hand"],
    "right_upper_arm": ["CC_Base_R_Upperarm", "RightArm", "mixamorig:RightArm", "upperarm_r", "right_upper_arm"],
    "right_forearm": ["CC_Base_R_Forearm", "RightForeArm", "mixamorig:RightForeArm", "lowerarm_r", "right_forearm"],
    "right_hand": ["CC_Base_R_Hand", "RightHand", "mixamorig:RightHand", "hand_r", "right_hand"],
    "left_thigh": ["CC_Base_L_Thigh", "LeftUpLeg", "mixamorig:LeftUpLeg", "thigh_l", "left_thigh"],
    "left_shin": ["CC_Base_L_Calf", "LeftLeg", "mixamorig:LeftLeg", "calf_l", "left_shin"],
    "left_foot": ["CC_Base_L_Foot", "LeftFoot", "mixamorig:LeftFoot", "foot_l", "left_foot"],
    "right_thigh": ["CC_Base_R_Thigh", "RightUpLeg", "mixamorig:RightUpLeg", "thigh_r", "right_thigh"],
    "right_shin": ["CC_Base_R_Calf", "RightLeg", "mixamorig:RightLeg", "calf_r", "right_shin"],
    "right_foot": ["CC_Base_R_Foot", "RightFoot", "mixamorig:RightFoot", "foot_r", "right_foot"],
}

def resolve_mapping(armature, aliases: dict[str, list[str]]) -> dict[str, str]:
    names = {bone.name for bone in armature.data.bones}
    lower_index = {name.lower(): name for name in names}
    mapping: dict[str, str] = {}
    for semantic, candidates in aliases.items():
        for candidate in candidates:
            actual = lower_index.get(candidate.lower())
            if actual is not None:
                mapping[semantic] = actual
                break
    return mapping

def strip_namespace(name: str) -> str:
    return name.split(":")[-1]
```

`resolve_mapping` retorna um dicionario `semantico -> nome_real_no_armature`. Bones semanticos que nao
foram resolvidos simplesmente nao aparecem no dicionario de retorno — cabe ao chamador decidir se isso
e fatal (ver validacao de bones obrigatorios em `retargeting-math-and-scripts.md`, secao do pipeline
completo). `strip_namespace` trata o caso comum de exportadores que prefixam namespace
(`mixamorig:Hips` -> comparar so a parte depois de `:`) quando o alias na lista nao inclui o prefixo
exato usado no arquivo.

## Exportacao

### FBX com bake de animacao

```python
def export_fbx(filepath: str, frame_start: int, frame_end: int):
    bpy.ops.export_scene.fbx(
        filepath=filepath,
        use_selection=True,
        object_types={"ARMATURE", "MESH"},
        add_leaf_bones=False,
        bake_anim=True,
        bake_anim_use_all_bones=True,
        bake_anim_simplify_factor=0.0,
    )
```

`add_leaf_bones=False` evita que o exportador acrescente bones terminais artificiais (o Blender por
padrao adiciona um "leaf bone" no fim de cada cadeia pra representar comprimento — a maioria dos
consumidores downstream, incluindo game engines, nao espera esses bones extras).

### GLB

```python
bpy.ops.export_scene.gltf(filepath=filepath, export_format="GLB", export_animations=True)
```

### Alembic

Alembic deve aparecer **depois** do retargeting estar completo, quando o objetivo e preservar o
resultado visual final em vez de manter o rig editavel:

```python
bpy.ops.wm.alembic_export(filepath=filepath, selected=True, start=frame_start, end=frame_end)
```
