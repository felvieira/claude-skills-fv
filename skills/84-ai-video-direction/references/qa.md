# QA antes e depois de gerar

Regra: **nunca afirmar que um vídeo foi verificado sem observar os quadros e o áudio.** Primeiro
quadro bonito não aprova clipe. Plano pronto não é vídeo aprovado. Se o QA automático não viu as
imagens, ele não avaliou: marcar "indisponível", nunca "aprovado".

## 1. Antes de gerar (lint de prompt)

Bloquear o envio se houver: referência inexistente ou fora de ordem; parâmetro inválido para o
modelo; duração fora do perfil; landmark citado que a placa não tem; STATE IN ≠ STATE OUT anterior;
fala sem idioma ou diferente do roteiro; corpo fora do chão sem apoio; perigo sem causa; final
parado esperando a transição; pedido de texto legível. Tabela completa em `arquitetura-do-prompt.md`.

## 2. Folha de contato: 8 quadros por clipe

```bash
# D = duração do clipe em segundos (ffprobe); 8 quadros espaçados num mosaico 4×2
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 clip.mp4)
ffmpeg -y -i clip.mp4 -vf "fps=8/$D,scale=480:-1,tile=4x2" -frames:v 1 clip_contato.png
```

Olhar o mosaico **e** os quadros dos pontos críticos (contato, queda, fala, último quadro) em
tamanho cheio: `ffmpeg -ss 4.2 -i clip.mp4 -frames:v 1 q_4.2.png`. Para defeito rápido (mão, salto),
extrair 2–3 quadros por segundo daquele trecho.

## 3. Áudio: a fala existe e está no idioma certo?

- **Stream de áudio não prova fala.** O modelo pode gerar ambiência com o stream cheio.
- RMS por janela: fala oscila, ambiência fica reta.

```bash
ffmpeg -i clip.mp4 -af astats=metadata=1:reset=24,ametadata=print:key=lavfi.astats.Overall.RMS_level -f null - 2> rms.txt
```

- STT com tempo por palavra e idioma (`fal-ai/elevenlabs/speech-to-text`, `language_code: "por"`, ou
  Whisper local pela skill 54). Comparar com o texto aprovado: fala inteira, uma vez, no idioma
  certo, atribuída a quem tem o rosto em cena, sem palavras em inglês no fundo.

**Cobertura da frase.** Comparar o texto do STT com o aprovado por LCS de palavras normalizadas
(minúsculas, sem acento, sem pontuação). O STT troca grafias ("frontend" vira "front-end") e erra
nomes próprios: manter uma lista de equivalências. Com a frase inteira dita, a LCS ficou entre 0,83
e 0,92; abaixo disso, ouvir antes de reprovar. O STT custa ~US$ 0,003 por clipe de 5 s.

Também medir: `ffprobe` (duração, resolução, fps, presença de áudio) e `volumedetect` (volume médio).
Para talking head, folha de 6 quadros em linha (`tile=6x1`, 300 px) olhando a boca; ver
`talking-head-e-apresentador.md`.

## 4. Checklist por clipe

| Item | Pergunta |
|---|---|
| identidade | rostos batem com as folhas? óculos, barba, cabelo, altura relativa? |
| figurino e época | peças da folha presentes; nenhum anacronismo |
| apoio | cada corpo apoiado em algo em cada quadro; ninguém flutua |
| gravidade | cordas pendem; queda desce; subida puxada de cima |
| ameaça e multidão | vêm/correm na direção escrita |
| estado | STATE IN e STATE OUT observados batem com o escrito; objeto que saiu não voltou; objeto salvo persiste |
| lugar | placa certa, sensação de deslocamento quando o trecho mudou |
| estímulo → resposta | a reação vem depois do estímulo visível |
| cor exclusiva | ninguém mais com a cor do protagonista; nenhum sósia |
| fala | idioma, texto, uma vez, lip sync, sem inglês de fundo |
| final | em movimento até a transição; contato antes da luz |
| mãos | cinco dedos, sem fusão, contato legível |
| texto | nenhuma letra inventada no quadro |
| emenda | casa com o clipe anterior (match) ou a elipse é clara |

## 5. Rubrica 0–2

| Dimensão | 0 | 1 | 2 |
|---|---|---|---|
| função narrativa | não se entende o que muda | entende com esforço | a mudança lê na hora |
| causalidade | coisa acontece do nada | causa existe mas fraca | causa visível antes do efeito |
| atuação | reação sem estímulo ou congelada | legível mas genérica | tarefa clara, resposta motivada |
| continuidade | salto de estado ou identidade | detalhe secundário diverge | STATE e identidade batem |
| direção | câmera contra a ação | funcional | câmera serve ao job do plano |
| audiovisual | fala errada ou ausente, som quebrado | aceitável | fala certa com lip sync, som coerente |

Falha crítica (identidade errada, fala em outro idioma, corpo flutuando, estado impossível) reprova
o clipe; estética não compensa. Estilo incomum não é erro por si só.

## 6. Status

`needs_assets` → `needs_revision` → `ready_for_render` → (gerado) → `ready_for_edit` ou
`rejected_after_render`. Só passa a `ready_for_edit` depois do QA observado.

## 7. Laudo

```text
CLIPE: S2v2_ponte_C3 · request_id … · 7 s · US$ 3,24
QUADROS: clip_contato.png (olhado) · STT: "Demorou!" (por, 1×, 5,8 s) 
RUBRICA: narrativa 2 · causalidade 2 · atuação 1 · continuidade 2 · direção 2 · audiovisual 2
DEFEITOS: 3,1–3,6 s mão esquerda dela funde com a prancha
APROVEITÁVEL: 0–3,0 s e 3,8–7,0 s
DECISÃO: aprovado com corte em 3,0/3,8 | regerar beat 2 | reprovado
```

## 7b. Teste A/B de caminho (identidade)

Antes de trocar o caminho de identidade num filme inteiro (referências × quadro composto, `quadro-composto-e-revisao.md`), compare num clipe barato: mesmo prompt, mesmo modelo, mesma
duração, só o caminho muda. Extraia 3 quadros de cada (início, meio, fim), ponha ao lado das fotos de referência e pontue o rosto de 0 a 2. Registre o placar e o custo. Uma tentativa por
caminho não prova nada: se a diferença for pequena, repita uma vez com outro trecho antes de decidir.

## 8. QA do filme final

| Medida | Comando | Alvo |
|---|---|---|
| loudness integrada e pico real | `ffmpeg -i final.mp4 -af ebur128=peak=true -f null -` | −14 LUFS, pico real abaixo de −1 dBTP |
| duração | `ffprobe -show_entries format=duration` | a planejada |
| legendas | olhar a faixa de legenda em vários tempos | sem colisão com cartela ou outro texto |
| emendas | assistir cada transição | sem salto de som nem de luz |
| fala sob a música | ouvir as cenas de ação | trilha abaixa sob fala e efeito |
