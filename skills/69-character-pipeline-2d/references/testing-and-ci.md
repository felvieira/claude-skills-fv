# Testes, CI/CD e Build Graph

Conteudo denso de apoio ao `SKILL.md` principal. Ver `## Fontes` no arquivo principal.

A pipeline deve ser testada como se fosse um compilador. Um asset que "parece razoavel" mas altera
silenciosamente o skeleton, o frame count ou o pivot e um build quebrado.

## Grupo 1 — Schema/Data Validation

MotionPlan valido, `character.yaml` valido, `bone_map` completo, nomes unicos, frames dentro do
intervalo, eventos dentro da duracao, `hitbox_on` antes de `hitbox_off`, FPS suportado, paths relativos
seguros.

```python
def test_attack_active_phase_is_valid(plan):
    active = plan.phases["active"]
    assert active.start <= active.end
    assert active.end < plan.timebase.frames

def test_events_are_inside_clip(plan):
    for event in plan.events:
        assert 0 <= event.frame < plan.timebase.frames
```

## Grupo 2 — Skeleton Validation

Todos os canonical bones obrigatorios existem, nenhum mapped bone duplica outro, sem NaN, sem Inf,
quaternions normalizados, hierarquia esperada, root unico, bind/rest pose plausivel.

```json
{
  "status": "failed",
  "errors": [
    { "code": "BONE_MISSING", "canonical": "hand_l", "expected_source": "CC_Base_L_Hand" }
  ]
}
```

## Grupo 3 — Motion Validation

Joint velocity, joint acceleration, root velocity, foot sliding, ground penetration, teleport, bone
stretch, contact stability. Em vez de "ficou bonito" subjetivo, medir:

- `foot_slide_cm <= 2.5`
- `hip_jump_per_frame <= threshold`
- `root displacement ≈ MotionPlan`
- `active frames == MotionPlan`

## Grupo 4 — Visual Regression

Renderizar thumbnails canonicas (`idle/front/frame_0.png`, `walk/side/contact_l.png`,
`attack/side/anticipation.png`, `attack/side/active.png`, `attack/side/recovery.png`) e comparar canvas
size, alpha bounding box, silhouette, perceptual similarity, ground anchor, pivot.

Para outputs generativos **nao** usar SHA-256 do PNG como golden test — mesmo com seed fixo, diferentes
kernels/drivers/backend podem alterar valores. Fazer validacao estrutural/perceptual e manter o output
completo como artefato de auditoria.

## Grupo 5 — Round-Trip Validation

`AccuRIG FBX -> Blender import -> GLB export -> clean Blender import -> comparar skeleton/actions/frame
ranges/mesh bounds`.

E tambem:

- `atlas.json -> Phaser fixture -> load all frames`
- `character.glb -> Godot fixture -> load/import skeleton + animations`

Isso verifica o contrato real do consumidor, nao apenas do produtor.

## GitHub Actions (Conceitual)

```yaml
name: asset-pipeline

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  schemas:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - name: Install
        run: pip install -e ".[dev]"
      - name: Validate configs
        run: assetctl verify --scope schemas
      - name: Unit tests
        run: pytest tests/unit -q

  blender:
    runs-on: self-hosted
    steps:
      - uses: actions/checkout@v4
      - name: Blender smoke tests
        run: |
          blender \
            --background \
            tests/fixtures/character.blend \
            --python tests/blender/smoke.py

  ai:
    runs-on:
      - self-hosted
      - linux
      - x64
      - gpu
    steps:
      - uses: actions/checkout@v4
      - name: Pose smoke test
        run: |
          assetctl motion extract \
            --backend dwpose \
            --input tests/fixtures/reference.mp4 \
            --out build/reference.json
      - name: Validate motion
        run: |
          assetctl verify build/reference.json

  package:
    needs:
      - schemas
      - blender
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Package manifests
        run: assetctl package --release
```

GitHub Actions permite selecionar self-hosted runners por labels; existem larger runners GPU em
determinados planos — para workloads com modelos de dezenas de GB, preferir runner GPU controlado pelo
estudio ou runner cloud especificamente provisionado.

## Por Que o AccuRIG Nao Entra no Job de CI

AccuRIG nao entra nesse job — o CI comeca em `accurig/knight_01_accurig.fbx` **ja certificado**, valida
o hash:

```json
{
  "artifact": "knight_01_accurig.fbx",
  "status": "certified",
  "sha256": "...",
  "tool": { "name": "AccuRIG" }
}
```

Isso e consequencia direta de tratar o AccuRIG como fronteira de certificacao (ver `SKILL.md`, secao
"AccuRIG como Fronteira de Certificacao do Rig") — o passo manual/GUI acontece uma vez por
corpo/topologia fora do CI, e o pipeline automatizado so consome o resultado ja validado por hash.

## Build Graph Content-Addressed

Se muda o FBX -> hash muda -> invalida `normalized.blend` -> invalida retargets -> rebuild GLBs ->
re-render sprites -> repack atlas. Se muda **so** `heavy_slash.motionplan.json` -> nao ha razao para
regenerar character mesh/textures/rig/idle/walk.

Formula:

```text
output hash = source hashes + config hash + script revision + model revision
            + workflow revision + seed + Blender version
```

Isso permite cache serio: Qwen output cache, SAM mask cache, pose extraction cache, retarget cache,
render cache, atlas cache — importante porque executar novamente diffusion models so porque o atlas
mudou seria um desperdicio enorme.

### Versao dos Executaveis Congelada

```json
{
  "build_environment": {
    "blender": "5.2-lts",
    "canonical_skeleton": "humanoid_v1",
    "motionplan_schema": "1.0",
    "qwen_image_edit": "2511",
    "sam": "3.1",
    "pose_backend": "mmpose:pinned-revision",
    "comfy_workflow": "qwen_character_edit.v3"
  }
}
```

Prender o pipeline a uma LTS e preferivel a deixar o CI consumir sempre o build mais recente.
