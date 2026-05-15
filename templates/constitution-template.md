---
version: 0.1.0
last_updated: YYYY-MM-DD
owners:
  - "@team-or-person"
---

# {PROJECT_NAME} Constitution

**Status:** draft | active | deprecated
**Scope:** {monorepo / single repo / org-wide}

## Preamble

Princípios não-negociáveis deste projeto. Para mudar um princípio: commit dedicado `chore(constitution): ...` com aprovação dos owners. Não diluir silenciosamente em PR de feature.

---

## 1. Code Quality

### 1.1 Naming & Formatting
- Linter: {eslint / ruff / clippy / ...}
- Formatter: {prettier / black / rustfmt / ...} — pre-commit obrigatório
- Naming: {kebab-case files, camelCase vars, PascalCase types, ...}

### 1.2 Complexity Limits
- Ciclomática máxima por função: **N**
- Linhas por arquivo (soft / hard): **N / M**
- Profundidade de aninhamento: **N**

### 1.3 Linguagens
- **Permitidas:** {TypeScript, Python, Go, ...}
- **Banidas:** {motivo}

### 1.4 DRY Threshold
- Duplicação tolerada até **N ocorrências** antes de refatorar

**Owner:** {role}

---

## 2. Testing Standards

### 2.1 TDD
- **Obrigatório / Opcional / Por módulo crítico**
- Justificativa: ...

### 2.2 Coverage Mínimo
- Lines: **N%**
- Branches: **N%**
- Functions: **N%**
- Módulos críticos: **N%** (auth, payments, etc.)

### 2.3 Tipos de Teste
- Unit: obrigatório por módulo
- Integration: obrigatório por boundary
- E2E: obrigatório por user journey crítico
- Contract: obrigatório por API pública

### 2.4 Flaky Tests
- **Tolerância:** zero. Test flaky vira P1 imediato.
- Retry automático: **proibido / permitido até N vezes em CI**

**Owner:** {role}

---

## 3. User Experience Consistency

### 3.1 Design System
- Tokens: {fonte canônica}
- Componentes obrigatórios: {biblioteca}
- Custom one-off: **permitido / proibido sem ADR**

### 3.2 Acessibilidade
- WCAG: **AA mínimo** (ou A / AAA — justificar)
- Auditoria: {axe-core no CI / Lighthouse / manual por release}

### 3.3 i18n
- Locales suportados: {pt-BR, en, ...}
- Strings hardcoded em UI: **proibido**

### 3.4 Performance Percebida
- LCP: < **N ms** (p75)
- INP: < **N ms** (p75)
- CLS: < **N**

**Owner:** {role}

---

## 4. Performance Requirements

### 4.1 Latência (server)
- API crítica p50: < **N ms**
- API crítica p95: < **N ms**
- API crítica p99: < **N ms**

### 4.2 Throughput
- Picos esperados: **N rps**
- Degradação aceita: **% acima de N rps**

### 4.3 Recursos
- Memória por instância: < **N MB**
- CPU por instância: < **N%** baseline

### 4.4 Custo IA / Infra
- Budget mensal inferência: **$N**
- Budget mensal infra: **$N**
- Alarme em: **X% do budget**

**Owner:** {role}

---

## 5. Security & Compliance

### 5.1 Gates Obrigatórios em CI
- SAST: {Semgrep / CodeQL / Snyk Code}
- Dependency scan: {Snyk / Dependabot / Renovate}
- Secrets scan: {gitleaks / trufflehog}
- Auth review humano para mudanças em `auth/`

### 5.2 Compliance
- Frameworks: {SOC2 / GDPR / HIPAA / PCI / nenhum — justificar}
- Auditoria: {trimestral / anual / sob demanda}

### 5.3 Dados Sensíveis
- Classificação: {Public / Internal / Confidential / Restricted}
- Criptografia em repouso: **AES-256 mínimo**
- Criptografia em trânsito: **TLS 1.3 mínimo**
- Retenção: por classe — {N dias / N anos / forever}

### 5.4 Threat Model
- Documentado em: `docs/threat-model.md`
- Atualização: {por release major / trimestral}

**Owner:** {role}

---

## Histórico de Mudanças

| Versão | Data | Mudança | Autor |
|---|---|---|---|
| 0.1.0 | YYYY-MM-DD | Inicial | @owner |

---

## Como ler esta constituição

- **Skills consultam** este arquivo antes de tomar decisões (plan/build/review/ship)
- **Conflito spec ↔ constituição:** constituição vence; spec adapta
- **Conflito spec ↔ ADR:** ADR vence; spec adapta
- **Conflito ADR ↔ constituição:** ADR adapta; senão atualizar constituição em commit dedicado
