---
description: Review final + security audit (skills 11 + 06 — Reviewer + Security)
---

# /review — Review Final

**Objetivo:** Validação completa antes de deploy — qualidade de código, segurança, documentação e pipeline.

**Skills ativadas:**
- 11 — Reviewer (gate final de qualidade)
- 06 — Security Reviewer (OWASP, headers, auth, DRY)

**Input esperado:** Código implementado e testado, evidências de QA.

**Output esperado:** Relatório de aprovação ou rejeição com findings priorizados e skills responsáveis.

**Policies relevantes:**
- `policies/quality-gates.md` — critérios de aprovação
- `policies/handoffs.md` — formato de entrega entre skills

**Uso:** `/review [escopo do review ou referência ao PR/branch]`
