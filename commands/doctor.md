---
description: "Valida o catálogo de plugins, roteamento e arquivos operacionais do kit"
argument-hint: "[--json]"
allowed-tools: Bash(node scripts/devkit-doctor.mjs *)
---

# DevKit Doctor

Rode o diagnóstico read-only do kit antes de publicar mudanças de skills, catálogo ou hooks:

```bash
node scripts/devkit-doctor.mjs $ARGUMENTS
```

O comando valida manifests, referências de skills e os casos determinísticos de roteamento. Não instala dependências, não modifica arquivos e não executa conectores externos.
