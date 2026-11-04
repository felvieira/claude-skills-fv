# Tecnicas de geracao de imagem (universal, vendor-agnostic)

Destilado do pack `scenario-labs/skills` (MIT) e adaptado ao nosso stack (fal.ai +
`scripts/generate-image.mjs`). Regras que valem para qualquer familia de modelo de imagem —
Grok, Gemini, GPT-Image, Seedream, Ideogram. Carregar sob demanda por tema.

## Contrato universal de run

- **Schema do modelo e o contrato.** Nome de campo de sizing, `max_length` do prompt, nome/cap
  do campo de referencia mudam por modelo. Nunca portar bloco de parametros entre modelos.
- Sizing abaixo do floor pode ser **substituido em silencio** (512x128 -> 1408x480). Verificar
  `width`/`height` do output apos cada run.
- Campo de referencia tipo array: string solta e descartada sem erro — passar `["id"]` mesmo
  para uma.
- Parametro de batch repete o mesmo prompt N vezes (variacoes). Diferenca por item = um run por item.
- Receita de tamanho exato: gerar no tamanho alcancavel mais proximo >= alvo, depois resize
  deterministico (`cover` central-cropa; `stretch` distorce; `contain` pode sobrar).
- Tiers de resolucao defaultam baixo (1K). Setar tier explicitamente. Re-rodar a receita !=
  ampliar o keeper — upscale no keeper.
- **Texto na imagem:** citar strings exatas entre aspas, dar posicao; palavras que erram,
  soletrar letra a letra; copia letter-perfect (preco, legal) = overlay deterministico, nunca prompt.
- "Cinematic" / ratio em prosa (2.39:1) assa letterbox no pixel. Pedir "full frame, no
  letterboxing" e carregar o ratio so no campo de sizing.
- Pele: nomear textura (poros, pelos finos) ou sai retocada-lisa.
- Prompt de edicao: nomear a mudanca e travar o resto ("keep shape, fabric, shadow exactly");
  o que nao e nomeado fica aberto a mudanca.
- "Transparent background" no prompt falha: saida opaca. Usar campo `background` ou
  background-removal em pos.
- Seed so reproduz o proprio run do mesmo modelo; nao e portavel entre familias.
- Ordem do prompt = peso: estilo/meio/sujeito/mood primeiro; cena/detalhe/luz/texto depois.
- Mais de ~7 requisitos distintos -> alguns caem em silencio. Base limpa + uma mudanca
  dirigida por edicao encadeada.
- Modo infere dos inputs em varias familias: refs vazias = txt2img, refs cheias = edit.
- Flags de prompt-expansion (magicPrompt, expandPrompt, promptOptimizer) ligadas por default
  reescrevem o prompt — desligar quando a imagem carrega copia exata.
- Figura publica tende a refusal; descrever arquétipo.

## Consistencia e identidade (baseline + delta)

Escada de durabilidade crescente — subir so quando o degrau atual falhar:

1. **Baseline + delta** (piso, sempre): enumerar tudo que NAO pode mudar (geometria, camera,
   tamanho/posicao do sujeito, direcao de luz, cada sub-elemento + local, paleta por nome/hex,
   texto embutido); clausula final = a unica mudanca. Prompt byte-identico, edita so o delta.
2. **Referencia de imagem:** dar 1 papel por referencia (sujeito, estilo, pose, luz, paleta).
   Referencia nao rotulada empresta tudo que mostra — mistura.
3. **Slot de style-reference:** segura render/paleta/linha, NAO identidade — parear com ref de sujeito.
4. **Control map** (canny/depth/pose): so onde o modelo suporta; nunca extrair mapa do atributo
   que esta sendo mudado. Strength ~0.7 estrutura, 0.8-0.9 pose.
5. **Treino (LoRA):** so quando refs param de escalar — personagem recorrente em centenas de
   imagens, 4+ identidades em cena, mesmo estilo em qualquer sujeito. Um modelo por personagem
   + um de estilo; cena multi-personagem = compor, nao co-gerar.

Regras:

- Mudanca permanente (nova roupa) = novo hero aprovado, baseline reescrito, re-ancorar dali.
- Turnaround sheet e artefato de revisao, nao input — slots recebem fotos individuais.
- `img2img` com strength baixo = trava composicao; em strength default, ancora em fundo liso
  sobrescreve o delta de cena inteira.
- Seed nao transfere identidade: reproduz um rolo so.

## Multi-referencia: um papel por imagem

- Cada referencia empresta tudo que mostra a menos que dito: dar exatamente um papel +
  "do not take X".
- Papéis: subject (WHO), stage (WHERE), pose, angle, style, light, palette, material,
  expression, wear, layout — cada um com sua linha "not".
- Dois papéis num card = os dois se borram. Um sujeito principal por run.
- Papel mais-provavel-de-ser-ignorado primeiro (geralmente Style), rotulado "most important".
- Emprestar concreto ("soft materials, warm bounce light" > "its style").
- Resolver conflitos: card de Style traz cores proprias -> adicionar "do not copy its colors".
- Card nao usado: "Image 4 = no job: ignore it completely."
- Cards limpos: fundo liso, sem placas/logos (marca dispara refusal e recusa em video depois).
- Leak check por card: seu papel apareceu? Algo mais dele apareceu? Corrigir apertando a linha
  do card, nunca retocando.
- Conferir que o run realmente consumiu a referencia (string solta cai em silencio) antes de
  reescrever. Cap tipico 4-6 cards; gerar cards faltantes via txt2img, uma ideia cada.

## Produto: nunca gerado

- Sempre partir de foto real do produto; produto por prompt de texto = rótulo errado sem conserto.
- Checklist de fidelidade escrito uma vez (texto do rótulo, geometria, materiais, cores) e
  reusado em todo gate.
- Prompt preserve-first: "The exact [produto] from reference, proportions and colors unchanged,
  label reads 'X', no other text, on [superficie], [luz]."
- Sombra/reflexo carregam o realismo; nomear contact shadow ou o recorte flutua.
- Gate le o rótulo letra a letra em full res; texto ilegivel na res final = nao verificado, nao aprovado.
- Duas vias: ferramentas deterministicas de packshot (cutout/bg/shadow/relight) vs cena generativa.
- Preco/claims/promo = overlay, nunca gerado.
- Falha re-roda da fonte original, nunca do output que driftou.

## Brand kit: spec antes, marca uma vez

- Spec antes de gerar: 4-6 hex com papéis, 2 familias tipograficas com jobs, linha de voz,
  clear-space/min-size, 3 regras "never". Prompts citam hex verbatim; todo gate recebe o spec.
- Exigir SVG editavel real, nao raster ("editable SVG" e o que faz o modelo vetorial aparecer).
- 3 construcoes de logo por metodos diferentes (monograma+metafora, verbo-como-simbolo, espaco
  negativo), <=2 metodos por proposta, tier barato — 2/3 serao descartadas.
- Logo tem que ler em uma cor em tamanho de favicon; geometria fechada e flat.
- Variantes (mono/reversed/favicon): recolorir fills do SVG localmente — regenerar muda geometria.
- Aplicacoes: referenciar a marca aprovada ("exact logo unaltered"), proibir lettering/UI fake,
  uma aplicacao por run.
- Texto real sempre via overlay na familia do spec — "fonte" gerada e uma foto.
- Derivar variantes do master, nunca de mockups (derivada de derivada acumula artefato).

## Texto overlay deterministico

- Tipo gerado drifta/garbles -> copia letter-perfect renderizada como PNG transparente e
  composta; nunca promptada na placa.
- Fonte carrega sentido: sans condensada pesada = hook/preco/CTA; geometrica leve =
  neutro/premium/legal; serifada = editorial; arredondada = amigavel. Uma familia por card.
- Julgar legibilidade no tamanho de destino; texto claro sobre transparente some — conferir
  sobre fundo de contraste.
- Overflow: "shrink" ou "clip"; canvas = resolucao de destino (compoe 1:1, nunca re-escalado).
- Pedir placa base com zona quieta (faixa vazia/terco escuro) para o card pousar limpo.

## Formatos: escada de derivacao

Adaptacao de formato e derivacao, nao regeneracao — re-promptar por placement gera primos,
nao formatos. Escada (primeiro degrau que serve):

1. resize mesmo ratio
2. `cover` center-crop (bordas dispensaveis)
3. expand/uncrop (inventa canvas, composicao intacta)
4. reframe generativo (recompoe; variante que protege texto quando ha marcas na placa)
5. recompor nativo por ratio (ratios distantes, 16:9 -> 9:16)

- Toda derivacao de UM master aprovado, nunca de derivada.
- Ordem: aprovar master no maior tamanho limpo, sem texto -> reframe/expand -> grade/grain ->
  verificar dims -> lettering por formato por ultimo.
- Placa sem texto guardada; type re-overlay por formato (type escalado amolece).
- Reframe por enum e aproximado -> medir output; safe zones sao contratuais por placement.
- Center-crop para 9:16 degola sujeitos; subir a escada.

## Qualidade: rubrica antes de gerar

- Escrever rubrica pass/fail ANTES — linhas checaveis, nunca palavra de gosto; rubrica feita
  depois de ver o batch herda os defeitos dele.
- Menor batch no tier mais barato onde toda linha ainda e julgavel.
- Veredito cita linha da rubrica; "podia ser melhor" nao e veredito (loop por "melhor"
  converge para generico).
- Conserto mais barato primeiro: defeito local -> inpaint/edit de instrucao no keeper; acabamento
  uniforme (grade/tint/crop) -> ferramenta deterministica; conteudo/composicao/paleta errada ->
  delta na clausula, re-run do baseline; drift de identidade -> apertar enumeracao e refs;
  tudo falhando -> trocar modelo.
- Uma variavel por rodada — trocar prompt+refs+modelo junto nao deixa atribuir causa.
- Regenerar do baseline, nunca encadear outputs (drift compoe).
- Stop rule: rodada limpa entrega; 3 rodadas sem limpar, ou mesma linha falhando em 2
  consertos diferentes -> reportar, nao re-girar.
- QC por contact sheet esconde texto fino, halos e anatomia — inspecao em full size tambem.
- O gate detecta artefato, nao plausibilidade estrutural (carro com duas rodas diferentes pode
  passar): contagem/encaixe (dedos, membros, rodas) fica por conta do revisor.
- Video: varredura ~2fps, nao so primeiro/ultimo frame — drift acontece no meio do clipe.

## Bake-off de modelos

- Um brief inalterado entre candidatos; criterios pass/fail pre-registrados antes do primeiro
  run pago.
- Normalizar: mesmos bytes de prompt, mesmas refs, mesmo count; tamanhos = o mais proximo que
  cada um permite, registrar dims entregues.
- Desligar prompt-rewriting em TODOS os candidatos (senao compara o rewriter, nao o modelo).
- Seed nao compara entre modelos; deixar unset.
- Tiers (Turbo vs Quality) = candidatos separados. Tuning especifico de familia -> duas linhas
  (default + tuned), nao tuned vs default do rival.
- Custo cobrado vem do job, latencia dos timestamps; numero modelado != resultado.
- Ranking e por-brief e por-catalogo — nunca hardcodar vencedor.

## Moderacao: bloqueio e problema de rota primeiro

- Filtros diferem por provider, nao por preco. Recuperacao mais barata primeiro:
  1) trocar de provider com prompt identico (2-3 candidatos);
  2) descrever escala por proporcao, nao intensidade ("shoulder height", nao "huge");
  3) tirar nomes reconheciveis, carregar identidade via imagem de referencia;
  4) desligar prompt-rewriters upstream.
- Prompt no limiar passa intermitente — retry sortudo nao consertou nada; em video o retry
  re-renderiza o clipe inteiro (ler custo antes).
- Gatilhos que empilham: personagem/traco reconhecivel + palavras de intensidade
  ("oversized", "massive") + semelhanca de pessoa real (incl. imagem de referencia flagada).
- Audio e moderado separado: nomear genero/instrumento ate em exclusao ("no music") dispara —
  descrever som diegetico positivamente ou desligar o flag de audio.
- Se todo provider recusa + um rewrite honesto falha -> o filtro leu algo real; reportar e parar
  (moer variantes = evasao).
