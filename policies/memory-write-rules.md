# Memory Write Rules (anti-fabricação + retrievabilidade no vault)

> **Inspiração:** [`references/ai-first-rules.md` de eugeniughelbur/obsidian-second-brain](https://github.com/eugeniughelbur/obsidian-second-brain) (MIT). Adapta as "AI-first note rules" ao nosso vault (`D:\claude-memory\`) e learned-skills. As regras 1-7 governam *como escrever*; as regras anti-fabricação governam *como ler antes de escrever*.

## Por que isto existe

O vault só vale se o futuro-Claude **confiar** no que está escrito. Dois failure modes silenciosos corrompem esse valor:

1. **False absence** — afirmar "não existe log/decisão sobre X" sem buscar de verdade. É o erro **mais comum** — mais que fabricação. Um "não tem nada sobre isso" errado faz o agente re-derivar do zero algo que já estava resolvido.
2. **Fabricação de preenchimento** — inventar uma data, decisão ou pendência pra "completar" uma seção. Uma seção `## Pendências` vazia é correta quando não há pendência — não invente uma.

Estas regras são o `claim-verifier`/`investigate-first` aplicados à **memória**, não ao código.

## Regras anti-fabricação (hard — ao LER o vault antes de escrever)

### 1. False absence — busque antes de afirmar ausência
**Nunca** afirme que uma nota, decisão, log ou pendência NÃO existe sem busca exaustiva. Antes de escrever "não há registro de X":
- liste `D:\claude-memory\logs\` e grep por todo nome/alias plausível do tópico
- consulte `D:\claude-memory\architecture\<projeto>\decisions.md` se for decisão
- na dúvida, **over-include e rotule a incerteza** ("encontrei isto, pode haver mais") em vez de under-report.

### 2. Search completeness — enumere, não amostre
Ao varrer o vault, liste **toda** entrada que casa, não "algumas representativas". Um scan parcial reportado como completo produz respostas confiantes e erradas — pior que um honesto "só verifiquei os logs de junho".

### 3. No fabrication — TBD para o desconhecido
Nunca invente fato, entidade, data, taxa ou relação que não foi realmente declarada. Marque desconhecidos como `TBD`. Nunca preencha um valor só pra a seção parecer completa.

## Regras de escrita (como produzir notas retrieváveis)

### 4. Recency markers em claims externos
Todo fato externo carrega a data inline, pro futuro-Claude saber o que verificar antes de confiar:
```markdown
- Mem0 levantou $24M Series A (as of 2026-04, mem0.ai/blog/series-a)
- Claude Code ganhou plugin marketplace (as of 2026-02, docs.claude.com)
```

### 5. Fontes preservadas verbatim
Toda claim externa tem a URL inline. Não parafraseie a citação — mantenha a URL real pra re-verificação anos depois.

### 6. Níveis de confiança onde aplicável
- `stated` — citado/declarado diretamente por uma fonte
- `high` — múltiplas fontes concordam
- `medium` — fonte única, plausível
- `speculation` — inferência sua

No frontmatter (`confidence: high`) ou inline (`(confidence: speculation)`).

### 7. Cross-links pelo padrão do vault
Decisões e logs referenciam projeto/feature por wikilink `[[projeto]]` quando o vault os suporta, pro grafo ser navegável.

## Anti-padrões

- ❌ "Não há nada sobre isso no vault" sem grep exaustivo (false absence).
- ❌ Inventar uma pendência/decisão pra preencher seção vazia.
- ❌ Claim externo sem `(as of YYYY-MM, fonte)` — vira fato eterno que ninguém revalida.
- ❌ Reportar scan parcial como completo.

## Integração

- `policies/claim-verification.md` — a versão código desta filosofia (afirmar resultado sem evidência).
- `policies/investigate-first.md` — investigar antes de perguntar/afirmar.
- `policies/memory-consolidation.md` + `policies/memory-curator.md` — manutenção do vault.
- `commands/reconcile-memory.md` — resolve contradições que estas regras ajudam a detectar.
- `commands/consolidate-memory.md` + `skills/31-session-summary/` — produzem notas que devem seguir estas regras.
