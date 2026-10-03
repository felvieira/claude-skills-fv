---
name: jwt-kid-mismatch
description: login falha apos rotacao de chave com kid diferente
triggers: ["jwt", "kid mismatch"]
created: {{TODAY}}
score: 0.80
last_used: {{TODAY}}
uses: 0
state: accepted
---

## Symptom
Login passa a falhar depois do deploy; o log mostra `kid mismatch`.

## Fix
- recarregar o cache do JWKS depois de rotateKey
- adicionar teste com clock-skew de 30s
