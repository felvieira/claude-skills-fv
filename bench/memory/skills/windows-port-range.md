---
name: windows-port-range
description: porta publicada pelo Docker some no Windows
triggers: ["porta 49374", "hyper-v"]
created: {{TODAY}}
score: 0.80
last_used: {{TODAY}}
uses: 0
state: accepted
---

## Fix
- no Windows a faixa dinamica 49152+ e reservada pelo Hyper-V/WSL2; use uma porta abaixo de 49152
- confirme com `netsh interface ipv4 show excludedportrange protocol=tcp`
