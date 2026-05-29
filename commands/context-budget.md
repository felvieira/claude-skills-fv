---
name: context-budget
description: Audita o peso de contexto carregado na sessão (skills, agents, MCP, rules, CLAUDE.md) e reporta tokens estimados por componente com recomendações de corte.
---

# /context-budget

Audita o **overhead de contexto fixo e dinâmico** da sessão atual.

**Diferença do `/savings`:** savings mostra tokens economizados pelo kit em runtime; context-budget mostra o que já está carregado no context window antes de qualquer completion.

## O que faz

1. Varre componentes fixos: `CLAUDE.md` (global + projeto), `GLOBAL.md`, `agents/*.md`, descrições de MCP ativos
2. Varre componentes dinâmicos: rules ativadas nesta sessão, skills invocadas, histórico acumulado
3. Estima tokens por componente (bytes ÷ 4, aproximação BPE)
4. Reporta tabela com % do budget e headroom disponível
5. Emite alertas se algum componente está inchado ou se o total ultrapassa 80% do context window

## Quando usar

- Sessão lenta ou com respostas degradadas (possível context overflow)
- Após instalar novo MCP server — ver impacto real
- Antes de `/swarm` ou `/loop --parallel` — garantir headroom suficiente
- Repo novo com `.bot/` — verificar o que foi instalado

## Invocação

```
/context-budget
```

Skill carregada: `dev-team-kit-fv:49-context-budget`

## Output esperado

```
## Context Budget — [repo] — [data]

### Fixo (~14.400 tokens, 72% do subtotal)
- CLAUDE.md global: ~2.400 tokens
- agents/ (16): ~8.000 tokens
- MCP servers (N): ~X tokens
...

### Dinâmico (esta sessão)
- rules/common/: ~3.200 tokens
- skills invocadas: ~N tokens
- histórico: ~N tokens

### Status: ✅ Saudável | ⚠️ Atenção | 🚨 Overflow iminente
### Headroom: X tokens (Y%)

### Recomendações (se houver)
...
```
