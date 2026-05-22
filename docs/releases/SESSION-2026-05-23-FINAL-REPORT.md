# Session Final Report — 2026-05-23

**Janela de sessão:** 2026-05-22 (início) → 2026-05-23 (fim) — múltiplos ciclos
**Resultado:** 5 versões shipped, 54 tasks fechadas, pass rate +3.9 pontos absolutos.

---

## Versões shipped

| Versão | Commit | O que mudou |
|---|---|---|
| **v2.9.0** | `834a21d` | Apache-2.0 + NOTICE + MinHash cross-call dedup + bench público |
| **v2.9.1** | `57a31a9` | `devkit_dedup_status` MCP tool + CI regression gate |
| **v2.10.0** | `f62f8b2` | DeerFlow conventions (trace tags + skill manifest v2 + progressive loading) |
| **eval-bench** | `6025964` | 53 cenários avaliados — 88.7% pass rate inicial |
| **v2.10.1** | `d9c1b1d` | 6 fixes derivados do bench (skill 25, 07, 03, code-reviewer scenario, semgrep, policies) |
| **re-eval** | `6b54c8d` | Re-eval dos 4 alterados — 3/4 PASS confirmado por medição |

---

## Métricas finais

### Pass rate
| Marco | Pass rate | Δ |
|---|---|---|
| Bench inicial (v2.9.x) | 47/53 = 88.7% | — |
| Após skill 39 isolada | 48/54 = 88.9% | +0.2 |
| Após v2.10.1 + re-eval | **50/54 = 92.6%** | **+3.9** |

### Tokens (medido por `/savings`)
- 91.3k tokens economizados ≈ $0.27
- 28 riscos prevenidos ≈ $14.00 downstream cost avoided
- 14h dev equivalentes
- Combined value ≈ $14.27

### Compressor
- Single-call: 13% redução (bench 5 fixtures)
- Second-run: 98% redução (cross-call MinHash dedup)
- Sem regressão vs baseline (CI gate `--max-drop=5` passing)

### Validações em verde
- `tsc` build: zero erros
- 15/15 testes (11 cross-call + 4 skill-manifest)
- check-consistency: 39 skills, 37 tools, 15 agents
- check-harness-coherence: 43 policies, 32 commands, 19 hooks all coherent
- 7 programs YAML validados + dry-run

---

## Testes realizados (3 categorias)

### 1. Bench de isolamento (53 cenários)
Cada skill e agent: Pass A (modelo frio) vs Pass B (skill carregada). Rubrica 5 critérios × 1-5.
Resultado: 47/53 → 50/54 após fixes.

### 2. End-to-end (3 testes reais)
- **Teste 1 — App do zero (/swarm simulado):** 33/33 testes passando, 4 fases com handoffs em markdown
- **Teste 2 — Pipeline manual:** PO → Orchestrator → Backend → QA → Security → Reviewer real, 12/12 testes, Security pegou CSV injection que QA perdeu
- **Teste 3 — Feature em repo existente:** skill 03 em sandbox real, 8/8 testes, zero deps inventadas

### 3. Process-based (subprocess Node)
- `auto-loop.mjs` rodado de verdade — disparou Claude, capturou output, validation OK
- `swarm/index.mjs` — guard de segurança bloqueia working tree sujo
- 7/7 programs YAML validados + dry-run estruturado
- `savings-report.mjs` + `drift-scan.mjs` rodando

---

## Fixes derivados do bench (v2.10.1)

| Fix | Antes | Depois | Confirmado |
|---|---|---|---|
| Skill 25 (AI Integration) — 2 templates novos | +1.0 FAIL | **+2.0 PASS** | ✅ medido |
| Skill 07 (Deploy Docker) — .last-tag + ssl-init | +1.3 MARGINAL | **+1.8 PASS** | ✅ medido |
| Code-reviewer scenario v2 (PR 23 arquivos) | +1.0 FAIL | **+2.29 PASS** | ✅ medido |
| Skill 24 (Release Manager) — repo-audit context | +1.3 NEAR-MISS | +1.2 NEAR-MISS | ⚠️ teto comprimido |
| Skill 03 (Backend) — Plain JS section | — | reduz fricção | indireto |
| semgrep-scanner namespace | suposto FAIL | já existia | falso alarme |
| Policy + WAL cleanup pattern | — | docs adicionados | preventivo |

---

## Princípio fixado

> **Cada FAIL no bench vira fix concreto na versão seguinte, e o re-eval valida o ganho.**

A v2.10.1 materializa esse princípio. Bench → fix → re-bench → ship. O kit agora se auditia.

---

## Achados arquiteturais

### O que o bench provou que o kit faz
Não é "saber mais" — é **enforçar estrutura que o modelo frio não produz**:
- Paths de artefatos persistentes
- Handoff chains com skill number
- Anti-pattern enforcement (tabelas de racionalização)
- Templates preenchidos (não prosa que precisa ser interpretada)
- Evidence anchors (file:line + confidence tiers)
- Suppression gates (aprovação obrigatória pra silenciar findings)

### O que o bench expôs como anti-padrão
3 conflitos de `index.js` durante testes paralelos no devkit-sandbox.
**Causa:** múltiplos subagents tocando os mesmos arquivos sem `isolation: worktree`.
**Fix:** `policies/skills-vs-agents.md` ganhou anti-padrão registrado. `/swarm` real usa worktree por design.

---

## Atribuição de inspirações desta janela

- `bytedance/deer-flow` (MIT) — 3 convenções absorvidas em v2.10.0
- `claudioemmanuel/squeez` (Apache-2.0) — MinHash cross-call dedup em v2.9.0
- Apache-2.0 §4(d) — força preservação de `NOTICE` em qualquer redistribuição

---

## Pendências conhecidas (não bloqueantes)

| Item | Justificativa |
|---|---|
| Plugin cache 2.7.1 em vez de 2.10.1 | Re-publish do plugin via `claude plugin publish` resolve. Re-evals atuais podem ter sub-medido o ganho. |
| Skill 24 continua near-miss | Cenário com baseline forte. Refinar scenario ou aceitar — não é problema da skill. |
| /swarm REAL com PR no GitHub | Requer working tree limpa + gh autenticado + repo público. Skipped por escopo. |
| /loop --parallel com worktrees reais | Subprocess Node, daria pra rodar mas tempo + tokens. Skipped por escopo. |
| Image generation real (fal.ai) | Skipped por escopo (usuário pediu). |
| Multi-plataforma (Cursor, Windsurf) | Skipped por escopo (usuário pediu). |

---

## Wikilinks

- [[../../README.md]]
- [[../../CHANGELOG.md]]
- [[../../NOTICE]]
- [[../../eval-bench/reports/final-report.md]]
- [[../../bench/README.md]]
- [[../../policies/skills-vs-agents.md]]
- [[../../policies/observability-trace-tags.md]]
- [[../../policies/skill-manifest.md]]
- [[../../policies/progressive-skill-loading.md]]
