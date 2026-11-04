# Geracao de assets 3D (mesh, splat, mocap)

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Como produzir GLB/FBX
para carregar numa cena three.js/web — geracao, retexture, rig e animacao. Esta skill monta a
cena; este arquivo cobre gerar o asset que entra nela.

## Conceito primeiro

- Pipeline concept-first: gerar/aprovar um conceito 2D, depois image-to-3D. Image-to-3D tem
  catalogo maior e mais art direction que text-to-3D.
- Receita de prompt do conceito: sujeito unico centrado, fundo liso.
  - Criatura nao-bipede: camera na altura dos olhos, vista lateral ou 3/4, toda perna visivel e
    afastada do corpo (vista de cima esde a parte de baixo).
  - Bipede para rigging: T-pose ou A-pose, corpo inteiro, frente, bracos afastados do torso.
- Multi-view: campos laterais seguem o lado do SUJEITO (esquerda da personagem = nariz para a
  esquerda do quadro). Folha rotulada pela visao do espectador inverte; par trocado pode fundir
  frente+costas numa casca so.
- Ordem posicional tipica: slot 1 = frente, depois costas, esquerda, direita. Vista lateral no
  slot 1 e lida como frente.

## Regras de schema e custo

- Inspecionar o schema de cada modelo antes de rodar: nomes de parametro, enums e defaults
  mudam mesmo dentro de uma familia. Nunca inventar campo de face/polycount.
- Strings de enum sao exatas ("18K Quad"), nunca freeform.
- Precificar cada etapa com o input real; etapa a jusante nao tem preco ate a saida existir.
- Jobs longos: timeout durante espera e normal, nunca justifica segundo run. Lotes em ondas sob
  teto de concorrencia; relancar recusados na onda seguinte.
- Catalogo de modelos roda: nao hardcodar ids; redescobrir por sessao.

## Cadeia para game-ready

Geometria (multi-view, `texture:false`, `pbr:false` onde sobrescreve) -> UV unwrap ->
retexture -> rig por ULTIMO na topologia de entrega. Cada etapa = run cobrado separado.

Armadilhas da cadeia:

- Retexture que reconstrói UVs descarta o unwrap — preferir flag keep-UVs quando existir.
- Unwrap tem teto de input (~30-44k faces) — remesh antes.
- Normais flipadas/escala/pivot herdados corrente abaixo — confirmar no DCC antes do rig.
- Alimentar GLB adiante, exceto quando o mesh precisa ficar em quads (quads so sobrevivem em
  FBX; glTF triangula). Pipeline quad: pedir topologia quad na geracao, guardar FBX; se o rig
  devolve GLB triangulado, entregar o FBX quad ao lado.
- `hasUVs` prova existencia, nao layout limpo.

## Controle de faces

- Alvos por vendor variam (faceLimit, targetPolycount, faceCount, decimationTarget) e cada um
  tem um piso diferente (~15k a ~100k). Alvo abaixo do piso -> gerar e depois remesh.
- Orcamento de jogo: props ~10k-50k tris. Contagem de quad != tris (cap de quad fica ~metade
  do de tri). Ler o que o enum de topologia significa.
- Texture/geometry separados: `texture:false` = mesh cru barato para texturizar no DCC;
  `delight` tira luz assada (default on; desligar so se shading pintado for o estilo);
  `pbr` pode sobrescrever configuracao de textura — ler a descricao.
- Seeds separados para textura (`textureSeed`) permitem variantes de textura na mesma forma.
- `autoSize` escala para metros reais via escala do node GLB — dimensoes unit-normalizadas nao
  sao falha.

## Rigging e animacao

- Rigging e etapa propria, nao flag do gerador. Riggers humanoides inferem esqueleto bipede
  pela pose; nao-bipedes precisam de `rigType` explicito (quadruped/hexapod/avian/serpentine/
  aquatic — NAO existe valor "biped").
- Animar e rigar sao alternativas em varias familias — a animacao ja auto-riga internamente.
- Rigger devolve GLB ou FBX sem avisar; `animation` retargeta clipe preset (valores prefixados
  pelo rigType, ex `quadruped:walk`); `includeRiggedModel` mantem rig sem clipe. Distinguir
  retarget vs rig via `hasAnimations`/`animationFrameCount` na metadata.
- `poseMode` "a-pose"/"t-pose" (minusculo) nos personagens que vao para rig.
- Download: omitir formato devolve o original byte-a-byte; conversao re-exporta (FBX pode
  perder mapas PBR — guardar o GLB tambem).

## Video-to-motion (mocap)

- Tres saidas: (a) seu mesh auto-rigado+animado no rig do proprio servico (NAO retargeta para
  esqueleto existente — clips em rig proprio precisam de remap de ossos); (b) so a motion em
  esqueleto Mixamo/MetaHuman (para chars ja rigados); (c) flag animation-only em members de mesh.
- Nome de campo mente: `characterFile` = mesh num membro, IMAGEM de referencia noutro — ler o
  tipo declarado do campo, nao o nome.
- Escolher formato de saida no RUN (variantes fbx-blender/unreal/roblox, glb/fbx puro);
  conversao pos nao preserva animacao. FBX pode vir ASCII — importer precisa suportar.
- Controles: `moveInPlace` (locomocao dirigida por codigo), `loop`, frame rate
  (frameRate/fps/targetFps), eixos `forward`/`up` (resultado deitado/virado = eixo errado, nao
  captura ruim).
- Footage: uma pessoa, corpo inteiro em frame o clipe todo, pes visiveis, camera estatica, sem
  oclusores; roupa larga/props escondem juntas. Tetos (~30s, ~30MB, dims pares). Preco segue
  duracao — cortar so o movimento que entrega.
- Sem footage -> gerar performance de referencia: char unico corpo inteiro, fundo liso, camera
  travada, beats descritos.
- Movimento humano apenas; criaturas/nao-bipedes = checagem frame a frame ou pass em DCC.

## Splats e mundos 3D

- Splat != mesh: sem UVs/topologia; volumetrico para walkthrough realtime. Alguns exportam mesh
  de colisao.
- Roteamento de input: texto -> mundo; 1 imagem (flat ou 360 com flag pano so quando e 1 imagem);
  2-8 fotos; video de walkthrough; multiview (2-64); foto de objeto unico -> splat de objeto
  (auto bg removal). `images`/`video` mutuamente exclusivos. Ferramenta de objeto vs de cena e
  o erro mais comum.
- Mesma entrada + mesmo seed reproduz o mundo identico entre tiers -> iterar no Draft barato
  (~1 min), re-rodar params identicos no tier alto. Spread de custo >10x.
- Skybox->splat: modelo de imagem expande foto para equirect 2:1, depois etapa de splat (~1h
  mediana). Multi-view splat e o oposto: rapido/barato, quer parallax em cena estatica.
- Mundo NAO e metrico: medir altura da camera sobre o chao ajustado (~1m tipico); FOV varia por
  mundo mesmo do mesmo modelo — ajustar lens por mundo.
- Metalness de img23d mente: laca/esmalte -> metal -> cara de cromo; deixar metal so em metal real.
- Prep para web: simplificar GLBs para ~15-20k tris, texturas 1K WebP, Meshopt; carregar fisica
  depois da sala na tela.

## Orbit views (angulos novos de um sujeito)

- Nunca pedir "de costas" para modelo de imagem — cada angulo drifta escala/pose/chao (7-53%
  medido). Rota via 3D: imagem -> mesh sem textura -> render clay por camera (Blender) ->
  modelo de imagem com referencia repinta cada layout do original. Mesh trava geometria,
  foto supre identidade.
- Repaint: exatamente 2 referencias (layout + fonte). Terceira copia os erros dela.
- Prompt do repaint: Imagem 1 = frame final exato (clay+chao+sombra+camera), Imagem 2 =
  referencia de design; "follow clay exactly: silhouette, pose, proportions, position, size,
  camera"; sem argila cinza, sem personagens extras, sem texto.
- Conjunto transparente: rodar bg-removal no frame REPINTADO, sombra de estudio vem do render
  clay; verificar cobertura do cutout vs corpo do clay.
- Regenerar so as vistas que falharam.

## Treino de LoRA

- So treinar quando consistencia por referencia drifta — refs de estilo/sujeito muitas vezes
  empatam com LoRA treinada por fracoes do custo.
- `sample_prompts` OBRIGATORIO em run multi-epoca: trainer so publica checkpoint por epoca com
  eles; sem -> so pesos finais, sem fallback quando overfit (epoca mais forte raramente e a ultima).
- Prompts de amostra testam fora do dataset: LoRA de estilo -> sujeitos novos, nunca nomear o
  estilo; personagem -> trigger word + pose/cenario novos.
- Epocas = alavanca linear de custo. Configure cotiza, start lanca: tratar start como gasto total.
- Mesma cara errada em todo output != drift: dataset virou quase-duplicatas de uma composicao —
  consertar diversidade + captions que nomeiam so variaveis + trigger word, nao epocas.
- LoRA treinada roda SO no base do seu contrato `runs_as`/`run_with`; "size mismatch"/"weight
  dimension" na geracao = variante errada do base, nao re-treinar.
