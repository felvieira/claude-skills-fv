# QUALIDADE — o piso de um filme que vale mostrar

Um render que roda sem erro prova o pipeline, não o filme. Os primeiros exemplos desta skill (`assets/example`, `assets/example-recipe`) são
provas de pipeline: formas simples, texto de tamanho médio, sem câmera. **O piso para entregar é `assets/example-launch`** (filme "Relay",
15 s, 1920x1080): leia o `BRIEF.md` e o `index.html` dele antes de escrever o seu e use `skills/86-code-motion-film/scripts/stage.mjs` em vez de reescrever os ajudantes.

Os critérios abaixo vêm de olhar quadros de entradas fortes de galeria (para calibrar, não para copiar) e do que corrigi no Relay depois de
ver a folha de quadros. Cada item é verificável olhando um quadro parado.

## Régua (um quadro nota 8+ cumpre todos os que se aplicam)

| # | Critério | Como se vê |
|---|---|---|
| 1 | **Escala**: o título principal ocupa 40–60% da altura do quadro; texto de apoio nunca abaixo de ~34 px em 1080p | em miniatura da folha ainda se lê tudo |
| 2 | **Uma cor de destaque**, usada só no que acontece agora (cursor, progresso, número final, ponto da marca) | tire a cor: a hierarquia sobrevive? |
| 3 | **Peso tipográfico**: fonte pesada para título, mono para terminal/legenda, no máximo duas famílias; letras com espaçamento negativo | o título não parece "texto de página" |
| 4 | **Detalhe de interface real**: etiqueta, contador, log, estado ativo/feito/pendente, sombra curta no cartão | o cartão parece produto, não retângulo |
| 5 | **Câmera**: um movimento contínuo por cena (empurra devagar, segue o elemento ativo); nunca dois ao mesmo tempo; nada cortado nas bordas | compare o quadro inicial e o final da mesma cena |
| 6 | **Cortes na batida**, secos, com clarão de 2 quadros; uma ideia nova a cada ~2 s; nenhum quadro vazio | conte o que mudou entre quadros vizinhos |
| 7 | **Fundo da cena respira**: alternar tinta/papel/cor de destaque entre cenas; sem gradiente decorativo | a folha tem ritmo de cor |
| 8 | **Movimento com intenção**: letras entram uma a uma, números assentam, faixas deslizam; mola diferente por papel; sem elástico em texto | pare num quadro de transição: tem algo em movimento? |
| 9 | **Acabamento**: grão de filme (função do quadro), motion blur de 4 subquadros (`--blur 4`) | nenhum movimento rápido "picotado" |
| 10 | **Som na mesma linha do tempo**: riser antes de cada corte, impacto no corte, cliques/digitação nos eventos de interface, bateria só onde há energia | rode `skills/86-code-motion-film/scripts/audio-synth.mjs --score` e ouça (ou meça o pico por segundo) |
| 11 | **Fecha o ciclo**: último quadro igual ao primeiro quando for loop | compare os dois PNG byte a byte |

## Como chegar lá (ordem)

1. **Brief de diretor** (`PADRAO.md`, camada T2) com paleta, fontes, regra de câmera, proibidos e mapa de batidas; `brief-lint --strict` passa.
2. **Cenas como funções** `draw(tempoLocal, tempoGlobal)` sobre `createStage` (`skills/86-code-motion-film/scripts/stage.mjs`): `letters()`, `typed()`, `camera()`, `frame()` com corte, clarão e grão já prontos.
3. **Primeira folha** com 12–18 quadros: dois por cena (entrada e assentado) mais o primeiro e o último. Pontue com a régua acima.
4. **Corrija pelo pior item**, renderize os mesmos quadros e repita. O Relay precisou de duas rodadas: terminal pequeno demais (critério 1), câmera cortando o cartão (5) e marca final sem tempo para ser lida (6).
5. **Trilha**: `audio-synth.mjs --score partitura.json` (`drums`, `clap`, `bass` por faixa de batidas; `events`: impact, riser, click, type, whoosh, chime, clap).
6. **Render final** com `--blur 4 --audio`; `ffprobe` confirma duração, resolução e faixa de áudio.

## O que não conta como filme pronto

Texto médio centralizado sobre gradiente; uma só cena com tudo na tela; tempo morto entre ideias; animação sem câmera; cor de destaque em tudo;
som que só marca o BPM. Se a folha tem essas marcas, volte ao passo 3.
