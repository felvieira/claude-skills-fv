# Fluxo de produção ponta a ponta

Do pedido ao MP4. Cada etapa tem um portão: só se avança quando a anterior está aprovada, porque a
partir da etapa 5 cada erro custa dinheiro e as etapas 1–4 custam só texto.

## As cinco entregas

| # | Entrega | O que contém | Quem aprova |
|---|---|---|---|
| 1 | História | premissa, pergunta dramática, personagens, arco, desfecho, motivo com setup → payoff | usuário (modo guiado) ou a skill, justificando |
| 2 | Roteiro | cenas com ações observáveis, falas literais no idioma do projeto, sons perceptíveis | usuário |
| 3 | Plano de direção | engine por cena, acting tasks, beats, mapa do mundo, leis de física, STATE IN/OUT, divisão em clipes | lint interno + usuário quando há regra dura nova |
| 4 | Pacote de geração | folhas, placas, um prompt v4 por clipe, job JSON por clipe, estimativa | usuário aprova o **custo** |
| 5 | Acabamento | montado por sequência, trilha, SFX, cartelas, legendas, filme final medido | QA final |

Quando o pedido é só um prompt, entregar só o prompt e as configurações. Quando é um filme,
entregar as cinco camadas. Registrar decisões e suposições em uma linha cada; não expor rascunho.

## Pipeline com custo e paralelismo

| Etapa | Saída | Custa? | Paralelo ou sequencial | Portão para avançar |
|---|---|---|---|---|
| 1. Brief | 10 itens + suposições + modo de autoria | não | — | lacunas que mudam o resultado central foram perguntadas |
| 2. História | 3 propostas → 1 escolhida → bíblia | não | as 3 propostas em paralelo | motores realmente diferentes (não só cenário) |
| 3. Roteiro | cenas e falas | não | sequências em paralelo | cada fala cabe no tempo do clipe |
| 4. Direção | engine, acting, beats, mapa, STATE, clipes | não | sequências em paralelo | checklist pré-geração de `qa.md` |
| 5. Folhas | folha-mestra + variante por época/figurino | sim, ~US$ 0,08–0,12 cada | todas em paralelo | QA de folha (mãos, oval, zero texto, época) |
| 6. Placas | uma placa por lugar + trecho + eixo | sim, ~US$ 0,08–0,10 cada | todas em paralelo | QA de placa (landmarks, vazia, sem texto) |
| 7. Prompts | arquivo-fonte por sequência → job por clipe | não | — | lint + `--dry` com estimativa + custo anunciado e aprovado |
| 8. Clipes | MP4 com áudio nativo | sim, US$ 0,4622/s a 720p | todos os clipes de uma sequência juntos, com limite de concorrência e saldo conferido | todos baixados e no ledger |
| 9. QA | folha de 8 quadros + STT + laudo | STT custa centavos | todos os clipes em paralelo | rubrica 0–2, nenhum crítico |
| 10. Reparo | clipe regerado ou trecho reaproveitado | sim | só os quebrados | volta ao 9 |
| 11. Pós | montado por sequência → filme | trilha/SFX centavos | trilhas e SFX em paralelo | QA final (loudness, legendas, duração) |

### Dependências reais

- Folhas e placas antes de qualquer clipe: o clipe as recebe como `image_urls`.
- O clipe N **não** precisa do MP4 do clipe N−1, porque a continuidade vai como texto (STATE IN).
  Por isso todos os clipes de uma sequência rodam juntos.
- Se o reparo de N−1 mudar o STATE OUT dele, o clipe N precisa ser reescrito e conferido de novo.
- Trilha por sequência depende da montagem daquela sequência (duração exata e ponto da transição).

## Unidades: não confundir

| Unidade | O que é | Observação |
|---|---|---|
| História | a transformação do filme inteiro | contém sequências |
| Sequência | um mundo/época/fase com objetivo próprio | ganha trilha e cartela próprias |
| Cena | uma situação dramática | tem engine |
| Beat | mudança de tática, informação, atenção ou relação | **não exige corte** |
| Plano (shot) | imagem contínua entre cortes | pode conter vários beats |
| Clipe | um arquivo de uma chamada | 5–8 s, de 1 a 4 planos |
| Segmento de edição | o trecho usado na montagem | pode ser menor que o clipe |

Três relógios: tempo do filme, tempo local do clipe e trecho usado na edição. Registrar
`shot_count` e `cut_count` separados (3 planos = 2 cortes internos). Emenda entre arquivos é
decisão de edição, não do prompt.

## Por que clipes de 5 a 8 s

| Um clipe de 22 s com 11 ações | 3–4 clipes de 5–8 s |
|---|---|
| ordem dos beats embaralha, física se perde | cada clipe tem 1 beat principal a cada 2–3 s |
| uma falha joga fora tudo | refaz só o clipe quebrado |
| sem estado intermediário | STATE IN/OUT amarra a continuidade |

Um clipe só fica longo quando é um plano contínuo com pouca simultaneidade (ex.: final em slow
motion de 5–6 s).

## Organização de arquivos

```
<projeto>/
  _geral/           guias, referências reais (fotos), arquivo de ideias descartadas
  NN_<sequencia>/
    base/           folhas e placas aprovadas usadas na geração
    prompts/        o texto exato enviado à API de cada clipe da entrega
    entrega/        o montado final da sequência + os clipes que entraram nele
    arquivado/      versões anteriores, clipes rejeitados, prompts antigos
  00_FILME_FINAL/
```

- Nome de clipe: `<SEQ>v<versão>_<lugar>_C<n>.mp4`. Versão nova é sufixo novo; nunca sobrescrever.
- Registrar na planilha/roteiro qual trecho de qual arquivo entra na montagem (com timecode).
- Copiar cada saída para a pasta do usuário na hora e **listar a pasta antes de afirmar** que está
  atualizada. Erro real: dizer que a pasta estava em dia quando ela tinha só versões antigas.
- Duplicados: comparar por hash antes de apagar; mandar para a lixeira, não apagar permanente.

## Ledger

Uma linha JSON por chamada paga, em `out/ledger.jsonl`:

```json
{"ts":"2026-09-30T21:04:11Z","job":"S2v2_ponte_C3","modelo":"bytedance/seedance-2.5/reference-to-video","request_id":"…","status":"completed","usdEstimado":3.24,"duracao":7}
```

Registrar também falhas (`failed`, `nsfw`) com o motivo lido de `/requests/<id>/status`. Erro real:
o script gravava só `failed`, e o motivo (saldo baixo ou filtro) ficou invisível.

## Tempo de relógio

- Folha ou placa: segundos a 1–2 min.
- Clipe de 5–8 s a 720p: minutos; um job passou de 25 min e terminou depois que o script desistiu.
  Por isso o `request_id` é gravado **antes** do polling e existe retomada (ver `higgsfield-api.md`).
- Rodar jobs longos em background e avisar o usuário quando terminarem; não bloquear a sessão.

## Contrato de dados da produção

Para planejar em arquivo (ou construir um sistema), um JSON interno com estas partes. Não é payload
da API: o compilador transforma em `prompt` e parâmetros reais.

| Bloco | Campos principais |
|---|---|
| `project` | `authoring_mode`, `explanation_language`, `prompt_language: "en"`, `dialogue_language: "pt-BR"`, `genres`, `target_duration_seconds`, `aspect_ratio`, `audio_policy`, `hard_constraints`, `assumptions`, `factual_events`, `fictionalizations` |
| `capability_profile` | `provider`, `model`, `endpoint`, `verified_at`, `source`, duração mín/máx/inteiro, `max_shots_per_generation` (`null` + `unknown` quando não documentado) |
| `story` | `premise`, `dramatic_question`, `theme_in_action`, relação inicial e final, `motifs[{element, setup, payoff}]` |
| `assets` | registro de ativo (abaixo) |
| `scenes[]` | `purpose`, `entry_state`, `engine{goal, obstacle, tactic, response, turn, value_shift, choice, consequence}`, `world_map{landmarks, camera_side}`, `beats[{visible_action, information_change}]` |
| `shots[]` | `beat_ids`, `job`, `first_frame`, `camera{framing, height, position, movement, numeric_fov: null}`, `action`, `end_frame`, `continuity_in`, `continuity_out`, `risk_flags` |
| `clips[]` | `shot_ids`, `strategy` (single, multi, contínuo, montagem em pós), duração gerada, planos e cortes previstos, `references`, `settings`, `local_timeline`, `compiled_prompt`, `editorial_intent`, `qa_focus`, `status` |
| `edit_plan` | ordem dos clipes, pontes de som, títulos na pós, revisão final |

Registro de ativo:

```text
asset_id: identificador interno estável (não é token do provedor)
kind: character | wardrobe | location | prop | keyframe | motion | audio | style
file: caminho ou URL real
controls: o que a imagem orienta (rosto, figurino, geometria)
ignore: o que não copiar (fundo, ângulo, painéis sem rosto)
availability: available | planned | missing
provider_binding: posição em image_urls (Image 1, 2, 3…)
```

Validações: todo ID referenciado existe; ativo compilado está `available`; duração no perfil e
timeline cobrindo o clipe; cortes = planos − 1; `compiled_prompt` vazio impede `ready_for_render`; só
campos documentados; estados compatíveis nos cortes de continuidade; fala aprovada idêntica do
roteiro ao prompt; capacidade desconhecida continua desconhecida; vídeo só vira `ready_for_edit`
depois do QA observado.

## Ordem de um filme multi-sequência

Defina uma **forma de transição recorrente** (um objeto redondo da época que vira luz, uma porta,
um reflexo). Cada sequência abre saindo dessa forma e fecha entrando nela. O último plano de cada
sequência termina **em movimento** dentro da forma; o primeiro da seguinte começa nela. É também o
ponto do crossfade da trilha (`audio-e-pos.md`).
