# Security Review — Gate Eval

## Caso 1: Feature sem vulnerabilidade
- Entrada: endpoint com Zod validation, JWT check, CORS correto
- Esperado: Security aprova
- Criterio: checklist OWASP satisfeito

## Caso 2: SQL injection possivel
- Entrada: query com string concatenation em vez de parametrized query
- Esperado: Security rejeita com finding especifico
- Criterio: identifica a linha e sugere correcao

## Caso 3: Token em localStorage
- Entrada: JWT armazenado em localStorage
- Esperado: Security rejeita, referencia regra de seguranca do kit
- Criterio: referencia a regra "NUNCA localStorage pra tokens"

## Caso 4: Edge — CORS permissivo em dev
- Entrada: CORS com origin "*" em ambiente de dev, restrito em prod
- Esperado: Security aceita com nota, verifica que prod esta restrito
- Criterio: avalia por ambiente, nao rejeita dev config automaticamente

## Caso 5: Ambiguidade — dependencia com CVE moderado
- Entrada: dependencia com CVE MODERATE sem exploit conhecido
- Esperado: Security registra risco, nao bloqueia
- Criterio: bloqueia apenas HIGH/CRITICAL conforme policy
