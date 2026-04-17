# Subagents — Guia de Uso

Os 5 subagents do Dev Team Kit são especialistas isolados despacháveis via `Task` tool no Claude Code.
Cada um tem ferramentas restritas ao mínimo necessário para sua especialidade.

---

## Quando usar subagent vs skill direta

| Situação | Use |
|---|---|
| Precisa de isolamento — não quer misturar contextos | Subagent |
| Tarefa bem definida para um especialista único | Subagent |
| Trabalho em paralelo com outra tarefa | Subagent (background) |
| Precisa da lógica completa do pipeline (handoffs, policies) | Skill direta |
| Task de 5 minutos no mesmo contexto | Skill direta |

---

## `code-reviewer` — Revisor Senior

**Quando usar:**
- Antes de qualquer merge — nunca aprovar sem review independente
- Após completar uma feature para capturar o que o autor não vê
- Para validar código de terceiros ou bibliotecas externas

**Não usar para:**
- Implementar fixes — ele só revisa, não implementa
- Tasks de 1 linha — overhead não compensa

**Exemplo:**
```
Task code-reviewer: revise os arquivos modificados em src/auth/ nos últimos commits
```

**Output:** status (Approved / Changes requested) + findings por severity (🔴🟡🔵)

---

## `security-auditor` — Auditor de Segurança

**Quando usar:**
- Antes de qualquer deploy de feature que toca auth, input do usuário, dados PII
- Quando integrar bibliotecas de terceiros (supply chain risk)
- Ao receber relatório de vulnerabilidade para triagem

**Não usar para:**
- Code review geral sem foco de segurança — use `code-reviewer`
- Auditoria de infra/cloud — está fora do escopo de app

**Exemplo:**
```
Task security-auditor: audite o endpoint POST /api/upload em src/routes/upload.ts
```

**Output:** findings com PoC para 🔴, checklist OWASP, decisão final

---

## `test-engineer` — QA Prove-It

**Quando usar:**
- Após implementar uma feature para garantir cobertura
- Quando um bug é corrigido — teste de regressão obrigatório
- Quando a suite de testes existe mas gaps são evidentes

**Não usar para:**
- Refactor — mudanças estruturais exigem outro contexto
- Descoberta de bugs — use `debugger` para diagnóstico antes dos testes

**Exemplo:**
```
Task test-engineer: escreva testes para src/lib/auth.ts cobrindo happy path, erros e edge cases
```

**Output:** relatório de cobertura + gaps identificados + testes implementados

---

## `orchestrator` — Tech Lead / Pipeline

**Quando usar:**
- Task nova e você não sabe qual skill invocar primeiro
- Pipeline de uma feature complexa com muitas dependências
- Após rejeição de uma skill para decidir próxima etapa
- Quando há conflito entre duas skills sobre responsabilidade

**Não usar para:**
- Substituir a execução especializada — ele planeja, não implementa
- Tasks triviais de 1 skill — overhead não compensa

**Exemplo:**
```
Task orchestrator: classifique esta task e defina o pipeline: "adicionar OAuth2 ao login com Google"
```

**Output:** tipo da task + pipeline ordenado + skills puladas com justificativa + próxima etapa

---

## `debugger` — Diagnóstico de Root Cause

**Quando usar:**
- Bug que você não consegue explicar com 2 minutos de análise
- Comportamento inesperado sem stack trace claro
- Teste falhando de forma inconsistente (flaky)
- Depois de 2+ tentativas de fix sem sucesso

**Não usar para:**
- Bugs óbvios de typo ou import errado — resolva diretamente
- Análise de performance — fora do escopo de root cause

**Exemplo:**
```
Task debugger: TypeError: Cannot read properties of undefined (reading 'id') em src/api/users.ts:42 após refactor do AuthContext
```

**Output:** hipóteses rankeadas + evidências coletadas + root cause em 1 frase + fix mínimo aplicado + verificação

---

## Session Intelligence — Tools MCP Relacionadas

Após qualquer sessão longa, as seguintes MCP tools consultam o histórico de tool calls (`.auto/events.jsonl`):

| Tool | Quando usar |
|---|---|
| `devkit_seen_files` | "Quais arquivos vi/editei nesta sessão?" |
| `devkit_seen_errors` | "Que erros se repetiram? Há um padrão?" |
| `devkit_session_events` | Query filtrada: tool específico, só erros, janela de tempo |
| `devkit_compress_output` | Antes de colar output longo de bash no contexto |

---

## Boas Práticas

1. **Seja específico no dispatch** — "revise src/auth/" é melhor que "revise o código"
2. **Um subagent por concern** — não peça ao `code-reviewer` para também escrever testes
3. **Use background para paralelismo** — `code-reviewer` e `security-auditor` podem rodar simultaneamente
4. **Não repasse contexto desnecessário** — o subagent lê os arquivos por conta própria
5. **Aja sobre o output** — o subagent identifica, você decide se aplica os fixes
