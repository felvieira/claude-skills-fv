---
name: canary-deployment
description: |
  Skill para rollout gradual de release com observacao continua de metricas e rollback automatico.
  Cobre estrategias canary (traffic-based, feature flag, blue-green), thresholds de seguranca e gatilhos
  de abort. Use quando precisar promover uma release ja aprovada em producao reduzindo blast radius.
  Trigger em: "canary", "canary deployment", "rollout gradual", "blue-green", "feature flag rollout",
  "progressive deployment", "gradual release", "rollback automatico", "deploy seguro".
---

# Canary Deployment

O Canary Deployment fecha o gap entre release-manager (skill 24, que decide o que sai) e deploy
(skill 07, que coloca em producao): assume um artefato ja aprovado, promove em fatias controladas e
observa metricas em tempo real para decidir progredir ou reverter. O objetivo nao e empacotar — e
limitar o impacto de uma regressao desconhecida.

## Governanca Global

Esta skill segue `GLOBAL.md`, `policies/execution.md`, `policies/handoffs.md`,
`policies/quality-gates.md`, `policies/verification-before-completion.md` (toda transicao de step
exige output verificavel da metrica que liberou a passagem) e `policies/stack-flexibility.md` (sem
amarrar a runtime especifico).

### Gate contra constituicao

Quando `memory/constitution.md` existe:
- baseline de SLOs do eixo Performance precisa estar registrado antes do step 1%
- error budget restante precisa cobrir o experimento canary (caso quebre, consome budget)
- principios de Security: artefato precisa ter passado por skill 06 e 34 antes de qualquer step
- Observability: stack de monitoramento precisa expor as metricas listadas abaixo em tempo
  proximo a real (lag aceitavel < 60s); senao, rollout vira deploy padrao com risco maior

Bloqueio: se baseline nao existe ou error budget esta esgotado, **nao iniciar canary**. Registrar
exception em ADR antes (raramente justificavel).

## Quando Usar

- promover release em producao com risco nao trivial de regressao
- validar mudanca de comportamento em populacao real antes de full rollout
- migrar workload entre versoes mantendo opcao de reverter sem redeploy
- liberar feature gradualmente por % de usuarios ou segmento

## Quando Nao Usar

- hotfix critico com janela curta (rollout gradual atrasa mitigacao)
- mudanca de schema de banco incompativel (canary nao resolve dual-write/dual-read)
- ambiente sem stack de observabilidade minima (sem sinal, canary vira aposta cega)
- mudanca puramente cosmetica sem caminho de execucao novo (overhead nao justifica)

## Entradas Esperadas

- PR ja aprovado por QA, Security e Reviewer e mergeado em main
- artefato (imagem, bundle, lambda, etc.) buildado e disponivel no registry/storage
- baseline de metricas dos ultimos 7-14 dias (error rate, p95 latency, conversion, 5xx rate)
- infraestrutura com suporte a rollout gradual: feature flag SDK, traffic splitter
  (service mesh, ingress, load balancer com weighting), ou ambientes paralelos
- canal de comunicacao definido (Slack #releases, Discord, email) e on-call ciente
- janela de rollout combinada (evitar horario de pico ou freeze de release)

## Saidas Esperadas

- rollout plan com steps, percentuais, tempo de soak por step e thresholds
- watch dashboard configurado com as 4-6 metricas-chave em visao unificada
- rollback runbook executavel em < 5 min, testado em staging antes
- registro de cada transicao (timestamp, metrica observada, decisao) para postmortem

## Estrategias de Canary

### 1. Traffic-based (recomendada para servicos HTTP/gRPC)

Roteia uma fracao do trafego real para a nova versao usando weighting no load balancer, service
mesh (Istio, Linkerd) ou ingress controller. Escada padrao:

```
Step 0:   0%  (versao nova publicada mas sem trafego) — health check passa
Step 1:   1%  — soak 10-15 min — observar 5xx, p95, erros estruturados
Step 2:  10%  — soak 30 min   — primeiro sinal de regressao agregada
Step 3:  50%  — soak 60 min   — confirmar estabilidade sob carga proxima do real
Step 4: 100%  — promover, manter versao antiga por 24h para rollback rapido
```

Pseudocodigo agnostico de stack:

```
# Kubernetes + service mesh
kubectl apply -f canary-1pct.yaml      # weighting: stable=99 canary=1
sleep 900 && check_metrics || rollback
kubectl apply -f canary-10pct.yaml
...

# AWS ALB com weighted target groups
aws elbv2 modify-listener \
  --default-actions Type=forward,ForwardConfig='{
    "TargetGroups":[
      {"TargetGroupArn":"...stable...","Weight":99},
      {"TargetGroupArn":"...canary...","Weight":1}
    ]
  }'
```

### 2. Feature flag (recomendada para mudancas de comportamento)

Versao nova ja esta deployada em 100% das instancias, mas o codigo novo so executa quando flag
ativa. Roteamento de quem ve o que e decidido em runtime:

```
# Pseudo-API generica de flag SDK
if flag.is_enabled("new_checkout", user=ctx.user_id,
                   rollout=Rollout(percent=1, segments=["beta"])):
    return new_checkout_flow(ctx)
return legacy_checkout_flow(ctx)
```

Vantagens sobre traffic-based: granularidade por usuario, segmento ou regiao; abort instantaneo
sem redeploy; permite holdout group para A/B. Limites: codigo de ambas as versoes coexiste no
binario (overhead de manutencao); requer infraestrutura de flag (LaunchDarkly, Unleash, Flagsmith,
ou self-hosted).

### 3. Blue-green (recomendada para mudancas de larga escala ou versao de stack)

Dois ambientes identicos: blue (atual em producao) e green (nova versao). Switch instantaneo via
DNS, load balancer ou roteador. Rollback = inverter o switch.

```
1. Green ambiente paralelo, escala 100% identica ao blue
2. Smoke tests + warmup contra green (sem trafego real)
3. Switch: roteador aponta para green
4. Observar 15-30 min com 100% do trafego em green
5. Se ok: blue vira reserva por 24h, depois desliga
   Se falha: switch reverso em segundos
```

Quando preferir: mudancas que tocam runtime (Node 18 -> 22), framework major, schema de cache
incompativel. Custo: dobra a infra temporariamente.

## Metricas a Observar

Configurar dashboard unificado e thresholds antes de iniciar o step 1%. Comparar sempre canary
vs stable lado a lado, nao canary vs baseline historico (variacao de carga confunde).

| Metrica | Default threshold | Janela de avaliacao | Acao se quebrar |
|---|---|---|---|
| Error rate (5xx/total) | canary < 1% absoluto E canary <= stable + 0.5pp | ultimos 5 min, 2 samples consecutivos | rollback automatico |
| p95 latency | canary <= stable * 1.20 (regressao max 20%) | ultimos 10 min, media movel | rollback automatico |
| p99 latency | canary <= stable * 1.30 | ultimos 10 min | alerta + decisao humana |
| Conversion rate / business KPI | canary >= stable * 0.95 (perda max 5%) | janela conforme volume | alerta + decisao humana |
| 5xx rate por endpoint | nenhum endpoint > 2% em canary | ultimos 5 min | rollback automatico |
| Saturacao (CPU, memoria, conexoes) | canary <= stable * 1.30 | continuo | alerta |
| Custo por request (se IA) | canary <= stable * 1.15 | janela conforme volume | alerta |

Notas:
- thresholds sao defaults — ajustar por servico segundo o que constituicao define como SLO
- janela curta demais (< 1 min) gera falso positivo; longa demais (> 30 min em step pequeno) atrasa
  deteccao real
- ao subir o percentual, recalcular baseline do step anterior — variacao de carga muda referencia

## Rollback Automatico

Gatilhos que disparam reversao sem intervencao humana:

1. **Threshold quebrado em N samples consecutivos** — N >= 2 evita flap de um pico isolado;
   usar janela rolling para nao penalizar warmup
2. **Alarme externo de paginacao** — se o sistema de alertas (PagerDuty, OpsGenie, Alertmanager)
   abrir incidente vinculado ao servico em rollout, abortar
3. **Abort manual** — botao/comando explicito (ex: `kubectl rollout undo`, flag kill switch,
   switch blue-green) com permissao de qualquer on-call
4. **Timeout de step** — se um step nao converge (metrica oscila perto do threshold) por mais
   que o dobro da janela esperada, abortar para evitar drift

Procedimento de rollback (deve estar testado em staging):

```
1. Acionar reversao do step (weighting volta para 100% stable, flag desligada,
   switch blue-green revertido)
2. Confirmar via dashboard que trafego retornou para versao anterior (< 2 min)
3. Snapshot de logs/metricas do periodo do canary (window: inicio - 5min ate now)
4. Comunicar canal #releases com link do dashboard e janela do incidente
5. Abrir postmortem dentro de 24h (skill 20 observability-sre lidera, skill 11
   reviewer revisa)
```

Pos-rollback: artefato canary nao volta automaticamente; precisa novo PR ou hotfix. Nunca
"tentar de novo" sem fix da causa raiz — rollback repetido queima error budget e confianca.

## Comunicacao

Status update em cada transicao no canal definido (#releases ou equivalente). Formato sugerido:

```
[canary <servico> <versao>] step 10% iniciado
- baseline: error 0.3%, p95 240ms
- canary atual: error 0.4%, p95 252ms (+5%)
- soak: 30 min, proxima decisao em ~15:42
- dashboard: <link>
- abort: <comando ou link>
```

Updates obrigatorios:
- inicio de cada step com baseline e thresholds
- promocao para proximo step (com snapshot das metricas)
- rollback (motivo + janela + link do postmortem)
- conclusao em 100% (release oficialmente cerrada)

## Integracao com Pipeline

- **vem depois de skill 24 (release-manager):** release plan ja definido, changelog publicado,
  on-call ciente. Canary executa o "como" do rollout que release-manager planejou
- **vem depois de skill 07 (deploy-docker):** artefato ja buildado e publicado no registry;
  canary nao reconstroi nada, so manipula roteamento/flag
- **integra com skill 20 (observability-sre):** dashboards e SLOs sao pre-requisito; pos-rollout,
  observability conduz analise de impacto
- **integra com skill 34 (static-analysis):** se rollback for disparado por classe de bug conhecida,
  registrar para evolucao das regras de scan
- **handoff de saida:** se 100% ok, devolve para release-manager fechar a release; se rollback,
  abre ciclo de postmortem com observability + reviewer

## Evidencia de Conclusao

- rollout plan documentado com steps, percentuais, soak e thresholds
- dashboard de watch com metricas lado a lado (canary vs stable) acessivel
- rollback runbook testado em staging com tempo medido (< 5 min)
- registro cronologico de cada transicao (timestamp, metrica, decisao)
- se rollback: postmortem aberto e causa raiz identificada
- se sucesso: snapshot das metricas em 100% comparado ao baseline historico
- comunicacao registrada no canal acordado

## Handoff

Seguir `policies/handoffs.md`. Devolver para skill 24 (release-manager) em caso de sucesso para
encerrar release oficial, ou para skill 20 (observability-sre) em caso de rollback para conduzir
analise de causa raiz.

## Fontes Externas

Estrategia base e thresholds adaptados do slash command `/canary` do repositorio
[`garrytan/gstack`](https://github.com/garrytan/gstack) (licenca MIT). Conceitos de error budget e
janela de soak alinhados com Google SRE Book (capitulos 4 e 8). Pattern de blue-green e canary
documentado em Continuous Delivery (Humble & Farley, 2010).
