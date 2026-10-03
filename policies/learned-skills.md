# Learned Skills — memória de soluções por projeto

> Learned-skills são soluções **não-óbvias e específicas do codebase** capturadas numa sessão para não serem re-derivadas na próxima. Vivem em `.bot/learned-skills/*.md` (por projeto), têm score 0-1 com decay semanal, e são reinjetadas quando o trigger casa. São o "Codify → Propagate" da nossa memória.

## O gate de captura (os 3 critérios — não negociáveis)

Salve um learned-skill **só se os 3 forem verdadeiros**. Skill-slot é caro; fix genérico não merece um.

1. **Não é googleável** — nenhum doc/StackOverflow público cobre. (Se um `web_search` resolveria, não é learned-skill.)
2. **Específico DESTE codebase** — não é conselho genérico de JS/Python. ("Use `try/catch`" não; "o hook X em PT precisa de radical `cri[aeo]\w*` porque `criar?` não pega 'crie'" sim.)
3. **Custou debugging real** — >15 min, hipótese-driven. Um fix de 1 linha óbvio não.

Se algum critério falha → **não salve**. Um vault cheio de fixes triviais degrada o contexto injetado no SessionStart.

## Formato

```markdown
---
name: <slug-kebab-case>
triggers: ["<keyword-do-sintoma>", "<keyword-da-causa>"]
created: YYYY-MM-DD
source_file: <arquivo onde o bug vivia>
state: accepted            # accepted | rejected | superseded | stale  (opcional; padrao accepted)
files: [<caminhos que o fix toca>]   # opcional: habilita frescor e ranking por arvore suja
commit: <sha do HEAD ao salvar>      # opcional: ponto de comparacao do frescor
---

# <título: o padrão que você vai ver de novo>

## Symptom
<1-2 linhas: o que o user/log/test reporta>

## Root cause
<por que acontece NESTE codebase especificamente>

## Fix
1. <passo concreto>
2. <passo concreto>

## How NOT to fix it
<o caminho errado que você tentou primeiro, pra o futuro-você pular>
```

Segue `policies/memory-write-rules.md` (anti-fabricação: não invente; `TBD` pro incerto).

> O campo e `triggers:` (plural). O template antigo do `post-tool-verifier` gerava `trigger:` e o loader so lia `triggers:`, entao skills salvas pelo template **nunca eram injetadas**. O loader (`keyword-detector.mjs`) e a leitura do MCP agora aceitam as duas grafias; o template gera a correta.

## Estados — o que foi tentado e descartado tambem e memoria

| `state` | Significa | Na injecao | Decay/archive |
|---|---|---|---|
| `accepted` (padrao) | solucao que funcionou | resumo + "How to use"; ganha boost ao ser usada | sim (score/decay abaixo) |
| `rejected` | abordagem **tentada e revertida**; exige `reason:` | cabecalho `⛔ REJEITADA`, o motivo e "nao repita sem fato novo que o invalide" | **nao** |
| `superseded` | trocada por outra; use `superseded_by:` | cabecalho `↪ SUPERADA` apontando o sucessor | **nao** |
| `stale` | referencia stack/arquivo que mudou; revisar | cabecalho `⚠ DESATUALIZADA`, tratar como hipotese | sim |

`rejected` e `superseded` sao **registro de decisao**, nao dica que perde valor por falta de uso: nao decaem, nao sao arquivadas pelo `memory-curator` e nao ganham boost quando mostradas (senao um aviso de "nao faca" viraria "popular"). E o que impede o agente de gastar uma sessao reinventando um beco ja explorado — o mesmo erro de "false absence" de [`memory-write-rules.md`](memory-write-rules.md), so que sobre o que **nao** funcionou.

Regra de captura de `rejected`: so registre quando houver **motivo observado** (medicao, erro, regressao). "Nao gostei" nao e motivo; sem `reason`, o aviso diz `(motivo nao registrado)` e perde utilidade.

## Frescor e ranking pela arvore de trabalho

Com `files:` e `commit:` preenchidos, na injecao o hook compara `git diff <commit>..HEAD` mais a arvore suja contra os caminhos citados:

- algum mudou => linha `Frescor: N arquivo(s) citado(s) mudaram desde <sha>: ...`. Revalide antes de aplicar;
- nada mudou, sem git ou commit desconhecido => **silencio** (nao afirma o que nao sabe).

Quando ha arquivos sujos no `git status`, uma skill que cita um deles ganha `+0.15` no ranking de injecao — so desempata; nunca passa por cima de score e trigger.

## Os dois caminhos de captura

| Caminho | Hook | Quando | Natureza |
|---|---|---|---|
| **Reativo** | `post-tool-verifier` (PostToolUse) | logo após um Edit/Write com cara de debugging | no momento da descoberta |
| **Cadência** | `auto-skillify` (UserPromptSubmit) | a cada N turnos (default 20) | destila o acumulado da janela |

O `auto-skillify` (absorvido de [activeloopai/hivemind](https://github.com/activeloopai/hivemind)) fecha o gap do reativo: nem toda descoberta dispara um Edit no momento certo. A cada 20 turnos ele pergunta "a atividade recente vale virar learned-skill?" — codificação proativa, não só no calor do bug.

Em ambos os casos a **decisão é do agente da sessão** (que já está pago), não de um LLM forkado — espelha o padrão do `memory-curator`.

## Ciclo de vida (score + decay)

Config em `hooks/config.json → learned_skills_scoring`:

- **Nasce** com `initial_score` (0.7).
- **Sobe** `boost_on_use` (+0.1) cada vez que o trigger casa e a skill é injetada (`keyword-detector`).
- **Decai** `decay_per_week` (-0.1) por semana ociosa.
- **Arquiva** em `.archive/` quando cruza `archive_threshold` (0.3) — recuperável, nunca deletado.

O `memory-curator` aplica decay/archive autonomamente no SessionStart (parte mecânica, JS puro). Promoção pro tier semântico do vault é manual via `/consolidate-memory`.

## Quem lê / escreve

- **Escreve:** o agente (via gate acima), disparado por `post-tool-verifier` ou `auto-skillify`.
- **Lê + injeta:** `keyword-detector` no UserPromptSubmit — casa trigger, injeta o resumo, boosta o score.
- **Cura:** `memory-curator` (decay/archive) + `/consolidate-memory` (merge/promote manual).

## Anti-padrões

- ❌ Salvar fix genérico/googleável só pra "registrar a sessão" → ruído no contexto.
- ❌ Trigger genérico demais (`["erro", "bug"]`) → casa em tudo, injeta sempre.
- ❌ Deletar learned-skill de score baixo → sempre archive (`.archive/`), recuperável.
- ❌ Fabricar Symptom/Root-cause pra preencher o template → `TBD` é melhor que invenção.

## Integração

- `hooks/scripts/post-tool-verifier.mjs` — captura reativa.
- `hooks/scripts/auto-skillify.mjs` — captura por cadência.
- `hooks/scripts/keyword-detector.mjs` — leitura + injeção + boost de score.
- `hooks/scripts/memory-curator.mjs` — decay/archive autônomo.
- `hooks/scripts/memory-lib.mjs` — frontmatter, frescor via git e redacao de segredos compartilhados.
- `scripts/eval-memory-recall.mjs` + `bench/memory/` — eval de injecao: positivos devem trazer a resposta, controles negativos devem injetar zero.
- `policies/compaction-recovery.md` — pacote pos-compactacao (outro fluxo, mesma biblioteca).
- `policies/memory-write-rules.md` — regras de escrita (anti-fabricação).
- `policies/self-correcting-sensors.md` — filosofia dos sensores conservadores.
- `policies/memory-tiers.md` — onde os learned-skills habitam na hierarquia 4-tier.
