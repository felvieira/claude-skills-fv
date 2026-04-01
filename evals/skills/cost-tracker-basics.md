# Eval - Cost Tracker Basics

## Objetivo
Validar que o Cost Tracker gera relatorio de custo correto ao final de uma sessao com multiplas skills.

## Entrada
- sessao simulada com: Repo Auditor (15k tokens), Backend (40k tokens), QA (8k tokens)
- 2 chamadas ao fal.ai
- modelo: claude-sonnet-4-6

## Esperado
- tabela de custo por skill com tokens in/out e custo estimado
- linha de APIs externas com fal.ai e custo por imagem
- total consolidado da sessao
- alertas se alguma metrica estiver alta

## Evidencias Minimas
- relatorio gerado em markdown
- custo total calculado (pode ser estimativa)
- pelo menos 3 skills listadas individualmente

## Casos Limite
- sessao sem dados de token disponivel: usar estimativa por duracao e complexidade
- custo acima de limiar configurado: emitir alerta explicito no relatorio
