# CLI `assetctl` — Subcomandos, Isolamento de Ambiente, Schemas Completos

Conteudo denso de apoio ao `SKILL.md` principal. Ver `## Fontes` no arquivo principal.

## Arvore Completa de Subcomandos

Um unico executavel Python, `assetctl`, que apenas **orquestra servicos e subprocessos** — nao contem
logica de IA/rig embutida, so chama os workers/CLIs corretos na ordem certa e valida artefatos entre
passos.

```text
assetctl
├── character
│   ├── preflight
│   ├── ingest-accurig
│   └── validate
├── motion
│   ├── plan
│   ├── extract
│   ├── resolve
│   ├── retarget
│   └── validate
├── image
│   ├── edit
│   ├── layers
│   └── segment
├── render
│   ├── sprites
│   └── thumbnail
├── atlas
│   └── pack
├── export
│   ├── glb
│   ├── godot
│   └── phaser
└── verify
```

## Execucao End-to-End

```bash
assetctl character preflight knight_01

assetctl character ingest-accurig knight_01

assetctl motion plan \
  knight_01 \
  --prompt "heavy overhead sword attack" \
  --out motions/heavy_slash.motionplan.json

assetctl motion extract \
  --input motions/references/heavy_slash.mp4 \
  --backend mmpose-3d \
  --out build/motion/heavy_slash.pose.json

assetctl motion resolve \
  --plan motions/heavy_slash.motionplan.json \
  --pose build/motion/heavy_slash.pose.json \
  --out build/motion/heavy_slash.motion.json

assetctl motion retarget \
  knight_01 \
  --motion build/motion/heavy_slash.motion.json

assetctl export glb knight_01

assetctl render sprites \
  knight_01 \
  --action heavy_slash \
  --view side

assetctl atlas pack knight_01

assetctl verify knight_01
```

Cada passo consome o artefato certificado do passo anterior e produz um artefato validado antes de
liberar o proximo — nenhum passo assume silenciosamente que o anterior "deve ter dado certo".

## Isolamento de Ambiente Python — Nao Misturar Tudo no Mesmo Virtualenv

SAM 3.x documenta atualmente Python 3.12 / PyTorch 2.7+, enquanto Wan-Animate-2 documenta Python
3.11 / PyTorch 2.7 / CUDA 12.6. Blender traz o seu proprio Python interno. Instalar Qwen, SAM, Wan e
dependencias de Blender no mesmo virtualenv e receita garantida para conflito de versao de
CUDA/PyTorch/dependencias transitivas.

Estrutura recomendada:

```text
orchestrator/
    Python  (so assetctl — validacao, orquestracao, subprocess dispatch)

workers/
    qwen/   (venv proprio — Qwen-Image-Edit / Qwen-Image-Layered)
    sam/    (venv proprio — SAM 3.x, Python 3.12+/PyTorch 2.7+)
    pose/   (venv proprio — DWPose/MMPose)
    wan/    (venv proprio — Wan-Animate-2, Python 3.11/PyTorch 2.7/CUDA 12.6)
    comfy/  (venv proprio — servidor ComfyUI)

blender/
    Blender bundled Python  (nao compartilha venv com nada acima)
```

Alternativa equivalente com Docker services separados: `ai-qwen`, `ai-pose`, `ai-wan` como containers
independentes, Blender nativo na maquina/CI runner, AccuRIG numa workstation Windows dedicada (ver
`licensing-and-hardware.md` para o porque do AccuRIG ficar fora do fluxo headless).

`assetctl` no orchestrator nunca importa bibliotecas de IA diretamente — ele dispara subprocess/request
HTTP para o worker certo e valida o artefato que volta.

## Blender CLI Tratado Como Compilador

```python
import subprocess
from pathlib import Path

def run_blender(blend: Path | None, script: Path, args: list[str]) -> None:
    command = ["blender", "--background"]
    if blend is not None:
        command.append(str(blend))
    command.extend(["--python", str(script), "--", *args])
    subprocess.run(command, check=True, text=True)
```

`check=True` propaga falha do Blender como excecao — nenhum passo downstream deve rodar sobre um build
que falhou silenciosamente. `blend` opcional cobre tanto abrir uma cena existente quanto rodar um
script que comeca de uma cena vazia (`--factory-startup` implicito conforme o script).

## Schema Completo do MotionPlan

O `SKILL.md` resume os campos; aqui vai o schema na integra, incluindo os valores de exemplo do
`heavy_overhead_slash`:

```json
{
  "$schema": "motionplan/v1",
  "version": "1.0",
  "action_id": "heavy_overhead_slash",
  "character_class": "humanoid",
  "timebase": { "fps": 30, "frames": 27 },
  "intent": { "category": "melee_attack", "style": ["heavy", "committed", "overhead"], "dominant_side": "right" },
  "phases": {
    "anticipation": { "start": 0, "end": 6 },
    "startup": { "start": 7, "end": 11 },
    "active": { "start": 12, "end": 15 },
    "follow_through": { "start": 16, "end": 20 },
    "recovery": { "start": 21, "end": 26 }
  },
  "motion_source": { "type": "reference_video", "ref": "motions/references/heavy_slash.mp4", "preferred_pose_backend": "mmpose_3d" },
  "pose_targets": [
    { "frame": 5, "name": "maximum_anticipation", "constraints": { "weapon_above_head": true, "weight_on_rear_foot": 0.75 } },
    { "frame": 14, "name": "maximum_velocity", "constraints": { "torso_forward": true, "front_knee_flexion_deg": 35 } }
  ],
  "root_motion": { "enabled": true, "forward_m": 0.34, "vertical_m": 0.0 },
  "contacts": [
    { "effector": "foot_l", "from": 0, "to": 10, "lock": true },
    { "effector": "foot_r", "from": 12, "to": 24, "lock": true }
  ],
  "weapon": { "bone": "hand_r", "trajectory": { "type": "arc", "direction": "upper_right_to_lower_left", "arc_deg": 155 } },
  "events": [
    { "frame": 11, "type": "vfx", "id": "sword_trail_on" },
    { "frame": 12, "type": "hitbox_on", "id": "blade_primary" },
    { "frame": 16, "type": "hitbox_off", "id": "blade_primary" },
    { "frame": 15, "type": "camera_shake", "intensity": 0.35 },
    { "frame": 22, "type": "cancel_window", "target": "dodge" }
  ],
  "render_2d": { "views": ["side"], "fps": 24, "hold_keyframes": false },
  "qa": { "max_foot_slide_cm": 2.5, "require_ground_contact": true, "require_no_self_intersection": false }
}
```

Campos por bloco:

- `timebase` — `fps` e `frames` totais do clip.
- `intent` — categoria semantica (`melee_attack`), lista de estilo livre, lado dominante.
- `phases` — cinco fases padrao (`anticipation`, `startup`, `active`, `follow_through`, `recovery`),
  cada uma com `start`/`end` em frames.
- `motion_source` — de onde vem o movimento real (`reference_video`, backend de pose preferido).
- `pose_targets` — poses-chave nomeadas com `constraints` semanticas, nunca angulos de bone diretos.
- `root_motion` — deslocamento do root em metros, habilitado ou nao.
- `contacts` — travamento de efetor (pe esquerdo/direito) por intervalo de frame, para evitar foot
  sliding.
- `weapon` — bone que carrega a arma e a trajetoria esperada (tipo, direcao, arco em graus).
- `events` — timeline de eventos de gameplay/VFX (`vfx`, `hitbox_on`, `hitbox_off`, `camera_shake`,
  `cancel_window`) com `frame` e payload especifico do tipo.
- `render_2d` — parametros de rasterizacao 2D quando esta acao vira sprite (views, fps de render,
  se segura keyframes ou interpola).
- `qa` — limites de validacao automatica (foot slide maximo em cm, exigir contato com o chao, exigir
  ausencia de self-intersection).

## Validacao Pydantic

```python
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator

class Phase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    start: int = Field(ge=0)
    end: int = Field(ge=0)

    @model_validator(mode="after")
    def valid_range(self):
        if self.end < self.start:
            raise ValueError("phase.end must be >= phase.start")
        return self

class Timebase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    fps: int = Field(ge=1, le=240)
    frames: int = Field(ge=1, le=10000)

class MotionPlan(BaseModel):
    model_config = ConfigDict(extra="forbid")
    version: Literal["1.0"]
    action_id: str = Field(pattern=r"^[a-z0-9_]+$")
    character_class: Literal["humanoid"]
    timebase: Timebase
    phases: dict[str, Phase]
```

`extra="forbid"` em todo modelo rejeita qualquer campo fora do schema — um `MotionPlan` malformado
(inclusive um produzido por LLM com campo alucinado) falha validacao antes de tocar em qualquer
subprocess de retargeting ou render. `action_id` com pattern `^[a-z0-9_]+$` evita caracteres que
quebrariam nome de arquivo/path em builds downstream.

## Contrato de Artefato — Tabela Completa

| Artefato | Conteudo | Vai para runtime? |
|---|---|---|
| `source.fbx/obj/glb` | mesh de origem | Nao |
| `*_accurig.fbx` | boundary Reallusion (saida certificada do AccuRIG) | Nao |
| `normalized.blend` | canonical build scene | Nao |
| `animated.blend` | debug/build | Nao |
| `character.glb` | personagem runtime 3D | **Sim** |
| `animation.glb` | motion library 3D | **Sim** |
| `rig.json` | semantica de bones/gameplay | **Sim** |
| `motionplan.json` | intencao/timing/gameplay | Opcional |
| `frame_*.png` | frames intermedios | Nao necessariamente |
| `atlas.png` | textura final 2D | **Sim** |
| `atlas.json` | UV/frame metadata | **Sim** |
| `.spine/.json/.skel` | projeto/data Spine | Conforme runtime |
| `.atlas` (Spine) | texture atlas metadata | Conforme runtime |
| `manifest.json` | provenance/build/version | Recomendado |

`.blend` nunca aparece nesta tabela como "vai para runtime" — e sempre artefato de compilacao
intermediario, nunca o produto final distribuido no jogo.

## Provenance JSON por Output Gerado por IA

```json
{
  "generator": { "engine": "comfyui", "workflow": "qwen_character_edit.v3", "workflow_sha256": "..." },
  "model": { "id": "Qwen/Qwen-Image-Edit-2511", "revision": "pinned-commit-sha" },
  "generation": { "seed": 142857, "steps": 40 },
  "inputs": { "master_sha256": "...", "pose_sha256": "..." }
}
```

Todo output que passou por um modelo generativo (Qwen, SAM, Wan) carrega esse manifesto ao lado —
`workflow_sha256` e `revision` pinada tornam o output reproduzivel/auditavel; `inputs` com hash de cada
entrada permite o build graph content-addressed decidir se o output precisa ser regenerado (ver
`testing-and-ci.md`).
