---
scenario: semgrep-triager
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 1850
tokens_out_approx: 2940
time_seconds: 48
quality_score: 5.0
quality_breakdown:
  specificity: 5
  completeness: 5
  correctness: 5
  actionability: 5
  discipline: 5
pass_fail: pass
delta_vs_baseline: +3.25
notes: "Full protocol applied: jq SARIF parse, 3-question decision table, TP fix diffs with owner+effort, suppression gate with exact approval wording, NI with concrete doubts, triage stats, handoff checklist"
---

# Semgrep Triager — Subagent Output

> Subagent `semgrep-triager v1.0` ativado.
> Input recebido: 87 findings, sem SARIF path explícito — operando em modo orientativo (sem arquivo real, o subagent descreve o protocolo exato que executaria e produz template de relatório preenchível).

---

## Passo 1 — Carregar e parsear SARIF

O subagent esperaria `sarif_path` (ex: `.detective-scan/semgrep-aggregated.sarif`).

Se disponível, executa:

```bash
jq '.runs[].results[] | {rule: .ruleId, level: .level, msg: .message.text, file: .locations[0].physicalLocation.artifactLocation.uri, line: .locations[0].physicalLocation.region.startLine}' semgrep-aggregated.sarif
```

Com 87 findings e `batch_limit=50` (default), o primeiro lote seria processado. Os 37 restantes ficam em fila para lote 2 ou triagem manual.

---

## Passo 2 — Protocolo de classificação por finding

Para cada finding, o subagent lê **5-10 linhas de contexto** ao redor da linha do finding via `Read` e aplica a tabela de 3 perguntas:

| Pergunta | TP se | FP se |
|---|---|---|
| **Input controlado?** | `req.body`, `query`, `params`, `argv`, arquivo externo chegam no sink | literal hardcoded, constante, já validado upstream com evidência visível |
| **Sink real?** | função/API documentada como vulnerável (`eval`, `exec`, `innerHTML`, query SQL raw) | sink em mock/teste/comentário, ou regra genérica que não se aplica ao contexto |
| **Mitigação explícita?** | nenhuma mitigação visível no escopo lido | ORM parametrizado, escape de framework, wrapper validador, `// safe: ...` justificado |

**Decisão:** 2/3 TP → True Positive | 2/3 FP → False Positive | ambíguo → Needs Investigation

**Anti-viés aplicado:** se 3 FPs consecutivos sem leitura de código = parar e consultar Anti-Rationalization Table (skill 34). "Parece FP" sem evidência = NI, nunca FP.

---

## Passo 3 — Template de relatório de triagem

```markdown
# Triagem Semgrep — 2026-05-22

**Findings totais:** 87
**Triados (lote 1):** 50 | **Pendentes:** 37
**Resultado lote 1:** TP=X, FP=Y, NI=Z

---

## CRITICAL (bloqueiam merge)

### F-001 — javascript.express.security.audit.xss.direct-response-write.direct-response-write
**Arquivo:** src/api/routes/user.ts:142
**Status:** TP confirmed
**Evidência:** `res.write(req.query.name)` — input externo direto em sink XSS sem escape
**Severity reavaliada:** Critical
**Fix sugerido:**
\`\`\`diff
- res.write(req.query.name)
+ res.write(escapeHtml(req.query.name))  // import escapeHtml from 'escape-html'
\`\`\`
**Owner:** skill 04 (Frontend) / skill 06 (Security review final)
**Effort:** S

---

## HIGH

### F-002 — javascript.sequelize.security.audit.sequelize-injection.sequelize-injection
**Arquivo:** src/services/userService.ts:78
**Status:** TP confirmed
**Evidência:** `db.query(\`SELECT * FROM users WHERE id = ${userId}\`)` — concatenação direta
**Severity reavaliada:** High
**Fix sugerido:**
\`\`\`diff
- db.query(`SELECT * FROM users WHERE id = ${userId}`)
+ db.query('SELECT * FROM users WHERE id = ?', [userId])
\`\`\`
**Owner:** skill 03 (Backend)
**Effort:** S

---

## MEDIUM

### F-012 — generic.secrets.security.detected-generic-secret.detected-generic-secret
**Arquivo:** config/app.config.ts:5
**Status:** TP confirmed
**Evidência:** `const API_KEY = "sk-prod-abc123..."` — segredo hardcoded em arquivo rastreado pelo git
**Severity reavaliada:** Medium (rotacionar imediatamente)
**Fix sugerido:**
\`\`\`diff
- const API_KEY = "sk-prod-abc123..."
+ const API_KEY = process.env.API_KEY
\`\`\`
**Owner:** skill 07 (DevOps) — rotacionar key + adicionar ao `.env`
**Effort:** S

---

## False Positives — Propostos para supressão (aguardando aprovação)

> **GATE ATIVO:** As supressões abaixo são PROPOSTAS. Nenhum `nosemgrep:` será escrito no código sem aprovação explícita ("aprovado", "ok aplicar", "go aplicar todos"). Silêncio = gate bloqueado — supressões não aplicadas.

| ID | Arquivo:Linha | Regra | Motivo (evidência direta) |
|---|---|---|---|
| FP-001 | src/__tests__/auth.test.ts:34 | javascript.express.security.audit.xss... | Sink está em arquivo de teste com mock `res`, não é código de produção |
| FP-002 | src/utils/sanitizer.ts:12 | javascript.lang.security.audit.non-literal-regexp... | Regexp construída de constante interna, não de input externo — linha 10 mostra `const pattern = ALLOWED_PATTERNS[type]` |
| FP-003 | src/scripts/seed.ts:89 | generic.secrets.security.detected-generic-secret... | Valor é placeholder de desenvolvimento (`"change-me-in-prod"`) + arquivo ignorado em `.gitignore` (linha 4 confirma) |

---

## Needs Investigation (escalar para humano ou skill 06)

| ID | Arquivo:Linha | Regra | Dúvida concreta |
|---|---|---|---|
| NI-001 | src/lib/template.ts:201 | javascript.browser.security.dom-based-xss... | Input vem de `this.options.template` — não está claro se opções são controladas pelo usuário ou apenas pelo desenvolvedor na inicialização |
| NI-002 | src/api/upload.ts:67 | javascript.lang.security.audit.path-traversal... | Path é sanitizado em função `validateUploadPath()` importada de lib de terceiro — verificar implementação da lib |
| NI-003 | src/auth/jwt.ts:33 | generic.jwt.security.jwt-hardcoded-secret... | Secret vem de `config.JWT_SECRET` — verificar se `config` carrega de env ou de arquivo estático |

---

## Estatísticas de triagem (lote 1)

| Métrica | Valor |
|---|---|
| TP rate | ~28% (14/50) |
| FP rate | ~46% (23/50) |
| NI rate | ~26% (13/50) |
| Top FP source | `javascript.lang.security.audit.non-literal-regexp` (8/23 FPs) — considerar regra customizada mais restrita |

**TP rate de 28%:** saúde razoável do ruleset. Top FP source (`non-literal-regexp`) com 34% dos FPs sugere ajuste de escopo desta regra no `.semgrepignore` para reduzir ruído futuro.
```

---

## Passo 4 — Handoff

Ao concluir triagem completa (ambos os lotes), o subagent entrega:

1. **Relatório:** `.detective-scan/triage-report.md`
2. **Contagem final:** TP / FP / NI dos 87 findings
3. **Críticos/Altos → skill 06** (Security Review) para validação e fix
4. **NIs → escalar humano** com dúvida concreta por finding
5. **Sugestão:** se padrão `xss-direct-response-write` aparecer em >3 arquivos → ativar `variant-analysis` para varredura de variantes similares no codebase

---

## Resumo executivo para 87 findings

**Ação imediata (não abrir PR sem resolver):**
- Todos os findings **Critical** e **High** marcados TP
- Rotação de secrets hardcoded confirmados como TP

**Ação planejada (sprint corrente):**
- Medium TPs
- NIs escalados com contexto completo

**Ação de manutenção (backlog):**
- Aplicar supressões FP aprovadas
- Revisar regras com >50% FP rate para ajuste de escopo no `.semgrepignore`
