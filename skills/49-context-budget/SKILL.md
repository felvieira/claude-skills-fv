---
name: context-budget
description: |
  Audita o peso de contexto efetivamente observável na sessão — instruções raiz, hooks,
  MCP anunciados, rules ativas e skills invocadas. Estima tokens; headroom apenas
  quando o host informa janela e uso real. Distinto do cost-tracker (skill 30).
  Trigger em: "contexto inchado", "context overflow", "quanto contexto estou usando",
  "sessao lenta", "respostas degradadas", "context budget", "tokens carregados",
  "custo fixo de contexto", "overhead de rules", "overhead dos agents",
  "impacto do MCP no contexto", "headroom de contexto"
metadata:
  id: 49-context-budget
  version: 1.0.0
  tags: [observability, context, performance, tokens, budget]
---

# Skill 49 — Context Budget

## Objetivo

Auditar o peso **observável** de contexto carregado nesta sessão: instruções raiz, saída de hooks, regras ativas, skills invocadas e catálogo de tools MCP habilitadas. Não confunda bytes em disco com tokens enviados ao modelo.

**Distinção crítica:**
- Skill 30 (`cost-tracker`) → rastreia tokens/$ gastos em runtime (completions, tool calls)
- **Skill 49 (`context-budget`)** → audita tokens carregados no contexto antes de qualquer completion (system prompt, CLAUDE.md, rules, skills, MCP descriptions)

## Quando usar

- Sessão com latência alta ou model degradation (possível context overflow)
- Repo novo com `.bot/` — auditoria do que foi instalado
- Antes de habilitar novo MCP server ou subagent
- Após instalar rules system path-scoped — verificar overhead real
- Quando `/savings` mostrar contexto inchado

## Protocolo

### Fase 0 — Identificar componentes carregados

Listar o que está no contexto da sessão:

```
1. Instruções raiz efetivamente carregadas (AGENTS.md/CLAUDE.md, global e projeto, conforme host)
2. Catalogo de skills do plugin: name + description de TODAS as skills habilitadas (todo turno; nao e lazy)
3. Body de SKILL.md / subagents invocados nesta sessao (lazy — so os disparados)
4. Rules path-scoped ativas nesta tarefa
5. Descrições/schema de tools MCP realmente anunciadas pelo host (todo turno, por servidor enabled)
6. Contexto adicional emitido por hooks, arquivos lidos e histórico desta sessão
```

### Fase 1 — Estimar peso por componente

Estimar tokens somente para componentes **observados**, com caracteres ÷ 4 como proxy explícito:

- Bytes no arquivo medem armazenamento, não provam que o host carregou aquele arquivo.
- `scripts/skill-catalog-budget.mjs` e `scripts/skill-health.mjs` reportam inventário local em chars e bytes; seus tokens são **proxy, não medição**.
- Descrições/schema de MCP ou agents são diferentes dos corpos completos em `agents/*.md`; sem catálogo runtime, reportar como não mensurado.
- Histórico, prefixo de sistema e cache do provedor exigem telemetria da sessão para medição real; não inventar percentual de headroom.

Para separar as camadas:

1. **Em disco:** bytes UTF-8 dos arquivos conhecidos.
2. **Inventário de catálogo:** `name + description` encontrados no frontmatter; não afirmar que o host injetou todos.
3. **Payload observado:** capture o JSON do hook e passe `--observed <arquivo>` aos scripts; conte `systemMessage`/`additionalContext`.
4. **Host não exposto:** MCP, prefixo, cache, histórico e skills não anunciadas permanecem “não mensurados”.

Não execute `--apply` durante uma auditoria. A compactação pode descartar triggers; revise o relatório e rode os evals antes de qualquer mudança.

### Fase 2 — Categorizar por urgência

| Categoria | Fonte | Como medir |
|---|---|---|
| **Sempre presente quando o host carrega** | Instruções raiz, `name`+`description` de cada skill do plugin, schema das tools MCP enabled | Medir os arquivos/payloads reais. Catalogo do kit: `node scripts/skill-catalog-budget.mjs` |
| **Sob demanda** | Body do SKILL.md e corpos de subagents invocados | Verificar os invocados |
| **Path-scoped** | .claude/rules/*.md | Verificar paths/globs ativados |
| **Histórico** | Conversa acumulada | Consultar telemetria do host |

### Fase 3 — Relatório de budget

Reporte, quando observável, caracteres e estimativa por fonte: instruções raiz (global/projeto), saída real dos hooks, skills invocadas, rules ativas e catálogo MCP habilitado. Informe separadamente o que está **apenas em disco** e o que o host não expôs. Use tamanho de janela do modelo somente se comprovado pela sessão; sem isso, não estime headroom nem use tabelas fictícias como evidência.

### Fase 4 — Alertas de overflow

Use o limite efetivo da janela do modelo fornecido pelo host, se disponível. Calcule alertas em 80% e 95% da janela **medida**; sem limite ou histórico da sessão, apenas descreva crescimento observado, sem declarar overflow.

**Sinais de overflow iminente:**
- Respostas ficam genéricas ou "esquecem" instruções anteriores
- Tool calls começam a falhar com erros estranhos
- `/savings` mostra context_tokens subindo exponencialmente

**Ações corretivas:** reduza leitura/reinjeção desnecessária; carregue skill e rule quando o alvo justificar; desabilite MCP não usado **apenas após verificar os ativos e obter aprovação para modificar configuração**. Para histórico longo, compacte de forma controlada ou abra sessão nova com handoff. Não altere agentes globais baseado só no inventário de arquivos.

## Integração com kit

- Invocar após `/savings` quando contexto parecer inchado
- Invocar antes de habilitar novo MCP server
- Usar em conjunto com skill 30 (cost-tracker) para visão completa: custo fixo (contexto) + custo variável (completions)
- Output de Fase 3 pode ser salvo em `memory/context-budget-YYYY-MM-DD.md`

## Exemplo de invocação

```
Skill({ skill: "dev-team-kit-fv:49-context-budget" })
// Carrega playbook; agente executa Fases 0-3 e reporta
```

Ou via comando:
```
/context-budget
```
