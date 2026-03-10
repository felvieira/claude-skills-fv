# Cost Efficiency

## Principios

- usar contexto minimo suficiente
- reaproveitar auditoria de repo e inventario visual
- preferir RAG e contexto selecionado a stuffing massivo
- usar caching de prefixo quando houver prompts estaticos repetidos
- resumir historico longo antes de enviar tudo

## Recomendacoes

- texto: budgets por request, schema, fallback e cache semantico quando fizer sentido
- imagem: modelos baratos para rascunho, modelos caros so no acabamento final
- video: validar necessidade real antes de gerar, pois custo e latencia tendem a ser maiores

## TOON

`TOON` pode ser tratado como opcao experimental para payloads grandes quando o stack do app suportar bem o formato.

Nao substituir JSON como default universal sem benchmark local e fallback claro.
