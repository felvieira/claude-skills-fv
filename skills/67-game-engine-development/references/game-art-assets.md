# Geracao de arte para jogos (sprites, tiles, texturas, skybox, parallax)

Destilado do pack `scenario-labs/skills` (MIT), adaptado ao nosso stack. Regras de producao de
assets 2D/HD para jogos — independente do modelo de imagem usado.

## Regra universal

- **Transparencia:** preferir gerador com alpha nativo (pula a etapa paga de remocao); NUNCA
  pedir "transparent background" em prompt para modelo de difusao (vem opaco). Pedir fundo
  liso e uniforme para cutout limpo.
- **Batch de variacoes:** template de wording fixo, varia so o substantivo do item; mesmo seed;
  flag de prompt-expansion OFF (o expander reescreve cada prompt diferente e quebra o template).
  Parametro de sample-count = variantes do MESMO item.
- **Prep de referencia:** crop no bounding box do objeto (padding transparente e lido como
  composicao -> drift de escala/offset; re-pad depois); tirar sombras projetadas/glow/bevel
  (sao lidos como silhueta e voltam fundidos — reaplicar na engine); nomear partes funcionais
  (nine-slice: meio estica, quinas fixas); um objeto por referencia.
- **Verificar por medicao:** comparar alpha bounding box do output vs fonte; conferir alpha
  interior (gerador com alpha pode furar vidro para alpha-0 inconsistente) e franjas de borda
  (halo em UI colorida).
- **PNG sempre para alpha** (JPG nao tem). Pixel art: pos-processar com pixel-cleanup para
  grid snap + paleta restrita; upscaler de foto inventa textura — usar rota pixel-preserving.
- Upscaler especifico de textura preserva tiling; generico quebra.
- Assets letrados: uma amostra falha — gerar varias; travar cores em hex exato.

## Isometrico

- Fixar antes do estilo: projecao (2:1 diamond vs hex), ancora, direcao de luz, lado da sombra.
- Footprint no chao != silhueta do sprite (objeto alto sobrepoe tile atras — nao clipar pela
  mascara do chao).
- Montar mapa de teste pequeno antes de escalar o batch.

## Tilesets de terreno

- Contrato de layout: toda combinacao de borda/quina precisa existir antes de prometer set.
- `width`/`height` do gerador de tileset mede UM tile, nao a folha.
- Set Wang simples, nao blob de 47 tiles; mapear para regras de autotile da engine; pintar mapa
  de teste antes de gerar outros terrenos.

## Parallax

- NUNCA pedir "camadas" numa geracao — volta UMA pintura de camadas. Duas rotas:
  a) splitter de camadas sobre pintura existente (alargar a pintura ANTES de separar — planos
     precisam de bleed alem do viewport dos dois lados);
  b) um plano por run, com camera/horizonte/luz/paleta fixos em texto, dizendo o que cada plano
     NAO pode conter.
- Planos em loop precisam de bordas seamless.
- Verificar a pilha compondo os planos no tamanho do viewport, deslocando os proximos alguns %
  para prever o parallax; conferir seams/halo/objetos duplicados no fundo remontado.

## Sprite animation (frames)

- "Sprite sheet, 8 frames" cru -> imagem DE uma folha. Rotas reais: modelo treinado de
  animacao; modelo de imagem com spec de grid escrito (grid exato, contagem, beats por frame);
  video primeiro+ultimo frame (loop seamless da still); video por keyframes; img2video na still.
- Spec de grid: linhas/colunas dentro do cap do slicer (6x6; 16 frames = 4x4, nunca 2x8),
  canvas divisivel pelo grid, uma escala/camera/facing/baseline, ultimo frame igual ao primeiro,
  margens, sem labels.
- Contar poses distintas antes de fatiar — spec com um unico estado final pode voltar pose unica.
- Corpo drifta entre linhas (medido ate ~87px nos pes): alinhamento e pos, nao prompt — medir
  bounding box por celula, alinhar baseline/centro, re-fatiar.
- Loop: mesma still como primeiro+ultimo frame + linguagem de movimento EXPLICITA (pontas
  iguais + prompt vazio = pedido de freeze). Checagem de seam e quantitativa: delta medio de
  pixel na emenda <= baseline de movimento da janela. Frame-0 costuma divergir (img2video
  re-renderiza) — procurar a janela de loop dentro da propria renderizacao, excluindo frame 0.
- fps e a unica alavanca de timing depois da geracao — planejar contagem antes. Delay de GIF
  quantiza em 10ms: usar fps divisor de 100 (10, 20, 25); 8->125ms e 12->83ms caem fora e
  viram frames duplicados.
- Ordem dos frames NUNCA assumida: frames extraidos nao carregam indice; a ordem mora na lista
  de ids retornada. Verificar via contact sheet contra primeiro/ultimo frame antes de fatiar.
- Video nao emite alpha — orcar pass de remocao; verificar alpha num frame baixado (preview
  inline ja compoe por cima).
- `nbFrames`/`frameRate`/`duration` da metadata = o que foi entregue; pedidos nem sempre sao
  honrados — contar o que voltou.
- Efeito que atravessa a borda da celula some — projetil solto = sprite proprio.
- Bloqueio de moderacao em combate: e filtro do provider — tentar outro provider com a mesma
  spec, nao amolecer os beats.

## Kit side-view (platformer)

- Duas familias: sprites pixel numa linha de pes + camadas pintadas que tileam/parallax.
- Personagem: still txt2img com 2 poses em magenta liso (repouso + acao) -> um clipe img2video
  ~3s por ciclo, perfil lateral puro olhando a direita, "like a treadmill" -> key magenta
  local -> janela de loop -> pixelar todos os ciclos numa UNICA tela+paleta. Uma direcao so;
  o jogo espelha.
- Primeiro frame SO em run/walk (prender as duas pontas gasta o clipe acelerando/freando);
  primeiro=ultimo em idle e one-shots para voltar ao repouso.
- Inimigo armado andando: congelar a arma explicitamente ("arms stay still, never lifts"),
  termos de arma em negativo, guidance baixo (~0.7) — senao a arma balanca no meio do passo.
- Magenta come magenta: "no pink/purple/magenta anywhere" no prompt; motion-blur roxo na arma
  -> rejeitar o take.
- Folha de poses avulsas (queda, wall cling): mesma referencia, gaps largos; separar por
  connected components, nao por colunas (poses se sobrepoem na horizontal).
- Niveis: ~5 renders por nivel (fundo opaco, midground transparente, textura de parede, strip
  de plataforma, props). "Seamless tileable" em prompt nao tileia direito — cross-fade de
  bordas opostas local. Strip de plataforma = cap esquerdo + meio repetido + cap direito,
  nunca esticar.
- Deliverables: WebP lossless para strips (+ meta json: celula, ancora dos pes, fps); lossy
  para camadas HD. Lossy em strip desloca a paleta compartilhada.

## Texturas seamless / PBR

- Geradores seamless dedicados anexam hints de tiling sozinhos; exponho seam-erase inpaint
  (eraseSeam + overlap/feather).
- Tamanho de engine: quadrado power-of-two (1024/2048); dims multiplos de 16.
- Gerar ~1024 e upscalear 2x-8x com upscaler de textura (generico quebra o tile; o de tiling
  re-renderiza -> drift tonal pequeno, usar preset precise/low-strength e comparar com a fonte).
- Rotas de mapas PBR: textura plana -> extrator de mapas 2D (uma chamada -> albedo/normal/
  roughness/metallic/height separados; papel vem na metadata, NUNCA na posicao; "roughness"
  pode voltar como "smoothness" — verificar polaridade). Mesh -> modelo 3D de texturizar.
  Nao rotear textura plana por modelo 3D para extrair mapas.
- Verificar tiling gratis: coluna esquerda vs direita, linha de cima vs de baixo (nao podem
  diferir mais que vizinhos interiores); folha de prova 2x2 mostra seam na hora.

## Skybox / 360

- Sempre modelo dedicado de skybox — modelo de imagem generico nao fecha a borda e borra polos.
- Equirect = 2:1 estrito (2048x1024). Layouts de cubemap variam — confirmar no schema.
- Iterar: copiar seed do melhor take, mudar so o preset de estilo; mudar composicao mantendo
  look = passar o favorito como referencia com strength 0.2-0.4.
- Upscaler de skybox 2x-8x preserva o wrap (pode custar mais que a geracao); strength default
  ~0.6 inventa detalhe — baixar para upscale do mesmo panorama.
- Verificar seam gratis: coluna mais a esquerda vs mais a direita ~0 de diferenca; colunas a
  90 graus diferem uma ordem a mais.
- `negativePrompt` inerte se `negativePromptStrength` = 0 — conferir pares campo+strength.

## Storyboards / comic

- A unidade e o PAINEL, nunca a pagina ("a page with six panels" = pagina irremediavel).
- Ordem: tabela de beats do roteiro -> cast travado -> um run por painel -> checagem de
  identidade -> letra em pos -> montagem.
- Prompt por painel = linhas de estilo+personagem+cenario byte-identicas + clausula do painel
  + "clean art, no lettering, no speech bubbles". Linha de cenario caida quebra continuidade.
- Todo painel ancorado no MESMO hero aprovado; encadear painel->painel compoe drift.
- Mudanca permanente (nova roupa): gerar+aprovar novo hero, reescrever baseline, re-ancorar.
- Beat bloqueado por moderacao: amolecer a clausula daquele painel, re-rodar do baseline.

## Concorrencia e custo

- Lancar em ondas sob o teto de concorrencia; acima do teto: lancamento recusado (429) ou
  aceito-e-falho reembolsado — relancar recusas na onda seguinte.
- Precificar cada etapa com o input real antes de batch; etapas a jusante nao tem preco antes
  de existir a saida da anterior.
- Ledger por job: modelo, params, ids de entrada/saida, custo, kept?, motivo.
