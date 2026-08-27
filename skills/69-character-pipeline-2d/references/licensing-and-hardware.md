# Licenciamento e Hardware

Conteudo denso de apoio ao `SKILL.md` principal. Ver `## Fontes` no arquivo principal.

## Tabela de Licenciamento Completa (14 entradas)

Preservar sempre a tabela inteira quando esta skill for consultada para decisao de redistribuicao —
nao esconder as entradas restritivas.

| Tecnologia | Licenca / situacao | Implicacao comercial |
|---|---|---|
| AccuRIG | gratuito para uso pessoal/comercial | software OK; conteudo Reallusion e separado |
| Blender | GPL | excelente para ferramenta/build; cumprir GPL se redistribuires Blender/modificacoes |
| Qwen Image/Edit/Layered | Apache 2.0 | permissiva |
| DWPose | Apache 2.0 | codigo permissivo |
| MMPose | Apache 2.0 | codigo permissivo; auditar datasets/checkpoints |
| Wan2.2 / Animate-2 | Apache 2.0 | permissiva no projecto/modelos publicados |
| SAM 3/3.1 | SAM License propria | revisao juridica recomendada |
| ComfyUI | GPL-3.0 | atencao ao distribuir software derivado/combinacoes |
| LoongBones | MIT nas docs/runtime publicados | muito amigavel a commercial runtime |
| Spine | licenca comercial propria | runtime condicionado a licenca Spine |
| Godot | MIT | uso comercial permitido |
| Phaser | MIT | uso comercial permitido |
| TexturePacker | comercial | CI requer modalidade adequada |
| Hunyuan3D-2.1 | Tencent Hunyuan Community | avaliar termos/territorio/use restrictions |

## Ressalva AccuRIG — Gratuito Nao Significa Conteudo Reallusion Redistribuivel

Ha uma distincao particularmente importante no ecossistema Reallusion: AccuRIG ser gratuito para uso
comercial **nao significa** que qualquer conteudo comprado no ecossistema Reallusion possa ser
redistribuido em qualquer modalidade. A politica de conteudo atual distingue licencas e condicoes para
conteudos/CC Components e ActorCore; assets adquiridos devem ser auditados **separadamente** do
programa que fez o rig.

Na pratica: o fato do AccuRIG (o software de rigging) estar liberado para uso comercial nao libera
automaticamente um asset de biblioteca CC Components ou ActorCore comprado separadamente para
redistribuicao dentro de um jogo — cada aquisicao de conteudo carrega seus proprios termos, que devem
ser verificados individualmente antes de embarcar o asset no produto final.

## Manifesto de Licenca por Asset

```json
{
  "licenses": {
    "character_mesh": { "source": "original", "license": "studio-owned" },
    "rig_tool": { "name": "AccuRIG" },
    "motion": { "source": "internal_mocap", "license": "studio-owned" },
    "image_model": { "name": "Qwen-Image-Edit-2511", "license": "Apache-2.0" }
  }
}
```

Cada asset final carrega o manifesto de proveniencia de licenca junto — permite auditoria rapida antes
de qualquer release, sem precisar reconstruir de memoria qual ferramenta/modelo gerou cada componente.

## Classes de Hardware

**CPU/light GPU**: LLM orchestration, JSON validation, atlas packing, glTF manifest, unit tests,
Blender import/export basico.

**Medium GPU**: Blender real-time raster, DWPose, MMPose, SAM.

**Heavy generative GPU**: Qwen-Image-Edit, Qwen-Image-Layered, Wan Animate, Hunyuan3D texture
generation.

### Numeros Reais de VRAM

- **Qwen-Image** (modelo base 20B parametros) em BF16 — so os pesos de 20 mil milhoes de parametros
  representam teoricamente cerca de 20×10⁹ × 2 bytes ≈ **40 GB**, antes de activations, VAE, text
  encoders e overhead. Uma GPU de 24 GB **nao** deve ser planejada como suficiente para BF16 puro;
  quantizacao/offload ou multi-GPU torna-se necessaria.
- **Wan-Animate-2** usa um modelo 14B, instalacao oficial mostra stack moderna CUDA/PyTorch, oferece
  variante distilled com dez steps — **nao colocar estimativa fixa de VRAM sem benchmark na maquina de
  producao real** (modelo, resolucao, duracao, attention implementation e offloading alteram fortemente
  o consumo).
- **Hunyuan3D-2.1**: ~10 GB para shape generation, ~21 GB para texture generation, ~29 GB para a
  pipeline completa.
- **SAM 3.1**: Meta reporta melhorias de throughput em hardware H100, incluindo processamento de
  multiplos objetos — mais razoavel para mask refinement em batch do que usar um grande diffusion
  model para cada mascara.
- **DWPose** tem variantes tiny/small/medium/large, pode ser escolha de throughput para extracao
  massiva de pose 2D.
- **ComfyUI** ja inclui mecanismos de gestao de VRAM/RAM, model offloading e suporte para modelos
  quantizados, mas deve continuar sendo tratado como worker, nao dono da logica (ver
  `assetctl-cli-reference.md`).

## Setup de Producao Sugerido

```text
Machine A
CPU CI runner
32 GB RAM
Blender smoke tests, schema, atlas, glTF validation

Machine B
GPU 24 GB
pose, SAM, Blender renders

Machine C
GPU 48/80 GB ou cloud
Qwen native, Wan, heavy generation
```

Se orcamento limitado, B e C podem ser a mesma maquina com modelos descarregados entre jobs.
