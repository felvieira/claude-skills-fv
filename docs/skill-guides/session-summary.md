# Session Summary — Guia Estendido

![Skill](https://img.shields.io/badge/skill-31-blue)
![Role](https://img.shields.io/badge/role-session--summary-6366f1)

Guia auxiliar da skill `31-session-summary` para estrutura do handoff, exemplos de resumo e uso com MCP.

## Quando abrir este guia

- quando a sessao foi longa e o handoff precisa ser mais granular
- quando o proximo agente ou dev nao tem contexto nenhum do projeto
- quando o resumo precisa incluir decisoes tecnicas complexas

## Estrutura do Resumo de Sessao

Um resumo eficaz de sessao deve cobrir exatamente isso — nada mais:

```markdown
## Sessao [data] — [projeto]

### Concluido
- [artefato ou mudanca] — [arquivo ou localizacao]

### Decisoes
- [decisao] — [motivo em uma linha]

### Pendencias
- [o que ainda falta fazer]

### Blockers
- [o que esta bloqueando] — [quem ou o que desbloqueia]

### Proximo passo recomendado
- [acao especifica com skill sugerida]
```

## Regras de Handoff

- **nao incluir** codigo inline — referenciar arquivo e linha
- **nao incluir** historico de conversa — apenas estado final
- **nao incluir** o que o agente tentou e nao funcionou — apenas o que esta valido agora
- **incluir** paths completos de arquivos criados ou modificados
- **incluir** warnings sobre estados frageis ou dependencias externas

## Onde Salvar

Por padrao salvar em `docs/session/[data]-summary.md` do projeto consumidor.
Se o MCP estiver disponivel, usar `devkit_session_summary` para persistencia automatica.

## Diferenca: Session Summary vs Context Manager

| Aspecto | Session Summary | Context Manager |
|---------|-----------------|-----------------|
| Escopo | sessao inteira | task especifica |
| Quando | ao encerrar sessao | entre steps do pipeline |
| Audiencia | proximo agente/dev | agente atual |
| Formato | markdown livre | estruturado por task |

## Exemplo de Uso com MCP

```
devkit_session_summary({
  completed: ["implementou skill 32", "corrigiu install.sh"],
  decisions: ["mcp-server copiado pelo install.sh", "persist tools = 7"],
  pending: ["evals para 28-32"],
  blockers: [],
  next: "rodar Repo Auditor no projeto consumidor"
})
```
