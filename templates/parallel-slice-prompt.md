# Template — Prompt Self-Contained para Slice Paralelo

Use este template ao despachar `Agent({ subagent_type: "general-purpose", isolation: "worktree", ... })` para paralelizar slices de uma feature.

**Por que self-contained?** O subagent não vê sua conversa. Tudo que ele precisa pra implementar o slice precisa estar no prompt. Citar nome de skill no prompt **não invoca a skill** — o prompt precisa instruir explicitamente a invocação via `Skill` tool.

---

## Estrutura mínima

```markdown
# Slice <N>: <título curto>

## Passo 1 OBRIGATÓRIO (antes de qualquer ação)

Invoque a Skill tool para carregar o playbook relevante:
`Skill({ skill: "dev-team-kit-fv:<NN-name>" })`

(Liste todas as skills necessárias — uma por linha — se mais de uma.)

## Contexto (você não vê a conversa principal)

- **Repo:** <path absoluto>
- **Branch base:** <branch>
- **Worktree:** você já está num worktree isolado — todas as mudanças ficam aqui
- **Stack relevante:** <linguagens, framework, runtime>
- **Arquivos provavelmente tocados:** <lista de paths>
- **Padrões a seguir:** <policies/X.md, policies/Y.md>

## Critérios de aceitação

- [ ] <critério 1, mensurável>
- [ ] <critério 2>
- [ ] <critério 3>

## Dependências externas

- <APIs, libs, contratos>
- <decisões já tomadas em outros slices, com link/refs>

## Não fazer

- <coisas explicitamente fora do escopo deste slice>
- <padrões a evitar>

## Output esperado

- Commit(s) atômicos no worktree atual
- Testes adicionados/atualizados onde fizer sentido
- Resumo final em ≤200 palavras com:
  - lista de arquivos tocados
  - decisões importantes
  - próximo passo recomendado se houver
- **Não abra PR** — o orquestrador consolida ao fim
```

---

## Exemplo concreto

```markdown
# Slice 2: Mirror Page Redesign

## Passo 1 OBRIGATÓRIO

Invoque, em ordem:
1. `Skill({ skill: "dev-team-kit-fv:04-frontend-integration" })`
2. `Skill({ skill: "dev-team-kit-fv:02-ui-ux-design" })`

## Contexto

- **Repo:** D:/Repos/example-app
- **Branch base:** main
- **Worktree:** já isolado em .swarm/<id>/workspace
- **Stack:** Next.js 14, React 18, Tailwind, shadcn/ui, TypeScript strict
- **Arquivos prováveis:** app/mirror/page.tsx, app/mirror/components/**, lib/mirror/state.ts
- **Padrões:** policies/vertical-slices.md, policies/source-driven.md, docs/repo-audit/current.md

## Critérios de aceitação

- [ ] Loading skeleton em < 100ms (Lighthouse FCP)
- [ ] Estado vazio com CTA "Adicionar primeiro espelho"
- [ ] Lista paginada (10 itens/página), keyboard nav (Tab/Enter)
- [ ] Acessibilidade: WCAG AA, screen reader friendly, sem motion forçada
- [ ] Teste e2e Playwright cobrindo happy path + estado vazio

## Não fazer

- Não tocar em app/api/mirror/* — outro slice cuida do backend
- Não criar novos design tokens — reuse os existentes em tailwind.config.ts
- Não adicionar dependências novas sem justificar

## Output esperado

- Commits atômicos no worktree
- ≥1 teste e2e novo em tests/e2e/mirror.spec.ts
- Resumo ≤200 palavras
- **Não abrir PR** — orquestrador consolida.
```

---

## Anti-padrões

❌ **Não fazer:** "use a skill 04-frontend-integration para implementar"
✅ **Fazer:** "Passo 1 OBRIGATÓRIO: invoque `Skill({ skill: \"dev-team-kit-fv:04-frontend-integration\" })`"

❌ **Não fazer:** prompt curto "implemente o mirror redesign"
✅ **Fazer:** prompt com critérios de aceitação mensuráveis, files alvo, padrões aplicáveis

❌ **Não fazer:** referenciar "a conversa anterior" ou "como discutimos"
✅ **Fazer:** inline tudo que o subagent precisa saber

❌ **Não fazer:** múltiplos slices num único prompt
✅ **Fazer:** um Agent call por slice, paralelizados em single message com N tool calls

---

## Pós-dispatch (no orquestrador)

Após os N subagents retornarem:

1. Verificar status (sucesso/falha/parcial) de cada slice
2. Consolidar diffs em branch único OU manter worktrees separados
3. Rodar suite completa de testes no branch consolidado
4. Despachar review (4 agents paralelos via `/swarm` Phase 3 ou manual)
5. Aplicar fixes CRITICAL/HIGH (self-fix automático)
6. Abrir PR único OU PRs separados por slice (decisão do orquestrador)

Ver `skills/40-parallel-dispatcher/SKILL.md` para playbook completo.
