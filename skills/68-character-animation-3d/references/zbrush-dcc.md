# ZBrush — escultura, retopologia, polypaint e export via ponte Python

Destilado do pack `scenario-labs/skills` (MIT, 9 skills de ZBrush), adaptado ao nosso stack.
Como dirigir uma ZBrush instalada via ponte Python embutido (`zbrush.commands`, um socket
plugin na main thread) ou via `-script` em batch. Sem ZBrush instalada, ignorar este arquivo.
Alvo dos exemplos: ZBrush 2026.2.1 no macOS.

## Detectar instalacao

Primeira acao antes de qualquer coisa. Nada de assumir.

```bash
# macOS — procurar o app e o executavel dentro do bundle
ls -d /Applications/*ZBrush* 2>/dev/null
"/Applications/ZBrush 2026/ZBrush.app/Contents/MacOS/ZBrush" -h 2>/dev/null | head -5
# Asset Directory (config do usuario; desde 2026.1 o install e read-only)
ls -d ~/Library/Preferences/Maxon/ZBrush_*/ 2>/dev/null
# pasta GoZ padrao
ls -d ~/Public/Pixologic/GoZBrush 2>/dev/null
```

```powershell
:: Windows
dir "C:\Program Files\Maxon ZBrush 2026\ZBrush.exe"
dir "C:\Program Files\Pixologic\ZBrush*\ZBrush.exe"   :: builds pre-Maxon
dir "%PUBLIC%\Pixologic\GoZBrush"
:: Asset Directory: %USERPROFILE%\AppData\Roaming\Maxon\ZBrush_*/
```

- Sem Linux nativo (Wine nao oficial). Se o host e Linux, avisar e parar.
- Versao real se le de dentro: `zbc.zbrush_info(0)` deve devolver 2026.2. Nao confiar no nome da pasta.
- Ponte viva: testar `zb_launch.ping()` / socket na porta do plugin; ZBrush e single-instance e
  single-driver — uma instancia rodando que o agente nao spawnou NUNCA e reiniciada nem morta.
- Install e read-only desde 2026.1: macros, plugins `.zsc` e `Python/init.py` vao no Asset
  Directory, nunca na pasta do app. Paths relativos de export caem na pasta do app — usar sempre
  paths absolutos fora do install.

## Como dirigir

Tres canais, nesta ordem de preferencia:

1. **Ponte (bridge) numa ZBrush rodando** — todo trabalho interativo. Receita do pack:
   plugin Python carregado no startup (`ZBRUSH_PLUGIN_PATH` apontando para a pasta do plugin,
   `ZB_BRIDGE_AUTOSERVE=1`), que abre um socket e serve requisicoes na main thread, chamando
   `update(redraw_ui=True)` entre polls. Lado agente: `start()` (espera "plugin loaded", porta e
   ping), `run(code)`, `call(module, func, *args)`, `stop(save_to="/abs/x.ztl")`.
   - **Main thread only**: a VM embutida segura o GIL na main thread; thread de socket pura morre
     de fome. Serve loop tem que rodar na main thread.
   - **Um driver por vez**: `start()` recusa segunda instancia.
   - **Chamadas curtas e medidas**: cada call devolve numeros (faces, volume, bytes do arquivo).
     ZRemesher, Decimation e Divide em milhoes levam timeouts de minutos. Timeout nao cancela
     codigo enfileirado — pingar e ler estado antes de mandar mais.
   - **Um interprete so por sessao**: o que um call deixa pra tras fica ate o restart. Nunca
     acrescentar pasta em `sys.path` permanentemente; restaurar `sys.path`, `sys.modules`, stdout
     e cwd depois de cada call (o server do pack faz isso; verificar com `hygiene()`).
2. **`-script` batch** — jobs sem supervisao em arquivos salvos:
   `"ZBrush.app/Contents/MacOS/ZBrush" -script /abs/job.py args /abs/scene.ZPR`. A cena e o
   ULTIMO argumento; args do script comecam em `sys.argv.index("-script") + 2`; reportar por
   arquivos e `sys.exit(code)`. Se ZBrush sai sozinho ao fim do script: verificar no build local.
3. **ZScript / macros** — canal de fallback e para o que Python nao cobre. Macros vao em
   `<Asset Dir>/ZStartup/Macros/<subpasta>/`, nome com 8+ caracteres, subpasta nova exige restart.
   Pressionar tecla segurada (`press_key` quebrado no stub 2026.1) so via macro com `IKeyPress`.

Convencao de prova (vale para tudo abaixo): cada operacao destrutiva devolve um `gate` —
volume via `get_polymesh3d_volume()` e watertight via `is_polymesh3d_solid()`. Antes de confiar:
`exists()` no path do item, porque `set()` em path errado falha em SILENCIO. Revisao visual =
render do canvas em 5 vistas (front, right, back, three-quarter, top) com MatCap Gray numa
folha rotulada — a "orbita" do agente. Nunca declarar modelo pronto sem olhar um render do
estado final. ZTL versionado (`_vNNN`, nunca sobrescrever, manter 3+) antes de qualquer
DynaMesh, ZRemesher, Project All, Boolean, merge ou Decimation — nao existe undo por Python.

Strokes sintetizados existem (`Stroke("(ZObjStrokeV02n<N>=H<x>V<y>...)")` + `canvas_stroke`)
mas com pressao constante. `canvas_click` arrastando NAO esculpe. Edit mode ligado antes de
qualquer stroke — senao o drag carimba outro pixol do tool no canvas. LazyMouse OFF: o radius
engole o inicio do caminho sintetizado. Simetria e por SubTool — re-setar em cada pass.

## Sculpting organico

- Ordem: grande -> pequeno, com gates. Primitivas/ZSpheres/DynaMesh baixo primeiro; primary,
  secondary, tertiary; topology/UVs/export por ultimo. Operacoes deterministicas antes de strokes.
- Pressao e o parametro escondido: stroke scriptado tem pressao constante. Z de referencia:
  clay block 6, descent 6-3-2-1, finish 2-1 (experto usa ~30% de pen pressure). Calibrar uma vez
  por sessao; ajustar um pass inteiro via Morph value parcial (soften) ou negativo (exagerar).
- Clay atraves da forma (pico no centro), linhas ao longo. Standard da aresta/especificidade;
  ClayBuildup substitui o que esta embaixo — nunca depois de detalhe finalizado.
- DynaMesh enquanto as formas mudam; subdivision levels quando assentarem. NUNCA Divide um
  DynaMesh (triangulos e star poles viram lumps): ZRemesher numa copia, Divide, `project_all`.
- Level discipline: big moves em SDiv 1, secondary em 2-3, tertiary e layers so no topo.
  Mid-frequency e onde a sculpt se ganha — poros cedo demais = "dois niveis atras".
- Escada de pontos (cabeca): esfera DynaMesh 128 ≈ 43k; S1 ≈ 96-99k; S2 ≈ 400-826k; S3/S4
  ≈ 1.6-2.4M. DynaMesh points crescem com resolucao ao quadrado; cap 2048 (~24M polys).
- Re-DynaMesh so em Draw mode, mask limpa; com polypaint ligado o remesh mantem paint EM VEZ de
  polygroups (`keep="groups"` ou `"polypaint"`, nunca ambos). Divide mata Morph Target — dial antes.
- Smooth por stroke nao existe (brush Smooth so vira Shift-brush): Deformation Polish ou hPolish.
- Sculptris Pro: sem levels; Dots/FreeHand/Spray only.

## Characters / creatures (realista)

- Causa antes de forma, em planos: massa cranial vs facial, depois massas Bridgeman (caixa da
  testa, bochecha plana, cilindro da maxila, mandibula triangular). Regiao tocada duas vezes =
  replanejar. Detalhe nao salva base fraca — julgar primaries borradas, de longe, de cabeca pra
  baixo, sob tres luzes, desde o primeiro sketch.
- Assimetria mora nas formas grandes (tip do nariz fora do eixo, uma orelha, canto do labio),
  nao so em cicatrizes. Criaturas: misturar 2-3 animais reais sem seams.
- Pele: escala de poro global primeiro (idade/sexo), regioes segundo, breakup terceiro.
  Lids/lips ficam limpos; pele uniforme entre detalhes le plastico. Rugas atravessam a
  compressao, em segmentos curtos conectados. Escamas seguem a anatomia; alpha nunca "termina"
  superficie — testar no modelo 3x enquanto constroi, pass de unificacao a mao.
- Entalhar mais fundo que o confortavel: SSS e luz suave comem sharpness no render.
- Numeros: cabeca 229 mm, eyeball 24 mm, IPD 63 mm, olhos 3-7° para fora; canhao cabeca =
  hairline a 1/6 H, tercos de 5/6 H, olhos a 1/2 H. Stack SDK-only: regular ate ~20-25M;
  HD Geometry so via computer-use (tecla A nao se manda; HD sobre stack de 6-7 niveis = sem
  nivel abaixo do entry HD, teto de 1 bilhao). Projecao: alvo ~3M, StoreMT + layer no topo.
- Cloth/folds: toda dobra comeca num ponto de tensao, termina em outra dobra ou borda, mais
  pesada perto da tensao. Dynamics: Gravity 1-2.5, iteracoes 100-1000, Firmness 1-2 seda / 5-6
  couro, Extract Thick 0.01 pano / 0.03 couro.
- FiberMesh: Max Fibers 11 (milhares), Segments 6, PRE Vis 6-8; groom antes, Divide depois.
- Chifres/dentes: detalhar reto, radial counts 8/5/3, depois dobrar; decimar copia a 20%.

## Stylized / collectibles

- Estilizar NAO e desculpa pra anatomia ruim: landmarks osseos que tocam a superficie como
  baseline, cada exagero e um knob nomeado com numero vs valor real (joelho = metade da perna,
  maos a meio-coxa, canto mandibular a 0.5 da profundidade da cabeca).
- Shape language mensuravel: curvas S e C, zero linhas paralelas, splits 70/30 nunca 50/50,
  flare no topo e taper embaixo, zonas de descanso ao lado de detalhe. Le a 64-128 px.
- Blockout = 90-95% do low poly. Silhueta primeiro: 2-3 variantes de primitivas, lineup com
  IoU < 0.85 entre elas.
- Planos estilizados: cortar com hPolish/TrimDynamic largos, forms encaixadas uma na outra
  (contact shadows). Depois de ZRemesher: `crease_planes` (Groups By Normals 45, Crease PG)
  ANTES de Divide, senao os planos viram mush. Creases sao edge tags — qualquer DynaMesh ou
  ZRemesher posterior exige re-crease.
- Cabelo: planejar chunks antes de esculpir. Malha esculpida: CurveTubes gordos por chunk,
  DynaMesh baixo pra fundir, UM stroke ClayBuildup por clump do melhor angulo, Dam_Standard
  Zsub nas fendas. Strands riggadas: um CurveTube por strand, front->back, um polygroup por
  strand, NUNCA smooth numa strand — regenerar o path. Curve Tube Modifier 20 redondo, 4 quadrado,
  0 flat.
- Toy/colecionavel: parede minima 1 mm (0.85 foi rejeitado), arestas 0.5 mm, fit offset 0.12 mm,
  escala PVC 104% (shrink); articulacao = esferas e discos escondidos pela roupa; flyaways fundidos;
  sem loops fechados (dedos se tocando trancam o molde).

## Hard surface

- Julgado como resultado: toda aresta claramente reta OU claramente curva, planos com highlight
  par, arestas largas o bastante pra pegar luz, tudo "fabricavel".
- Polygroups sao o plano de crease: Groups By Normals 45 (33 pega planos suaves, 60 perde arestas),
  Mirror And Weld, UnCreaseAll, Crease PG. Crease PG depois de suavizar bordas re-endurece o que
  foi amolecido — regroup ou crease by angle.
- Largura de aresta = SmoothSubdiv - CreaseLvl: 0 = razor "muito CG"; 4/3 mais apertado que 4/2;
  working 3/2, bake 4/2. QGrid so pra blocos retos (faceta arcos); arcos = Smooth Subdiv + Crease
  Tolerance tunado por span (22 segurou um arco).
- Booleans exigem inputs limpos: watertight, sem faces coplanares, densidade similar, Dynamic
  levels baixos, nada parcialmente escondido. DSDiv on, um Start group por peca separada; depois
  ZRemesher Detect Edges at Half. Creases, UVs, levels e layers MORREM no boolean; polygroups
  sobrevivem. Make Boolean Mesh com timeout curto.
- Manter vivo: ArrayMesh no cutter, nao no resultado; NanoMesh/ArrayMesh em fasteners instanciados
  (troca tardia = um Edit Mesh swap). Panel Loops de Plouffe: Loops 1, Polish 0, Bevel 0,
  Elevation -100, Double, Ignore Groups.
- Mirror And Weld SEMPRE copia -X sobre +X: metade boa em +X => Deformation Mirror primeiro.
  Slice/Trim/BRadius ignoram simetria.
- ZModeler 2026 crease na criacao (Insert EdgeLoop, Inset); presets do brush seguram action+crease.
  Clicks de poligono, Gizmo drags e pivot sao GUI-only — substituir por Deformation sliders,
  booleans e ZRemesher, ou delegar a humano/computer-use.
- Numeros: cutter cylinders 8/12/16/24/32 lados; ArrayMesh Repeat 4-5 pra vents; ~3 stars max por
  painel base (pinch); high cap ~10M polys/SubTool; block 500-40k polys checado no engine com rig.

## Polypaint + render

- Pintar POR ULTIMO, no top level: polypaint = uma cor por vertice (~4M points por mapa 2K;
  4K num mesh de 4M e desperdicio). Divide antes, nunca depois de pintar.
- Julgar em neutro: SkinShade4, MatCap White01 ou Flat Color — MatCap tintido faz compensar
  demais e o export sai errado. Textura exibida esconde polypaint (`texture_off`).
- Zonas primeiro (amarelo osso/gordura, vermelho tecido fino, azul ocos; homem mais azul no
  terco inferior), depois cobrir com cor de pele a 20-40% — "palhaco de proposito" -> skin que
  deixa as zonas transluzir. Saturacao = dial de estilizacao; pele realista abaixo do meio do picker.
- Mascaras sao o truque: gerador, Mask Adjust, Invert, depois FillObject em RGB Intensity baixo
  (N% = blend de N%). Passes: cavity mais escuro/vermelho, PeaksAndValleys PVRange 14, AO plugin
  com undertone roxo-vermelho. Mask data nao se le por API — provar por cobertura antes/depois.
- Contraste maximo nos olhos e boca (olho: iris com anel escuro, base mais clara, topo escuro).
- Rgb only enquanto pinta — Mrgb grava material. FillObject escala com RGB Intensity.
- UVs num clone pintado = morte: UV Master em Work on Clone, Copy UVs, Paste UVs (mantem paint).
- Render: BPR ok e deterministico; Redshift e app separado (verificar `mx1 product list` antes),
  so material Polypaint mostra paint (Use Material Color 0, Base branca; SSS Weight 1 esconde).
  Error Threshold 0.01 final / 1 em testes; Progressive 64, 25 com denoise; luz principal 0.1 com
  HDRI; perspectiva ON numa beauty (ortografica = look tecnico chato).
- Deliver: `texture_from_polypaint(path, side, flip_v=True)` com UVs; ou OBJ vertex color; ou
  Substance Bridge Send PolyPaint. Turntable: frames por chunks + assemble (Movie>Turntable de
  script nao para e pergunta sobre movie existente).

## Pose + 3D print

- Escala e a primeira decisao: SubTool #1 = box do tamanho do cliente (envelope W×H×D),
  `set_export_scale(target_mm)` em TODOS os SubTools (e per-SubTool). 1/6 = altura de pe / 6.
- Pose no nivel mais baixo; varios SubTools via Transpose Master; pose numa 3D Layer.
  Props carregados (arma, escudo) ficam DENTRO do TPose mesh como pecas rigidas (Auto Groups,
  um grupo por peca solta, maskada inteira) — arrancar e rotacionar depois = espada ao lado da
  mao levantada. Move Topological limpa intersecoes.
- Dois assassinos do transfer TPose>SubT: SubTool parcialmente escondido (Vertex Mismatch) e
  Gizmo 3D deformers no TPose mesh (reordenam pontos — um check de point count NAO pega). Salvar
  o ZPR logo apos TPoseMesh (os dados do Transpose Master moram no ZPR).
- Pecas que dobram juntas precisam de polygon size parecido no nivel 1 (mask blur espalha por
  poligono). Bolts/discos re-posicionados depois da dobra. Pose instavel "destroi o trabalho".
- Rotas deterministicas: (A) TPoseMesh -> OBJ export -> rig externo em Blender/Maya volta com a
  MESMA ordem de vertices -> TPose>SubT; (B) ZSphere rig por codigo (FK); (C) moves rigidos de
  SubTool inteiro por matriz; (D) mask+Gizmo = so humano/computer-use.
- Hollow NUNCA no sculpt de 9M: shell de copia DynaMesh ~128, manter parede interna, Polish,
  subtrair do detalhado intacto via Live Boolean. Create Shell Thickness NAO e mm — medir.
  Resin: toda cavidade com vent em "copos"; parede engrossada por dentro, nunca por fora.
- Decimar no olho (~1M por mesh basta; 10-20k tris ainda imprime): copia, nunca o master;
  mascaras no detalhe que importa antes do Pre-process; pre-process de novo apos qualquer edit.
- Numeros: parede min 1 mm, arestas 0.5 mm, fit offset 0.12 mm (Formlabs), Thickness Min 1 /
  Max 5 em mm; STL nao tem unidade — declarar mm ou mandar 3MF. Live Boolean derruba UVs,
  creases, layers e masks no resultado: boolean na copia de print.

## Retopology + export

- Simetria ON por deliberacao antes de cada ZRemesher — com symmetry on ele remecha metade e
  espelha: Mirror And Weld silencioso que arruina mesh posado/assimetrico.
- Dar problema facil ao ZRemesher: rosto que vai animar entra neutro (expressao volta na nova
  topologia), orelhas e maos remeshed separadas, bordas abertas polidas antes, buracos
  indesejados fechados (sobrevivem e inflam a contagem).
- ZRemesher e pra flow; detalhe volta por projecao: mirar baixo (5-18k num braco), Project All
  com Dist 0.1 (conserta ~90% dos artefatos), SO source e target visiveis mesmo em Solo.
  Target em milhares e aproximado (5 deu 4.963) — ler face count de volta.
- Zonas de perigo na projecao: olhos, boca, axilas, entre dedos, virilha — o que sobra vira
  linhas duras no displacement. Mascar interior dos olhos; reparar com morph target ou
  re-projecao mascarada, NUNCA smoothing. `project_all` exige checkpoint ZTL versionado.
- Guias via polygroups com bordas suavizadas (ZRemesher embute borda serrilhada nos loops);
  Smooth Groups 0 em bordas limpas, 1 em grupos DynaMesh ragged. Sweep de Retry deixa o ULTIMO
  variant — `pick_retry` + retry de volta + confirm.
- Menor nivel = malha de troca (UVs feitas ali, sobem pelos niveis). Mapas comparam niveis de
  UM SubTool, nunca dois. Nivel 1 carrega formas; max-1 micro detalhe.
- Displacement de filme (receita fixa): Flip V ON, Adaptive OFF, DpSubPix 0, 32-bit EXR,
  3 Channels off, Mid = zero do renderer (0 pra 32-bit; registrar o valor usado).
- Tamanho exportado = extensao interna x Export Scale (manter XYZ Size 1-4; 180 cm => scale 90).
  Export Scale/offsets sao por SubTool — mesmo valor em todos, senao olhos flutuam.
- Mesh de IA/scan = referencia de forma, nao topologia pra consertar: engrossar cascas finas,
  DynaMesh cedo (hole fill "atira reto"), reconstruir stack a partir do DynaMesh limpo.
- Por alvo: Maya/Arnold = OBJ nivel 1 quads (Grp OFF senao parte o mesh), cm, EXR 32-bit Mid 0.5,
  normal tangent OpenGL; Unreal/Unity = FBX via Maya/Blender (FBX direto abre dialogo
  inescapavel), Unreal = DirectX green; Blender = OBJ metros, OpenGL; Painter = Substance Bridge
  com Force UV Auto-Unwrap OFF (e global e stripa UVs bons).
- `create_normal_map(..., local_coordinates=True)` = tangent; default False = world (mapa arco-iris).

## Automation (batch, GoZ)

- Um arquivo, um tool, um passo por call: so um zscript/plugin ativo por vez — script que chama
  UV Master/Decimation Master perde o controle e nao volta (o plugin fica com ele). Batch =
  loop no lado do agente, cada passo como call separado com timeout proprio, ping apos timeout,
  restart da ZBrush apos hang. Um script longo dentro do ZBrush morre no primeiro plugin travado.
- Plugins por ultimo, checkpoint antes: Decimation Master roda depois que todo output valioso
  ja esta no disco. Dialogo = assassino de automacao: `set_next_filename` alimenta so botoes
  built-in; FBX ExportImport tem options inescapaveis; USD ignora preset. Unattended = OBJ ou
  `.GoZ` por path; `has_next_filename()` ainda true apos um press = dialogo provavelmente esperando.
- Nomes sao identidade: GoZ precisa nomes unicos entre TODOS os tools carregados; caches do
  Decimation Master e control maps do UV Master sao keyed pelo nome — tool nova com nome velho
  herda dados velhos. Sanitizar e dar stem unico a cada input (disco case-insensitive no Mac:
  `rock.obj` == `Rock.OBJ`).
- Aprender paths da propria ZBrush, nunca chutar: Activity log (Asset Directory `Logs/Activity`)
  grava cada press/set com o path canonico — oraculo gratis (strokes nao logam). Ctrl+hover
  mostra o path. `exists()` + read-back depois de cada `set()`.
- GoZ manda o menor nivel de subdivisao, atualiza por nome, e levanta prompt de reprojecao se a
  topologia mudou — entre apps, passar arquivos `.GoZ`/OBJ + manifesto, nao link vivo.
- Timeouts por passo 30-1800 s; restart a cada ~10 arquivos; arquivo `STOP` na pasta de output
  termina entre arquivos; relatorio `report.json` apos cada arquivo (rerun pula os `ok` por hash).
- Maya GoZ flipa Y e Z nos dois sentidos e flipa normal maps verticalmente; Blender FBX import
  de ZBrush = scale 1000.

## Armadilhas (ZBrush 2026 cross-cutting)

- `set()` em path inexistente nao faz nada e nao levanta erro — sempre `exists()` + read-back.
  `Transform:Frame` e `Brush:Dam_Standard` NAO existem: usar `Transform:Fit` e selecao de brush
  por nome (`select_brush("Dam_Standard")` -> DamStandard). PolyFrame = `Transform:Pf`
  (id `Transform: Pf`), perspectiva = `Draw:Perspective`; `Transform:PolyF` e `Transform:Persp`
  nao sao ids. Paths ignoram case e espacos.
- `query_mesh3d()` devolve listas: `int(zbc.query_mesh3d(1)[0])`.
- Plugin presses que nunca devolvem controle (Decimation Master, UV Master, Transpose Master):
  testar cada um uma vez, timeout curto, ping depois. Notes de ZBrush desenham no canvas — so
  screenshot as mostra.
- DynaMesh em SubTool com levels levanta nota modal; os wrappers recusam. ZHomePage cobre o
  canvas apos launch. Cmd+W fecha a ZBrush inteira no macOS — NUNCA mandar (Control+W faz
  polygroup; versao antiga invertia).
- Nao tem API pra: dados de mask/layer/polygroup, undo (`merge_undo` e stub), `press_key`,
  teclas seguradas (Shift-smooth, Ctrl-mask), texto em prompts (SubTool Rename, New Folder),
  FBX options dialog, clicks de modificador (Alt+ZRemesher pra centre line). Saida: macro ZScript
  com `IKeyPress`, Deformation sliders/botoes no lugar de gestos, nomes na criacao, e delegar
  dialogs a humano ou computer-use agent.
- `brush Smooth` selecionado nao alisa nada (so vira Shift-brush): Deformation Polish / hPolish.
- Abrir um `.ZPR` apaga todos os tools carregados — salvar cada tool mudado antes. Ctrl+S salva
  o projeto, nao o model. No save, o SubTool do topo leva o nome do arquivo — nomear na criacao.
- QuickSave e crash recovery, nao versionamento. AutoSave sozinho nao basta. `.bak` e criado por
  exports que substituem arquivos.
- Tela travada (lock screen): `Document:Export` ainda grava PNG do canvas, mas `screencapture`
  so mostra a lock screen; launches podem stallar apos o press da Home Page — detectar, matar o
  processo que o agente spawnou, reportar.
- Morph Target morre com qualquer mudanca de point count (remesh, Divide): dial antes, ou
  `expect_points=` recusa. Layer morre com mudanca de topologia: layers DEPOIS do ultimo
  boolean/remesh/Apply.
- Morph target esquecido antes de bake: bakes recusam ou geram mapa contra base errada —
  `drop_morph_target()`.
- Unify num character com layers quebra layers e morphs: MultiAppend num tool ja escalado.
- `merge_undo`/undo ausente => Morph Target ou layer por pass, ZTL versionado por stage.
- Redshift precisa do app separado; AOVs com OIDN desde 2025.1. Substance Bridge (2026.2):
  Force UV Auto-Unwrap e global e stripa UVs de TODOS os SubTools. ZRepeat It, Turntabler e
  ZFileUtils NAO ship em 2026.2.1 — loop de SubTools em Python. NoiseMaker window e GUI-only
  (setar uma vez por computer-use, salvar `.ZNM`). From Thickness pergunta "Too many polygons?"
  acima de Max Thickness Polygons — a nota trava a ponte; o wrapper deve recusar antes.
- Restart apos `kill -9` pode stallar (causa aberta): o runner aborta com relatorio retomavel.
