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
  "critique loop de vídeo", "motion reel", "film from code", "code-rendered video".
allowed-tools: Read, Grep, Glob, Write, Edit, Bash(node *), Bash(ffmpeg *), Bash(ffprobe *)
metadata:
  argument-hint: "<ideia ou URL do produto> [duração] [formato 16:9|9:16|1:1] [referência]"
  version: "1.0.0"
---

# Code Motion Film — o prompt é 10% do vídeo; o resto é o harness

O modelo não emite MP4: escreve um programa, e outra coisa transforma o programa em quadros. O que
separa o clipe "meio sem graça" do bom é o harness em volta: um motor determinístico, referência, molas
com massa, som no mesmo relógio e um laço em que o modelo **olha os próprios quadros**.

> Origem das ideias: artigo "How to build motion design studio with Opus 5.5" (Movez, set/2026), mais o que
> quebrou ao reimplementar aqui. As partes de código desta skill são nossas e estão testadas.

## Governança Global

Segue `GLOBAL.md`, `policies/execution.md`, `policies/tool-safety.md`, `policies/cost-optimization.md`,
`policies/claim-verification.md`, `policies/verification-before-completion.md` e
`policies/anti-ai-writing.md` (texto na tela, legendas, roteiro).

Regras sem exceção:

1. **Chave de API só por variável de ambiente** (`.env`, nunca no prompt, no código do filme, em log ou em
   commit). Voz, vídeo e imagem pagos: mostrar custo estimado e esperar o ok antes de cada rodada.
2. **Nunca declarar o filme "pronto" sem ter olhado os quadros.** Render que terminou sem erro não é filme bom:
   o laço de crítica (`references/CRITIQUE.md`) é obrigatório e achou bugs que o MP4 escondia.
3. **Assets de terceiros** (logo, screenshot de produto, referência) só com direito de uso; referência dá
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
| 3 Molas | `references/SPRINGS.md` | preset por papel, uma mola por mudança de alvo, `track()` |
| 4 Som | `references/SOUND.md` | trilha fornecida (medir) ou sintetizada na mesma linha do tempo; cortes em BPM |
| 5 Crítica | `references/CRITIQUE.md` | quadros-chave → nota → três piores → corrigir, até 8+ |
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
```

Exemplo completo e renderizável: `assets/example/index.html` (uma forma, sem corte, em loop, em 120 BPM).
Na página: `import { track, presets, layout, snapToBeat } from "/_lib/motion.mjs"`.

## Anti-Padroes

- **Estado no relógio**: `requestAnimationFrame`, `Date.now()`, `setTimeout`, `Math.random()` dentro da cena. Quebra o determinismo.
- **Mola simulada por quadro** (integrar passo a passo): o quadro 812 passa a depender dos 811 anteriores.
- **Reiniciar a mola a cada novo alvo**: o movimento dá um tranco; use uma mola por mudança (`track()`).
- **Pixels fixos** em vez de `layout()`: cortar um 16:9 para vertical em vez de recompor.
- **Prompt de uma linha para ideia de verdade**: a frase testa o motor, não contém ideia (`references/BRIEF.md`).
- **Declarar pronto olhando só o MP4 rodando**: veja quadros parados nas transições, que é onde os bugs moram.

## Gotchas

Falhas vistas construindo o exemplo desta skill:

- **Canvas com tamanho fixo × viewport diferente**: a forma saiu fora do centro e o MP4 "rodou sem erro". Só a folha de quadros mostrou.
  A página lê `?w=&h=` (o `render-seek` passa o de `--size`) e cai para `innerWidth/innerHeight`, nunca um número fixo.
- **`file://` bloqueia `import` de módulo no Chromium**: por isso o renderizador serve a pasta numa porta local efêmera e mapeia `/_lib/` para `scripts/`.
- **Sobreposição nas trocas de estado**: rótulo ainda visível por baixo do spinner em t=1,6 e spinner sobrando por baixo do rótulo seguinte em t=3,1.
  Escalone entradas e saídas (rótulo some → spinner entra; spinner sai → rótulo entra) e use mola de texto rápida e crítica.
- **`xstack` do ffmpeg exige 2+ entradas**: folha de um quadro só precisa de caminho próprio (`-vf scale`).
- **"Chromium ok" não é "Chromium abre"**: o Playwright novo usa um *headless shell* separado e uma instalação interrompida deixa só o executável completo.
  O `doctor` decide por **abrir o navegador**, não por o arquivo existir.
- **`Unable to update lock ... __dirlock`** derruba o `playwright install` no meio (visto no Windows, em disco secundário): o doctor remove o lock obsoleto e tenta de novo (até 3 vezes).
- **O Node acha `node_modules` de pastas-pai**, então um Playwright global esconde a falta do pacote no projeto. `PLAYWRIGHT_DIR` e a pasta de ferramentas são resolvidos
  de forma estrita (a pasta tem de conter `node_modules/playwright`).
- **Sem esforço alto o resultado vira "texto centralizado em gradiente"**: dê referência e peça os quadros-chave antes do código final.

## Evidencia de Conclusao

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
