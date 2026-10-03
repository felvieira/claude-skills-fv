---
name: tailwind-purge
description: classe do Tailwind some so em producao
triggers: ["classe sumiu", "tailwind"]
created: {{TODAY}}
score: 0.80
last_used: {{TODAY}}
uses: 0
state: accepted
---

## Fix
- classes montadas por string (`bg-${cor}-500`) nao sobrevivem ao purge: declare a lista em safelist no tailwind.config
