---
id: 49-context-budget
name: context-budget
version: 1.0.0
tags: [observability, context, performance, tokens, budget]
---

# Skill 49 — Context Budget

## Objetivo

Auditar o peso de contexto carregado em uma sessão Claude Code: quais skills/agents/MCP/rules/CLAUDE.md estão contribuindo para o overhead de tokens, quanto custa cada componente, e o que pode ser cortado ou adiado sem perder funcionalidade.

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
1. CLAUDE.md (global + projeto)
2. .claude/rules/**/*.md (path-scoped — quais foram ativados?)
3. skills/ carregadas via Skill() nesta sessão
4. agents/ descrições (sempre presentes no system prompt)
5. MCP server descriptions (presentes para cada server ativo)
6. Arquivos abertos/lidos na sessão
7. Histórico de conversa acumulado
```

### Fase 1 — Estimar peso por componente

Para cada componente, estimar tokens:

```
regra geral: ~4 chars por token (aproximação BPE)

- ler tamanho do arquivo em bytes
- tokens ≈ bytes / 4
- overhead real pode ser 10-20% maior (BPE não é linear)
```

**Comando de varredura rápida:**

```bash
# Peso dos arquivos de contexto fixo
find . -name "CLAUDE.md" -o -name "GLOBAL.md" | xargs wc -c 2>/dev/null

# Peso das rules ativas
find .claude/rules/ -name "*.md" | xargs wc -c 2>/dev/null

# Peso dos agents (sempre no system prompt)
find agents/ -name "*.md" | xargs wc -c 2>/dev/null

# Peso das skills (sob demanda — verificar quais foram invocadas)
find skills/ -name "SKILL.md" | xargs wc -c 2>/dev/null | tail -1
```

### Fase 2 — Categorizar por urgência

| Categoria | Critério | Ação |
|-----------|----------|------|
| **Sempre presente** | CLAUDE.md, GLOBAL.md, agents/*.md, MCP descriptions | Auditar tamanho, propor corte |
| **Sob demanda** | skills/ via Skill() | Verificar se foi invocada sem necessidade |
| **Path-scoped** | .claude/rules/*.md | Verificar se paths: glob está restrito |
| **Histórico** | Conversa acumulada | Considerar `/clear` ou nova sessão |

### Fase 3 — Relatório de budget

Output padrão:

```
## Context Budget — [repo] — [data]

### Componentes fixos (sempre carregados)
| Componente          | Arquivo              | Tokens est. | % budget |
|---------------------|---------------------|-------------|----------|
| CLAUDE.md (global)  | ~/.claude/CLAUDE.md  | ~2.400      | 12%      |
| CLAUDE.md (projeto) | ./CLAUDE.md          | ~800        | 4%       |
| GLOBAL.md           | ./GLOBAL.md          | ~1.200      | 6%       |
| agents/ (16 agents) | agents/*.md          | ~8.000      | 40%      |
| MCP descriptions    | (runtime)            | ~2.000      | 10%      |
| **Subtotal fixo**   |                      | **~14.400** | **72%**  |

### Componentes dinâmicos (esta sessão)
| Componente           | Tokens est. | Necessário? |
|----------------------|-------------|-------------|
| rules/common/*.md    | ~3.200      | ✓ se editando código |
| rules/typescript/*.md| ~800        | ✓ se arquivo .ts ativo |
| skill 09-orchestrator| ~1.200      | ✓ foi invocada |
| skill 11-reviewer    | ~900        | ? verificar |
| histórico conversa   | ~4.000      | — acumula   |
| **Subtotal dinâmico**| **~10.100** | —           |

### Resumo
- **Total estimado:** ~24.500 tokens (~98 KB)
- **Budget disponível (claude-sonnet-4.5):** 200.000 tokens
- **Headroom:** ~175.500 tokens (88%)
- **Status:** ✅ Saudável

### Recomendações
1. `agents/*.md` representa 40% do budget fixo — considerar frontmatter description mais curto
2. `rules/common/` sempre presente — OK para repo de código
3. Histórico acumula ~500 tokens/turno — considerar `/clear` a cada 50 turnos
```

### Fase 4 — Alertas de overflow

Thresholds por modelo:

| Modelo | Context window | Alerta (80%) | Crítico (95%) |
|--------|---------------|--------------|---------------|
| claude-haiku-3.5 | 200k tokens | 160k | 190k |
| claude-sonnet-4.5 | 200k tokens | 160k | 190k |
| claude-opus-4.5 | 200k tokens | 160k | 190k |

**Sinais de overflow iminente:**
- Respostas ficam genéricas ou "esquecem" instruções anteriores
- Tool calls começam a falhar com erros estranhos
- `/savings` mostra context_tokens subindo exponencialmente

**Ações corretivas:**
```
1. /clear — descarta histórico (mantém system prompt)
2. Nova sessão — fresh start completo
3. Remover MCP servers não usados (claude mcp remove <name>)
4. Encurtar agents/*.md descriptions
5. Revisar .claude/rules/ — paths: glob muito amplo?
```

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
