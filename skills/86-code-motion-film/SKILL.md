---
name: code-motion-film
description: |
  Filme de motion design escrito como PROGRAMA: o modelo escreve `seek(t)` (pinta o quadro exato de
  qualquer instante), um Chromium headless chama quadro a quadro e o ffmpeg costura o MP4 — render
  determinístico, correção é editar uma linha e renderizar de novo. Cobre o brief de diretor (uma
  frase para testar o motor, spec de estados para ideias de verdade), molas em forma fechada com
  `track()`, trilha travada em BPM, laço de crítica (renderizar quadros, pontuar, corrigir até 8+) e
  exportação para 16:9, 9:16 e 1:1 a partir de uma só linha do tempo. Vídeo gerado por modelo
  (Seedance etc.) é a skill 84; animação de UI em produto é a 12; só editar/ffmpeg é a 75; slides, a 77.
  Trigger em: "filme de motion", "motion design com código", "vídeo em código", "seek(t)",
  "showreel", "vídeo de lançamento", "launch video", "vídeo de produto em código", "mola fechada",
  "renderizar html em mp4", "playwright ffmpeg vídeo", "trilha sintetizada", "animação determinística",
  "critique loop de vídeo", "motion reel", "film from code", "code-rendered video",
  "prompt-motion", "brief de diretor", "reproduzir vídeo de motion", "padrão de brief de motion",
  "verificar determinismo do filme", "bpm da música", "cortar trilha no compasso", "drop da música", "revisores de vídeo".
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(node *), Bash(ffmpeg *), Bash(ffprobe *)
metadata:
  argument-hint: "<ideia ou URL do produto> [duração] [formato 16:9|9:16|1:1] [referência]"
  version: "1.0.0"
---

# Code Motion Film — o prompt é 10% do vídeo; o resto é o harness

O modelo não emite MP4: escreve um programa, e outra coisa transforma o programa em quadros. O que
separa o clipe "meio sem graça" do bom é o harness em volta: um motor determinístico, referência, molas
com massa, som no mesmo relógio e um laço em que o modelo **olha os próprios quadros**.

## Governança Global

Segue `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`, `policies/cost-optimization.md`,
`policies/claim-verification.md`, `policies/verification-before-completion.md` e
`policies/anti-ai-writing.md` (texto na tela, legendas, roteiro).

Regras sem exceção:

1. **Chave de API só por variável de ambiente** (`.env`, nunca no prompt, no código do filme, em log ou em
   commit). Voz, vídeo e imagem pagos: mostrar custo estimado e esperar o ok antes de cada rodada.
2. **Nunca declarar o filme "pronto" sem ter olhado os quadros.** Render que terminou sem erro não é filme bom:
   o laço de crítica (`references/CRITIQUE.md`) é obrigatório e achou bugs que o MP4 escondia.
3. **Prompts e vídeos de galerias pertencem aos criadores.** Os textos ficam só na sua biblioteca local (`~/.dev-team-kit/prompt-motion/`), nunca no repositório. Reproduza o
   **tipo** de peça com um brief próprio (`references/PADRAO.md`) e cite o criador se a ideia veio de uma entrada.
4. **Assets de terceiros** (logo, screenshot de produto, referência) só com direito de uso; referência dá
   estilo, não conteúdo.

## Quando Usar

- vídeo de lançamento/produto/showreel/abertura feito inteiro em código, 10 s a alguns minutos
- loop de UI "uma forma que se transforma" (botão → loader → cartão) ou filme dirigido por lista de estados
- precisar do mesmo filme em 16:9, 9:16 e 1:1, ou re-renderizar com uma mudança pequena
- trilha curta sintetizada e travada no BPM, sem editor de áudio

## Quando Nao Usar

- vídeo gerado por modelo de vídeo (pessoas, física, lip sync): skill 84 (pode ser a camada base; este motor desenha por cima)
- animação dentro de um produto (hover, transições de página, springs de UI): skill 12
- só cortar, legendar, converter: skill 75; analisar vídeo pronto: 54
- apresentação com slides: skill 77; ícones/ilustração: skill 85
- composição longa já num framework (HyperFrames, Remotion) e o ambiente tem a skill própria: use a do framework

## Entradas Esperadas

Ideia ou URL do produto; duração; formatos; referência (um quadro, um vídeo, uma pasta de imagens) com o que
levar e o que não levar; se há trilha própria (medir BPM) ou se sintetiza; chaves/orçamento se houver voz ou vídeo gerado.

## Saidas Esperadas

`<pasta>/film/index.html` (expõe `window.seek`, `window.DURATION`), `lib/` com `motion.mjs`, `BRIEF.md` ou
`SPEC.xml`, `stills/` + folha de crítica com notas, `out/film-16x9.mp4` (+ `9x16`, `1x1`), `poster.png`,
`README.md` (como re-renderizar). Fonte limpa: tudo regenera com um comando.

## Passo 0 — Pré-requisitos: verificar e, se faltar, instalar (sempre antes de renderizar)

O render precisa de **ffmpeg/ffprobe**, do pacote **playwright** e do **Chromium** dele. Não presuma que existem.

```bash
node skills/86-code-motion-film/scripts/doctor.mjs            # verifica e PROVA com um render de verdade (3 quadros -> MP4 -> ffprobe)
node skills/86-code-motion-film/scripts/doctor.mjs --install  # se faltar algo, instala e prova de novo
```

- Rode o `doctor` no começo do trabalho. Se sair com erro, rode `--install` e **diga ao usuário o que foi instalado**: o Playwright vai para a pasta de
  ferramentas do kit (`~/.dev-team-kit/motion-tools`, sem tocar no package.json de nenhum projeto), o Chromium (~200 MB) para o cache do Playwright e o ffmpeg pelo
  gerenciador do sistema (winget/choco, brew, apt). Se não houver gerenciador ou faltar permissão (ex.: sudo), o doctor imprime o comando exato: peça ao usuário
  para rodá-lo e rode o doctor de novo. `--install --dry-run` mostra os comandos sem executar nada; no Linux use `--with-deps` para as bibliotecas do Chromium.
- O Chromium só conta como pronto se **abrir** (uma instalação interrompida deixa o executável mas não o "headless shell"; o doctor detecta e refaz).
- O `render-seek` confere tudo antes de começar e, se faltar algo, para com o comando acima. Não declare "renderizei" sem o doctor ter passado.

## Fluxo

| Etapa | Arquivo | O que decide |
|---|---|---|
| 0 Pré-requisitos | `skills/86-code-motion-film/scripts/doctor.mjs` | ffmpeg + Playwright + Chromium presentes e provados |
| 1 Motor | `references/ENGINE.md` | rota A (`seek(t)` + Playwright + ffmpeg, zero dependência) ou B (framework) |
| 2 Brief | `references/BRIEF.md` | uma frase testa o motor; spec de estados e brief de diretor testam a ideia |
| 2b Modelos | `references/MODELOS.md` | famílias de estilo para NOMEAR como referência (galeria prompt-motion.com) |
| 2c Padrão | `references/PADRAO.md` | camadas T0–T3, anatomia do brief de diretor, blocos reutilizáveis, como reproduzir uma entrada; índice em `references/INDICE-GALERIA.md` |
| 2d Qualidade | `references/QUALIDADE.md` | o piso de entrega: régua de 11 critérios e o filme de referência `assets/example-launch` (usa `skills/86-code-motion-film/scripts/stage.mjs`) |
| 3b Vocabulário | `references/VOCABULARIO.md` | chegar, assentar, sair, encaixar, deslizar, derivar; objeto-relé; pausas; transições a partir do produto |
| 3 Molas | `references/SPRINGS.md` | preset por papel, uma mola por mudança de alvo, `track()` |
| 4 Som | `references/SOUND.md` | trilha fornecida (medir) ou sintetizada na mesma linha do tempo; cortes em BPM |
| 4b Determinismo | `skills/86-code-motion-film/scripts/check-film.mjs` | prova que o filme é função de `t` antes de olhar quadros |
| 5 Crítica | `references/CRITIQUE.md`, `references/REVISORES.md` | quadros-chave → revisores com notas → catálogo de falhas → corrigir, até 8+ |
| 6 Entrega | `references/SHIP.md` | formatos pelo layout, poster, README, empacotar como skill |

Ordem: 0 → 1 → 2 → 3 → 4 → 5 (repete) → 6. Esforço alto (xhigh/max) para filme novo; médio para correção e re-render.

## Comandos (ver `scripts/`)

```bash
# render completo (rode o doctor antes; PLAYWRIGHT_DIR aponta para outra pasta com node_modules/playwright)
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --out out/film.mp4 --duration 6 --fps 30 --size 1280x720 --audio score.wav

# quadros-chave + folha numa imagem só, para a crítica
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --stills 0,1.6,3.05,5.99 --sheet crit.png --size 1280x720

# trilha sintetizada travada em 120 BPM, com tick nos cortes
node skills/86-code-motion-film/scripts/audio-synth.mjs --bpm 120 --seconds 6 --cuts 0,1.5,3,4.5 --out score.wav

# prova de determinismo (fonte limpa, sem erro, mesmo quadro em qualquer ordem, loop fechado)
node skills/86-code-motion-film/scripts/check-film.mjs film/index.html          # --no-loop se o filme não é loop

# escutar uma trilha: andamento, compasso 1, drops; e cortar compassos inteiros
node skills/86-code-motion-film/scripts/beats.mjs analyze trilha.mp3
node skills/86-code-motion-film/scripts/beats.mjs cut trilha.mp3 --bpm 110 --bar1 0.30 --bars 3-10 --out corte.wav

# revisão: faixa de quadros (de:até:passo), miniaturas do tamanho de um celular, supersampling
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --stills 3.7:4.3:0.05 --sheet qa/corte.png --tile 360
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --size 1920x1080 --scale 2 --blur 4 --audio score.wav --out out/film.mp4

# trilha com partitura (bateria por faixa de batidas, riser/impacto/clique/digitação em segundos) e render final com motion blur
node skills/86-code-motion-film/scripts/audio-synth.mjs --score score.json --out score.wav
node skills/86-code-motion-film/scripts/render-seek.mjs film/index.html --size 1920x1080 --blur 4 --audio score.wav --out out/film.mp4
```

```bash
# padrão de brief: confere tags, proibidos, mapa de tempo, regras de build, "mostre antes de construir"
node skills/86-code-motion-film/scripts/brief-lint.mjs meu-brief.md --strict          # templates em assets/templates/

# biblioteca LOCAL da galeria prompt-motion.com (texto fora do repo; requer o doctor): sync, search, show, tier, analyze
node skills/86-code-motion-film/scripts/prompt-motion.mjs sync
node skills/86-code-motion-film/scripts/prompt-motion.mjs search kinetic --limit 8
node skills/86-code-motion-film/scripts/prompt-motion.mjs analyze
```

Exemplos completos e renderizáveis: `assets/example` (forma que se transforma, em loop) e `assets/example-recipe` (animação de receita) são **provas de pipeline**. O **piso de qualidade** é `assets/example-launch` (filme de lançamento "Relay": cinco cenas, câmera, tipografia em escala de quadro, grão, motion blur, trilha com `score.json`); copie a estrutura dele e use `skills/86-code-motion-film/scripts/stage.mjs`, não reescreva os ajudantes.

Na página: `import { track, presets, layout, snapToBeat } from "/_lib/motion.mjs"` e `import { createStage, typed } from "/_lib/stage.mjs"` (palco 1920x1080 com letterbox, câmera, letras que caem, corte com clarão e grão).

## Anti-Padroes

- **Estado no relógio**: `requestAnimationFrame`, `Date.now()`, `setTimeout`, `Math.random()` dentro da cena. Quebra o determinismo.
- **Mola simulada por quadro** (integrar passo a passo): o quadro 812 passa a depender dos 811 anteriores.
- **Reiniciar a mola a cada novo alvo**: o movimento dá um tranco; use uma mola por mudança (`track()`).
- **Pixels fixos** em vez de `layout()`: cortar um 16:9 para vertical em vez de recompor.
- **Prompt de uma linha para ideia de verdade**: a frase testa o motor, não contém ideia (`references/BRIEF.md`).
- **Declarar pronto olhando só o MP4 rodando**: veja quadros parados nas transições, que é onde os bugs moram.

## Gotchas

Lista completa em `references/GOTCHAS.md`. As que mais custaram:

- **Canvas com tamanho fixo × viewport diferente**: a forma saiu fora do centro e o MP4 "rodou sem erro". Só a folha de quadros mostrou.
- **`file://` bloqueia `import` de módulo no Chromium**: por isso o renderizador serve a pasta numa porta local efêmera e mapeia `/_lib/` para `scripts/`.
- **"Chromium ok" não é "Chromium abre"**: o Playwright novo usa um *headless shell* separado e uma instalação interrompida deixa só o executável completo.
- **Filme que muda conforme a ordem do seek engana a folha de quadros.** `check-film.mjs` pega estado preso, loop aberto e erro de página antes de qualquer olhar. Loop é "o quadro **depois** do último (`t = DURATION`) igual ao primeiro", não "o último quadro": um pulso preso à batida difere no último quadro por construção e só recomeça no primeiro.
- **Render que roda não é filme bom.** Os dois primeiros exemplos eram provas de pipeline: texto médio, sem câmera, nada que alguém mostraria. Meça pela régua de `references/QUALIDADE.md` e parta do `assets/example-launch`.

## Evidencia de Conclusao

- `brief-lint.mjs --strict` com exit 0 no `BRIEF.md` da peça (tags, proibidos, mapa de tempo, regras de build)
- `doctor.mjs` com exit 0 (inclui o render de prova) na máquina onde o filme foi gerado
- render reproduzível: o mesmo comando gera o mesmo MP4 (compare dois quadros com `ffmpeg`/hash)
- folha de crítica com notas por quadro-chave, todas >= 8, e os três piores problemas de cada rodada registrados
- primeiro quadro = último quadro quando for loop; duração = compassos inteiros quando houver BPM
- `ffprobe` confirma duração, resolução e trilha do arquivo entregue

## Handoff

Skill 84 (camada base de vídeo gerado), 75 (pós em ffmpeg: legendas, loudness, formatos), 36 (poster/OG a partir
do quadro de capa), 13/50 (texto na tela), 12 (se a cena virar animação dentro do produto).

## Integracao com Pipeline

Entra depois do posicionamento (01/13) quando a entrega é um filme; o orchestrator (09) pode chamá-la. Mantenha
uma sessão por marca: o motor, a síntese de áudio e a exportação já existem na segunda peça.

## Fontes

- Artigo "How to build motion design studio with Opus 5.5" (Movez, set/2026), mais o que quebrou ao reimplementar aqui; as partes de código desta skill são nossas e estão testadas.
- Galeria prompt-motion.com: só o padrão destilado entra no repo; os textos ficam na biblioteca local (`references/PADRAO.md`).
- https://github.com/kaventro/motion-designer (MIT): inspirou o verificador de determinismo, a análise de andamento e drops, os revisores com notas e o vocabulário de movimento. Nada foi copiado (`NOTICE`).
