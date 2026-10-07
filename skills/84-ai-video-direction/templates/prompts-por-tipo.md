# Prompts por tipo de clipe

Modelos prontos para preencher. Cada um é um clipe curto com **uma tarefa por plano**, intervalos de tempo explícitos, primeiro quadro ocupado e saída pensada para o corte
seguinte. Escreva o prompt final em inglês cinematográfico limpo; as notas e a conversa com o usuário ficam no idioma dele. Substitua `[A]` e `[B]` pelos personagens
(folha de identidade do caminho escolhido, ver `references/quadro-composto-e-revisao.md`), `<...>` pelo que a cena exige e apague o que não se aplica.

Regras comuns a todos (valem mesmo que o modelo não repita): rostos e roupas só do que a referência mostra; **acessório não aparece nem some**; texto legível, música, letras e
narração entram na edição, não no render; som do clipe é só ambiente e foley; um eixo de ação, sem cruzar; câmera com um trabalho dramático; nenhum plano pede "câmera lenta"
para esticar tempo (a desaceleração é só no olhar ou no beijo, e o tempo declarado é o tempo final do clipe). Se o tipo não cabe na duração, divida em dois clipes e una no corte.

## Cabeçalho comum (colar no topo de qualquer tipo)

```text
GLOBAL STYLE: <N> seconds total, <K> shots, <16:9|9:16|21:9>. <Photorealistic | genre> <one-line register>. <Texture: grain, bloom, fabric>. Natural skin. No on-screen text, captions, logos or signage.
CHARACTERS AND IDENTITY: [A] and [B] are exactly the two adults from the supplied reference. Keep their faces, age, hair, glasses state and wardrobe unchanged in every shot: <A: peças e acessórios> / <B: peças e acessórios>.
LOCATION AND FIRST FRAME: <one place; landmarks that stay fixed>. [A] is <screen side> doing <visible task>; [B] is <screen side> doing <visible task>. Nobody else is featured.
```

## 1. Olhar entre dois (3 planos, 15 s)

Para: reencontro, primeiro olhar, apresentação do casal.

```text
SCENE: [B] crosses <space>, notices [A] watching, and stops long enough for their eyes to meet.
SHOT 1, 0-5s: medium-wide, camera chest height, tracks gently beside [B] as she/he takes two measured steps. [A] stays visible behind, noticing. Hard cut.
SHOT 2, 5-10s: medium close-up of [A] from the same side of the axis. [A] raises the eyes toward [B], stops what [A] is doing, exhales, a tiny restrained smile. Both eyes sharp. Hard cut.
SHOT 3, 10-15s: matching close-up of [B]. [B] turns the eyes toward [A], holds the eyeline for a beat, then answers with a small smile. End on the face held slightly off-center for a match cut.
OPTICS AND CAMERA: shallow but usable depth of field; gentle moves only; no orbit; no crossing the axis. The final glance may be slightly slowed, not frozen.
PHYSICS AND LIGHTING: <motivated sources, color contrast>. Cloth settles under gravity.
AUDIO: <room tone>, fabric and steps. No music, no intelligible speech.
```

## 2. Gesto de cuidado / abrigo (3 planos, 15 s)

Para: dividir um guarda-chuva, oferecer um casaco, abrir espaço.

```text
SCENE: [A] offers [B] shelter without a word; they recognise something familiar in each other's gaze.
FIRST FRAME DETAIL: [A] already holds <object> in the right hand; its grip and shape stay fixed and it never changes hands.
SHOT 1, 0-5s: medium two-shot. [A] lifts the object slightly and tilts it toward [B]. [B] looks at it, takes one step closer. Hard cut.
SHOT 2, 5-10s: over [A]'s shoulder toward [B]. [B] settles under the object, turns a shoulder from the weather, lifts the eyes to meet [A]'s. A short pause before the smile. Hard cut.
SHOT 3, 10-15s: matching over-[B]-shoulder medium close-up of [A], same axis. [A] steadies the object and answers with a quiet smile.
PHYSICS: <weather> falls in one consistent direction; fabric darkens where wet; the object never passes through a head.
```

## 3. Interrupção que revela a dinâmica (2 planos, 10 s)

Para: um pequeno incidente em que um age e o outro equilibra.

```text
SCENE: a small jolt interrupts a quiet moment; [B] steadies them instantly and [A] calmly checks the cause; then they share a look.
SHOT 1, 0-5s: medium two-shot. One brief, gentle vibration sways loose straps or objects. [B] braces one hand on <fixed surface>; [A] checks one control and steadies. It settles. Small coordinated movements, not panic. Hard cut.
SHOT 2, 5-10s: close two-shot, slow restrained push-in. They look from the settled <surface> to each other: [B] a confident half-smile, [A] a dry warm answer. End near [A]'s eye with a reflection, leaving room for a match cut.
PHYSICS: fittings stay fixed; loose items respond once and settle. No fire, debris or alarms. The destination star or landmark is already visible from the first frame.
```

## 4. Close de reação a um aparelho (2 planos, 10 s)

Para: notificação, mensagem, match. Um personagem só.

```text
SCENE: [A] receives a notification in a quiet room and pauses to look before smiling.
FIRST FRAME DETAIL: [A] already holds the phone at chest level; the screen is an abstract soft glow, never a readable interface.
SHOT 1, 0-4s: three-quarter close-up, eye and cool screen reflection. A small ping; the eye shifts down to the screen and holds a beat. Hard cut.
SHOT 2, 4-10s: closer portrait, the top of the phone in foreground. A short focus pull from the phone edge to the eyes; [A] reads silently, exhales once, an understated half-smile. End with the eyeline on the phone, not the camera.
LIGHTING: soft cool phone light plus one warm lamp; the room is dim but not black; glasses reflect the same source.
```

## 5. Soleira (3 planos, 15 s)

Para: primeiro encontro, chegada, despedida. A porta **começa entreaberta** com o rosto de quem abre já visível (a identidade vem do quadro inicial); porta fechada exige um clipe à parte.

```text
SCENE: [A] has come to pick up [B]; [B] opens the door further and they meet face to face.
SHOT 1, 0-5s: medium two-shot. [A] straightens the edge of the jacket with one small gesture, releases it, takes a calm breath. [B] opens the already partly open door a little farther. Both faces visible. Hard cut.
SHOT 2, 5-10s: over [A]'s shoulder, portrait of [B]. [B] steps to the threshold, looks directly at [A], holds a beat before the smile. A light breeze moves only a few hair strands. Slightly slowed, not frozen. Hard cut.
SHOT 3, 10-15s: reverse close-up of [A], same side of the axis. [A] looks up, meets the eyes, a small calm smile. Hold the last two seconds.
PHYSICS: the door pivots on one hinge with a fixed swing direction; warm interior source, cool street fill; face exposure stays believable.
```

## 6. Gesto único contínuo com pose-alvo (1 plano, 10–15 s)

Para: pedido, entrega de presente, revelação. **O quadro inicial é a pose de partida; a foto real, se existir, é o destino, nunca o começo da ação.**

```text
SCENE: [A] <verb> in front of <landmark> and <verb>, while [B] <reaction>.
FIRST FRAME: both stand; [A] frame left, [B] frame right, facing each other; the key object is not yet visible.
ACTION, 0-4s: [A] turns fully toward [B] and brings <object> into view in the left hand. [B] watches the hand, then the face.
ACTION, 4-8s: [A] lowers one knee slowly and steadily, opening <object> once as [A] settles; the right arm opens naturally to the side (match the real pose, not a theatrical gesture).
ACTION, 8-12s: [B] brings both hands together in front of the mouth, fingers visible; looks at [A], pauses, smiles through the surprise. The object stays open and steady.
ACTION, 12-15s: hold the target pose. No standing, no embrace in this clip.
CAMERA: medium-wide with room for full bodies; one gentle push-in with at most a 15-degree arc from the same side; no orbit, macro insert or hidden cut.
PHYSICS: <knee meets ground, fabrics settle, water keeps flowing>. The object keeps its true size and never floats.
```

## 7. Continuação em abraço (1 plano, 10 s)

Para: o "sim" depois do gesto único. Começa na pose final do tipo 6.

```text
SCENE: [B] lowers the hands with a clear smile; [A] rises carefully and they embrace.
FIRST FRAME: [A] kneels frame left, [B] stands frame right with both hands near the mouth; the object is still open in [A]'s left hand.
ACTION, 0-3s: [B] lowers the hands, a small clear nod and smile. [A] notices the answer and exhales; no theatrical crying, no invented words.
ACTION, 3-6s: [A] rises using the legs, keeping the object in the left hand away from [B]'s body. [B] steps toward [A] as [A] reaches upright.
ACTION, 6-10s: one natural embrace; arms settle around shoulders and back, not through clothing. Hold the contact for a beat. End together, not spinning or separating.
CAMERA: medium two-shot, gentle widening as [A] stands, then a modest rise under one metre; both faces visible until the embrace.
```

## 8. Cerimônia: olhar, troca de objeto, beijo (3 planos, 15 s)

Para: casamento, formatura, entrega de prêmio. Entrada e saída reais entram na edição, não aqui.

```text
SCENE: during the ceremony, [A] and [B] share a look, exchange <object>, and lean into a brief affectionate kiss.
FIRST FRAME: they already face each other; do not restart any entrance. A blurred officiant or background figure is only the presence in the reference, not a speaking character.
SHOT 1, 0-5s: close two-shot. [B] looks at [A], holds the eyeline, a small smile with moist eyes. [A] takes a breath and answers gently. No lip-synced invented words. Hard cut.
SHOT 2, 5-10s: medium close framing with both faces and the joined hands at chest height. One simple placement of <object> on the receiving hand, using the approved pose from the preparation work. Hand ownership and object design stay consistent. No macro that loses anatomy. Hard cut.
SHOT 3, 10-15s: portrait two-shot. They lean toward each other for a brief kiss, then settle forehead-close for a beat. Veil or fabric moves softly; glasses stay in place.
CAMERA: slight dolly drift, no axis crossing; the kiss may be slightly slowed, not frozen.
```

Confirme no vídeo ou nas fotos reais **quem coloca qual objeto**; sem isso, marque o gesto como reconstrução e não como registro do que aconteceu.

## 9. Memória de viagem (1 plano, 5 s)

Para: lugares reais visitados. Sem foto do lugar, o quadro é uma reconstrução ilustrativa e deve ser dito.

```text
SCENE: [A] and [B] pause together to take in one view.
FIRST FRAME AND ACTION, 0-5s: side by side in the referenced place. [B] turns the eyes toward the view, [A] follows the gaze, one brief smile. A small lateral camera track reveals a little more of the same view. End on a stable reflection or the joined hands chosen in the keyframe.
CAMERA: medium-wide, gentle lateral motion, natural horizon; no aerial teleport, no new landmark, no activity absent from the reference.
LIGHTING: match the real photo's hour; no golden sunset if the source is midday.
```

## 10. Objeto simbólico em casa (1 plano, 5 s)

Para: a notícia de um filho, uma mudança, uma conquista. Objeto pequeno, ação mínima, **sem pessoa nova gerada**.

```text
SCENE: [A] and [B] hold <small object> together and register what it means.
FIRST FRAME: close together in the same home interior, the object already in their hands; no label or readable word.
ACTION, 0-5s: medium close two-shot. [B] looks from the object to [A], waits a beat, a quiet smile; [A] exhales and answers with the same calm tenderness. Hands settle together around the object. No big gesture, no dramatic crying.
CAMERA: one slow small push-in; finish on joined hands in the lower frame, matching the next clip's opening composition. Do not morph hands or clothes into the next scene.
```

## Como encadear

1. Cada clipe termina num quadro e o seguinte começa no mesmo quadro (STATE OUT = STATE IN, `references/fisica-e-continuidade.md`).
2. Troca de época, lugar ou roupa é **corte de edição** com enquadramentos correspondentes preparados antes; nunca peça ao modelo para transformar um rosto ou prédio no outro.
3. Dois lugares ou dois clipes de 5 s somam a duração mas podem mudar o arredondamento da cobrança: estime por payload (`references/custos-e-orcamento.md`).
4. Depois de gerar, compare quadros com as fotos de referência; "sem deriva de rosto" no prompt orienta o modelo, não prova nada.
