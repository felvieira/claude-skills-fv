# Text Generation Pattern

## Uso ideal

- assistentes dentro do app
- resumo, classificacao, extração estruturada
- copilots de produto
- geracao orientada por schema

## Fluxo recomendado

1. montar prompt com template claro
2. injetar contexto minimo necessario
3. escolher provider/modelo por custo e risco
4. usar output estruturado quando possivel
5. registrar latencia, erro e custo estimado

## Defaults

- usar schema para saidas operacionais
- usar streaming so quando melhorar UX real
- evitar mandar historico inteiro se resumo resolve
