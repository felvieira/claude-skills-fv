# Armadilhas de um pipeline automático de geração

Para quem constrói um sistema que faz automaticamente o que esta skill faz à mão. São os 41 furos
achados ao auditar um produto real contra o método do filme (30/09/2026), resumidos de forma
genérica. Resumo em uma frase: o sistema **gerava as folhas e as placas, pagava por elas e as
descartava antes do vídeo**; o modelo recebia só um quadro inicial e um prompt cujas leis e
referências os adaptadores jogavam fora; o QA não barrava nada; o modo automático entregava MP4 em
19% dos projetos.

Princípio para corrigir: toda regra vira **campo + validador + teste**, não prosa no prompt. Regra
escrita só em comentário não reprova nada.

## Nível 0 — o método não consegue acontecer

| # | Armadilha | Sinal | Correção |
|---|---|---|---|
| 1 | folha de personagem descartada antes do vídeo | 0 clipes receberam folha | mandar folhas + placa por papel |
| 2 | vídeo recebe o keyframe como primeiro quadro; referências só se o catálogo declarar multi-referência | modelo i2v sem multi-referência em 76% das tentativas | caminho reference-to-video sem quadro inicial quando identidade importa |
| 3 | roteamento por slug manda modelo de um provedor para outro (mesmo model ID em dois provedores) | provedor certo nunca chamado | prefixo de provedor obrigatório; slug desconhecido falha |
| 4 | adaptadores por modelo cortam seções (leis, referências, formato) | só o adaptador genérico mandava o texto todo | teste por adaptador: toda seção não vazia chega ao texto enviado |
| 5 | QA de cena aplicado a assets (placa vazia reprovada por "personagem ausente") | cenários travados com `pass=false` | QA próprio de folha e placa |
| 6 | o registro mente: grava o prompt antes do adaptador e nunca grava o payload | `provider_params` vazio em 100% | gravar o enviado, por papel, depois do adaptador (é o sensor de todo o resto) |

## Nível 1 — o prompt se contradiz

| # | Armadilha | Correção |
|---|---|---|
| 7 | plano de reserva sem LLM fabrica câmera/lente fixas e vira objetivo de marketing em ação | sem LLM, campos ausentes em vez de fixos; marketing fora da ação |
| 8 | regex de segurança reescreve campos do LLM e cria contradição ("o dedo toca o rosto" num plano sem rosto) | regex não reescreve conteúdo; valida e reprova |
| 9 | detector de risco por palavra-chave injeta instrução errada ("sai do" → "a pessoa caminha") | risco classificado por campo estruturado, não por substring |
| 10 | a primeira faixa de tempo recebe a ação inteira e as seguintes repetem (toque duplo) | ação distribuída por faixa; teste de não duplicação |
| 11 | sem política de fala: idioma, falante, "fundo nunca em inglês" | AUDIO POLICY obrigatória com o idioma do projeto |
| 12 | instrução para o redator colada no prompt do modelo ("mantenha uma ação principal") | separar instrução de sistema de conteúdo do prompt |
| 13 | texto fixo que não depende do plano (espelho, tela, cabelo em plano sem cabeça) e negativos duplicados | texto condicional ao plano |
| 14 | referências sem dizer o que controlam; manda ignorar o cenário da própria placa; diz "imagem enviada" quando não foi | linha `Image N is X: use it for… Ignore…` gerada da lista real enviada |
| 15 | modelo de avatar recebe prompt vazio quando falta um campo | validar prompt não vazio antes de enviar |
| 16 | faltam seções que o método usa: mapa do mundo, física e apoio, cor exclusiva, STATE IN/OUT | contrato com essas seções + validadores |

## Nível 2 — o automático não entrega e o QA não barra

| # | Armadilha | Correção |
|---|---|---|
| 17 | keyframe reprovado vira "revisão" e a cadeia espera para sempre | revisão com teto: segue com o melhor ou falha com motivo |
| 18 | QA de vídeo só informa; take reprovado vai para o MP4 (identidade 0, lip sync 0) | QA que barra por padrão |
| 19 | avaliador não vê folha nem retrato, recebe 4–5 quadros soltos, e o mock aprova e inventa estado final | folha de 8 quadros + folhas e placa no avaliador; mock marca indisponível |
| 20 | não existe comparador facial; identidade fica "inconclusiva" | comparador real ou identidade declarada manualmente |
| 21 | crítico de montagem nunca repara nada (JSON malformado); `replace_take` ignorado; sem reuso por timecode | JSON validado; reparo e reuso por timecode implementados |
| 22 | correção automática em modo sombra, sem limite; mesmo prompt reenviado várias vezes | política com limite por estratégia e mudança real a cada tentativa |
| 23 | render que falha não reenfileira porque a chave de deduplicação colide | chave com sal por tentativa (guardas vêm em pares: filtro e chave) |
| 24 | falha da trilha de fundo segura o render | áudio opcional não bloqueia o vídeo |
| 25 | serviço de render nem está rodando; o job espera sem erro | checagem de saúde antes de enfileirar |
| 26 | degradações silenciosas terminam como sucesso (agente de prompt, quadro final, vista extra) | degradação registrada e visível |

## Nível 3 — dinheiro

| # | Armadilha | Correção |
|---|---|---|
| 27 | moderação e validação do provedor contadas como cobradas; sem classe "moderação" nem reescrita calma | classificar moderação como não cobrada e permanente; 1 reescrita calma |
| 28 | clipe contado duas vezes quando nenhum take vence | uma linha de custo por chamada real |
| 29 | três fontes de custo que não batem; custo de erro é o estimado | ledger único, previsto × real |
| 30 | moderação tratada como transitória; a fila tenta 3× | moderação é permanente para aquele texto |

## Nível 4 — assets

| # | Armadilha | Correção |
|---|---|---|
| 31 | um cenário por projeto; um existente bloqueia outro | placa por lugar + trecho + eixo |
| 32 | figurino só em texto; a folha de figurino nunca é gerada | variante de folha por época/figurino |
| 33 | falha de folha segue "sem trava" | sem folha aprovada, personagem não vai para vídeo |
| 34 | elenco truncado para 1 personagem; mãos e objetos viram "personagem"; elenco do plano vazio | elenco tipado (pessoa, criatura, objeto) por plano |
| 35 | layout de folha diferente do que funciona (6 painéis, corpo sem cabeça, sem altura, sem mãos) | layout de `folhas-e-placas.md` |

## Nível 5 — áudio e pós

| # | Armadilha | Correção |
|---|---|---|
| 36 | SFX descritos no plano e descartados | gerar cada SFX ou cortar a descrição |
| 37 | áudio nativo silenciado quando há locução; sem locução, a fala toca sob música sem ducking | fala nativa mixada e com ducking |
| 38 | legenda do TTS com tempo repartido por igual; diálogo nativo nunca legendado | STT do áudio real com tempo por palavra |
| 39 | ducking pela janela declarada, não pelo sinal (música abafada sobre silêncio) | sidechain com chave no som de cena |
| 40 | uma música por projeto, seções só em texto, sem crossfade | trilha por sequência com crossfade na transição |
| 41 | 0 dissolve, sem cartela de capítulo, sem som-assinatura, sem cartela final | transições reais e cartelas na edição |

## Armadilhas de API vistas em produção manual

| Armadilha | Correção |
|---|---|
| slug inferido do nome (Grok Imagine Video 1.5 `…/image-to-video` não existe, 404) | ler o model ID na página do modelo ou no mapa do site |
| `/estimate` aceita campo desconhecido sem reclamar | estimativa ok não valida o corpo; conferir campos na página |
| `/estimate` de modelo por token devolve texto, não número | calcular pela fórmula de tokens |
| saldo menor que o suposto; lote inteiro falha | conferir saldo no painel, trava `--max`, parar no primeiro erro de saldo |
| parâmetro de câmera do endpoint somado a movimento no prompt | um só controle de câmera |
| cobrança por segundo de entrada arredondada para cima (Genjutsu) | aparar a fonte com `ffmpeg -t` |
| reference-to-video usado como se fosse primeiro quadro | image-to-video quando a composição exata importa |
| duração fora do conjunto aceito (LTX Pro só 6/8/10) | validar duração pelo perfil do modelo antes de enviar |

## Engrenagens construídas e nunca exercidas

Recursos com código, rota, tela e testes, mas zero linhas no banco (previs, aprovação de spec, job de
identidade, upscale, avaliador de vídeo sem chamador). Antes de construir mais, **contar no banco**
se a cadeia existente roda; feature testada com zero execuções é gate faltando, não código faltando.

## O que um sistema assim costuma fazer bem (não quebrar)

Loudness −14 LUFS com pico controlado; veto de viabilidade e tabela FOV; scene engine com validador;
eixo 180° e direção de tela; perfil de capacidade com "desconhecido"; saldo esgotado não cobrado;
referências arquivadas em storage próprio (não expiram).

## Validações de contrato que pegam a maioria

- todo ID referenciado existe; asset compilado está disponível e vinculado
- duração pertence ao perfil do modelo; os tempos cobrem o clipe
- cortes internos = planos − 1
- prompt compilado vazio impede "pronto para gerar"
- só campos e valores documentados do endpoint
- STATE OUT(n) compatível com STATE IN(n+1) nos cortes de continuidade
- fala aprovada não muda entre roteiro e prompt
- capacidade desconhecida continua desconhecida (sem número fabricado)
- vídeo só fica "pronto para edição" depois do QA observado
