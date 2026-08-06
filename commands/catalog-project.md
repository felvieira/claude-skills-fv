---
description: Sintetiza repo-audit + detective-spec + narrativa de produto em .project-memory/manifest.yaml versionado no repo consumidor
---

# catalog-project

Objetivo: criar ou atualizar `.project-memory/manifest.yaml` no repo consumidor com stack, capacidades, integrações e narrativa de produto rastreáveis a evidência.

Fluxo:
- rodar dentro do repo consumidor (raiz do produto, não do kit)
- se `docs/repo-audit/current.md` não existir ou estiver desatualizado → disparar `Repo Auditor` primeiro
- se `_detective_sdd/00-overview.md` não existir → disparar `Detective Spec` primeiro (ou usar o que já existir)
- procurar conteúdo de produto no repo consumidor: `README.md`, `docs/pricing*`, `docs/landing*`, páginas de marketing/landing dentro de `app/`/`src/` (ex. seção hero, FAQ, tabela de planos), `CHANGELOG.md` para funcionalidades recentes — usar o que existir, nunca inventar
- sintetizar tudo em `.project-memory/manifest.yaml` seguindo o schema:

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

integrations:
  - name: <nome do serviço externo>
    category: <pagamento|ia|storage|email|...>
    mode: <opcional>
    internalDependency: <opcional — id de OUTRO projeto catalogado em project-brain.config.json, só se essa integração for na verdade uma chamada de infra pra outro produto seu, ex. "SMTP via creator-api" onde "creator-api" também está catalogado>
    # outras categorias conforme detectado

product:
  # OPCIONAL — só preencher se houver fonte real (README/landing/pricing/changelog) no repo consumidor.
  # Nunca inventar copy de marketing que não exista no repo — se não houver fonte, omitir a seção inteira.
  summary: <1-2 frases do que o produto é e faz, extraído do README/hero da landing>
  valueProposition: <a frase de proposta de valor, se existir explicitamente em algum lugar>
  features: [...]           # lista de funcionalidades em linguagem de usuário (não técnica) — do README/landing
  values: [...]              # princípios/valores declarados do produto, se existirem (ex. "privacy-first", "self-host friendly")
  plans:                     # só se houver pricing real no repo
    - name: <nome do plano>
      price: <opcional>
      features: [...]
  faq:                        # só se houver FAQ real no repo
    - question: <pergunta>
      answer: <resposta>

sources:
  repoAudit: docs/repo-audit/current.md
  detectiveSpec: _detective_sdd/
  productContent: <caminho do README/landing/pricing usado para a seção product, se ela foi preenchida>
  lastSyncedCommit: <hash do commit HEAD atual>
  lastSyncedAt: <timestamp ISO atual>
```
- regra crítica: nenhuma capacidade, integração ou campo de `product` pode aparecer no manifesto sem estar rastreável a uma fonte em `sources` — nunca inferir/inventar sem evidência. Se o repo não tem README/landing/pricing/FAQ, a seção `product` correspondente fica de fora (nunca gerar copy de marketing genérica pra preencher o vazio)
- `internalDependency` só é preenchido quando a integração detectada corresponde ao `id` de outro projeto que já está listado em `project-brain.config.json` (não adivinhar — checar esse arquivo se ele existir no ambiente)
- `.project-memory/manifest.yaml` fica versionado no git do repo consumidor — nunca fora dele, nunca centralizado em outro lugar
