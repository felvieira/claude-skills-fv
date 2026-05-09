# Context Engineering — Guia Detalhado

Guia complementar a `policies/context-engineering.md`. Exemplos, estratégias e patterns.

## Exemplos por Nível

### Nível 1 — Rules Files (máxima autoridade)
- GLOBAL.md diz "re-read após 10 mensagens" → essa regra prevalece sobre qualquer conversa
- `policies/search-first.md` exige pesquisa → mesmo que o usuário diga "já sei", pesquisar

### Nível 2 — Specs
- Design spec define "usar Zustand para estado" → seguir mesmo se existir Redux no projeto
- Plan diz "implementar em 3 steps" → seguir ordem do plan

### Nível 3 — Source Code
- Código usa NextAuth → adaptar ao que existe, não migrar sem spec
- Pattern no repo usa barrel exports → seguir o pattern

### Nível 4 — Errors / Logs
- Stack trace mostra `TypeError` na linha 42 → evidência concreta, mas investigar causa raiz
- CI failure em test → confiável para indicar problema, mas ler o teste antes de fixar

### Nível 5 — Conversation
- Usuário disse "acho que é React 18" → verificar package.json antes de assumir
- Conversa de 15 mensagens atrás mencionou path → re-read para confirmar

## Inline Planning Pattern

Antes de executar task multi-step, emitir plano inline:

```
## Plano (3 steps)
1. Pesquisar patterns existentes em `src/hooks/`
2. Implementar `useNewHook` seguindo o pattern
3. Adicionar testes em `tests/hooks/`

Executando step 1...
```

Benefícios:
- Usuário pode corrigir antes da execução
- Agente se compromete com escopo explícito
- Context decay é mitigado pelo plano escrito

## Context Packing Strategies

### Brain Dump
Carregar tudo o possível: repo-audit, working set, current-focus, policies relevantes.

**Quando usar:** tasks exploratórias, primeiro contato com repo, investigação de bug complexo.

### Selective Include
Carregar apenas o necessário: arquivos-alvo, testes relacionados, policy específica.

**Quando usar:** tasks focadas (fix de bug, implementação de feature com spec clara).

### Hierarchical Summary
Resumir por nível: "Rules dizem X, spec pede Y, código atual faz Z."

**Quando usar:** sessões longas, context decay detectado, handoff entre sessões.

## Sinais de Context Decay

| Sinal | Ação |
|---|---|
| 10+ mensagens desde último file read | Re-read antes de editar |
| Agente repete informação já dita | Provavelmente perdeu contexto — resumir e re-read |
| Edição contradiz pattern do próprio arquivo | Context decay certo — re-read obrigatório |
| Menção a "acho que era assim" | Verificar, não confiar em memória |
| Compact automático ocorreu | Tratar toda conversa anterior como nível "Verify" |

## Integração com Policies Existentes

- **search-first** → Resultado de pesquisa no codebase é Trusted (nível 3)
- **iterative-retrieval** → Cada round eleva confiança: round 1 = Verify, round 3 = quase Trusted
- **cost-optimization** → Selective Include economiza tokens sem perder trust
- **source-driven** → Exige fonte Trusted (docs oficiais, changelog) para decisões de framework
- **confusion-management** → Confusão é sinal de que o agente está operando com contexto insuficiente

## Protocol Shells and Programs

Context engineering in this kit now includes two new formal layers:

### Protocol Shells (`templates/protocol-shell.md`)

Typed I/O contracts added to subagents. Format:
- `intent:` — one sentence describing purpose
- `input:` — YAML fields with types (`path`, `string`, `list<string>`, `enum(a|b|c)`, `integer`, `boolean`)
- `process:` — Pareto-lang operation sequence (`/operation.name{param='value'}`)
- `output:` — typed output fields, always includes `confidence: high|medium|low`
- `meta:` — version, skill_ref, allowed_tools

See `policies/protocol-shells.md` for when to add a shell.
See `docs/skill-guides/protocol-shells.md` for worked examples.

### Programs (`programs/`)

Declarative definitions of multi-step pipelines:
- `programs/pipeline-discovery.md` — discovery → PRD → issues → TDD loop → ship
- `programs/detective-spec.md` — legacy reverse-engineering pipeline
- `programs/loop-polishing.md` — auto-loop with quality scoring

The orchestrator (skill 09) uses `programs/` as the canonical source for pipeline composition.

### Relation to Kimai's taxonomy

| Kimai concept | Kit equivalent |
|---|---|
| Cognitive tool | Individual skill or subagent |
| Cognitive program | `programs/*.md` |
| Cognitive schema | `schemas/skill-io/*.json` |
| Protocol shell | `templates/protocol-shell.md` format applied per subagent |
| Neural field | Emergent behavior from orchestrated programs via `/pipeline-discovery` or `/loop` |
