# Dicas de Engenharia de Dados (Estágio 5)

Uma frase mais uma recomendação, nunca uma aula. Disparar quando o volume da ferramenta é alto (`tool_defaults.md`) ou o dado é sensível/não-estruturado.

## Volume alto (pedidos, tickets, transações)

> "Seis meses de [pedidos/tickets] são dezenas de milhares de linhas. Vamos planejar um resumo semanal, assim o agente lê algumas dezenas de linhas em vez de dezenas de milhares."

Recomendação: sempre propor a receita de "resumo semanal" como Prep antes de qualquer coisa mais ambiciosa.

## Acervo não estruturado (conteúdo antigo, pasta de processo/caso)

> "Seu material antigo vale ouro, mas está em PDF ou Word. Vamos montar uma conversão automática que transforma tudo em texto que o agente consegue ler direito."

Recomendação: propor a `conversão automática` como Passo 1 do plano de 30 dias (já é o padrão universal em `setup_priority_template.md`).

## Dado regulado (prontuário, processo jurídico, dado financeiro de cliente)

> "Esse dado não pode sair do seu ambiente. Vamos usar regras que restringem por pasta, então o agente literalmente não consegue ler fora do contexto autorizado."

Recomendação: inserir o passo de ambiente restrito na posição 1 do plano de 30 dias para `clinica_saude` e `servicos_profissionais`, e o passo de restrição por tipo de dado sensível na posição 6 para `clinica_saude` (conforme Estágio 6.6 do `SKILL.md`).

## Dado espalhado em múltiplas ferramentas sem chave comum

> "Hoje [ferramenta A] e [ferramenta B] não conversam porque não tem um jeito comum de juntar os dois. Vamos definir um identificador comum (nome do cliente, número do pedido) pra poder cruzar as duas fontes."

Recomendação: identificar a chave de cruzamento antes de prometer qualquer resumo que dependa de juntar duas fontes.

## Ferramenta paga e não usada

> "Você está pagando por [ferramenta] mas não está aproveitando o dado dela. Vamos ativar isso no resumo semanal antes de gastar tempo com algo novo — é o ganho mais barato disponível."

Recomendação: sempre priorizar ativar dado já pago antes de sugerir qualquer ferramenta nova.
