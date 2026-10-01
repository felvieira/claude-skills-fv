# Câmera, ótica e luz

O modelo não obedece adjetivo de câmera ("low angle", "cinematic"). Obedece uma câmera colocada num
lugar físico, olhando para algo, num lado fixo da ação. Escolher composição e distância antes de
número de lente.

## 1. Câmera como posição física

Todo ângulo responde a seis perguntas:

| # | Pergunta | Exemplo |
|---|---|---|
| 1 | altura | 0,3 m do chão; altura do peito; 1,6 m (olho) |
| 2 | lado | do lado do corredor, nunca do lado do abismo |
| 3 | distância | 1,5 m do grupo; a 8 m, do outro lado da rua |
| 4 | para onde mira | olhando para cima, para o cesto; ao longo da plataforma, rumo ao túnel |
| 5 | roll | nivelada; 12° horário (dutch) |
| 6 | âncora de primeiro plano | ombro escuro dela cortando a borda esquerda; a quina da parede |

Traduções prontas:

| Pedido | Escrever |
|---|---|
| low side | `Camera low on the side wall, about 0.5 m above the cobbles, looking across the lane at the group, the near wall edge large in foreground.` |
| over the shoulder | `Camera physically behind A's right shoulder, looking toward B; A's shoulder is a dark occluding edge foreground-left, B is the readable face.` |
| plano de baixo | `Camera on the gravel beside the platform at chest height, looking up at the basket.` |
| câmera no ar | `Camera floating in the air level with him, a few metres to the side of the rope.` |
| câmera dentro do objeto | `Camera inside the basket beside her, looking straight down the rope.` |
| alto e inclinado | `Camera above and behind A's left shoulder, looking down at B, with a 10-15° roll to the right; it does not cross the action line.` |

## 2. Eixo, lado e direção de tela

- Fixar um **lado de câmera** por sequência quando a geografia importa ("camera always on the
  walkway side; down is always the chasm; the round window is always across the chasm"). Erro real:
  a geografia do buraco inverteu entre clipes porque a câmera trocou de lado.
- Direção de tela travada em ação: "they run TOWARD the camera, AWAY from the volcano", repetida em
  cada clipe da perseguição.
- Cruzar o eixo só de três jeitos: mostrar a câmera cruzando, intercalar um plano neutro, ou assumir
  a quebra como efeito deliberado.
- **Dutch é roll**, não troca de lado nem espelhamento.

Coordenadas de tela (x 0% esquerda a 100% direita) só **depois** da relação física e só quando
ajudam: `A is left of the group, nearest the red lamp, all within 1-1.5 m; on screen A x ~46%, B x ~53%`.
Coordenada sozinha o modelo ignora.

## 3. Corpo, olhar e deslocamento são três coisas

`Her body and face are turned toward the tower at screen-right; she is not looking down.` →
`The basket turns a quarter-turn, which brings him into her view: she looks down and catches him.`
Escrever separadamente para onde o torso aponta, para onde os olhos vão e para onde o corpo anda.

## 4. Primeiro quadro

Intencional. Por padrão, ocupado: quem importa já está na posição certa no quadro zero
(`First frame: she alone in the basket, both hands on the rim…`). Vazio só quando a ausência é a
direção (suspense, chegada, escala). Em multi-shot, cada SHOT tem seu primeiro quadro.

## 5. Função do plano

| Plano ou movimento | Função | Descrição útil |
|---|---|---|
| aberto | espaço, isolamento, escala, rota | ação legível pelo corpo |
| médio | tarefa e interação | mãos, postura, estímulo e resposta |
| close | reação, informação facial, lip sync | detalhe decisivo e tempo para ler |
| insert | mecanismo ou objeto | a mudança que importa (o elo da corrente abrindo) |
| fixo | espera, inevitabilidade | o que muda dentro do quadro |
| push-in | pressão interna, revelação | origem, destino |
| tracking | deslocamento | trajeto e velocidade relativa |
| pan ou tilt | transferir atenção | gatilho, origem, destino (abertura: tilt do céu para a cena) |
| handheld | presença, instabilidade | amplitude e legibilidade |
| órbita | revelação espacial | arco, início, fim, o que fica estável |

Movimento sem trabalho dramático é ruído. Se a atuação importa, câmera mais calma. Se o impacto
importa, a câmera pode reagir fisicamente sem virar caos.

## 6. Ótica

FOV e milímetros são **descritores de aparência**, não parâmetros controlados. O modelo infere a
lente do conteúdo: para conseguir um FOV, escreva o que só aquele FOV mostra (o primeiro plano que
avulta, o fundo comprimido). Equivalências de full frame 36×24 mm, diagonal, lente retilínea:

| Focal | 16 | 18 | 21 | 24 | 28 | 35 | 50 | 75 | 85 | 135 |
|---|---|---|---|---|---|---|---|---|---|---|
| FOV diagonal | 107° | 100° | 92° | 84° | 75° | 63° | 47° | 32° | 29° | 18° |

Ponto de partida por job (heurística dos guias, não faixa garantida):

| Job | Partida |
|---|---|
| atuação, diálogo, lip sync | 47°–63°; 84° só se o espaço importa |
| geografia, grupo | 84°–107°, com reação de corpo, não micro |
| impacto | 84°; 107° com primeiro plano avultando |
| teleobjetiva, observação | 29°–18°, com camadas de primeiro plano |

Veto: não pedir microexpressão ou lip sync de figura pequena num grande-angular. "35mm film texture"
é textura de película, não lente de 35 mm. 21:9 não é 2.39:1. "Anamorphic look" é aparência, não
ótica real.

**Dolly zoom correto:** aproximar a câmera **abrindo** o FOV, ou afastar **fechando** o FOV, para
manter o tamanho do rosto. (Um dos guias-base tinha o exemplo invertido.) Descrever início, fim e o
que fica estável; se falhar, simplificar ou fazer na pós.

## 7. Dispositivos criativos

Só entram se o usuário pediu ou se o estilo pedido os implica. Nunca inventar. Quando pedido,
preservar, traduzido em física:

```text
[Dispositivo] aparece como [efeito físico visível] em [tempo ou gatilho], indo de [enquadramento
inicial] a [enquadramento de pouso], enquanto [elementos estáveis] seguem controlados.
```

| Dispositivo | Tradução |
|---|---|
| crash zoom | `Starts in an 84° two-shot; on his hand jab, one 0.35 s crash zoom punches into a 47° close on her face, then holds without bouncing. No other lens change.` |
| dutch | `The camera holds a 12° clockwise roll on the same side of the action line; the roll tilts the frame only and does not mirror the geography.` (8–15° tensão; 15–25° cômico) |
| whip pan | `On the shouted word, the camera snap-pans from his pointing hand to her reaction and lands in a stable held frame.` |
| órbita + parada | `Three things happen in the same instant: the orbit turns frontal, she stops, his silhouette separates in the blur.` |
| rack focus | dois alvos e um gatilho |
| match cut | o vínculo de forma ou movimento entre as duas imagens (o aro redondo vira a luz) |

Um dispositivo maior por plano curto. Dois só se um for estático e o outro temporizado (dutch
mantido + um crash zoom).

## 8. Slow motion e cadência

- Slow motion com função, em geral só no fim da sequência: `Slow motion from 3 seconds to the end.`
- Nunca escrever "no blur" em ação: gera estroboscópio e quadros pulados. Usar:

```text
Natural 180-degree shutter motion cadence: fast movement carries realistic motion blur, then
resolves into sharp readable poses at the hold points. No ghosting, no duplicated limbs, no stutter.
```

- Diálogo parado: `Stable natural motion cadence; held faces stay sharp and readable.`
- Atalho que funcionou em todos os clipes do filme no LOOK: `Natural motion blur on fast moves, clear held poses.`

## 9. Luz motivada

Dizer a fonte, a direção, o que ela faz no rosto, o que fica em sombra e o que não pode vazar.

| Cena | Luz |
|---|---|
| noite externa | práticas motivadas (postes, faróis, vitrines), reflexo no molhado, rostos legíveis, sem luz de dia vazando |
| interior íntimo | janela ou abajur, olhos legíveis, sombra suave |
| catástrofe | a fonte do perigo ilumina (fogo, cinza filtrando o sol, chama azul do jetpack) |
| festa de época | lustres, arandelas, velas; nada de LED fora da época |
| confronto épico | contraluz, recorte, sombras fundas |

Evitar luz frontal chapada, "beauty fill" de estúdio e rostos esmagados no preto quando a atuação
importa. Estilo compacto: realismo, época, paleta, contraste, textura. 60:30:10 é ferramenta
opcional, não lei.

## 10. Veto de viabilidade

Antes de escrever, verificar se o plano pedido pode funcionar. Conflitos que pedem correção:

| Conflito | Correção |
|---|---|
| grande-angular extremo + microatuação | escolher entre plano de geografia e de atuação |
| figuras pequenas + lip sync | aproximar quem fala |
| câmera impossível no espaço | mover a câmera ou trocar a lente |
| plano contínuo com muitos eventos grandes | dividir em planos ou clipes |
| noite descrita com linguagem de dia | reescrever a luz |
| multidão que reage quando a regra é ninguém notar | dar tarefa à multidão |

Hierarquia ao corrigir: 1 intenção narrativa, 2 identidade das referências, 3 blocking essencial,
4 diálogo, 5 ótica, distância e tamanho do plano, 6 estilo e detalhe secundário. Corrigir detalhe
secundário em silêncio; **avisar** o usuário quando mudar uma regra dura ou a intenção.

## 11. Checagem de câmera antes de entregar

| Item | Pergunta |
|---|---|
| job | cada plano tem um job dominante? |
| posição | a câmera cabe no espaço e tem altura, lado, distância, mira? |
| lente | o conteúdo justifica o FOV descrito? |
| primeiro quadro | ocupado e correto, ou vazio por intenção? |
| eixo | o lado da câmera se mantém onde a geografia importa? |
| corpo e olhar | definidos separadamente? |
| dispositivo | o pedido foi preservado e traduzido; nenhum foi inventado? |
| luz | motivada e coerente com hora e época? |
