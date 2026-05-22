---
scenario: 32-smart-suggestions
pass: treatment
model: claude-sonnet-4-6
tokens_in_approx: 220
tokens_out_approx: 520
time_seconds: 14
quality_score: 4.0
quality_breakdown:
  specificity: 4
  completeness: 4
  correctness: 5
  actionability: 4
  discipline: 5
pass_fail: pass
delta_vs_baseline: +1.5
notes: "structured prioritization by risk/impact; explicit skill mapping; discipline to not over-suggest; surfaces blocker (audit) before coverage and issues; no scope creep"
---

# Smart Suggestions — Próxima ação de maior valor

**Contexto analisado:**
- Feature de auth mergeada (área de alta superfície de ataque)
- Security audit não rodou
- Coverage caiu 78% → 71% (-7pp)
- 3 issues abertas (tipo/severidade desconhecidos)
- Sem deploy hoje (janela disponível para dívida técnica)

---

## Sugestões Priorizadas

### 1. Rodar Security Audit na feature de auth — AGORA (bloqueador de risco)
**Por quê:** Auth mergeado sem audit é o cenário de maior risco. Sem deploy hoje, esta é a janela certa. Qualquer vulnerabilidade descoberta depois do deploy custa 10x mais.
**Skill:** `/security-review` (skill 06)
**Ação concreta:** `semgrep --config auto` focado nos arquivos alterados pelo PR de auth + revisão manual de token handling, session management, permissões.

### 2. Investigar queda de coverage (78% → 71%) no código de auth
**Por quê:** -7pp de coverage logo após um merge de auth sugere paths críticos sem teste. Se os 3 issues abertos incluem edge cases de auth, a cobertura baixa pode ser sintoma, não causa isolada.
**Skill:** `/test` (skill 05 — QA Testing)
**Ação concreta:** `vitest --coverage` → identificar quais arquivos de auth perderam cobertura → escrever testes para os paths descobertos.

### 3. Triagem das 3 issues abertas (priorizar por relação com auth)
**Por quê:** Issues abertas podem incluir bugs na feature que acabou de mergear. Sem triagem, não dá para saber se alguma é bloqueadora de release ou agrava a superfície de auth.
**Skill:** nenhuma — revisão manual de 5 min no issue tracker.
**Ação concreta:** Abrir as 3 issues → checar se alguma tem label `auth`, `security`, `bug` → escalar ou fechar o loop antes de seguir.

---

## O que NÃO fazer agora

- Não iniciar novas features enquanto o audit não rodar — risco ativo.
- Não fechar coverage com testes superficiais só para subir o número — foco nos paths de auth.

---

## Fonte das sugestões

| Sinal detectado | Peso na priorização |
|---|---|
| Auth feature sem audit | Risco crítico → prioridade 1 |
| Coverage -7pp pós-merge de auth | Risco moderado-alto → prioridade 2 |
| 3 issues abertas (tipo desconhecido) | Incerteza → triagem rápida |
| Sem deploy hoje | Janela disponível para dívida técnica |

**Próximo comando sugerido:** `/security-review` nos arquivos alterados pelo PR de auth.
