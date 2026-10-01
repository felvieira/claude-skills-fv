# Arquitetura do prompt (template v4)

O formato que funcionou para Seedance 2.5 `reference-to-video`. Cada chamada é **autocontida**: o
modelo não lembra do clipe anterior, então todo clipe carrega as referências, o mapa, as leis, a
política de áudio, a continuidade e o estado de entrada e saída.

## Idioma

- Corpo do prompt em **inglês** (convenção dos guias e do filme; não há prova de superioridade,
  é o que foi medido funcionando).
- Falas **literais no idioma do projeto**, padrão PT-BR, entre aspas e anunciadas:
  `She says, teasing, in Brazilian Portuguese: "Vai ficar só olhando?"`
- Para outro idioma do projeto, trocar o nome do idioma em todas as ocorrências (AUDIO POLICY e
  cada fala). Explicações ao usuário, sempre no idioma dele.

## Estrutura

```
SHARED (igual em todos os clipes da sequência)
  ACTIVE REFERENCES
  WORLD MAP AND PHYSICS RULES
  LOOK
  AUDIO POLICY
  CONTINUITY
CLIP (um por chamada, 5–8 s)
  FORMAT
  SCENE CONTEXT
  Image N here is …           (vista da placa deste clipe)
  STATE IN
  SHOT 1 - t0 to t1 s - TÍTULO (enquadramento, posição da câmera)
  SHOT 2 …
  STATE OUT
  AUDIO
```

Prompt enviado de cada clipe = `FORMAT` + `SHARED` + resto do `CLIP`. O FORMAT vai primeiro porque
duração, proporção e número de cortes são a informação que mais muda a geração.

### ACTIVE REFERENCES

Na **ordem exata** de `image_urls`. Cada linha diz o que a imagem controla e o que ignorar.

```text
Image 1 is CHARACTER A: use it for his face, full dark beard, round tortoiseshell glasses,
side-parted hair and outfit - brown wool overcoat, beige scarf, dark three-piece suit, brown
felt fedora. Ignore the grey background and the faceless panels. He is 1.80 m tall.
Image 2 is CHARACTER B: use it for her face, waved dark hair under a red cloche, thin round
gold glasses and outfit - red wool coat with a fur collar, dark dress, T-strap shoes. Ignore
the grey background and the faceless panels. She is 1.65 m tall.
Image 3 is the LOCATION of this clip: geometry, materials and light only, not the camera.
Image 4 is the DOG: use it for the breed, size and coat markings; ignore the grey background.
The dog's neck is bare: no collar, no rope, no tag.
```

- Listar o figurino peça por peça, **inclusive o equipamento** (jetpack nas costas, bengala, máscara
  de mão). O que não está listado e não está na folha, o modelo inventa.
- Altura em metros: é o que mantém a proporção entre os dois.
- A placa controla geometria, materiais e luz, **nunca** a câmera.
- Nunca afirmar que uma imagem foi enviada se não foi. Nada de `@tag` ou `<<<uuid>>>` inventado.

### WORLD MAP AND PHYSICS RULES

Geografia fixa, regra de movimento de cada objeto que se move, gravidade como lei, o que sustenta
cada corpo, o que ninguém alcança. Frases-modelo (adaptar):

```text
The WIND blows from screen-right to screen-left: once free, the balloon rises and drifts toward
screen-left. GRAVITY: gravity is real and constant. The rope is heavy and always HANGS DOWN from
the basket - it is never horizontal and never stiff sideways. Nobody flies or glides: when a
person's feet leave the ground it is only because the rising balloon pulls the rope straight UP,
and that person HANGS straight DOWN beneath his hands, arms stretched overhead, body vertical,
legs dangling. A jump goes up and comes down.
The platform drifts AWAY from the walkway in every clip and slowly SINKS; it never rises and
never moves back. From clip C2 on, the railing is at least four metres away from her, out of reach.
CHARACTER B is inside the basket from the first moment to the last; she never leaves it.
```

Detalhes em `fisica-e-continuidade.md`.

### LOOK

Compacto e observável: realismo, época, luz motivada, paleta, textura. Ex.: `Photoreal live-action,
1925. Blue-grey dusk after rain, warm lamp globes, reflections on wet gravel. 35mm film texture,
fine grain. Natural motion blur on fast moves, clear held poses.` Não empilhar diretores e marcas.

### AUDIO POLICY

```text
All speech is Brazilian Portuguese, spoken only by the named character, with lip sync; exactly
the lines written, once each. Background voices are unintelligible murmur, never English words.
Diegetic sound only, no music.
```

"No music" quando a trilha entra na pós (recomendado). Se a música faz parte da cena (banda tocando),
dizer: `The band plays lively instrumental 1920s jazz in the background, low`.

### CONTINUITY

```text
Exactly these two people plus <figurantes nomeados>. Red belongs only to CHARACTER B: no other
red coat, hat or umbrella; the crowd wears grey, brown, navy and black. No other woman resembles
CHARACTER B. His glasses stay on in every shot. His fedora stays firmly on his head in every shot
of the film, including the fall; it never comes off. Both wrists bare. 1925 details only; no
aircraft, no modern vehicles, no readable writing.
```

### FORMAT

```text
One 7-second clip, 21:9, three shots with two hard cuts.
One continuous 5-second shot, 21:9, no cuts. Slow motion from 1 second to the end.
```

`shot_count − 1 = cut_count`. Tempos dos SHOTs cobrem o clipe inteiro, sem buraco nem sobreposição.

### SCENE CONTEXT e "Image N here is"

Uma frase do que acontece e por quê. Depois, qual vista da placa vale neste clipe e o que está nela
(landmarks citados adiante **precisam** estar nessa placa):

```text
SCENE CONTEXT: the winch breaks; the balloon escapes; his first grab fails, the second works.
Image 3 here is the FAIR on the ground: the balloon on its low wooden platform, the cast-iron hand
winch at the right of the platform, striped booths on both sides, the tower on the right horizon.
```

### STATE IN / STATE OUT

Lugar e lado de cada personagem, o que cada mão segura, figurino e sujeira, cada animal ou objeto
importante (quem segura, estado), a ameaça (onde, para onde avança), a multidão (para onde corre).
**STATE OUT do clipe N é copiado palavra por palavra como STATE IN do N+1.** O primeiro clipe de uma
sequência pode começar em `first frame is pure swirling white-gold light` (transição).

### SHOT

```text
SHOT 3 - 3 to 4.5 s - THE MISS (tracking beside him, camera at hip height)
He sprints after the rope lying on the gravel and dives flat onto it; his hands close on the rope
as it slides - it tears through his grip and slides away; he lands on his chest, his fedora still
on his head.
```

Título em maiúsculas com o job, enquadramento e posição física da câmera entre parênteses, depois
causa → efeito em verbos observáveis. Escrever `Stimulus:` e `Response:` quando há reação. Falas
dentro do SHOT, com o personagem e o idioma.

### AUDIO (do clipe)

Lista curta do que se ouve na ordem: ambiente, SFX das ações, as falas, o som da transição.

## Regras de compilação

1. Formato e duração coerentes com os parâmetros reais da chamada (o texto não cria parâmetro).
2. Só elenco, objetos e referências ativos neste clipe; nada de contexto velho.
3. Primeiro e último estado definidos por plano.
4. Movimento do sujeito, da câmera e do ambiente em frases separadas.
5. Verbos, trajetórias, estímulos e respostas observáveis; nada de "sente", "aura", "épico".
6. Preservar o acontecimento decisivo e cortar ornamento que compete com ele.
7. Restrição em positivo ("exactly two people"); exclusões curtas só quando necessárias.
8. Remover placeholders, contradições e frases de instrução ao redator ("keep one action").
9. Configurações (duração, resolução, proporção, áudio) nos campos da API, não só no texto.
10. Cada frase especifica imagem, som, sequência ou continuidade. Se não, cortar.

Densidade: um plano = uma ideia, uma ação, uma estratégia de câmera, um efeito. Um beat principal a
cada 2–3 s. O filme usou prompts de cerca de 900 a 2.500 palavras por clipe sem problema; o tamanho
não é o risco, a contradição é.

## Formato-fonte e compilação

Escrever uma sequência num arquivo `S<n>_<lugar>.txt` com blocos `### META`, `### SHARED` e
`### CLIP C<k> | <segundos>`. META define `nome`, `titulo`, `refs` (caminhos separados por `|`) e
opcionalmente `refs_C3` para trocar a placa a partir de um clipe. Um script compila cada CLIP em:

```json
{
  "name": "S2v2_ponte_C3",
  "model": "bytedance/seedance-2.5/reference-to-video",
  "refField": "image_urls",
  "outDir": "out/videos/v4",
  "refs": ["base/folha_A.png", "base/folha_B.png", "base/placa_ponte_vazio.png"],
  "input": { "prompt": "<FORMAT + SHARED + CLIP>", "duration": 7, "resolution": "720p",
             "aspect_ratio": "21:9", "generate_audio": true, "output_format": "mp4" }
}
```

E grava também o texto legível exato enviado (`prompts/<name>.txt`, com modelo, refs e duração no
cabeçalho) e um resumo com segundos e US$ por sequência. Template completo em
`templates/prompt-v4.txt`.

---

## Exemplo 1 — ação e resgate (2 clipes encadeados)

Expedição de 1890, ponte de cordas sobre um cânion. Personagens A (ele) e B (ela).

```text
### SHARED
ACTIVE REFERENCES
Image 1 is CHARACTER A: use it for his face, short dark beard, round wire glasses and outfit -
khaki field jacket, leather braces, canvas trousers, high laced boots, a coiled hemp rope across
his chest from left shoulder to right hip. Ignore the grey background and the faceless panels.
He is 1.80 m tall.
Image 2 is CHARACTER B: use it for her face, dark hair in a low braided bun and outfit - dark green
riding jacket, white blouse, long brown divided skirt, brown leather gloves, a leather satchel on
her left hip. No glasses. Ignore the grey background and the faceless panels. She is 1.65 m tall.
Image 3 is the LOCATION of this clip: geometry, materials and light only, not the camera.

WORLD MAP AND PHYSICS RULES
A deep rock canyon with a river far below. One old rope bridge with wooden planks crosses it from
the LEFT cliff to the RIGHT cliff; two hand ropes run along its sides. The bridge is failing: its
RIGHT hand rope is frayed near the right cliff. Planks that break fall straight DOWN into the
canyon. GRAVITY: real and constant. A person hanging from the bridge hangs vertically below it with
straight arms carrying her weight and legs dangling, nothing under her feet. Ropes hang down under
their own weight; they are never stiff sideways. CHARACTER A starts on the LEFT cliff; CHARACTER B
is on the bridge. From clip C2 on, the right cliff is at least six metres away from her, out of reach.

LOOK
Photoreal live-action, 1890s expedition. Late afternoon sun low from screen-left, warm rim light,
long canyon shadows, dust in the air. 35mm film texture, fine grain. Natural motion blur on fast
moves, clear held poses.

AUDIO POLICY
All speech is Brazilian Portuguese, spoken only by the named character, with lip sync; exactly the
lines written, once each. Diegetic sound only, no music.

CONTINUITY
Exactly these two people. Dark green belongs only to CHARACTER B. His glasses stay on in every shot.
Her satchel stays on her hip. Both wrists bare. 1890s details only; no modern gear, no readable writing.

### CLIP C2 | 7
FORMAT: One 7-second clip, 21:9, three shots with two hard cuts.
SCENE CONTEXT: the rope gives way and she drops; he runs onto the failing bridge toward her.
Image 3 here is the BRIDGE FROM THE LEFT CLIFF: the bridge spanning to the right cliff, the frayed
right hand rope near the right cliff, the canyon and river below.
STATE IN: CHARACTER B on the bridge two thirds of the way across, holding both hand ropes;
CHARACTER A on the left cliff at the bridge anchor, rope coiled across his chest.
SHOT 1 - 0 to 2 s - THE WARNING (insert on the frayed right hand rope)
Fibres of the right hand rope snap one by one near the right cliff; the rope sags.
SHOT 2 - 2 to 4.5 s - THE DROP (wide from the left cliff, the whole bridge in frame)
The right hand rope parts; that side of the bridge drops; planks under her fall straight down into
the canyon; she slips through the gap and catches the edge of a plank with both hands; her body
swings down and hangs vertically below the bridge by straight arms, legs dangling over the canyon.
SHOT 3 - 4.5 to 7 s - HE GOES (medium on him at the anchor)
Stimulus: her scream. Response: he grabs the left hand rope and runs out onto the
tilted bridge toward her, planks swinging under his boots. He shouts in Brazilian Portuguese:
"Segura firme!"
STATE OUT: CHARACTER B hanging by straight arms from a plank two thirds of the way across, the
right side of the bridge tilted down; CHARACTER A on the bridge halfway across, holding the left
hand rope with his left hand, running toward her.
AUDIO: wind in the canyon, rope fibres snapping, planks cracking and falling away, her scream,
his line, boots on wood.

### CLIP C3 | 7
FORMAT: One 7-second clip, 21:9, two shots with one hard cut. Slow motion from 4 seconds to the end.
SCENE CONTEXT: his first reach fails; he lies flat, ties himself and pulls her up; they keep moving.
Image 3 here is the BRIDGE FROM BELOW HER: the planks overhead, the tilted bridge, the canyon wall,
the river far below.
STATE IN: CHARACTER B hanging by straight arms from a plank two thirds of the way across, the
right side of the bridge tilted down; CHARACTER A on the bridge halfway across, holding the left
hand rope with his left hand, running toward her.
SHOT 1 - 0 to 4 s - THE MISS (medium, camera level with the planks)
He reaches her plank, kneels and grabs her right wrist - his grip slips on her glove and she drops
a hand-length, still holding the plank with her left hand. He throws himself flat on the planks,
loops his coiled rope around the left hand rope in one turn, and grabs her forearm with both hands.
SHOT 2 - 4 to 7 s - UP (camera floating beside the bridge, level with them)
He pulls; she swings a boot onto the plank and climbs as he hauls; she grabs his jacket; without
stopping they scramble together along the tilted bridge toward the left cliff, the bridge swaying.
She says, breathless, in Brazilian Portuguese: "Demorou!"
STATE OUT: both on their feet on the bridge, moving toward the left cliff, his left hand on the
hand rope, her right hand gripping his jacket.
AUDIO: creaking ropes, her breath, his grunt, the rope sliding, boots on planks, her line.
```

O que este exemplo demonstra: aviso antes do colapso, ameaça com causa, vítima fora de alcance,
herói vai até ela, primeira tática falha, adaptação com o equipamento que estava na folha, final em
movimento, STATE OUT = STATE IN, placa trocada quando muda o eixo.

## Exemplo 2 — romance e diálogo (1 clipe)

```text
FORMAT: One 8-second clip, 16:9, three shots with two hard cuts.

ACTIVE REFERENCES
Image 1 is CHARACTER A: use it for his face, short curly hair and outfit - olive canvas jacket over
a grey t-shirt. Ignore the grey background and the faceless panels. He is 1.80 m tall.
Image 2 is CHARACTER B: use it for her face, short dark bob and outfit - charcoal work shirt with
rolled sleeves, canvas apron. Ignore the grey background and the faceless panels. She is 1.65 m tall.
Image 3 is the LOCATION of this clip: geometry, materials and light only, not the camera.

WORLD MAP AND PHYSICS RULES
A small repair workshop just after closing, at night. A long wooden bench runs along the left side
of the room; the exit door is on the right with a wall hook beside it. Two ceramic cups stand on the
bench. The bench-to-door geography stays the same across the cuts.

LOOK
Photoreal live-action. Warm light from a bench lamp, cooler dim light near the door. Readable faces
and hands, gentle contrast, restrained film texture.

AUDIO POLICY
All speech is Brazilian Portuguese, spoken only by the named character, with lip sync; exactly the
lines written, once each. Diegetic sound only, no music.

CONTINUITY
Exactly these two people. His navy coat changes from his hand to the hook only during shot 2.
No readable writing.

SCENE CONTEXT: she invites him to stay without saying it; he answers by staying.
Image 3 here is the WORKSHOP from the open side of the room: bench on the left, door and hook on the right.
STATE IN: she behind the bench, screen-left, stacking tools; he beside the door, screen-right,
holding a navy coat in his left hand, torso angled toward the exit.
SHOT 1 - 0 to 3 s - THE CUP (medium two-shot, camera at chest height, steady)
Stimulus: he lifts the coat to put it on. Response: she finishes stacking the tools and places the
second cup on the bench between them, without pushing it toward him. She says softly in Brazilian
Portuguese: "Ainda sobrou café." Her eyes stay on the cup, then meet his for a moment.
SHOT 2 - 3 to 6 s - HE STAYS (medium on him from beside the bench)
He looks from the cup to her, pauses one breath, turns back and hangs the coat on the wall hook.
SHOT 3 - 6 to 8 s - SHARED SPACE (closer two-shot from the first camera side)
He moves the second cup to his side and rests his hand on the bench. She allows a small smile at
the corner of her mouth as she pours the coffee. The door stays closed.
STATE OUT: his coat on the hook; both beside the bench; two cups; she pouring.
AUDIO: room tone, the coat brushing the hook, ceramic on wood, coffee pouring, her line.
```

O que este exemplo demonstra: subtexto (intenção ≠ fala), estímulo → resposta escrito, objeto que
muda de estado uma vez, fala única com rosto legível, câmera do mesmo lado do eixo nos três planos.

## Outros padrões que valem como few-shot

| Padrão | Estrutura | QA específico |
|---|---|---|
| ação com falha e adaptação (corredor, 10 s, 2 planos) | rota alternativa visível desde o primeiro quadro; a barreira desce; ela freia com os pés plantados e escolhe o desvio antes de chegar; sai pelo outro lado | a barreira motiva o desvio; o desvio não pode parecer teletransporte |
| cooperação em 3 clipes de 6 s, um plano cada | C1 ela tenta sozinha e falha; C2 sinal, os dois giram os comandos, a luz apaga, a escotilha abre; C3 soltam, sorriem, ele oferece a mão, passo juntos | o pedido de ajuda vem antes da solução; cada mão no seu comando; o estado repete em cada prompt |
| suspense por ausência (8 s, plano fixo) | porta fechada no centro; ela ouve um som do outro lado; dá um passo; a maçaneta gira; a porta continua fechada até o fim | nenhum visitante, sombra ou porta aberta antes do fim |

Quando o roteiro está em três artefatos (MASTER LOCKS, ACTING BIBLE, SHOT LIST), eles viram,
respectivamente, o SHARED, as linhas de estímulo e resposta dentro dos SHOTs e os SHOTs com tempo.
Não reescrever os locks com palavras diferentes em cada clipe: copiar o SHARED.

"100% matches the reference" não garante identidade; o que ajuda é a folha boa, o rosto grande o
bastante no plano e a verificação no vídeo.

## Lint antes de gerar

| Item | Reprova se |
|---|---|
| linhas `Image N` | ordem diferente de `image_urls`, ou imagem citada que não foi enviada |
| landmarks | o texto cita algo que a placa do clipe não tem |
| STATE | STATE IN(n) ≠ STATE OUT(n−1) num corte de continuidade |
| tempos | buraco ou sobreposição entre SHOTs; soma ≠ duração |
| cortes | número de SHOTs − 1 ≠ cortes declarados no FORMAT |
| falas | fala sem idioma, sem falante visível, ou diferente do roteiro aprovado |
| física | personagem fora do chão sem dizer o que o sustenta |
| perigo | mudança de estado de ameaça sem causa e sem aviso |
| final | contato seguido de pose parada esperando a transição |
| texto | pedido de letra legível no quadro |
