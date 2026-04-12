# Iterative Retrieval Policy

**Status:** active  
**Applies to:** subagents, delegated skills, any operation needing incremental context

---

## O Pattern

Quando uma skill ou subagent precisa de contexto para executar uma task complexa, o retrieval deve ser progressivo:

**Round 1 — Orientação:**
- Ler `docs/repo-audit/current.md` (se existir)
- Glob para entender estrutura de diretórios relevante
- Identificar 3-5 arquivos-chave

**Round 2 — Foco:**
- Read dos arquivos-chave identificados no Round 1
- Grep por patterns específicos da task
- Mapear dependências diretas

**Round 3 — Profundidade (se necessário):**
- Read de arquivos de dependência
- Busca de tests relacionados
- Consulta de docs externas (Context7, web search)

---

## Regras

1. **Máximo 3 rounds** — se após 3 rounds o contexto ainda é insuficiente, escalar para o orchestrator
2. **Cada round deve ter objetivo claro** — "entender a estrutura" vs "mapear dependências" vs "validar approach"
3. **Não repetir reads** — se um arquivo já foi lido, não reler (a menos que tenha sido editado)
4. **Handoff entre rounds** — cada round termina com uma lista do que falta (gap list)
5. **Aplicável a:** subagents, skills delegadas, qualquer operação que precise de contexto incremental
6. **Não aplicável a:** tasks triviais (1 arquivo, scope claro), hotfixes isolados

---

## Formato de Handoff

```
Round N completo.
Contexto obtido: [lista]
Gaps restantes: [lista]
Próximo round necessário: sim/não
```

---

## Complementar a

- `policies/search-first.md` — pesquisa antes de implementar; iterative-retrieval define *como* fazer essa pesquisa
- `policies/cost-optimization.md` — retrieval progressivo evita dumps de contexto desnecessários
