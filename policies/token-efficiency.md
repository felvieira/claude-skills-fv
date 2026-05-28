# Token Efficiency Policy

## Objetivo
Reduzir custo de contexto e resposta sem perder qualidade nem precisao.

## Regras
- Nao repetir o pedido do usuario
- Nao reexplicar contexto ja confirmado
- Responder em camadas: conclusao, detalhes minimos, proximo passo
- Preferir bullets curtos a texto corrido longo
- Evitar listas extensas por padrao
- Evitar exemplos grandes quando um snippet curto resolve
- Ler poucos arquivos primeiro
- Expandir leitura apenas sob incerteza real
- Nao abrir varias frentes sem necessidade
- Nao duplicar regras ja definidas em `GLOBAL.md` ou `policies/`

## Compressao de Contexto
Ao resumir estado, priorizar:
1. objetivo atual
2. decisao tomada
3. blockers
4. risco
5. proximo passo

## Verbosidade
- Padrao: baixa
- Subir detalhe apenas para:
  - arquitetura
  - seguranca
  - debugging complexo
  - trade-offs importantes

## Anti-patterns
- checklist gigante sem necessidade
- narrativa longa de coisas obvias
- repetir justificativa varias vezes
- listar todas as opcoes quando ha um default forte
- explicar comandos ou conceitos que o usuario claramente ja domina

## Economia operacional de contexto (custo de plano)

As regras acima reduzem o custo da *resposta*. Esta secao trata do custo da *sessao* —
o vilao silencioso: **cada prompt carrega TODO o historico da sessao**, entao a mensagem
30 e ordens de magnitude mais cara que a mensagem 1, mesmo que igualmente simples.

9 taticas (inspirado em "Nunca mais fique sem creditos no Claude", D. Folloni). Onde o kit
**automatiza**, esta marcado:

| # | Tatica | Como o kit ajuda |
|---|--------|------------------|
| 1 | **/clear ao mudar de assunto** | 🤖 `topic-shift-detector.mjs` (UserPromptSubmit) avisa em mudanca de dominio obvia |
| 2 | **Cuidado com MCPs** (vao em todo prompt) | 🤖 `session-start.mjs` reporta MCPs do projeto; preferir skills (lazy-load) |
| 3 | **Manda tudo de uma vez** (fragmentar = pagar historico N×) | 👤 habito manual — kit nao ve o futuro do prompt |
| 4 | **Modelo certo** (Opus caro, Sonnet/Haiku resolvem) | 🤖 `model-routing-hook.mjs` sugere tier por task |
| 5 | **CLAUDE.md enxuto** (< 200 linhas, indice nao enciclopedia) | 🤖 `session-start.mjs` avisa se CLAUDE.md/AGENTS.md passa de 200 linhas |
| 6 | **Referencia o arquivo certo** (evita caca = leituras extras) | 🤖 `pre-execution-gate.mjs` penaliza prompt vago, pede path/simbolo |
| 7 | **/compact aos 60%** (nao espera o auto em 95%) | 🤖 `context-guard-stop.mjs` avisa em 50%, bloqueia em 75% com lista PRESERVE/DISCARD |
| 8 | **Modere com agentes** (contexto duplica pai→filho) | 🤖 `agent-dispatch-validator.mjs` valida spawns |
| 9 | **Advisor Mode** (Opus planeja, Sonnet/Codex executa) | 🤖 `/multi-plan` + `policies/model-routing.md` |

Comandos de inspecao manual (rodar com frequencia): `/context` (pra onde vao os tokens),
`/usage` (quanto resta do plano), `/savings` (o que o kit ja economizou nesta sessao).

**Principio:** o agente deve respeitar esses avisos quando aparecem, mas eles sao
**nao-vinculantes** — falso positivo (ex: sugerir /clear no meio de um fluxo continuo)
e mais caro que perder um aviso, porque treina o user a ignorar todos. Por isso os
sensores sao conservadores (ver `policies/self-correcting-sensors.md`).
