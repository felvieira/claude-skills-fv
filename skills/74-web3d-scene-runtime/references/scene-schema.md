# Scene Description — Schema

O artefato que o LLM emite e o runtime consome. Um campo por decisao de cena; nenhuma linha de
codigo de render. Trocar `camera.position` neste JSON muda o enquadramento sem tocar no runtime —
essa e a propriedade inteira que justifica o contrato existir.

Mesma disciplina do `MotionPlan.json` da skill 69: o LLM dirige **intencao**, nunca a matematica.

## Regra de ouro

Se um campo obriga o LLM a saber three.js, o campo esta errado. `camera.framing: "close"` e decisao
de cena; `camera.fov: 47.3` e implementacao. O runtime traduz um no outro.

## Schema

```json
{
  "schemaVersion": "scene-description.v1",
  "meta": {
    "name": "configurador-tenis",
    "intent": "visitante gira o produto e troca a cor do cabedal",
    "aestheticAnchor": "refined dark"
  },
  "renderer": {
    "backend": "auto",
    "toneMapping": "aces",
    "colorSpace": "srgb",
    "pixelRatioCap": 2,
    "antialias": true
  },
  "camera": {
    "type": "perspective",
    "framing": "product",
    "position": [0, 1.2, 3.5],
    "target": [0, 0.8, 0],
    "fovRange": [45, 60],
    "controls": {
      "mode": "orbit",
      "damping": true,
      "polarLimit": [10, 85],
      "zoomRange": [2, 6],
      "autoRotate": { "enabled": true, "stopOnInteract": true }
    }
  },
  "environment": {
    "background": "token:surface",
    "hdri": { "src": "studio-soft.hdr", "intensity": 0.8 },
    "fog": { "type": "exp2", "density": 0.015 }
  },
  "lights": [
    { "id": "key", "type": "directional", "intensity": 2.4, "position": [3, 5, 2], "castShadow": true },
    { "id": "fill", "type": "ambient", "intensity": 0.35 }
  ],
  "assets": [
    {
      "id": "produto",
      "src": "tenis.glb",
      "compression": { "geometry": "draco", "texture": "ktx2" },
      "transform": { "position": [0, 0, 0], "rotation": [0, 0.4, 0], "scale": 1 },
      "receiveShadow": false,
      "castShadow": true,
      "lod": [
        { "distance": 0, "src": "tenis.glb" },
        { "distance": 8, "src": "tenis-low.glb" }
      ]
    }
  ],
  "materialOverrides": [
    {
      "target": "produto/cabedal",
      "variants": [
        { "id": "preto", "color": "token:fg", "roughness": 0.7 },
        { "id": "areia", "color": "#c8b89a", "roughness": 0.6 }
      ],
      "default": "preto"
    }
  ],
  "particles": null,
  "interactions": [
    {
      "id": "focar-solado",
      "trigger": { "type": "click", "target": "produto/solado" },
      "action": { "type": "cameraFocus", "target": "produto/solado", "duration": 0.6 }
    }
  ],
  "budget": {
    "triangles": 250000,
    "drawCalls": 120,
    "transferredKb": 3500
  },
  "fallback": {
    "noWebGL2": { "type": "image", "src": "tenis-hero.webp" },
    "reducedMotion": { "autoRotate": false, "transitions": "instant" },
    "overBudget": { "type": "lod-only", "maxLevel": 1 }
  },
  "a11y": {
    "canvasLabel": "Tenis em 3D, arraste para girar",
    "keyboardPath": "botoes de variante de cor fora do canvas, com foco visivel"
  }
}
```

## Campos

| Campo | Obrigatorio | Nota |
|---|---|---|
| `schemaVersion` | sim | trava o contrato; runtime recusa versao desconhecida em vez de adivinhar |
| `meta.intent` | sim | uma frase do que o visitante faz. Se nao da pra escrever, a cena nao foi decidida |
| `meta.aestheticAnchor` | sim | mesma ancora da skill 02 — cena 3D nao escapa da ancora da pagina |
| `renderer.backend` | sim | `auto` (default, WebGPU com fallback), `webgpu`, `webgl` |
| `camera.framing` | sim | `product`, `interior`, `landscape`, `character` — o runtime deriva FOV/dist |
| `camera.controls.polarLimit` | sim quando `mode: orbit` | sem limite, o visitante ve o avesso do modelo |
| `environment.hdri` | nao | HDRI resolve iluminacao de produto melhor que somar luzes |
| `lights[]` | sim | minimo ambient + directional. `castShadow` seletivo, nunca em tudo |
| `assets[].compression` | sim | declarar explicitamente; ausencia significa asset cru (quase sempre erro) |
| `assets[].lod` | nao | obrigatorio se o budget nao fecha sem LOD |
| `materialOverrides[].variants` | nao | o que existe aqui e o que o configurador pode trocar |
| `interactions[]` | nao | vazio = cena so navegavel. Cada entrada exige alvo de raycasting real |
| `budget` | sim | teto medido, nao aspiracional |
| `fallback` | sim | os tres casos. `null` em qualquer um reprova o gate |
| `a11y` | sim | label do canvas + caminho que nao dependa de clicar no objeto |

## Validacao

O runtime rejeita, em vez de renderizar cena silenciosamente errada:

1. `schemaVersion` desconhecida → erro, nao "melhor esforco"
2. `fallback` incompleto → erro (e o campo que mais some em pressa)
3. `interactions[].trigger.target` que nao existe no grafo do asset → erro nomeando o alvo, porque
   o sintoma natural desse bug e "clique nao faz nada", que custa horas pra diagnosticar
4. `assets[].src` sem `compression` → warning alto, com o peso cru medido no log
5. `budget` ausente → erro; cena sem teto declarado nao tem como reprovar no checkpoint

## Referencia entre alvos

`"produto/cabedal"` = `id` do asset + `/` + nome do node dentro do GLB. O runtime resolve
percorrendo o grafo (`traverse`), que e a mesma razao pela qual raycasting precisa da flag recursiva:
as meshes de um GLB sao descendentes de um `Group`, nunca filhos diretos da cena.
