# Quadro composto e revisão de plano

Dois assuntos que apareceram ao revisar um plano de produção de 135 s com dois personagens reais: **como entregar a identidade de duas pessoas ao modelo** e **o que conferir
num plano antes de gastar um centavo**. O primeiro tem dois caminhos, e só um deles foi exercitado por nós.

## 1. Dois caminhos para a identidade

| | Caminho A — referências (padrão desta skill) | Caminho B — quadro composto → imagem para vídeo |
|---|---|---|
| Como | `reference-to-video` com folhas de personagem + placa; **sem** quadro inicial | prepara-se **um quadro 16:9** com ambos, roupa e cenário já resolvidos; ele vai como imagem inicial (`image-to-video`) |
| Onde a identidade é decidida | nas folhas (`folhas-e-placas.md`) | no quadro composto, aprovado olhando os rostos antes de animar |
| Evidência | em todos os testes do filme de 3 min, mandar quadro inicial piorou o rosto | **não validado por nós**: veio de um plano escrito, nenhum clipe foi gerado |
| Quando usar | padrão; várias épocas, personagens que se repetem | composição exata importa (pose do pedido, enquadramento real), ou o modelo não aceita multi-referência |

Antes de adotar o B num filme de verdade, rode o teste A/B de `qa.md` em **um** clipe barato: mesmo prompt, mesmo modelo, caminho A contra caminho B, e compare o rosto em
três quadros. Se o B perder, volte ao A; se ganhar, registre a evidência aqui. Nunca troque de caminho por intuição.

### Regras do caminho B

1. **O quadro inicial é um quadro narrativo, não uma folha.** Folha com painéis (retrato, frente, costas) enviada como primeiro quadro faz o modelo animar a grade. A folha serve
   para **construir** o quadro no gerador de imagem; o vídeo recebe só o quadro aprovado.
2. As fotos e folhas usadas na preparação **não entram automaticamente** na chamada de vídeo. O prompt só pode citar o que está no payload (`supplied opening frame`), nunca imagens extras.
3. **Imagem final** (`end_image_url`) só quando existe um destino visual compatível com a mesma ação, roupa e cenário. Sem destino compatível, não use.
4. **A foto real é o destino, não a partida.** Uma ação de ajoelhar começa com ambos de pé; a foto do gesto consumado define a pose final. Usar a foto já ajoelhada como início
   de um movimento de ajoelhar contradiz a ação.
5. Cada chamada de vídeo tem seu próprio quadro inicial aprovado. Esboce a lista (um quadro por chamada) antes de gerar qualquer clipe.
6. Mantenha a proporção no arquivo de origem: alguns modos não expõem campo de proporção.
7. Se o endpoint tiver modo de **múltiplas referências**, confira o schema real na conta: quantas imagens, o que a tag no prompt significa na API, e que a referência esteja no
   payload e coincida com o texto. `@Nome` no prompt não registra personagem sozinho. Não transporte o limite de uma versão ou interface para outra.

## 2. Lista de revisão do plano (antes de gerar)

Itens que, num plano real, geraram retrabalho ao serem trocados. Confira cada um:

| Pergunta | Decisão que evita retrabalho |
|---|---|
| Há duração por plano e intervalos de tempo no início do prompt? | número de planos, duração total e `0-5s` em cada plano, escritos |
| A ação de partida e a pose-alvo são a mesma foto? | partida ≠ destino; foto real só como destino |
| O quadro inicial é uma folha de painéis? | trocar por quadro narrativo |
| A luz e a paleta são iguais em todas as épocas? | fontes de luz e cores próprias por cenário; a pele natural é o vínculo entre cenas |
| Um plano pede órbita de 360°, macro e rack focus juntos? | movimentos menores e legíveis; inserto delicado só quando ajuda a história |
| Um clipe transforma uma época ou lugar na outra? | dois clipes e corte de edição com enquadramentos correspondentes |
| "Trava de identidade" no texto é tratada como garantia? | referência define a identidade; texto orienta; **a revisão visual confirma** |
| Há "8K" ou outra resolução decorativa no prompt? | remover: não altera o que é entregue |
| Há 15 s de ação real comprimidos numa "câmera lenta"? | pedir desaceleração só no olhar ou no beijo; o tempo declarado é o final |
| Um acessório aparece só em algumas cenas? | decidir na referência: óculos, véu, fita, relógio não entram e saem; fita simbólica só nos universos fictícios, nunca acrescentada a um acontecimento real |
| Limites, preço, retenção e concorrência da conta vêm de uma conversa antiga? | revalidar na operação usada antes de orçar |
| A trilha pedida é uma música protegida? | não peça canção nem letra ao modelo; trilha com direitos entra na montagem |
| Há pessoas reais, e as fotos podem ser usadas? | autorização; reconstrução marcada como ilustrativa quando não há foto |
| Um fato do roteiro afirma o que o material não prova? | frase poética não é afirmação factual (ex.: "encontros em outras épocas" é ficção declarada) |

## 3. Registro operacional por chamada

Um manifesto por chamada de vídeo, para retomar e para auditar:

`grupo` · `versão do prompt` · `endpoint` · `duração` · `resolução` · `quadros de origem` · `status` · `request ID` · `custo estimado` · `custo faturado (se disponível)` · `caminho de
saída` · `motivo de repetição`.

Baixe o arquivo assim que concluir e mantenha fotos de pessoas fora do Git. Retenção, expiração e cobrança de falha ou moderação **não se supõem**: confirme no serviço.
Ao reprovar um clipe, registre o defeito e mude **uma** causa concreta (quadro, ação excessiva, referência conflitante ou corte); repetir só a semente sem hipótese é desperdício.

## 4. Critérios de revisão visual

| Revisão | Aprovar quando |
|---|---|
| Identidade | rostos reconhecíveis em todos os close-ups, sem troca entre pessoas |
| Acessórios | óculos, cabelo, véu, joias e roupa seguem a cena correta |
| Continuidade | cenário, posições, eixo e objetos mantidos entre cortes |
| Ação | cada tarefa acontece dentro do intervalo previsto, sem gesto omitido nem teletransporte |
| Física | mãos, chão, água, tecido, portas e objetos têm contato plausível |
| Cena real | o cenário real continua reconhecível (clima, landmarks, detalhes) e nada foi acrescentado |
| Final | sem pessoa inventada, sem texto legível sintetizado, sem exame ou documento legível |

## 5. Limite honesto

Este arquivo registra **raciocínio de produção**, não resultado medido. Preços, limites e nomes de endpoint citados em planos escritos mudam: use `higgsfield-api.md` e
`custos-e-orcamento.md` (medidos, com data) e confirme na conta antes de gerar.
