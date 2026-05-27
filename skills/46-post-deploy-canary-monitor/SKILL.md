---
name: post-deploy-canary-monitor
description: |
  Vigia producao apos deploy fechar, comparando metricas e screenshots contra baseline pre-deploy.
  Detecta regressao silenciosa (console errors, perf drop, broken pages) nas primeiras horas/dias.
  Diferente de skill 43 (canary-deployment) que faz promocao gradual durante o deploy: esta skill
  comeca QUANDO o deploy ja fechou 100% e fica vigiando ate confirmar que esta saudavel ou
  escalar pra rollback.
  Trigger em: "monitor producao", "monitora producao", "monitora se", "watch deploy",
  "watch production", "post-deploy check", "pos-deploy", "depois do deploy", "depois do rollout",
  "vigiar producao", "regressao silenciosa", "deploy passou mas", "verificar producao",
  "deploy stuck", "production health check", "screenshot diff", "lcp regrediu", "baseline comparativo".
argument-hint: "[--url=https://prod.exemplo] [--baseline=path] [--interval=15m] [--duration=24h]"
allowed-tools: Read, Write, Bash, Glob
---

# Post-Deploy Canary Monitor — Vigia Producao Sem Dormir

> **Inspiracao:** [gstack/canary](https://github.com/garrytan/gstack/tree/main/canary) (MIT, Garry Tan).
> Adaptado: foca em **pos-deploy** (depois do 100% rollout), enquanto skill 43 cobre **durante** o rollout gradual.

## Diferenca vs skill 43 (canary-deployment)

|                  | Skill 43 canary-deployment | Skill 45 post-deploy-canary-monitor (esta) |
|------------------|----------------------------|--------------------------------------------|
| Momento          | DURANTE o rollout (0% → 100%) | DEPOIS do rollout completar (100% live) |
| Decisao          | Promover ou abortar **deploy** | Manter producao ou **rollback** |
| Mecanismo        | Traffic split, feature flag, blue-green | Polling de metricas + screenshot diff |
| Termina quando   | 100% completo OU abortou | Janela de observacao expirou OK |
| Escalacao        | (proprio rollback do canary) | **Chama skill 43 (rollback) ou skill 24 (release-manager)** |

## Quando Usar

- deploy acabou de fechar 100% — primeiras 2-24h de vigilancia
- mudanca grande (migration, refactor, framework upgrade) que pode regredir silencioso
- sem observability robusta no projeto (esta skill cobre o basico)
- producao critica onde "deploy passou no canary 5%" nao garante "100% e saudavel"

## Quando NAO Usar

- voce ja tem Datadog/Sentry/NewRelic com alertas — use o sistema existente
- deploy trivial (config change, doc) sem risco
- ainda esta no rollout — use skill 43

## Governanca Global

Segue `GLOBAL.md`, `policies/verification-before-completion.md` (a verificacao **continua**
apos deploy fechar), `policies/handoffs.md` (escalacao pra skill 43), `policies/observability-trace-tags.md`.

### Gate contra constituicao

Quando `memory/constitution.md` define SLOs no eixo Performance/Reliability:
- baseline pre-deploy precisa estar capturado **antes** desta skill comecar
- threshold de abort = SLO violado + N% margem
- error budget restante deve cobrir esta janela de observacao

## Inputs

```yaml
url: https://prod.exemplo.com
baseline:
  metrics: ./baseline/metrics-pre-deploy.json
  screenshots: ./baseline/screenshots/
thresholds:
  console_errors_per_min: 0          # zero tolerancia
  lcp_regression_pct: 20              # >20% pior que baseline = abort
  cls_regression_pct: 25
  screenshot_diff_pct: 5              # >5% de pixels diferentes em paginas-chave
  status_5xx_pct: 1                   # >1% de respostas 5xx
window:
  interval: 15m
  duration: 24h
  abort_after_consecutive_failures: 2
escalation:
  on_abort: skill-43-rollback         # ou comando manual
  notify: <slack-channel | email>
```

## Protocolo

### 1. Captura baseline (pre-deploy)

Se nao houver baseline ainda, capturar **antes** do deploy:

```bash
# Metricas
curl -s "$URL/metrics" > baseline/metrics-pre-deploy.json

# Screenshots de paginas-chave (Playwright via anthropic-skills:webapp-testing)
# - homepage
# - 2-3 paginas mais traficadas
# - 1 fluxo critico (checkout, login, search)
```

### 2. Loop de vigilancia (pos-deploy)

A cada `interval` (default 15min), por ate `duration` (default 24h):

1. **Coletar metricas atuais** — mesmo endpoint do baseline
2. **Tirar screenshots atuais** — mesmas paginas
3. **Comparar** contra baseline:
   - delta de console errors (qualquer >0 = alerta imediato)
   - delta de LCP/CLS (>threshold = alerta)
   - diff de screenshot (>threshold pixels = alerta)
   - taxa de 5xx (>threshold = alerta)
4. **Registrar** em `docs/canary-runs/YYYY-MM-DD-<release>/timeline.jsonl`:

```jsonl
{"t":"15:00","status":"ok","lcp_delta":-2,"errors":0,"screenshot_diff":0.4}
{"t":"15:15","status":"ok","lcp_delta":+5,"errors":0,"screenshot_diff":0.6}
{"t":"15:30","status":"alert","lcp_delta":+22,"errors":3,"screenshot_diff":7.2,"reason":"lcp_regression+errors"}
```

5. **Decidir:**
   - tudo verde → continuar ate fim da janela → mark `healthy`
   - 1 alerta → log e continuar (false-positive comum)
   - 2 alertas consecutivos → **escalar abort**

### 3. Escalacao em abort

Ao detectar 2 falhas consecutivas:

1. Registrar evento detalhado em `docs/canary-runs/.../abort.md`
2. Notificar canal configurado (slack/email)
3. Sugerir:
   - **opcao A:** `/run-program rollback` ou skill 43 reverse
   - **opcao B:** investigar (skill 06 + skill 34) — se nao for security/perf, hotfix
   - **opcao C:** user override (false positive confirmado)

NAO faz rollback automatico **por default**. Producao = decisao humana, salvo override explicito no input.

### 4. Saida saudavel

Ao final da janela sem aborts:

1. Mark release `healthy` em `docs/canary-runs/.../verdict.md`
2. Atualizar `docs/releases/<versao>.md` com link pro report
3. Sugerir promover baseline atual como novo baseline canonico

## Output canonico

```
docs/canary-runs/2026-05-27-v2.19.0/
├── input.yaml           # config usada
├── baseline/
│   ├── metrics.json
│   └── screenshots/
├── timeline.jsonl       # 1 linha por check
├── abort.md (se houve)  # detalhes do incidente
└── verdict.md           # healthy | rolled-back | aborted
```

## Handoffs

- **escalacao:** skill 43 (canary-deployment reverso) ou skill 24 (release-manager)
- **investigacao pos-abort:** skill 06 (security) + skill 34 (static-analysis) + skill debugger
- **registro pos-saudavel:** skill 24 (release-manager) atualiza changelog com badge "verified"

## Dependencias

- `anthropic-skills:webapp-testing` (Playwright) — captura screenshots
- skill 20 (observability-sre) — define o que metrificar
- skill 43 (canary-deployment) — escalacao de rollback
- skill 30 (cost-tracker) — esta skill consome recursos durante a janela

## Anti-padroes

- ❌ Rollback automatico sem decisao humana (default) — producao nao se rolla sozinha
- ❌ Janela infinita — sempre `duration` finito (24h-7d max)
- ❌ Ignorar console error porque "e so um warning" — qualquer aumento = sinal
- ❌ Sem baseline pre-deploy — comparacao impossivel
- ❌ Screenshot diff sem mascarar areas dinamicas (timestamps, randoms) — gera false positive
- ❌ Esta skill **substituir** observability profissional — ela cobre o gap, nao o ouro padrao
