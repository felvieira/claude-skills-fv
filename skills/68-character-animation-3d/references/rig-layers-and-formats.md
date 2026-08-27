# Camadas de Rig e Formatos de Arquivo

Conteudo denso de apoio ao `SKILL.md` principal. Ver `## Fontes` no arquivo principal para
proveniencia — este material vem do whitepaper tecnico original fornecido pelo usuario.

## AccuRIG como certificador de rig, nao control rig de animacao

O AccuRIG 2 recebe modelos estaticos em **FBX ou OBJ**. Fluxo oficial: verificacao da orientacao e
linha central, colocacao/ajuste dos joints do corpo, configuracao das maos e dedos, calibracao do
esqueleto, teste do rig atraves de movimentos de preview.

O resultado deve ser tratado como um **deformation rig** — root/hips -> spine chain -> neck/head,
clavicle -> arm -> forearm -> hand -> fingers de cada lado, thigh -> shin -> foot -> toe de cada lado
— com skinned mesh e vertex groups/skin weights.

Nao esperar que o FBX exportado do AccuRIG seja equivalente a um control rig de animacao sofisticado
(widgets, pole targets, switches FK/IK). A solucao oficial da Reallusion pra Blender (Auto Setup)
disponibiliza depois a criacao de um **Rigify control rig**, retargeting e edicao IK/FK — mas o
esqueleto de intercambio em si deve ser tratado sobretudo como rig de deformacao/animacao, deixando o
control rig especifico do DCC pro Blender construir.

## O que sobrevive ao intercambio entre ferramentas

| Camada | Sobrevive ao intercambio? | Estrategia |
|---|---|---|
| Deform bones | Sim | FBX/skin |
| Keyframes | Sim | FBX/BVH/GLB |
| IK/FK controls | Nao assumir | Reconstruir em Blender |
| Custom constraints | Nao assumir | Bake antes de exportar |
| Drivers especificos do DCC | Nao assumir | Bake/converter |
| Vertex weights | Sim | FBX/glTF |
| Shape keys / morphs | Depende do asset | Validar individualmente por arquivo |

Blendshapes/morph targets/shape keys: o fluxo padrao do AccuRIG e orientado a construcao do esqueleto
corporal e das maos, nao facial. Character Creator/Auto Setup suporta morphs faciais muito mais
sofisticados. Para um personagem arbitrario, tratar blendshapes pre-existentes como dado que precisa
de teste explicito no arquivo exportado — nunca como algo que o AccuRIG vai gerar ou preservar
garantidamente.

## Deform bones vs pose bones vs actions vs constraints (Blender)

Distincao critica que evita a classe de bug mais comum em automacao com `bpy`: `armature.data.bones[...]`
e `armature.pose.bones[...]` **nao sao conceitos intercambiaveis**.

| Conceito | O que representa | Onde vive no Blender |
|---|---|---|
| Edit/Data Bone | Estrutura e rest pose | `armature.data.bones[...]`, `matrix_local` |
| Pose Bone | Transformacao animada | `armature.pose.bones[...]` |
| Action / FCurve | Keyframes | Anexada ao objeto armature via `animation_data` |
| Constraint | Relacao procedural (Copy Rotation, IK, Child Of) | Vive no Pose Bone, deve eventualmente ser baked |

Regra pratica: **Edit/Data Bone = estrutura e rest pose. Pose Bone = transformacao animada. Action/FCurve
= keyframes. Constraint = relacao procedural que deve eventualmente ser baked.** Escrever codigo que
confunde estrutura (rest) com pose (animada) e a causa mais comum de retargeting que "parece certo
visualmente mas esta matematicamente errado" — funciona por acidente numa pose e quebra na proxima.

Pose estatica = Action com um unico frame. Clip animado = Action com N frames. Nao ha um terceiro tipo
de dado — a diferenca entre "pose" e "animacao" no Blender e so o numero de frames na Action.

## Tabela de formatos

| Formato | Saida direta AccuRIG | Skeleton | Skin | Animacao | Morphs | Melhor uso |
|---|---|---|---|---|---|---|
| **FBX** | **Sim** | Sim | Sim | Sim | Possivel | AccuRIG -> Blender/DCC |
| **USD** | **Sim** | Sim/cena | Sim | Sim | Depende | Omniverse/pipelines USD |
| **glTF/GLB** | Nao | Sim | Sim | Sim | Sim | Web, runtime, engines |
| **BVH** | Nao como export principal | Sim | Nao | Sim | Nao | Mocap/retargeting |
| **Alembic** | Nao | Nao e o foco | Cache de geometria | Baked | Baked | Simulacao/cache final |
| **NPY/JSON** | Nao | Esquema proprio | Nao | Dados brutos | Esquema proprio | IA e pipelines custom |

FBX deve ser o formato de trabalho primario entre AccuRIG e Blender — e o unico com suporte oficial
de preset pro Blender no exportador do AccuRIG. glTF e Alembic **nao sao saidas diretas do AccuRIG**;
precisam ser produzidas numa segunda etapa pelo Blender, depois do FBX ja ter passado pelo pipeline de
retargeting/bake.

glTF vale a pena depois de a animacao estar finalizada (suporta shape keys/morph targets nativamente).
BVH armazena hierarquia skeletal + animacao — util como formato intermediario de mocap/retargeting,
mas nao transporta o personagem completo (sem skin, sem mesh). Alembic congela o resultado visual numa
cache de geometria — excelente pra render/VFX, fraco pra continuar manipulando o rig depois (a
animacao ja esta assada em posicoes de vertice, nao em rotacao de osso).

## Export AccuRIG -> Blender: parametros

Ao exportar do AccuRIG para uso no Blender:

- **Export format**: FBX (ha preset dedicado "Target Application: Blender")
- **Include**: Character, Motion, ou ambos — recomendado manter um FBX "master" do personagem
  separado dos FBX de movimento, pra nao reexportar a mesh toda vez que um novo motion e gerado
- **Textures**: limitar resolucao (ate 4096), desativar Embed Texture se for usar Auto Setup depois
  (Auto Setup gerencia material/textura por conta propria)
- **FPS**: definir conscientemente (24/25/30/60) — mismatch de FPS entre character e motion e fonte
  comum de dessincronia sutil de timing
- **Move in Place**: separar locomotion visual do root motion quando o alvo e jogo (engine cuida do
  deslocamento via fisica/input); preservar deslocamento quando o alvo e cinematica/render linear
- **First frame T-Pose/Bind-Pose**: incluir sempre — e a referencia que o retargeting automatizado usa
  pra calcular delta de rotacao relativo a rest pose (ver `retargeting-math-and-scripts.md`)

## Auto Setup (Reallusion) — dependencia opcional, nao universal

Auto Setup simplifica material/shader/motion/Rigify, mas exige **Blender 4.2 LTS+** e e
**Windows-only** — nao deve ser a unica dependencia do pipeline se for preciso suportar Blender 3.x ou
execucao headless em servidor Linux.

| Ambiente alvo | Estrategia recomendada |
|---|---|
| Blender 3.x | FBX puro + `bpy` + retarget proprio ou Auto-Rig Pro |
| Blender 4.2+ Windows | FBX puro OU Auto Setup |
| Blender headless/servidor | Preferencialmente FBX puro + `bpy` (Auto Setup nao roda em Linux headless) |
