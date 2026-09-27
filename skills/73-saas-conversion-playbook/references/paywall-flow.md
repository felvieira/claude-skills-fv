# Paywall Como Fluxo — Momento, Arquitetura, Alavancas e Testes

Complementa `playbook.md`. Lá ficam a classificação A/B, os 14 blocos do paywall e os 8 gatilhos
in-app. Aqui fica o que decide **se** esses blocos funcionam: o momento em que o paywall aparece,
quantas páginas ele tem, qual alavanca de persuasão carrega o peso e em que ordem testar.

A UI de checkout (Play Billing, Stripe, estados de pagamento, cupom) é da skill 63. Esta referência
decide o que a tela precisa comunicar e quando; a 63 implementa.

## Lei central

A decisão de pagar quase nunca nasce no paywall. Nasce no onboarding, no aha e nos pontos de
contato anteriores. O paywall é o checkout de uma decisão já tomada, ou o último empurrão se ela
ainda está aberta. Se o usuário não teve aha, o paywall está cedo demais: mover o momento, não polir
a tela.

Pontos que movem a decisão antes do paywall:
- quiz ou diagnóstico que devolve um plano personalizado
- reveal com um número do usuário ("seu tempo de tela é 5h12")
- primeira vitória no canvas (exportou, gerou, concluiu)
- prova social no contexto da tarefa, não no rodapé
- exposição repetida ao resultado, não ao logo do Pro

## 1. Momento

Cada momento tem copy e fricção diferentes. Ordem de preferência:

| # | Momento | Observação |
|---|---|---|
| 1 | logo após o reveal/aha, sessão 1 | maior volume de trials (82–89% começam no Dia 0, ver `playbook.md`) |
| 2 | após a primeira vitória concreta | |
| 3 | feature-gate, no momento da intenção | paywall da tarefa, 1 página |
| 4 | D3, D7 e N−1 do trial | |
| 5 | cancelamento e win-back | tela própria, nunca a de aquisição |

Regras: quem já paga não vê paywall de aquisição. No máximo um modal bloqueante por sessão.

## 2. Arquitetura

| Arquitetura | Quando | Job |
|---|---|---|
| 1 página | feature-gate, settings, B2B simples | fechar a tarefa agora |
| 2 páginas | consumer pós-aha | P1 valor/resultado, P2 preço + trial |
| 3–4 páginas | ticket alto, resultado abstrato, primeira compra | história → prova → plano → checkout |
| paywall da tarefa | clique em feature Pro | preview + "continuar esta ação" |
| win-back / oferta de saída | trial acabando, renovação desligada | tempo extra ou plano menor, nunca desconto eterno |

Multi-página vence quando o valor precisa ser ensinado. Página única vence quando o valor é óbvio e o
usuário está no meio de uma ação. Página única como padrão sem justificativa é defeito.

Defaults: consumer pós-aha = 2–3 páginas. Feature-gate = 1 página da tarefa com preview.

## 3. Três alavancas

Uma alavanca forte e duas de suporte. Nunca as três no máximo ao mesmo tempo.

### Reduzir risco
- timeline passo a passo: hoje R$ 0 / dia do aviso / dia da cobrança / cancele em 1 clique. Só
  escrever se o aviso existe de verdade no sistema
- "cancele em 1 clique, sem ligação"
- garantia de 14–30 dias escrita perto do CTA
- preview do Pro sem muro opaco (mostrar o resultado, não um blur)
- restaurar compras visível no mobile

### Enquadrar valor
- resultado no headline ("Recupere 8h por semana"), nunca "Plano Pro"
- 3 bullets que repetem respostas do diagnóstico
- prova social colada no CTA, não 12 logos no rodapé
- anual como padrão visual, mensal como alternativa legível
- preço fracionado (R$/semana) junto com o total do período
- tabela Free vs Pro só com linhas que o usuário já tentou usar

### Calibrar fricção
Fricção nem sempre é inimiga, mas só depois do aha.
- cartão no trial (opt-out) filtra curiosos e sobe trial→pago; só se o CAC aguenta volume menor
- escolher plano antes do checkout reduz abandono por "o preço me surpreendeu"
- confirmação "entendi que serei cobrado em D+N" reduz chargeback e avaliação de 1 estrela
- nenhuma fricção antes do aha

## 4. Padrões nomeados

Usar como referência, adaptar ao intent do produto.

**Consumer pós-aha (3 páginas)**
- P1 resultado: headline repete o número do reveal; visual do plano ("você vs meta"); 3 bullets do
  quiz; CTA "Continuar" ainda sem preço
- P2 prova + risco: como os N dias funcionam (timeline); 1 depoimento da mesma persona; FAQ mini
  (cancelar, dados, o que acontece em D+N); CTA "Ver planos"
- P3 plano + checkout: 2 planos, anual destacado; preço por semana; CTA "Começar N dias grátis · R$ 0
  hoje"; microcopy "sem fidelidade · aviso 2 dias antes · cancele em 1 clique"

**Feature-gate (1 página)**
- título = verbo da tarefa ("Exportar o relatório em PDF")
- preview do artefato (miniatura, 3 linhas, marca d'água leve)
- 2 bullets do que destrava agora
- CTA "Desbloquear e exportar"; link "Ver todos os planos"
- eventos: `feature_gate`, `paywall_view`, `paywall_accept`, `paywall_dismiss`

**Win-back (trial acabando / renovação desligada)**
- headline = o que ele perde em concreto (o plano, o histórico, o arquivo)
- oferta = tempo (mais 7 dias) ou plano menor
- CTA único; se recusar, sai em 1 toque

## 5. Casos de referência (sempre marcar ANALOGIA)

| App | Movimento | Aprendizado transferível | Número citado na fonte |
|---|---|---|---|
| Opal | vendeu horas recuperadas, não o bloqueador | headline = resultado do diagnóstico | trial start 7% → 17% |
| Blinkist | timeline do trial | transparência reduz reclamação de cobrança | — |
| Tipstop | reapresentou a mesma oferta | layout e hierarquia movem mais que preço | "triplicou" |
| Slopes | pay ramp (compromisso crescente) | pedir menos no D0, mais depois do hábito | +25% trials |

Os números acima são dos casos citados na fonte, não foram verificados e nunca entram no relatório
como previsão para o produto do usuário.

## 6. Conformidade e confiança

- Apple/Google: preço e duração do trial iguais aos da IAP, restaurar compras visível, sem "só hoje"
  falso, sem preço fora da IAP no iOS
- sem countdown falso, sem anual pré-marcado escondido, sem X minúsculo
- legal curto: termos, privacidade, restaurar
- cancel-save = 1 motivo + 1 alternativa (pausa, mais dias, plano menor). Sem labirinto

## 7. O que não copiar

- roleta, raspadinha, "você ganhou 70% off"
- 5–6 planos no mobile
- preço escondido atrás de "ver planos"
- o mesmo paywall em aquisição, feature-gate e churn
- "Unlock everything" sem tarefa
- dark pattern que sobe conversão no D0 e destrói LTV

O melhor paywall de longo prazo é o que o usuário descreve como justo depois de 90 dias.

## 8. Métrica que costuma ser ignorada

Não otimizar só `paywall_view → trial_start`. Olhar junto:
- trial_start → retido em D7
- trial → pago
- pago ainda ativo em D30
- reembolso, chargeback, avaliação de 1 estrela citando cobrança
- LTV por variante de paywall, não CVR isolada

Uma variante que converte 20% mais no D0 e reembolsa o dobro é pior.

## 9. Ordem de teste (radical, não cor de botão)

1. momento (mover o paywall)
2. arquitetura (1 vs 3 páginas)
3. headline de resultado vs lista de features
4. timeline honesta ligada/desligada
5. cartão no trial vs opt-in
6. preview vs muro
7. anual padrão vs mensal padrão
8. downsell por tempo (7→14 dias) vs desconto

## Entrega (quando o pedido é só o paywall)

- momento + job da tela
- arquitetura (n páginas) e wireframe textual
- copy PT-BR: headline, bullets, CTA, microcopy, FAQ mini (base em `assets/copy-bank.md`)
- alavancas usadas e por quê
- eventos de analytics
- 3 testes radicais
- o que foi recusado e por quê

## Fonte

Adaptado da skill `paywall-flow-design` de um pacote consolidado pelo usuário (set/2026), que resume
o estudo da Mobbin com Jonathan Parra ("We Studied 2995 Paywalls"). Números são dos casos citados
no material, não verificados de forma independente.
