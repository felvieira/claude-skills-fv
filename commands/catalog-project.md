---
description: Sintetiza repo-audit + detective-spec em .project-memory/manifest.yaml versionado no repo consumidor
---

# catalog-project

Objetivo: criar ou atualizar `.project-memory/manifest.yaml` no repo consumidor com stack, capacidades e integrações rastreáveis a evidência.

Fluxo:
- rodar dentro do repo consumidor (raiz do produto, não do kit)
- se `docs/repo-audit/current.md` não existir ou estiver desatualizado → disparar `Repo Auditor` primeiro
- se `_detective_sdd/00-overview.md` não existir → disparar `Detective Spec` primeiro (ou usar o que já existir)
- sintetizar as duas saídas em `.project-memory/manifest.yaml` seguindo o schema:

```yaml
schemaVersion: 1

project:
  id: <slug-kebab-case do nome do repo>
  name: <Nome Legível>
  path: <caminho absoluto do repo>

status: production  # production | active | paused | archived — inferir do estado do repo (git log recente, presença de deploy config, etc) ou perguntar se ambíguo

stack:
  frontend: [...]
  backend: [...]
  database: [...]
  auth: [...]
  # outras categorias conforme detectado

capabilities:
  <nome-capacidade>: true|false
  # extraído de _detective_sdd/01-modules/ e 02-business-rules/ — o que o sistema realmente faz

integrations: [...]
  # serviços externos detectados (pagamento, email, storage, analytics, IA, etc)

sources:
  repoAudit: docs/repo-audit/current.md
  detectiveSpec: _detective_sdd/
  lastSyncedCommit: <hash do commit HEAD atual>
  lastSyncedAt: <timestamp ISO atual>
```
- regra crítica: nenhuma capacidade ou integração pode aparecer no manifesto sem estar rastreável a uma fonte em `sources` (repo-audit ou detective-spec) — nunca inferir/inventar sem evidência
- `.project-memory/manifest.yaml` fica versionado no git do repo consumidor — nunca fora dele, nunca centralizado em outro lugar
