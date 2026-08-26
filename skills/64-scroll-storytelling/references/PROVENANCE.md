# Proveniencia

Skill adaptada de [nateherkai/scroll-craft](https://github.com/nateherkai/scroll-craft), licenca MIT,
copyright Nate Herk 2026 (LICENSE confirmado na raiz do repo original no momento da curadoria). Curadoria
feita em 2026-08-26, clonando o repo raso (`git clone --depth 1`) e lendo os arquivos reais listados
abaixo — nada neste arquivo foi inferido sem leitura direta da fonte.

Estrutura original relevante: `plugins/nateherk-design/skills/scrollcraft/` (SKILL.md, engine/, references/,
scripts/, templates/, CHANGELOG.md).

## Copiado quase verbatim

- `engine/scrollcraft.js` e `engine/scrollcraft.css` — motor de runtime vanilla JS/CSS, lido na integra
  (56KB JS + 20KB CSS). Zero dependencias, nao gera DOM proprio, le atributos `data-sc-*` de HTML semantico
  e dirige scroll como timeline (scrub de video, pin, pan, reveal, kinetic type, parallax, contadores,
  worldflight, pointer devices). Codigo generico o suficiente pra copiar sem adaptacao — nao acoplado ao
  resto do repo original (workspace multi-build, fingerprint registry, provedor kie.ai). Copiado byte a
  byte pra `engine/` desta skill.

## Traduzido e adaptado pra PT-BR, reestruturado no esqueleto do kit

- `SKILL.md` (raiz, 416 linhas no original) — lido na integra. Corpo (entrevista de 8 perguntas, 4 regras
  centrais, pipeline de 5 passos, hard rules) traduzido, resumido e redistribuido entre `SKILL.md` (visao
  geral, tabelas de decisao rapida) e `references/pipeline.md` (detalhe passo a passo completo) desta
  skill, seguindo o esqueleto de secoes do kit (Governanca Global / Quando Usar / Quando Nao Usar /
  Entradas / Saidas / Handoff — visto em `skills/12-motion-design/SKILL.md` e
  `skills/02-ui-ux-design/SKILL.md` antes de escrever).
- `references/devices.md` (lido na integra) → `references/devices.md` desta skill. O original lista 9
  devices + secao de composicao; a adaptacao aqui numera drift como device #10 explicito (o original trata
  drift como "nao e um ato, e uma propriedade" dentro da mesma numeracao 9/10 — preservado).
- `references/worlds.md` (lido na integra) → `references/worlds.md` desta skill. Os 8 preambulos de mundo
  fotografico traduzidos: os 5 elementos de composicao de preambulo preservados, a regra "fotografico e o
  padrao" preservada, a secao "se o canvas for claro" e as checagens de coesao preservadas.
- `references/uniqueness.md` (lido na integra) → `references/uniqueness.md` desta skill. As 8 gramaticas
  de pagina, a secao do signature move (o que conta / o que nao conta), o fingerprint gate de 6 dimensoes,
  e o range estetico de 7 familias — todos traduzidos mantendo a logica original.
- `references/verify.md` (lido na integra, 382 linhas) → `references/verify.md` desta skill, resumido.
  Preservado: o que a checagem automatizada reporta (scroll morto, clipe congelado, cues que nao atingem
  pico, contraste medido na pagina composta, a regra do scrim-como-irmao), o que a checagem nao cobre, os
  passes manuais (reduced motion, mobile, teclado), a nota "o telefone e uma maquina diferente" sobre iOS,
  e a tabela de falhas conhecidas (reduzida a uma selecao das mais relevantes, o original tem ~30 linhas).
  A parte procedural (como rodar `serve.mjs`/`shoot.mjs`) foi reescrita apontando pra ferramentas de
  browser do ambiente do agente em vez dos scripts Node do repo original.
- `references/feel.md` (lido na integra) → `references/feel.md` desta skill. A curva de emocao, o metodo
  do pico (peak-end rule), o teste "e o site onde ___", a secao de corporificacao/embodiment, ritmo como
  emocao, e o feel check de 3 passos — todos traduzidos. As curvas de exemplo foram reduzidas de 4 pra 2
  (mantendo uma de consumo e uma de B2B/software, como amostra representativa).
- `references/taste.md` (lido na integra, 305 linhas) → `references/taste.md` desta skill, resumido.
  Preservadas as secoes de espacamento, tipografia, cor (incluindo a nota tecnica sobre `--sc-ink` e
  herdanca de `color` computado), texto sobre midia, profundidade, cards, movimento, estados/conteudo, o
  refuse list, e o teste do olho semicerrado.
- `references/assets.md` (primeiros ~120 linhas lidos; arquivo tem mais conteudo sobre contabilidade de
  credito kie.ai que nao foi lido por ser irrelevante pra esta adaptacao) → `references/assets.md` desta
  skill, reescrito. Preservadas as regras de composicao, quantidade de assets por pagina, poster = primeiro
  frame do clipe, encode denso pra scrub. A parte especifica do pipeline kie.ai (`kie.mjs`, `encode.sh`,
  precos por credito, modelos seedream/kling) nao foi portada — este kit ja tem pipeline proprio
  (`skills/17-image-generator/SKILL.md` e o gerador de video/imagem canonico do ambiente).

## Nao portado

- `scripts/doctor.mjs`, `scripts/workspace.mjs`, `scripts/kie.mjs`, `scripts/serve.mjs`, `scripts/shoot.mjs`,
  `scripts/worldflight-assert.mjs`, `scripts/encode.sh` — nenhum lido linha a linha; confirmados apenas
  pela listagem de arquivos do repo clonado. Sao scripts operacionais acoplados ao ambiente do autor
  original (workspace multi-build por usuario resolvido via `SCROLLCRAFT_HOME`/`.scrollcraft.json`,
  provedor de geracao kie.ai especifico, harness de screenshot Playwright proprio). O procedimento
  equivalente de verificacao (Passo 5 / references/verify.md desta skill) foi reescrito pra usar as
  ferramentas de browser ja disponiveis no ambiente do agente em vez de depender desses scripts Node
  externos, que este kit nao mantem nem testa.
- `references/worldflight.md` — **nao lido nesta curadoria**, por prioridade de tempo (a tarefa priorizou
  devices/worlds/uniqueness/verify, os quatro citados como "Read" dentro do SKILL.md original). O motor
  (`engine/scrollcraft.js`, copiado verbatim) implementa o modo worldflight por completo — o comentario de
  cabecalho do arquivo (linhas ~66-135) documenta a API (`data-sc-mode="worldflight"`, `data-sc-segment`,
  `data-sc-w`, `data-sc-linger`, `data-sc-waypoint`, `data-sc-window`) e foi a unica fonte usada pra
  mencionar o modo em `references/uniqueness.md` §2.4 (gramatica "Continuous world"). Se um build realmente
  precisar dessa gramatica, ler o `worldflight.md` original antes de implementar em vez de confiar so no
  comentario do engine.
- `references/device-diag.html` — **nao lido**. Citado no SKILL.md original e em verify.md como pagina de
  diagnostico standalone pra depuracao de clipe congelado em iPhone real (testa blob URL vs. src direto,
  reporta veredito MOVENDO/CONGELADO). Mencionado em `references/verify.md` e `references/pipeline.md`
  desta skill como recurso do repo original a se consultar, nao recriado aqui.
- `templates/FINGERPRINTS.md`, `references/template.html` — nao lidos. Sao templates de exemplo/esqueleto
  especificos do fluxo de multiplos builds versionados do autor original (registro de fingerprint pessoal,
  ponto de partida de HTML). A logica do fingerprint gate em si (4 de 6 dimensoes, individualmente contra
  cada linha) foi preservada em `references/uniqueness.md` §4 a partir da leitura completa de
  `uniqueness.md`, que descreve o mecanismo — so o arquivo de registro/template nao foi portado.
- `EXAMPLES.md` (raiz do repo, fora da pasta da skill) — nao lido. E um registro de ~12 builds de exemplo
  do autor original citado em uniqueness.md §4 como "ilustracao, nao constraint". Nao normativo.
- `CHANGELOG.md` da skill original — lidas as primeiras ~40 linhas (a entrada mais recente, sobre hardening
  de priming de clipe em iOS). O restante do historico nao foi lido; o conteudo relevante dessa entrada
  (touchend/touchstart, priming por clipe, timeout de seek preso) ja esta refletido no comentario de
  cabecalho do `engine/scrollcraft.js` copiado e em `references/verify.md` desta skill.
