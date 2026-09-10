# Schema obrigatório do relatório

Gerar nesta ordem. Omitir seção só se o produto não tiver o canal (ex. sem app nativo = sem pre-permission). Nunca omitir classificação A/B, telas, gatilhos, paywall, eventos, 4 semanas.

Título: `Auditoria de conversão — {Nome do produto}`
Subtítulo: `Playbook {A|B|Híbrido} · {modelo recomendado} · {data}`

## 1. Veredito em uma página

- Frase-prova do aha
- Playbook escolhido e por quê (3 bullets)
- Modelo comercial recomendado + 1 frase de R/1K (qual alavanca move mais receita)
- 5 mudanças desta semana (priorizadas por vazamento, não por gosto)
- Riscos se copiar o playbook errado

## 2. Foto do sistema atual

Tabela: etapa | o que existe hoje | evidência (URL/print/HIPOTESE) | gravidade (P0/P1/P2)

Etapas mínimas: aquisição, cadastro, onboarding, aha, oferta sessão 1, produto free/trial, paywalls in-app, checkout, e-mail, cancelamento.

## 3. Classificação A / B

Tabela comparativa preenchida para ESTE produto. Se híbrido, listar o que vem de A e o que vem de B.

## 4. Evento de ativação

- Candidato principal + 1 reserva
- Por que prediz retenção (dado ou HIPOTESE)
- TTV esperado
- Como instrumentar (nome do evento + propriedades)

## 5. Telas a criar ou reescrever

Uma subseção por tela, no playbook escolhido.

Para cada tela:

- Nome e número
- Objetivo
- Headline + sub + CTA primário + CTA de saída
- Conteúdo (campos, cards, sample data)
- Critério de saída
- Evento analytics
- Status — criar / reescrever / manter

No Playbook A cobrir os 8 passos. No B cobrir cadastro + 5 telas + checklist in-app.

## 6. Paywall e /precos

- Headline personalizado com o intent deste produto
- Timeline honesta com datas exemplo (Hoje / aviso / cobrança)
- Planos (2 no modal, 3 na página) com quem é o plano alvo
- Downsell no X
- FAQ das 4 perguntas
- O que NÃO entra neste paywall

## 7. Matriz de gatilhos in-app

Tabela: # | gatilho (evento) | peça UI | copy de uma linha | frequência | prioridade P0/P1/P2

Os 8 disparos canônicos, adaptados aos nomes reais de feature/cota deste produto. Inventar nomes concretos (“exportar PDF”, “5º projeto”), não “feature premium”.

## 8. Lifecycle

- Sequência de e-mail com branch (ativar vs já ativou)
- Aftercare (tela pós-checkout)
- Renew-off
- Cancel-save (4 motivos específicos deste produto)
- Dunning se houver cartão

## 9. Eventos e dashboard

Lista dos eventos com nome snake_case pronto para engenharia. 8–12 KPIs com alvo numérico.

## 10. Backlog de 4 semanas

Tabela semana | entregas | dono sugerido (produto/design/eng/growth) | critério de pronto.

Semana 1 sempre começa por ativação + sample data + cadastro curto + chip de plano. Não começar por “redesenhar a marca”.

## 11. Copy pronta

Adaptar `assets/copy-bank.md` com o vocabulário do produto. Mínimo: welcome, ponte/reveal, paywall, feature gate, limite, e-mail D0, e-mail fim de trial, aftercare.

## 12. Fora de escopo desta rodada

3–5 coisas conscientes que NÃO faremos agora (chat, web billing, metered, etc.) para o time não diluir.

## Formato de Entrega

Entregar como markdown por padrão. Se o usuário pedir PDF ou página visual, usar a ferramenta de
artifact disponível no ambiente — capa com título e subtítulo, tabelas com header destacado, boxes
de contraste para veredito e itens P0, sem página só com um bullet.
