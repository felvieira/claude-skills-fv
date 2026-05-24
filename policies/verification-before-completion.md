# Verification Before Completion

**Princípio:** evidence before assertions. Antes de declarar "feito", "funcionando", "passando" ou "fixed" — **rodar comando que prova** e mostrar a saída.

## A Iron Law (do obra/superpowers)

> **NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE**

Se você não rodou o comando de verificação **nesta mesma resposta**, você não pode afirmar que passou. Verificação de 3 mensagens atrás não conta — o estado pode ter mudado. Verificação parcial não conta. Confiança não conta. Só evidência fresca conta.

## Gate Function

Antes de qualquer claim de status ou expressão de satisfação:

1. **IDENTIFICAR:** qual comando prova essa claim?
2. **RODAR:** executar o comando completo (fresh, não cached)
3. **LER:** output inteiro, conferir exit code, contar failures
4. **VERIFICAR:** o output confirma a claim?
   - Se NÃO: declarar status real com evidência
   - Se SIM: declarar claim COM a evidência colada
5. **SÓ ENTÃO:** fazer a claim

Pular qualquer passo = mentir, não verificar.

**Quando aplicar (obrigatório):**
- antes de marcar task como done
- antes de commit que diz "fix X" ou "implement Y"
- antes de PR
- antes de `/ship`
- ao responder usuário com "está pronto" / "funcionando" / "testes passando"

## A regra

**Nunca afirme sem evidência.** Sempre que for fazer uma claim sobre estado do código:

| Claim | Evidência exigida |
|---|---|
| "tests pass" | output de `npm test` / `pytest` / `cargo test` mostrando 0 failures |
| "build works" | output de `npm run build` / `cargo build` com exit 0 |
| "lint clean" | output de `npm run lint` mostrando 0 errors |
| "feature works" | output de `curl` / `playwright` / screenshot mostrando comportamento |
| "bug fixed" | (1) output mostrando bug antes (2) output mostrando bug ausente após fix |
| "deployed" | URL acessível + healthcheck retornando 200 |
| "performance improved" | benchmark antes vs depois |

## Anti-padrões

### Confidence claims sem verificação

```
❌ "I've fixed the bug. The function now handles edge cases correctly."
✅ "Fix applied. Test output:
    PASS  src/parser.test.ts
      ✓ handles empty input (3ms)
      ✓ handles unicode (5ms)
   3 tests passed."
```

### Verificar a coisa errada

```
❌ Bug é em produção, mas só rodou unit test local
✅ Reproduzir o bug exatamente como o usuário viu (mesma versão, mesmo input)
```

### Verificação parcial declarada como completa

```
❌ "Tests pass" (mas só rodou tests do arquivo modificado)
✅ "Tests pass for affected suite (parser.test.ts).
    Skipped: full suite — would take 15min. Recommend CI run before merge."
```

### Skip por conveniência

```
❌ "Skipping verification — change is trivial"
✅ Trivial change ainda merece `git diff` mostrado + 1 smoke check
```

## Red Flags — STOP imediato (do obra/superpowers)

Se você está prestes a usar qualquer destas palavras/frases sem ter rodado verificação fresca **nesta mesma resposta**, pare:

- "should work", "probably", "seems to", "deve funcionar", "imagino que"
- "Great!", "Perfect!", "Done!", "Pronto!", "Show!", "Beleza!" antes de mostrar evidência
- Prestes a commit/push/PR sem evidência colada
- Confiar em report de subagent ("agent said success") sem checar diff/output
- "Tests pass" tendo rodado só lint
- "Só dessa vez"
- "Tô cansado, quero fechar"
- Qualquer palavra que **implique** sucesso sem ter rodado verificação

## Rationalization Prevention (do obra/superpowers)

Tabela de desculpas comuns e a realidade:

| Desculpa | Realidade |
|---|---|
| "Should work now" | RODE a verificação |
| "Estou confiante" | Confiança ≠ evidência |
| "Só dessa vez" | Sem exceções |
| "Linter passou" | Linter ≠ compilador |
| "Subagent disse que funcionou" | Verificar independente (git diff, output) |
| "Estou cansado" | Cansaço ≠ desculpa |
| "Verificação parcial é o bastante" | Parcial não prova nada |
| "Mudei a palavra, regra não se aplica" | Spirit over letter |
| "Só mudei comentário" | Comentário ≠ trivial se afeta build/docs |

## Workflow padrão

1. Implementar a mudança
2. **Rodar comando de verificação** (test/build/lint/curl)
3. **Capturar output completo** — não resumir
4. **Ler o output** — failure escondida em meio a 200 linhas é fácil de pular
5. Se falhou: voltar a 1
6. Se passou: incluir trecho do output no commit message ou PR description

## Quando verificação custosa

Se rodar verificação completa custa muito (15min de CI, build de 10GB):
- Rodar **subset relevante** (suite afetada, módulo modificado)
- **Declarar explicitamente** o que foi e não foi rodado
- **Recomendar** run completo no próximo gate (PR, CI)
- **Nunca** marcar como "done" sem subset rodando

## Integração com skills

- skill 05 (qa-testing) — aplica esta policy em todo write de teste
- skill 11 (reviewer) — gate: rejeita PR cuja descrição alega "tests pass" sem output anexado
- skill 24 (release-manager) — `/ship` exige evidência de cada gate (test, security, perf)
- skill 37 (tdd-engineer) — TDD red→green→refactor cada passo verificado
- `/auto`, `/loop` — auto-loop tem circuit breaker; mas final claim de "done" precisa output verificável

## Commit message pattern

Commits que afirmam comportamento devem citar evidência:

```
fix(parser): handle empty input edge case

Reproduces issue #142 with empty string input.
Test output:
  PASS  src/parser.test.ts (4 tests, 12ms)
Manual smoke test:
  $ echo '' | node parser.js
  → returns null (was: crash)
```

## Por que isso importa

Agentes têm tendência a "performar conclusão" — declarar done para fechar o ciclo da conversa. Isso gera:
- Bugs declarados resolved que voltam (regressões silenciosas)
- PRs que falham CI logo depois
- Confiança erodida do usuário ("ele disse que funcionava")

Verification before completion é o gate que separa "task closed" de "task delivered".
