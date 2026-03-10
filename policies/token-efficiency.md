# Token Efficiency Policy

## Objetivo
Reduzir custo de contexto e resposta sem perder qualidade nem precisao.

## Regras
- Nao repetir o pedido do usuario
- Nao reexplicar contexto ja confirmado
- Responder em camadas: conclusao, detalhes minimos, proximo passo
- Preferir bullets curtos a texto corrido longo
- Evitar listas extensas por padrao
- Evitar exemplos grandes quando um snippet curto resolve
- Ler poucos arquivos primeiro
- Expandir leitura apenas sob incerteza real
- Nao abrir varias frentes sem necessidade
- Nao duplicar regras ja definidas em `GLOBAL.md` ou `policies/`

## Compressao de Contexto
Ao resumir estado, priorizar:
1. objetivo atual
2. decisao tomada
3. blockers
4. risco
5. proximo passo

## Verbosidade
- Padrao: baixa
- Subir detalhe apenas para:
  - arquitetura
  - seguranca
  - debugging complexo
  - trade-offs importantes

## Anti-patterns
- checklist gigante sem necessidade
- narrativa longa de coisas obvias
- repetir justificativa varias vezes
- listar todas as opcoes quando ha um default forte
- explicar comandos ou conceitos que o usuario claramente ja domina
