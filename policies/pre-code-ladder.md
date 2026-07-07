# Pre-Code Ladder Policy

## Princípio

**Antes de escrever código novo, suba a escada de 7 degraus e pare no primeiro degrau que já resolve.**

Toda tarefa de implementação convida a escrever código na hora. Mas a maior parte do que "precisa ser codado" já está resolvido em algum lugar mais barato: não precisa existir, já existe no repo, é stdlib, é feature nativa da plataforma, é uma dependência já instalada, ou cabe numa linha. Código novo é o **último** recurso, não o primeiro.

Regra mental: antes de escrever a primeira linha de uma função/módulo novo, pergunte:

> "Em que degrau desta escada eu já resolvo isso, sem escrever código novo?"

## A escada (subir em ordem, parar no primeiro que resolve)

| Degrau | Pergunta | Se sim → |
|---|---|---|
| 1. Necessidade | Isso precisa existir de verdade? (YAGNI) | Não implemente — é escopo não pedido |
| 2. Já existe no repo | Já tem lógica equivalente neste codebase? | Reuse — não duplique |
| 3. Stdlib | A linguagem/runtime já resolve isso nativamente? | Use stdlib — zero dependência nova |
| 4. Feature nativa | A plataforma/framework já tem isso embutido? | Use a feature nativa |
| 5. Dependência instalada | Uma lib já instalada no projeto já cobre isso? | Use a lib existente |
| 6. One-liner | Cabe numa expressão/linha só? | Escreva o one-liner, sem abstração extra |
| 7. Código novo | Nenhum dos anteriores resolve | Só agora, escreva o mínimo necessário |

## Carve-out de constraints imutáveis

A escada **nunca** se aplica para justificar pular:

- **Segurança** (validação de input, sanitização, controle de acesso)
- **Trust-boundary validation** (fronteira entre dados confiáveis e não-confiáveis)
- **Prevenção de perda de dados** (transações, backups, confirmação antes de operação destrutiva)
- **Acessibilidade** (a11y)

Nesses casos, minimizar é risco, não elegância — mesmo que pareça "código a mais", ele fica. A escada regula excesso de construção em código de negócio comum, não corte de guardrails.

## Enforcement

- **Hook ativo:** `hooks/scripts/pre-code-ladder-guard.mjs` (UserPromptSubmit) detecta intenção de criação de código no prompt e injeta a escada como `additionalContext`, uma vez por sessão. Não bloqueia — educa.
- **Toggle:** desabilitável via `hooks/config.json` → `"pre_code_ladder": { "enabled": false }`.
- O hook **não dispara** quando o prompt menciona termos de segurança/auth/validação/a11y — carve-out acima já cobre esses casos, não precisa do lembrete de minimização.

## Relação com outras policies

- **GLOBAL.md — Senior Dev Override:** são inversos complementares. O Senior Dev Override diz "não hesite em melhorar/corrigir arquitetura falha" (ataca a passividade). Esta escada diz "não hesite em NÃO escrever código quando uma solução existente já cobre a necessidade" (ataca a construção desnecessária). Um trata de excesso de cautela; o outro, de excesso de construção.
- **`policies/boil-the-lake.md`** — mesma filosofia de escopo mínimo aplicada ao ciclo de review/simplificação pós-implementação; a escada atua *antes* de codar, boil-the-lake atua *depois*.
- **`policies/vertical-slices.md`** — vertical-slices evita over-engineering horizontal (camadas antes da hora); a escada evita over-engineering vertical (construir do zero o que já existe).

## Fontes

Conceito da escada de decisão adaptado do projeto [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) (MIT) — só o conceito, nenhum código copiado.
