# Source-Driven Development Policy

**Status:** active
**Applies to:** all skills that make framework/library decisions

---

## Problema

O agente toma decisões sobre frameworks e libs baseado em training data que pode estar desatualizado.
Isso gera código que usa APIs deprecated, flags renomeadas, ou patterns obsoletos para a versão em uso.

---

## Hierarquia de Fontes

Para toda decisão de API, config, ou pattern de framework/lib, use fontes nesta ordem de prioridade:

1. **Documentação oficial** — docs site do projeto, README do repo, API reference
2. **Changelogs / Release notes** — da versão específica em uso no projeto
3. **MDN / specs oficiais** — para web APIs (HTML, CSS, Web APIs)
4. **GitHub issues do repo** — para bugs conhecidos, workarounds confirmados pelos maintainers

**Nunca usar como fonte primária:**
- StackOverflow (pode estar desatualizado, respostas votadas != corretas para sua versão)
- Blog posts aleatórios
- Respostas de IA sem citação de fonte
- Docs de uma versão diferente da que o projeto usa

---

## Regras

1. **Verificar versão primeiro.** Antes de buscar docs, checar a versão da lib no projeto
   (`package.json`, `pyproject.toml`, `go.mod`, `Cargo.toml`). Doc da v15 não vale para projeto em v13.

2. **Buscar antes de implementar.** Para decisões de API/config de framework, buscar via:
   - Context7 MCP: `resolve-library-id` → `query-docs`
   - Web search com "site:docs.nextjs.org" ou equivalente
   - Leitura direta de CHANGELOG.md no repo da lib

3. **Citar inline.** Quando recomendar uma API, config, ou pattern específico de lib, incluir referência:
   ```
   [fonte: Next.js 15 docs/app-router/caching]
   [fonte: Prisma docs/concepts/components/prisma-client/crud]
   ```

4. **Flag quando não encontrar.** Se a doc oficial não for encontrada ou estiver ambígua:
   ```
   ⚠ Não encontrei doc oficial para [X] na versão [Y].
   Opções: A) prosseguir com base em conhecimento geral (risco de deprecation)
            B) buscar alternativa com doc oficial clara
            C) testar e verificar output antes de usar em produção
   ```

5. **Exceções.** Patterns genéricos de linguagem (loops, tipos primitivos, estruturas básicas)
   não precisam de fonte — apenas uso específico de libs/frameworks externas.

---

## Como Usar Context7 MCP

```
1. resolve-library-id: "nextjs" → /vercel/next.js
2. query-docs: /vercel/next.js, topic: "app router caching", version: "15"
```

---

## Complementar a

- `policies/search-first.md` — pesquisa antes de implementar; source-driven define *quais fontes* usar
- `policies/iterative-retrieval.md` — como estruturar rounds de retrieval de docs externas
