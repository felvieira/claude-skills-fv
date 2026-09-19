# Vocabulário Cinematográfico — Referência de Prompt

Extensão da seção "Prompt cinematografico" do `SKILL.md`. Carregar quando o prompt precisa de mais precisão do que o exemplo único do arquivo principal cobre — múltiplas variações de shot, biblioteca de movimentos, ou prompt para um provider que responde bem a vocabulário técnico de set (Kling, Veo, Runway).

## Princípio: um verbo de movimento por shot

Um prompt que empilha múltiplos movimentos de câmera ("dolly-in enquanto orbita e sobe em crane") confunde o modelo — ele tende a fazer nenhum bem feito. Escolher **um** movimento dominante por shot e deixar o resto (iluminação, ritmo, estilo) como camada de contexto, não como segundo movimento.

- Fraco: *"camera dollies in while orbiting around the subject and slowly craning up"*
- Forte: *"camera dollies in slowly toward the subject, handheld micro-shake, warm tungsten light"* (um movimento — dolly-in — mais textura, sem competir)

## Biblioteca de movimentos de câmera

| Movimento | Efeito narrativo | Quando usar |
|---|---|---|
| **Dolly-in** | aproximação, foco crescente, tensão | revelar detalhe, momento de decisão |
| **Dolly-out** | afastamento, contexto, isolamento | fim de cena, mostrar escala |
| **Pan** (horizontal) | revelar espaço lateralmente | seguir ação, mostrar ambiente |
| **Tilt** (vertical) | revelar altura/escala | mostrar prédio, personagem de baixo pra cima |
| **Orbit** | contornar o sujeito mantendo distância | showcase de produto, herói 360° |
| **Static** | estabilidade, observação | diálogo, produto parado, quando o movimento distrairia |
| **Handheld** | urgência, realismo, imperfeição proposital | ação, documentário, "sensação de estar lá" |
| **Crane/Aerial** | escala épica, estabelecimento de cena | abertura, transição entre locações |

## Biblioteca de shots (enquadramento)

| Shot | Uso |
|---|---|
| **Wide/Establishing** | contexto, onde estamos |
| **Medium** | ação e expressão corporal |
| **Close-up** | emoção, detalhe de produto |
| **Extreme close-up** | textura, material, tensão |
| **Aerial/Drone** | escala, geografia, abertura |

## Estrutura de prompt estendida

```
[SUJEITO + AÇÃO] + [AMBIENTE] + [CÂMERA: 1 movimento + 1 shot] + [ILUMINAÇÃO] + [ESTILO/LENTE] + [RITMO]
```

Exemplos por objetivo:

**Produto (showcase):**
> "A sneaker rotates slowly on a matte pedestal, orbit shot at eye level, studio softbox lighting, macro lens detail, calm steady pace"

**Abertura de vídeo institucional:**
> "Aerial shot descending toward a modern office building at golden hour, slow crane-down movement, warm backlight, cinematic wide lens, deliberate pacing"

**Momento emocional/testemunho:**
> "Close-up on a person's face as they speak, static camera, soft window light from the side, shallow depth of field, natural unhurried pace"

## Render determinístico (quando o provider expõe seed)

Quando o provider aceita `seed` fixo (nem todos expõem — checar docs do modelo em uso), fixar o seed ao iterar sobre um mesmo prompt evita que cada nova tentativa produza um resultado completamente diferente, dificultando comparar variações de prompt isoladamente.

- Fixar `seed` ao testar variações de **prompt** (mesmo seed, prompt muda) — isola o efeito da mudança de texto
- Variar `seed` deliberadamente ao gerar **opções** para o usuário escolher (mesmo prompt, seeds diferentes) — mostra o range de resultados possíveis
- Nunca depender de aleatoriedade não-seedada quando o objetivo é reproduzir um resultado aprovado anteriormente — sem seed fixo, "gera de novo, mas igual" não é garantível

## Fonte

Vocabulário e biblioteca de movimentos adaptados dos 157 shot recipe cards de [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) (Apache-2.0), reescritos como referência agnóstica de framework — o stack de composição (Remotion) da fonte não foi trazido, apenas o vocabulário cinematográfico e o princípio de "um verbo de movimento por shot".
