# Savings Metrics — Heurísticas Declaradas

> **Status:** auditoria pública das heurísticas usadas em `scripts/savings-report.mjs` e no comando `/savings`.
> Os números mostrados são **estimativas baseadas nestas heurísticas**, não dados de billing reais.

## Princípio

Métricas de "savings" são facilmente vira marketing-baloon. Esta policy define exatamente como cada número é calculado para que o usuário possa:

1. Auditar se concorda com a heurística
2. Ajustar via env var ou config se discordar
3. Reproduzir os números independentemente
4. Saber quando o número é confiável vs aproximado

## Heurísticas (todas declaradas em `scripts/savings-report.mjs`)

### `REREAD_AVG_FILE_TOKENS = 800`

**Conceito:** Cada read flagado como repetido (≥3× no mesmo arquivo na mesma sessão) **provavelmente** seria evitado se o agente reusasse o working set / repo-audit. 800 tokens é a estimativa de input tokens de um arquivo médio do kit (5-20KB de markdown → ~800 tok de input).

**Fonte:** observação empírica em sessões do kit (arquivos `policies/*.md`, `skills/*/SKILL.md` ficam em 500-1500 tokens cada).

**Quando confiar:** quando o user mexe muito em docs/policies.
**Quando descontar:** code repos com arquivos pequenos (~200 tok médio) — multiplicar pelo seu fator de ajuste.

### `SKILL_AS_SUBAGENT_TOKENS_SAVED = 1500`

**Conceito:** Cada vez que o hook `agent-dispatch-validator` bloqueia uma chamada `Agent({ subagent_type: "dev-team-kit-fv:NN-name" })`, evita:

- O turno wasted do `InputValidationError`
- O processamento do error pelo modelo
- A tentativa de fallback (geralmente errada — modelo manda `general-purpose` sem invocar Skill internamente)
- O turno do user pra entender o erro e corrigir

Total estimado: ~1500 tokens entre input + output ao longo desses 4 passos.

**Fonte:** medido na sessão real que originou o v2.2.0 fix (5 dispatches paralelos quebraram, +/- 7500 tokens torrados antes do user perceber).

**Quando confiar:** alta confiança. Esse caso é binário (bloqueia ou quebra).
**Quando descontar:** se o modelo aprendeu o padrão e não tenta mais — aí o bloqueio é "free" mas o benefício de prevenção também é zero.

### `ENRICHED_PROMPT_TOKENS_SAVED = 2500`

**Conceito:** Cada vez que o `pre-execution-gate` ativa ENRICH ou GUIDED ENRICH (modos novos em v2.3.0), o modelo é forçado a **perguntar 1 coisa focada** em vez de:

- Adivinhar errado e refazer (típico ~2000 tok wasted)
- Listar 5 perguntas chaóticas que o user ignora 4
- Implementar a coisa errada e depois corrigir (~4000 tok wasted)

Média estimada: 2500 tokens economizados por prompt enriquecido.

**Fonte:** estimativa conservadora baseada em comparações entre sessões antes/depois do v2.3.0.

**Quando confiar:** prompts vagos de implementação (a maioria).
**Quando descontar:** se o modelo já fazia clarifying questions por conta própria — aí o gate só formaliza algo que já existia.

### `REPEATED_SEARCH_TOKENS_SAVED = 400`

**Conceito:** Cada Grep/Glob repetido (≥3× com o mesmo padrão) que o hook flagou poderia ter usado o resultado anterior do working set. Searches retornam tipicamente 400-1000 tokens (lista de matches).

**Quando confiar:** sessões longas (>1h) onde a memória do modelo "esquece" buscas antigas.
**Quando descontar:** sessões curtas (<30min) onde o modelo provavelmente lembra.

### `BUG_PREVENTED_USD = 0.50`

**Conceito:** Cada "risco prevenido" (skill-as-subagent block + repeated signal /2) representa um bug que **não** vai pra produção. A literatura de "cost of defect" estima $0.10-$100 por bug dependendo de em que estágio é pego. $0.50 é o **piso conservador** (bug pego na sessão custa quase nada vs deploy).

**Fonte:** IBM SystemSciences research + Capers Jones, ajustado pra "bug agêntico" que normalmente é pego rápido.

**Quando confiar:** estimativa de baseline. Para projetos críticos (fintech, healthcare), multiplicar por 10-100x.
**Quando descontar:** spike/POC throwaway — bug não chega a "produção", então valor é menor.

### `HOURS_PER_BUG_PREVENTED = 0.5`

**Conceito:** Cada bug prevenido = ~30 min de dev evitados (incluir: identificar, reproduzir, debugar, fixar, testar, code review).

**Fonte:** literatura de produtividade dev (Microsoft Research "dev hours per defect").

**Quando confiar:** bug típico de "lógica + integração".
**Quando descontar:** bug trivial (typo, missing import) — minutos. Bug crítico de arquitetura — dias.

## Pricing (USD por 1M tokens)

```javascript
PRICING_USD_PER_MTOK = {
  input:  3.00,   // Anthropic Sonnet 4.x range, May 2026
  output: 15.00,
  cache_read: 0.30,
  cache_write: 3.75,
};
```

**Atualizar:** quando Anthropic mudar preço, editar diretamente em `scripts/savings-report.mjs`. Documente o motivo no commit.

**Por que só Sonnet:** kit assume Sonnet como modelo default. Para Opus (5x mais caro) ou Haiku (4x mais barato), multiplicar resultado pelo fator apropriado.

## Composite metrics

### `bugs_prevented`

```
bugs_prevented = skill_as_subagent_blocks
               + unknown_name_blocks
               + floor(repeated_signals_count / 2)
```

**Por que /2 para repeated signals:** cada sinal representa "uma vez de confusão evitada", mas precisam de 2 sinais pra constituir um "bug-equivalente". Heurística conservadora.

### `efficiency_bytes_per_call`

```
efficiency = total_bytes_returned / total_tool_calls
```

**Interpretação:** quanto menor, mais "leves" são as chamadas. Sinal de boa hygiene quando médio < 2KB. Acima de 10KB = muitas leituras gordas (candidato a refactor de exploration).

### `enrichment_rate`

```
rate = (enrich_count + guided_enrich_count) / total_prompts
```

**Interpretação:** % de prompts que receberam ajuda estrutural. Esperado ficar entre 10-30% em sessão típica (a maioria dos prompts tem concrete signal ou é discussão aberta).

- < 5% → gate pode estar pouco sensível
- > 40% → gate pode estar muito agressivo, ou user tem hábito de prompts curtos

## Pontos cegos conhecidos

O relatório **NÃO** mede:

- Tokens economizados por cache hit (Anthropic prompt caching) — esses já são "free" no billing real
- Tempo do user (só o do modelo)
- Custo de infra externa (fal.ai, Brave Search, Firecrawl) — ver skill 30
- Qualidade da entrega final (sucesso/falha de feature) — métrica de outcome, não de processo

## Métrica norte proposta: accepted outputs / human review minutes

> Fonte: [Harness Engineering: Build a Reliable AI Agent in 6 Layers](https://x.com/iiiichigo_chan/status/2093765205276713218) (Birgitta Böckeler) — conceito absorvido, texto reescrito. Preenche o ponto cego "qualidade da entrega final" acima — não é um novo relatório, é a métrica que falta pra fechar aquele gap.

Otimizar por tokens gerados, tool calls, ou tarefas iniciadas mede **atividade**, não **valor entregue**. A métrica que captura o que um harness deveria fazer é:

```
accepted_outputs / human_review_minutes
```

Onde `accepted_outputs` é o número de PRs/mudanças aceitas sem retrabalho, e `human_review_minutes` é o tempo humano gasto revisando (aceitas + rejeitadas). Um número alto significa que o kit está convertendo capacidade do modelo em trabalho revisável sem consumir esforço humano equivalente na saída — o oposto de gerar volume que exige o mesmo tempo de review de sempre.

**Por que não está implementado ainda:** o kit não tem hoje um jeito de capturar `human_review_minutes` de forma confiável (isso vive fora do que hooks conseguem observar — é tempo do humano, não do agente) nem um sinal automático de "aceito sem retrabalho" vs "aceito após 3 rounds de correção". Registrado aqui como métrica-alvo, não implementação — se o usuário adotar um tracker externo (Linear/Jira, já mencionado no roadmap abaixo) ou revisão de PR no GitHub, o dado de `time_to_merge`/`review_comments_count` por PR é o proxy mais próximo disponível sem instrumentação nova.

```
☐ Ao avaliar se uma mudança no kit "ajudou", perguntar não "quantos tokens economizou"
  mas "quantas mudanças aceitas sem retrabalho isso gerou por minuto de revisão humana"
☐ Se a resposta é "gerou mais volume mas o review ficou mais longo" — não é uma melhoria,
  é custo transferido do modelo pro humano
```

## Como ajustar pro seu contexto

1. Edite `SAVINGS_HEURISTICS` em `scripts/savings-report.mjs`
2. Documente o motivo num commit
3. Re-rode `/savings` — números refletirão os novos valores

Ou exponha via `.bot/savings-config.json` (futuro — ver roadmap em `policies/savings-metrics.md`).

## Roadmap

- v2.5.0: ajuste por arquivo (tokens-per-file real em vez de média)
- v2.5.0: cache hit detection via Anthropic API response metadata
- v2.6.0: comparação histórica ("sua semana vs semana passada")
- v2.6.0: integração com Linear/Jira para correlar com bugs reais reportados
- v2.7.0: export pra Datadog/Grafana via OpenTelemetry

## Referências

- `scripts/savings-report.mjs` — implementação
- `commands/savings.md` — slash command
- `hooks/scripts/stop-savings-summary.mjs` — mini-resumo automático
- `skills/30-cost-tracker/SKILL.md` — skill complementar (custo de APIs externas)
- IBM SystemSciences / Capers Jones — cost of defect research
- Microsoft Research — dev hours per defect
