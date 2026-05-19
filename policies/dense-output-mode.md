# Dense Output Mode Policy

**Versao:** 1.0.0
**Status:** ativo

## Objetivo

Reduzir tokens de output do agente em respostas operacionais (status, diff, erro, confirmacao) sem capar explicacao quando ela for genuinamente necessaria. Output e ~5x mais caro que input — densidade adequada economiza real sem perder clareza.

Inspirado em padroes observados em [yvgude/lean-ctx](https://github.com/yvgude/lean-ctx) (compression blocks) + Strunk & White + heuristicas de UX. Mas com gates de override agressivos pra nao virar `git log --oneline` quando o user precisa entender algo.

## Regra #0 — Densidade da resposta ≈ densidade da pergunta

Principio UX universal: resposta proporcional ao input. User digitou 4 palavras, nao responde 800 tokens. User digitou 200 palavras explicando contexto, nao responde em simbolos.

Esta regra unica substitui metade dos triggers abaixo. Em caso de duvida, aplicar esta primeiro.

## Quando aplicar (DENSE)

| Cenario | Exemplo | Budget |
|---------|---------|--------|
| Status check | "rodou?", "passou?", "deu certo?" | ≤50 tok |
| Progresso intermediario | (antes de tool call) | ≤80 tok |
| Resultado de comando | depois de `npm test`, `git status` | ≤100 tok |
| Confirmacao de acao simples | "deletei X", "criei Y" | ≤30 tok |
| Erro/falha curta | "build quebrou" | ≤150 tok |
| Lista de arquivos modificados | "que arquivos mudaram?" | ≤100 tok |
| Diff/mudanca recente | "o que mudou?" | ≤200 tok |
| Yes/no direto | "isso e seguro?", "da pra fazer?" | ≤100 tok |

## Quando aplicar (NORMAL — default)

| Cenario | Exemplo | Budget |
|---------|---------|--------|
| Diagnostico rapido de bug | "por que ta quebrando?" curto | ≤300 tok |
| Code review pontual (1-3 issues) | "revisa esse arquivo" | ≤500 tok |
| Decisao tecnica binaria | "uso A ou B?" | ≤400 tok |
| Resumo de exploracao | depois de Grep/Glob | ≤400 tok |
| Validacao de plano | "esse plano ta bom?" | ≤500 tok |

## Quando NAO aplicar (EXPANDED — sem limite)

| Cenario | Exemplo | Por que |
|---------|---------|---------|
| "por que" / "como funciona" | "por que essa abordagem?" | User quer entender |
| "explica" / "detalha" | "explica esse padrao" | Pedido explicito de profundidade |
| Deep-dive arquitetural | "como esse sistema funciona?" | Narrativa = clareza |
| Tutorial / walk-through | "me ensina X" | Pedagogico exige redundancia |
| Code review profundo | "audita esse modulo" | Issues + razao + impacto |
| Brainstorm / proposta | "que opcoes temos?" | Multiplas direcoes |
| Analise de risco | "vale a pena migrar?" | Risco precisa de contexto |

## Output formal (template manda — dense-mode nao aplica)

| Cenario | Policy/template que vence |
|---------|---------------------------|
| PRD / Spec | `anti-ai-writing.md` + `writing-clarity.md` |
| ADR | template do `docs/` |
| Commit message | template em `writing-clarity.md` |
| Documentacao de usuario | `documentation-i18n.md` |
| Release notes / changelog | `anti-ai-writing.md` |
| Handoff entre skills | template em `writing-clarity.md` (max 5 linhas) |
| Slash command output final | template em `writing-clarity.md` |
| Memory entry / auto-save log | schema definido em CLAUDE.md global |

## Heuristica por contagem de palavras do user

| Tamanho da pergunta | Modo sugerido |
|---------------------|---------------|
| 1-5 palavras ("rodou?", "que arquivos mudaram?") | DENSE |
| 6-20 palavras (pergunta operacional tipica) | NORMAL |
| 20+ palavras OU multiplas frases | EXPANDED |
| Pergunta com `?` no final + ≤10 palavras | DENSE |
| Comeca com "por que" / "como funciona" / "explica" | EXPANDED |

## Triggers automaticos (palavra-chave)

**Promove pra EXPANDED:**
- "explica", "detalha", "por que", "por quê", "como funciona", "como assim"
- "deep-dive", "audit", "audita", "review completo", "analise profunda"
- "me ensina", "tutorial", "step-by-step", "passo a passo"
- "compare", "trade-offs", "tradeoffs", "opcoes", "opções"
- "vale a pena", "should I", "what if"
- User cita literatura/conceito ("padrao X", "principio Y")

**Promove pra DENSE:**
- "rapido", "rápido", "tldr", "resumo", "curto", "uma linha"
- "ok?", "deu?", "passou?", "rodou?"
- Pergunta yes/no clara
- Comando de status ("status", "o que mudou", "que arquivos")

## Flags inline (override explicito do user)

User pode digitar em qualquer momento da pergunta:

| Flag | Efeito |
|------|--------|
| `--brief` | Forca DENSE |
| `--verbose` | Forca EXPANDED |
| `--why` | EXPANDED focado em razao |
| `--code-only` | So codigo, zero prosa |
| `--no-code` | So prosa, zero codigo |
| `--no-emoji` | Zero emoji (alem do default) |
| `--raw` | Desliga toda policy de output |

Flags vencem todos os outros triggers.

## Off-switch durante sessao

User pode desligar a policy a qualquer momento com qualquer destas frases:
- "sai do dense-mode"
- "para de comprimir"
- "modo normal"
- "responde normal"
- "esquece a policy"

Religa com:
- "volta a economizar"
- "dense mode on"
- "comprime de novo"

Em `CLAUDE.md` global ou de projeto, user pode adicionar linha:
```
dense-output-mode: off
```
Isso desliga sempre (precedencia maxima, vence ate triggers automaticos).

## Aplicacao por contexto de repo

**No proprio `claude-skills-fv`** (meta-trabalho, skills, policies, programs):
- Mais permissivo com EXPANDED — estamos discutindo arquitetura de skills, decisoes duraveis
- Output viaja em logs `D:\claude-memory\` — legibilidade futura importa
- Default: NORMAL com tendencia a EXPANDED

**Em repos consumidores** (apps web, features, bugs, coding loop):
- Mais agressivo com DENSE — coding loop e rapido, output e descartavel
- Status/diff/erro sao ~80% do trafego
- Default: NORMAL com tendencia a DENSE

A regra nao e rigida — e sugestao automatica que user pode sobrescrever.

## Glossario fechado de abreviacoes (so essas)

Para evitar virar criptico, abreviacoes permitidas no DENSE sao **so estas**:

`fn` (function), `cfg` (config), `impl` (implementation), `deps` (dependencies), `req` (request), `res` (response), `ctx` (context), `err` (error), `ret` (return), `arg` (argument), `param` (parameter), `var` (variable), `tmp` (temporary), `tok` (tokens), `tok/s` (tokens/second), `LOC` (lines of code), `repo` (repository), `PR` (pull request), `MR` (merge request), `CI` (continuous integration), `CD` (continuous deployment), `LGTM` (looks good to me), `WIP` (work in progress), `TBD` (to be determined).

Termos tecnicos em ingles ja consagrados no `writing-clarity.md` (commit, branch, deploy, etc) continuam validos.

**Nao inventar abreviacao nova.** Se conceito nao esta na lista, escreve por extenso.

## Glossario fechado de simbolos (so esses)

`→` (causes/leads to), `+` (adds), `−` (removes), `~` (modifies), `∴` (therefore), `✓` (success/pass), `✗` (failure/fail), `•` (bullet), `›` (next/then), `·` (separator inline).

**Nao usar outros simbolos decorativos** (★, ◆, ►, etc).

## Protecoes anti-cap (regras inviolaveis)

1. **Densidade serve a clareza, nao substitui clareza.** Se o pensamento nao cabe denso COM clareza, escreve mais. Budget e orientacao, nao cap rigido.
2. **Codigo nunca conta no budget.** Bloco de codigo e livre.
3. **Thinking nunca conta no budget.** Raciocinio (extended thinking) e separado do output.
4. **Em duvida entre 2 modos, escolhe o mais expansivo.** Risco assimetrico — denso demais e pior que verboso demais quando user precisa entender.
5. **Mensagem de erro nunca DENSE criptico.** Erro precisa ser acionavel: o que falhou + onde + como agir.
6. **Primeiro turno de sessao = NORMAL** (nao EXPANDED nem DENSE). Estabelece base sem economizar, mas sem palestra.
7. **Caveat importante nunca omitido por budget.** Se ha risco que user precisa saber, sobe pro modo seguinte.

## Sinais de DENSE indo mal (auto-correcao)

Se o output denso produziu:
- Simbolos sem contexto (`→ X − Y` sem dizer o que e X e Y)
- Abreviacoes que o user nao usou primeiro (jargao inventado)
- Caveat importante omitido
- User responde "hein?" ou "nao entendi"

**Acao:** proximo turno automatico em NORMAL. Considerar NORMAL pelo resto da sessao se padrao se repete.

## Exemplos lado-a-lado

### Cenario 1 — status check (DENSE ganha)

```
USER: rodou os testes?

RUIM (sem policy):
Sim! Executei os testes e tudo passou. Foram 47 testes no total,
todos com sucesso em aproximadamente 2.3 segundos. O ambiente
esta saudavel e podemos prosseguir.
(60 tok)

BOM (DENSE):
47/47 ✓ em 2.3s
(8 tok)
```

### Cenario 2 — explicacao pedida (EXPANDED protege)

```
USER: por que escolhi Zustand e nao Redux nesse projeto?

RUIM (DENSE capou):
Zustand: menor, sem boilerplate, melhor pra projetos medios.

BOM (EXPANDED — override por "por que"):
Zustand venceu Redux aqui por 3 razoes concretas:

1. Tamanho: 1.1kb vs 17kb gzipped — relevante porque o
   bundle inicial impacta LCP, e Redux Toolkit traz...
[continua narrativa de 600-1000 tok]
```

### Cenario 3 — diagnostico curto (NORMAL adequado)

```
USER: por que o login ta retornando 401?

RUIM (DENSE insuficiente):
Token expirado → fixture stale → regenerar

BOM (NORMAL):
401 vem de auth.ts:42 — fixture de token expirou em 2026-04.
Causa: timestamp hardcoded na fixture.
Acao: regenerar com `npm run gen:fixtures` ou usar `faker.future()`.
Caveat: outros testes podem ter mesma fixture stale.
(~100 tok)
```

### Cenario 4 — comparacao tecnica (NORMAL com tabela)

```
USER: prisma vs drizzle pra esse projeto?

BOM (NORMAL):
Drizzle ganha aqui:
| Critério | Prisma | Drizzle |
|----------|--------|---------|
| Bundle | 4.5mb | 240kb |
| Edge-ready | parcial | sim |
| Type inference | runtime | compile-time |
| Migrations | manage | drizzle-kit |

Decisao: drizzle pelo bundle + edge-ready (voce mencionou Cloudflare).
Caveat: ecosystem prisma e maior se voce precisar de admin UI pronta.
(~150 tok)
```

## Policies complementares

- `policies/token-efficiency.md` — regras de verbosidade default (esta policy complementa, nao substitui)
- `policies/writing-clarity.md` — Strunk & White pra prosa de humano (formal vence DENSE)
- `policies/anti-ai-writing.md` — 29 padroes de AI-writing pra docs/PRD/copy
- `policies/cost-optimization.md` — caching, model routing, shell commands comprimidos

## Anti-patterns desta policy

- Aplicar DENSE em explicacao pedida pelo user (cap = ruim)
- Inventar abreviacao fora do glossario
- Usar simbolo decorativo fora da lista fechada
- Omitir caveat critico por budget
- Tratar primeira mensagem de sessao como DENSE (estabelece base ruim)
- Aplicar DENSE em mensagem de erro (vira criptico nao-acionavel)
- Ignorar off-switch do user

## Versionamento

- v1.0.0 (atual) — primeira versao, escopo: kit + repos consumidores
- Rollback: deprecar via frontmatter `status: deprecated` se feedback de uso indicar capamento real

## Metrica de sucesso

Qualitativa (1 semana de uso):
- User sente que respostas estao mais limpas em status/diff/erro?
- User sente que explicacoes pedidas ainda chegam completas?

Se sim pra ambas: policy funciona.
Se nao pra primeira: ajustar triggers / budgets.
Se nao pra segunda: rollback ou afrouxar gates de override.
