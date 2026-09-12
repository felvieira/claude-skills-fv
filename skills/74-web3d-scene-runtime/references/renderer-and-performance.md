# Renderer, Compressao e Orcamento

Detalhe que a `SKILL.md` resume. Estado verificado em 2026-09 na documentacao oficial do three.js e
em levantamento de suporte de browser — reconferir antes de assumir que continua valido.

## Estado do WebGPU

WebGPU atingiu **Baseline em janeiro de 2026**: Chrome/Edge (estavel desde v113), Safari 26+ (macOS
Tahoe 26, iOS 26, iPadOS 26, visionOS 26), Firefox no Windows (v141+) e macOS Tahoe ARM64 (v145+).
Os dois buracos reais: **Firefox no Linux** e **iPhone anterior a A12**.

O `WebGPURenderer` do three.js segue **oficialmente experimental**, com previsao de estabilizar ao
fim de 2026. Isso nao muda a escolha default (ele cai pra WebGL2 sozinho), muda o texto do risco que
vai no ADR.

## Setup

Com bundler:

```js
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGPURenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(canvas.clientWidth, canvas.clientHeight);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
```

Sem bundler, via importmap — precisa do build `three.webgpu.js`, nao do `three.module.js`:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@<versao>/build/three.webgpu.js",
    "three/webgpu": "https://cdn.jsdelivr.net/npm/three@<versao>/build/three.webgpu.js",
    "three/tsl": "https://cdn.jsdelivr.net/npm/three@<versao>/build/three.tsl.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@<versao>/examples/jsm/"
  }
}
</script>
```

Pinar versao exata (o CSV da skill 02 fixa `0.185.1` nas guidelines dele). URL flutuante em producao
quebra sem aviso quando o CDN atualiza.

### Inicializacao

`setAnimationLoop()` **aguarda a inicializacao do backend sozinho** antes do primeiro frame. Chamar
`await renderer.init()` explicitamente e necessario apenas quando algo roda antes do loop: compute
pass, ou um render unico pra gerar thumbnail.

### Forcar WebGL2

```js
new THREE.WebGPURenderer({ antialias: true, forceWebGL: true });
```

Serve pra teste A/B de backend e pra excluir WebGPU deliberadamente. Nao e necessario pra fallback —
esse e automatico.

## O que nao atravessa pro backend WebGPU

| Funciona | Nao atravessa |
|---|---|
| `MeshStandardMaterial`, `MeshBasicMaterial` e demais embutidos (mapeados pro sistema de nodes) | `ShaderMaterial`, `RawShaderMaterial` |
| Texturas, luzes, sombras, GLTF, raycasting | patch via `onBeforeCompile` |
| Post-processing do pipeline de nodes | shader GLSL escrito a mao |

Shader custom precisa ser reescrito em **TSL** (compila pra WGSL no WebGPU e GLSL no WebGL2 —
escreve uma vez, roda nos dois). Esse e o ponto onde migracao de projeto WebGL antigo quebra em
silencio: sem erro de import, so material errado na tela.

## Compressao

| Alvo | Ferramenta | Ganho | Nota |
|---|---|---|---|
| Geometria | **Draco** | 50–90% do tamanho de malha | so geometria |
| Geometria + morph + animacao | **meshopt** | comparavel, cobre mais | projetado pra gzip/Brotli em cima |
| Textura | **KTX2/Basis** | 3–5x menor que JPG, **4–8x menos VRAM** | transcodifica pra formato nativo da GPU e **fica comprimida na memoria** |

A diferenca que decide: Draco e meshopt encolhem o **download**, mas a geometria decodificada volta
a ocupar float32 na RAM/VRAM. KTX2 continua comprimida na GPU — por isso ela melhora render, nao so
carregamento. Em cena com textura pesada, KTX2 e o item de maior impacto.

Para textura: **UASTC** em normal/ORM (qualidade), **ETC1S** no resto (tamanho). KTX2 com
supercompressao Zstandard ja vem compactado — servir com gzip/Brotli em cima rende quase nada.

### Carregando

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';

const draco = new DRACOLoader().setDecoderPath('/draco/');
const ktx2 = new KTX2Loader().setTranscoderPath('/basis/').detectSupport(renderer);

const loader = new GLTFLoader()
  .setDRACOLoader(draco)
  .setKTX2Loader(ktx2);

loader.load('cena.glb', (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(gltf.scene);
});
```

`detectSupport(renderer)` antes de carregar: o KTX2Loader precisa saber quais formatos a GPU aceita
pra escolher o transcode. `setKTX2Loader` precisa ser chamado **antes** do load, senao o erro e
explicito ("must be called before loading KTX2 textures") — melhor que o caso do Draco, que falha
mais tarde.

Percorrer o grafo nao e opcional: `scene.add(gltf.scene)` sozinho **pula silenciosamente** toda
configuracao de sombra e material das meshes filhas.

## Orcamento

Tetos de partida pra hero de landing em device mediano — ponto de partida a medir, nao lei:

| Metrica | Teto sugerido | Por que |
|---|---|---|
| Triangulos visiveis | 150k–300k | acima disso, mobile de entrada derrapa |
| Draw calls | < 150 | cada um custa CPU; instanciar o repetido |
| Peso transferido (3D) | < 3–4 MB | concorre com LCP da pagina |
| Luzes com `castShadow` | 1, raramente 2 | sombra e o multiplicador de custo mais comum |
| Particulas | teto declarado, sempre | sem teto, cresce ate travar |

### Medicao

```js
renderer.info.render.calls      // draw calls no ultimo frame
renderer.info.render.triangles  // triangulos desenhados
renderer.info.memory.geometries // vaza se subir a cada troca de asset
renderer.info.memory.textures
```

`renderer.info.memory` e o detector de vazamento: em configurador que troca peca, esses numeros
devem **voltar ao patamar** depois do `dispose()`. Se sobem monotonicamente, falta dispose.

Medir na **pagina composta** (com fonte, imagem e script do resto do site competindo), em device
real ou throttle equivalente. Cena medida isolada num canvas em branco nao prova nada sobre a
pagina que vai pra producao.

## Matriz de fallback

| Situacao | Deteccao | Entrega |
|---|---|---|
| Sem WebGPU | automatica | WebGL2, sem codigo extra |
| Sem WebGL2 | `WebGL2RenderingContext` ausente | imagem estatica do mesmo enquadramento |
| `prefers-reduced-motion` | `matchMedia` | sem auto-rotate, sem transicao de camera; cena ainda navegavel por acao do usuario |
| Device abaixo do budget | FPS medido nos primeiros segundos | forcar nivel de LOD, cortar sombra, reduzir particula |
| WebGL context lost | evento `webglcontextlost` | tentar recriar uma vez; se falhar, cair pro estatico |

`prefers-reduced-motion` nao significa "desligar o 3D" — significa que **nada se move sozinho**.
Girar porque o visitante arrastou continua permitido; girar sozinho, nao.
