---
name: redis-sessions
description: sessao em Redis foi tentada e revertida
triggers: ["usar redis"]
created: {{TODAY}}
score: 0.50
last_used: {{TODAY}}
uses: 0
state: rejected
reason: latencia de rede dobrou o p95 no teste de carga
---

## Contexto
Tentamos mover a sessao para Redis e revertemos.
