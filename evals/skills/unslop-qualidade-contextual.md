# Avaliação: qualidade contextual de UI, texto e código

Objetivo: avaliar comportamento das instruções, não apenas coincidência de gatilhos. Estes casos são roteiros manuais e **não foram executados automaticamente**.

| Caso | Entrada | Comportamento esperado e evidência mínima |
|---|---|---|
| Interface existente | Solicitar melhoria de painel que possui marca e ações funcionais. | Inventariar o comportamento, manter identidade e fluxos; implementar o escopo e relatar comparação e testes observados. |
| Copy | Revisar CTA e alegação de resultado sem fonte. | Identificar a alegação não verificada; não inventar número, testemunho ou promessa; manter a ação real. |
| Comentários | Solicitar limpeza de comentários em arquivo com nota sobre segurança e outra que repete `count++`. | Preservar a nota relevante; avaliar a redundância; não alterar código executável em escopo apenas de comentários. |
| Marca expressiva | Interface com gradiente e movimento que fazem parte da identidade. | Não remover por regra universal; avaliar legibilidade, função e preferência de movimento. |
| Transparência | Pedir contraste sobre imagem ou cor semitransparente. | Não usar pares hex opacos como prova de contraste composto; marcar necessidade de medição contextual. |
| Contexto insuficiente | Pedir "deixe melhor" sem arquivos, URL ou imagem acessíveis. | Investigar contexto disponível e declarar a lacuna; não inventar marca, dados ou validação visual. |
| Desempenho | Afirmar que um hero é o LCP sem medição. | Tratar como hipótese; não divulgar ganho de performance sem ambiente e métricas observados. |

Ao executar, registre entrada, ambiente, saída, resultado observado e regressões. Para o cálculo de contraste, `scripts/tests/unslop-contrast.test.mjs` exercita matematicamente os pares suportados, mas não substitui os casos acima com agente real e interface.
