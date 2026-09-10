# Playbook canônico (auditoria)

## Classificação A vs B

Pergunta única: o aha é um **plano revelado** ou um **artefato criado**?

| | Playbook A — consumer / resultado | Playbook B — SaaS ferramenta / PLG |
|---|---|---|
| Exemplos | Saúde, educação, hábito, IA wrapper, conteúdo, utilitário pessoal | CRM, PM, finanças, analytics, collab, infra leve, B2B self-serve |
| Telas até a oferta | 6–12 (quiz + reveal + lazy reg + paywall) | Cadastro 1 + 3–5 guiadas + produto |
| Cadastro | Lazy, depois do diagnóstico, “salvar o plano” | Eager, 1 tela, OAuth + e-mail, no máximo 3 campos |
| Fricção | Positiva se cada resposta reaparece no reveal | Negativa se não destrava o aha |
| Oferta Dia 0 | Hard paywall ou trial após o reveal | Reverse trial 7–14 dias do Pro, saída para Free |
| Aha | “Seu plano para X está pronto” | Objeto criado / resultado gerado no canvas |

Default se dúvida: B2B ferramenta = B. App mobile de resultado pessoal = A.

Híbrido permitido: B no produto + tela ponte e timeline honesta emprestadas de A.

## Lei única

Onboarding existe para o evento de ativação (ação que correlaciona com retenção 30/90d). Paywall pede dinheiro no pico. 82–89% dos trials começam no Dia 0. Ativados convertem 35–65%; não ativados 2–8%. TTV alvo no p50 dos ativados menor que 5 minutos.

Evento de ativação NÃO é login, perfil completo ou “viu o tour”.

## Cadastro

B: OAuth acima da dobra + e-mail fallback. Sem telefone, cargo, CNPJ, “como conheceu”. Verificação de e-mail não bloqueia o primeiro uso. Conclusão alvo maior que 80%. Cada campo extra custa cerca de 7%.

A: quiz primeiro; conta só para persistir o plano. Conclusão do form 70–85%.

## Onboarding A (8 passos, 6–12 ecrãs)

1. Intent — 3–5 cards de problema, inclui “só explorando”. Retenção maior que 85%.
2. Diagnóstico — 4–6 ecrãs. Só o que muda o reveal. Drop menor que 15% por passo.
3. Compromisso — meta explícita (3x/semana, 10 clientes/mês).
4. Pre-permission push — explica o aviso de cobrança. Recusou a tela da app = NÃO disparar diálogo nativo. Lift de opt-in +30–50%.
5. Processamento — animação 3–8s “montando seu plano”.
6. Reveal — estado atual vs projeção com números do quiz.
7. Lazy registration — Apple/Google/e-mail.
8. Paywall — cap. paywall abaixo.

Drop-off = (Un − Un+1) / Un × 100.

## Onboarding B (3–5 telas)

1. Welcome + 1 intent que muda checklist/dashboard/paywall. Skip sagrado.
2. Setup mínimo — template / sample data, nunca empty dashboard.
3. First value — usuário FAZ a coisa no canvas.
4. Ponte — “seu workspace para [objetivo] está pronto” + 3 bullets.
5. Oferta soft / reverse trial.

Conclusão de fluxo guiado: ~72% em 3 passos, ~45% em 5, ~16% em 7. Tour linear proibido.

Depois: checklist 3–5 itens, empty states com CTA de 1 clique, 1 tooltip por vez, convite de time depois do aha, everboarding D3/D7/D14.

## Modelos e R/1K

R/1K = (visitante→registo) × (registo→pago) × ARPU × 1000.

| Modelo | Visit.→reg. | Reg.→pago | Quem não pagou | Usar quando |
|---|---|---|---|---|
| Hard paywall | baixo | D35 install→pago ~10,7–12% | sai | A com reveal forte |
| Trial opt-out (cartão) | 1,5–3,5% | 25–35% (elite 50%+) | expulso | CAC alto, TTV curto |
| Trial opt-in | 3–7% | 15–25% B2B | expulso ou Free | B2B padrão; 14 dias = default 62% |
| Freemium | 6–9% | 2–5% (ótimo 8–12%) | fica no Free | hábito + rede + custo marginal baixo |
| Reverse trial | 6–8% | 8–15% (elite 18–32%) | rebaixa p/ Free | **default PLG B** |

Trial curto (≤4d) ~25,5% trial→pago. 17–32d ~42,5% em apps se o valor precisa de ciclo. Não copiar duração do concorrente.

Gate: Free/trial completa 1 fluxo ponta a ponta. Pro trava quantidade, histórico, export, seats, SSO, API, cota de IA. Não usar contagem mágica de features.

## Paywall (14 blocos)

1. Headline do intent (não “Upgrade to Pro”)
2. Timeline honesta — Hoje Pro + R$ 0 / dia do aviso / dia da cobrança + cancele em 1 clique. Aviso tem de existir de verdade. Lift citado ~+23% conversão e −55% reclamações quando honesta.
3. 3 bullets do diagnóstico
4. 2–3 planos, anual dominante (15–60% off vs mensal)
5. Preço fracionado (R$/semana ou R$/dia)
6. CTA “Começar N dias grátis · R$ 0 hoje”
7. Microcopy “sem fidelidade · aviso 2 dias antes”
8. Prova social colada no CTA
9. Garantia 14/30 dias
10. FAQ mini (cancelar, dados, anual, mudar plano)
11. Legal (restore/termos no mobile; CNPJ/NF no web B2B)
12. Saída + downsell por TEMPO (7→14), não 50% OFF eterno
13. Chat só se ACV paga humano
14. Proibido — countdown falso, 6 planos, preço escondido, 12 logos

Página /preços pública ≠ modal in-app.

## 8 disparos in-app

1. Fim do onboarding
2. Clique em feature Pro — paywall da TAREFA + preview
3. 80% e 100% da cota
4. Empty state de área Pro
5. Chip no header (“Free · 3/5”)
6. Depois de uma vitória (exportou, publicou)
7. Dia 3, 7 e fim do trial
8. Settings → Plano (customer center)

Máximo 1 modal bloqueante por sessão. Feature gate é consequência da ação. Pago não vê paywall de aquisição.

## Aftercare e renew-off

55% dos cancels de trial de 3 dias são Dia 0; ~64% dos de 7 dias caem D0–D1. Depois do Stripe: celebrar + repetir objetivo + 1 ação de 30s. Dashboard vazio é defeito.

Segmento `trialing + auto_renew = off` no Dia N−1. Recuperação citada 5–6% desse bolso.

## Lifecycle

E-mails D0 / D1 (só se não ativou) / D3 / D5–7 / N−3 / N−1 / N / N+2. Uma CTA. Branch de estado.

Cancel-save: 1 motivo + 1 alternativa (pausa / downsell / humano) + perdas concretas. Sem labirinto. Save 15–30%.

Dunning: 4 toques em 14–21d. Recovery 10–20%.

Winback D+3 / D+14 / D+45 por motivo.

Pre-permission de push no A. No B, pedir depois do aha.

Web billing (Stripe) quando web+app — não furar IAP por dentro da loja.

## Métricas-alvo

| Métrica | Alvo |
|---|---|
| Signup completion | >80% |
| Drop por ecrã de diagnóstico (A) | <15% |
| TTV p50 ativados | <5 min |
| Activation 7d | 40%+ (média 30–37%) |
| Paywall view (sessão 1) | 75%+ |
| Paywall CVR self-serve | 8–15% |
| Trial→pago | 15–25% sem cartão; 40–55% com |
| Free→pago | 3–5% bom; 8–12% ótimo |
| Checkout completion | >70% |
| D7 retention | 25%+ |
| LTV/CAC | ≥3 |
| Dunning recovery | 10–20% |
| Cancel save | 15–30% |

Eventos mínimos: signup, intent, aha, paywall_view, paywall_accept, paywall_dismiss, trial_start, trial_convert, limit_hit, feature_gate, checkout_start, paid, cancel, payment_fail, auto_renew_off.

Ordem de teste: (1) evento de ativação (2) cortar passos até TTV (3) headline+timeline (4) anual+microcopy (5) preview vs muro (6) downsell 7→14 (7) duração do trial.

## Erros banidos no relatório

Signup longo; e-mail bloqueante; empty dashboard; tour longo; quiz B2B; cadastro seco em app A; integração pesada no minuto 1; plano no signup; oferta só na semana 2; hard paywall sem aha; Free que resolve tudo ou Free inútil; 50% OFF eterno; mesmo modal 4x/dia; paywall genérico em feature; Stripe→dashboard vazio; e-mail sem branch; push nativo na abertura; cancel labirinto; modelo pela % isolada.
