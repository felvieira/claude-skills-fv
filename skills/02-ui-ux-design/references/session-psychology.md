# Psicologia da Sessão — Auditar Como a Tela É Sentida

Carregar quando o pedido for "o app parece frio", "a tela cansa", "onboarding que ninguém termina",
"tela de sucesso sem graça", ou quando uma auditoria (`references/audit-framework.md`) chegar a um
fluxo onde o problema não é bug nem layout, e sim a sensação.

As leis individuais estão na tabela "Leis Cognitivas" do `SKILL.md`. Este arquivo é a camada de
aplicação: quais cinco efeitos pesam na sensação de uma sessão, em qual tela cada um pesa mais, e o
protocolo pra auditar sem empilhar truque.

## Premissa

O usuário não lembra da sessão pela média. Lembra do pico, do fim e de quanto sentiu que avançou.
App "frio" costuma violar um desses efeitos, não faltar feature. Mas o efeito só vale se for
verdadeiro: progresso que não avança, espera que não trabalha e celebração de nada viram
desconfiança, que custa mais do que a frieza original.

## Os cinco efeitos

### 1. Gradiente de meta

Quanto mais perto do fim percebido, mais o usuário acelera.

Aplicar:
- onboarding com "Passo 3 de 5", nunca barra sem fim
- checklist de ativação de 3 a 5 itens, com o primeiro já marcado se o aha aconteceu
- meta semanal como "5 de 7 dias", com o bloco de hoje destacado
- upload e geração com percentual real, não loop

Não fazer:
- meta de 30 dias no dia 0 (congela em vez de puxar)
- progresso que reseta sem aviso
- etapa inventada só pra encher a barra

Copy de referência: "Falta 1 resposta para montar seu plano", "Você já fez a parte mais difícil".

### 2. Pico-fim (peak-end)

A memória da sessão é o melhor momento mais os últimos segundos.

Aplicar:
- tela de sucesso depois da ação central, celebrando o artefato ("Seu relatório de março está
  pronto", com ele na tela), não o clique ("Pronto!")
- fim do onboarding = reveal com um número do usuário, não "conta criada"
- depois do checkout = repetir o objetivo + uma ação de 30 segundos. Dashboard vazio é fim ruim
- erro com recuperação elegante no fim da tentativa, nunca stack trace

Não fazer:
- confete em toda micro-ação (dilui o pico)
- sessão que termina num paywall recusado sem saída útil. Oferecer uma ação do plano grátis

Checklist de fim de fluxo: o que a pessoa leva daqui (artefato, número, próximo passo)? A última
tela é o pico ou um deserto?

### 3. Ilusão de trabalho (honesta)

Esforço visível do sistema aumenta o valor percebido do resultado, até um limite.

Aplicar:
- "Analisando suas respostas" de 2 a 8 segundos antes de um reveal que de fato processa as respostas
- "Validando pagamento" enquanto a confirmação autoritativa não voltou (ver skill 63)
- etapas visíveis em geração de IA (lendo, escrevendo, revisando) quando essas etapas existem
- skeleton com verbo, não spinner mudo

Não fazer:
- espera sem texto (parece bug)
- mais de 15 segundos sem progresso real (abandono)
- inventar trabalho: "consultando 200 fontes" quando o modelo responde em 400ms, ou delay artificial
  em operação instantânea. Isso é dark pattern (tabela do `SKILL.md`), não psicologia aplicada

Faixa útil: 2 a 8 segundos, e só quando o resultado é um plano, score ou artefato que o usuário
reconhece como trabalho.

### 4. Von Restorff (isolamento)

O item que destoa é o que fica na memória.

Aplicar:
- um CTA primário por tela; o resto é secundário ou texto
- plano recomendado com container diferente, não três cards idênticos
- empty state com uma imagem e um botão, não grid de oito atalhos

Não fazer:
- cor de erro competindo com cor de CTA
- badge em doze itens (equivale a nenhum)

### 5. Sobrecarga de escolha

Mais opções aumentam arrependimento e diminuem decisão. É Hick-Hyman aplicado à escolha que tem
consequência (plano, variante, integração).

Aplicar:
- planos: 2 no mobile, 3 no web, com um pré-selecionado e o motivo explicado
- onboarding com 3 a 5 cards de intenção, não 12
- biblioteca com busca e 4 filtros, não 40 chips
- quantidade com presets ancorados em dado real ("mais comprado · 2 kg"), não stepper solto
- integrações no setup: 1 recomendada + "ver outras"

"Ver todos" é válido depois da escolha padrão, nunca no lugar dela.

## Mapa tela → efeitos que mais pesam

| Tela | Efeitos |
|---|---|
| Onboarding | gradiente de meta, sobrecarga de escolha, ilusão de trabalho no reveal |
| Home | Von Restorff (uma ação), gradiente de meta (meta do dia) |
| Tarefa central | ilusão de trabalho curta, pico no sucesso |
| Paywall | sobrecarga de escolha (2–3 planos), Von Restorff (plano âncora) |
| Checkout | ilusão de trabalho na validação, pico-fim no recibo |
| Empty state | Von Restorff (um CTA) |
| Cancelamento | sobrecarga de escolha (um motivo + uma alternativa) |

## Protocolo de auditoria de sessão

1. Escolher uma tela ou fluxo (onboarding, home, tarefa central, checkout, sucesso).
2. Para cada um dos cinco efeitos, marcar presente, fraco ou violado, com a evidência (print, texto,
   medição). Na classificação do `audit-framework.md`, isso é achado de **heurística** a menos que
   haja dado do produto.
3. Prescrever uma mudança por efeito violado, com placement e copy.
4. No máximo dois efeitos em destaque por tela. Empilhar os cinco na mesma tela vira ruído.
5. Entregar o antes/depois textual da tela.

Formato de saída:

| Efeito | Estado | Evidência | Mudança | Copy |
|---|---|---|---|---|

Mais o wireframe textual "depois" e a lista do que foi recusado (progresso falso, spinner longo,
badge em tudo).

## Limites

- Não substitui teste com usuário (skill 51). Os efeitos são lente de auditoria, não prova.
- Não usar para esconder preço, dificultar cancelamento ou pressionar decisão. Qualquer um desses
  cai na tabela de dark patterns do `SKILL.md`.
- Não prometer lift. Os números das fontes são de casos específicos.

## Fonte

Adaptado da skill `app-ux-psychology` de um pacote consolidado pelo usuário (set/2026), que por sua
vez resume o vídeo de Wyatt Feaster "The psychology trick that makes any app feel 10x better".
Nenhum número foi verificado de forma independente. Os limites de honestidade (ilusão de trabalho só
com trabalho real, progresso só com etapa real) vêm do registro de consolidação do mesmo pacote.
