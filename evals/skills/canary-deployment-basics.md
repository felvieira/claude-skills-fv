# Canary Deployment — Basics Eval

## Caso 1: Rollout gradual padrão
- Entrada: feature pronta, baseline de métricas definido (error rate 0.3%, p95 180ms), tráfego de produção 10k req/s
- Esperado: plano com escada 1% → 10% → 50% → 100% com janela de aguardo entre steps + lista das 7 métricas a observar
- Criterio: 3 estratégias mencionadas (traffic-based, feature flag, blue-green) e uma escolhida com justificativa

## Caso 2: Rollback automático disparado
- Entrada: canary em 10%, p95 sobe de 180ms baseline para 240ms por 3 samples consecutivos
- Esperado: rollback imediato pra 0%, notificação pro canal de releases, postmortem agendado
- Criterio: identifica o gatilho (regression > 20% por N samples) e segue procedimento numerado

## Caso 3: Feature flag preferível a traffic-based
- Entrada: mudança afeta só 1 segmento de user (enterprise customers, ~3% do tráfego)
- Esperado: recomenda feature flag por segmento em vez de traffic-based percentage
- Criterio: justifica que traffic-based é caro pra segmento pequeno e flag dá controle fino

## Caso 4: Blue-green pra mudança de schema
- Entrada: mudança em schema de banco com backward-incompatible migration
- Esperado: blue-green com switch instantâneo + dual-write durante transição + rollback = switch back
- Criterio: NÃO recomenda traffic-based (não funciona pra schema breaking change)

## Caso 5: Ambiguidade — métrica não-cobrindo
- Entrada: feature de pagamento, sem baseline de conversion rate disponível
- Esperado: skill exige baseline antes de canary OU sugere shadow mode pra capturar baseline primeiro
- Criterio: NÃO inicia canary sem baseline mensurável — gate obrigatório
