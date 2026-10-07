# PADRÃO — como briefs de filme em código são escritos, e como reproduzimos

Padrão interno da skill 86, destilado de uma leitura completa da galeria [prompt-motion.com](https://prompt-motion.com/) (231 entradas, sincronizadas em 2026-10-07 com `prompt-motion.mjs sync`).
Os números abaixo saem de `prompt-motion.mjs analyze` e se refazem na sua máquina; **os textos dos prompts não estão neste repositório** (ver "Direitos e uso").

## O que o corpus mostra (e o que isso muda)

| Medida | Valor |
|---|---|
| Entradas | 231 (228 prompts, 3 skills); todas com Opus 5.5 |
| Tamanho mediano do prompt | 151 caracteres; 168 de 231 têm menos de 200 |
| Distintos | 198 de 231; **a mesma frase de showreel aparece em 30 entradas** (24 + 6 variações de 1 caractere) |
| Camada **T0** (pedido curto de gênero/ideia) | 213 (92%) |
| Camada **T1** (brief médio com regras) | 4 (2%) |
| Camada **T2** (brief de diretor em tags) | 6 (3%) |
| Camada **T3** (roteiro quadro a quadro) | 5 (2%) |
| Skills empacotadas | 3 (1%) |
| Duração citada | 15 s em 35%, 30 s em 7%, 10 s em 3% |
| Esforço informado | "Max" em 22; os demais não informam. A mediana de tamanho é igual em todos os níveis |
| Técnica citada | áudio/música/batida 16%, html 7%, css 5%, voz/TTS 5%, "um arquivo/sem libs" 4%, svg 3%, canvas 3%, Remotion 3%, Playwright/Puppeteer 3%, ffmpeg 3%, Three.js 2% |
| Estrutura citada | "go all out" 38% (efeito da frase repetida), mapa de batidas/BPM 7%, lista de proibidos 8%, "olhe os próprios quadros" 5%, seek/determinismo 5%, molas fechadas 4%, tags XML 4%, "peça os inputs" 3%, último quadro = primeiro 2% |

Três conclusões que o resto do padrão usa:

1. **A grande maioria dos "vídeos de Opus" é um pedido de uma frase.** Ele testa o motor e a sorte; não carrega ideia. Reproduzir um T0 **não é copiar a frase**: é renderizar o *tipo* de peça com o nosso motor e as nossas decisões (brief próprio, na camada que a peça merece).
2. **A engenharia está nos ~6% de T1–T3** e se repete de um autor para outro: pedir os inputs, direção com lista de proibidos, mapa de tempo, regras de build, armadilhas e uma instrução final de "mostre antes de construir".
3. **Iteração aparece mais do que "one-shot"**: os briefs longos exigem quadros de verificação (um por batida) antes do render completo. É o que o nosso laço de crítica faz.

## As quatro camadas

| Camada | O que é | Quando usar | Como reproduzimos |
|---|---|---|---|
| **T0** | Pedido curto: gênero + duração + "vá com tudo" | Testar o motor; explorar uma ideia sem compromisso | Escreva um brief **T1** com a mesma ideia e as suas decisões |
| **T1** | Parágrafo de estilo + RULES/CRAFT, às vezes com `{{PLACEHOLDERS}}` | Peça curta de produto sem mapa de batidas | `assets/templates/quick-brief.md` |
| **T2** | Brief de diretor em tags: `<inputs> <direction> <structure> <build> <gotchas> <start>` | Qualquer filme que alguém vai ver; loops; lançamentos | `assets/templates/director-brief.md` |
| **T3** | T2 com roteiro por faixas de quadro (`f0–71`) ou segundo, coordenadas e hex exatos | Reproduzir um plano específico quadro a quadro | T2 + tabela de marcos; só vale com a mesma trilha e as mesmas medidas |

Regra de escolha: **comece pelo T2**. Use T1 só para peça muito curta e T3 só quando precisa casar um plano exato.

## Anatomia do brief de diretor (T2)

Cada tag tem um conteúdo mínimo. É isto que `brief-lint.mjs` confere.

| Tag | Tem de conter | Erro comum |
|---|---|---|
| `<inputs>` | "Peça-me: ..." com o que só o usuário sabe (produto, logo, frase, cor, trilha) **e** padrões para quando ele pular | Inventar o nome do produto ou a trilha |
| `<direction>` | duração e formato; sensação com uma referência nomeada; paleta com hex e **uma** cor de destaque; tipografia; regra de câmera (uma câmera contínua, nunca dois movimentos juntos); **lista de proibidos** (3 ou mais) | Só adjetivos; esquecer os proibidos |
| `<structure>` | mapa de tempo: BPM e compassos, ou faixas de batida/quadro/segundo; um marco por trecho; no loop, "último quadro = primeiro" | Descrever o clima em vez de o que acontece |
| `<build>` | o motor: um arquivo, `seek(t)` sem transição/timer/estado entre quadros; molas em forma fechada (uma por mudança de alvo); texto que entra/sai com tempos próprios; layout relativo; cortes na grade; render com Playwright + ffmpeg; **um quadro por batida antes do render completo** | Esquecer determinismo e crítica |
| `<gotchas>` | o que costuma quebrar neste tipo de peça | Deixar vazio; só serve se vier de falha real |
| `<start>` | "peça os inputs; mostre o mapa de batidas e quatro quadros planejados **antes** de escrever código" | Pular direto para o código |

## Blocos reutilizáveis (frases nossas)

Cole no `<build>` ou `<direction>` conforme a peça. São regras de engenharia, não texto de ninguém.

- **Determinismo:** "Todo estilo é calculado a partir do tempo dentro de `seek(t)`; sem transições de CSS, sem timers, sem estado entre quadros."
- **Molas:** "Molas em forma fechada. Um valor que muda de alvo várias vezes é a soma de uma mola por mudança."
- **Arrastar:** "Enquanto o cursor segura, o valor vem da posição do cursor; ao soltar, a mola parte de onde estava."
- **Aresta que estica:** "As duas bordas de um indicador usam molas diferentes: a de ataque estica à frente da de saída."
- **Troca de texto:** "Texto que sai e texto que entra têm tempos separados; nunca coexistem sobre o mesmo elemento."
- **Câmera:** "Uma câmera contínua sobre uma única camada de mundo; nunca dois movimentos de câmera ao mesmo tempo."
- **Forma que preenche:** "Quando uma forma preenche o quadro, escale-a além dos quatro cantos."
- **Loop:** "O último quadro é igual ao primeiro, posição e velocidade do cursor incluídas."
- **Som:** "Meça o BPM e o primeiro tempo da trilha (ou sintetize no mesmo relógio); todo corte cai numa batida; cada som de interface cai no pico medido."
- **Conteúdo real:** "Use só o que existe: textos, números e telas reais; nenhum resultado, cliente ou métrica inventado."
- **Sem moldura de player:** "Nenhuma barra, timecode ou fps na tela; nenhum jargão de animador."
- **Verificação:** "Antes do render completo, um quadro por batida numa folha; corrija o que estiver fora da grade, apertado ou ilegível."
- **Formatos:** "Escrito contra um layout relativo; renderize 16:9, 9:16 e 1:1 sem cortar."
- **Motion blur (opcional):** "Renderize subquadros e combine com `tmix` do ffmpeg" (o `render-seek` ainda não faz; ver Limites).

## Reproduzir uma entrada da galeria

1. **Sincronize a sua biblioteca local** (fora do repo): `node skills/86-code-motion-film/scripts/prompt-motion.mjs sync`. Antes, `doctor.mjs` (Playwright + Chromium).
2. **Ache o que reproduzir:** `prompt-motion.mjs search kinetic --limit 8`, `tier --tier T2`, ou o índice `references/INDICE-GALERIA.md` (camada, tamanho, criador e links; sem os textos).
3. **Leia para entender, não para copiar:** `prompt-motion.mjs show <slug>`. Anote os **ingredientes**: forma que se transforma? tipografia? gráfico? 3D? duração, formato, trilha, o que é proibido.
4. **Escreva o SEU brief** no template da camada certa, com a sua marca, os seus textos e a sua paleta. Mantenha a estrutura (tags, mapa de tempo, regras de build), troque o conteúdo.
5. **Confira o brief:** `node skills/86-code-motion-film/scripts/brief-lint.mjs seu-brief.md --strict`.
6. **Construa** com `motion.mjs`/`render-seek.mjs`, rode o **laço de crítica** (`CRITIQUE.md`) e só então o render completo.
7. **Registre a origem:** cite o criador no README da peça se a ideia veio de uma entrada.

Para o nível de acabamento esperado, veja `QUALIDADE.md` e o filme `assets/example-launch/` (brief de diretor T2 que passa no linter + código + partitura).

Exemplo feito assim: `assets/example-recipe/` reproduz **o tipo** de peça "animação de receita, do copo vazio ao drinque pronto" (uma entrada T0 da galeria) com brief, código e renderização nossos. A crítica achou 4 defeitos antes do render final (líquido invisível por um `NaN` silencioso na cor, cubo de gelo atravessando o copo, casca encostando no subtítulo, cor final de mistura errada).

## Direitos e uso

- O rodapé da galeria diz que **vídeos e prompts pertencem aos criadores**. O repositório do kit é público, então **nenhum texto de prompt é copiado para cá**.
- A biblioteca com os textos fica **fora do repo**, em `~/.dev-team-kit/prompt-motion/` (ou `DEVKIT_PM_DIR`), para estudo pessoal e reprodução. Não redistribua.
- O que está no repo é nosso: o padrão (esta página), os templates, o linter, o analisador e um índice com **título, criador, camada, tamanho e links** (como uma bibliografia).
- Um teste (`skills-85-86.test.mjs`) falha se algum prompt da sua biblioteca local aparecer literalmente em arquivos do repo.
- Vídeos não são baixados: o sincronizador só lê o texto das páginas, com poucas conexões e pausas.

## Limites

- Os números descrevem esta amostra (231 entradas, ~2 semanas de lançamento do modelo), dominada por uma frase repetida; não são "o que funciona" em geral.
- As camadas são classificadas por **estrutura**, não por qualidade. Um T0 pode render um filme melhor do que um T2 mal usado.
- O `render-seek` não faz motion blur por subquadros nem áudio medido de arquivo (só a trilha sintetizada); quem precisar disso usa Remotion/HyperFrames ou estende o renderizador.
- Reproduzir o *resultado* de um T3 exige a mesma trilha e as mesmas fontes; sem elas só se reproduz a estrutura.
