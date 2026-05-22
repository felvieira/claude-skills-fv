---
scenario: detective-contracts
pass: baseline
model: claude-sonnet-4-6
tokens_in_approx: 180
tokens_out_approx: 720
time_seconds: 11
quality_score: 2.25
quality_breakdown:
  specificity: 2
  completeness: 3
  correctness: 4
  actionability: 3
  discipline: 2
pass_fail: baseline
delta_vs_baseline: null
notes: "Cold answer — no skill loaded. Generic advice, missing confidence/traceability/ADR dimensions, loose output format."
---

# Extração de Contratos — `src/billing/` (Baseline)

## Por onde começar

Para um módulo legado Node.js de ~2k linhas sem docs, o processo padrão é:

1. **Ler os exports do módulo** — olhar `module.exports` ou exports nomeados no `index.js`. Isso define a API pública.
2. **Grep por imports do módulo** — buscar quem importa `billing` nos outros arquivos para identificar consumidores.
3. **Ler as funções principais** — percorrer o código e entender o que cada função faz.
4. **Identificar dependências** — olhar os `require()`/`import` no topo do arquivo.
5. **Procurar validações e guards** — `if (!x) throw`, `assert`, etc. revelam invariantes.

## Ferramentas úteis

```bash
# Ver estrutura
find src/billing -type f -name "*.js" | head -30

# Ver exports
grep -r "module.exports" src/billing/
grep -r "export " src/billing/

# Ver quem usa o módulo
grep -r "billing" src/ --include="*.js" -l

# Ver dependências internas
grep -r "require(" src/billing/ | grep -v node_modules
```

## Artefatos que você vai ter no fim

- **API pública**: lista de funções/métodos expostos com seus parâmetros
- **Mapa de dependências**: o que o módulo importa e para quê
- **Lista de consumidores**: quais outros módulos usam billing e como
- **Invariantes**: regras que o código assume como verdadeiras (validações, guards)
- **Estado interno**: variáveis de módulo, singletons, caches em memória

## Formato sugerido para documentar

Você pode criar um `billing-contracts.md` com seções:

```markdown
# Billing Module Contracts

## Public API
- `createInvoice(userId, items)` — cria nova fatura
- `processPayment(invoiceId, method)` — processa pagamento

## Dependencies
- `../db` — acesso ao banco
- `../email` — envio de notificações

## Consumers
- `src/orders/checkout.js:45` — chama createInvoice ao fechar pedido

## Invariants
- userId deve existir antes de criar invoice (linha 42)
- amount nunca pode ser negativo (linha 78)

## Internal State
- `pendingQueue` — array em memória de pagamentos pendentes
```

## Riscos ao extrair sem mexer no código

- Algumas invariantes só aparecem em testes — leia os testes junto
- Comportamento pode divergir do que os nomes sugerem
- Dependências implícitas (globais, env vars) são difíceis de detectar só lendo
