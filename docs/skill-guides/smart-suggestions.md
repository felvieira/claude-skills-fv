# Smart Suggestions — Guia Estendido

![Skill](https://img.shields.io/badge/skill-32-blue)
![Role](https://img.shields.io/badge/role-smart--suggestions-f59e0b)

Guia auxiliar da skill `32-smart-suggestions` para criterios de priorizacao, exemplos de output e integracao com o pipeline.

## Quando abrir este guia

- quando as sugestoes precisam considerar restricoes externas (deadline, freeze de release, etc.)
- quando o projeto e novo para o agente e nao ha auditoria ainda
- quando o usuario quer entender o criterio de priorizacao usado

## Criterios de Priorizacao

O Smart Suggestions usa esta ordem para rankear acoes:

1. **Blocker ativo** — existe algo impedindo progresso? Resolver primeiro.
2. **Risco de regressao** — mudanca recente sem QA ou Security? Cobrir agora.
3. **Impacto no usuario** — qual acao entrega mais valor visivel?
4. **Custo de postergacao** — o que fica mais caro se esperar?
5. **Dependencia** — existe outra skill que precisa ser feita antes?

## Formato das Sugestoes

```markdown
## Proximas Acoes Sugeridas

1. **[Acao]** — [motivo em uma linha]
   Skill: [nome da skill]
   Contexto: [o que esta disponivel para usar]

2. **[Acao]** — [motivo em uma linha]
   Skill: [nome da skill]
   Contexto: [o que esta disponivel para usar]

3. **[Acao]** — [motivo em uma linha]
   Skill: [nome da skill]
   Contexto: [o que esta disponivel para usar]
```

Maximo 5 sugestoes. Se houver blocker, listar primeiro com destaque.

## Inputs que Melhoram as Sugestoes

- `docs/repo-audit/current.md` — stack e estado atual do projeto
- `docs/session/[ultima]-summary.md` — o que foi feito na sessao anterior
- output do Context Manager — tasks em progresso e pendencias
- tipo de deadline ou restricao, se o usuario mencionar

## Anti-patterns

- sugerir mais de 5 opcoes — paralisa o usuario
- sugerir refactor quando ha bug aberto — prioridade errada
- sugerir task da skill errada (ex: sugerir Design Intelligence quando o projeto nao tem UI)
- listar sugestoes sem justificativa — o usuario nao sabe qual escolher

## Integracao com Pipeline

O Smart Suggestions e acionado naturalmente em dois momentos:
1. **Entre steps** — quando uma skill conclui e o orquestrador precisa decidir proximo passo
2. **Inicio de sessao** — quando o usuario nao sabe por onde comecar

Em ambos os casos, o output e uma lista curta, nao um plano completo. O plano completo e responsabilidade do Orchestrator.
