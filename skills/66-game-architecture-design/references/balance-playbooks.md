# Playbooks de Balanceamento por Dominio

Procedimento por domínio. Ler apenas o playbook relevante à task.

## Combate e Progressao

Cobre inimigo, XP, nível, recompensa, curva de progressão PvE.

1. Construir a curva de poder do jogador (dano, vida, mitigação) e a curva de dificuldade do inimigo
   no mesmo eixo de tempo/nível — comparar diretamente, não em tabelas separadas.
2. Calcular tempo-até-kill e tempo-até-morte em cada ponto da curva; identificar onde um dos dois cai
   fora da faixa alvo.
3. Separar fonte de poder (equipamento, nível, skill) e verificar se alguma domina as outras a ponto
   de tornar as demais decorativas.
4. Simular a curva completa (não só pontos isolados) pra achar vales e picos de dificuldade não
   intencionais.

## Economia

Cobre moeda, fonte/sink, preço, troca, inflação, economia de longa duração.

Entradas necessárias: todo recurso e sua unidade; fontes, sinks, conversões, transferências, limites,
decaimento e resets; regras de aquisição e gasto com taxas e pré-requisitos; estoque inicial e o
horizonte pretendido (dia/sessão/temporada); tabela de preço e o que cada bem compra; segmentos de
jogador relevantes (novo, ativo, otimizador, pagante) quando aplicável.

Quando a economia recebe conteúdo ou tuning contínuo, construir um simulador persistente que avança
o sistema pelo passo de tempo relevante e rastreia estoque, fluxo líquido, capacidade de compra, e
pressão de limite a cada passo. Para uma checagem pontual de taxa ou proposta, um script temporário
basta.

Procedimento:
1. Montar tabela de fonte/sink e projeção de estoque por segmento relevante, mesmo horizonte pra
   receita e gasto.
2. Calcular acessibilidade em tempo/tentativas/custo de oportunidade, não só preço nominal.
3. Marcar todo loop onde possuir um recurso aumenta a renda futura (bola de neve) — projetar
   separado de fluxo linear.
4. Achar o primeiro ponto de excedente, pobreza, limite, ou trava de progressão; rastrear se vem de
   fonte, sink, preço, cronograma de conteúdo, ou conversão cruzada.
5. Pra economia aberta (com mercado entre jogadores), testar mercado fino/líquido, transferência de
   jogador rico pra novo, especulação, conluio, duplicação, e loop multi-conta.
6. Comparar correções mudando a menor taxa/preço/limite/sink responsável; varrer faixas plausíveis.
7. Identificar quem ganha e quem perde com a mudança — médias escondem segmento com fluxo muito
   diferente.

## PvP e Metagame

Cobre matchup competitivo, efeito bola de neve, rating, saúde do metagame.

1. Classificar cada relação de matchup como transitiva, intransitiva, ou situacional antes de montar
   qualquer tabela de força — misturar os três numa curva de poder única é o erro mais comum aqui.
2. Medir efeito bola de neve: quanto uma vantagem inicial (primeira morte, primeiro objetivo) infla a
   probabilidade de vitória final. Bola de neve excessiva mata comeback, insuficiente torna decisão
   de meio de jogo irrelevante.
3. Olhar taxa de vitória por matchup, não só taxa de vitória geral — uma opção com 50% geral pode
   contar 90% contra um matchup e 10% contra outro.
4. Verificar concentração de metagame (poucas opções dominando pick rate) separado de força bruta —
   opção fraca mas nunca punida também é sintoma de metagame raso.

## Recompensa Aleatoria

Cobre loot, carta, dado, streak, sistema de pity, proteção contra duplicata.

Tratar sempre em três camadas: probabilidade matemática e distribuição real do resultado; utilidade
pro jogador (limiar de uso, perda ao não atingir o limiar, valor decrescente de duplicata); e
probabilidade percebida (o que a apresentação — barra de progresso, contador visível, streak de
"quase" — faz o jogador acreditar, mesmo quando diverge do número real).

Sistema de pity (garantia após N tentativas sem sucesso) muda a distribuição real — sempre simular a
distribuição completa com pity incluído, não só a taxa base anunciada. Proteção contra duplicata
(conversão de item repetido em moeda/material) muda a utilidade esperada de cada pull e precisa entrar
no cálculo de valor esperado, não ser tratada como detalhe de UX separado.
