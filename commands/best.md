---
description: Auditoria de boas práticas, arquitetura, clean code e DRY (skills 11 + 06 + 05)
---

# /best — Auditoria de Boas Práticas

**Objetivo:** Verificar se o sistema segue boas práticas de arquitetura, clean code, DRY, SOLID e segurança.

**Skills ativadas:**
- 11 — Reviewer (qualidade, DRY, SOLID, clean code)
- 06 — Security Reviewer (segurança, headers, OWASP)
- 05 — QA Engineer (cobertura de testes, gaps)

**Eixos de avaliação:**
1. **Arquitetura** — separação de responsabilidades, escalabilidade, patterns consistentes
2. **Clean Code** — nomes descritivos, funções focadas, sem magic numbers, imports organizados
3. **DRY** — zero duplicação, abstrações reutilizáveis, schemas compartilhados
4. **SOLID** — cada módulo com responsabilidade única, extensível, interfaces enxutas
5. **Segurança** — OWASP Top 10, headers, auth, secrets, dependências

**Input esperado:** Escopo (arquivo, módulo, feature ou repo inteiro).

**Output esperado:** Relatório com findings priorizados (🔴 Critical / 🟡 Important / 🔵 Suggestion) e ações recomendadas.

**Policies relevantes:**
- `policies/quality-gates.md`
- `policies/anti-rationalization.md`
- `policies/search-first.md`

**Uso:** `/best [escopo — arquivo, módulo ou "repo inteiro"]`
