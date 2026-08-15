# UX do Cupão — Posição, Estados e Comparação de Alternativas

## Comparação das 4 alternativas de posicionamento

| Alternativa | Descoberta | Fricção | Risco comportamental | Recomendação |
| --- | --- | --- | --- | --- |
| Campo aberto (`[____][Aplicar]` sempre visível) | Máxima | Baixa para quem tem código | Alto risco de "coupon hunting" — campo vazio chama atenção pra existência de desconto | Evitar como default |
| Link recolhido inline (`"Tem um cupão?"`) | Boa | Um tap extra | Mantém a ação disponível sem dominar a tela | **Recomendado** |
| Modal/dialog | Média | Tap + mudança de contexto | Interrompe o fluxo, oculta o resumo temporariamente | Só em casos especiais |
| Auto-aplicação + link de fallback | Excelente | Mínima | Muito baixo | Ideal quando tecnicamente possível |

A recomendação de esconder o campo atrás de um link tem suporte direto na pesquisa de checkout da Baymard: campos de cupão visíveis levam usuários sem código a abandonar temporariamente o checkout pra procurar um; auto-aplicar desconto elegível é preferível sempre que possível.

Para o modal especificamente, não há evidência pública quantitativa de uplift — é inferência de UX a validar com A/B, não resultado experimental comprovado. Dialogs do Material são reservados para prompts que exigem decisão importante; transformar uma ação opcional e secundária como cupão numa interrupção modal sem necessidade real não é o uso pretendido do componente.

## Posição concreta recomendada

Primeira escolha:

```
Resumo
Plano Pro                   12,99 €
Tem um cupão?
Total                       12,99 €
[ Continuar com Pro · 12,99 € ]
```

Segunda alternativa, se o checkout tiver formulário grande (ex: coleta de morada/dados fiscais):

```
Método de pagamento
[ ... ]
Tem um cupão?
Resumo
Plano Pro                   12,99 €
Total                       12,99 €
[ Pagar 12,99 € ]
```

O mais importante: o cupão fica próximo do contexto de preço, mas **subordinado** ao total e ao CTA — nunca antes da escolha do plano:

```
❌ NÃO:
Escolha um plano
CUPÃO: [____________]    ← aqui, antes de escolher o quê
Essencial
Pro
Max
```

Isso introduz "caça a desconto" antes do usuário sequer decidir o que quer comprar.

## Quando abrir automaticamente

Exceções razoáveis a "sempre collapsed por padrão":

```
deep link: app://pricing?coupon=VERAO25
  → pode chegar direto a "✓ Campanha VERÃO25 aplicada" sem entrada manual

campanha de parceiros → código conhecido → auto-apply
```

Auto-aplicar descontos elegíveis sempre que possível remove trabalho do usuário — é a recomendação mais forte da Baymard sobre esse padrão.

## Especificação do campo

```
CouponInput
label: Código do cupão
placeholder: opcional
singleLine: true
keyboard: text (não numérico — códigos podem ter letras)
IME action: Done
trim whitespace: true
capitalization: conforme regra do backend
apply button: presente
loading: inline
error: inline
success: no resumo
```

Não alterar silenciosamente o que o usuário digitou, a menos que os códigos sejam documentadamente case-insensitive.

## Estados do fluxo do cupão

```
Estado normal
Tem um cupão?
      │ tap
      ▼
Estado expandido
Código do cupão
[______________] [Aplicar]
```

```
válido    ──────► aplicado
inválido  ──────► erro inline
expirado  ──────► erro específico
não elegível ───► explicar a condição
rede/servidor ──► "Não foi possível validar"
```

Nunca usar um genérico `"Cupão inválido"` para todos os casos — cada categoria tem mensagem própria (ver microcopy abaixo).

## Estado a validar

```
Código do cupão
┌───────────────────────────────────┐
│ VERÃO25                    ◌      │
└───────────────────────────────────┘
A validar código…
Total                       12,99 €
[ Continuar com Pro · 12,99 € ]
```

Política de produto recomendada: manter o CTA desativado enquanto a validação estiver em andamento e não concluída — impede o usuário de achar que o desconto pendente já foi aplicado.

## Estado aplicado

```
Resumo
Pro                         12,99 €
Cupão VERÃO25                −3,25 €
                         [ Remover ]
──────────────────────────────────
Total                        9,74 €
✓ Cupão aplicado
  Poupa 3,25 €
[ Continuar com Pro · 9,74 € ]
```

O desconto se mostra como uma transformação compreensível — `preço original − desconto = total` — não como `"25% OFF!!!"` sozinho.

**Se o desconto for só inicial (não recorrente)**, o resumo precisa mudar de formato para deixar isso explícito:

```
Hoje                              9,74 €
Depois                           12,99 €/mês
Renovação mensal até cancelamento.
```

Nunca deixar `9,74€` parecer o preço recorrente quando não é — transparência sobre preço introdutório, preço posterior e renovação é exigência explícita das políticas de subscrição Google Play.

## Estado de erro

```
Código do cupão
┌───────────────────────────────────┐
│ VERA025                           │
└───────────────────────────────────┘
⚠ Não reconhecemos este código.
  Confirme se está escrito corretamente.
[ Tentar novamente ]
```

Mensagens por categoria específica:

```
Este cupão expirou.
Este cupão não se aplica ao plano Pro.
Este cupão é válido apenas para o plano anual.
Este cupão já foi utilizado.
Não foi possível validar o cupão. Verifique a ligação e tente novamente.
```

Mensagem junto do campo, específica e acionável — coerente com as guidelines de erro de formulário da Nielsen Norman Group. Nunca validar de forma prematura, antes de o usuário ter chance de completar a digitação.
