# Cost Optimization Policy

## Objetivo
Maximizar eficiencia de tokens, cache e API calls para reduzir custo real sem sacrificar qualidade de entrega.

## Prompt Caching

- Manter sessoes continuas e longas — nao fechar/reabrir sem necessidade
- Evitar /clear a menos que o contexto esteja poluido demais
- CLAUDE.md bem escrito carrega uma vez e fica em cache — investir nele
- Nao trocar de branch/projeto no meio da sessao sem necessidade
- Pausas > 5 min invalidam cache — agrupar trabalho em blocos continuos

## Reducao de Tokens por Requisicao

- Dar contexto especifico: "edite linhas 30-40 de X" em vez de "melhore o arquivo X"
- Usar Glob/Grep antes de Read — encontrar o arquivo certo antes de ler
- Ler apenas o trecho necessario (offset + limit) em arquivos grandes
- Nao pedir "explique o que voce fez" — o diff ja mostra
- Reutilizar `docs/repo-audit/current.md` antes de reexplorar o repo inteiro
- Pedir resultados concisos quando possivel: "responda em 3 bullets"

## Shell Commands Comprimidos

Forms de comando que economizam tokens **de input** (output do shell que volta pro agente). Output e ~5x mais caro que input, mas input verboso ainda custa — e atrapalha leitura.

| Em vez de | Use | Ganho |
|-----------|-----|-------|
| `git log` | `git log --oneline -10` | 80-95% |
| `git status` | `git status --porcelain` (parsing) ou `git status -sb` (humano) | 40-60% |
| `git diff` | `git diff --stat` (overview) ou `git diff -- <file>` (especifico) | 70-90% |
| `npm install` | `npm install --silent` | 50-70% |
| `cargo build` | `cargo build 2>&1 \| tail -50` (se esperando erro) | 60-90% |
| `gh pr list` | `gh pr list --json number,title,state \| jq` | 40-60% |
| `gh issue view N` | `gh issue view N --json title,body,state` | 30-50% |
| `docker ps` | `docker ps --format "{{.Names}}\t{{.Status}}"` | 50-70% |
| `kubectl get pods` | `kubectl get pods -o name` (so nomes) ou `-o wide` (completo) | 40-80% |
| `find ...` | usar Glob (built-in) | nao chamar shell |
| `grep ...` | usar Grep (built-in) com `-l` se so quer paths | nao chamar shell |
| `cat file` | usar Read (built-in) | nao chamar shell |
| `ls -la` | `ls -1` ou Glob | 60-80% |
| Qualquer log verbose | `... 2>&1 \| tail -N` | depende |

Regras gerais:
- Prefer `--json` + `jq` em CLI tools que tem (gh, npm, cargo, docker, kubectl)
- Use `head -N` / `tail -N` quando output pode passar de 50 linhas
- `grep -l` quando so precisa saber **onde**, nao **o que**
- `--porcelain` / `--format` quando precisar de parsing
- Em comandos esperando muitas linhas, **sempre** pipe pra `head/tail` antes de chamar

## Cross-Call Dedup (Stage 0 do output-compressor)

Desde **v2.9.0**, o `output-compressor` tem uma stage **antes** da pipeline intra-call: uma janela deslizante de 16 chamadas com MinHash + Jaccard ≥0.85 que detecta quando o agente está re-rodando algo idêntico ou quase idêntico.

**Quando ligar:**
- Loops autônomos (`/auto`, `/swarm`, `/loop`) — comandos como `npm test`, `git status`, `eslint`, `tsc --noEmit` rodam dezenas de vezes por sessão
- Iterações de debug onde você roda o mesmo comando vendo se mudou
- Re-runs de validação após cada commit local

**Como ligar:**
- Via MCP tool `devkit_compress_output` com `cross_call: true` + `label: "<cmd>"`
- Via API direta: `compressOutput({ text, hint, crossCall: true, crossCallLabel: "npm test" })`
- A janela é process-wide e singleton via `getDefaultCache()`. Sem opt-in, default `false`.

**O que muda no output:**
- Match exato → `[squeez-style: identical to call #N (label)]`
- Match fuzzy (timestamps/durações diferentes) → `[squeez-style: ~P% similar to call #N (label)]`
- O resultado carrega `cross_call_match: { call_id, kind, similarity }` pra auditoria

**Por que importa:** no benchmark inicial (5 fixtures, 9.3KB), single-call atinge 13%, second-run **98%**. Esse delta é o que vai compor dentro de loops autônomos.

**Audit em runtime:** `devkit_dedup_status` retorna o tamanho atual da janela; passe `reset: true` se quiser zerar.

## Rate Limit e Retry

- Nao disparar muitos subagents simultaneos — cada um consome cota separada
- Evitar loops de retry em erros de rate limit — esperar e tentar uma vez
- Usar modelo mais barato pra tasks simples (haiku pra boilerplate, sonnet pra implementacao, opus pra arquitetura)
- Batch operacoes: um commit com 5 arquivos em vez de 5 commits separados
- Usar /compact antes do contexto estourar — nao esperar o auto-compact

## API Calls Externas (fal.ai, Brave, Firecrawl)

- Brave Search: agrupar queries relacionadas em uma unica busca quando possivel
- fal.ai: gerar variacoes em batch, nao uma por uma
- Firecrawl: usar Playwright (gratuito) como fallback pra scraping simples
- Nao repetir chamada de API que ja retornou resultado valido — cachear no artefato

## Selecao de Modelo

Ver `policies/model-routing.md` para regras completas de selecao e enforcement.
Resumo: Fast (haiku) < Balanced (sonnet) < Deep (opus). Nao usar Deep pra tasks que Balanced resolve — custo 5x maior.

## Metricas de Alerta

Sinais de que o custo esta alto demais:
- contexto > 100k tokens sem /compact
- mais de 3 subagents simultaneos
- mesmo arquivo sendo lido 3+ vezes na mesma sessao
- retry loop em rate limit
- geracao de imagem sem briefing claro (gera lixo e regera)

## Policies Complementares

- `policies/dense-output-mode.md` — densidade de resposta proporcional a pergunta. Reduz tokens de output (5x mais caro que input) sem capar explicacao quando ela e pedida. 7 flags inline + off-switch
- `policies/search-first.md` — pesquisar antes de implementar evita trabalho desperdicado: entender o que ja existe e o contexto real antes de gerar codigo reduz retrabalho e tokens gastos em correcoes
- `policies/iterative-retrieval.md` — retrieval progressivo em 3 rounds evita carregar dumps completos de contexto: buscar apenas o que cada etapa precisa, incrementalmente

## Anti-patterns

- "analise todo o projeto" sem escopo definido
- ler arquivo inteiro pra editar 2 linhas
- disparar subagent pra task que resolve com um Grep
- pedir explicacao longa do que foi feito (ver diff)
- reexplorar repo quando audit existe e esta atual
- gerar moodboard sem estrategia definida (desperdiça calls do fal.ai)
- implementar sem pesquisar — duplica logica existente e gera retrabalho
