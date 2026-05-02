---
description: Engenharia reversa de specs em legado — extrai contratos sem tocar no código (skill 33 — Detective Spec)
---

# /detective-spec — Engenharia Reversa de Specs

**Objetivo:** Extrair specs executáveis (contratos de módulo, regras de negócio, fluxos, ADRs retroativos) a partir de código legado, sem modificar uma linha.

**Skill ativada:** 33 — Detective Spec

**Subagents dispatcháveis:** `detective-contracts`, `detective-business-rules`, `detective-flows`, `detective-adrs`

**Input esperado:** Repositório legado. Opcional: escopo (`--module=path`, `--feature=name`), fase única (`--phase=N`), ou `--resume` para retomar checkpoint.

**Output esperado:**
- `_detective_sdd/00-overview.md` — mapa do sistema
- `_detective_sdd/01-modules/<name>.md` — contratos de módulo
- `_detective_sdd/02-business-rules/<domain>.md` — regras extraídas
- `_detective_sdd/03-flows/<flow>.md` — fluxos end-to-end
- `_detective_sdd/04-adrs/ADR-NNN.md` — decisões arquiteturais retroativas
- `_detective_sdd/99-traceability.md` — spec ↔ evidência + items para validação humana
- `.detective/state.json` — checkpoint resume-friendly

**Garantias:**
- Zero writes fora de `.detective/` e `_detective_sdd/` (enforced por `policies/detective-write-guardrails.md`)
- Cada spec rastreável até `file:line` ou `commit-sha`
- Confidence scoring (high/medium/low) em todas as inferências

**Policies relevantes:**
- `policies/detective-write-guardrails.md` — hard guardrail de imutabilidade do legado
- `policies/source-driven.md` — toda afirmação ancorada em evidência
- `policies/persistence.md` — checkpoint para resume

**Pipeline (5 fases):**
1. Reconhecimento (orchestrator) → mapa estrutural via Graphify + repo-audit
2. Módulos → `detective-contracts`
3. Regras de Negócio → `detective-business-rules`
4. Fluxos end-to-end → `detective-flows`
5. ADRs retroativos + síntese → `detective-adrs`

**Uso:** `/detective-spec [escopo] [--phase=N] [--resume]`

**Quando usar:** legado sem doc, vibe coded, antes de evoluir feature em módulo desconhecido, migração, onboarding de time novo.

**Quando não usar:** projeto novo (use `/spec`), bug fix localizado (use `/build`), só mapa estrutural (use `/audit-repo`).
