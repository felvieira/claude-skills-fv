# Eval - Mobile Paywall & Checkout: decisão de billing e posicionamento do cupão

## Objetivo

Validar as duas decisões mais caras deste domínio: (1) a escolha de arquitetura de cobrança acontece **antes** do wireframe, não é reversível de graça depois do lançamento; (2) o campo de cupão nunca é aberto por padrão, e um desconto mostrado na UI nunca pode divergir do preço que o sistema de billing autorizado vai efetivamente cobrar.

## Entrada

- app que vende acesso premium a uma funcionalidade **digital** dentro do APK distribuído pela Play Store
- pedido do usuário: "cria a tela de assinatura, vamos cobrar com Stripe porque já usamos em outro produto"
- separadamente: uma campanha de marketing quer lançar um cupão `VERAO25` que dá 25% de desconto na mensalidade
- o sistema de billing efetivamente configurado é Google Play Billing (subscrição com base plans mensal/anual)

## Esperado

- a skill não aceita a premissa "vamos usar Stripe" sem checar elegibilidade — sinaliza que funcionalidade digital dentro de app distribuído pela Play Store cai, em geral, sob a obrigatoriedade do Google Play Billing, salvo programa/exceção aplicável ao mercado, e que essa decisão precisa ser confirmada com Product/Payments antes do wireframe
- a tela de assinatura resultante não mostra `[ Pagar com Stripe ]` como CTA principal para esse cenário — mostra `[ Assinar o Pro · X €/mês ]` seguido de `purchase sheet` do Google Play
- o cupão `VERAO25` só entra na UI se houver correspondência real e verificável entre o código e uma oferta que o Google Play Billing efetivamente consegue cobrar — a skill não implementa um campo de desconto genérico de 25% que o `purchase sheet` do Play não reconhece
- se a correspondência real não existir tecnicamente (o Play não suporta esse tipo de desconto percentual arbitrário via promo code), a skill sinaliza essa limitação em vez de desenhar uma UI que promete algo que a transação não vai cumprir
- o campo de cupão, quando implementado, é apresentado **collapsed** por padrão (`"🏷 Tem um cupão?"`), posicionado após o resumo de preço e antes do total — nunca antes da escolha do plano, nunca como input sempre aberto

## Evidências Mínimas

- a resposta cita explicitamente a matriz de decisão de billing (Play Billing vs. PSP) antes de propor qualquer wireframe
- o wireframe final usa CTA e fluxo compatíveis com Google Play Billing (`purchase sheet`), não Stripe direto, para o cenário descrito
- o tratamento do cupão `VERAO25` distingue explicitamente "oferta Play" / "promo code Play" / "cupão de comerciante" (as três categorias diferentes) e aplica a que corresponde à realidade técnica do sistema de billing configurado
- nenhuma tela mostra um total com desconto aplicado que diverge do que o `purchase sheet` real vai cobrar

## Reprova Se

- aceita "vamos usar Stripe" sem checar a matriz de decisão de billing para funcionalidade digital dentro de app Play
- desenha CTA de `[ Pagar com Stripe ]` como default para esse cenário
- implementa o cupão `VERAO25` de 25% sem verificar se existe correspondência real no sistema de billing configurado
- mostra `"✓ 25% aplicado"` na UI para um desconto que o `purchase sheet` do Google Play não vai efetivamente cobrar
- desenha o campo de cupão como input sempre visível/aberto por padrão
- posiciona o campo de cupão antes da escolha do plano
- trata "código promocional do Google Play" e "cupão de comerciante" como a mesma coisa
