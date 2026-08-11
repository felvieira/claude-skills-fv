# Forms and Transactions — Formulário, Checkout, Erro

Carregar quando o escopo envolver captura de dado do usuário, pagamento, ou qualquer sequência onde um erro no meio do caminho custa uma tarefa inteira reiniciada.

## Formulário — Boas Práticas Que Evitam Retrabalho de Review

- **Pedir só o necessário para a etapa atual** — campo "porque pode ser útil depois" é fricção paga agora por benefício incerto depois
- **Uma coluna na maioria dos casos** — múltiplas colunas quebram a ordem de leitura natural e confundem em mobile
- **Label sempre visível, nunca só placeholder** — placeholder some ao digitar; se for a única fonte do que o campo pede, o usuário esquece no meio do preenchimento
- **Validar no momento certo** — no blur do campo, não a cada tecla (irrita) e não só no submit final (tarde demais pra ser útil)
- **Preservar dado após erro** — nunca limpar o formulário porque um campo falhou; reperguntar o que o usuário já respondeu é o erro mais caro deste checklist
- **Foco vai para o primeiro erro relevante** após submit falho, com mensagem que diz como corrigir, não só que está errado ("CPF inválido" é fraco; "CPF precisa ter 11 dígitos" é acionável)
- **Agrupar campo relacionado** (endereço junto, pagamento junto) — Gestalt de proximidade aplicado a formulário
- **Revelar campo condicional só quando aplicável** — divulgação progressiva (ver SKILL.md principal), não uma tela com 30 campos dos quais 25 não se aplicam a esse usuário

## Checkout — O Que Mostrar Antes da Decisão Final

Preço, frete, imposto, prazo, forma de pagamento, política de cancelamento e resumo do pedido — **todos antes** do usuário se comprometer, nunca revelados depois que ele já "decidiu" comprar. Custo revelado tarde é dark pattern de custo oculto, independente da intenção.

Não obrigar cadastro completo antes de o usuário ver o custo final — guest checkout, ou ao menos mostrar o total antes de pedir senha.

## Estados de Erro em Transação — Recuperável vs. Definitivo

| Tipo | Comportamento esperado |
| --- | --- |
| **Erro recuperável** (cartão recusado, campo inválido) | dado preservado, ação clara pra corrigir, tentativa nova sem recomeçar do zero |
| **Erro definitivo** (produto esgotou durante o checkout) | comunicar o que aconteceu e a alternativa (lista de espera, produto similar) — nunca só "erro, tente novamente" pra algo que não vai mudar tentando de novo |
| **Timeout de sessão em transação longa** | preservar o progresso quando possível; se não for possível, avisar antes que aconteça, não deixar o usuário descobrir na hora de finalizar |

## Antipadrões Específicos de Formulário e Checkout

- **Confirmação redundante de dado facilmente recuperável** — pedir "confirme seu email" digitando duas vezes quando copiar/colar já falha nisso; usar validação de formato em vez de duplicar o campo
- **Opção pré-selecionada que adiciona custo** (seguro, garantia estendida marcados por padrão) — dark pattern de pré-seleção enganosa
- **Captcha ou verificação sem necessidade proporcional ao risco** — fricção que penaliza todo usuário legítimo pra pegar uma fração de abuso
- **Botão de finalizar desabilitado sem explicar por quê** — usuário não sabe qual campo falta, tenta clicar repetidamente

## Verificação Ao Fechar

- todo campo obrigatório tem razão de ser obrigatório declarável
- erro de validação preserva os outros campos preenchidos
- checkout mostra custo total antes do compromisso final
- nenhum campo pede confirmação dupla de dado que validação de formato já resolve
