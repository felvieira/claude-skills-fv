# Mapa de Tecnologias de IA para Movimento

Conteudo denso de apoio ao `SKILL.md` principal. Ver `## Fontes` no arquivo principal.

## Nao existe uma unica categoria de "IA pra animacao"

Ha pelo menos cinco familias distintas, e confundi-las e o erro mais comum ao planejar um pipeline:

1. **text-to-motion** — SayMotion, MDM, MoMask (texto entra, movimento sai)
2. **video-to-motion** — DeepMotion Animate 3D, Rokoko Vision, Move.ai (video entra, movimento sai)
3. **2D pose estimation** — OpenPose, MoveNet (imagem/video entra, keypoints 2D saem — **nao** e
   geracao de animacao)
4. **3D pose estimation** — MediaPipe
5. **retargeting/motion cleanup** — Auto-Rig Pro, Rokoko Studio, MotionBuilder (nao geram movimento,
   adaptam movimento existente a um rig diferente)

## Tabela comparativa completa

| Tecnologia | Entrada | Saida util | Gera motion? | Retarget necessario? | Melhor cenario |
|---|---|---|---|---|---|
| **DeepMotion SayMotion** | Texto | FBX, BVH, GLB | Sim | Baixo/medio | Text-to-motion rapido |
| **DeepMotion Animate 3D** | Video | FBX, BVH, GLB | Captura | Baixo/medio | Video unico -> mocap |
| **Rokoko Vision/Studio** | Video/texto | FBX, BVH | Captura/geracao | Medio | Producao + cleanup |
| **Move.ai** | Video | FBX, BVH, GLB, BLEND, JSON | Captura | Baixo/medio | Mocap de maior controle |
| **MDM** | Texto | NPY XYZ, SMPL | Sim | **Alto** | Pipeline ML local |
| **MoMask** | Texto | Representacao de motion | Sim | **Alto** | Investigacao/local |
| **OpenPose** | Imagem/video | Keypoints 2D | Nao | **Muito alto** | Tracking/conditioning |
| **MoveNet** | Imagem/video | 17 keypoints 2D | Nao | **Muito alto** | Pose estimation realtime |
| **Mixamo** | Mesh/biblioteca de anim | FBX | Biblioteca | Medio | Animacao pronta |
| **Auto-Rig Pro** | Rigs/BVH/FBX | Action Blender | Nao | E o proprio retargeter | Retarget em DCC |
| **MotionBuilder** | Rigs/mocap | FBX/HIK | Nao | E o proprio retargeter | Pipeline high-end |

## Detalhe por ferramenta

**DeepMotion SayMotion** — recebe texto, exporta `.FBX`/`.GLB`/`.BVH` + preview MP4. Permite enviar
personagem humanoide customizado e baixar animacao ja retargeted pra ele, o que pode eliminar boa
parte da complexidade do script Blender quando o servico ja resolve o retargeting no lado dele.

**Rokoko** — Vision (captura visual -> movimento) alimenta Studio (retarget pro personagem, export
FBX/BVH com presets HumanIK/Mixamo). Vantagem: camada de edicao/cleanup pensada pra animador humano
revisar antes de exportar.

**Move.ai** — fornece FBX, BVH, GLB, USDZ, `.blend` **e JSON**. O JSON representa hierarquia
skeletal, rotacoes articulares e keyframes diretamente — evita ter que fazer parsing de FBX e liga o
backend direto ao script Python sem passar por um formato binario intermediario.

**MDM (Motion Diffusion Model)** — modelo de difusao executavel localmente, text-to-motion, com
controle de seed e duracao. Output: `results.npy` com prompts e posicoes XYZ do movimento — permite
conversao posterior pra SMPL. **MDM output != Blender bone rotations diretamente.** Caminho completo:
XYZ joints -> reconstruir orientacoes osseas -> resolver IK/joint rotations -> mapear skeleton ->
AccuRIG rest pose -> Blender Action. Caminho alternativo, normalmente mais previsivel: MDM -> SMPL
parameters -> SMPL rig -> retarget SMPL -> AccuRIG.

**MoMask** — modelo generativo CVPR 2024, masked modelling, geracao + temporal inpainting, com
integracao comunitaria com Blender ja referida por terceiros. Bom quando o requisito e 100% local +
geracao textual + investigacao + zero dependencia cloud. Compartilha com MDM o mesmo problema de
output de pesquisa precisar de uma camada de adaptacao antes de virar Action no Blender.

**OpenPose** — **nao** e gerador de animacao, e estimador de keypoints (corpo/maos/face/pes, ate 135
keypoints). Fluxo completo pra virar animacao utilizavel: video -> OpenPose -> keypoints 2D ->
3D lifting -> temporal filtering -> IK -> bone rotations -> retarget. **Nao existe** um caminho direto
OpenPose -> FBX.

**MoveNet** — 17 keypoints, variantes Lightning (latencia baixa) e Thunder (precisao maior). Boa pra
deteccao 2D rapida/interativa, mas nao e solucao de motion capture skeletal 3D isolada — precisa da
mesma cadeia de lifting/IK que OpenPose pra virar animacao 3D.

**Mixamo** — biblioteca de movimentos + auto-rigger, **nao** e modelo generativo text-to-motion.

## AccuRIG AI Deep Search vs modelo de sintese real

Distincao importante dentro do proprio AccuRIG 2: a funcionalidade **AI Deep Search** nao deve ser
interpretada como um gerador text-to-motion. A versao 2 introduziu pesquisa semantica/natural-language
sobre mais de 4500 movimentos da biblioteca ActorCore, com preview e retargeting dentro do proprio
AccuRIG. Na pratica, e uma IA de **pesquisa de movimentos existentes**, nao um modelo de sintese que
inventa uma animacao arbitraria a partir do texto.

Um prompt como "old man walking slowly, tired" pode funcionar de duas formas completamente diferentes
dependendo da ferramenta:

- **AccuRIG AI Deep Search** encontra o motion existente mais proximo na biblioteca curada — bom
  quando ja existe animacao proxima capturada/curada pra esse tipo de movimento.
- **Text-to-motion model** (SayMotion, MDM, MoMask) sintetiza uma sequencia nova — mais flexivel pra
  acoes raras ou variacoes procedurais que nenhuma biblioteca cobriria.

Escolher a ferramenta errada pra essa distincao e a causa mais comum de expectativa desalinhada num
pipeline com IA de motion: pedir "busca semantica" quando o requisito real era "sintese" (ou
vice-versa) gera resultado tecnicamente correto mas funcionalmente inutil pro caso de uso.

## Os 4 formatos de output de IA

Toda ferramenta de IA de motion devolve o resultado numa destas quatro representacoes — reconhecer
qual e critico antes de escrever qualquer codigo de integracao:

1. **Bone rotations** (JSON com fps, frames, root translation, bones com quaternion `[w, x, y, z]`) —
   mais facil de aplicar diretamente no Blender **desde que** o espaco de rotacao e a rest pose sejam
   conhecidos e declarados.
2. **XYZ joints** (shape `frames x joints x 3`, comum em MDM) — problema: posicao dos joints **nao** e
   rotacao local dos bones. Precisa calcular a orientacao de cada segmento e resolver graus de
   liberdade nao observaveis (twist ao redor do proprio eixo do osso nao e deduzivel so da posicao das
   pontas).
3. **SMPL/SMPL-X parameters** — melhor que XYZ puro, ja e representacao parametrica de pose (angulos
   articulares parametrizados), reduz a ambiguidade de twist do formato XYZ puro.
4. **FBX/BVH/GLB** — mais simples de integrar quando o fornecedor de IA ja resolveu as articulacoes
   do lado dele (DeepMotion, Rokoko, Move.ai) — o trabalho de lifting/IK ja foi feito antes da entrega.

Ver `retargeting-math-and-scripts.md` pro formato canonico JSON proprio recomendado pra normalizar
qualquer uma dessas quatro representacoes antes do retargeting.
