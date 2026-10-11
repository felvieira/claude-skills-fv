---
name: context-budget
description: Audita o peso de contexto carregado na sessão (skills, agents, MCP, rules, CLAUDE.md) e reporta tokens estimados por componente com recomendações de corte.
---

# /context-budget

Audita o **overhead de contexto fixo e dinâmico** da sessão atual.

**Diferença do `/savings`:** savings mostra tokens economizados pelo kit em runtime; context-budget mostra o que já está carregado no context window antes de qualquer completion.

## O que faz

1. Identifica instruções raiz efetivamente carregadas e saída de hooks da sessão
2. Separa o catálogo (name+description de **todas** as skills do plugin, todo turno) do body lazy (SKILL.md só quando Skill() dispara) e das rules ativas
3. Estima tokens observáveis com caracteres ÷ 4 (aproximação, não telemetria do modelo)
4. Reporta catálogo de MCP/agents ativos apenas se o host expuser descrições reais
5. Calcula headroom somente se o limite da janela e o uso da sessão forem conhecidos

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

```text
## Context Budget — [repo] — [data]
Instruções raiz: N caracteres (~N/4 tokens estimados)
Hook SessionStart: N caracteres (~N/4)
Skills invocadas/rules ativas: ...
MCP/agents ativos: mensurado pelo host | indisponível
Arquivos apenas instalados: não somados ao contexto
Janela/headroom: mensurado | não disponível
Recomendações: apenas para componentes comprovadamente carregados
```
