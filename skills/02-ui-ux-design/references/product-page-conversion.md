# Página de Produto e Tela de Compra — Hierarquia Que Vende

Carregar quando o pedido for página de produto (PDP), ficha de produto, tela de compra mobile,
"Adicionar ao carrinho", ou tela de escolher pack/créditos/plano que funciona como vitrine.

Fronteiras:
- paywall de assinatura in-app com checkout real → skill 63 (UI) e skill 73 (quando e como o
  paywall aparece). Daqui só se empresta a hierarquia visual
- página de preço pública de marketing → `references/marketing-surfaces.md`
- layout quebrado no mobile → skill 56; acabamento fino → skill 52

## Premissa

Página de produto não é cartaz. É um sistema (foto, nome, prova, preço, quantidade, CTA) que precisa
funcionar em 50 produtos, não num mockup. Hierarquia fraca é o motivo mais comum de "a tela parece
amadora". Toda correção vira regra; se a regra não escala para o catálogo inteiro, é ilustração.

## Hierarquia canônica mobile

1. Imagem com fundo limpo e recorte consistente em todo o catálogo
2. Título curto com nota e número de avaliações colados nele (confiança cedo)
3. Preço único, sem o rótulo "Preço"
4. Benefício ou variação essencial (peso, cor, plano)
5. Seletor de quantidade agrupado com o CTA
6. CTA fixo no rodapé com o total ("Adicionar · R$ 24,90")
7. Descrição, detalhes e extras abaixo da dobra de compra

## Os 15 erros clássicos

### Confiança visual (1–5)

| # | Erro | Correção | Regra de sistema |
|---|---|---|---|
| 1 | ícone sem container sobre fundo que muda | chip ou círculo com contraste fixo | todo ícone de UI tem container |
| 2 | foto ruim (ângulo sujo, fundo ocupado, corte irregular) | fundo limpo, mesmo crop, produto ocupa 70%+ do quadro | um estilo de foto pro catálogo |
| 3 | cada bloco numa margem | grid de 8pt, mesma margem lateral, um eixo de alinhamento | grid único |
| 4 | tudo saturado, tudo grita | uma cor de acento para CTA e preço, resto neutro | tokens: neutros + 1 acento |
| 5 | três famílias, oito tamanhos | uma família, quatro tamanhos (título, preço, corpo, legenda) | escala de tipo fixa |

### Leitura e prova (6–10)

| # | Erro | Correção |
|---|---|---|
| 6 | tags amontoadas | padding interno do chip maior que o texto |
| 7 | título com nome + peso + marca num H1 só | título = nome; variante é campo separado |
| 8 | parágrafo apertado | line-height 1.4–1.6; descrição abaixo da dobra de compra |
| 9 | avaliações longe do título | estrelas + N avaliações coladas no título, antes do preço |
| 10 | ícones de feature de estilos diferentes | um set, mesmo stroke, mesmo tamanho |

### Fricção de compra (11–15)

| # | Erro | Correção |
|---|---|---|
| 11 | divisores pesados | 1px de baixo contraste, ou só espaçamento |
| 12 | rótulo "Preço" redundante | o número fala; o prefixo R$ basta |
| 13 | quantidade no título ("Morangos 500g") | título limpo + seletor de variante abaixo do preço |
| 14 | quantidade longe do botão | quantidade e CTA no mesmo grupo; no mobile, os dois na barra inferior |
| 15 | "COMPRAR!!!" sem contexto | verbo + total, fixo no rodapé, não some no scroll |

## Depois dos 15

- card rolável com título fixo (o contexto não some)
- barra inferior persistente com quantidade, total e CTA
- presets de quantidade baseados em dado real ("mais comprado · 2 kg")
- imagem extra só depois do CTA, nunca oito fotos antes da prova
- estados do CTA: padrão, carregando, adicionado, erro. "Adicionado" é um pico (ver
  `references/session-psychology.md`)

## Analogia para SaaS (pack, créditos, plano como vitrine)

| PDP | Equivalente |
|---|---|
| imagem | preview do artefato |
| avaliações | prova social da mesma persona |
| quantidade | ciclo (mês/ano) ou seats |
| Adicionar ao carrinho | CTA com total |

Mesma lei: prova cedo, preço claro, CTA fixo, um destaque só.

## Entrega

- placar dos 15 erros (presente/ausente, com evidência)
- hierarquia proposta
- regras de sistema: grid, escala de tipo, tokens de cor, crop de imagem, posição de avaliações,
  composição da barra inferior
- copy do CTA e microcopy de quantidade
- três melhorias avançadas priorizadas
- antes/depois textual

## Não fazer

- tratar uma tela como peça de Dribbble sem sistema
- CTA agressivo sem prova acima dele
- avaliações no rodapé quando a decisão acontece no topo
- CTA fixo que cobre conteúdo, navegação ou safe area (ver skill 57)
- prometer lift

## Fonte

Adaptado da skill `product-page-conversion` de um pacote consolidado pelo usuário (set/2026), que
resume o redesign de uma PDP real do canal uxpeak ("This UI/UX Redesign Will Teach You More Than
100 Tutorials Combined"). Generalizado para qualquer produto físico ou pack digital.
