---
name: character-animation-3d
description: |
  Skill de pipeline de conteudo/asset para animacao de personagem 3D humanoide via AccuRIG + Blender
  headless + IA de motion. Cobre rigging com AccuRIG (deform rig, nao control rig), Blender como
  "compilador de animacao" via CLI (`--background --python`), a distincao critica entre deform bones,
  pose bones, actions e constraints, formatos (FBX/USD/glTF/BVH/Alembic/NPY-JSON) e quando usar cada
  um, o mapa de tecnologias de IA de motion (text-to-motion, video-to-motion, pose estimation,
  retargeting tool), a distincao AccuRIG AI Deep Search (busca semantica) vs modelo de sintese real
  (SayMotion/MDM/MoMask), o conceito de canonical/semantic skeleton com bone aliasing, a matematica de
  retargeting via delta de rotacao relativo a rest pose, root motion tratado separadamente, e bake de
  constraints/IK via `bpy.ops.nla.bake()`. Nao cobre codigo de engine (Unity/Unreal) — ver skill 67.
  Trigger em: "AccuRIG", "rig de personagem 3D", "retargeting de animacao", "Blender headless",
  "blender --background --python", "bpy armature", "deform bones vs pose bones", "canonical skeleton",
  "semantic bone mapping", "BONE_ALIASES", "text-to-motion", "video-to-motion", "SayMotion",
  "DeepMotion", "Rokoko", "Move.ai", "MDM motion diffusion", "MoMask", "OpenPose retargeting",
  "MoveNet pose estimation", "AccuRIG AI Deep Search", "root motion", "bake de constraints animacao",
  "bpy.ops.nla.bake", "pipeline de animacao de personagem", "FBX para Blender animacao",
  "exportar GLB animado", "Alembic cache de animacao", "mocap para Blender".
---

# Character Animation 3D — AccuRIG, Blender Headless e IA de Motion

Pipeline de conteudo/asset para animar personagem 3D humanoide: **AccuRIG certifica o rig -> IA
gera/extrai movimento -> Blender compila (retarget + bake) -> FBX/glTF/Alembic sai pronto pro
consumidor final** (engine, render, cinematica). Esta skill nao escreve codigo de gameplay — para isso
ver `skills/67-game-engine-development/SKILL.md`.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/source-driven.md` e
`policies/token-efficiency.md`.

Conteudo denso (tabelas completas, scripts Python/bpy inteiros) vive em `references/` — carregar so o
arquivo do topico relevante a task, nao os quatro de cara:

| Assunto | Arquivo |
|---|---|
| Camadas de rig (deform/pose/action/constraint), tabela de formatos, export AccuRIG->Blender | `references/rig-layers-and-formats.md` |
| Blender CLI headless, import multi-formato, semantic bone mapping (`BONE_ALIASES` completo) | `references/blender-cli-and-semantic-mapping.md` |
| Mapa comparativo de IA de motion, AccuRIG AI Deep Search vs sintese, os 4 formatos de output de IA | `references/ai-motion-tech-map.md` |
| Matematica de retargeting, root motion, bake de constraints, script completo de pipeline CLI | `references/retargeting-math-and-scripts.md` |

## Quando Usar

- montar/revisar pipeline de rigging humanoide com AccuRIG (export pro Blender, formato, FPS/Move-in-Place/T-Pose)
- escrever/depurar script `bpy` headless (`blender --background --python`) pra import/retarget/bake/export
- implementar/revisar semantic bone mapping / canonical skeleton pra desacoplar codigo de nomes de bone
  de exportador especifico
- escolher tecnologia de IA de motion (text-to-motion vs video-to-motion vs pose estimation vs
  retargeting tool) pro caso de uso
- implementar retargeting real entre esqueletos com proporcao/rest-pose diferentes (nao so copiar rotacao)
- separar e calcular root motion corretamente (escala por altura, uma unica entidade responsavel)
- bake de constraints/IK antes de exportar pra formato/engine que nao preserva constraint procedural
- decidir entre FBX/USD/glTF/BVH/Alembic/NPY-JSON pra uma etapa especifica do pipeline

## Quando Nao Usar

- codigo de gameplay em Unity C#/Unreal C++ que consome a animacao pronta — `skills/67-game-engine-development/SKILL.md`
- arquitetura de sistema de jogo ou balanceamento — `skills/66-game-architecture-design/SKILL.md`
- gerar o modelo 3D/mesh do personagem do zero (assume mesh estatica ja existente entrando no AccuRIG)
- pipeline de animacao 2D (sprite, esqueleto 2D, Spine/DragonBones) — skill 69 (character-pipeline-2d) quando existir
- gerar textura/material/shader do personagem — fora de escopo

## Entradas Esperadas

- estagio do pipeline em questao (rig, script Blender, fonte de IA, retargeting, export) — a skill cobre
  a cadeia inteira mas cada task normalmente foca um estagio
- formato de entrada disponivel (FBX do AccuRIG, BVH/FBX/GLB/JSON de fonte de IA, `.npy` de MDM)
- se ja existe canonical skeleton/mapeamento semantico no projeto, ou precisa ser criado
- ambiente de execucao do Blender (versao, headless/servidor vs desktop, Windows vs Linux — determina
  se Auto Setup e viavel)
- formato de saida exigido pelo consumidor final (engine, render/Alembic, web/glTF)

## Saidas Esperadas

- script(s) `bpy` organizados por responsabilidade (import, mapeamento, retarget, bake, export) — nunca
  um monolito misturando as cinco camadas
- mapeamento semantico validado contra bones essenciais do rig-alvo, com falha explicita quando algo falta
- justificativa de escolha de formato em cada fronteira do pipeline, amarrada a
  `references/rig-layers-and-formats.md`
- root motion tratado separadamente das rotacoes de membro, uma unica entidade responsavel
- constraints/IK assadas (`bpy.ops.nla.bake`) antes do export final

## Arquitetura em Camadas

```
AccuRIG (certifica deform rig) -> FBX -> Blender (compilador de animacao via CLI headless)
                                            |
                    IA de motion (texto/video/biblioteca) -> Canonical Skeleton -> Retarget
                                            |
                                   Bake (constraints/IK) -> Export (FBX/GLB/ABC)
```

**AccuRIG certifica o rig, nao e control rig de animacao.** O FBX que sai dele e um deformation rig
(skinned mesh + vertex groups) — widgets IK/FK, pole targets e switches ficam a cargo do Blender (Auto
Setup/Rigify) ou de retargeter dedicado (Auto-Rig Pro). Tabela completa do que sobrevive ao intercambio
em `references/rig-layers-and-formats.md`.

**Blender e o compilador de animacao**, headless via `blender --background --python pipeline.py --
--character x.fbx --motion y.bvh --output z.fbx`. O `--` separa argumentos do Blender dos do script
(`argparse`). Invocacao completa, import multi-formato, e `find_armature()` sem hardcode de nome em
`references/blender-cli-and-semantic-mapping.md`.

**A distincao mais cara de errar**: `armature.data.bones[...]` (estrutura/rest pose, `matrix_local`) e
`armature.pose.bones[...]` (transformacao animada) **nao sao intercambiaveis**. Data Bone = estrutura e
rest pose | Pose Bone = transformacao animada | Action/FCurve = keyframes | Constraint = relacao
procedural que deve eventualmente ser baked. Confundir estrutura com pose produz retargeting que
"parece certo numa pose e quebra na proxima" — bug silencioso, nao erro de execucao.

## Canonical Skeleton

Nunca acoplar codigo a nome de bone de exportador especifico (`CC_Base_L_Upperarm`,
`mixamorig:LeftArm`). Trabalhar com conceitos semanticos (`hips`, `left_upper_arm`, `left_forearm`,
etc.) resolvidos pro nome real via `BONE_ALIASES` + `resolve_mapping` (case-insensitive). `CC_Base_*` e
alias tipico do ecossistema Reallusion — **nao e contrato imutavel do AccuRIG**. O pipeline falha
explicitamente (`RuntimeError`) quando falta uma articulacao essencial (`hips`, `left_thigh`,
`left_shin`, `right_thigh`, `right_shin` no minimo) — nunca assume silenciosamente que o bone existe.
Dicionario completo e `strip_namespace` em `references/blender-cli-and-semantic-mapping.md`. Isto e o
que permite trocar AccuRIG por Mixamo/DeepMotion/Rokoko sem reescrever a logica de retargeting — so o
dicionario de aliases muda.

## IA de Motion

Cinco familias, confundi-las e o erro mais comum de planejamento: **text-to-motion** (SayMotion, MDM,
MoMask), **video-to-motion** (DeepMotion Animate 3D, Rokoko Vision, Move.ai), **2D/3D pose estimation**
(OpenPose, MoveNet, MediaPipe — so keypoints, nao geram animacao), e **retargeting/cleanup tool**
(Auto-Rig Pro, Rokoko Studio, MotionBuilder — adaptam movimento existente, nao geram).

**AccuRIG AI Deep Search nao e text-to-motion** — e busca semantica sobre 4500+ movimentos da
biblioteca ActorCore, encontra o mais proximo do prompt, nao sintetiza um novo. "Old man walking
slowly, tired" produz resultado diferente se a ferramenta busca (Deep Search) ou sintetiza
(SayMotion/MDM/MoMask) — confirmar qual o caso de uso exige antes de escolher.

Toda saida de IA de motion cai em 4 representacoes: bone rotations (quaternion, direto se o espaco de
rotacao for conhecido), XYZ joints (MDM, exige lifting), SMPL/SMPL-X (parametrico, menos ambiguo), ou
FBX/BVH/GLB (articulacoes ja resolvidas). Tabela comparativa completa em
`references/ai-motion-tech-map.md`.

## Retargeting e Root Motion

`target.rotation_euler = source.rotation_euler` esta **sempre errado** entre rigs diferentes — a
relacao correta transfere o delta relativo a rest pose:

```
ΔR_source(t) = R_source,pose(t) · R_source,rest⁻¹
R_target,pose(t) = ΔR_source(t) · R_target,rest
```

Script completo (`retarget_frame`, ordem de profundidade hierarquica, world space via quaternion) em
`references/retargeting-math-and-scripts.md`, que tambem cobre o que a matematica **nao** resolve
sozinha: anatomia diferente, spine/clavicula divergente, twist, foot contact, A-Pose vs T-Pose.

**Root motion e sempre separado das rotacoes de membro.** Escalar deslocamento pela proporcao de
altura/perna (`Δp_t(t) = Δp_s(t) × (h_t/h_s)`) — nunca copiar `location` bruto entre personagens de
proporcao diferente. Uma unica entidade responsavel pelo deslocamento global (Armature object OU Root
bone OU Hips, nunca as tres — produz deslizamento duplicado). Modelo limpo pra engine:
`Root (mundo) -> Hips (local) -> skeleton`.

Bake final: `bpy.ops.nla.bake(visual_keying=True, clear_constraints=True, bake_types={"POSE"})` —
converte resultado visual de IK/Copy Rotation/Copy Transforms em keyframes explicitas, obrigatorio
antes de exportar pra formato/engine que nao preserva constraint procedural.

## Regras Duras

| Nunca | Em vez disso |
|---|---|
| Acoplar codigo a nome de bone de exportador especifico (`CC_Base_L_Upperarm`) | Canonical skeleton + `BONE_ALIASES` + `resolve_mapping` |
| `bpy.data.objects["Armature"]` hardcoded | `find_armature()` por tipo + heuristica de contagem de bones |
| `target.rotation_euler = source.rotation_euler` entre rigs diferentes | Delta de rotacao relativo a rest pose (quaternion, world space) |
| `target.location = source.location` com personagens de altura diferente | Escalar deslocamento por proporcao de perna/altura |
| Misturar Armature object + Root bone + Hips como responsaveis pelo deslocamento global | Uma unica entidade responsavel, nunca as tres |
| Exportar FBX/GLB pra engine sem bake de constraints/IK | `bpy.ops.nla.bake(visual_keying=True, clear_constraints=True)` antes do export |
| Tratar AccuRIG AI Deep Search como gerador text-to-motion | E busca semantica em biblioteca curada — confirmar qual o caso de uso exige |
| Assumir que XYZ joints (MDM) sao rotacao de bone direta | Resolver lifting/IK ou converter via SMPL antes de aplicar |
| Confundir `armature.data.bones` (rest) com `armature.pose.bones` (animado) | Regra fixa: Data Bone = estrutura, Pose Bone = animacao |
| Assumir glTF ou Alembic como saida direta do AccuRIG | So FBX/USD saem direto — glTF/Alembic sao segunda etapa via Blender |

## Handoff

### Recebe de

- Skill 66 (Game Architecture Design) — quando o sistema de combate/locomocao ja decidido precisa da
  animacao de personagem correspondente
- Skill 09 (Orchestrator) — quando a task maior decide que pipeline de conteudo de personagem vem antes
  de integracao de engine

### Entrega para

- Skill 67 (Game Engine Development) — FBX/GLB baked pronto entra como asset consumido por codigo de
  gameplay (Animator Controller no Unity, Anim Blueprint no Unreal)
- Skill 05 (QA Testing) — validacao de que a animacao exportada reproduz corretamente no engine-alvo
  (sem popping, sem foot sliding, sem duplicacao de root motion)

## Evidencia de Conclusao

- script(s) `bpy` executados com sucesso em modo headless (`blender --background --python ... --`),
  sem erro de bone ausente
- mapeamento semantico validado — bones essenciais confirmados presentes, nao assumidos
- FBX/GLB/Alembic final aberto e conferido visualmente (ou visualmente + programaticamente) antes de
  entregar pro consumidor
- root motion confirmado como responsabilidade de uma unica entidade, sem deslocamento duplicado

## Fontes

O conteudo tecnico desta skill (arquitetura em camadas, tabelas de formato, scripts `bpy`, matematica
de retargeting) vem de um whitepaper tecnico original fornecido pelo usuario — pesquisa encomendada
por ele, nao material de terceiro sob licenca a considerar. Nenhum texto foi copiado de repositorio ou
documentacao externa; a estrutura de skill (frontmatter, secoes de Governanca/Handoff, `references/`
sob demanda) segue o formato padrao deste kit, igual as skills 66/67.

O documento fonte, porem, **cita e recomenda ferramentas de terceiro com licencas variadas**. Confirmar
a licenca de cada uma antes de uso comercial em projeto real — esta tabela nao substitui a leitura dos
termos atuais do fornecedor:

| Ferramenta | Licenca / modelo | Observacao |
|---|---|---|
| AccuRIG (Reallusion) | Gratuito p/ uso pessoal e comercial | App de rigging e gratis; conteudo pago do ecossistema Reallusion (ActorCore, Character Creator) e licenciado a parte |
| Blender | GPL | Software livre, sem restricao de uso comercial |
| DeepMotion (SayMotion / Animate 3D) | Servico comercial/cloud | Plano pago por credito/assinatura; ToS do servico rege uso da saida |
| Rokoko (Vision / Studio) | Servico comercial/cloud | Assinatura/hardware; conferir ToS pra uso do conteudo gerado |
| Move.ai | Servico comercial/cloud | Licenciamento proprio, conferir ToS antes de uso comercial |
| MDM (Motion Diffusion Model) | **Nao confirmada no documento fonte** | Checar repositorio oficial antes de uso comercial |
| MoMask | **Nao confirmada no documento fonte** | Modelo academico CVPR 2024, licenca de codigo/pesos nao declarada na fonte |
| Mixamo | Adobe, termos proprios | Gratuito com conta Adobe, mas nao e licenca aberta |
| Auto-Rig Pro | Comercial (Blender Market) | Addon pago, licenca por compra, nao redistribuivel |
| MotionBuilder (Autodesk) | Comercial | Assinatura Autodesk |
| OpenPose | Academica/nao-comercial com excecao paga | Uso comercial exige licenciamento separado da Carnegie Mellon |
| MoveNet (TensorFlow) | Apache 2.0 (via TF Hub) | Permite uso comercial, confirmar termos vigentes no TF Hub |
